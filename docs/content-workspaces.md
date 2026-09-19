# Content workspaces

## Ownership

| Domain | Public URL | Source of truth | Admin |
| --- | --- | --- | --- |
| Articles | /articles | content/blog/<slug>/main.md | /admin/articles |
| LeetCode | /leetcode | content/leetcode/<slug>/main.md | /admin/leetcode |
| Projects | /projects | content/projects/<slug>/meta.json and main.md | /admin/projects |
| Resume | /resume | content/resume/resume.json | /admin/resume |

Articles describe research, engineering methods, and decisions. LeetCode contains problem-specific solutions and review progress. Project metadata owns showcase cards; project Markdown owns case studies. Resume owns career information and explicitly selected project slugs, not copies of project cards.

The old /blog URLs redirect permanently to /articles; article storage and /api/blog/posts remain compatible. Existing article asset links continue working. Homepage articles are read from published article files rather than preview fixtures. Resume reads legacy site settings only when the new resume file is absent.

## LeetCode template

Common frontmatter: title, date, summary, tags, published.
Additional flat fields: kind: leetcode, id (positive integer), difficulty (Easy/Medium/Hard), status (Todo/Attempted/Solved/Review), language.
The workspace inserts nine sections: 題目與限制、我的直覺、解法與程式碼、正確性分析、時間複雜度、空間複雜度、邊界測試、優化與替代解法、參考與複習筆記.
Drafts may be incomplete; publication requires all nine populated sections. Same problem ID may have multiple solution slugs.
Use absolute image URLs for LeetCode; this iteration does not add problem-local asset upload or serving.

## Legacy LeetCode migration

Legacy records use `format: legacy` to keep their existing Markdown structure editable.
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

- Articles and LeetCode keep direct preview, revision conflicts, and recoverable archive behavior. Published entries autosave after the one-second debounce; unpublished entries require an explicit draft save or publish action.
- Project/resume forms use explicit save, schema validation, optimistic revision checks and atomic writes. Administrators can create an unpublished project folder, upload a 16:9 cover, and edit its card metadata or Markdown case study. Project deletion and version history are not provided.
- Article and project Markdown use the same block-style editor: the focused block shows source while inactive blocks render through the sanitized public pipeline. Article media is stored beside the article; project media is stored under the project `assets/` directory. Images are limited to 12 MiB and MP4 files to 100 MiB.
- Resume PDF is a separate asset and must be updated separately.
- Keep runtime content backed up. Mount/persist the complete content directory on the Mac deployment, including the new leetcode and resume directories; do not overwrite private content with template fixtures.
- Existing CI/CD configuration is unchanged. Run validate:content, typecheck, test:run, lint and build before deployment. The content validator now also checks LeetCode and resume.
- ADMIN_CMS_WRITE_ENABLED=false remains a global write lock. No authentication settings were changed.
