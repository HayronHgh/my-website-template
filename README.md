# PortfolioKit

A sanitized, file-driven developer portfolio template built with Next.js, TypeScript, Tailwind CSS, runtime Markdown, and a pixel-night terminal interface. It is a lightweight deployment: there is no admin console, login, or database.

The goal is to let personal site settings, page images, project cards, project detail pages, articles, research notes, and LeetCode records update from files without rebuilding the app. The running app only reads `content/`; every content change is made by editing the Markdown or JSON files in `content/` directly. The same Docker image keeps running while `content/` is mounted from the host.

## How Changes Ship

| Change | How | Rebuild? |
| --- | --- | --- |
| Content: articles, research, LeetCode, projects, resume, site settings, images | Edit the files in the mounted `content/` directory on the server | No; picked up on the next request |
| Code, styles, dependencies | Commit and push to `main` → GitHub Actions CI → signed webhook auto-deploys the server ([ops/macmini](ops/macmini/README.md)) | Yes, automatically |

There is no in-browser editor. `/admin` and `/api/admin` do not exist and return 404.

## Live Example

[Hayron's engineering portfolio](https://www.hayronhgh.com/) is a production deployment of PortfolioKit. It demonstrates the homepage engineering dashboard, project case studies, long-form articles, integrated algorithm practice, and responsive mobile layouts, served from Docker with file-mounted content.

The live site uses private runtime content and branding. This repository keeps sanitized starter content so the template can be reused without publishing deployment data.

## Architecture

```txt
app/
  page.tsx                     Home, runtime project highlights
  projects/page.tsx            Project index
  projects/[slug]/page.tsx     Project detail article
  blog/page.tsx                Blog search and reader
  blog/[...slug]/page.tsx      Direct article route
  leetcode/page.tsx            Algorithm practice index
  research/                    Ranked research index and detail pages

content/
  site/
    site.json                 Runtime profile, navigation, resume, and page images
    assets/                   Personal runtime images served through /site/assets
  projects/
    project-a/
      meta.json                Project card metadata
      main.md                  Long-form project detail
  blog/
    template-architecture/
      main.md                  Blog frontmatter + markdown body
  research/
    experiment-name/
      main.md                  Research frontmatter + markdown body
      experiment.json          Allowed numeric controls (optional)
      experiment.mjs           Trusted JavaScript experiment (optional)

lib/
  content/article-reader.ts    Read-only loader for research and LeetCode trees
  projects/meta.ts             Runtime project metadata loader
  projects/details.ts          Project markdown loader
  projects/relations.ts        Blog/project relation matching
  content/validation.ts        Zod content schema validation
  content/cache.ts             mtime-based runtime file cache
  site/settings.ts             Runtime site settings loader
  site/assets.ts               Runtime site asset path guard
  blog/posts.ts                Runtime blog loader
  blog/markdown.ts             Markdown to HTML pipeline
```

Project pages are split into two files:

```txt
content/projects/project-a/meta.json
content/projects/project-a/main.md
```

Blog articles use frontmatter:

```md
---
title: Template Architecture
date: 2026-01-05
summary: How the runtime content system is organized.
tags:
  - Architecture
relatedProjects:
  - project-a
published: true
---
```

Project-to-blog relations work in two ways:

- Explicit: blog `relatedProjects` points to a project slug.
- Tag-based: project `relatedTags` overlaps with blog `tags`.

Each domain keeps its own file-backed content model; see [content workspaces](docs/content-workspaces.md) for the file layout and frontmatter of Articles, Research, LeetCode, Projects, and Resume. For large or structural content edits, run `pnpm validate:content` against a copy of the files before replacing them on the server.

## Validation And CI

Local full check:

```bash
pnpm check
```

Equivalent individual commands:

```bash
pnpm audit:prod
pnpm typecheck
pnpm validate:content
pnpm test:run
pnpm lint
pnpm build
```

CI runs the same quality gates before the Docker image build:

```txt
production audit: No known vulnerabilities found
typecheck:      pass
content schema: pass
unit tests:     pass
lint:           pass
production build: pass
docker build:   pass
```

The full development-tree audit still reports a dev-only `ESLint → minimatch 3 → brace-expansion` advisory. Forcing brace-expansion v5 breaks that legacy consumer's API, so the enforced gate is `pnpm audit:prod` while the repository waits for the upstream minimatch 3 consumer to update.

Docker build is enforced by GitHub Actions and can also be run locally with Docker installed:

```bash
docker build -t portfolio-template:ci .
```

`validate:content` checks site settings, runtime site image paths, project `meta.json`, project detail markdown, blog frontmatter, related project references, date format, enum fields, slug consistency, and unsafe markdown URLs.

## Benchmark

Runtime content behavior:

- Layout, navigation, footer, homepage copy, resume sections, and page images read `content/site/site.json` on request.
- `/projects` reads `content/projects/*/meta.json` on request.
- `/projects/[slug]` reads `content/projects/[slug]/main.md` on request.
- `/blog` reads `content/blog/**/main.md` on request.
- `/research` reads ranked entries from `content/research/**/main.md` on request.
- `dynamic = "force-dynamic"` and `revalidate = 0` are used on runtime content routes.
- File reads and markdown rendering use an in-memory mtime cache keyed by file path, `mtimeMs`, and file size.
- Mounted content changes are picked up on the next request after the file timestamp or size changes.
- Runtime site image URLs include a file mtime/size version so replacing an image with the same filename invalidates the Next image cache.

## Screenshots

Add screenshots after customizing the template:

```txt
docs/screenshots/
  home.png
  projects.png
  project-detail.png
  blog.png
  mobile.png
```

Recommended capture checklist:

- Desktop home view
- Projects index
- Project detail with related articles
- Blog article with related projects
- Mobile navigation and single-column content

## Why This Design

This template uses local files instead of a database because the main content workflow is portfolio publishing, not high-frequency multi-user editing.

Key reasons:

- Project cards need structured metadata.
- Project details need long-form Markdown.
- Blog posts need tags, dates, frontmatter, and direct routes.
- Docker deployments can update content by mounting folders.
- Runtime content keeps a small mtime cache so repeated reads avoid unnecessary markdown conversion.
- Git-based content history remains simple and reviewable.

The result is a small, read-only content system without a database, admin console, or external CMS service.

## Tradeoff

This design intentionally accepts a few constraints:

- There is no in-browser editing. All content is edited as files; backups come from the host (the deploy script archives `content/` before each deploy) or from your own copy of the content.
- Research experiments execute only pre-authored `experiment.mjs` files and accept numeric parameters declared by `experiment.json`. Public pages expose controls and designed results, never a code editor. The production Docker image enables this trusted-code player; non-Docker environments can keep `RESEARCH_RUNNER_ENABLED=false`. It is not an OS sandbox, so only scripts you wrote yourself should be deployed.
- The app never writes to `content/`, so content can be mounted read-only.
- Runtime file reads plus mtime cache are simpler than a database, but not ideal for very large content collections.
- Markdown raw HTML is disabled and rendered HTML is passed through `rehype-sanitize`.
- Personal page images can live under `content/site/assets`; add your own optimized WebP/AVIF assets when ready.
- Site, project, and blog content schemas are validated by `pnpm validate:content`, but the app still normalizes runtime content defensively.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open:

```txt
http://localhost:3000
```

## Editing Projects

Create or edit:

```txt
content/projects/project-a/meta.json
content/projects/project-a/main.md
```

Minimum `meta.json`:

```json
{
  "slug": "project-a",
  "title": "Project A",
  "category": "Product System",
  "summary": "Short summary.",
  "description": "Longer card description.",
  "tech": ["Next.js", "TypeScript"],
  "cover": "generated:project-a",
  "coverPosition": "center center",
  "accent": "cyan",
  "detailsUrl": "/projects/project-a",
  "group": "featured",
  "published": true,
  "relatedTags": ["Architecture", "Case Study"]
}
```

## Editing Blog Posts

Create or edit:

```txt
content/blog/my-article/main.md
```

Use frontmatter:

```md
---
title: My Article
date: 2026-01-01
summary: Short article summary.
tags:
  - Architecture
relatedProjects:
  - project-a
published: true
featuredRank: 0
---
```

## Editing Site Settings

Create or edit:

```txt
content/site/site.json
content/site/assets/
```

Use `site.json` for profile text, navigation, contact links, resume content, homepage copy, and page image mapping. Public root paths such as `/globe.svg` can reference files in `public/`. Relative image paths such as `hero/home.webp` are served from `content/site/assets/hero/home.webp` through `/site/assets/hero/home.webp`.

Relative site image paths are constrained to `content/site/assets` and must use an allowed image extension: `avif`, `gif`, `jpg`, `jpeg`, `png`, `svg`, or `webp`.

## Docker Runtime Content

Build the image:

```bash
docker build -t portfolio-kit .
```

Run it with content mounted from the host (read-only is enough):

```bash
docker run --rm -p 3000:3000 \
  -v ./content/site:/app/content/site:ro \
  -v ./content/blog:/app/content/blog:ro \
  -v ./content/projects:/app/content/projects:ro \
  -v ./content/research:/app/content/research:ro \
  -v ./content/leetcode:/app/content/leetcode:ro \
  portfolio-kit
```

With this setup, editing mounted content on the host does not require rebuilding the Docker image. Mounting the whole tree with `-v ./content:/app/content:ro` works the same way.

## Standalone Dist Without Content

Build and package the app shell:

```bash
pnpm build
pnpm package:dist
```

The generated `dist/portfolio-template-standalone` and zip intentionally do not
include `content/`. Deploy the app shell once, then update site data by replacing
or mounting content on the server. This prevents a packaged app update from
accidentally overwriting live content.

## Security Notes

- Markdown raw HTML is disabled.
- Rendered markdown is sanitized with `rehype-sanitize`.
- Markdown links allow `http`, `https`, `mailto`, `tel`, safe relative paths, and hash links.
- Markdown images allow `http`, `https`, safe relative paths, and root-relative public paths.
- Blog and project asset routes constrain paths to their content directories.
- Site image assets served from `/site/assets` are constrained to `content/site/assets`.
- Production dependency audit is enforced by CI with `pnpm audit:prod`.
- There is no login, session, or content write API; the only POST endpoint is the opt-in research experiment runner.
- Deployment secrets (such as the webhook secret) live on the server and must never be committed.

## Commit Convention

Use conventional commits:

```txt
<type>(<scope>): <subject>

<body>

<footer>
```

Common types:

```txt
feat, fix, docs, style, refactor, perf, test, chore, build, ci, revert
```

## Markdown 統計圖表

Markdown 支援 `chart` 程式碼區塊（柱狀、圓餅、折線），直接寫在 `content/` 的 Markdown 檔裡。
語法與限制請看 [圖表使用說明](docs/markdown-charts.md)，完整示範在
[statistical-charts.md](docs/examples/statistical-charts.md)。
