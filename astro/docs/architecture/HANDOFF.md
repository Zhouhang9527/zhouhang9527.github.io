# GINKA VN — 跨会话开发接续

更新：2026-11-25  
本记录编写基线：`20eb48e44a666c5f186302bd9941918cbf81a35b`（不是最新 HEAD 的固定值，接手时必须重新获取）

## 1. 新会话启动协议

用户说“继续 GINKA 博客开发”即指向本项目。先读取仓库实际状态，再继续任务，不要求用户重复介绍项目，不从零设计。

- 博客：`Zhouhang9527/zhouhang9527.github.io`
- 唯一活动开发分支：`feature/ginka-vn`
- 私有原作素材：`Zhouhang9527/ginka-xp3-assets`，分支 `main`，本次核实 HEAD `390eae6bf3a78ec21db695b2636c00ea2cb77971`
- 已上线 main 不动；根目录 Hexo/NexT 保留为回滚和共享文章来源
- 接手前获取两个仓库当前 HEAD，读取根 AGENTS.md、astro/AGENTS.md、本文件、TODO.md、VN-SKIN.md；按任务补读 GINKA-VN.md、MASCOT-PACK.md、design-system/ginka/MASTER.md 和相关实现
- 本文件给出接续状态，TODO.md 是唯一任务清单，实际代码和最新测试结果优先于旧文档叙述；出现冲突先核对，不擅自扩展需求
- 发现用户正在上传素材时检查私有仓库新增提交和 reference/，不要重复解包或要求用户重发已有数据

## 2. 已确定的产品决定

目标是尽可能 1:1 还原 GINKA PC 原版 UI、交互及演出，并将其映射到真实技术博客功能，不是普通 Galgame 风格套皮。

- Astro SSG + TypeScript + CSS，保留 Markdown、代码块、文章直链、SEO、Pagefind、Giscus、普通阅读模式；不强制文章变成逐字对白
- 游戏模式固定原作色彩，不做暗色适配；游戏剧情昼夜变化独立于博客主题
- 标题始终使用鸟居完整 CG，不拆角色与背景；表情和角色在完整图中随阶段变化
- 地图随剧情进度变化，不能把昼夜变体直接当剧情阶段；现有映射暂定
- START 是主线，NEXT 是通关后日谈，不是下一篇文章；NEW 在首次进入后日谈后隐藏；EXTRA 解锁不应阻断公开文章索引
- 音乐入口统一 SYSTEM → SOUND，不添加独立标题菜单音乐入口
- BACKLOG 显示真实历史评论，同时未来加入真实播放过的对白历史；评论不伪造，不绕过 Giscus iframe 跨域限制
- 替换 ATRI 为 GINKA 看板娘：小银花、大银花分别管理服装、姿势、表情、眼嘴差分、动作；优先原作演出数据，轻动态不冒充 Live2D
- 使用原作对白和对应原录音，采用原作消息窗而非气泡；支持 VOICE 回放、V.SAVE 收藏、独立音量、后日谈差分解锁
- 未取得可用素材时明确不可用，不猜哈希语义，不编造台词、语音、人物状态或运行结果
- 私有原作素材、字体、脚本、语音、视频帧仅供授权范围内本地预览，不进入公共 dist，不公开分享私有预览服务

## 3. 现有实现与定位

| 模块 | 入口 |
|---|---|
| 页面与共享布局 | astro/src/pages/、astro/src/layouts/Layout.astro |
| 原作场景、UI、图集、时序配置 | astro/config/vn-scenes.json |
| 主要界面样式 | astro/src/styles/game/stage.css |
| 标题/通关/快速存档等进度 | astro/src/domain/reading-state.ts、astro/src/runtime/vn-progress.ts、vn-reading-position.ts |
| 游戏内操作栏 | astro/src/components/game/ReaderControls.astro、astro/src/runtime/vn-reader-controls.ts |
| 标题演出 | astro/src/runtime/vn-title-motion.ts |
| SYSTEM / SOUND | astro/src/pages/settings.astro、astro/src/runtime/vn-option.ts、vn-music.ts |
| BACKLOG | astro/src/components/Comments.astro、astro/src/runtime/vn-backlog.ts |
| 确认框 | astro/src/components/game/ConfirmDialog.astro、astro/src/runtime/vn-confirm.ts |
| 看板娘/语音 | astro/src/components/game/GinkaMascot.astro、astro/src/runtime/vn-mascot.ts、astro/tools/local-mascot.mjs |
| 私有素材服务 | astro/tools/private-preview.mjs、local-vn-ui.mjs、local-title-art.mjs、local-font.mjs、png-atlas.mjs |
| 验收 | astro/tools/verify.mjs、vn-smoke.mjs、各 *.test.mjs、分支 CI |

重要：上述功能有代码，不等于通过测试或达到原作 1:1。20eb48e 已通过完整构建和 typecheck；真实浏览器完整验收仍失败，原作语音仍缺素材。

## 4. 已知原作证据与素材定位

私有素材索引：`visual-index/inventory.csv`、`recovered-scenario-structure.json`、`assets/<archive>/xp3-meta.yaml`。资源名经常是 `_hxv4_hash/<容器哈希>/<条目编号>_<SHA256>.<扩展名>`。先用索引或代码搜索定位完整路径，不按编号猜测文件名。README 的未收录清单可能早于最近上传，必须核实实际树。

| 文件编号 | 已知用途 |
|---|---|
| 00000210.txt | custom.ks 标题与转场宏 |
| 00000236–0000023a.tjs | CG、存档、消息窗、标题/快捷菜单/BACKLOG、设置控制类 |
| 00000891.txt | START → scn000.ks；NEXT → scn101.ks；title_next_start |
| 000007cc.pbd.json | 标题按钮、NEW、逻辑矩形及状态；x=62、y=240+44*i、166×38 |
| 00000790.pbd.json | LOAD 槽位与分页布局 |
| 00000730/31/33/35.pbd.json | BACKLOG 布局及语言差分 |
| 000007ba.pbd.json | 原作底部消息窗与细按钮 |
| 000007b7.pbd.json | 右侧 315×720 快捷菜单 |
| 000007b5.pbd.json | 快速存档预览框 |
| 0000077e.pbd.json | YES/NO 通用确认框 |
| 000007b4 / b8 / b9 / bb / bc PNG | 游戏内细按钮、右侧底图、大按钮、消息框、名称及蝴蝶装饰图集 |

PBD 使用带类型标记的 dictionary/array，解码后从 result、packlist、uistates 等取得逻辑矩形、crop、rotation、offset 和状态。TJS 负责事件与 UI 加载。不要执行不可信 evals/exp；只映射已知动作。

标题已确认脚本时序：背景 300ms、Logo wipe13 500ms、等待 500ms、标题语音、菜单 200ms；返回 500ms、开始 1000ms。实际并行关系和 wipe13 纹理仍待验收。主线 sf.hfclear、sf.clear、sf.title_next、sf.title_next_start 的完整赋值时机未追清。

## 5. 外部素材依赖

- 用户已安排本地 Agent 提取 B 站原作视频参考（私有仓库 30b43e7 已核实上传，title/dialogue 有视频参考，其他九界面缺失）；期望 reference/screens、layouts、timelines、asset-matches、contact-sheets、reports
- 小银花/大银花的真实透明立绘差分、动作及逐句对白/voice storage ID 尚未建立可验证的映射，不要误把特效图集当立绘
- 角色包约定：私有仓库 `reference/mascot/manifest.json`，schema 见 MASCOT-PACK.md；缺失时看板娘隐藏/功能降级，不用替代图片假装完成
- 私有预览：从 astro/ 执行 `npm run dev:original -- "<私有素材仓库路径>"`，原作素材仅由 localhost 中间件提供；可用 GINKA_MASCOT_MANIFEST 指定实际素材包

## 6. 下一步（按 TODO 编号）

默认先 BASE-01/02：真实构建、typecheck、smoke，并修复已发现问题，然后 DATA-01 与 ENGINE-01，逐步替换重复手写 PBD 坐标。若用户明确指定另一个模块，直接按指定任务推进，同时检查相关基础问题。

已知待排查（不是已确认 bug 清单）：旧 smoke 对隐藏入口/EXTRA/语音和存档的断言，固定操作栏遮挡和焦点恢复，BACKLOG modal 是否被祖先 transform 限制，读模式主题残留，音频与动作计时器生命周期，旧 ATRI 共享资产和 build manifest 残留，私有素材包路径与真实浏览器播放，title_first 差分，真实 LOAD 页语义。

本地验收命令（Node 22）：

```sh
cd astro
npm install
npm run typecheck
npm run build
npx playwright install chromium
npm run preview -- --host 127.0.0.1
# 在另一终端的 astro/ 中执行
npm run check:vn-browser
```

如仅有 GitHub 读写连接而无本地执行环境，可以分析并提交代码，但不得将写入测试脚本、静态核对、空 commit status 当成测试通过。记录实际执行限制并继续可验证任务。不要自动发布。

## 7. 每次工作结束必须更新

- TODO.md：对应任务的实际状态，只有验收成功才勾选；附 commit、证据和测试结果
- 本文件最后一节：只保留最近一次接续状态，写清当前工作、已修改文件/提交、验证结果、阻塞项、下一步任务，不维护重复流水账
- VN-SKIN.md：新增原作证据及实现契约；MASCOT-PACK.md：角色包 schema 变化；架构决定变化写回 GINKA-VN.md
- 原子提交实现及相关文档；更新 feature/ginka-vn 前重新读取 HEAD，禁止 force push 或覆盖其他 Agent 的新提交；有冲突先合并核对
- 结尾回复简明：做了什么、commit、实际验证、仍缺什么；不要声称后台会持续工作

## 8. 最新接续记录

- 2026-11-25 DATA-05/CHAR-01/02/05/06：私有 e6891e3 已复现 HXV4 文件名哈希并匹配六套原作 PBD 的全部 543 个 PNG 层，真实 PSB scn001/002/003 的逐句角色状态亦已读取。V2 支持原始裁切 base 的 canvas/baseRect 坐标，校验原始层实际图头尺寸；新增 fixture 测试。待生成首个可用私有包及浏览器实测。

- 2026-11-25 CHAR-07/08/09/12：66b64fd 的 CI 45536688313 已通过 typecheck/build，真实 Chromium fixture 已走过 390px 稀疏 Canvas 像素、静默对白及测试音历史记录；V.SAVE 被 Astro dev toolbar 拦截。私有素材预览关闭 dev toolbar（不强制点击、不跳过断言），修复收起按钮测试选择器；新 CI 尚未完成。

- 2026-11-25 CHAR-06/07/08/09/10/11/12：2c3374a 实际 CI 两套 typecheck/build/check:mascot 已通过（VN 45535233798、Review 45535233919），全站 browser 分别 DOM.describeNode context lost、mode-toggle timeout，未视为通过。新增独立 synthetic mascot browser fixture 与 CI 阶段，真实 Canvas 像素、静默对白、测试音、收藏历史、解锁、焦点/收起；延迟加载及复用分层图像、可用对白过滤服装、旧 media 事件防护和 motion 设置即时响应。新 CI 尚未验证，仍无实际可用私有包。

- 2026-11-25 CHAR-03/04/07：用户明确原版叠层上增加轻动态；V2 增加整体 1.5px/6s 待机位移、仅已核验闭眼差分的独立眨眼（4–7.5s/145ms，博客临时参数），与 RMS 嘴型独立，不变形，不冒充原作时序；隐藏页暂停、reduced-motion 禁用。私有 86eeadc 新增完整 .sinfo 定义（大 28 dress 行/86 fgname/21 alias，小 13/57/18），两套 d1 base 已从真实首行补回，别名引用全部存在；PNG/OGG 实际映射未解决，未运行真实角色验收。

- 看板娘专线最新：2026-11-25 DATA-04/05、CHAR-01/04/05/06/07/09：私有 390eae6 实证为 KAG .sinfo 分层差分（非 Live2D/E-mote），14793 对白记录、5511 voice ID，具体 OGG/立绘语义/解锁未核验。新增 v2 有序 sparse layer/显式矩形和 over/replace/独立眼嘴候选，保留 v1；仅验证文本、姿势及阶段时可显式 voice=null，禁用回放收藏、不记语音历史。证据库 available=false 正常降级，不再阻断原作预览。未复制私有资源，未执行完整 CI 或真实素材浏览器验收。
- 下一步：素材 Agent 核验 .sinfo storage→PNG、facegroup 坐标/绘制顺序及 voice storage→OGG；提供 verified v2 小包后验收。原作 affine 和眨眼时序仍待证据。

- 看板娘素材接入：2026-11-25 CHAR-02/06/07 增量：私有素材加载器读取 PNG/WebP 画布尺寸，拒绝无效图头及与 base 不同尺寸的 blink/mouth/motion，并输出每姿势 canvas 元数据；扩展现有合成 PNG fixture 覆盖合法/错位/损坏图头，不替代真实透明立绘与对齐验收。测试尚未执行，保持未勾选。

- 看板娘专线（与其他 Agent 并行）：2026-11-25 CHAR-03/07/08/09/10/11/12、AUDIO-04 增量：看板娘按选中姿势预解码差分与动作帧，未就绪帧不切换；眨眼/口型互斥，切换语音取消旧计时器，后台暂停且完成文本揭示，首次 NEXT 补全当前文字再推进，收起恢复启动器焦点，模式变化重新绑定消息窗，跨标签页角色过滤同步。客户端也校验动作帧 URL/时长。私有 main 30b43e7 的 reference/ 无 mascot 目录；dialogue.text_reveal 时长为 null、sound_events 未确认，保持现有临时时序，不伪造立绘/录音。未运行完整 typecheck/build/browser，任务不勾选。
- 下一步 CHAR-01/02/05/06：私有包到位后先验来源、透明差分对齐及逐句语音，再进行 CHAR-07/08/09/12 实测；不修改其他模块或 main。

- 基线 d1b3ca6：原作四份 PBD 的 249 项几何/裁切/偏移/旋转/画布比对一致；新增 audit:original、精确 SystemAction 白名单、custom.ks 明确的 START/NEXT 1000ms 淡出。私有素材 HEAD 30b43e7，视频只覆盖 title/dialogue，其他九界面和角色/SE 证据缺失
- d9c53b5 VN CI 45466158145 typecheck/build/Chromium 成功，390/1440 都走过此前 dock/存档故障进入 gallery，发现 CG 打开后实际导航至 webp，导致返回失败；旧 review 浏览器被后续提交取消
- 本轮修复 CG 链接排除 Astro ClientRouter，public-shell 捕获普通点击并打开原生 dialog，保留 Ctrl/Meta/无 JS 链接行为；新增 URL 不变、焦点恢复、BGM DOM identity 断言
- d1b3ca6 后最新 CI 尚未确认；不要标记完整 browser/原作像素/音频验收完成。下次先查真实日志，再继续 LOAD/SAVE 语言标签和十五页原作 PBD、系统页控件及真实素材包
- 未修改 main 或私有素材仓库，未发布

### 公共 UI 并行接续（2026-11-25）
- 基线 5a5d548，保留另一 Agent 的记录和实现。看板娘/语音素材由其负责。本轮修复 TS2367，0000079c 英文 PBD：28 个标签/底部状态、45 个编号页状态，15 页与 00000790 一致，图集边界检查通过；原作模式 SAVE/LOAD/Q.LOAD 独立标题与标签、十五个页码，移动端保留窗口分页，手动槽整行可点。完整视觉及浏览器仍未确认。
- audit:original 增加 LOAD 检查，smoke 增加第15页和 Q.LOAD，CI 未确认。继续 SYSTEM 和实际 CI，不发布。

### 公共 UI 接续（2026-11-25）
- 基线 5917525，保留另一 Agent 的看板娘修复。SYS-07/BASE-02/04：0000023a.tjs reset() 实证 Shift 全部、普通当前页；公共 DISPLAY/TEXT/BGM reset 范围及确认、BACK 返回调用来源，保留角色语音所有权。修复 smoke 显式 reload 后使用失效音频 JSHandle，新增阅读模式明确回到标题入口。公共浏览器测试不因独立 mascot fixture 失败跳过，但整体 job 仍保留失败。66b64fd typecheck/build/Chromium 已过，mascot fixture 失败导致公共 smoke 跳过；新 CI 未验证。
- 继续 SYSTEM 原作页签、标题、footer、滑块状态和实际 CI；私有素材 b71280b。不改角色模块，不发布。

### 公共 UI 接续（2026-11-25）
- 基线 52b24e3。SYS-01/02/03/04、ENGINE-01：从私有 b71280b 的 7 份实际 PBD 提取 60 个逻辑切片，全部通过源 atlas 尺寸边界检查。00000778 七页签和四 footer 精确 geometry/state，00000740 DISPLAY 窗口/全屏及效果 ON/OFF 两对原作叠层和矩形，0000074f 共用滑块 rail/thumb 与旋转 TEXT wordmark，其他六页标题精确偏移。桌面原作模式应用页签、footer、标题、DISPLAY 两组坐标，移动端保留触屏流式布局；SOUND 大 PBD 无法完整读取，标题暂保留文字，博客适配功能不伪造原作状态。原作像素、私有浏览器和最新 CI 未验收。
- 下一步：实际 CI，原作 LOAD 的坐标与返回语义、SOUND 大文件提取，私有预览隔离；不改看板娘，不发布。
