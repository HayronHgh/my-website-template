# Mac mini: signed GitHub webhook CD

Flow: push `main` -> GitHub workflow `CI` succeeds -> `workflow_run` webhook ->
HMAC verification -> durable queue -> independent GitHub API verification ->
exact approved SHA check -> content backup -> Docker build -> content checksum
comparison -> container restart -> HTTP health check -> record deployed revision.

No public SSH port, GitHub PAT, or deployment key in Actions is needed for this
public repository. Only successful **push** runs of `.github/workflows/ci.yml`
on `HayronHgh/my-website-template` main are eligible. Pull requests, forks,
failed CI, other workflows and stale SHA deliveries cannot deploy. The clone is
checked again to prevent a branch advancing between approval and checkout.

## Installed host layout

- Root: `/Users/heguanhong/my-website-standalone`
- Receiver/config/secret: `.cd/webhook/{cd-webhook.py,config.json,secret}`
- Durable jobs: `.cd/webhook/queue.sqlite3`; retains status and failure reason.
- Service output: `.cd/webhook/service.log`
- Per-deployment output: `.cd/webhook/<commit-sha>.log`
- Content backups: `.cd/backups/content-<timestamp>-<sha>.tar.gz`
- Content checksums and deployed SHA: `.cd/state/`
- launchd: `~/Library/LaunchAgents/com.hayronhgh.website-cd.plist`
- Public endpoint: `https://www.hayronhgh.com/github/webhook`
- Receiver binds **127.0.0.1:9077** only. nginx in Docker proxies the exact path
  via `host.docker.internal`; Cloudflare keeps the existing HTTPS tunnel.

The service runs as the existing website owner, not root. It starts at login,
restarts after a crash, and resumes queued work. **After a Mac reboot, that user
must log in and Docker Desktop must be running.** This is not a boot-time daemon.
The Windows computer and this chat do not need to remain open.

## Editing content (no deploy needed)

The site has no admin console. All content changes are direct edits of the
Markdown/JSON files in the deployment root's `content/` directory, which is
mounted into the running container. The app picks up changes on the next
request; nothing is rebuilt and this webhook is not involved. Back up a file
before large edits. Only code changes go through push -> CI -> webhook deploy,
and every deploy backs up `content/` first without overwriting it.

## Provision or restore

Back up current `scripts/cd-template-update-safe.sh` and `nginx.conf` before
changes. Install the supplied safe deploy script into `scripts/`, and install
`cd-webhook.py` and a copy of `webhook-config.example.json` into `.cd/webhook/`.
Use `/usr/bin/python3` (3.9+) and the existing Docker Desktop CLI; no pip packages.

Generate a new secret **on the Mac**, without logging it:

```sh
umask 077
mkdir -p .cd/webhook
openssl rand -hex 32 -out .cd/webhook/secret
chmod 700 .cd/webhook
chmod 600 .cd/webhook/secret .cd/webhook/config.json
```

Keep that secret out of Git, logs, URLs and screenshots. Register a repository
webhook with JSON content type, SSL verification enabled, the endpoint above,
**only `workflow_run`**, and the same secret. `ping` is accepted after signature
validation. Validate with GitHub's webhook test delivery, not an unsigned request.

Add this zone in nginx's http context (before the existing server block):

```nginx
limit_req_zone $binary_remote_addr zone=github_webhook:1m rate=5r/s;
```

Add the exact location inside the existing server:

```nginx
location = /github/webhook {
    client_max_body_size 1m;
    limit_req zone=github_webhook burst=15 nodelay;
    limit_req_status 429;
    proxy_pass http://host.docker.internal:9077;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_connect_timeout 5s;
    proxy_read_timeout 15s;
}
```

Validate with `docker exec my-website-nginx nginx -t`, then reload nginx.
Install the supplied plist in `~/Library/LaunchAgents/`, validate using
`plutil -lint`, then `launchctl bootstrap gui/$(id -u) <absolute-plist-path>`.
Avoid starting a second receiver manually while launchd manages it.

## Verification and operations

`GET /github/webhook` returns only `ready` (no secrets or queue details).
An unsigned POST must return **401**. A GitHub signed ping returns **200**;
eligible completion events return **202**, and enqueue asynchronously so GitHub
does not wait for the build. Inspect GitHub repository Settings -> Webhooks ->
Recent Deliveries plus `.cd/webhook/service.log` for delivery evidence.

The SQLite queue serializes deployments and deduplicates delivery IDs and SHAs.
Transient failures retry up to three attempts, at 60/120-second delays. Exhausted
failures stay visible as `failed`; rerun CI to create a new completion delivery.
An old SHA is `skipped` when main has advanced. There is no polling of GitHub:
GitHub must deliver the event. If the Mac/tunnel is offline, use GitHub's
**Redeliver** once it is online (GitHub does not guarantee automatic retries).
Logs, queue history and content backups should be reviewed/pruned periodically;
this setup does not silently delete backups or publish deploy status publicly.

For host maintenance, disable the GitHub webhook first and use
`launchctl bootout gui/$(id -u)/com.hayronhgh.website-cd`. Existing manual safe CD
remains supported. To pause all auto-deploys, disable the webhook. To recover a
stale `.cd/state/deploy.lock` after a host crash, first verify no deployment or
Docker build is running; never remove a live deployment lock.

The receiver and deployment infrastructure are **not overwritten by application
deploys**. Changes under `ops/macmini/` require a reviewed host-side installation;
a push alone updates the website, not the running webhook service. Health
failures do not mark a revision successful. There is no automatic artifact
rollback; investigate the private deploy log before manual recovery.

## Tests

```sh
python3 -B -m unittest discover -s tests -p test_cd_webhook.py
```

GitHub CI runs these tests. They cover HMAC, event/repo/branch/SHA restrictions,
HTTP responses, duplicate suppression, durable recovery, failure retries and
independent API revalidation. The safe script's SHA guards are also checked.

References: [GitHub signature validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries),
[webhook events](https://docs.github.com/en/webhooks/webhook-events-and-payloads#workflow_run).
