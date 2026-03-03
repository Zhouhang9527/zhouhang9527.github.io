'use strict';

/**
 * 限速中间件（Rate Limiting）
 * ─────────────────────────────────────────────────────────────────
 * 用途：防止客户端在短时间内发送过多请求，保护目标 API 的调用配额。
 *
 * 实现方式：滑动窗口计数器（内存存储，仅适用于单进程学习场景）
 *
 * @param {object} options
 * @param {number} options.windowMs  - 时间窗口大小（毫秒），默认 60 000（1 分钟）
 * @param {number} options.max       - 窗口内最大请求次数，默认 30
 */
function rateLimit({ windowMs = 60_000, max = 30 } = {}) {
  // key: IP 地址  value: 请求时间戳数组
  const store = new Map();

  return function rateLimitMiddleware(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // 取出该 IP 的历史请求时间戳，过滤掉窗口之外的旧记录
    const timestamps = (store.get(ip) || []).filter((t) => t > windowStart);
    timestamps.push(now);
    store.set(ip, timestamps);

    // 设置响应头，方便客户端了解剩余配额
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - timestamps.length));
    res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

    if (timestamps.length > max) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `限速：每 ${windowMs / 1000} 秒内最多允许 ${max} 次请求，请稍后再试`,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    return next();
  };
}

module.exports = rateLimit;
