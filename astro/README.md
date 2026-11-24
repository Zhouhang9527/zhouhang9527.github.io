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
