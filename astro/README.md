# GINKA Astro migration
This package is the independently buildable Astro version of the current GINKA artbook, on feature/ginka-astro. The legacy Hexo source remains for content and rollback during acceptance; no Hexo or NexT is invoked by this package.

Node 22, npm:
```sh
cd astro
npm install
npm run build
npm run preview -- --host 127.0.0.1
```
Production candidate is astro/dist. The existing production branch is untouched. Content collections are staged from original Markdown, relative post attachments remain under their historical public URLs, and the legacy route manifest is verified on every build. Pagefind replaces XML search for the new UI. Giscus keeps the original repository/category/pathname mapping. Native Astro ClientRouter replaces the old engine and persists the header, player and drawer. Existing GINKA-owned CSS and scripts are reused temporarily with lifecycle adaptations; do not confuse the independent build with removal of every legacy file. Verify the real browser and compare visual screenshots before switching deployment.
