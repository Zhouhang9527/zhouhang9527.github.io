# 决定与清理依据

## ADR-01：一套正式架构

选用已存在的 Astro/VN 完整后继，不重新开发一套。artbook → Astro → VN 是祖先链，清理分支继承有效提交；published main 与该链没有共同根，不假装可以普通小 PR 切换生产。当前不部署，不改写历史。

Hexo 的 package、动态插件、主题、配置和测试此前确有消费者；**因整条管线退役而删除**，不是因简单 grep 没 import 就判 unused。共享 Markdown、作者笔记、阅读 CSS/JS、Giscus、持久音乐保持真实消费者。回滚留在 Git，不在工作树并存第二套实现。

## ADR-02：稳定正式模块，无构建字符串适配

共享脚本直接订阅 Astro 生命周期，删 runtime-compat 的文本改写。删除没有 Astro DOM 消费者的旧 Hero、Fancybox 接管和 ATRI 语音桥；原生画廊只有既有 dialog 实现。音乐核心与 SOUND 视图是控制器/消费者，保留两者。私有原作 host/scheduler、离线 catalog、正式精选角色包职责不同，不按名称合并。

## ADR-03：原始数据与证据不等于缓存

旧公开场景的 48 张 WebP 没有私库同字节副本，退役前按原 blob/SHA256 私有保全。593 份旧 ATRI Opus 是真实容器、有 manifest 记录且非 GINKA 重复语音，亦私有保全后移出正式博客；没有声称是模拟数据。原作 PNG、XP3、安装文件、PBD、脚本、视频连续帧、独立反编译与参数证据不删。

私有 resolved 图/声受 active pack 及路径包含限制消费；catalog JSON 与 JS 分别服务离线工具/浏览器；相同视频帧可表示 hold 时长。这些不是可随意删的冗余。旧研究报告保留原字节，并在私有入口标注其历史状态，不改写历史证据。

## ADR-04：公共构建只发布审查过的资源

- 正式 JS/CSS 是显式路径集；媒体以 `astro/config/public-assets.json` 的来源说明和 SHA256 审查，文章附件仍按历史 URL 暂存。
- 在清理/写暂存目录前拒绝未批准路径、symlink/junction、路径逃逸及媒体 hash 变化。Git tracked 不等于可公开。
- 原作资源由已有 loopback-only 中间件提供；公开标题无原作图、画廊显示真实不可用状态。没有重画占位 CG、假声音或静默“加载成功”。
- 新资源应审查后修改这一份契约，不增加第二份 manifest 或自动例外开关。

## ADR-05：文档与依赖收敛

根 docs 七文档分别承担架构/路线图/任务/决定/接口/交接/测试。历史 planning、TODO、handoff、阶段报告的有效结论已收敛，原文及 provenance 私有归档；根 CHANGELOG 只记录完成事项。新会话从 AGENTS 自动获得约束。

根 npm workspace + 一份根 lockfile。保留实际消费者所需的 Astro、排版、Markdown、Pagefind、测试依赖；不为旧 Hexo 检查补装依赖。兼容补丁升级与大版架构迁移分开，不用 overrides 或 `audit fix --force` 伪造安全完成。

## ADR-06：真实数据保真和未整合成果

日期/时区/同日排序/Atom 的完整候选整体整合，模板与 schema 同步，不只复制一个 helper。旧 heading fragment 使用经过旧发布 HTML 核对的单一兼容别名实现，沿用 Astro heading collector，不复制第二套 slug 算法。新代码保留原作者工作树，测试不以旧完成报告代替。

历史 PR 仅在新替代 PR 实际包含对应提交、清理已提交且验收后关闭，并记录替代关系。已合并分支清理前建立归档引用；所有有未合并有效内容、dirty 或可能活跃的 worktree 一律不删，不 prune。实际 Git 处置见 [HANDOFF](HANDOFF.md)。

## 保留的产品边界

标题完整 CG 不能拆成假角色层；NEXT 为独立后日谈；音乐入口统一 SYSTEM → SOUND；真实评论不伪造；游戏固定原作色彩与 reader 主题独立；只映射白名单动作，不 eval 原作任意表达式。缺少精确证据的时序/地图/解锁关系仍标暂定，不把博客阅读进度描述成原作 flag 等价。

## ADR-07：首标题与 source-tier 使用实证

原版新运行副本首 TITLE 实际为睁眼银花的完整 `data-003`，不是无角色 `data-004`；标题图像的区域像素/重采样对照及 CONTINUE 行坐标只支持所观测首屏和菜单状态。博客把未开始的阅读路线映射为 `data-003`、开始阅读后的博客状态映射为中间完整图 `data-004`；这是明确 blog adaptation，不写原档 flags。首次标题的 NEXT 不保留空白行，CONTINUE 的首屏位置按已测 glyph/PBD 逻辑行调整；独立 title_first hit rect 尚未从原 PBD 恢复。

原角色 tier 只根据原逻辑矩阵的 pre-raster zoom 与已验证可用分辨率表选择，不使用 viewport CSS 尺寸、DPR 或 PNG DPI。稳定数学投影消除了平移取消，但与原字面浮点有一项 0.01 差异，标定 tier 选择无差。2026-11-27 D 对冻结包 3 条已绑定数值片段的审计分别为 m100、l200、m100；42 条未绑定保持默认 s50/unavailable。40 个姿势具有 ll250 图层，不等于真实语句自动选 ll；3 片段未触发 LL 也不能外推为全剧情不使用 LL。

## ADR-08：冻结运行时、CI 修正与证据扩展分离

本轮只接续原有 7 份博客文档和私有 CI 收尾，博客 runtime/lock 与旧原始数据不动。私有 workflow 必须重放已跟踪 recipe 并校验冻结 40/45/358/160，不能因旧 18/20 browser 绿灯声称新包通过；测试设施使用现有 scheduler/geometry 求实际 source tier，不为通过而改产品、放宽 HTTP/Vite 边界或固定错误 s50 预期。

后续原 flags 静态审计、防覆盖修正、全量语音分层和 LL 使用证据在独立私有 worktree 开发并由独立 H 复测；不会自动替换发布候选或将静态关联当逐帧/解锁等价。2026-11-27 14:41 用户新授权本地 commit：允许将已独立验收且 hash 未漂移的改动整合为本地提交，旧冻结基线继续保留；没有 push/合并/部署授权。新本地 SHA、旧回执、远端 PR 与 CI 适用范围继续分别记录。
