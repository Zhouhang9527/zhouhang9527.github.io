'use strict';

/**
 * 反向代理 API 服务器
 * 仅用于学习目的 - For Learning Only
 *
 * 核心依赖：
 *   express               - HTTP 框架
 *   http-proxy-middleware - 反向代理中间件
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('./config');

const app = express();

// ─── 1. 基础中间件 ────────────────────────────────────────────────────────────

// 解析 JSON 请求体（非代理路由使用）
app.use(express.json());

// 简单的 CORS 处理中间件
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  // 预检请求直接返回 204
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// 请求日志中间件
app.use((req, _res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.url}`);
  next();
});

// ─── 2. 注册代理路由 ──────────────────────────────────────────────────────────

config.proxies.forEach(({ path, target, pathRewrite, description }) => {
  console.log(`注册代理路由: ${path}  ->  ${target}  (${description})`);

  app.use(
    path,
    createProxyMiddleware({
      target,
      changeOrigin: true,           // 修改 Host 请求头为目标域名
      ...(pathRewrite && { pathRewrite }),
      on: {
        // 转发请求前的回调：可在此处添加认证 Header 等逻辑
        proxyReq(proxyReq, req) {
          // 示例：将客户端传来的 Authorization Header 原样转发
          const auth = req.headers['authorization'];
          if (auth) {
            proxyReq.setHeader('Authorization', auth);
          }
        },
        // 收到目标服务器响应后的回调
        proxyRes(proxyRes, req, res) {
          const status = proxyRes.statusCode;
          console.log(`  <- ${status} ${req.method} ${req.url}`);
          // 在响应头中标记请求经过了反向代理
          res.setHeader('X-Proxied-By', 'reverse-proxy-api');
        },
        // 代理出错时的回调
        error(err, _req, res) {
          console.error('代理错误:', err.message);
          if (!res.headersSent) {
            res.status(502).json({
              error: 'Bad Gateway',
              message: '代理目标服务器不可达，请检查配置或网络',
              detail: err.message,
            });
          }
        },
      },
    }),
  );
});

// ─── 3. 辅助路由 ─────────────────────────────────────────────────────────────

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 列出所有代理规则
app.get('/', (_req, res) => {
  res.json({
    name: 'reverse-proxy-api',
    description: '反向代理 API 学习项目',
    routes: config.proxies.map(({ path, target, description }) => ({
      path,
      target,
      description,
      example: `http://localhost:${config.port}${path}/...`,
    })),
  });
});

// 404 处理
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: '该路由不存在，请查看 / 获取可用路由列表' });
});

// ─── 4. 启动服务器 ────────────────────────────────────────────────────────────

app.listen(config.port, () => {
  console.log('');
  console.log('======================================');
  console.log('  反向代理 API 服务器已启动（仅学习用）');
  console.log(`  地址: http://localhost:${config.port}`);
  console.log('  路由列表:');
  config.proxies.forEach(({ path, target }) => {
    console.log(`    ${path}  ->  ${target}`);
  });
  console.log('======================================');
  console.log('');
});

module.exports = app;
