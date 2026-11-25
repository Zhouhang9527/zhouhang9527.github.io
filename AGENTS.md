# 项目级 Agent 合同

## 开发前
- 先读 `docs/ARCHITECTURE.md`、`docs/HANDOFF.md`、`docs/TASKS.md`，核对当前 Git HEAD、工作区和既有实现；不要根据旧会话完成报告推断现状。
- 唯一正式站点在 `astro/`。`source/_posts` 和附件是内容权威；`source/js`、`source/css` 是仍在用的正式模块，不是旧主题副本。不得重新引入 Hexo/NexT/PJAX/ATRI 运行时。
- UI 修改还须阅读 `design-system/ginka/MASTER.md` 和对应页面约束。原作模式使用原作固定色彩；阅读模式独立支持 day/moonlit/system。

## 修改纪律
- 优先修改已有正式模块。禁止未经确认另建 renderer-new/v2/final、第二播放器、第二状态系统或重复运行时。
- 新实现替代旧实现时，同一批次删除失效调用、依赖、配置、测试和文档；先证明动态加载、构建、测试以及原作证据关系，不凭文件名/时间删文件。
- 不为假设性需求增加抽象、适配器、feature flag 或 fallback。保留真实的错误/重试/不可用状态，不静默吞错或伪造数据。
- 禁止随意新增公共配置；配置所有权见 `docs/INTERFACES.md`。根 npm workspace + 根 lockfile 是唯一依赖入口。
- 不改 `astro/public`、`.generated`、`dist` 等生成物。媒体增加/变更须审查来源并更新 `astro/config/public-assets.json`；不得放宽素材白名单、发布私有原作数据或绕过 loopback 防护。
- 临时实验放独立工作区或 ignored 的 `artifacts/`，结束后清理自己产生的临时物；不得删其他会话现场。
- 维持清晰的文件所有权和模块边界；并发审计只读，删除、迁移和公共模块整合由主 Agent 协调。
- 未经确认不改变整体架构、历史文章 URL、Giscus pathname 映射、主线集合、存档格式或单一持久音频对象。

## 文档、验收和 Git
- 只更新 `docs/TASKS.md` 这一份正式任务清单；决定写 `DECISIONS`，最新状态写 `HANDOFF`，完成内容写 `CHANGELOG`。禁止每次结束另建完整规划/TODO/交接报告。
- 测试必须实际执行，区分纯单测、合成浏览器、真实素材、线上集成；不把测试脚本存在或旧 CI 成功说成当前通过。
- 原始资源及有独立价值的反编译/参数/研究证据不可因未被运行时引用而删除；留在私有资料库，不搬进公共文档或构建。
- 先检查所有 worktree 和 PR；不重置/清理他人 dirty 树，不删未整合成果，不 force push，不改写历史。仅在用户要求时 commit/push；生产部署必须单独明确请求。
