# Astro 站点模块

唯一项目入口：[根 README](../README.md)；当前架构、任务和接续信息只维护在[根 docs](../docs/ARCHITECTURE.md)。本文件不重复完整规划。

从仓库根执行 `npm ci`、`npm test`、`npm run typecheck`、`npm run build`。开发入口是 `npm run dev`，静态预览是 `npm run preview -- --host 127.0.0.1`。不要在这里创建第二份 lockfile。

`src/` 为正式页面/组件/状态/运行时；`config/` 为已声明的站点、旧 URL/fragment、主线、原作几何与公共素材契约；`tools/` 为构建、私有 localhost 中间件和测试。`public/`、`.generated/`、`dist/`、`artifacts/` 是生成物，不手工修改。

本地原作预览：根目录 `npm run dev:original -- "[PRIVATE_ASSETS_ROOT]"`。公共版本不携带原作图像、语音、脚本或字体；有真实私有素材时仍须独立完成真实渲染与声音验收。接口及边界见 [INTERFACES](../docs/INTERFACES.md)，实际测试见 [TESTING](../docs/TESTING.md)。
