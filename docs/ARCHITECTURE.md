# 当前架构

## 唯一实现

Astro 5 静态生成 + TypeScript + 原生 CSS/JavaScript。根 npm workspace 调用 `astro`，根 lockfile 是唯一依赖快照。当前开发架构已收敛；**生产 main 尚未切换**。历史 Hexo/NexT 不在当前树并行运行，回滚通过原 Git 提交恢复。

```text
已跟踪 source/_posts + about/links
        ↓ prepare（路径、媒体 hash、symlink 审查）
astro/.generated + astro/public
        ↓ Astro → Pagefind → metadata → verify
astro/dist                 （静态构建；没有部署动作）

独立私有资料库 → loopback-only Vite 中间件 → 本地原作预览
                 不经过 public/.generated/dist
```

## 模块与入口

| 所有权 | 正式入口 | 职责 |
|---|---|---|
| 内容 | `source/_posts/`、附件、`source/about/`、`source/links/` | 原文权威，保持既有 URL/日期/fragment |
| 站点 | `astro/src/pages/`、`layouts/Layout.astro` | SSG、ClientRouter、语义结构、SEO |
| 数据 | `astro/src/lib/site.ts`、`content.config.ts` | 文章/分类/路由，不复制内容 |
| 状态 | `astro/src/domain/` | 阅读、偏好、白名单动作、语音历史的纯逻辑 |
| 原作导航 | `astro/src/runtime/vn-*`、`components/game/` | 标题、独立存档、SYSTEM、BACKLOG、消息窗、看板娘 |
| 阅读与集成 | `source/js/ginka-*`、`source/css/` | 阅读增强、主题、真实 Giscus、唯一持久播放器 |
| 页面辅助 | `astro/public-shell.js` | Pagefind、原生 dialog、侧栏；不是第二个导航框架 |
| 构建 | `astro/tools/prepare.mjs`、`metadata.mjs`、`verify.mjs` | 确定性暂存、内容 hash、SEO 与发布契约 |
| 本地资源 | `astro/tools/local-*`、`private-http.mjs` | 私有原图/字体/语音校验与 loopback 服务 |
| 独立运维 | `tools/deploy/` | 音乐服务器参考镜像、显式缓存操作；不由 build 调用 |
| 作者研究笔记 | `wp/` | 保留独立 authored 文本和附件，不作为第二套站点内容 |

## 生命周期和数据

- ClientRouter 是唯一站点路由器。persistent 音频、侧栏等只建一次；当前路由状态在 Astro 事件中清理/重绑。不生成 `renderer-v2` 或 PJAX 兼容层。
- 主线固定为 `vn-mainline.json` 的 15 篇 v1 路径；新增文章不抬高通关门槛。NEXT 为独立后日谈，不等于“下一篇文章”。
- 阅读记录在本地，最近 100 条；150 个手动档（15×10）独立于快速档、最近阅读和收藏。URL 是内容权威，不是存档数据决定的虚拟页面。
- `ginka-music.js` 管唯一 BGM/audio；`vn-music.ts` 是 SOUND 视图转发，不是重复播放器。Giscus 保持真实 iframe/pathname，不能跨域伪造评论。
- 无原作包时不展示假立绘/语音/CG。公共标题是文字导航，画廊明确不可用；私有模式读取原始图像。博客进度映射不是原作 flags 或完整 KAG 解释器。

## 证据边界

原始游戏数据、反编译结果、视频参考、独立 scheduler/camera/host 研究及参数保留在私有库。它们未被公共运行时消费不代表可删。公开文档只描述接口和验证级别，原作来源详情不重复外迁。私有研究引擎尚未接入 Astro，不声称完整原作复现。

决定与删减依据见 [DECISIONS](DECISIONS.md)，接口见 [INTERFACES](INTERFACES.md)，实际验证见 [TESTING](TESTING.md)。
