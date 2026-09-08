# 🎯 GINKA Blog

> 专注于逆向工程和二进制安全的技术博客

[![Hexo](https://img.shields.io/badge/Hexo-8.0.0-blue.svg)](https://hexo.io/)
[![NexT](https://img.shields.io/badge/Theme-NexT-orange.svg)](https://theme-next.js.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](https://github.com/Zhouhang9527/zhouhang9527.github.io)

## ✨ 特性

- 🎨 **现代化设计** - 基于 NexT Mist 主题的优雅界面
- ⚡ **性能优化** - 快速加载，流畅体验
- 📱 **响应式布局** - 完美适配各种设备
- 🔍 **全文搜索** - 快速定位内容
- 💬 **评论系统** - Twikoo 集成
- 🎭 **ATRI Live2D v2.0** - 智能互动看板娘，支持对话、拖拽、截图等功能
- 📊 **访问统计** - 百度统计集成
- 🎯 **SEO 优化** - 搜索引擎友好

## 🚀 快速开始

### 环境要求

- Node.js >= 20.19.0
- npm >= 10.0.0
- Git

### 安装

```bash
# 克隆 Hexo 源码及定制 NexT 主题
git clone --branch hexo-source --recurse-submodules https://github.com/Zhouhang9527/zhouhang9527.github.io.git GINKA-Blog
cd GINKA-Blog

# 安装依赖
npm ci
```

### 本地预览

```bash
# 启动开发服务器
npm run server
```

访问 `http://localhost:4000` 预览博客

### 构建部署

```bash
# 增量构建，适合日常修改文案、模板、CSS 或 JS
npm run build

# 干净发布构建，会清理 public 并执行发布资源检查
npm run build:release

# 独立图片缓存扫描，不会覆盖原图
npm run optimize:images

# 部署到 GitHub Pages，不会自动执行 git commit/push 主仓库
npm run deploy
```

## 构建与定制边界

- `themes/next` 是指向 `theme-next-ginka` 分支的 Git 子模块；克隆时使用 `--recurse-submodules`，已有工作区可执行 `git submodule update --init`。
- 博客专用 CSS、JS、图片和页面数据优先放在 `source/`、`layouts/`、`scripts/`，减少主题子仓库内的不可重复改动。
- `npm run build` 不清理 `public/`，用于快速增量构建；`npm run build:release` 会先清理并检查 PSD、CMO3、旧视频背景、大 TTF 和未使用高分辨率纹理没有进入发布目录。
- CSS/JS 引用通过 `ginka_asset()` 使用内容哈希生成版本号，文件未变化时 URL 保持稳定。

## 📁 项目结构

```
GINKA-Blog/
├── source/              # 源文件
│   ├── _posts/         # 博客文章
│   ├── _data/          # 数据文件
│   ├── css/            # 自定义样式
│   ├── js/             # 自定义脚本
│   └── images/         # 图片资源
├── themes/             # 主题
│   └── next/           # NexT 主题
├── scripts/            # 部署脚本
├── docs/               # 项目文档
├── _config.yml         # Hexo 配置
├── _config.next.yml    # 主题配置
└── package.json        # 依赖管理
```

## 📝 使用指南

### 创建文章

```bash
# 创建普通文章
npm run new "文章标题"

# 创建逆向工程文章
npm run new:reverse "文章标题"

# 创建 PWN 文章
npm run new:pwn "文章标题"
```

### 文章格式

```markdown
---
title: 文章标题
date: 2025-12-21 10:00:00
tags:
  - CTF
  - Reverse
  - IDA Pro
categories:
  - Reverse
description: 文章简短描述
---

文章内容...
```

## 🎨 自定义

### 修改颜色主题

编辑 `source/_data/variables.styl`:

```stylus
$ginka-primary-color = #37c6c0
$ginka-secondary-color = #ff6b6b
```

### 添加自定义样式

编辑 `source/_data/styles.styl` 或 `source/css/ginka-custom.css`

### 添加自定义脚本

编辑 `source/js/ginka-main.js`

## 📚 文档

### 核心文档
- [开发文档](docs/DEVELOPMENT.md) - 详细的开发指南
- [维护指南](docs/MAINTENANCE.md) - 日常维护和故障排查
- [性能优化](docs/PERFORMANCE.md) - 性能优化配置
- [重构总结](docs/REFACTOR_SUMMARY.md) - 项目重构记录
- [快速参考](QUICK_REFERENCE.md) - 常用命令速查

### ATRI Live2D 文档
- [ATRI 使用说明](docs/atri/ATRI_使用说明.md) - ATRI Live2D 完整使用指南
- [ATRI 开发文档](docs/ATRI_GUIDE.md) - ATRI 技术实现详解
- [ATRI 快速参考](docs/atri/ATRI_QUICK_REFERENCE.md) - ATRI 速查表
- [ATRI 配置文件](source/_data/atri-config.js) - 配置示例

## 🎀 ATRI Live2D 特性

### v2.0 新功能
- ✅ **智能对话系统** - 5种场景互动消息
- ✅ **控制面板** - 显示/隐藏、截图、重置位置
- ✅ **拖拽移动** - 自由调整 ATRI 位置
- ✅ **鼠标跟踪** - 眼睛和头部跟随鼠标
- ✅ **多种动画** - 点击、悬停等互动动画
- ✅ **配置系统** - 4种预设模式可选
- ✅ **性能优化** - 移动端和桌面端自适应

### 快速开始
```javascript
// 控制台命令
window.ATRI.showMessage('你好！');  // 显示消息
window.ATRI.takeScreenshot();        // 截图
window.ATRI.hide();                  // 隐藏
```

详细使用方法请查看 [ATRI 使用说明](docs/atri/ATRI_使用说明.md)

## 🛠 技术栈

- **框架**: Hexo 8.0.0
- **主题**: NexT (Mist Scheme)
- **样式**: Stylus + CSS
- **脚本**: JavaScript ES6+
- **部署**: GitHub Pages
- **评论**: Twikoo
- **统计**: 百度统计

## ⚡ 性能

| 指标 | 目标值 |
|------|--------|
| Lighthouse 评分 | > 90 |
| FCP | < 1.8s |
| LCP | < 2.5s |
| CLS | < 0.1 |
| FID | < 100ms |

## 🔧 维护

### 定期任务

- **每周**: 检查依赖更新、备份数据
- **每月**: 性能测试、SEO 检查
- **每季度**: 主题更新、功能升级

详见 [维护指南](docs/MAINTENANCE.md)

## 📊 统计

- 文章总数: 持续更新中
- 分类: Reverse, Pwn, CTF
- 标签: IDA Pro, Python, Linux 等
- 访问量: 使用百度统计

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 👨‍💻 作者

**mm9527**

- GitHub: [@Zhouhang9527](https://github.com/Zhouhang9527)
- Blog: [https://Zhouhang9527.github.io](https://Zhouhang9527.github.io)

## 🙏 致谢

- [Hexo](https://hexo.io/) - 强大的博客框架
- [NexT](https://theme-next.js.org/) - 优雅的主题
- 所有开源贡献者

## 📮 联系

如有问题或建议，欢迎通过以下方式联系：

- 📧 Email: your-email@example.com
- 💬 Issues: [GitHub Issues](https://github.com/Zhouhang9527/zhouhang9527.github.io/issues)

---

⭐ 如果这个项目对你有帮助，请给个 Star！

**最后更新**: 2025-12-21  
**版本**: v2.0.0
