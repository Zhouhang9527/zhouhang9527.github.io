# Agent assignments — 2026-11-25 batch

本表记录本轮实际分派与文件所有权，不是实时在线状态。首轮八个真实子代理并行只读审计，随后按依赖分配隔离开发/复核；未将“started”当作已完成。目标基线为 `origin/feature/ginka-vn @ 5bd5b6b5`；各子工作树均从该修订建立，未覆盖用户已有脏工作树。主 Agent 审阅实际 diff 与测试后才整合。

| Task | Owner / role | 范围 | 本轮交付状态 |
|---|---|---|---|
| AUDIT-A | 博客结构审计 | 旧 Hexo 磁盘树、配置、只读检查 | 已回报；不代表新构建通过 |
| AUDIT-B | 资源审计 | D/E 两份私库工作树、XP3/语音/立绘索引 | 已回报；区分旧 checkout 与新远端，未重组原归档 |
| AUDIT-C | 分支/运行时审计 | 分支 tree、脏 worktree、架构/重复开发 | 已回报；main 与 VN 无共同祖先，禁止盲合并 |
| AUDIT-D/H | 远端/CI 审计 | PR、Actions 真实状态、测试断言边界 | 已回报；5bd 双 CI 绿只覆盖公共/合成测试 |
| AUDIT-E/J | 内容与产品决策 | 历史 URL、日期、heading、about 评论、已决/待决 | 已回报；Pending 记 DECISIONS，未重问已有契约 |
| AUDIT-F/K/R | 发布隔离复核 | 私有请求、48 场景图发布链、公开 refs/URL、artifact 边界 | 已回报；未下载 artifact ZIP，限流不能当不可下载证明 |
| AUDIT-G | 生命周期审计 | BGM metadata、Reader 模式、drag 清理 | 已回报；确认条件性状态问题，不泛称无界泄漏 |
| AUDIT-P/Q | parser / 原作执行证据 | XP3 offline tests、私有 scheduler 与公开集成差异 | parser 缺缓存依赖、实际启动0测试；私有 reducer/scheduler 内存21/21，未等同真实全章 |
| AUDIO-SEEK | 隔离 Agent | `source/js/ginka-music.js` 与独立回归 | Lead 已审查并整合；新增 source/sequence guard，4/4 回归通过（其中1项为 Lead 补测） |
| ABOUT-COMMENTS | 隔离 Agent | `StaticPage.astro`、about 回归 | Lead 仅整合局部模板与内存渲染单测；4/4 通过。候选 verify/browser 扩展暂留其独立树，未伪称已跑 |
| HEADING-COMPAT | 隔离 Agent | 历史 heading fragment 映射/别名/回归 | 独立 `feature-ginka-heading-compat` 工作树；未整合，需实际渲染核验 |
| DATE-FIDELITY | 隔离 Agent | 原时间/时区、排序、Atom/metadata、dateOnly显示 | 独立 `feature/ginka-date-fidelity` 工作树；未整合，需审查类型与源级/渲染回归 |
| PUBLIC-PREFLIGHT | Lead（参考只读设计审计） | `public-asset-policy.mjs`、prepare 前置 gate、测试 | 已整合；4/4 测试 + actual prepare 非零拒绝48项、无 staging 生成 |
| MARKDOWN-BREAKS | Lead | Astro config、锁定 remark-breaks、单测 | 已整合；2/2 AST 测试通过，完整 HTML 待验 |
| INTEGRATION/DOCS | Lead | 根/共享配置、脚本接线、文档、最终审查 | 41/41 本地安全单测通过；不自动 push/deploy，不把 guard 阻断称完整 build 通过 |

## 隔离工作树

- 集成：`D:/GINKA-Blog/.agents/worktrees/feature/ginka-vn`
- 音频候选：`D:/GINKA-Blog/.agents/worktrees/feature-ginka-audio-seek-race`
- 标题锚点候选：`D:/GINKA-Blog/.agents/worktrees/feature-ginka-heading-compat`
- about 候选：`D:/GINKA-Blog/.agents/worktrees/feature/ginka-vn/.agents/worktrees/feature/ginka-about-comments`
- 日期候选：`D:/GINKA-Blog/.agents/worktrees/feature/ginka-vn/.agents/worktrees/feature/ginka-date-fidelity`

主树 `D:/GINKA-Blog`、dialogue 树及 Codex 旧 worktree 的原有未提交内容全部保留。子树路径可能较深，但不要为整理目录而移动仍在执行的工作树。公共配置/lock/CI/全局样式只有 Lead 合并，避免多个补丁各自覆盖对方。
