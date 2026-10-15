# GINKA Blog

逆向工程与二进制安全学习笔记，保留 GINKA 的插画与安静的阅读风格。

## 本地使用

需要 Node 22+ 和 Python 3.10+。日常构建不需要第三方 Python 依赖。

```sh
npm ci --ignore-scripts
npm run build
npm run dev
```

打开 http://127.0.0.1:4173/ 。通过 HTTP 预览，文章使用站点根路径链接。

## 统一源文件与构建

仓库最初只有 Hexo / NexT 生成的 HTML，没有原始 Hexo 配置和 Markdown。
现在以 `site-source/` 为可维护源文件，用标准库构建器生成全部 65 个页面：

- `site-source/templates/layout.html`：公共页头、导航、页脚、样式和脚本入口。
- `site-source/templates/sidebar.html`：公共侧栏、音乐和目录框架。
- `site-source/pages.json`：源文件与发布地址的映射。
- `site-source/pages/**/*.html`：各页正文，保留原有代码和图片标记。
- 对应的 `.json`：页面元信息和章节目录。`main_file` 指向正文片段。
- `scripts/site_builder.py`：组装模板、响应式图片、相关推荐、全文索引和资源哈希。

修改源文件或公共 CSS / JS 后运行 `npm run build`。不要直接编辑生成的根目录文章页，
否则下一次构建会覆盖修改。`npm run check:build` 检查输出是否与源文件一致。
`scripts/import-site.py` 只用于首次迁移，已有源文件时会拒绝重复导入。
这套流程保留了现有文章内容，不等于恢复了原始 Hexo 工程。

构建同时生成 `search.xml`、`article-index.json` 和 `site-version.json`。
推荐按共享标签的稀有程度排序，排除当前文章，再以发布日期排序补齐三篇。
`site-version.json` 的内容版本用于上线核验，不依赖构建时间，重复构建结果一致。

## 样式、图片与阅读

`css/next-base.css` 保留 NexT 的结构样式；`ginka-foundation.css` 集中基础规则，
`ginka-editorial.css`、`ginka-pages.css`、`ginka-reading.css` 分别管理首页、公共界面和阅读。
旧 `main.css`、`ginka_style.css` 与 Animate.css 保留在仓库，但已退出页面加载。
NexT 入场动画关闭，轻动效由现有 GSAP 按需加载，并尊重“减少动态效果”。

插图的响应式产物和 SHA-256 清单位于 `images/ginka/responsive/`。
更换插图后安装可选依赖 Pillow，运行 `npm run build:images`，再运行 `npm run build`。
原图作为回退，手机与桌面通过 `srcset` 选择适合的尺寸，主图预加载使用相同规则。
侧栏图片在打开侧栏后加载；正文图片保留宽高和原生懒加载。

长代码支持展开、自动换行和完整复制；宽表格支持键盘横向滚动。
长文章提供折叠目录，宽屏增加跟随当前章节的目录。无 JavaScript 时仍能阅读完整代码和正文。
搜索在本地进行，标题与标签匹配优先，支持多关键词、匹配片段、日期和标签，
使用文本节点渲染搜索内容，保留字面量代码。

图标使用 `vendor/ginka-icons/` 内的 Font Awesome 子集，许可保存在同目录。
新增图标后，安装可选依赖 `fonttools[woff]`，运行 `python scripts/build-icons.py`，再构建。

## 质量检查

```sh
npm run check
npx playwright install chromium
npm run test:browser
```

Windows 可设置 `$env:GINKA_BROWSER_CHANNEL="chrome"` 使用已安装的 Chrome。
检查覆盖源文件与产物一致性、文章代码保留、资源哈希、图片产物、推荐链接、搜索排序、
加载重试、离线缓存，以及四种屏幕宽度下的搜索、侧栏、代码、目录和无 JavaScript 阅读。
浏览器报告保存到 `.artifacts/browser-report.json`，资源预算位于 `reports/performance-budget.json`。
`.github/workflows/quality.yml` 会在推送、PR 和手动触发时运行相同检查。

在浏览器控制台执行 `getPerformanceReport()` 可读取本地 Web Vitals 记录，
不会额外发送到外部服务。PJAX 切换耗时单独记录，INP 在有可测量交互后才有值。
本地资源量是测试环境观测，不能替代真实访客的体验指标。

## 发布

GitHub Pages 现有来源是 `main` 分支根目录，自定义域名保存在 `CNAME`。
发布前构建并完成检查，然后提交源文件、生成页面和资源，推送到该分支。
`.nojekyll` 让 Pages 直接发布预生成文件，不再二次处理文章代码。
发布后核对 Pages 构建提交和线上 `site-version.json`，再检查首页、文章与搜索。

Cloudflare 的 Rocket Loader 会改变脚本执行时机。构建器按照
[官方说明](https://developers.cloudflare.com/speed/optimization/content/rocket-loader/ignore-javascripts/)
给可执行脚本及其依赖添加位于 `src` 之前的 `data-cfasync="false"`，保留原生 `defer` 顺序。
搜索也支持脚本在页面就绪后到达，且重复加载不会重复绑定。

核心组件还直接检查实际 DOM 是否可用，不依赖 CDN 虚拟的文档就绪状态。主题启动幂等，
侧栏由公共控制器管理，离线注册在空闲时执行；浏览器检查包含这一代理环境回归场景。
