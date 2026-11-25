# GINKA Astro

> 新对话 / 新 Agent 接续入口：[HANDOFF.md](docs/architecture/HANDOFF.md)，先读此文档，再按 TODO 推进。
>
> 当前 GINKA VN 开发待办：[TODO.md](docs/architecture/TODO.md)，架构设计及实现证据分别见 [GINKA-VN.md](docs/architecture/GINKA-VN.md) 与 [VN-SKIN.md](docs/architecture/VN-SKIN.md)。TODO 是后续任务的唯一清单，未实际验收的项目不勾选。

Independent static-site migration on feature/ginka-astro. The original Hexo source remains a rollback reference and the shared content/assets owner until cutover. The Astro build never invokes Hexo or NexT.

## Development
Node 22, npm:
```sh
cd astro
npm ci
npm run dev
npm run typecheck
npm run build
npm run preview -- --host 127.0.0.1
```
Build output: astro/dist. Generated directories are disposable. Track new posts/attachments in Git before rebuilding; restart the development server after changes to staged Markdown or shared source assets. The verified npm lockfile is committed. Use Node 22 and `npm ci` for reproducible dependency installation; update the lockfile intentionally when changing dependencies.

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

## Original EXTRA base and transition rule (private local study)
Set `GINKA_VN_UI_DATA` to the extracted data folder containing _hxv4_hash and run dev on localhost. The two exact paths are recorded in config/vn-scenes.json. The identified data-101 backdrop is a candidate EXTRA base, used in gallery preview; data-021 drives a grayscale threshold wipe. The 320ms timing is provisional. If the environment variable is absent, public fallback skin and CSS transition remain. No original images are copied to dist.

## Island map preview
Set GINKA_MAP_DATA to the extracted bgimage directory (the folder containing _hxv4_hash). The 1280x720 island overview variants bgimage-124/125/126 are mapped by reading completion in config/vn-scenes.json. The mapping is provisional; these are confirmed overview images, not verified original map UI or story order. The map remains functional without the private images. Use localhost only.

## VN acceptance
Start a production preview in one terminal (`npm run build && npm run preview -- --host 127.0.0.1`).
In a second terminal, run `npx playwright install chromium`, then `npm run check:vn-browser`.
The local-only smoke test blocks remote dependencies and captures title, chapter, map, save, gallery, search, music, config, reader screenshots at mobile and desktop sizes. It checks persistence and navigation, not original-game pixel parity. The preexisting tools/browser.mjs additionally exercises real Giscus. Visual review with original resources remains separate.

## One-command private reference preview
After cloning the private asset repository separately, run:
```powershell
npm run dev:original -- "D:\\ginka-xp3-assets"
```
The tool validates the exact known source files, sets local roots, selects a font only if exactly one valid standalone OTF/TTF candidate exists (otherwise specify GINKA_UI_FONT), and binds to 127.0.0.1. It does not copy resources into the blog. The original title logo uses the full 1280x720 canvas at its original location on desktop. System panel timing is now 300ms crossfade from the extracted KAG reference scripts. Set GINKA_RULE_PREVIEW=1 only to study the optional rule-texture effect.

Music is now under SYSTEM → SOUND; /music-room/ redirects to /settings/#sound. The original PC settings layout is the reference for the seven-tab option screen; unsupported game features are not represented by fake controls. Mobile layout reflows for touch targets.

The original preview also validates and uses data-099 (option background) and the 593×158 option control atlas; the public build contains only the CSS fallback.

Original preview now also includes title-menu, choice, SAVE DATA and backlog control atlases. Title NEXT navigates to unread content after completion; EXIT switches to reader mode. No additional game resource is embedded into the public build.
