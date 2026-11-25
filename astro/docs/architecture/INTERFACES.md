# Shared runtime integration contracts

基线：公开 `feature/ginka-vn @ 5bd5b6b5`；2026-11-25 审计。本文是集成边界及所有权约束，不代表七个统一服务都已实现，也不引入第二套运行时。任务状态仍以 TODO.md 为唯一清单。

## 当前实现边界

| 逻辑服务 | 现有可复用实现 | 状态与限制 | 后续唯一接入边界 |
|---|---|---|---|
| ResourceManager | `tools/local-mascot.mjs`、`local-vn-ui.mjs`、`local-title-art.mjs`、`private-http.mjs` | 只有私有预览固定路由、schema 与缓存/路径校验；没有通用跨页面 ResourceManager | 先复用私有 pack manifest 与固定 URL 协议；原始 storage/source/hash 证据留私库。公开构建另受 public-asset-policy 保护。不得每页面新增加载器或任意本地文件路径接口。 |
| SceneInterpreter | 私有 `OriginalSceneHost` / `original-scene` 研究运行时；公开 `vn-actions.ts` 仅 SystemAction 精确白名单 | 公开 Astro **未集成**；白名单不是 TJS/KAG 解释器 | 取证/审查私有 program schema 后再确定 adapter；未知指令保留并诊断，不 eval 原始 TJS/JavaScript，不静默跳过。 |
| ActionScheduler / SceneClock | 私有 SceneScheduler 有可控时间、部分相对/循环动作、测试 | SOURCE_BACKED 私有研究实现；未进入 Astro，完整循环/同属性并行/随机序列仍有限制 | 不在 Mascot、Title 或其他页面复制一套动作内核；统一 adapter 必须明确 ms 单位、cancel/pause/restore、确定性时钟和错误诊断。 |
| Renderer | `src/lib/vn-control.ts`、`sprite.ts`、`tools/png-atlas.mjs`、`vn-mascot.ts` Canvas 合成 | 部分几何/图层已实现；通用场景 renderer、相机与原作矩阵 **未完成** | 复用 1280×720 原作逻辑矩形及已验证 crop/offset/rotation；PBD 层序与 canvas/baseRect 不凭文件名推断。浏览器像素和原作视觉分别验收。 |
| AudioEngine | `source/js/ginka-music.js` 的单持久 BGM 与 `vn-mascot.ts` 的单 Voice | 功能分属两现有 owner；尚无统一 BGM/SE/ENV/SYSTEM VOICE 调度服务 | 本轮不重写播放器；新增通道必须复用既有音量/生命周期，明确 user gesture、source generation、停止/完成事件。不能用 RMS 口型近似冒充原作 phoneme。 |
| StoryState / SaveState | `src/domain/reading-state.ts`、`voice-history.ts`、`vn-progress.ts` | 独立博客阅读状态和 150 手动档；不是完整原作 sf/tf/场景/音轨快照 | 保留 version schema、canonical path、section-relative position；原作 flags 与博客 completion 分离，映射由显式产品决定控制，绝不把阅读数量当原作剧情证据。 |
| MascotRuntime | `vn-mascot.ts` + `GinkaMascot.astro` + 私有 v1/v2 pack | 部分真实精选包协议和合成回归；不代表完整 catalog/原声/解锁均验收 | 继续 MASCOT-PACK.md 的已验证 schema；角色/服装/phase 资格先过滤，再加载。显示、对白、历史、回放共享单 runtime。缺素材明确 unavailable。 |

## 当前稳定契约

- 页面 URL 是文章与历史评论身份的权威；不生成第二套 game/reader 文章 URL，不重算旧 canonical，不改变 Giscus pathname。
- Astro ClientRouter 是导航 owner；持久对象初始化一次。页面状态在 `astro:page-load` 挂载，`astro:before-preparation` 清理，`astro:after-swap` 重取路由 DOM；每个 listener/timer/observer 必须有明确 disposer。
- 私有媒体只能通过 localhost 预览的已登记路由访问；无任意 storage→filesystem 公网接口；Host/Origin/Range/CORP 校验复用 private-http。
- 合成 fixtures 只能证明 schema/几何/生命周期；真实原图解码、原声、像素/动画/原宿主语义需要独立证据，状态分别标 SOURCE_BACKED / APPROXIMATION / ENHANCEMENT / UNKNOWN / NOT_IMPLEMENTED。
- 类型/序列化以实际现有 domain TS 与 MASCOT-PACK 协议为准；此文不冻结一个尚未评审的全新 API。下一次统一 runtime 接入前，必须先提供实际私有 program → adapter 类型、错误行为和生命周期单测，不用占位 interface 宣称完成。

## 公共文件唯一负责人

`astro/package.json`、lockfile、`astro.config.mjs`、`tools/prepare.mjs`、CI、全局样式及本文：**Lead** 统一审查整合；子 Agent 在独立 worktree 上提交候选 diff，不直接并发修改 Lead 工作树。局部模块/测试的本轮 owner 见 AGENT_ASSIGNMENTS.md。不得整目录覆盖旧 artbook/dialogue 脏工作树，也不得假设无共同祖先的生产 main 可普通快进合并。
