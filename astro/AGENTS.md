# Astro 模块约束

项目当前状态及任务只维护在根 `docs/`，先读根 `AGENTS.md`。这里不维护第二套路线图。

- Astro 5 SSG + TypeScript，Node >=22.12 <25；不引入无必要的 hydration 框架。根 npm workspace/lockfile 统一依赖。
- `src/pages` 是路由入口；`src/layouts/Layout.astro` 是唯一壳；domain 管纯状态，runtime 管浏览器副作用，tools 管生成/审计/测试。明确 Props 和路由联合类型。
- 既有项目脚本原生订阅 Astro 生命周期：persistent 实例只挂一次，`astro:before-preparation` 清理，`astro:after-swap` 重绑 body 引用，`astro:page-load` 初始化当前路由。禁止构建时替换源字符串或依赖 NexT 全局。
- 阅读内容由根 `source/_posts` 提供；冻结 legacy 路由/fragment、完整日期/时区、Giscus pathname 和 persistent BGM。音乐统一 SYSTEM → SOUND，不增加第二播放器。
- 只执行已知 SystemAction 白名单，原作脚本是证据而非可 eval 的程序。私有 research runtime 不自动成为浏览器正式实现。
- 私有资源仅在本地 dev 中间件读取，不写入 public/.generated/dist。无包时明确不可用，不造立绘/声音/剧情。
- 变更后实际运行根 npm test/typecheck/build 及对应浏览器验收；保持无 JS 阅读、键盘、触屏、两种阅读主题、reduced motion、评论与连续音乐。见 `../docs/TESTING.md`。
