# GINKA Blog 开发文档

## 📋 目录

- [项目概述](#项目概述)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [开发指南](#开发指南)
- [部署流程](#部署流程)
- [自定义配置](#自定义配置)
- [常见问题](#常见问题)
- [维护指南](#维护指南)

## 🎯 项目概述

GINKA Blog 是一个基于 Hexo 的个人技术博客，专注于逆向工程和二进制安全领域的内容分享。

### 特性

- ✨ 现代化的 UI 设计
- 🎨 自定义样式系统
- 🚀 性能优化
- 📱 响应式布局
- 🔍 全文搜索功能
- 💬 评论系统集成
- 🎭 Live2D 看板娘
- 📊 访问统计

## 🛠 技术栈

### 核心框架
- **Hexo**: 8.0.0 - 静态博客生成器
- **Node.js**: >= 16.0.0
- **NexT Theme**: Mist 方案

### 插件依赖
- `hexo-deployer-git`: Git 部署
- `hexo-generator-searchdb`: 搜索功能
- `hexo-helper-live2d`: Live2D 集成
- `hexo-renderer-marked`: Markdown 渲染

### 自定义组件
- 自定义样式系统 (Stylus)
- 增强 JavaScript 功能
- 优化部署脚本

## 📁 项目结构

```
GINKA-Blog/
├── source/                  # 源文件目录
│   ├── _posts/             # 博客文章
│   ├── _data/              # 数据文件
│   │   ├── styles.styl     # 自定义样式
│   │   ├── variables.styl  # 样式变量
│   │   └── body_end.njk    # 自定义注入
│   ├── css/                # 自定义 CSS
│   │   └── ginka-custom.css
│   ├── js/                 # 自定义 JavaScript
│   │   └── ginka-main.js
│   ├── about/              # 关于页面
│   ├── tags/               # 标签页面
│   ├── categories/         # 分类页面
│   └── links/              # 友链页面
├── themes/                 # 主题目录
│   └── next/               # NexT 主题
├── scripts/                # 自定义脚本
│   ├── deploy.sh           # Bash 部署脚本
│   └── deploy-enhanced.ps1 # PowerShell 部署脚本
├── public/                 # 生成的静态文件
├── scaffolds/              # 文章模板
│   ├── post.md
│   ├── reverse.md
│   └── pwn.md
├── _config.yml             # Hexo 主配置
├── _config.next.yml        # NexT 主题配置
├── package.json            # 项目依赖
└── README.md               # 项目说明

```

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- Git

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/Zhouhang9527/zhouhang9527.github.io.git
   cd GINKA-Blog
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **本地预览**
   ```bash
   npm run server
   # 或使用增强脚本
   ./scripts/deploy-enhanced.ps1 -Mode server
   ```

4. **访问博客**
   打开浏览器访问 `http://localhost:4000`

## 💻 开发指南

### 创建新文章

```bash
# 创建普通文章
npm run new "文章标题"

# 创建逆向工程文章
npm run new:reverse "文章标题"

# 创建 PWN 文章
npm run new:pwn "文章标题"
```

### 文章前置信息

```yaml
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
```

### 自定义样式

编辑 `source/_data/styles.styl`:

```stylus
// 添加自定义样式
.custom-class {
  color: $ginka-primary-color
  font-size: 16px
}
```

### 自定义脚本

编辑 `source/js/ginka-main.js`:

```javascript
// 添加自定义功能
function customFeature() {
  // 你的代码
}

customFeature();
```

### 配置修改

#### Hexo 主配置 (_config.yml)

```yaml
# 站点信息
title: GINKA
subtitle: 'Pwn & Reverse Engineering'

# URL 配置
url: https://Zhouhang9527.github.io
root: /

# 写作配置
post_asset_folder: true
highlight:
  enable: true
  line_number: true
```

#### NexT 主题配置 (_config.next.yml)

```yaml
# 配色方案
scheme: Mist

# 社交链接
social:
  GitHub: https://github.com/Zhouhang9527 || fab fa-github

# 评论系统
comments:
  active: twikoo
  
twikoo:
  envId: your-twikoo-url
```

## 🚢 部署流程

### 方式一：使用 npm 脚本

```bash
# 完整构建和部署
npm run deploy

# 仅构建
npm run build

# 清理缓存
npm run clean
```

### 方式二：使用增强脚本

**Windows (PowerShell):**

```powershell
# 完整部署
.\scripts\deploy-enhanced.ps1 -Mode full

# 快速部署（跳过检查）
.\scripts\deploy-enhanced.ps1 -Mode quick

# 仅构建
.\scripts\deploy-enhanced.ps1 -Mode build

# 启动服务器
.\scripts\deploy-enhanced.ps1 -Mode server
```

**Linux/Mac (Bash):**

```bash
# 完整部署
./scripts/deploy.sh full

# 快速部署
./scripts/deploy.sh quick

# 仅构建
./scripts/deploy.sh build
```

### 部署检查清单

- [ ] 所有文章已保存
- [ ] 运行本地预览检查
- [ ] 检查链接是否有效
- [ ] 图片资源已上传
- [ ] 配置文件无误
- [ ] Git 仓库已同步

## ⚙️ 自定义配置

### 颜色主题

编辑 `source/_data/variables.styl`:

```stylus
$ginka-primary-color = #37c6c0
$ginka-secondary-color = #ff6b6b
$ginka-accent-color = #ffd93d
```

### 字体配置

在 `_config.next.yml` 中修改:

```yaml
font:
  enable: true
  global:
    external: true
    family: "Noto Serif SC"
    size: 16
  codes:
    external: true
    family: "JetBrains Mono"
```

### Live2D 配置

在 `_config.next.yml` 中配置:

```yaml
live2d:
  enable: true
  model:
    url: https://cdn.jsdelivr.net/npm/live2d-widget-model-ginka@1.0.5/assets/ginka.model.json
  display:
    position: right
    width: 150
    height: 300
```

### 评论系统

支持 Twikoo、Gitalk、Disqus 等，在 `_config.next.yml` 中配置:

```yaml
comments:
  active: twikoo
  
twikoo:
  envId: https://your-twikoo-backend.vercel.app
  visitor: true
  commentCount: true
```

## ❓ 常见问题

### 1. 部署后样式丢失

**原因**: skip_render 配置问题

**解决方案**:
```yaml
# _config.yml
skip_render:
  - 'css/**'
  - 'js/**'
```

### 2. Live2D 不显示

**检查点**:
1. 确认 `_config.next.yml` 中 live2d 配置正确
2. 检查模型 URL 是否可访问
3. 清除缓存重新生成

### 3. 搜索功能无效

**解决方案**:
```bash
npm install hexo-generator-searchdb --save
hexo clean && hexo generate
```

### 4. 图片无法显示

**检查**:
1. 图片路径是否正确
2. 是否启用了 `post_asset_folder`
3. 图片是否在 skip_render 列表中

### 5. 部署失败

**常见原因**:
- Git 配置错误
- 仓库权限问题
- 网络连接问题

**解决**:
```bash
# 检查 Git 配置
git config --list

# 重新配置部署
hexo clean
hexo deploy
```

## 🔧 维护指南

### 定期任务

#### 每周
- [ ] 检查依赖更新
- [ ] 备份重要数据
- [ ] 清理无用缓存

#### 每月
- [ ] 更新 Hexo 及插件
- [ ] 检查网站性能
- [ ] 审查评论内容

#### 每季度
- [ ] 主题版本更新
- [ ] SEO 优化检查
- [ ] 安全性审查

### 依赖更新

```bash
# 检查过时的包
npm outdated

# 更新所有依赖
npm update

# 更新特定包
npm update hexo --save
```

### 性能优化

1. **图片优化**
   - 使用 WebP 格式
   - 压缩图片大小
   - 启用懒加载

2. **代码压缩**
   - HTML/CSS/JS 压缩
   - 移除无用代码
   - 合并文件

3. **缓存策略**
   - 设置适当的缓存头
   - 使用 CDN 加速
   - 启用浏览器缓存

### 备份策略

```bash
# 备份整个项目
tar -czf ginka-blog-backup-$(date +%Y%m%d).tar.gz .

# 仅备份源文件
tar -czf source-backup-$(date +%Y%m%d).tar.gz source/ _config.yml _config.next.yml
```

### 监控与分析

- **访问统计**: 百度统计 / Google Analytics
- **性能监控**: GTmetrix / PageSpeed Insights
- **错误追踪**: Sentry / LogRocket
- **SEO 分析**: Google Search Console

## 📚 参考资源

### 官方文档
- [Hexo 官方文档](https://hexo.io/docs/)
- [NexT 主题文档](https://theme-next.js.org/)
- [Markdown 语法](https://www.markdownguide.org/)

### 社区资源
- [Hexo GitHub](https://github.com/hexojs/hexo)
- [NexT GitHub](https://github.com/next-theme/hexo-theme-next)
- [Hexo 中文社区](https://hexo.io/zh-cn/)

### 工具推荐
- **编辑器**: VS Code, Typora
- **图片处理**: TinyPNG, ImageOptim
- **Git 客户端**: GitHub Desktop, SourceTree
- **部署工具**: Vercel, Netlify

## 📞 联系与支持

- **作者**: mm9527
- **GitHub**: [Zhouhang9527](https://github.com/Zhouhang9527)
- **博客**: [https://Zhouhang9527.github.io](https://Zhouhang9527.github.io)

## 📄 许可证

MIT License

---

**最后更新**: 2025-12-21
**版本**: 2.0.0
