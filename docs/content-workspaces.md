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

## Editing and deployment

- Articles and LeetCode retain autosave, preview, revision conflicts, and recoverable archive behavior.
- Project/resume forms edit existing files with explicit save, schema validation, optimistic revision checks and atomic writes. They require the admin role. They do not yet provide version history or creation of new project folders.
- Resume PDF is a separate asset and must be updated separately.
- Keep runtime content backed up. Mount/persist the complete content directory on the Mac deployment, including the new leetcode and resume directories; do not overwrite private content with template fixtures.
- Existing CI/CD configuration is unchanged. Run validate:content, typecheck, test:run, lint and build before deployment. The content validator now also checks LeetCode and resume.
- ADMIN_CMS_WRITE_ENABLED=false remains a global write lock. No authentication settings were changed.
