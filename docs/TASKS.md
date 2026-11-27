# 唯一正式任务清单

状态只依据对应验收；代码存在、旧 CI 或 Agent 报告不自动代表当前完成。原有详细阶段清单已私有保全，以下保留有效任务标识与真实缺口，不再附加多份流水账。

## 本次收敛

- [x] CLEAN-01 A–G 七路独立审计；记录实际引用、分支/PR、原始证据与构建边界。
- [x] CLEAN-02 继承 VN 全部有效提交，退出 Hexo/NexT/ATRI 及失效调试/包装/依赖，不删 authored 文章与笔记。
- [x] CLEAN-03 旧原作派生图/语音/文档私有按字节保全，根 docs 七入口与 AGENTS 约束落仓。
- [x] CLEAN-04 一份根 lockfile、一套 Astro 原生生命周期、公共资源路径/hash/symlink 门禁。
- [x] CLEAN-05 独立回归、受保护内容检查、完整 dist 门禁与依赖升级已完成于冻结候选；2026-11-27 在全新 detached `verify-h` 再跑通过，未执行生产部署。PR #10 仍 open/draft、head 为旧 `d30e0f59`；本地 `4383c83f` 未远端可取且没有 Actions run，不能沿用旧 PR 绿灯。#9 closed/unmerged 的 superseded 关系及其他活动/dirty 分支保留。

## 内容与安全

- [x] CONTENT-01–04：真实文章软换行、52 个旧 fragment、日期/时区/排序/Atom、旧路由与 Giscus pathname 已在冻结候选通过；About/Links/INFORMATION 路径与 iframe identity 已做独立 live smoke。登录、发帖、编辑仍需用户会话，未冒称通过。
- [x] PUB-01/02：递归 dist 文本/来源标记门禁、媒体 hash/symlink 边界与私有 scene manifest 投影已通过；原作资源仍仅 loopback，门禁不声称发现所有潜在元数据或授予分发许可。
- [x] SEC-01：Astro 升级至 7.4.13，Node 固定 >=22.23.4；`npm audit` 与 `npm audit --omit=dev` 均 0，未使用 force/overrides。

## 运行时基础

- [x] BASE-01/02/04/08/10：Node 22.23.4 clean install、237/237 单测、typecheck、76 页 build、62 路由/递归 dist 门禁、公共与私有 390/1440/1920 及生命周期/搜索/存档/焦点回归通过；原声人工听感仍未验。
- [x] BASE-05/06/09：game/reader 分界、单一 audio、单一 mascot RAF、逻辑画布、coarse touch 44×44 与私有 Range/Origin/Host 隔离已覆盖；性能与 native GPU 内存不作零泄漏保证。
- [x] BASE-07 ATRI 旧组件、加载器、库、语音桥及公开生成配置已退役；历史实物私有保全。

## 原作证据与还原（尚未完整验收）

- [x] DATA-01–08：原 UI/脚本/字节码/角色/字体/相机/XP3/ASF 来源、hash、portable recipe 与缺失边界已保存在私有 evidence；首 TITLE/SYSTEM 已有真实原版截图与 source 对照。仍不等于完整解释器。
- [x] ENGINE-01–07：白名单 numeric scheduler、取消、reduced-motion、source-bound tier/overlay 已接正式单画布 renderer；未验证语义显式 unavailable。
- [ ] TITLE-01–04、MAP-01/02、STORY-01/03/04/05：首 TITLE first-launch 已按真实原版修正为 data-003/睁眼且 CONTINUE 观察位移；原 flags 全量持久化、MAP/LOAD 全状态、逐帧时序与后日谈正文仍未完成。
- [x] STORY-02 主线集合固定为 15 篇 v1，不因新文章增长。
- [ ] CHAR-01–12、AUDIO-01–06（主要运行时接入已验）：冻结私有包 40 poses/45 lines/160 tier compositions/358 blobs/45 完整解码语音；三语字幕、静态 linked emotion、3 条 source-bound 数值片段与唯一 audio 通过真实私有浏览器。完整服装/原 RNG/人工听感/全部原时序仍未验。
- [ ] GAME-01–08、SAVE-01/03–06、SYS-01–08、LOG-01–04、EXTRA-01–04、DLG-01/02/03（博客交互部分已集成）：SYSTEM、150 slots、quick/story save、BACKLOG、EXTRA、dialog、焦点/键盘/触屏与失败反馈通过冻结候选浏览器；原作所有状态/逐帧对照及线上 Giscus 认证、发帖、编辑仍未验。
- [x] SAVE-02：150 个独立手动槽、独立 quick、story snapshot、分页/缩略图/并发保护/旧档兼容与位置恢复均有专项 Chromium 回归。
- [ ] FINAL-01–07：真实首 TITLE/SYSTEM 已观察并保留私有证据；MAP/LOAD 原游戏未完成，原作全状态逐帧/性能 native 内存/人工听感/生产发布仍未验收。

## 本轮局部修正与证据扩展（保留旧冻结基线）

- [x] QA-TITLE-01 原桌面 private main 的 HTML h1 与 CONTINUE 重叠已在独立 `title-fix-b` 最小修复，仅 CSS selector + 既有 browser 回归；H 的 `verify-title-h` 对相同两文件 patch 独立通过 237 测试/typecheck/build、真实私有三宽 first/main 与 public 保持对照。原 `4383c83f` 不含此修正；两文件 patch、hash 与 final-title-receipt 见 HANDOFF/TESTING，上轮封存时未提交；本轮 14:41 获用户本地 commit 授权后已整合进当前分支，未 push，精确新提交复验另记。
- [x] EVIDENCE-01 私有 C/D/E 六文件组合在 `verify-private-h` 独立通过 graph 46/46、LL 回归 11/11、Python 总 64/64；全 1988 原声字节/header 核验与 frozen 45 完整解码分层记录。扩展仅私有审计/测试，不自动导入博客剧情状态机或解锁全部语音，原 flags 落盘/MAP/LOAD/全时序任务保持未完成。

- [x] RESEARCH-03（仅私有研究子集）：已实现四个源 sf 的独立保存/恢复与 lay_white 不透明 event 终态，组合浏览器/状态回归经独立 H 验证。并非博客存档格式替换、全 flags 落盘、原生 .ksd、MAP/LOAD 全状态或完整环境色；上述完整任务仍未完成。

## 未干扰的并行成果

- [x] PARALLEL-01 所有有效 A–H/F 结果已按 commit/evidence 审查并整合；原 dirty/active worktree 未清理、未 reset、未覆盖。
- [ ] RELEASE-01 main 与开发链仍不同根；冻结候选与 CI 已准备，生产切换、部署和缓存清理仍需单独明确批准。
