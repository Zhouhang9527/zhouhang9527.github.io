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

当前完整候选与独立回归仍在执行。实际结果、最终统计、提交 SHA、PR 与历史分支处置在完成后更新本文件；不把已运行的中间单测/首轮构建冒充最终通过。

明确未自动完成：原作逐像素/全服装/真实原声时序、真实 Giscus 登录/发帖/编辑、性能量测、Astro 安全大版本迁移、生产切换。所有未合并/dirty/可能活跃 worktree 保留；历史分支只在已合并且归档后清理。后续按 [TASKS](TASKS.md) 和 [TESTING](TESTING.md) 推进。
