#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f ".cd.env" ]]; then
  # shellcheck disable=SC1091
  source ".cd.env"
fi

TEMPLATE_REPO="${TEMPLATE_REPO:-}"
TEMPLATE_BRANCH="${TEMPLATE_BRANCH:-main}"
SKIP_WHEN_UNCHANGED="${SKIP_WHEN_UNCHANGED:-1}"
POST_DEPLOY_CMD="${POST_DEPLOY_CMD:-docker compose --profile tunnel up -d --build}"
NODE_IMAGE="${NODE_IMAGE:-node:22-alpine}"

if [[ -z "$TEMPLATE_REPO" ]]; then
  echo "Missing TEMPLATE_REPO. Copy .cd.env.example to .cd.env and set your GitHub repo." >&2
  exit 2
fi

for bin in git docker rsync tar shasum curl; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Missing required command: $bin" >&2
    exit 2
  fi
done

mkdir -p ".cd/state" ".cd/work" ".cd/backups"

LOCK_DIR=".cd/state/deploy.lock"
WORK_DIR=""
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "Another deploy is already running: $LOCK_DIR" >&2
  exit 3
fi
trap 'rm -rf "$LOCK_DIR"; if [[ -n "${WORK_DIR:-}" ]]; then rm -rf "$WORK_DIR"; fi' EXIT

REMOTE_REV="$(git ls-remote "$TEMPLATE_REPO" "refs/heads/$TEMPLATE_BRANCH" | awk '{print $1}')"
if [[ -z "$REMOTE_REV" ]]; then
  REMOTE_REV="$(git ls-remote "$TEMPLATE_REPO" HEAD | awk '{print $1}')"
fi
if [[ -z "$REMOTE_REV" ]]; then
  echo "Cannot resolve remote revision: $TEMPLATE_REPO ($TEMPLATE_BRANCH)" >&2
  exit 4
fi

# A signed CI webhook may approve only this exact commit, never a newer HEAD.
if [[ -n "${EXPECTED_TEMPLATE_REV:-}" && "$EXPECTED_TEMPLATE_REV" != "$REMOTE_REV" ]]; then
  echo "Branch moved after CI approval; refusing to deploy a different commit." >&2
  exit 7
fi

STATE_FILE=".cd/state/template-rev"
CURRENT_REV=""
if [[ -f "$STATE_FILE" ]]; then
  CURRENT_REV="$(cat "$STATE_FILE")"
fi

if [[ "$SKIP_WHEN_UNCHANGED" == "1" && "$CURRENT_REV" == "$REMOTE_REV" ]]; then
  echo "No template update: $REMOTE_REV"
  exit 0
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
short_rev="${REMOTE_REV:0:12}"
WORK_DIR=".cd/work/template-$timestamp-$short_rev"
CONTENT_BACKUP=".cd/backups/content-$timestamp-$short_rev.tar.gz"
BEFORE_SUM=".cd/state/content-before-$timestamp-$short_rev.sha256"
AFTER_SUM=".cd/state/content-after-$timestamp-$short_rev.sha256"

content_checksum() {
  if [[ ! -d content ]]; then
    return 0
  fi
  find content -type f -print0 \
    | LC_ALL=C sort -z \
    | xargs -0 shasum -a 256
}

echo "Protecting content/..."
content_checksum > "$BEFORE_SUM"
tar -czf "$CONTENT_BACKUP" content
echo "Content backup: $CONTENT_BACKUP"

echo "Cloning template $TEMPLATE_REPO ($TEMPLATE_BRANCH)..."
git clone --depth 1 --branch "$TEMPLATE_BRANCH" "$TEMPLATE_REPO" "$WORK_DIR/src"
if [[ "$(git -C "$WORK_DIR/src" rev-parse HEAD)" != "$REMOTE_REV" ]]; then
  echo "Branch moved during clone; refusing an unapproved revision." >&2
  exit 7
fi

echo "Injecting current content into temporary build only..."
rm -rf "$WORK_DIR/src/content"
mkdir -p "$WORK_DIR/src/content"
rsync -a --delete content/ "$WORK_DIR/src/content/"

echo "Checking template/content compatibility..."
docker run --rm \
  -v "$ROOT_DIR/$WORK_DIR/src:/work:ro" \
  -v "$ROOT_DIR/scripts:/host-scripts:ro" \
  -w /work \
  "$NODE_IMAGE" \
  node /host-scripts/verify-template-content-compat.js

echo "Building template inside Docker..."
docker run --rm \
  -v "$ROOT_DIR/$WORK_DIR/src:/work" \
  -w /work \
  -e CI=1 \
  "$NODE_IMAGE" \
  sh -lc '
    set -e
    if command -v corepack >/dev/null 2>&1; then corepack enable || true; fi
    if [ -f pnpm-lock.yaml ]; then
      if ! command -v pnpm >/dev/null 2>&1; then corepack prepare pnpm@10.30.1 --activate; fi
      pnpm install --frozen-lockfile
      pnpm build
    elif [ -f package-lock.json ]; then
      npm ci
      npm run build
    elif [ -f yarn.lock ]; then
      if ! command -v yarn >/dev/null 2>&1; then corepack prepare yarn@stable --activate; fi
      yarn install --frozen-lockfile
      yarn build
    else
      npm install
      npm run build
    fi
  '

SRC="$WORK_DIR/src"
if [[ ! -d "$SRC/.next" ]]; then
  echo "Build completed but .next was not found." >&2
  exit 5
fi

echo "Syncing build artifacts. content/ is excluded and checksum-guarded."
rsync -a --delete "$SRC/.next/" ".next/"
if [[ -d "$SRC/public" ]]; then
  rsync -a --delete "$SRC/public/" "public/"
fi

if [[ -f "$SRC/server.js" ]]; then
  rsync -a "$SRC/server.js" "server.js"
elif [[ -f "$SRC/.next/standalone/server.js" ]]; then
  rsync -a "$SRC/.next/standalone/server.js" "server.js"
else
  echo "No server.js found in build output; keeping existing server.js"
fi

for file in package.json package-lock.json pnpm-lock.yaml pnpm-workspace.yaml yarn.lock; do
  if [[ -f "$SRC/$file" ]]; then
    rsync -a "$SRC/$file" "$file"
  fi
done

content_checksum > "$AFTER_SUM"
if ! cmp -s "$BEFORE_SUM" "$AFTER_SUM"; then
  echo "content/ changed during deploy. Keeping live content unchanged and aborting." >&2
  exit 6
fi

echo "Removing temporary clone..."
rm -rf "$WORK_DIR"

echo "Running post deploy command: $POST_DEPLOY_CMD"
eval "$POST_DEPLOY_CMD"

# Record success only after the recreated container is actually serving.
healthy=0
for attempt in {1..30}; do
  if curl --fail --silent --max-time 10 http://127.0.0.1:8080/projects >/dev/null; then
    healthy=1
    break
  fi
  sleep 2
done
if [[ "$healthy" != "1" ]]; then
  echo "Post-deploy health check failed; revision is not marked successful." >&2
  exit 8
fi
printf '%s\n' "$REMOTE_REV" > "$STATE_FILE"

echo "Done. Deployed template revision: $REMOTE_REV"
