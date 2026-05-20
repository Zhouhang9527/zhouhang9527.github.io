const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const HOST = process.env.GINKA_BACKEND_HOST || '0.0.0.0';
const PORT = Number(process.env.GINKA_BACKEND_PORT || 4011);
const LIKE_RATE_LIMIT_MS = Number(process.env.GINKA_LIKE_RATE_LIMIT_MS || 8000);
const MAX_BATCH_PATHS = Number(process.env.GINKA_MAX_BATCH_PATHS || 200);
const REQUEST_BODY_LIMIT_BYTES = 16 * 1024;

const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'post-stats.json');

const defaultOrigins = [
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'http://localhost:4010',
  'http://127.0.0.1:4010',
  'https://zhouhang9527.github.io'
];

const configuredOrigins = String(process.env.GINKA_ALLOWED_ORIGINS || process.env.GINKA_ALLOWED_ORIGIN || '')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

const allowedOrigins = configuredOrigins.length ? configuredOrigins : defaultOrigins;

function ensureStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({ posts: {} }, null, 2), 'utf8');
  }
}

function readStore() {
  ensureStore();
  try {
    const raw = fs.readFileSync(dataFile, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.posts !== 'object') {
      return { posts: {} };
    }
    return parsed;
  } catch (_error) {
    return { posts: {} };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, JSON.stringify(store, null, 2), 'utf8');
}

function normalizePostPath(input) {
  let value = typeof input === 'string' ? input.trim() : '';
  if (!value) return '/';
  if (!value.startsWith('/')) value = `/${value}`;
  value = value.replace(/\/{2,}/g, '/');
  if (value.length > 1 && value.endsWith('/')) value = value.slice(0, -1);
  if (value.length > 200) value = value.slice(0, 200);
  return value;
}

function getRequestOrigin(req) {
  return String(req.headers.origin || '').trim();
}

function isOriginAllowed(origin) {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

function buildCorsHeaders(req) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };

  const origin = getRequestOrigin(req);
  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }

  return headers;
}

function sendJson(req, res, statusCode, payload, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...buildCorsHeaders(req),
    ...extraHeaders
  };

  res.writeHead(statusCode, headers);
  if (statusCode === 204) {
    res.end();
    return;
  }
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let totalBytes = 0;
    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    req.on('data', chunk => {
      if (settled) return;
      totalBytes += chunk.length;
      if (totalBytes > REQUEST_BODY_LIMIT_BYTES) {
        fail(new Error('Request body too large'));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (_error) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', fail);
  });
}

function ensurePostRecord(store, postPath) {
  if (!store.posts[postPath]) {
    store.posts[postPath] = {
      views: 0,
      likes: 0,
      updatedAt: null
    };
  }
  return store.posts[postPath];
}

function getPostSnapshot(store, postPath) {
  const stat = store.posts[postPath];
  if (!stat) {
    return { views: 0, likes: 0, updatedAt: null };
  }
  return {
    views: Number(stat.views) || 0,
    likes: Number(stat.likes) || 0,
    updatedAt: stat.updatedAt || null
  };
}

function statPayload(postPath, stat) {
  return {
    ok: true,
    path: postPath,
    views: Number(stat.views) || 0,
    likes: Number(stat.likes) || 0,
    updatedAt: stat.updatedAt || null
  };
}

function sanitizePathList(pathsInput) {
  if (!Array.isArray(pathsInput)) return [];
  const unique = new Set();
  for (const item of pathsInput) {
    unique.add(normalizePostPath(item));
    if (unique.size >= MAX_BATCH_PATHS) break;
  }
  return Array.from(unique);
}

function getClientFingerprint(req, postPath) {
  const rawForwarded = req.headers['x-forwarded-for'];
  const forwarded = Array.isArray(rawForwarded) ? rawForwarded[0] : String(rawForwarded || '');
  const ip = (forwarded.split(',')[0] || req.socket.remoteAddress || 'unknown')
    .trim()
    .replace(/^::ffff:/, '');
  const ua = String(req.headers['user-agent'] || 'unknown').slice(0, 180);
  return `${ip}|${ua}|${postPath}`;
}

const likeRateMap = new Map();

function checkLikeRateLimit(req, postPath) {
  const now = Date.now();
  const key = getClientFingerprint(req, postPath);
  const last = likeRateMap.get(key) || 0;

  if (now - last < LIKE_RATE_LIMIT_MS) {
    return {
      allowed: false,
      retryAfterMs: LIKE_RATE_LIMIT_MS - (now - last)
    };
  }

  likeRateMap.set(key, now);

  if (likeRateMap.size > 5000) {
    const expireBefore = now - LIKE_RATE_LIMIT_MS * 3;
    for (const [entryKey, time] of likeRateMap.entries()) {
      if (time < expireBefore) {
        likeRateMap.delete(entryKey);
      }
    }
  }

  return { allowed: true, retryAfterMs: 0 };
}

let store = readStore();
let writeQueue = Promise.resolve();

function queueStoreMutation(mutator) {
  const runMutation = () => Promise.resolve().then(() => {
    const result = mutator(store);
    writeStore(store);
    return result;
  });

  writeQueue = writeQueue.then(runMutation, runMutation);
  return writeQueue;
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const origin = getRequestOrigin(req);

    if (origin && !isOriginAllowed(origin)) {
      sendJson(req, res, 403, {
        ok: false,
        error: 'Origin not allowed'
      });
      return;
    }

    if (req.method === 'OPTIONS') {
      sendJson(req, res, 204, null);
      return;
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/health') {
      sendJson(req, res, 200, {
        ok: true,
        service: 'ginka-backend',
        now: new Date().toISOString(),
        likeRateLimitMs: LIKE_RATE_LIMIT_MS
      });
      return;
    }

    if (req.method === 'GET' && requestUrl.pathname === '/api/post-stats') {
      const postPath = normalizePostPath(requestUrl.searchParams.get('path') || '/');
      const stat = getPostSnapshot(store, postPath);
      sendJson(req, res, 200, statPayload(postPath, stat));
      return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/post-stats/batch') {
      const body = await readJsonBody(req);
      const paths = sanitizePathList(body.paths);
      const stats = {};

      for (const postPath of paths) {
        stats[postPath] = getPostSnapshot(store, postPath);
      }

      sendJson(req, res, 200, {
        ok: true,
        stats
      });
      return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/post-view') {
      const body = await readJsonBody(req);
      const postPath = normalizePostPath(body.path || '/');

      const payload = await queueStoreMutation(currentStore => {
        const stat = ensurePostRecord(currentStore, postPath);
        stat.views = (Number(stat.views) || 0) + 1;
        stat.updatedAt = new Date().toISOString();
        return statPayload(postPath, stat);
      });

      sendJson(req, res, 200, payload);
      return;
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/post-like') {
      const body = await readJsonBody(req);
      const postPath = normalizePostPath(body.path || '/');

      const limit = checkLikeRateLimit(req, postPath);
      if (!limit.allowed) {
        sendJson(req, res, 429, {
          ok: false,
          error: 'Too many like requests',
          retryAfterMs: limit.retryAfterMs
        }, {
          'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000))
        });
        return;
      }

      const deltaRaw = Number(body.delta);
      const delta = Number.isFinite(deltaRaw) && Math.abs(deltaRaw) === 1 ? deltaRaw : 1;

      const payload = await queueStoreMutation(currentStore => {
        const stat = ensurePostRecord(currentStore, postPath);
        stat.likes = Math.max(0, (Number(stat.likes) || 0) + delta);
        stat.updatedAt = new Date().toISOString();
        return statPayload(postPath, stat);
      });

      sendJson(req, res, 200, payload);
      return;
    }

    sendJson(req, res, 404, { ok: false, error: 'Not Found' });
  } catch (error) {
    sendJson(req, res, 400, { ok: false, error: error.message || 'Bad Request' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[ginka-backend] listening on http://${HOST}:${PORT}`);
  console.log(`[ginka-backend] data file: ${dataFile}`);
  console.log(`[ginka-backend] allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`[ginka-backend] like rate limit: ${LIKE_RATE_LIMIT_MS}ms`);
});
