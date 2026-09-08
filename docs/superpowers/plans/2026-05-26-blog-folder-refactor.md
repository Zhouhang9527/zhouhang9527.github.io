# Blog Folder Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean the blog workspace layout without changing site behavior.

**Architecture:** Keep runtime/blog assets in place and only move documentation, standalone tools, debug helpers, and local artifacts. Add ignore rules for generated files so future runs do not clutter `git status`.

**Tech Stack:** Hexo 8, NexT, Node.js scripts, PowerShell helper scripts.

---

### Task 1: Move Non-Runtime Files

**Files:**
- Move root docs into `docs/guides/`, `docs/reports/`, and `docs/atri/`
- Move standalone helper scripts into `tools/checks/`, `tools/voice/`, `tools/deploy/`, and `tools/debug/`
- Move local screenshots/logs/temp files into ignored `_archive/`

- [x] Move docs and source materials into their target folders.
- [x] Move standalone scripts out of the root and away from Hexo auto-loaded `scripts/`.
- [x] Move only local debug artifacts into `_archive/`; keep tracked historical files in tracked folders.

### Task 2: Repair Navigation Links

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: docs that link to moved ATRI files

- [x] Update README and changelog links to the new docs locations.
- [x] Update moved ATRI guide links after relocation.
- [x] Add a short `docs/README.md` index.

### Task 3: Add Hygiene Rules and Script Entrypoints

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`

- [x] Ignore local archive, Playwright state, temp files, debug screenshots, and generated reports.
- [x] Add npm check scripts for performance guards and inline script guard verification.

### Task 4: Verify

**Files:**
- Read generated output under `public/`

- [x] Run `npm run build`.
- [x] Run `node tools/checks/check-performance-guards.js`.
- [x] Run `node tools/checks/check-inline-scripts.js`.
- [x] Confirm `public/CNAME` contains `www.mm9527.top`.
- [x] Review `git status --short`.
