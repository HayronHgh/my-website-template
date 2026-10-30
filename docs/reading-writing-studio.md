# Reading and Writing Studio

The public reader enhances existing Markdown HTML. Headings have stable `section-` anchors, a chapter outline, and full-screen table/code/diagram/chart viewers. The original content remains readable without JavaScript. Code copy uses original logical lines rather than displayed wrapping. SVG IDs and their styles/marker references are namespaced in viewers.

The outline lives in a translucent ruler at the right viewport midpoint. Tap for chapters; hold/drag for relative scrolling with slow precision, bounded flick acceleration and time-based inertia. Arrow/Page keys and Home/End provide keyboard alternatives. Cancelled gestures, route changes, new page gestures and full-screen viewers stop momentum; reduced motion disables release inertia. The gesture target is 44px wide, while the visible scale is 22px. It never replaces normal page scrolling. Public readers share the same `Back` control and destination-specific link, with hard pixel frames and vertically stacked recommendations on phones.

## Authoring

`/admin/articles`, `/admin/research`, and `/admin/leetcode` use Writing Studio. The existing management UI remains available with `?legacy=1`; automatic saves in that UI are disabled, and its manual management actions still operate on canonical articles. Project management is unchanged.

- The document editor supports continuous selections, Markdown paste, table editing, `/` insertion, undo/redo, block ordering and a Markdown source mode. Unrecognized Markdown remains a raw editable node. CodeMirror provides source search/replace and Tab indentation.
- `Ctrl/Cmd+S` saves the working copy, not the published article. `Ctrl/Cmd+Shift+P` opens insertion commands. `Ctrl/Cmd+F` opens source search from the document; formatting shortcuts apply while the document has focus.
- Uploaded images/MP4 remain behind authenticated working-copy asset routes until publishing. Preview uses the existing sanitized Markdown renderer. Chart data must be valid before publication; new chart snippets intentionally contain no invented measurements.
- Publish first saves the current snapshot, displays a line diff and preview, then requires explicit confirmation. An external/SSH change to the canonical revision causes a conflict; retain/export the draft, reopen the latest article and merge explicitly.

## Persistence and permissions

Working copies live in `content/.editor-workspace/`, inside the existing persisted content volume. They are excluded from Git and Docker build context. Include this directory in private content backups; never publish or serve it as a general asset directory. Metadata/working files are owner-readable only. Discard archives the working-copy JSON under `discarded/`; assets stay private for recovery. Review/archive retention as host maintenance, not by deleting article folders.

The API is under `/api/admin/working-copies`: authenticated list/create, per-ID read/update/discard, explicit `/publish`, and protected assets. It reuses CMS write policy, origin checks and admin/editor roles. Working revisions are independent from canonical revisions. File locks serialize mutations; dead-process locks can recover after restart. Live locks are not removed by age.

New publication creates a non-public canonical draft first, promotes assets, then performs the public update through the existing validated, versioned article store. If interrupted, the working copy retains the canonical draft revision for retry. No autosave writes `main.md`.

For local recovery, browser storage is scoped by account and working-copy ID. Unsaved data is retained after failed requests; reconnect attempts use revision checks. Browser-only recovery is never treated as a successful server save.

## Acceptance

Run `pnpm check` and the existing Python CI checks. `tests/writing-workspace.test.ts` covers isolated autosave, explicit publish, stale revisions, roles, private assets, Markdown round trips through the real editor schema, and unique headings. Also verify paste, undo/redo, source/document switching, search, draft reload, publish review, mobile full-screen viewers and focus/scroll restoration in a browser. Changing editor plugins requires rechecking that opening/switching modes does not append content.

Deployment uses the existing CI-success webhook. Verify the exact deployed SHA and canonical content hashes; opening a working copy can legitimately add private workspace files without changing public articles.
