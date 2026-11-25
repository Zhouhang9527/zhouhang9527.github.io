# 当前交接

更新：2026-11-26。唯一架构/任务入口是本目录七文档；不要恢复旧多套 TODO、阶段报告或根 Hexo 命令。

## 当前工作与基线

- 本次收敛在隔离 `cleanup/agent-residue-convergence` 分支；继承完整 VN 基线 `a1bb9d8c`（包含 artbook 后继的 102 个有效提交）。原工作区与其他 dirty worktree 不覆盖、不清理。
- published main 未改变，且与 VN 开发链不同根。提交/PR 不代表线上迁移或生产部署。
- 原始游戏资源与逆向证据仍在独立私有库。已把 48 张旧公开派生场景、593 份真实旧语音及其他退役模型/配置/文档按原字节保全，不把它们伪称模拟/重复数据。
- 代码已经收敛为根 workspace + 单 lock + Astro 原生生命周期；保留共享原文/附件/作者笔记、真实 Giscus 与持久音乐。公开无原作画面，私有 localhost 仍可直接读取原图/角色包。
- 已审查并整体提取日期/时区/Atom/排序、严格旧 fragment 别名及对应模板测试。原候选 worktree 仍保留，不能因整合后就删正在工作的分支。

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

当前候选在 Node 22.20.0 / npm 11.6.1 的独立目录 `D:/linshi/verify-blog-20261126` 完成复验；代码基线为 `2db1e789d153d7d1ed22158418f9d106b073baef`，并包含随后同批复验的 Node >=22.19 metadata 修正、测试空白清理及 fallback 断言修正。`npm ci` 通过；`npm test` 128/128 + purge mock、`npm run typecheck` 0 errors / 0 warnings / 0 hints、完整 build 76 pages / Pagefind 15 articles / `npm run check` 62 legacy routes 通过。两套合成 Chromium browser（390/1440）通过；`check:vn-browser` 390/1440、motion 与 no-JS 通过；live `check:browser` 的 10 个宽度/主题组合和 no-JS 均通过，文章页 Giscus iframe/theme 加载成功。`git diff --check a1bb9d8c` 通过；受保护 source/_posts、source/about、source/links、wp（不含被明确排除的 Obsidian 状态文件）与基线无差异。`npm audit` 与 `npm audit --omit=dev` 均显示 5 项（1 low、3 high、1 critical），留作 Astro/build-chain 升级债；没有使用 force/overrides。构建有 Pagefind 对 `/music-room/` 缺 `<html>` 与 zh-cn stemming 的非阻塞提示。

待完成：本轮 tracked diff 统计为 950 files changed、8,588 insertions、89,084 deletions（以最终提交前清单复算为准）；本地提交、双仓库推送/替代 PR、替代关系落档后的旧 PR 处置及 CI 复核仍待完成。另：此前发现完整 `dist/_astro/*.js` 含 `_hxv4_hash`/`nativeStorage` 等私有来源元数据。已将客户端状态拆为不含来源字段的运行时投影，并加入递归 dist 文本资源扫描；已由当前候选的全量 build/verify 递归扫描 HTML/JS/CSS/JSON/source-map 通过；该门禁覆盖列出的来源路径、storage/hash 标记，不证明所有潜在非字节元数据均不存在。旧 PR #9 是 `feature/ginka-vn -> feature/ginka-astro` 的 open draft；#8 是其迁移基线 `feature/ginka-astro -> ginka-comments-refine`，不能一并关闭。原作逐像素/全服装/真实原声时序、Giscus about identity/登录发帖编辑、真实音乐播放/听感、性能和生产切换仍未完成。

明确未自动完成：原作逐像素/全服装/真实原声时序、真实 Giscus 登录/发帖/编辑、性能量测、Astro 安全大版本迁移、生产切换。所有未合并/dirty/可能活跃 worktree 保留；历史分支只在已合并且归档后清理。后续按 [TASKS](TASKS.md) 和 [TESTING](TESTING.md) 推进。
