# 反向代理 API 学习项目

> **仅用于学习目的** — For Learning Only

一个基于 **Node.js + Express + http-proxy-middleware** 的轻量反向代理 API 服务器，帮助你理解反向代理的工作原理。

---

## 目录

- [原理简介](#原理简介)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [配置说明](#配置说明)
- [使用示例](#使用示例)
- [常见问题](#常见问题)

---

## 原理简介

```
客户端  ──请求──>  本代理服务器  ──转发──>  目标 API 服务器
客户端  <──响应──  本代理服务器  <──返回──  目标 API 服务器
```

反向代理（Reverse Proxy）位于客户端和目标服务器之间，代替目标服务器接收请求并将响应返回给客户端。常见用途：

| 用途 | 说明 |
|------|------|
| 跨域解决 | 在代理层统一添加 CORS 响应头 |
| API 聚合 | 将多个后端服务统一暴露在同一域名下 |
| 认证注入 | 在转发前自动添加 `Authorization` 等请求头 |
| 访问加速 | 代理国内难以直接访问的境外 API |

---

## 快速开始

### 1. 安装依赖

```bash
cd proxy-api
npm install
```

### 2. 配置环境变量（可选）

```bash
cp .env.example .env
# 按需编辑 .env 文件
```

### 3. 启动服务器

```bash
# 生产模式
npm start

# 开发模式（文件修改后自动重启）
npm run dev
```

服务器默认运行在 `http://localhost:3000`。

---

## 项目结构

```
proxy-api/
├── server.js        # 主入口，创建 Express 应用并挂载代理中间件
├── config.js        # 代理路由规则配置
├── package.json     # 项目依赖与脚本
├── .env.example     # 环境变量示例（复制为 .env 后填写实际值）
└── README.md        # 本文档
```

---

## 配置说明

所有代理规则在 `config.js` 的 `proxies` 数组中定义：

```js
{
  path: '/openai',            // 本地路由前缀
  target: 'https://api.openai.com', // 转发目标地址
  pathRewrite: { '^/openai': '' },  // 路径重写规则（可选）
  description: 'OpenAI API 反向代理',
}
```

**路径重写示例：**

| 客户端请求 | 重写规则 | 实际转发到 |
|-----------|---------|-----------|
| `/openai/v1/chat/completions` | `^/openai` → `` | `https://api.openai.com/v1/chat/completions` |
| `/github/users/octocat` | `^/github` → `` | `https://api.github.com/users/octocat` |

---

## 使用示例

### 查看所有代理路由

```bash
curl http://localhost:3000/
```

### 健康检查

```bash
curl http://localhost:3000/health
```

### 代理 GitHub API

```bash
# 查询 GitHub 用户信息
curl http://localhost:3000/github/users/octocat
```

### 代理 httpbin（测试用）

```bash
# 测试 GET 请求
curl http://localhost:3000/httpbin/get

# 测试 POST 请求（携带 JSON 体）
curl -X POST http://localhost:3000/httpbin/post \
     -H "Content-Type: application/json" \
     -d '{"key": "value"}'
```

### 代理 OpenAI API（需提供 API Key）

```bash
curl http://localhost:3000/openai/v1/models \
     -H "Authorization: Bearer sk-YOUR_API_KEY"
```

---

## 常见问题

**Q: 启动后访问代理路由报 502？**  
A: 代理目标服务器不可达。检查网络连接，或在 `.env` 中将 `OPENAI_TARGET` 替换为可访问的中转地址。

**Q: 如何添加新的代理规则？**  
A: 在 `config.js` 的 `proxies` 数组中新增一个对象，填写 `path`、`target` 和可选的 `pathRewrite`，重启服务即可。

**Q: 如何修改监听端口？**  
A: 在 `.env` 中设置 `PORT=你的端口号`，或在启动时传入环境变量：`PORT=8080 npm start`。

---

## 免责声明

本项目**仅用于学习和技术研究**，请勿将其用于任何违反目标服务条款或法律法规的用途。
