# 正式接口与所有权

## 配置（不新增平行配置）

| 文件 | 权威内容 |
|---|---|
| `astro/config/site.json` | 公共 URL、作者、Giscus、在线音乐配置 |
| `legacy-routes.json` | 已发布路径冻结契约 |
| `legacy-headings.json` | 已发布文章 fragment ID；修改须核对历史 HTML |
| `vn-mainline.json` | 固定 v1 的 15 篇主线 |
| `vn-scenes.json` | 已有原作 UI 几何/逻辑切片与私有来源契约；不表示公共素材许可 |
| `public-assets.json` | 逐媒体 hash、来源与审批依据；新媒体不能靠 tracked 自动发布 |
| 根 `package.json` / `package-lock.json` | workspace 与唯一可复现依赖快照 |

## 页面与生命周期

- `Layout.astro`：唯一壳，ClientRouter、主题、Giscus/搜索、持久侧栏/音频与 VN 模块。
- `source/js/ginka-music.js`：唯一 `#bg-music` 对象和播放/seek/retry 控制；`vn-music.ts` 转发 SOUND 操作。禁止创建第二播放器。
- `GINKA_THEME`：reader 主题与真实 Giscus theme 消息；不修改跨域 iframe DOM。
- 阅读/侧栏/动效脚本在 `astro:before-preparation` 清理、`astro:after-swap` 重绑 body、`astro:page-load` 初始化。persistent 组件挂一次，异步回调校验 generation/source。
- `src/domain/`：纯状态、受限 action；runtime 不复制纯状态规则。`vn-control.ts` 负责现有已验证几何，不是完整 KAG/PBD 引擎。

## 内容、进度和存档

- `source/_posts/*.md` 是唯一文章内容。附件在同 stem 文件夹，freeze URL 优先于按新标题重新生成 URL。
- staging 保持原 frontmatter 的完整出版/更新时间，按 Asia/Shanghai 归一；页面显示 dateOnly，排序/Atom/metadata 使用完整时刻。不用文件 mtime 或构建时间假造更新。
- `ginka.vn.mode.v1` 为 game/reader；主线 v1 与新增文章分开。
- reading-state 管最近/完成/收藏/150 手动档/独立快速档。正常直链和浏览器 history 不自动恢复旧滚动位置；显式 CONTINUE/LOAD 才恢复。
- 语音历史只记录实际成功播放的有效 line ID，最大 100 条。收藏指向有效录音，不生成虚假条目；本地 unlock 是界面状态，不是访问控制。

## 私有本地预览

根目录：`npm run dev:original -- "[PRIVATE_ASSETS_ROOT]"`。输入可为私有仓库或其 assets 目录，由工具检查已知资源后绑定 `127.0.0.1`，不复制原作资源。

| 环境变量 | 用途 |
|---|---|
| `GINKA_ASSETS_ROOT` | 提取资源根；画廊通过原始 PNG 直读，不生成公开 WebP |
| `GINKA_TITLE_DATA` | 原始完整标题图与 logo 来源 |
| `GINKA_VN_UI_DATA` / `GINKA_MAP_DATA` | 原作 UI/地图来源 |
| `GINKA_UI_FONT` | 明确选择的本地字体；不自动挑多个候选 |
| `GINKA_MASCOT_MANIFEST` | 已核验私有角色包 |
| `GINKA_RULE_PREVIEW` | 仅研究模式可选 rule 演示，不视为原作完整时序 |
| `GINKA_TEST_BASE_URL` / `GINKA_TEST_ORIGINAL` | 浏览器验收目标及真实私有模式声明 |

私有 HTTP 要求 loopback + Host/Origin/Sec-Fetch-Site、GET/HEAD、真实路径包含、Range 206/416、no-store/CORP/nosniff。所有原作数据不进入公共 dist；无包保持明确 unavailable。测试 synthetic PNG/音调仅是 fixture，不是功能素材。

### 角色包

现有 loader 校验 v1 完整帧和 v2 分层图的显式来源、角色/服装/姿势/阶段、canvas/baseRect、层序、裁切/混合及已验证可选眼嘴差分。每条 line 有 ID、精确文本、speaker、pose、phase、source/phaseSource/verified；voice 为已验证本地文件或明确 null。图/声必须在 pack 真实目录内，损坏或错位资源不伪造成功。v2 active 包的实际覆盖在私有文档维护，不把 catalog 可解析数量当已解锁或已播放数量。

完整 schema 以 `local-mascot.mjs` 和其测试为可执行权威。私有 catalog/原作 scheduler/host 的研究契约仍在独立私有库，未通过正式接口接入前不得称其为博客运行时。

## 独立运维（不在构建时调用）

- `tools/deploy/meting-node-public.js` 是上游 Meting 服务的部署参考，不是博客本地模块；它依赖服务器上游的 Hono/service 文件，不给静态博客补装这些依赖。
- `tools/update-netease-cookie.ps1` 仅人工显式运维，秘密通过安全输入/SSH stdin，不写站点配置或日志。
- `npm run cache:purge` 仅人工显式调用；`npm test` 的 purge 回归使用 mock/无 token CLI，不能触发真实 purge。
