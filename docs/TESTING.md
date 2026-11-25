# 测试与验收

## 从根目录复现

Node >=22.19 <25、npm 10+；当前 lock 中 undici 8.13.1 要求 Node >=22.19，故不能宣称 Node 22.12 兼容。本轮实测 Node 22.20.0 / npm 11.6.1；仅根目录 `npm ci`。单 lockfile 不等于子目录可以硬编码 node_modules 路径；测试工具通过安装模块解析实际 CLI。

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
# 真实网络 Giscus 的独立验收，不把离线 fixture 当作此项成功
npm run check:browser
```

构建顺序为真实单测 → 安全 staging → Astro → Pagefind → SEO metadata → verify。素材审查在删除/写入 staging 之前，拒绝路径不能破坏已有产物。生成的 public/.generated/dist 不手工编辑。

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

2026-11-26 当前 cleanup 候选（`2db1e789` 之上含未提交修正）已在该分支 worktree 用 Node 22.20.0 / npm 11.6.1 复验：根 `npm ci` 通过，`npm test` 128/128 + purge mock，`npm run typecheck` 0 errors / 0 warnings / 0 hints，`npm run build` 构建 76 页、Pagefind 索引 15 篇，`npm run check` 的 62 条旧路由通过。递归 dist 文本扫描未发现 `_hxv4_hash/`、`nativeStorage`、sourceBlob、已知原作 PNG/情绪标记；这只约束列举的私有来源标记，不代表所有潜在元数据绝对不存在。合成 mascot/original 浏览器、public VN 390/1440/motion/no-JS 与 live 10 视口/主题 Giscus iframe/theme smoke 均通过；后者不覆盖 about identity、登录/发帖/编辑或实际播放听音。实际结果和仍未完成范围见 [HANDOFF](HANDOFF.md)；GitHub PR merge-ref CI 尚待推送后验证。

安全依赖采用兼容补丁升级并运行实际 npm audit；存在 advisory 时明确记债，不用 force/overrides 宣称零漏洞。未执行生产部署或真实缓存 purge。
