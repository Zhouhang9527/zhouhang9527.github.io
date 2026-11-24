# GINKA Visual Novel Blog — 架构设计

> 当前开发计划与验收状态统一维护于 [TODO.md](TODO.md)；本文保留设计、实现或素材接入契约。
状态：Proposed / 待实施；基线：feature/ginka-astro @ 0e70303；本文件只定义目标架构，不代表功能已完成

## 1. 产品定义与边界
GINKA 是一份以 Galgame 为交互外壳的技术博客，不是游戏引擎、独立剧情游戏或传统博客套皮
游戏模式是首次访问默认入口，首页还原标题菜单、章节选择、存档读取、CG 鉴赏、系统设置、历史对话；阅读模式保留原有 Minimal 画集式索引与技术正文
两种模式共享文章数据、永久链接、评论、搜索、设置、音频和阅读进度；绝不为同一篇文章生成两套 URL、两份正文或两套业务逻辑
文章直链默认直接进入阅读手册，不经过标题画面，不要求点击开始、播放动画或登录；无 JS 时所有主要内容和导航仍可用
技术正文不做逐句播放，不塞入底部对话框，不劫持文本选择、浏览器滚动、复制与右键；读者主动返回时才进入游戏菜单
不编造原作剧情或角色对白，不伪造评论、日期、用户；不将站点描述为官方游戏

## 2. 信息架构
| 游戏界面 | 实际功能 | 路由 / 状态 |
|---|---|---|
| TITLE 标题画面 | 开始、继续、章节索引、鉴赏、设置 | / |
| START 开始阅读 | 进入章节选择，不替读者挑文章 | /archives/ |
| CHAPTER 章节选择 | 按归档、分类、标签进入文章 | 现有 archives/tags/categories 路径 |
| LOAD 读取存档 | 最近阅读、主动收藏、本机进度 | /library/，noindex |
| READER 阅读手册 | Markdown、TOC、代码、表格、上一篇/下一篇 | 原有 YYYY/MM/DD/title/ |
| BACKLOG 历史对话 | 当前文章的真实历史评论 | 文章 #comments；不新建评论路由 |
| GALLERY CG 鉴赏 | 已授权、可公开的场景图片 | /gallery/ |
| MUSIC 音乐鉴赏 | 现有歌单、播放控制、歌词 | 全局播放器；可打开 /music-room/ |
| CONFIG 系统设置 | 模式、昼夜、字体、代码、音量、减少动效 | /settings/，noindex；桌面可弹出同一组件 |
| SEARCH 搜索 | Pagefind 标题、正文、标签检索 | /search/，noindex；桌面可弹出 |
| ABOUT / LINKS | 作者介绍、友情链接 | /about/、/links/ |
| 404 | 迷失在岛上，返回与搜索 | /404.html，noindex |

游戏导航项使用原作语义，不添加没有实际功能的 SAVE/QUIT/VOICE 按钮；没有历史记录时 Continue 显示不可用原因，不跳转到虚构存档
/archives/ 仍支持年份、月份和旧分页；分类和标签保留原始 slug；继续阅读直接跳原文章 URL
游戏和阅读入口属于视图偏好，不增加 /game/post/... 或 /reader/post/...；明确的站内切换按钮与无 JS fallback 保持路径可访问
评论编辑器与 Backlog 是原 Giscus 的实际 DOM 主题；不可从父页面直接读写第三方 iframe 内 DOM，不自行同步用户身份；可通过官方 postMessage 更新配置，登录和发布留给 Giscus

## 3. 整体结构
Astro SSG + TypeScript + 语义 HTML/CSS + 少量原生浏览器模块
构建期负责内容解析、路由、资源检查、SEO、索引、Shiki；客户端只负责交互、状态、视觉和外部服务
禁止把所有路由写进一个 canvas/SPA 或引入全局 React/Vue 运行时；不保留 Hexo/NexT 依赖作为新功能的基础

```text
                    Astro static routes / SEO
                            |
                 SiteLayout + RouteDescriptor
                   /                       \
          GameShell                       ReaderShell
     Title / Chapter / Gallery       Index / Archive / Article
                   \                       /
                Shared UI primitives / tokens
                            |
         AppRuntime (persistent, one lifecycle owner)
     Navigation / Scene / Preferences / ReadingHistory / Audio
                            |
                 Services / browser adapters
         Pagefind | Giscus | Music provider | Storage
                            |
              Markdown / Content Collections
                 Asset manifest / route manifest
```

依赖方向：页面和视图 -> feature 控制器 -> domain 契约 -> service adapter；domain 不依赖 DOM、Astro 组件或外部 HTTP；service 不依赖视图；共享 UI 不持有全局业务状态
表现层只消费统一 ViewModel，不通过查询别的页面 DOM 获得业务数据；路由与配置只由 lib 提供；全站不再依赖 window.CONFIG 或手写 PJAX 事件

## 4. 目标目录（实施后）
```text
astro/
  config/
    site.json                # 公开集成配置
    legacy-routes.json       # 历史 URL 不变契约
    scenes.json              # 场景逻辑 ID 与 fallback
    assets.public.json       # 允许发布的资源与授权清单
  src/
    content.config.ts        # posts/pages collection schema
    pages/                   # 真实路由，仅组装页面
    layouts/
      SiteLayout.astro       # SEO、ClientRouter、公共根节点
      GameShell.astro        # 游戏交互布局
      ReaderShell.astro      # 内容阅读布局
    components/
      ui/                    # MenuButton, Dialog, IconButton, Status
      game/                  # TitleScreen, ChoiceMenu, SceneStage, BacklogFrame
      reader/                # Article, Outline, CodeBlock, Index, Pagination
      shared/                # AudioDock, ModeSwitch, Comments, Search
    domain/
      route.ts               # RouteDescriptor / RouteKind
      scene.ts               # SceneId / SceneSpec
      preferences.ts         # Preferences schema, defaults, migration
      reading.ts             # ReadingRecord / Bookmark
      audio.ts               # Playback model
    runtime/
      bootstrap.ts           # 唯一入口与 lifecycle manager
      navigation.ts
      scene-controller.ts
      preferences-store.ts
      reading-history.ts
      audio-controller.ts
      dialog-manager.ts
    services/
      pagefind.ts
      giscus.ts
      music.ts
      storage.ts
    lib/
      content.ts             # 内容查询
      routes.ts              # URL / taxonomy / pagination
      assets.ts              # 已存在资源的内容哈希
      seo.ts
    styles/
      tokens.css
      base.css
      game/
      reader/
      shared/
  tools/                     # prepare, metadata, verify, tests
  docs/architecture/         # ADR 与设计契约
```
当前 Markdown 与附件在仓库 source/_posts；在验证后才将其迁入 Astro 自有 content 目录，使用旧路径清单确保路由与附件不变，历史分支保留完整回滚
当前共享 source/css 与旧 GINKA JS 暂时保留，迁移一项功能就移除其 runtime-compat 适配；最终运行时必须从本地 Astro 原生模块构建，禁止继续靠字符串替换旧脚本
开发依赖固定版本并提交可复现 lockfile；CI 使用 npm ci；根目录旧 Hexo 包不参与新站点安装/构建；切换发布前不删除回滚代码

## 5. 状态与生命周期
URL 是内容与导航状态唯一权威；主题、表现模式、阅读设置、最近记录是本机偏好；音频、加载、当前弹窗、转场是当前会话瞬时状态
RouteDescriptor 包含 kind/path/canonical/sceneId/heading；由 Astro 静态生成，客户端读取当前路由描述，禁止另建 router
模式 preference: game | reader；theme preference: day | moonlit | system；实际主题由系统媒体查询解析
阅读设置：字号档位、行高档位、代码换行、动效 system/reduced；音频设置：音量、静音、播放模式；浏览器要求首次播放由用户手势触发
本地存储：ginka.preferences.v1（有 schema 校验和迁移）、ginka.reading.v1（以 canonical pathname 为键，heading、progress、updatedAt、收藏）、可单独保存播放器元数据
最近阅读限制 100 条，进度节流写入，离开页面/visibilitychange 时提交；跨标签页同步设置，损坏/不可用 localStorage 退回内存和默认值；支持清除阅读记录和设置；不上传阅读记录、不存 GitHub token、不新增登录系统
恢复优先级：显式 URL hash > 浏览器 back/forward 原生历史 > 用户主动 Continue/Load 时恢复记录 > 顶部；禁止每次打开文章自动抢滚动
播放状态只由 AudioController 修改，播放器视图订阅；切换模式与 ClientRouter 跳转必须保持同一个 audio 元素，不重新播放或重新请求歌单；刷新后仅恢复可用状态，不绕过自动播放限制
Astro 原生 ClientRouter 负责历史与 URL；全局服务只初始化一次
astro:before-preparation 保存阅读位置、取消路由专属请求/观察器、关闭临时弹窗；astro:after-swap 重新绑定路由根节点、应用主题、更新目标场景；astro:page-load 挂载当前路由功能、焦点处理、重新观察文章/评论；每项注册必须有 disposer/AbortSignal；无 JS 可正常导航
只持久化 audio host 与必要的 service/dock UI，不把整页或旧 article DOM persist；所有持久化节点跨页面使用稳定且唯一的 key
SceneController 接收 route/scene/theme，取消过期 decode 与转场，只展示最新目标；先显示 fallback，图片 decode 完成才换图；取消/超时清理所有遮罩、禁止留下锁滚动状态
DialogManager 负责一个活动模态、焦点返回、Escape、滚动锁释放；使用原生 dialog；移动端可用独立设置/搜索路由，不做堆叠弹窗

## 6. 原作还原策略
原作截图和资产清单是视觉基准；每项 UI 记录来源、图片尺寸、atlas 裁切区域、缩放规则、九宫格区域、昼夜可用性、交互状态、确认等级和发布许可
资源分三层：scene CG / UI skin / motion assets；视觉配置不直接写文件名到业务组件，使用 SceneId/AssetId 经 manifest 解析
本机授权/私人研究素材走 dev-only overlay，CI 与 public 构建只接受明确可公开的清单；已在旧站公开的素材也不等于已获授权，发布前独立核查；缺失或未获许可时使用自制/授权替代图与 CSS/SVG 等价结构，不把原图打包到生产
保留原作版权署名及同人/非官方说明；不复制原作音乐、对白、角色语音或 Live2D 文件到公开产物除非权利清晰
游戏舞台采用响应式 HTML/CSS，不做固定 1280×720 整站缩放：桌面 16:9 场景、文字菜单与留白；手机纵向构图，菜单不被裁切，dvh/svh 与 safe-area；长菜单使用原生滚动；全屏 API 只由用户主动打开，可退出
标题画面尽量还原原作菜单对齐、字体、按钮、选中态、切换和场景比例；分类采用原作选项条；Load 使用原作存档列表语义但内容是阅读记录；Gallery 使用缩略图及原生 dialog；Backlog 使用真实评论列表；Config 使用原作系统菜单布局，控制仍为原生按钮、滑块、复选框
每项 skin 同时提供静止/hover/focus/pressed/disabled/loading/error 状态；文本可选、可缩放、可访问；装饰图片 aria-hidden；重要文字不能只存在于贴图
技术阅读仍沿用 UI UX Pro Max + Obsidian Minimal token 规范；游戏专用 skin tokens 与 reader tokens 分离，公共 focus、状态和间距共享；两种模式不得改变代码高亮语义
转场优先 CSS/View Transitions，降级立即切换；默认 160ms 控件反馈、240ms 面板、场景 250–400ms 交叉淡入；首页原有剑刃动效作为可关闭例外；不做永久循环闪光、滚轮劫持、强制播放开场；尊重 prefers-reduced-motion

## 7. 内容、搜索、评论、音乐、SEO
Markdown Collection schema 校验 title/date/route/tags/categories/description；旧标题含空格、方括号、中文的 URL 不能重算或二次编码；用现有 62 条清单与真实 main 路径对照
文章只有一份 SSR/SSG 正文。Shiki 双主题，代码 14px、正文 16px、默认 1.85 行高，代码/表格局部横向滚动。TOC 由 Markdown headings 生成，旧锚点需要逐个比对，必要时加兼容锚点
Pagefind 在 build 后索引文章主体；SearchService 懒加载，结果按实际 canonical URL 跳转，处理中文/英文、空状态、请求竞争与无结果，不新增后端
Giscus 保留 repo/category/pathname；对已发表历史评论使用原生 DOM CSS，composer 与 Backlog 同一主题体系；iframe 在评论接近视口时挂载，每路由最多一个，切换文章销毁旧 iframe，失败可重试并给 GitHub 链接；生产主题 URL 需可达且符合 Giscus CORS 约束；只有真实浏览器测试能证实主题生效，未经原作截图确认不得称为像素级还原
MusicService 使用现有 Meting 接口，失败、超时、空歌单提供恢复入口，不新增下载/绕过授权机制；只在用户意图播放/打开音乐时发起非必要网络请求；外部歌曲可用性与版权另行验证
全局 SEO 生成 canonical、OG、robots、sitemap、Atom、Baidu sitemap；模式、设置与本机存档不改变 canonical，不索引私有记录页；兼容旧 URL 与 404；静态搜索无服务端 token；Service Worker 按内容哈希缓存资源，精确路由离线兜底，避免无限缓存和旧版本污染

## 8. 性能与验收
目标而非当前测量：移动端首屏 LCP <=2.5s、CLS <=0.1、INP <=200ms（真实网络/设备与采样条件另记录）；首屏不依赖 Giscus、音乐、Live2D、Pagefind；首屏场景仅加载当前昼夜可用尺寸；非首屏图、语音/模型按需加载；预载下一场景有流量限制，saveData/弱网络关闭；不一次下载整个 CG 图集
CI 拆分：npm ci / build / typecheck / unit / output contract / deterministic browser / live integrations / visual artifact；发布前审阅真实截图，外部网络错误单列而非放宽断言
单元：URL 编码/旧 slug/分组分页、偏好迁移、无存储 fallback、阅读位置、取消过期场景、播放状态、资源许可过滤
浏览器：320/390/768/1024/1440/1920，昼夜/system、键盘、触屏与 reduced motion，标题画面 -> 章节 -> 文章 -> 记录 -> 返回，深链接与 back/forward，无 JS 访问，长标题/代码/表格，唯一音频节点，搜索与 Escape，真实 Giscus 与 CSS fixture、外部故障恢复、无水平溢出和移动端正文宽度、截图审阅、资源泄漏、SEO/旧锚点
不将 fixture 通过称为外部服务验证；不以成功构建代替视觉验收；不自动部署 main

## 9. 实施阶段与退出条件
P0 基线：完成当前 Astro PR #8 的严格浏览器回归，提交锁文件，固定旧路径/锚点与视觉快照；构建和类型检查稳定
P1 内核：定义 RouteDescriptor、Preferences、ReadingRecord、SceneSpec，完成原生 lifecycle、持久音频和统一模式切换；两模式共用同一 URL、无 JS 仍可读
P2 游戏外壳：原作素材核验、标题画面、章节选择、场景控制和菜单；手机/桌面通过实际截图验收，未授权素材不进入生产
P3 阅读/存档：完整 ReaderShell、Load、Continue、收藏与进度；原有文章直链、复制、目录、返回行为、SEO 全部通过
P4 系统界面：Config、Search、Gallery、Music、Backlog、About、Links、404；真实服务及失败恢复测试
P5 去遗留：将原生模块逐个替换兼容脚本，清理未使用 CSS、依赖和旧资源，验证许可证清单；将旧内容路径迁移作为单独可回滚提交
P6 发布：独立预览产物、URL/SEO/评论比对、性能报告、视觉复核和用户明确批准；旧 Hexo/生产版本仍可立即回滚
每阶段独立提交，避免一个不可审阅的大重构 PR；关键决策记录 ADR，包括双模式同 URL、Astro router 单一权威、资源许可边界、状态与持久化策略
参考：Astro 5 View Transitions https://v5.docs.astro.build/en/guides/view-transitions/ ，Pagefind https://pagefind.app/docs/ ，Giscus https://giscus.app/zh-CN
