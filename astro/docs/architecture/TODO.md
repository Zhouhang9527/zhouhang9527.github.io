# GINKA VN Blog — TODO

更新：2026-11-25  
开发分支：`feature/ginka-vn`  
记录基线：`b12f60397bd72d25f6253390118ec210c6f777f8`

新对话或新 Agent 先读 [HANDOFF.md](HANDOFF.md)，获取当前仓库状态、产品约束、原作证据与接续顺序。本文件是后续开发的唯一任务清单，架构契约见 [GINKA-VN.md](GINKA-VN.md)，已有实现及原作证据见 [VN-SKIN.md](VN-SKIN.md)，角色素材接入见 [MASCOT-PACK.md](MASCOT-PACK.md)

## 任务管理

- P0：影响整体正确性、运行体验、后续开发基础
- P1：原作核心界面、交互、演出完整度
- P2：细节及体验扩展
- 每项只有通过对应验收才勾选，代码已写入但未运行验证的项目保持未完成
- 原作证据分为 PBD 精确描述、KAG/TJS 脚本、视频像素测量、真实运行实测、暂定博客映射；不要混淆
- 所有任务提交到开发分支，不修改或部署 main；未授权的原作素材、语音、字体、脚本和视频帧仅限私有本地预览
- 游戏模式固定原作配色，不做额外昼夜或暗色主题适配；剧情场景的真实昼夜变化仍应保留，普通阅读模式保留独立主题偏好
- 保留 Astro SSG、原文章 URL、SEO、Markdown 正文、Pagefind、真实 Giscus 评论与无 JS 阅读路径；不把技术文章改成逐句强制播放的游戏剧情

## 0. 当前基线（不是完成验收）

2026-11-25 第二轮：`33cc372` 的 [VN CI](https://github.com/Zhouhang9527/zhouhang9527.github.io/actions/runs/45461370567) typecheck 和 build 均实际成功（75 页面、62 旧 URL），Playwright 安装因 ubuntu26.04 不支持失败。本轮固定 ubuntu-24.04；新增 PBD decoder / UI manifest 私有增量导出、fixture test 及 build gate；对真实 7 个 PBD 执行同一解析函数核对标题和消息窗坐标。素材 `30b43e7` 已有 reference，标题和对话覆盖，其余九界面未覆盖，原作预览隐藏锁定 NEXT 文案保留槽位。BASE-01/02/03、DATA-01/02/07/08、TITLE-01 未完成全部验收，继续保持未勾选。

2026-11-25 接续：基线 `8c8062f` 的 [VN CI](https://github.com/Zhouhang9527/zhouhang9527.github.io/actions/runs/45460932472) 实际在 SYSTEM 页 `aria-selected` 类型检查失败；[Astro review](https://github.com/Zhouhang9527/zhouhang9527.github.io/actions/runs/45460932413) 的 build 已通过，typecheck 失败，浏览器均未执行。本次修复该类型错误、BACKLOG 的真实触发器焦点恢复及快速读取异步路由竞态；smoke 新增锁定/后日谈 NEW/无语音包/私有请求检查。可使用 `GINKA_TEST_ORIGINAL=1` 对本地原作预览执行同一 smoke；原作模式仍需要真实运行。BASE-01/02、BASE-04、LOG-04 保持未勾选，等待当前提交 CI 与私有素材实测。私有仓库 HEAD `e4b85e4`，`reference/` 尚未发现。

| 模块 | 已有实现 | 尚未确认 |
|---|---|---|
| TITLE | 完整 CG、原作 PBD 按钮矩形/状态、脚本时序 | wipe13、标题语音、通关前后完整界面 |
| 主线/NEXT | 本地通关状态、独立后日谈路由、NEW、EXTRA 标题入口 | 原作精确标记赋值时机、真正后日谈内容 |
| LOAD | 十槽分页、最近阅读/收藏/已读 | 完整原作存档交互、16 页语义、真实缩略图 |
| SYSTEM | 七页、BGM/VOICE 设置、页签记忆 | 全页 PBD、各控件及帮助文字布局 |
| BACKLOG | 真实评论、翻页按钮、全屏覆盖层 | 原作排版、滚动条、语音历史、跨域约束 |
| 游戏消息窗 | 原作底部按钮、右侧菜单、快速存档、确认框 | 原作完整演出、按钮实际功能与渲染验收 |
| MAP | 岛屿俯视图和临时进度映射 | 真实地图和地点/阶段脚本 |
| EXTRA | CG 列表、全屏查看、标题解锁入口 | 原作入口/分类、鉴赏进度、解锁规则 |
| 看板娘 | 已替换 ATRI 挂载，角色/服装/差分/动作协议、语音运行时 | 小银花/大银花真实立绘及台词语音映射，实际播放 |
| 测试 | 已添加静态检查、domain/atlas/mascot 单测、Playwright smoke 脚本 | 没有可确认的完整构建、typecheck、浏览器验收结果 |

## 1. P0 — 基础架构与当前缺陷

- [ ] BASE-01 在 Node 22 环境执行 `npm run typecheck`、`npm run build`、`npm run check:vn-browser`，保存真实输出与截图，修复全部阻塞错误
- [ ] BASE-02 检查现有 smoke 脚本对 NEXT/EXTRA 锁定、隐藏旧按钮、BACKLOG 和确认框的断言是否与当前实现一致；补齐私有素材模式的独立测试
- [ ] BASE-03 提交可复现 lockfile、统一依赖安装及分支 CI；保留构建报告和失败截图，不以空 commit status 作为通过
- [ ] BASE-04 统一客户端生命周期和事件订阅，避免 Astro 路由切换后监听器重复、计时器泄漏、音频重建、跨页面状态遗失
- [ ] BASE-05 建立 GameSession / Preferences / ReadingProgress / UnlockState / AudioState 的类型契约、迁移与持久化；URL 仍是内容路由权威
- [ ] BASE-06 将 game/reader 视觉模式与普通博客主题彻底解耦；检查旧 CSS、夜间场景替换、Giscus 主题、设置页和移动端
- [ ] BASE-07 清理 ATRI 旧运行依赖与不再使用的 CSS/资源引用，先检查共用 Hexo 回滚依赖，不误删线上原始内容
- [ ] BASE-08 检查私有预览资源的 loopback 限制、文件路径校验、Range 响应、构建隔离；发布构建不得包含未授权资源或私有素材 URL
- [ ] BASE-09 明确桌面 1280×720 坐标转换和安全区策略；移动端适配保持可读与触屏可用，不强行缩小桌面整屏
- [ ] BASE-10 检查固定消息窗与正文、TOC、弹窗、评论、移动端键盘、滚动、浏览器返回之间的遮挡和焦点冲突

验收：构建、静态检查及浏览器 smoke 全部实际通过；旧 URL、评论、搜索、音乐和正文不退化；桌面与手机无横向溢出

## 2. P0 — 原作数据解析与资源索引

- [ ] DATA-01 批量解析 PBD JSON 的 dictionary/array、result、packlist、uistates、evals、语言覆盖及逻辑矩形，输出统一类型化 UI manifest
- [ ] DATA-02 建立原作资源名/存储 ID/哈希路径的可追溯映射，解析 packed atlas、旋转、透明键、偏移、disabled/toggle/pressed/hover 状态
- [ ] DATA-03 追踪 TJS 中的 GetUIFile、GetUIStorageProxy、uiloadGetRect、SystemAction 及自定义类；记录 UI 实际装载顺序和事件调用链
- [ ] DATA-04 解析恢复的 KAG/PSB 剧情、角色出入场、语音 ID、角色状态、地图和通关变量；不能把启发式标签索引当完整剧本
- [ ] DATA-05 研究 cr_data / cr_event 中实际角色模型、动作或动画数据；确认图集/连续帧/图层是否足以复现，区分 UI 特效与真正角色立绘
- [ ] DATA-06 恢复字体 family、字重、语言、UI/人物名/对白各自的字体、字号和行距
- [ ] DATA-07 对照私有素材仓库的 reference/ 视频参考库，保存画布边界、关键帧时间戳、素材对应和置信度；没有证据的参数保留 null
- [ ] DATA-08 建立提取工具的增量缓存、重复资源识别、schema 校验和缺失报告，不在每次开发时重新解包

验收：每个还原的资源、矩形、状态和时间参数能反查具体 PBD/KAG/TJS 或视频帧；不靠猜测哈希文件语义

## 3. P0 — 通用 UI 渲染与演出引擎

- [ ] ENGINE-01 抽取通用 PBD 控件渲染器，支持 base/layer/button/toggle/slider/text，统一归一化坐标、旋转切片、offset、z-index、透明度、禁用态
- [ ] ENGINE-02 以白名单 action registry 将原作 SystemAction 映射到实际博客功能；不 eval 原作任意脚本表达式
- [ ] ENGINE-03 统一 GameStage、GameScreen、Modal、Menu、TextWindow 生命周期及焦点、键盘、返回栈
- [ ] ENGINE-04 定义轻量演出 timeline：load/show/hide/move/scale/opacity/transition/wait/text/voice/se/choice；不完整移植吉里吉里
- [ ] ENGINE-05 还原 crossfade、原作 rule mask、场景层叠、可跳过等待、入场退场、异步资源加载和取消机制
- [ ] ENGINE-06 统一 reduced-motion 和触屏事件；禁止动画阻挡必要导航，离开路由时取消未完成的演出
- [ ] ENGINE-07 使用原作 Loading 图标和真实加载状态，消除无意义常驻加载圈，避免加载失败卡死

验收：至少 TITLE、SYSTEM、游戏内消息窗共享相同的控件/状态/时间轴机制；原作坐标无需重复写 CSS

## 4. P0 — TITLE、MAP 与主线状态

- [ ] TITLE-01 复核 title_first、正常及通关后 PBD，准确处理 CONTINUE、NEXT、START、LOAD、SYSTEM、EXTRA、INFORMATION、EXIT、NEW 的可见性、位置及禁用态
- [ ] TITLE-02 还原 300ms 背景、500ms wipe13 Logo、等待 500ms、标题语音、200ms 菜单演出，核对是否并行或串行；返回 500ms、开始 1000ms
- [ ] TITLE-03 确认标题完整 CG 在不同通关标记下的实际选择，角色和鸟居不得拆图；取消目前 0/1/3 篇文章的临时表情映射
- [ ] TITLE-04 还原菜单音效、按压反馈、Logo 和背景实际动态效果；原作有证据才添加蝴蝶/粒子
- [ ] MAP-01 定位真实地图 UI、地点按钮、标记位置、悬停/选中/禁用、进入/退出及事件选择
- [ ] MAP-02 分离剧情阶段、场景昼夜、阅读进度；确认原作地图随进度变化的具体条件和素材
- [ ] STORY-01 追踪 sf.hfclear、sf.clear、sf.title_next、sf.title_next_start 的赋值、读写和持久化；NEXT → scn101.ks 与 START → scn000.ks 保持区别
- [ ] STORY-02 定义独立、稳定的博客主线路径集合与完成条件（当前全部已发布文章已读仅是临时方案），新增文章不得撤销既有解锁
- [ ] STORY-03 后日谈独立内容、解锁提示、NEW 清除、EXTRA 解锁、标题状态和角色状态联动；未提供内容前明确显示待发布
- [ ] STORY-04 检查直接访问 /afterstory/、重置记录、多个标签页、存档恢复时的解锁表现；本地解锁仅是界面状态，不是访问控制
- [ ] STORY-05 设计从场景/地图进入真实文章的映射，保留原博客归档和搜索入口

## 5. P0 — 小银花、大银花及原作对白

- [ ] CHAR-01 分别建立小银花、大银花资源索引：角色、服装、姿势、表情、眼睛、嘴部、动作、解锁阶段
- [ ] CHAR-02 为每套原作服装/姿势提取完整透明立绘及同画布对齐的差分；生成 contact sheet，核对角色身份、服装名称、动作
- [ ] CHAR-03 验证动画源及实际播放帧时间；支持连续帧、原作入场退场、位移、缩放、表情交叉淡入、眨眼、待机、说话时动作
- [ ] CHAR-04 如有可用原作模型/骨骼/表情参数，评估保留原生动作数据的成本；否则使用完整差分帧，不伪造发丝骨骼或声称是真 Live2D
- [ ] CHAR-05 原作剧本逐句关联 speaker、精确文本、语言、voice storage ID、pose、expression、gesture、phase；不要编造台词或生成仿声
- [ ] CHAR-06 建立实际可用的 `reference/mascot/manifest.json` 私有包，先提供少量已验证对白，再扩大服装、动作及台词覆盖
- [ ] CHAR-07 实测动态看板娘：呼吸、眨眼、嘴部差分、动作循环、立绘切换，避免图片闪烁、帧错位、眨眼与口型冲突
- [ ] CHAR-08 对话使用原作消息窗，不用传统气泡；角色名、逐字显示、点击推进、等待动画、隐藏/恢复、回放同步
- [ ] CHAR-09 原作 VOICE 回放、V.SAVE 收藏、BACKLOG 语音历史与 SOUND 设置共用一个语音控制器；确保收藏只指向真实已验证语音
- [ ] CHAR-10 SYSTEM → PROGRAM 角色与服装选择只显示真实可用资源，未解锁后日谈差分/台词不显示；切换时清理旧音频和动作
- [ ] CHAR-11 实现看板娘主动打开、收起、导航场景联动、避免遮挡正文/菜单；不自动播音，不把原作标题 CG 裁成假立绘
- [ ] CHAR-12 验证游戏模式及普通阅读模式、桌面与手机的显示；无素材包时明确不可用而非伪造角色或声音

验收：至少每个已确认角色各有一套真实服装、表情和动作以及对应真实语音可播放；素材未提取齐全的服装不得标记已完成

## 6. P1 — 游戏内消息窗及快捷菜单

- [ ] GAME-01 继续使用 000007ba / 000007b7 PBD 还原底部框和右侧面板，复核 base 的 262px 逻辑高度与 201px 贴图实际锚点
- [ ] GAME-02 补齐消息窗姓名、正文、蝴蝶框、右下角等待/点击图标与真实字体、逐字时序；正文阅读进度与角色对白切换不能互相覆盖
- [ ] GAME-03 原作小按钮与展开大按钮全状态（normal/hover/pressed/selected/disabled），修正旋转与偏移，统一实际动作
- [ ] GAME-04 还原快捷栏横向展开/收起与 HOLD；检查 HIDE、ESC、鼠标与触屏、快捷键及恢复机制
- [ ] GAME-05 SAVE / LOAD / QSAVE / QLOAD 的实际交互及覆盖提示，快速存档预览取真实文章场景，不制造假截图
- [ ] GAME-06 PREV / NEXT / AUTO / SKIP 映射章节跳转、自动阅读及正文末尾；用户手动滚动、切换页面、打开对话或弹窗时正确暂停
- [ ] GAME-07 接入原作 VREPLAY / VSAVE，语音不存在时真正禁用；完善视觉焦点及反馈
- [ ] GAME-08 还原选择框 CHOICE 的精确布局、hover、selected、点击动画、SE 和章节选择衔接

## 7. P1 — SAVE / LOAD

- [ ] SAVE-01 解析原作 00000790 与语言差分 PBD，核对十槽、行列、位置、普通页及 quick mode，确认 16 页参数是否为 15 普通页加 quick
- [ ] SAVE-02 建立独立手动存档槽，不以最近记录/收藏冒充全部原作存档行为；保留最近阅读索引
- [ ] SAVE-03 记录文章 canonical 路径、标题、真实位置、时间、当前章节及必要会话状态；空槽使用原作 No Data
- [ ] SAVE-04 显示真实可用的存档缩略图，自动/快速/普通存档区分；无图时明确回退
- [ ] SAVE-05 还原页码菱形、分页按钮、hover/选中/按压、帮助信息、覆盖、删除和确认，核对恢复与返回
- [ ] SAVE-06 使用版本化存档数据迁移、损坏记录处理、重置、跨标签页同步和无 JS 降级

## 8. P1 — SYSTEM

- [ ] SYS-01 批量解析 DISPLAY / PROGRAM / TEXT / SOUND / DIALOG / TOUCH / SHORTCUT 对应 PBD 与原作语言资源
- [ ] SYS-02 校准七页标题、页签、背景、HELP WINDOW、分组、滑块、开关、底部 DEFAULT/BACK/TITLE、全部状态
- [ ] SYS-03 DISPLAY 全屏/窗口及动效；PROGRAM 模式/看板娘/角色服装；仅实现真实博客功能
- [ ] SYS-04 TEXT 正文字号、对白字体与速度、示例文字，独立控制技术正文与对白
- [ ] SYS-05 SOUND 完整 BGM/VOICE/SE/ENV/SYSTEM VOICE 音量、静音和播放控制；音乐只在 SOUND，不新增标题音乐入口
- [ ] SYS-06 DIALOG 确认行为与存档管理；TOUCH 真实触屏操作；SHORTCUT 原作键位布局与实际浏览器可用键位
- [ ] SYS-07 记忆上次页签，默认只恢复当前页，Shift 恢复全部；核对原作提示和返回行为
- [ ] SYS-08 配置项与统一 PreferencesStore 绑定，修复当前选项之间的重复状态与默认值不一致

## 9. P1 — BACKLOG、EXTRA、DIALOG

- [ ] LOG-01 还原 BACKLOG 精确名称/正文矩形、字体、行距、滚动条、首尾/上下翻页、返回、原作过渡
- [ ] LOG-02 真实评论保持 Giscus pathname、登录、发布和编辑能力；不得绕过 iframe 跨域限制；区分原作对白历史与用户评论
- [ ] LOG-03 对话历史按实际播放记录生成，可重放语音、查看角色名与上下文；重置/上限/防剧透策略
- [ ] LOG-04 检查全屏覆盖、焦点恢复、滚动锁及移动端，不重复挂载 Giscus 或导致 iframe 重载
- [ ] EXTRA-01 恢复真实 EXTRA 根菜单与 CG / SCENE SELECT 入口；原作音乐功能合并至 SOUND 的博客决定保持
- [ ] EXTRA-02 CG 缩略图、锁定样式、翻页、全屏、切换动画；只对实际有权展示的资源使用原作图
- [ ] EXTRA-03 场景/剧情鉴赏、解锁计数、后日谈联动；不把普通公开文章索引锁死
- [ ] EXTRA-04 SCENE SELECT 剧情流程图、节点连线、分支/回看/章节跳转，基于已恢复的真实脚本结构设计博客映射
- [ ] DLG-01 原作确认与通知弹窗 PBD 全状态，包括 YES/NO/OK、checkbox、帮助和文本区域
- [ ] DLG-02 覆盖存档、删除、快速读取、跳转、返回标题、退出、恢复默认等实际操作接入统一确认组件
- [ ] DLG-03 实测 300ms 进出场、Esc、Tab 焦点、取消/确认、重复点击与页面切换安全性；不用原生 window.confirm 作为常态界面

## 10. P1 — 音频系统

- [ ] AUDIO-01 建立统一 audio controller，BGM / VOICE / SE / ENV / SYSTEM VOICE 独立通道、音量与静音
- [ ] AUDIO-02 确认原作标题、菜单、悬停、确认、返回、翻页、切换的 SE 与 system voice 实际资源 ID
- [ ] AUDIO-03 原作 BGM/ENV 按场景切换、交叉淡入淡出、语音播放时可配置 ducking，语音结束恢复 BGM
- [ ] AUDIO-04 原作语音单实例、回放、停止、收藏与历史；避免多句同时播放、被切换的旧语音继续驱动嘴型
- [ ] AUDIO-05 维持 ClientRouter 跨页 BGM 连续性；媒体权限失败、Range、seek、解码失败、标签页隐藏和重新打开均正确处理
- [ ] AUDIO-06 用户手势后启用音频，不绕过浏览器 autoplay；无本地音频资源时使用明确静音降级

## 11. P2 — 细节与最终验收

- [ ] FINAL-01 INFORMATION 原作入口语义核对（原作打开配置网页），博客关于页保留真实作者信息和非官方声明
- [ ] FINAL-02 所有 hover / pressed / disabled / toggle / focus 视觉与音效逐项比对原作，修复小图标、边距、字距、描边、透明度
- [ ] FINAL-03 每个界面建立 1280×720 原作参考帧和实际 Playwright 截图对照，输出差异图；固定分辨率、字体和时刻
- [ ] FINAL-04 逐帧比对标题、快捷栏、地图、对白、加载、弹窗、系统页、CG 的动画时间轴，不以肉眼估计替代测量
- [ ] FINAL-05 桌面 1280×720/1440 等及移动端 390px 等实际浏览器测试；检查键盘、触屏、减少动效、长文、评论加载失败、无 JS
- [ ] FINAL-06 完成性能、隐私与素材授权检查，限制预加载体积，避免完整原作素材包进入网页或公开构建
- [ ] FINAL-07 汇总各模块证据、截图、测试报告、已知偏差及无法还原项；经用户确认后再考虑发布，不自动部署

## 下一阶段执行顺序

1. BASE-01 至 BASE-10：先让已有分支真实可构建、可测试
2. DATA-01 至 DATA-08 与 ENGINE-01 至 ENGINE-07：建立可复用原作资源和控件/演出机制
3. TITLE / MAP / STORY：校正核心导航与通关流程
4. CHAR-01 至 CHAR-12：等待并接入私有角色、对白、语音映射，同时开发可独立验证的运行时
5. GAME、SAVE、SYSTEM、BACKLOG、EXTRA、DIALOG 与 AUDIO：按 PBD/脚本证据补齐功能
6. FINAL：实际截图、逐帧校准、跨设备验收

完成一个任务后更新本清单，附对应 commit、证据路径和真实测试结果；发现新任务按编号追加，不另起重复 TODO 文档
