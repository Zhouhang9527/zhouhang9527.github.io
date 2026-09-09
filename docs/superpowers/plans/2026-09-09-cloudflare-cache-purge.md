# Cloudflare Cache Purge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Purge only the public blog hostnames from Cloudflare after a successful production deployment while treating missing credentials and purge failures as warnings.

**Architecture:** A dependency-injected CommonJS module owns the Cloudflare API request and doubles as a warning-only CLI. `package.json` and the two production paths in `deploy.bat` call the same npm command; local build and preview paths remain unchanged.

**Tech Stack:** Node.js 20 built-in `fetch`, Node `assert`, npm scripts, Windows batch, Cloudflare Cache Purge API.

---

### Task 1: Specify the cache-purge behavior with a failing offline regression check

**Files:**
- Create: `tools/checks/cloudflare-purge-regression.js`
- Test: `tools/checks/cloudflare-purge-regression.js`

- [ ] **Step 1: Write the failing regression check**

Create `tools/checks/cloudflare-purge-regression.js`:

```js
'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const scriptPath = path.resolve(__dirname, '../deploy/purge-cloudflare-cache.js');
let purgeModule = {};
try {
  purgeModule = require(scriptPath);
} catch {}

assert.strictEqual(
  typeof purgeModule.purgeBlogCache,
  'function',
  'purgeBlogCache must be exported'
);

const { purgeBlogCache } = purgeModule;

const createLogger = () => {
  const lines = [];
  return {
    lines,
    log: message => lines.push(String(message)),
    warn: message => lines.push(String(message))
  };
};

const run = async () => {
  const token = 'test-token-must-not-be-logged';
  const zoneId = '0123456789abcdef0123456789abcdef';

  {
    const logger = createLogger();
    const calls = [];
    const result = await purgeBlogCache({
      env: {
        CLOUDFLARE_API_TOKEN: token,
        CLOUDFLARE_ZONE_ID: zoneId
      },
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, errors: [] })
        };
      },
      logger
    });

    assert.deepStrictEqual(result, { purged: true, skipped: false });
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(
      calls[0].url,
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`
    );
    assert.strictEqual(calls[0].options.method, 'POST');
    assert.strictEqual(calls[0].options.headers.Authorization, `Bearer ${token}`);
    assert.deepStrictEqual(JSON.parse(calls[0].options.body), {
      hosts: ['mm9527.top', 'www.mm9527.top']
    });
    assert(!logger.lines.join('\n').includes(token));
  }

  {
    const logger = createLogger();
    let called = false;
    const result = await purgeBlogCache({
      env: {},
      fetchImpl: async () => {
        called = true;
        throw new Error('fetch should not run');
      },
      logger
    });

    assert.deepStrictEqual(result, { purged: false, skipped: true });
    assert.strictEqual(called, false);
    assert.match(logger.lines.join('\n'), /warning|警告/i);
  }

  {
    const logger = createLogger();
    const result = await purgeBlogCache({
      env: {
        CLOUDFLARE_API_TOKEN: token,
        CLOUDFLARE_ZONE_ID: zoneId
      },
      fetchImpl: async () => {
        throw new Error('simulated network failure');
      },
      logger
    });

    assert.deepStrictEqual(result, { purged: false, skipped: false });
    assert.match(logger.lines.join('\n'), /warning|警告/i);
    assert(!logger.lines.join('\n').includes(token));
  }

  {
    const logger = createLogger();
    const result = await purgeBlogCache({
      env: {
        CLOUDFLARE_API_TOKEN: token,
        CLOUDFLARE_ZONE_ID: zoneId
      },
      fetchImpl: async () => ({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          errors: [{ code: 10000, message: 'Authentication error' }]
        })
      }),
      logger
    });

    assert.deepStrictEqual(result, { purged: false, skipped: false });
    assert.match(logger.lines.join('\n'), /403/);
    assert(!logger.lines.join('\n').includes(token));
  }

  const cli = spawnSync(process.execPath, [scriptPath], {
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH || '',
      SystemRoot: process.env.SystemRoot || ''
    }
  });
  assert.strictEqual(cli.status, 0, cli.stderr || cli.stdout);
  assert.match(`${cli.stdout}\n${cli.stderr}`, /warning|警告/i);

  console.log('PASS Cloudflare cache purge regression checks');
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Run the check and verify the expected failure**

Run:

```powershell
node tools/checks/cloudflare-purge-regression.js
```

Expected: `AssertionError: purgeBlogCache must be exported` because the production helper does not exist yet.

- [ ] **Step 3: Commit the red regression check**

```powershell
git add -- tools/checks/cloudflare-purge-regression.js
git commit -m "test: specify Cloudflare cache purge behavior"
```

### Task 2: Implement the warning-only Cloudflare purge helper

**Files:**
- Create: `tools/deploy/purge-cloudflare-cache.js`
- Test: `tools/checks/cloudflare-purge-regression.js`

- [ ] **Step 1: Add the minimal implementation**

Create `tools/deploy/purge-cloudflare-cache.js`:

```js
'use strict';

const API_BASE = 'https://api.cloudflare.com/client/v4';
const BLOG_HOSTS = ['mm9527.top', 'www.mm9527.top'];

const purgeBlogCache = async ({
  env = process.env,
  fetchImpl = globalThis.fetch,
  logger = console
} = {}) => {
  const token = String(env.CLOUDFLARE_API_TOKEN || '').trim();
  const zoneId = String(env.CLOUDFLARE_ZONE_ID || '').trim();

  if (!token || !zoneId) {
    logger.warn(
      '[warning] Skipped Cloudflare cache purge: set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID.'
    );
    return { purged: false, skipped: true };
  }

  try {
    const response = await fetchImpl(
      `${API_BASE}/zones/${encodeURIComponent(zoneId)}/purge_cache`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hosts: BLOG_HOSTS })
      }
    );

    let payload = null;
    try {
      payload = await response.json();
    } catch {}

    if (!response.ok || payload?.success !== true) {
      logger.warn(
        `[warning] Cloudflare cache purge failed with HTTP ${response.status}; the GitHub Pages deployment was kept.`
      );
      return { purged: false, skipped: false };
    }

    logger.log(`[cloudflare] Purged cache for ${BLOG_HOSTS.join(', ')}.`);
    return { purged: true, skipped: false };
  } catch {
    logger.warn(
      '[warning] Cloudflare cache purge failed due to a network error; the GitHub Pages deployment was kept.'
    );
    return { purged: false, skipped: false };
  }
};

if (require.main === module) {
  purgeBlogCache().catch(() => {
    console.warn(
      '[warning] Cloudflare cache purge ended unexpectedly; the GitHub Pages deployment was kept.'
    );
  });
}

module.exports = { BLOG_HOSTS, purgeBlogCache };
```

- [ ] **Step 2: Run the regression check and verify green**

Run:

```powershell
node tools/checks/cloudflare-purge-regression.js
```

Expected: `PASS Cloudflare cache purge regression checks` and exit code `0`.

- [ ] **Step 3: Commit the helper**

```powershell
git add -- tools/deploy/purge-cloudflare-cache.js
git commit -m "feat: purge Cloudflare blog cache safely"
```

### Task 3: Wire the helper into production deployment paths

**Files:**
- Modify: `tools/checks/cloudflare-purge-regression.js`
- Modify: `package.json`
- Modify: `deploy.bat`
- Test: `tools/checks/cloudflare-purge-regression.js`

- [ ] **Step 1: Add failing wiring assertions**

Add these imports near the top of `tools/checks/cloudflare-purge-regression.js`:

```js
const fs = require('fs');
```

Add these assertions immediately before the final PASS log:

```js
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8')
  );
  assert.strictEqual(
    packageJson.scripts['cache:purge'],
    'node tools/deploy/purge-cloudflare-cache.js'
  );
  assert.match(
    packageJson.scripts.deploy,
    /hexo deploy && npm run cache:purge$/
  );
  assert.match(packageJson.scripts.check, /npm run check:cloudflare-purge/);

  const deployBatch = fs.readFileSync(
    path.resolve(__dirname, '../../deploy.bat'),
    'utf8'
  );
  assert.strictEqual(
    (deployBatch.match(/call npm run cache:purge/g) || []).length,
    2,
    'both production batch deployment paths must purge Cloudflare'
  );
```

- [ ] **Step 2: Run the check and verify the wiring failure**

Run:

```powershell
node tools/checks/cloudflare-purge-regression.js
```

Expected: an assertion failure because `cache:purge` is not yet defined.

- [ ] **Step 3: Update npm scripts**

Modify the scripts in `package.json` so the relevant entries are:

```json
"check": "npm run check:perf && npm run check:inline && npm run check:publish-assets && npm run check:music-sources && npm run check:cloudflare-purge",
"check:cloudflare-purge": "node tools/checks/cloudflare-purge-regression.js",
"cache:purge": "node tools/deploy/purge-cloudflare-cache.js",
"deploy": "npm run build:release && hexo deploy && npm run cache:purge"
```

- [ ] **Step 4: Update both production branches in `deploy.bat`**

Immediately after the successful `call hexo deploy` error check in
`:DEPLOY_ONLY`, insert:

```bat
echo 正在清理 Cloudflare 博客缓存...
call npm run cache:purge
if errorlevel 1 (
    echo ⚠ Cloudflare 缓存清理命令异常，GitHub Pages 部署已保留。
)
```

Replace the menu labels with:

```bat
echo  [4] 部署到 GitHub Pages + 清理 Cloudflare 缓存
echo  [5] 完整流程 (清理 + 生成 + 部署 + CDN 清理)
```

In `:FULL_DEPLOY`, change the three existing progress labels to `[1/4]`,
`[2/4]`, and `[3/4]`. Use this distinct cache step after the successful deploy
error check:

```bat
echo.
echo [4/4] 清理 Cloudflare 博客缓存...
call npm run cache:purge
if errorlevel 1 (
    echo ⚠ Cloudflare 缓存清理命令异常，GitHub Pages 部署已保留。
)
```

In `:DEPLOY_ONLY`, use the earlier unnumbered cache block. Do not add a purge
call to `:LOCAL_TEST`, `:QUICK_GEN`, `:CLEAN_ONLY`, or `:SERVER_ONLY`.

- [ ] **Step 5: Run the regression check and verify green**

Run:

```powershell
npm run check:cloudflare-purge
```

Expected: `PASS Cloudflare cache purge regression checks` and exit code `0`.

- [ ] **Step 6: Commit deployment wiring**

```powershell
git add -- package.json deploy.bat tools/checks/cloudflare-purge-regression.js
git commit -m "feat: purge blog cache after deployment"
```

### Task 4: Document setup and run full verification

**Files:**
- Modify: `DEPLOY_README.md`
- Test: `tools/checks/cloudflare-purge-regression.js`

- [ ] **Step 1: Add the Cloudflare setup section**

Append this section to `DEPLOY_README.md`:

````markdown
## Cloudflare 部署后缓存清理

生产部署成功后，`npm run deploy` 和 `deploy.bat` 的生产部署选项会尝试清理
`mm9527.top` 与 `www.mm9527.top` 的 Cloudflare 缓存。Meting 子域名不会被
清理。

在 Cloudflare 中创建仅限 `mm9527.top`、权限为 `Cache Purge` 的 API Token，
并从域名 Overview 页面复制 Zone ID。将它们保存为本机环境变量：

```powershell
$env:CLOUDFLARE_API_TOKEN = Read-Host 'Cloudflare API Token'
$env:CLOUDFLARE_ZONE_ID = Read-Host 'Cloudflare Zone ID'
```

以上命令只设置当前 PowerShell 会话。不要把 Token 写入仓库、脚本或提交记录。

可以单独测试清理命令：

```powershell
npm run cache:purge
```

如果凭据缺失、网络异常或 Cloudflare API 拒绝请求，脚本只显示警告并返回成功，
已经完成的 GitHub Pages 部署仍会保留。
````

- [ ] **Step 2: Run focused checks**

Run:

```powershell
npm run check:cloudflare-purge
node --check tools/deploy/purge-cloudflare-cache.js
```

Expected: regression check passes and syntax check exits `0`.

- [ ] **Step 3: Run the project check suite**

Run:

```powershell
npm run check
```

Expected: every check exits `0`, including `check:cloudflare-purge`.

- [ ] **Step 4: Run a release build without deploying**

Run:

```powershell
npm run build:release
```

Expected: Hexo generation and publish-asset verification exit `0`. Do not run
`npm run deploy` during verification because it pushes to GitHub Pages.

- [ ] **Step 5: Verify the final diff is scoped**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; unrelated pre-existing user changes remain
untouched.

- [ ] **Step 6: Commit documentation**

```powershell
git add -- DEPLOY_README.md docs/superpowers/plans/2026-09-09-cloudflare-cache-purge.md
git commit -m "docs: explain Cloudflare cache purge setup"
```
