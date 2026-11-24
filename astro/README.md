# GINKA Astro
Independent static-site migration on feature/ginka-astro. The original Hexo source remains a rollback reference and the shared content/assets owner until cutover. The Astro build never invokes Hexo or NexT.

## Development
Node 22, npm:
```sh
cd astro
npm install
npm run dev
npm run typecheck
npm run build
npm run preview -- --host 127.0.0.1
```
Build output: astro/dist. Generated directories are disposable. Track new posts/attachments in Git before rebuilding; restart the development server after changes to staged Markdown or shared source assets. Until a verified npm lockfile is committed, npm install is used rather than npm ci; direct dependency versions are pinned.

## Ownership
- config/site.json: public site, Giscus and music configuration
- config/legacy-routes.json: existing published path contract
- src/content.config.ts: collection schemas
- src/lib/: typed content and route logic, scene and asset helpers
- src/components/: UI, explicit props
- src/layouts/: persistent shell, metadata, client navigation
- src/pages/: route entry points
- src/styles/: native baseline; shared source/css currently provides artbook styling
- tools/prepare.mjs: deterministic staging and content-hash manifest
- tools/runtime-compat.mjs: temporary legacy feature adapters, isolated for gradual removal
- tools/metadata.mjs and verify.mjs: SEO and output contract
- tools/browser.mjs: actual browser acceptance

## Migration gates
Keep old published paths, Markdown and image attachments, Giscus pathname mapping, metadata, single persistent audio element, day/moonlit/system, search and keyboard navigation. Preserve the GINKA design system. No untracked game extraction assets enter dist. A successful build is not approval to deploy: complete browser and visual acceptance plus live integration review before replacing the published main branch.

## Original title CG (private local study)
The three identified full images are data-003, data-004 and data-005, not character sprites. Set GINKA_TITLE_DATA to the original extracted data folder (the folder containing _hxv4_hash), then run npm run dev on localhost. See config/vn-scenes.json for exact original hash filenames. The Vite dev middleware serves the original bytes without copying to public or dist. Do not expose this private dev server on a network. The release build keeps a single provisional torii fallback until rights are confirmed; no private images are included. Progress thresholds are provisional, not a verified original sequence.

## Original font inspection (private local study)
The extracted data archive contains a large OTF (about 23 MB according to the private asset README), but its family, coverage and role in the game are not verified. List the actual OpenType/TrueType files and their embedded name IDs (1 family, 2 subfamily, 4 full name, 6 PostScript, 16/17 typographic family/style):
```powershell
cd astro
node tools/local-font.mjs "D:\\GINKA-study\\assets\\data"
$env:GINKA_UI_FONT = "D:\\GINKA-study\\assets\\data\\<actual-font-file>.otf"
npm run dev -- --host 127.0.0.1
```
Use the real path from the scan, not the placeholder. The optional font is served only by the local dev middleware, never copied to the site. It affects VN menu and UI text, not technical article text or code. A single regular face is provisionally mapped to both roles; original font assignments and Chinese glyph coverage still require local visual verification. Browser fallback handles missing glyphs. Unset GINKA_UI_FONT to compare against the production font stack; do not expose the dev server through a proxy or tunnel. No original font is approved for public release by this change.
