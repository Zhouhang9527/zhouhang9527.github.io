'use strict';

require('dotenv').config();

/**
 * 反向代理配置
 * 在此文件中定义需要代理的目标 API 地址
 */
const config = {
  // 服务器监听端口，优先读取环境变量 PORT
  port: (Number(process.env.PORT) || 3000),

  // 允许跨域请求的来源，* 表示允许所有来源
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // 代理路由规则列表
  // path      : 本地路由前缀
  // target    : 目标服务器地址
  // pathRewrite: 将本地路径重写后再转发（可选）
  proxies: [
    {
      path: '/openai',
      target: process.env.OPENAI_TARGET || 'https://api.openai.com',
      pathRewrite: { '^/openai': '' },
      description: 'OpenAI API 反向代理',
    },
    {
      path: '/github',
      target: 'https://api.github.com',
      pathRewrite: { '^/github': '' },
      description: 'GitHub API 反向代理',
    },
    {
      path: '/httpbin',
      target: 'https://httpbin.org',
      pathRewrite: { '^/httpbin': '' },
      description: 'httpbin 测试用反向代理',
    },
  ],
};

module.exports = config;
