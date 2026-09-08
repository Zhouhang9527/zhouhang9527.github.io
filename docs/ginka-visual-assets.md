# GINKA 游戏视觉素材

博客使用的游戏标志、蓝色蝴蝶及主视觉来自 [GINKA 官方网站](http://ginka.frontwing.jp/)，版权归 ©Frontwing / ©bushiroad 所有。首页主视觉附有来源链接。博客为个人技术博客，与游戏官方无关联；这些素材不属于项目代码的 MIT 授权范围。

下载来源（2026-09-06）：

首页人物主视觉 `source/images/ginka/hero-silver.webp` 来自用户提供的图片（2026-09-06），仅缩小尺寸并转换为 WebP，未改变画面内容。首页用左右布局，小屏使用上方人物、下方文字的布局。

排版取「人物 → 日期笔记 → 岛屿场景」的次序。剧情参考 [Frontwing 在 Steam 上发布的官方介绍](https://store.steampowered.com/app/2536840/?l=schinese)：银花失踪五年后，流星乘渡轮返岛并与她重逢。保留时间、返乡与岛屿的意象，只展示公开故事前提。

最终视觉参考为 [Story 页](http://ginka.frontwing.jp/story/) 的浅蓝底色、天空长图、竖排标签与蝴蝶装饰。

- `source/images/ginka/story-strip.jpg`：http://ginka.frontwing.jp/cms/wp-content/themes/ginka_ver09_05/img/story/story_img01.jpg
- `source/images/ginka/story-scene.jpg`：http://ginka.frontwing.jp/cms/wp-content/themes/ginka_ver09_05/img/story/story_img02.jpg
- `source/images/ginka/story-street.jpg`：http://ginka.frontwing.jp/cms/wp-content/themes/ginka_ver09_05/img/story/story_img03.jpg
- `source/images/ginka/story-torii.jpg`：http://ginka.frontwing.jp/cms/wp-content/themes/ginka_ver09_05/img/story/story_img05.jpg

- `source/images/ginka/header-logo.png`：http://ginka.frontwing.jp/cms/wp-content/themes/ginka_ver09_05/common/img/header_ginka_logo01.png
- `source/images/ginka/butterfly.png`：http://ginka.frontwing.jp/cms/wp-content/themes/ginka_ver09_05/common/img/deco_butterfly01.png

首页模板位于 `layouts/home.njk`，由 `scripts/editorial-layout.js` 注册。样式在 `source/css/ginka-editorial.css`，不需要修改 NexT 子模块。


2026-09-06：用户补充四张 GINKA 图片，压缩为 sunset.webp（关于）、profile.webp（侧栏）、reunion.webp（友链）、ocean.webp（归档）。首页继续使用 hero-silver.webp。
