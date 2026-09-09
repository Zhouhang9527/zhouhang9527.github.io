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
