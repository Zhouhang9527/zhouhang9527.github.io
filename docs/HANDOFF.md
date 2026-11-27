# 当前交接

更新：2026-11-27（Asia/Shanghai）。唯一架构/任务入口是本目录七文档；不要恢复旧多套 TODO、阶段报告或根 Hexo 命令。

## 当前本地提交（2026-11-27 14:41 用户授权后）

用户明确要求“提交然后继续”，本轮据此只进行本地 commit，不 push、不合并 PR、不切换已有分支、不部署或 purge。先逐文件核对上轮 delivery-index 与独立 H 回执，确认 7 份文档和 2/6 文件补丁未漂移，再把桌面标题 h1 两文件修正整合到当前 integrate/20261126-runtime；私有六文件扩展仅整合到私有候选，不进入公共仓库。原冻结 4383c83f/ca0e9b89、旧独立 worktree 和原 pack 保留。

本文件所在的本地提交包含标题修正和文档收尾；精确 HEAD 用 `git rev-parse HEAD` 获取，后续复验按实际新提交记录，不把凌晨旧报告冒充新 SHA 结果。私有 CI 的博客固定 ref 在取得该真实提交后同步；未推送时远端 checkout 仍是未满足的前置条件。下一阶段继续在新隔离 worktree 做有原作证据的功能，不覆盖候选或现有存档格式。

下列现场、未提交描述与远端观测是 03:55 封存时的历史记录；当前授权与提交状态以本节及后续实际提交记录为准。

## 上轮冻结现场与基线（03:55 封存）

- 当前冻结运行时在 `D:/ginka-work/20261126/integration`，分支 `integrate/20261126-runtime`、HEAD `4383c83ffd639c5f4b363d9c1a84c81ccbc65482`；继承清理分支和完整 VN 基线 `a1bb9d8c`。`D:/GINKA-Blog` 仍是历史 Hexo `feature/ginka-artbook@be5f6f96` 的 dirty 工作树，不是 Astro 开发入口，未覆盖、未切换或清理。
- 本轮接续原有 7 份未提交文件（CHANGELOG 与 DECISIONS/HANDOFF/INTERFACES/ROADMAP/TASKS/TESTING）；运行时代码和根 lockfile 保持冻结。私有候选在 `D:/ginka-xp3-assets-cleanup@ca0e9b89`；原私有 main 工作树 `D:/ginka-xp3-assets@4cb17faa` 保持不动。所有后续研究在 `D:/ginka-work/20261127/` 下独立 detached worktree，不反向混入冻结运行时。
- published main 未改变，且与 VN 开发链不同根。本轮没有 commit、push、PR 合并、现有分支切换、生产部署或 CDN purge；因此文档/CI 收尾是带补丁的本地候选，不是新的已发布提交。
- 原始游戏资源与逆向证据仍在独立私有库。已把 48 张旧公开派生场景、593 份真实旧语音及其他退役模型/配置/文档按原字节保全，不把它们伪称模拟/重复数据。
- 代码已经收敛为根 workspace + 单 lock + Astro 原生生命周期；保留共享原文/附件/作者笔记、真实 Giscus 与持久音乐。公开无原作画面，私有 localhost 仍可直接读取原图/角色包。
- 已审查并整体提取日期/时区/Atom/排序、严格旧 fragment 别名及对应模板测试。原候选 worktree 仍保留，不能因整合后就删正在工作的分支。

## 远端、PR 与 CI 的实测边界

2026-11-27 02:53（+08:00）只读 `git ls-remote` 与公开 GitHub API：公开 `cleanup/agent-residue-convergence` 仍为 `d30e0f59`，远端没有 `integrate/20261126-runtime`。PR #10 为 open/draft，head `d30e0f59`、base `feature/ginka-astro@65618412`；其旧 SHA 的 Actions run `45700509715` / `45700476531` 成功，不覆盖本地 `4383c83f`。当前冻结 SHA 的 Actions runs 为 0，smart-HTTP 对该 SHA 返回 `not our ref`，须在获准推送后重新检查，不能把本地验收说成远端 CI。现有公开 workflow 的 push 仅监听 `feature/ginka-vn` / `cleanup/**`，并支持列出的 PR bases 与 workflow_dispatch；仅把 `integrate/20261126-runtime` 推远端不会自动满足 push 过滤器。本轮不擅自改变 PR 映射、触发分支或发布目的地。

PR #9 已 closed/unmerged 并回链 #10；#8/#7 仍 open/draft。私有远端 cleanup 为 `09b501b6`，本地 `ca0e9b89` 领先 16 个提交；当前登录上下文不足以读取私有 PR #5 的状态/CI，历史“已绿”不作当前证明。只读现场证据保存在 ignored `artifacts/freeze-20261127/git-audit.json`。

本轮还只读打开生产域名，跳转至 `https://www.mm9527.top/`；DOM generator 为 `Hexo 8.0.0`，仍加载 NexT/PJAX/ATRI 脚本，没有冻结 Astro build 标记。此观察不推断生产 Git SHA，也不是本地候选失败或部署成功；证据在 `artifacts/freeze-20261127/production-readonly.json`，未进行登录、评论、生产写入或清缓存。

## 清理前结构（完整 VN 基线）

```text
根 package/lock + _config*/Hexo deploy/build + themes/next
layouts/ + scripts/ + source/_data/ + backend/ + src/config/llm.ts
astro/（另一套 package/lock、正式 VN、runtime-compat、ATRI vendor）
source/_posts、css/js、原作派生图和多个旧语音配置
voice_upload/（593 份旧原声）、wp/作者笔记
docs/（46）+ astro/docs/architecture/（9）+ 根多份指南
多套 Hexo / Astro / VN / design CI
```

## 当前结构

```text
根 package/lock / AGENTS / README / CHANGELOG
astro/{config,src,tools,public-shell.js} + 模块级 AGENTS
source/{_posts,about,links,css,js,fonts,images,manifest.webmanifest,sw.js,CNAME}
docs/{ARCHITECTURE,ROADMAP,TASKS,DECISIONS,INTERFACES,HANDOFF,TESTING}.md
design-system/（纠正旧框架指令，保留视觉规范）
wp/（作者笔记与附件，不是第二内容源）
tools/{deploy,checks,update-netease-cookie.ps1}（独立运维）
.github/workflows/ginka-check.yml（无部署）
```

## 清理依据与保全

- Hexo/NexT 的整条动态插件/主题/配置管线随唯一 Astro 架构退休；不是把仍在消费的旧代码当死代码删除。
- 无消费者 LLM 配置、统计服务、两调试页面、一次性资源加工/上传脚本、旧 Hero/Fancybox 接管和 ATRI 音乐桥退出正式实现。
- 原生 Astro 替换构建字符串适配；修复页切换 body/meter/drawer observer 绑定及首页过滤可达性；一个音乐控制器、一个原生 gallery dialog。
- 旧文档有效原则已合并，原文与来源提交私有归档；设计规范、原始证据、真实文章/笔记不按引用数删除。
- 私有库仅删除已确认 0 内容的旧 gallery 三文件和空 scenario placeholder；有效 visual-index、恢复结构、resolved pack、视频 hold 帧、完整反编译链保留。

## 验收与剩余事项

冻结博客运行时代码候选：`4383c83ffd639c5f4b363d9c1a84c81ccbc65482`，分支 `integrate/20261126-runtime`；其后仅更新正式文档。私有资料候选：`ca0e9b89bd6a6dc46b84797990bc30ee0387a365`。最终 pack 由 tracked recipe 在新目录重建：`artifacts/private-final-tier-20261126/pack/manifest.json`，SHA-256 `ad7e7915ce7296918b9cf4eb661ddec400724e36121fa633718b571814dd3898`。

本轮 H 从不存在的目录新建 clean detached `D:/ginka-work/20261127/verify-h`，以 Node 22.23.4/npm 10.9.9 重新执行全部静态门禁：clean `npm ci`、`npm test` 237/237 + purge mock、typecheck 52 files 0/0/0、76 页 build / Pagefind 15 篇、62 legacy routes + recursive dist privacy、full/runtime audit 0，全部 exit 0。7 条既有 public/synthetic browser 命令通过：390/1440/1920、每宽 60-cycle + 3 warmup、normal/reduced-motion、touch、三宽 no-JS、面板/存档/进度与 SOUND 失败反馈。候选和旧根树各 163 个 authored 文件前后 SHA-256 不变；旧根 HEAD/完整 status 不变，旧 h clean。精确逐命令证据在独立树 `artifacts/independent-h-20261127/acceptance-summary.json`，覆盖与限制见 [TESTING](TESTING.md)。

上轮同 SHA 的真实私有验收记录：六宽 panels、SAVE/LOAD、45-line/40-pose/160-tier/情绪 overlay、BACKLOG、SOUND、PBD 1100/0 mismatch 通过。D 本轮重新验证 5967 camera + 144 linked overlay，最大误差 `4.1163161768054124e-10`；6009 selector / 1504 zoom 通过，literal floating cancellation 仍 1 项 `0.010000000000000009`，calibrated tier 0 mismatch。数学/来源比较不等于逐帧、环境色或原作全状态已还原。

私有 Pagefind 当前使用 dev-only 内存索引，复用生产 Pagefind engine，对当前 Astro SSR HTML 建索引，不回退 stale dist；真实预集成搜索跨 ClientRouter 复用同一 `pagefind.js` 请求并返回 Android 文章命中。F 本轮从 build 标记 `4383c83ffd` 的既有 dist 做独立 live smoke：static-pages 4/4；About→Links→history 返回 day/moonlit 各 3 轮、单 iframe/client.js、单 audio 和同 document 保持；实际搜索 Android 后点击结果与文章 pathname 精确保留编码/方括号，BACKLOG 开闭 5 轮和焦点返回通过。day/moonlit pinned CSS 的 HTTPS/MIME/CORS 及独立同源 widget 8 个尺寸/主题布局 case 通过，但 editor 始终未登录 disabled；没有执行 OAuth、发帖、编辑或删除，也不把初始 iframe theme 参数当动态 postMessage 后内部视觉已验。精确边界/复现探针在 ignored `artifacts/f-comments-20261127/results.json`。真实网络音乐的历史媒体解码/时间递增/单 audio 连续性也不等同人工听感。

真实原版证据：TITLE/SYSTEM 已在隔离副本观察并保存截图及 source/hash 对照；初始 TITLE 匹配 `data-003/title_base.png`，首屏含鸟居与睁眼银花，NEXT 无占位行。官方 `-printdatapath -datapath=<new data> -savecloud=no` exit 0 且仅 stdout 写入已证；LOAD/MAP、全原 flags 持久化、完整原作逐帧/环境色/时序仍未完成，未访问旧存档、未绕过 Steam/认证。

## 本轮修正与隔离扩展的交付位置

私有 CI 两文件接续原有修改后，已修正“误验旧 18/20 包”和“固定 s50 画布预期”两个实际问题。现 workflow 直接重放 tracked tier recipe、两作业固定 Python 3.12/requirements，browser 用冻结 domain/geometry 求实际 source tier 并检查端口/HTTP manifest 身份。G 在新目录重建 ad7e… 冻结包并本地通过；H 于 03:19:31–42（+08:00）按最终两文件 hash 独立重跑端口负例、新包 390/1440 与 recipe/旧包拒绝门禁，全部按预期。远端固定 SHA 缺失的前置条件不因本地通过消失。

C/D/E 在私有 `story-c` / `geometry-d` / `voice-e` 的 6 文件 delta 分别补足：scene graph 已有 OUT 防覆盖（不改提取结果）、源 flag/结局顺序与标题状态回归、3 条真实数值片段的 LL 触发审计，以及全量语音匹配/原字节/完整解码/精选包分层。H 在 `D:/ginka-work/20261127/verify-private-h` 合并独立复验通过：C 新 graph 46/46、D 11/11、Python 总 64/64；全 1988 原字节/header 重新核验并对 frozen 45 条独立完整解码。1988 全解码归 E 作者实跑，不冒称 H 重跑。组合 patch SHA-256 `91cf9ed7fd8547fa4f7eecc1da56b10b2e29ddbcbf3f9b034e36fa905bf284dc`，入口 `artifacts/independent-h/final-receipt.json` 及私有正式 HANDOFF。它们不混入冻结博客 runtime，也不把 1988 原声解码称为 1988 条已接入或已人工听音。

Lead 最后逐图检查发现冻结基线仍有桌面标题视觉缺陷：返回 main 时额外 HTML h1“GINKA”与 CONTINUE 重叠，真实像素实验确认 943 个 h1 像素落在 CONTINUE 内，旧菜单几何/功能断言没有覆盖文字实际绘制。B 在新 `D:/ginka-work/20261127/title-fix-b` 仅向现有 desktop/private 视觉隐藏 selector 加入 h1，并在既有 original-ui-browser 增加 first/main 像素与可访问名称回归；仅 2 文件，保留移动端和公开无素材 fallback，不改菜单几何或主题架构。补丁 SHA-256 为 `a4886f58b3e8ea6f5c0058b6ff2ee740880082a25d68826c64a7405e1cd870ca`。

H 在独立 `D:/ginka-work/20261127/verify-title-h` 对相同 2 文件、相同 patch/hash 重新验收，并于 03:48:17（+08:00）封存 `artifacts/independent-h/final-title-receipt.json`：237 测试、typecheck、76 页 build/15 篇索引/62 routes/隐私门禁均 exit 0（复用本次 clean 锁安装依赖，不冒称再 npm ci）；真实私有三宽 first/main 通过，桌面 h1 绘制 0、ARIA 名称保留，390 仍显示；公有三宽 first/main 的样式、标题/菜单 rect 及同 context selector 开关后的 h1 裁图不变。初次整页像素探针把 CONTINUE 外围 hover/focus 3px 条计入，已用 bbox 与同 context 逐像素证明是 h1 外噪音，失败日志保留，不改产品求绿。作者和 H 均直接看图确认 CONTINUE 无白色 h1 重叠。原冻结 `4383c83f` 不包含此修正，不能把新修正的验证成绩倒算给原提交。该两文件修正尚未提交，因而没有新的 commit SHA，私有 workflow 仍固定原冻结基线；若用户后续批准将修正纳入发布，须先形成真实新提交，再同步私有 CI 的固定博客 ref 并在那个 SHA 重新验收，不能沿用 `4383c83f` 的 CI 结论。

最终 Git 现场证据为 ignored `artifacts/freeze-20261127/git-final-audit.json`：截至 03:35:33（+08:00）原 32 个 worktree 的 HEAD/branch 不变，除本轮 2 个授权候选外，其余 30 树完整 status 不变；新增 9 个 detached 现场全部保留，没有清理。此为 Git-status 级证明，与 H 的 163 个 authored 文件 SHA 保全分开；不把 status 相同说成全目录逐字节 hash 相同。

本地封存入口为 `artifacts/freeze-20261127/delivery-index.json`：分别列原冻结 HEAD、当前文档/CI patch、两文件标题修正 patch、六文件私有扩展 patch、独立回执和 pack hash。`final-snapshot.json` / `final-scope-verification.json` 留下最终精确文件范围和 SHA；原图/声/截图与这些本机证据仍在 ignored/private 边界，不进公共提交。

仍未自动完成：生产切换与部署、真实 Giscus 登录/发帖/编辑、人工听音、原作完整场景/解锁/逐帧 parity、native GPU/长期内存零增长证明、原版 LOAD/MAP 全状态。所有 active/dirty worktree 保留；没有 force push、生产部署或真实缓存清理。
