# 测试与验收

## 从根目录复现

Node >=22.23.4 <25、npm 10+；冻结候选使用 portable Node 22.23.4 / npm 10.9.9，根目录单 lockfile，不能把旧 Node 22.20 的历史结果当最终结果。所有 browser 工具通过安装模块解析 CLI，不硬编码 node_modules 路径。

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run check
npx playwright install chromium
npm run check:mascot-browser
npm run check:original-browser
npm run preview -- --host 127.0.0.1
# 另一个终端
npm run check:vn-browser
npm run check:vn-panels
npm run check:vn-save
npm run check:vn-progress
# 真实网络 Giscus 的独立验收，不把离线 fixture 当作此项成功
npm run check:browser

# 已启动的本机 loopback 私有预览（仅私人素材验收）
GINKA_TEST_BASE_URL=http://127.0.0.1:PORT GINKA_TEST_ORIGINAL=1 node astro/tools/vn-panels-browser.mjs
GINKA_TEST_BASE_URL=http://127.0.0.1:PORT node astro/tools/vn-save-browser.mjs
GINKA_TEST_BASE_URL=http://127.0.0.1:PORT node astro/tools/vn-progress-browser.mjs
GINKA_TEST_BASE_URL=http://127.0.0.1:PORT node astro/tools/vn-backlog-browser.mjs
GINKA_TEST_BASE_URL=http://127.0.0.1:PORT node astro/tools/vn-sound-browser.mjs
GINKA_TEST_BASE_URL=http://127.0.0.1:PORT node astro/tools/vn-playback-browser.mjs
GINKA_TEST_BASE_URL=http://127.0.0.1:PORT node --experimental-strip-types astro/tools/mascot-original-browser.mjs
```

构建顺序为真实单测 → 安全 staging → Astro → Pagefind → SEO metadata → verify。素材审查在删除/写入 staging 之前，拒绝路径不能破坏已有产物。`npm run dev` 的 Pagefind dev middleware 从当次 Astro server 实际 SSR 的文章构建内存索引（失败返回 503；内容变化 full reload 并重建），不读取旧 dist，不写 public/.generated/dist。生产仍由单一 build 生成静态索引。生成的 public/.generated/dist 不手工编辑。

## 范围与不变量

| 层级 | 覆盖 | 不证明什么 |
|---|---|---|
| Node/domain | 进度/存档、日期/Atom、白名单动作、音频旧回调、私有 HTTP、PBD/图集解析 | 不证明浏览器/原声 |
| 内存 Astro/Markdown/TSX | 原文章、52 个旧 fragment、TOC、日期模板/严格 schema、无生成副作用 | 不证明网络/真实像素 |
| 产物 verify | 62 旧路由、文章图像、hash、SEO；递归检查 HTML/JS/CSS/JSON/source-map 中列出的原作来源元数据标记 | 不证明所有潜在元数据绝对不存在、性能或线上部署 |
| VN public browser | 真实 Chromium、状态/导航/存档/搜索、无 JS、reduced motion、溢出、本地 HTTP 失败 | 外网依赖被阻断，不证明 Giscus 登录 |
| mascot/original browser fixture | 合成 PNG/测试音、原作几何、动作/生命周期 | 不是真原作图像/录音 |
| `audit:original` | 对私有真实 PBD 的几何/切片/动作来源比较 | 不证明运行时/逐像素一致 |
| `check:mascot-original` | 本地真实 pack 图像/录音专项 | 不证明全服装/原作所有时序 |
| live browser | 真实 Giscus iframe/主题加载、BGM DOM identity | 不自动包含登录/发帖/编辑或人工听音 |

误删检查还必须比较原文章/附件、作者笔记、私有 raw/evidence 的 blob/hash，验证原 dirty worktree 未被本次操作覆盖。私有素材与历史文档的 provenance/来源提交在私有库维护。

## 本次结果记录

审计前基线为完整 VN `a1bb9d8c`，不是旧 artbook。独立 Agent G 实测 41/41 Node 单测、1100 项私有 PBD 比较 0 mismatch；prepare/build/typecheck 正确因 48 张待批准场景图 exit 1，未生成 public/.generated/dist。基线浏览器未运行，不能称基线全绿。

本轮全新独立 H checkout 为 `D:/ginka-work/20261127/verify-h`，clean detached `4383c83ffd639c5f4b363d9c1a84c81ccbc65482`。2026-11-27 02:50:46–02:52:04（+08:00）使用 portable Node 22.23.4/npm 10.9.9 重新 `npm ci`（420 packages）；`npm test` 237/237 + purge mock；typecheck 52 files 0 errors/warnings/hints；build 76 页 / Pagefind 15 篇；check 62 条 legacy routes 与递归 dist 隐私检查；full/runtime audit 各 0 漏洞，全部 exit 0。根 lockfile SHA-256 为 `be733e78d95efcf7a0f1df1d0a3d0692f0ac1c8e38f2dca8de456d234923e618`。

02:55:51–02:59:05 的 7 条既有 browser 命令全部 exit 0：`check:vn-browser`（390/1440/1920、normal/reduced motion、三宽 no-JS、touch；`GINKA_TEST_LIFECYCLE_CYCLES=60`，每宽另有 3 次 warmup）、`check:vn-panels`（320/390/768/1024/1440/1920）、`check:vn-save` / `check:vn-progress`（各三宽）、`check:vn-sound`（3 个失败 fixture）、`check:mascot-browser`（合成图声 390/1440）、`check:original-browser`（合成原 UI 三宽）。持久 audio、监听器/overlay 生命周期和 public 无私有请求均由实际断言覆盖；这些 synthetic/public 结果不证明真实原图、Giscus 认证或人工听音。

02:59:25–26 最终复查 HEAD、clean 状态、相对 `a1bb9d8c` 的 `git diff --check` 与受保护内容均通过；候选和原 `D:/GINKA-Blog` 的 163 个 authored 文件分别做前后 SHA-256 对照，无变化，原树完整 status/HEAD 未变。保护范围为 `source/_posts`、`source/about`、`source/links`、`wp`（明确排除 `wp/.obsidian`），不把忽略缓存声称为全盘逐字节保全。逐命令 argv、UTC/本地时间、退出码和日志见该独立树 ignored `artifacts/independent-h-20261127/{static-results,browser-results,acceptance-summary}.json`。

B 本轮在独立 `visual-b@4383c83f` 重新执行真实私有包的 original UI 三宽、六宽 panels、save/progress/playback/backlog/sound 与 mascot-original，全部正式套件 exit 0。首次借用外 worktree 依赖产生 Vite 字体 @fs 403，保留失败日志后只把字体包复制到自身 ignored 依赖树，原样重跑 smoke 三宽/touch/no-JS/title-motion 通过，没有放宽 fs 或 HTTP 门禁。追加实际同页切宽确认首屏 data-003/睁眼、7 行且 NEXT 不占位；main=data-004、CONTINUE 可用、NEXT 未解锁时 visibility:hidden 仍占槽。1440 viewport 最大 0.013888888889 逻辑 px，1920 viewport 最大 0.0125 逻辑 px，二者都是 0.015625 CSS px；390 是响应式/44px 触控适配，不能称其与桌面原 PBD 逐像素一致。详情见私有本地 `D:/ginka-work/20261127/visual-b/artifacts/agent-b/summary.json`。

HTTP Host/Origin/Sec-Fetch/POST、Range 206/416、HEAD、路径包含/symlink 与安全响应头在本轮 237 单测/合成 middleware 套件内通过；B 的真实素材运行主要验证成功加载、解码、来源投影，不声称本轮另跑了真实 pack 全套恶意 HTTP 矩阵。G 另重建冻结包并修旧 browser 的错误 s50 固定预期，具体改后脚本验收单列于私有 TESTING；不由一次 source/画布断言推导完整原作像素/音声时序。

安全依赖已升级到经验证的 Astro 7.4.13；full/runtime audit 均为 0，未用 force/overrides。生产部署、分支合并和真实缓存 purge 均未执行。

## 用户授权提交后的精确 SHA 复验（15:36 封存）

两库核心提交分别为 public `73c4498b11fa37d41568df357cfe702f711e5e15`、private `0694a96eca9a7308772dc9ba86efd0aba8dc614b`；H 对它们分别新建 clean detached 验收树，不把凌晨补丁成绩搬到新提交。

- `verify-public-73c4498-h`：15:10:11–15:10:53（+08:00）在原无 node_modules 的新树执行 fresh npm ci（仅缓存复用）、237/237 + purge mock、typecheck 52 files 0/0/0、build 76 页 / Pagefind 15、check 62 legacy / 递归隐私、full/runtime audit 各 0 与 authored/diff-check，全通过。15:20:16–15:20:35 真实私有三宽 first/main 通过，随后 private dev 后的 public dist 门禁再通过；未重复无关公有完整生命周期矩阵。回执 `artifacts/public-73c4498-h/final-public-commit-receipt.json`，SHA-256 `99bb9dd51d79cf8721dac54ec644cfa07f5a0bad121044f545885f9692828009`。
- `verify-private-0694a96-h`：15:15:12–15:15:58 运行该提交自身 CLI，纯 40/40、实际新 graph 46/46、Python 64/64、LL 11/11、6009 selector / 1504 zoom、1991 关联 / 1988 唯一原字节/header 与 45 精选源绑定通过；metadata-only 明确 decode=0。workflow 真实 ref 为 public 完整 SHA，其 hash 为 `fdbd6a7e9bb9127e7f86369aa3be8880a56bb501b8c71b8a94ec6374c270058e`。回执 `artifacts/private-0694a96-h/final-private-commit-receipt.json`，SHA-256 `99501a06810a7cf564cc4c043086af3bf0f3c5135ebfac1044be7bcb01c59e93`。

上述路径均在 `D:/ginka-work/20261127/` 对应新树内，15:36:31 封存；3 个自有 job 已收集、45173 服务停止，pack ad7e… / 根 lock be733… 未改。没有重复 1988 完整解码、人工听音或远端 Actions。后续若仅文档变化，可以注明源码/锁不变后复用对应结论，不假装新源码又做过全量验证。

## 桌面标题局部修正候选的独立复验

原冻结提交的既有矩阵虽通过，Lead 看图仍定位到白色 HTML h1 与 main CONTINUE 的真实重叠。B 的像素证据先确认 943 像素落在 CONTINUE 内，再仅改 stage.css 的 desktop/private selector；已有 original-ui-browser 新增 first 与真实 START→文章→返回 main 的像素/ARIA 回归。作者测试红→绿，原冻结树与旧验收结果保持原样。

修正候选身份是 `4383c83ffd639c5f4b363d9c1a84c81ccbc65482` + 两文件未提交 patch `a4886f58b3e8ea6f5c0058b6ff2ee740880082a25d68826c64a7405e1cd870ca`。H 在新 `verify-title-h` 应用相同字节，03:33:57–03:34:24（+08:00）重跑 237 测试、typecheck 与 build（含 76 页、15 篇索引、62 旧路由/隐私门禁），全部 exit 0；依赖来自本轮相同 lock 的 clean 安装复制，不写成新 npm ci。原冻结的双 audit 结果仅复用于未变的 package/lock，不冒称为新修正源码重新跑过依赖安装/审计。

正式 dev:original prepare 后，H 于 03:39:32–03:39:50 运行真实私有 390/1440/1920 first/main 回归，全部 exit 0：1440/1920 h1 视觉绘制为 0、ARIA 名称保留；390 h1 仍绘制；菜单几何和页面/私有请求无失败。公共同三宽/两阶段的 compute styles、h1/menu rect 与基线一致，03:44:35–03:44:41 的同 context CSSOM selector 开关，6 case h1 裁图均 0 changedChannels。初版整页差分多出的 243 通道已定位至 CONTINUE 左侧 3px hover/focus 条（h1 外），保留失败日志后用 bbox 和同 context 对照闭合，没有修改产品以迎合探针。

最终回执 `D:/ginka-work/20261127/verify-title-h/artifacts/independent-h/final-title-receipt.json`，SHA-256 `9444af93c697ac409b1802d5ce79dcd4e479004b268522443477b92d984eef00`；封存时仅两文件 diff、protected authored/diff-check 通过，原 verify-h clean 与 pack/lock hash 未变。所有 13 个 H 后台 job 已收集，自有服务停止。此结果不等于给原提交补上它没有的修正，也不替代仍待完成的原作完整时序/人工验收。

## 本机 Windows 预览入口

不要在仍为历史 Hexo 的 `D:/GINKA-Blog` 执行 Astro 命令。旧冻结基线为 4383c83f；本轮获本地 commit 授权后，已核对并把同字节的桌面标题两文件修正整合到 integration，当前精确 SHA 以 `git rev-parse HEAD` 和新提交独立回执为准。title-fix-b 仍保留旧隔离现场和人工预览脚本，不把它的旧 HEAD 当新提交。

```powershell
$toolchain = 'D:/ginka-work/20261126/integration/artifacts/toolchain/node-v22.23.4-win-x64'
$env:PATH = "$toolchain;$env:PATH"
Set-Location -LiteralPath 'D:/ginka-work/20261126/integration'
& "$toolchain/node.exe" "$toolchain/node_modules/npm/bin/npm-cli.js" run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
& "$toolchain/node.exe" "$toolchain/node_modules/npm/bin/npm-cli.js" run preview -- --host 127.0.0.1 --port 4321
```

私有本地预览直接执行该候选 ignored `artifacts/title-fix/preview-private.ps1`，地址 `http://127.0.0.1:4418`；脚本已显式选择冻结 40/45 manifest 和本轮核验的 Regular 字体，并通过既有 `dev:original` 检查全部 title/UI/MAP 启动资源。只传私库根而不指定 manifest 会默认旧 active 18/20，不能把它当当前四档包。脚本内的私有字体/资源路径不复制进公共配置或提交，原图/声/截图仍仅本机。停止预览用 Ctrl+C，不运行生产部署或缓存命令。

## 必须由用户完成的真实交互验收

以下保留为待验收，不用 mock、未登录 iframe 或自动音频解码代替：

1. **Giscus 账号/发帖/编辑**：在本地构建预览打开原 About 和一篇文章，确认 pathname 对应各自讨论；由用户亲自执行 GitHub 登录/授权。在明确指定的测试讨论提交带日期的评论，刷新确认持久化，再编辑并刷新确认；按需由用户删除测试内容。切换 About → Links →返回，检查没有重复 iframe/讨论错绑。未执行该真实提交/编辑前不勾选。
2. **输入与无障碍**：登录后测试中文 IME、多行和长文本、预览、Tab/Shift+Tab、提交反馈与焦点恢复；390px 触控及桌面均检查输入区没有拉伸原作框体或横向溢出。未登录 disabled editor 的 CSS 边界只作布局 smoke。
3. **原声听音/表情**：只在私有 localhost 包里选小/大银花和不同服装的已审查台词，逐条实际听完，再回放历史；核对说话人、原文、表情、语音结束和中断，不把 metadata/currentTime/FFmpeg 成功等同听感正确。
4. **原作动态对照**：使用隔离原作数据副本，从相同可复现状态录制 TITLE/SYSTEM 及待恢复 MAP/LOAD，对齐输入、时刻、角色/相机/情绪层；记录差异和来源。博客进度、afterstory policy 与原作 flags 分开，不访问或覆盖用户旧存档。
5. **Native GPU 与长时运行**：记录 OS/浏览器/GPU、硬件加速状态和复现路线；预热后反复切换阅读/标题/设置、立绘和音声至少 30–60 分钟，采样 working set、JS heap、GPU memory、监听器、RAF 与媒体对象。若上升，区分缓存/GC/驱动与未释放资源，不能仅凭一次截图或有限循环声称零泄漏。

完成者应记录实际候选 SHA、私有 manifest hash、环境、操作和结果；登录凭据、私有截图/录音不进入公共提交或 CI artifact。
