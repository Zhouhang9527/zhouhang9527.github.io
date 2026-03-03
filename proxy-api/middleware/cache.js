'use strict';

/**
 * 内存缓存中间件（In-Memory Cache）
 * ─────────────────────────────────────────────────────────────────
 * 用途：缓存 GET 请求的响应，避免对同一接口重复请求，减少延迟和 API 调用次数。
 *
 * 实现方式：简单 Map 缓存（Key = 完整请求 URL，Value = 序列化后的响应体）
 *
 * @param {object} options
 * @param {number} options.ttl - 缓存存活时间（毫秒），默认 30 000（30 秒）
 */
function cache({ ttl = 30_000 } = {}) {
  // key: url  value: { body, headers, statusCode, expireAt }
  const store = new Map();

  return function cacheMiddleware(req, res, next) {
    // 仅缓存 GET 请求
    if (req.method !== 'GET') {
      return next();
    }

    const key = req.originalUrl || req.url;
    const cached = store.get(key);

    if (cached && cached.expireAt > Date.now()) {
      // 命中缓存，直接返回
      res.setHeader('X-Cache', 'HIT');
      if (cached.contentType) {
        res.setHeader('Content-Type', cached.contentType);
      }
      return res.status(cached.statusCode).send(cached.body);
    }

    // 未命中缓存，拦截 res.end 以便保存响应内容
    res.setHeader('X-Cache', 'MISS');

    const originalEnd = res.end.bind(res);
    const chunks = [];

    const originalWrite = res.write.bind(res);
    res.write = (chunk, ...args) => {
      if (chunk != null) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      return originalWrite(chunk, ...args);
    };

    res.end = (chunk, ...args) => {
      if (chunk != null) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      // 只缓存 2xx 响应
      if (res.statusCode >= 200 && res.statusCode < 300) {
        store.set(key, {
          body: Buffer.concat(chunks),
          statusCode: res.statusCode,
          contentType: res.getHeader('content-type'),
          expireAt: Date.now() + ttl,
        });
      }
      return originalEnd(chunk, ...args);
    };

    return next();
  };
}

module.exports = cache;
