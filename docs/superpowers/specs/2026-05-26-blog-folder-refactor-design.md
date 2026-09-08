# Blog Folder Refactor Design

Date: 2026-05-26

## Goal

Clean up the blog workspace without changing the published blog experience.

The refactor should make the root folder easier to scan, keep generated/debug files out of Git noise, and preserve the current GINKA/ATRI effects, music, comments, PJAX navigation, and custom domain behavior.

## Boundaries

- Do not move `source/_posts`, `source/images`, `source/js`, `source/music`, `source/voice`, `source/CNAME`, `_config.yml`, `_config.next.yml`, `themes/next`, or deploy/runtime entry scripts.
- Do not delete user content.
- Do not remove anime effects, Live2D/ATRI interaction, music, PJAX navigation, or comment lazy loading.
- Do not auto-commit because the current worktree already contains unrelated dirty changes.

## Target Structure

- `docs/guides/`: user-facing guides and older walkthrough articles.
- `docs/reports/`: historical optimization, deployment, repair, and verification reports.
- `docs/atri/`: ATRI reference docs and voice integration docs.
- `docs/atri/source-materials/`: large ATRI dialogue/source text files.
- `tools/checks/`: standalone verification scripts that should not be auto-loaded by Hexo.
- `tools/voice/`: ATRI/voice data maintenance scripts.
- `tools/deploy/`: optional upload/deploy helpers that are not npm entrypoints.
- `tools/debug/`: local debug HTML helpers.
- `_archive/`: ignored local screenshots, logs, temp HTML, and runtime artifacts.

## Verification

- Run `npm run build`.
- Run `node tools/checks/check-performance-guards.js`.
- Run `node tools/checks/check-inline-scripts.js`.
- Confirm `public/CNAME` still contains `www.mm9527.top` after build.
