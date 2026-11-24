'use strict';

const assert = require('assert');
const fs = require('fs');
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

  // 真正的离线用例：不给 token，子进程应当跳过 purge 并打印警告。
  // 只保留启动 Node 必需的环境变量；之前只传 SystemRoot，在 Git Bash 里
  // process.env.SystemRoot 可能是 undefined，子进程直接启动失败（spawn EINVAL），
  // 断言只会看到非 0 的 status，看不出是环境问题。
  const childEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (/^(path|pathext|systemroot|windir|comspec|temp|tmp|lang|lc_all|node_options)$/i.test(key)) {
      childEnv[key] = value;
    }
  }
  const cli = spawnSync(process.execPath, [scriptPath], {
    encoding: 'utf8',
    env: childEnv,
    timeout: 30000
  });
  assert.strictEqual(cli.error, undefined, `spawn failed: ${cli.error && cli.error.message}`);
  assert.strictEqual(cli.signal, null, `killed by signal ${cli.signal}`);
  assert.strictEqual(cli.status, 0, cli.stderr || cli.stdout);
  assert.match(`${cli.stdout}\n${cli.stderr}`, /warning|警告/i);

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

  console.log('PASS Cloudflare cache purge regression checks');
};

run().catch(error => {
  console.error(error);
  process.exit(1);
});
