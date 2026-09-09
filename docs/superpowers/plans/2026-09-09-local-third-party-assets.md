# Local Third-Party Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve all page-critical third-party JavaScript, CSS, icons, and fonts from `www.mm9527.top` while preserving dynamic external services and optional ATRI voice fallbacks.

**Architecture:** Pin the exact npm packages that match NexT 8.25.0, let `@next-theme/plugins` publish NexT vendor files under `/lib/`, and use one small Hexo generator to publish GSAP, Canvas Nest, and Fontsource WOFF2 files under `/vendor/`. Source loaders and font links use same-origin paths; a regression check enforces the contract against both source and generated output.

**Tech Stack:** Hexo 8, NexT 8.25.0, Node.js CommonJS, npm lockfile, `@next-theme/plugins`, GSAP, Canvas Nest, Fontsource variable WOFF2.

---

## File map

- Create `tools/checks/local-assets-regression.js`: source and generated-output contract checks.
- Create `scripts/local-vendor-assets.js`: publish a strict manifest of npm-owned files through Hexo routes.
- Modify `package.json` and `package-lock.json`: pin packages and wire the new check.
- Modify `_config.next.yml`: switch NexT plugin vendors to local and stop remote font generation.
- Modify `source/_data/head.njk`: load local font CSS and remove obsolete CDN connection hints.
- Modify `source/js/ginka-effects-loader.js`: load GSAP and ScrollTrigger from `/vendor/`.
- Modify `source/js/ginka-ui-shell.js`: load Canvas Nest from `/vendor/`.
- Modify `tools/checks/check-performance-guards.js`: keep performance assertions aligned with the local GSAP path.
- Modify `DEPLOY_README.md`: document that `npm install` is required to materialize local assets during a build.

The implementation runs in the current checkout because the affected configuration and loader files already contain the user's uncommitted site work. Every commit stages only the files named by its task.

### Task 1: Specify the localization contract

**Files:**
- Create: `tools/checks/local-assets-regression.js`
- Modify: `package.json`

- [ ] **Step 1: Write the failing regression check**

Create a CommonJS check that reads `_config.next.yml`, `source/_data/head.njk`, both custom loaders, `package.json`, and (when present) `public/index.html`. It must assert these concrete contracts:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const config = read('_config.next.yml');
const head = read('source/_data/head.njk');
const effects = read('source/js/ginka-effects-loader.js');
const shell = read('source/js/ginka-ui-shell.js');

assert.equal(packageJson.dependencies['@next-theme/plugins'], '8.25.0');
assert.equal(packageJson.dependencies.gsap, '3.12.5');
assert.equal(packageJson.dependencies['canvas-nest.js'], '1.0.1');
assert.equal(packageJson.dependencies['@fontsource-variable/noto-serif-sc'], '5.3.0');
assert.equal(packageJson.dependencies['@fontsource-variable/jetbrains-mono'], '5.3.0');
assert.match(config, /vendors:\s*[\s\S]*?plugins:\s*local/);
assert.doesNotMatch(config, /host:\s*https:\/\/fonts\./);
assert.doesNotMatch(head, /cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.loli\.net/);
assert.match(head, /\/vendor\/fonts\/noto-serif-sc\/wght\.css/);
assert.match(head, /\/vendor\/fonts\/jetbrains-mono\/wght\.css/);
assert.doesNotMatch(effects, /cdn\.jsdelivr\.net/);
assert.match(effects, /\/vendor\/gsap\/3\.12\.5\//);
assert.doesNotMatch(shell, /cdn\.jsdelivr\.net\/npm\/canvas-nest/);
assert.match(shell, /\/vendor\/canvas-nest\/1\.0\.1\/canvas-nest\.min\.js/);

const publicIndex = path.join(root, 'public', 'index.html');
if (fs.existsSync(publicIndex)) {
  const html = fs.readFileSync(publicIndex, 'utf8');
  assert.doesNotMatch(html, /(?:src|href)=["'][^"']*(?:cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.loli\.net)/);
}

console.log('PASS local asset regression checks');
```

Add `check:local-assets` to `package.json` and append it to the main `check` chain:

```json
"check": "npm run check:perf && npm run check:inline && npm run check:publish-assets && npm run check:music-sources && npm run check:cloudflare-purge && npm run check:local-assets",
"check:local-assets": "node tools/checks/local-assets-regression.js"
```

- [ ] **Step 2: Run the check and verify the red state**

Run: `npm run check:local-assets`

Expected: FAIL because the pinned dependencies and same-origin paths do not exist yet.

- [ ] **Step 3: Commit the failing contract**

```powershell
git add -- package.json tools/checks/local-assets-regression.js
git commit -m "test: specify local third-party assets"
```

### Task 2: Pin and publish local packages

**Files:**
- Create: `scripts/local-vendor-assets.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `tools/checks/local-assets-regression.js`

- [ ] **Step 1: Install exact package versions**

Run:

```powershell
npm install --save-exact @next-theme/plugins@8.25.0 gsap@3.12.5 canvas-nest.js@1.0.1 @fontsource-variable/noto-serif-sc@5.3.0 @fontsource-variable/jetbrains-mono@5.3.0
```

Expected: `package.json` and `package-lock.json` record all five exact versions.

- [ ] **Step 2: Extend the regression check for the publishing manifest**

Add assertions before implementing the generator:

```js
const generator = read('scripts/local-vendor-assets.js');
for (const expected of [
  'gsap/dist/gsap.min.js',
  'gsap/dist/ScrollTrigger.min.js',
  'canvas-nest.js/dist/canvas-nest.min.js',
  '@fontsource-variable/noto-serif-sc/wght.css',
  '@fontsource-variable/jetbrains-mono/wght.css'
]) assert.ok(generator.includes(expected), `missing generator asset: ${expected}`);
```

- [ ] **Step 3: Run the check and verify it still fails**

Run: `npm run check:local-assets`

Expected: FAIL with `ENOENT` for `scripts/local-vendor-assets.js`.

- [ ] **Step 4: Implement the Hexo generator**

Create `scripts/local-vendor-assets.js` with two focused helpers:

```js
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const staticAssets = [
  ['vendor/gsap/3.12.5/gsap.min.js', 'gsap/dist/gsap.min.js'],
  ['vendor/gsap/3.12.5/ScrollTrigger.min.js', 'gsap/dist/ScrollTrigger.min.js'],
  ['vendor/canvas-nest/1.0.1/canvas-nest.min.js', 'canvas-nest.js/dist/canvas-nest.min.js']
];

function routeFile(route, source) {
  return { path: route, data: () => fs.createReadStream(require.resolve(source)) };
}

function fontRoutes(name, packageName) {
  const cssPath = require.resolve(`${packageName}/wght.css`);
  const css = fs.readFileSync(cssPath, 'utf8');
  const matches = [...css.matchAll(/url\((?:['"])?(.\/files\/[^)'"]+)/g)];
  const files = [...new Set(matches.map(match => match[1]))];
  if (!files.length) throw new Error(`[local-assets] No WOFF2 files referenced by ${packageName}/wght.css`);
  return [
    { path: `vendor/fonts/${name}/wght.css`, data: css },
    ...files.map(relative => ({
      path: `vendor/fonts/${name}/${relative.replace(/^\.\//, '')}`,
      data: () => fs.createReadStream(path.resolve(path.dirname(cssPath), relative))
    }))
  ];
}

hexo.extend.generator.register('local-vendor-assets', () => [
  ...staticAssets.map(([route, source]) => routeFile(route, source)),
  ...fontRoutes('noto-serif-sc', '@fontsource-variable/noto-serif-sc'),
  ...fontRoutes('jetbrains-mono', '@fontsource-variable/jetbrains-mono')
]);
```

The strict `require.resolve` and font URL validation intentionally fail the build when an installed package no longer contains an expected file.

- [ ] **Step 5: Run a clean build and inspect emitted assets**

Run: `npm run build:clean`

Expected: exit 0 and files exist at:

```text
public/vendor/gsap/3.12.5/gsap.min.js
public/vendor/gsap/3.12.5/ScrollTrigger.min.js
public/vendor/canvas-nest/1.0.1/canvas-nest.min.js
public/vendor/fonts/noto-serif-sc/wght.css
public/vendor/fonts/jetbrains-mono/wght.css
```

- [ ] **Step 6: Commit package publishing**

```powershell
git add -- package.json package-lock.json scripts/local-vendor-assets.js tools/checks/local-assets-regression.js
git commit -m "build: publish pinned local vendor assets"
```

### Task 3: Switch runtime references to same-origin paths

**Files:**
- Modify: `_config.next.yml`
- Modify: `source/_data/head.njk`
- Modify: `source/js/ginka-effects-loader.js`
- Modify: `source/js/ginka-ui-shell.js`
- Modify: `tools/checks/check-performance-guards.js`
- Test: `tools/checks/local-assets-regression.js`

- [ ] **Step 1: Switch NexT vendors and fonts**

Set `vendors.plugins: local`. Keep font families but disable NexT's external Google-font stylesheet generation:

```yaml
font:
  enable: true
  host:
  global:
    external: false
    family: "Noto Serif SC Variable"
  headings:
    external: false
    family: "Noto Serif SC Variable"
  posts:
    external: false
    family: "Noto Serif SC Variable"
  codes:
    external: false
    family: "JetBrains Mono Variable"

vendors:
  internal: local
  plugins: local
```

- [ ] **Step 2: Replace connection hints with local font stylesheets**

Remove preconnect and DNS-prefetch tags for jsDelivr and Google Fonts from `source/_data/head.njk`. Add these stylesheet links without changing the surrounding metadata:

```html
<link rel="stylesheet" href="{{ url_for('/vendor/fonts/noto-serif-sc/wght.css') }}">
<link rel="stylesheet" href="{{ url_for('/vendor/fonts/jetbrains-mono/wght.css') }}">
```

- [ ] **Step 3: Point optional effect loaders to local files**

In `source/js/ginka-effects-loader.js`, replace the CDN constant with:

```js
const ASSET_ROOT = '/vendor/gsap/3.12.5/';
```

and set `script.src = ASSET_ROOT + name`.

In `source/js/ginka-ui-shell.js`, set:

```js
script.src = '/vendor/canvas-nest/1.0.1/canvas-nest.min.js';
```

Preserve all existing low-power, reduced-motion, deferred-loading, and failure behavior.

- [ ] **Step 4: Align the performance guard**

Replace the GSAP CDN-only assertion with checks that the generated homepage has no parser-blocking GSAP tag and that `ginka-effects-loader.js` contains `/vendor/gsap/3.12.5/`.

- [ ] **Step 5: Run the localization check**

Run: `npm run build:clean && npm run check:local-assets`

Expected: `PASS local asset regression checks`.

- [ ] **Step 6: Inspect generated load URLs**

Run:

```powershell
rg -o --no-filename '(?:src|href)=["''][^"'']+' public/index.html | Sort-Object -Unique
```

Expected: page-critical library and font URLs begin with `/lib/` or `/vendor/`; no loading URL contains `cdn.jsdelivr.net`, `fonts.googleapis.com`, or `fonts.loli.net`. Meting and Baidu Analytics remain present.

- [ ] **Step 7: Commit runtime localization**

```powershell
git add -- _config.next.yml source/_data/head.njk source/js/ginka-effects-loader.js source/js/ginka-ui-shell.js tools/checks/check-performance-guards.js
git commit -m "perf: serve page dependencies locally"
```

### Task 4: Document and verify the release

**Files:**
- Modify: `DEPLOY_README.md`

- [ ] **Step 1: Document reproducible local assets**

Add a section explaining that a fresh checkout must run `npm install` or `npm ci`, that dependency versions are pinned in `package-lock.json`, and that no manual download step is needed. State that Meting, analytics, outbound links, and ATRI voice fallback remain external by design.

- [ ] **Step 2: Run the full project check**

Run: `npm run check`

Expected: every performance, inline-script, publish-asset, music-source, Cloudflare-purge, and local-asset check passes.

- [ ] **Step 3: Run a production build**

Run: `npm run build:release`

Expected: exit 0, required local assets are retained, and the generated homepage contains no critical third-party CDN load.

- [ ] **Step 4: Check repository scope**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; only the named localization files plus the user's pre-existing changes appear.

- [ ] **Step 5: Commit documentation**

```powershell
git add -- DEPLOY_README.md
git commit -m "docs: explain local vendor assets"
```

- [ ] **Step 6: Perform fresh completion verification**

Run `npm run check`, `npm run build:release`, and the generated URL inspection once more immediately before reporting completion. Do not run `npm run deploy` during verification.
