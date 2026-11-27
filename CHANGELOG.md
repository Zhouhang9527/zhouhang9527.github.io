# 变更记录

只有实际进入当前实现的变更列在这里；待办统一见 [TASKS](docs/TASKS.md)，当前验收见 [TESTING](docs/TESTING.md)。历史阶段报告和旧完整更新日志已按原字节保全在私有历史档案，可通过来源提交追溯；不再把旧计划当现状。

## 2026-11-26 — 历史 Agent 残留收敛

- 从完整 VN 后继实现收敛为唯一 Astro 站点；停用 Hexo/NexT 子模块、第二套构建/部署配置、ATRI 组件/库/语音桥和失效调试/LLM/统计服务入口。
- 将旧原作派生图、旧语音实物、模型和来源文档按 blob/SHA256 归档私有库；保留原始游戏资源、作者比赛笔记、原文章及附件。原作场景改由已有安全 localhost 服务直接读取，公开版本明确不可用。
- 正式脚本直接采用 Astro 生命周期，删除构建时字符串适配和无消费者 Hero/Fancybox 分支；修复首页筛选可达性及导航后 drawer/body/meter 重绑。
- 根 workspace、单 lockfile、单站点验收 CI；保留独立音乐服务运维与缓存工具，但构建不调用生产服务。
- 整合已有未提交候选的日期/时区/Atom/排序链和旧 heading fragment 兼容，保持 URL 和 Giscus identity。
- 项目文档收敛为根 docs 七入口，增加持久 Agent 约束。原作像素/音频精度、线上发布与安全大版本迁移不因此自动完成。

## 2026-11-27 — 安全升级、source-tier 运行时与独立验收

- 将 Astro 升级至 7.4.13，Node 最低版本调整为 22.23.4；保留现有 Markdown、52 个旧 fragment、日期/Atom、ClientRouter 与唯一锁文件。全量与 runtime `npm audit` 均为 0。
- 完成 150 手动存档与独立 quick/story snapshot、确认/设置/SOUND/BACKLOG/EXTRA 和 NEW GAME 博客路线状态；正常 URL 直达和历史行为仍不作为访问门禁。
- 将经过 source/hash 校验的 numeric projection、source-linked static emotion、三语原字幕以及原 logical source-resolution tiers 接入现有 mascot 单 canvas/RAF；不支持或未绑定语义仍显示 unavailable，不伪称完整 KAG。
- 独立真实原版 TITLE/SYSTEM 和 `-printdatapath` 诊断证据保存在私有工作区。初始 TITLE 对应完整 `data-003` 睁眼 CG，首阶段 NEXT 不留空行；该博客阶段映射不等同原作 flags。MAP/LOAD 原作状态与逐帧时序尚未验收。
- 冻结运行时代码经 H 独立浏览器/素材/隐私/性能检查；性能记录保留 Chromium native working-set 增长，不作“零泄漏”保证。真实 Giscus 登录/发帖/编辑、人工听音和生产部署未执行。

## 2026-11-27 — 冻结收尾与可复现的本地验收（03:55 历史封存）

- 接续原有七份未提交文档，纠正历史 Hexo 根目录、Astro 冻结 worktree、本地/远端 SHA 与旧 PR 绿灯的区别；运行时 `4383c83f`、lockfile 和私有 ad7e… 包保持不变，未 commit/push/部署。
- 新 clean detached 验收重新执行安装、237 单测、类型检查、76 页构建/15 篇索引、62 旧路由/递归隐私、双 audit 0，以及公共三宽/motion/no-JS/touch/生命周期；真实私有 UI 与 live Giscus 按实际覆盖分层记录，不冒称账号操作或听音。
- 正式文档补足 tracked 私有四档包重建入口、全量原声静态覆盖口径、3 条数值片段 LL 使用边界与用户可执行的人工验收。原 flags/语音/LL 工具扩展保留独立私有候选，不声称它们已作为公共剧情引擎接入。
- 本轮视觉终检另外定位桌面 main 标题 h1 与 CONTINUE 重叠；仅把桌面私有 h1 加入既有视觉隐藏 selector，保留 ARIA、移动端和公开 fallback。独立两文件修正候选已由 H 重跑静态门禁、私有三宽 first/main 和 public 保持对照；原冻结提交未改，没有新 commit，完整 patch/hash 与回执见 HANDOFF/TESTING。

## 2026-11-27 — 用户授权后的本地提交

- 将已独立验收的桌面 private 标题 h1 最小修正和 first/main 像素/ARIA 回归整合进当前分支；原冻结提交与 authored 内容不变。
- 接续并提交正式文档收尾，区分凌晨封存回执和本轮真实新提交的后续独立验收；未推送、合并或部署。

## 2026-11-27 — 提交后的私有原作语义推进

- 两个核心提交已由 H 对精确 SHA 新树复验，fresh install/静态/标题三宽与私有 source 回归分层记录。
- 在私有研究运行时实现四个源 sf 的保存/恢复、明确存储错误和真实重载；补原生纯白 event 图层终态，未知色彩/转场仍不可用。公共运行时、博客阅读存档、原素材与 pack 不改。
- 私有组合包含 CI sparse 的两条精确文本依赖，不跳过源绑定测试，不把作者结果冒充独立验收；无 push/合并/部署。
