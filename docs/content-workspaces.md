# Content workspaces

The site has no admin console. Every content change is a direct edit of the files below, in the `content/` directory mounted into the running container (on the Mac mini deployment, the host's `content/` folder). Changes are picked up on the next request; no rebuild or deploy is needed.

## Ownership

| Domain | Public URL | Source of truth |
| --- | --- | --- |
| Articles | /articles | content/blog/<slug>/main.md |
| LeetCode | /leetcode | content/leetcode/<slug>/main.md |
| Projects | /projects | content/projects/<slug>/meta.json and main.md |
| Resume | /resume | content/resume/resume.json |
| Research | /research | content/research/<slug>/main.md (+ optional experiment.json / experiment.mjs) |
| Site | / and shared layout | content/site/site.json, focus.json and assets/ |

Articles describe research, engineering methods, and decisions. LeetCode contains problem-specific solutions and review progress. Project metadata owns showcase cards; project Markdown owns case studies. Resume owns career information and explicitly selected project slugs, not copies of project cards.

The old /blog URLs redirect permanently to /articles; article storage and /api/blog/posts remain compatible. Existing article asset links continue working. Homepage articles are read from published article files rather than preview fixtures. Resume reads legacy site settings only when the new resume file is absent.

## LeetCode template

Common frontmatter: title, date, summary, tags, published.
Additional flat fields: kind: leetcode, id (positive integer), difficulty (Easy/Medium/Hard), status (Todo/Attempted/Solved/Review), language.
Problem pages use nine sections: 題目與限制、我的直覺、解法與程式碼、正確性分析、時間複雜度、空間複雜度、邊界測試、優化與替代解法、參考與複習筆記.
Drafts may be incomplete; publication requires all nine populated sections. Same problem ID may have multiple solution slugs.
Use absolute image URLs for LeetCode; this iteration does not add problem-local asset upload or serving.

## Legacy LeetCode migration

Legacy records use `format: legacy` to keep their existing Markdown structure.
`entryType` separates problem solutions, study notes (`note`), and unpublished reusable examples (`template`).
Notes/templates use null for id, difficulty, status and language; they are not counted as solved problems.
New problem records still require the v1 template unless explicitly designated legacy.

The migration script runs only against an explicitly supplied deployment root:

```sh
python3 scripts/migrate-legacy-leetcode.py --root /absolute/deployment
# Review .cd/migrations/leetcode-*/manifest.json and deploy compatible app code first.
python3 scripts/migrate-legacy-leetcode.py --root /absolute/deployment --apply /absolute/deployment/.cd/migrations/leetcode-EXACT-RUN
```

Preparation fetches the public LeetCode catalog for verified IDs/difficulties, detects code-fence languages,
backs up the complete content tree, and stages body-preserving copies. Status is conservatively
Attempted, not Solved: publishing a write-up does not prove an accepted submission.
Application refuses changed sources or destination collisions, retains exact originals outside the public
content tree, and records old-to-new slugs in `content/leetcode/redirects.json`.
Old /articles links redirect only when the target is published; /blog links first use the existing redirect.
Original dates, titles, visibility and Markdown bodies are preserved. A missing summary colon can be
repaired without changing its wording; each such repair is recorded in the manifest.

## Editing and deployment

- Edit Markdown/JSON in `content/` directly (for example over SSH on the Mac mini). Keep a backup of the file before large edits; the deploy script also archives `content/` before every code deploy.
- Publishing is the `published: true` frontmatter flag (or `"published": true` in project `meta.json`). Drafts stay `published: false`.
- Article media lives beside the article's `main.md`; project media lives in the project's `assets/` directory; site images live in `content/site/assets/`.
- Resume PDF is a separate asset and must be updated separately.
- Do not overwrite private runtime content with the template fixtures in this repository.
- Run `pnpm validate:content` against a copy of the content after structural changes; it checks articles, projects, site settings, LeetCode and resume.
- Code changes are separate: push to `main`, CI must pass, and the signed webhook deploys the exact commit. Content is never part of that build.
