'use strict';

/**
 * 请求 / 响应改写示例中间件（Transform）
 * ─────────────────────────────────────────────────────────────────
 * 用途：演示如何在转发前/后修改请求体或响应数据。
 *
 * 本示例在代理 httpbin 的 POST /post 路由上生效：
 *   - 请求改写：自动在请求体中追加 `_proxy: true` 字段
 *   - 响应改写：在 JSON 响应中追加 `_note` 字段
 *
 * 注意：改写响应体需要在 http-proxy-middleware 的 selfHandleResponse 模式下
 *        手动 pipe，此文件仅作为「纯 Express 路由」示例演示改写思路。
 */

const express = require('express');

const router = express.Router();

/**
 * POST /transform/post
 * 在请求体加入额外字段后转发给 httpbin，再对响应追加注释后返回给客户端。
 */
router.post('/post', express.json(), async (req, res) => {
  // ① 改写请求体
  const modifiedBody = { ...req.body, _proxy: true, _timestamp: Date.now() };

  try {
    // ② 转发到 httpbin
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modifiedBody),
    });

    // ③ 解析响应并改写
    const data = await response.json();
    data._note = '此响应由反向代理改写，原始请求体已被追加 _proxy 和 _timestamp 字段';

    res.status(response.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Bad Gateway', detail: err.message });
  }
});

module.exports = router;
