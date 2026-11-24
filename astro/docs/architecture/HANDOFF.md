# GINKA VN — 跨会话开发接续

更新：2026-11-25  
本记录编写基线：`33cc372c51b7045d8fdf70efe0f5ebbcaa71d7a9`（不是最新 HEAD 的固定值，接手时必须重新获取）

## 1. 新会话启动协议

用户说“继续 GINKA 博客开发”即指向本项目。先读取仓库实际状态，再继续任务，不要求用户重复介绍项目，不从零设计。

- 博客：`Zhouhang9527/zhouhang9527.github.io`
- 唯一活动开发分支：`feature/ginka-vn`
- 私有原作素材：`Zhouhang9527/ginka-xp3-assets`，分支 `main`，本次核实 HEAD `30b43e739aeef0b9a7bf7a38d58975123b677cec`
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

重要：上述功能有代码，不等于通过测试或达到原作 1:1。当前没有可确认的完整构建、typecheck、真实浏览器验收或实际原作语音播放结果。

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

- 用户已安排本地 Agent 提取 B 站原作视频参考（以私有仓库实际新增文件为准，尚未核实上传完成）；期望 reference/screens、layouts、timelines、asset-matches、contact-sheets、reports
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

- 基线 `33cc372`，真实 VN CI 45461370567：typecheck/build 成功（75 页、62 旧 URL），Playwright 1.56.1 不支持 ubuntu26.04 安装失败，browser 未执行；固定 ubuntu-24.04 后等待新提交结果
- 私有素材 `30b43e7` 已上传 reference/，标题/对白有视频证据，其余九界面未覆盖；无 mascot manifest。见 VN-SKIN 新章节，保留 PBD 逻辑矩形，原作模式锁定 NEXT 不显示文字
- 本次新增 tools/pbd-ui.mjs、extract-pbd-ui.mjs、pbd-ui.test.mjs；对真实 7 个 PBD 执行相同解析函数并核对坐标，通过；完整批量本地执行/语言覆盖合并/通用渲染尚未完成。运行 `node tools/extract-pbd-ui.mjs <private-repo> <private-output>`，输出必须在博客仓库之外
- Node 22 本地可用但 github.com DNS 不通，未完成真实浏览器截图或完整 build；新 fixture 由 CI 运行
- 下一步：检查本轮 CI，修复 smoke 实际失败，再将解析产物用于 ENGINE-01，继续核对原作资源，勿发布
