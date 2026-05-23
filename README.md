# PortfolioKit

A sanitized, file-driven developer portfolio template built with Next.js, TypeScript, Tailwind CSS, runtime Markdown, and a pixel-night terminal interface.

The goal is to let project cards, project detail pages, and blog posts update from files without rebuilding the app. This is useful when the same Docker image should keep running while `content/blog` or `content/projects` is mounted from a volume, Git sync job, or private admin tool.

## Architecture

```txt
app/
  page.tsx                     Home, runtime project highlights
  projects/page.tsx            Project index
  projects/[slug]/page.tsx     Project detail article
  blog/page.tsx                Blog search and reader
  blog/[...slug]/page.tsx      Direct article route

content/
  projects/
    project-a/
      meta.json                Project card metadata
      main.md                  Long-form project detail
  blog/
    template-architecture/
      main.md                  Blog frontmatter + markdown body

lib/
  projects/meta.ts             Runtime project metadata loader
  projects/details.ts          Project markdown loader
  projects/relations.ts        Blog/project relation matching
  content/validation.ts        Zod content schema validation
  content/cache.ts             mtime-based runtime file cache
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

## Validation And CI

Local full check:

```bash
pnpm check
```

Equivalent individual commands:

```bash
pnpm audit --audit-level moderate
pnpm typecheck
pnpm validate:content
pnpm test:run
pnpm lint
pnpm build
```

CI runs the same quality gates before the Docker image build:

```txt
pnpm audit:     No known vulnerabilities found
typecheck:      pass
content schema: pass
unit tests:     pass
lint:           pass
production build: pass
docker build:   pass
```

Docker build is enforced by GitHub Actions and can also be run locally with Docker installed:

```bash
docker build -t portfolio-template:ci .
```

`validate:content` checks project `meta.json`, project detail markdown, blog frontmatter, related project references, date format, enum fields, slug consistency, and unsafe markdown URLs.

## Benchmark

Runtime content behavior:

- `/projects` reads `content/projects/*/meta.json` on request.
- `/projects/[slug]` reads `content/projects/[slug]/main.md` on request.
- `/blog` reads `content/blog/**/main.md` on request.
- `dynamic = "force-dynamic"` and `revalidate = 0` are used on runtime content routes.
- File reads and markdown rendering use an in-memory mtime cache keyed by file path, `mtimeMs`, and file size.
- Mounted content changes are picked up on the next request after the file timestamp or size changes.

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

The result is a small content system without requiring a CMS, database, or admin panel on day one.

## Tradeoff

This design intentionally accepts a few constraints:

- File writes are not handled by this app. Use Git, a sync job, a mounted volume, or a separate admin tool.
- Runtime file reads plus mtime cache are simpler than a database, but not ideal for very large content collections.
- Markdown raw HTML is disabled and rendered HTML is passed through `rehype-sanitize`.
- Images are not bundled as hero backgrounds by default; add your own optimized WebP/AVIF assets when ready.
- Project and blog content schemas are validated by `pnpm validate:content`, but the app still normalizes runtime content defensively.

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

## Docker Runtime Content

Build the image:

```bash
docker build -t portfolio-kit .
```

Run with mounted content:

```bash
docker run --rm -p 3000:3000 \
  -v ./content/blog:/app/content/blog:ro \
  -v ./content/projects:/app/content/projects:ro \
  portfolio-kit
```

With this setup, editing mounted content does not require rebuilding the Docker image.

## Security Notes

- Markdown raw HTML is disabled.
- Rendered markdown is sanitized with `rehype-sanitize`.
- Markdown links allow `http`, `https`, `mailto`, `tel`, safe relative paths, and hash links.
- Markdown images allow `http`, `https`, safe relative paths, and root-relative public paths.
- Blog and project asset routes constrain paths to their content directories.
- Dependency audit is enforced by CI with `pnpm audit --audit-level moderate`.
- Do not expose a write-enabled admin tool without authentication, CSRF protection, and path validation.

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
