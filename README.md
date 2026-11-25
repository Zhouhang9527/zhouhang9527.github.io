# GINKA Blog

技术文章与 GINKA 视觉小说式导航。**唯一正式实现是 Astro 静态站点**；历史 Hexo/NexT/ATRI 实现退出当前树，回滚使用 Git 中的原提交，不并行维护第二套站点。

## 唯一开发入口

新会话先读 [AGENTS.md](AGENTS.md)，再读 [架构](docs/ARCHITECTURE.md) → [当前交接](docs/HANDOFF.md) → [唯一任务清单](docs/TASKS.md)。

- [路线图](docs/ROADMAP.md)：阶段目标与验收门槛
- [决定](docs/DECISIONS.md)：已经确定的边界和清理依据
- [接口](docs/INTERFACES.md)：模块所有权、配置、存档、私有预览
- [测试](docs/TESTING.md)：真实测试范围、复现命令和限制
- [变更记录](CHANGELOG.md)：完成的变更；不是另一份 TODO

## 开发

需要 Node **22.12+（<25）**、npm 10+、Git。从仓库根目录执行：

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run dev
# 构建后的预览
npm run preview -- --host 127.0.0.1
```

默认预览地址为 `http://127.0.0.1:4321`。唯一锁文件在根目录；不要在子目录生成第二份锁文件。构建只读取已跟踪的文章、附件和已审查公共资源；新增文章与附件后先审查并 `git add`。

```text
astro/           正式 SSG、路由、组件、运行时、构建和测试
source/_posts/   原文章和附件，仍是内容权威
source/css,js/   正式阅读主题、Giscus、持久播放器及原生 Astro 生命周期
source/fonts/   带许可的排版资源
source/images/  站点身份，不含原作场景
wp/              作者比赛笔记和附件；不作为站点第二份内容源
 design-system/  已有视觉约束（阅读模式 / 原作模式分开）
docs/            七份正式项目文档
 tools/          独立音乐运维与缓存工具；构建不调用生产服务
```

原作素材、反编译证据和研究运行时保留在独立私有资料库。配置私有资料后可用 `npm run dev:original -- "[PRIVATE_ASSETS_ROOT]"` 在 localhost 预览；公开构建明确显示素材不可用，不用占位图或伪造语音替代。详见[接口](docs/INTERFACES.md)。

本分支不自动部署，也不改变已发布 `main`。构建成功不等于原作像素/音频验收或发布批准。历史源文档、迁移脚本和退役素材的保全依据见[决定](docs/DECISIONS.md)；实际清理统计、提交和回归结果见[交接](docs/HANDOFF.md)。
