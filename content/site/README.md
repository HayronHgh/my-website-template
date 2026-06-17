# Runtime Site Settings

This folder holds personal site settings that can be changed without rebuilding
the template app.

- Edit `site.json` for profile text, navigation, contact links, resume sections,
  homepage copy, and page image mapping.
- Put personal images under `assets/`, then reference them from `site.json` with
  a relative path such as `hero/home.png`.
- Relative image paths are served through `/site/assets/...` and are restricted
  to this folder. Parent directory segments and unsupported file extensions are
  rejected.
- Public root paths such as `/globe.svg` still work for template-provided icons.
- Production app packages created by `pnpm package:dist` intentionally exclude
  this folder. Mount or copy `content/` separately so app updates do not replace
  live site content.
