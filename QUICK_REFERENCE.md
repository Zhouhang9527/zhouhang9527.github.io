# GINKA Blog 快速参考

## 🚀 常用命令

### 开发
```bash
# 启动开发服务器
npm run server
npm run dev                    # 包含草稿

# 创建新文章
npm run new "文章标题"
npm run new:reverse "标题"     # 逆向工程
npm run new:pwn "标题"         # PWN 文章
```

### 构建部署
```bash
# 清理缓存
npm run clean

# 构建网站
npm run build

# 完整部署
npm run deploy

# 使用增强脚本
.\scripts\deploy-enhanced.ps1 -Mode full    # 完整部署
.\scripts\deploy-enhanced.ps1 -Mode quick   # 快速部署
.\scripts\deploy-enhanced.ps1 -Mode build   # 仅构建
.\scripts\deploy-enhanced.ps1 -Mode server  # 启动服务器
```

## 📁 关键文件位置

```
配置文件:
  _config.yml           - Hexo 主配置
  _config.next.yml      - NexT 主题配置
  package.json          - 依赖管理

样式文件:
  source/_data/styles.styl      - 主样式
  source/_data/variables.styl   - 样式变量
  source/css/ginka-custom.css   - 自定义CSS

脚本文件:
  source/js/ginka-main.js       - 主脚本

文章:
  source/_posts/                - 博客文章
  scaffolds/                    - 文章模板

文档:
  docs/DEVELOPMENT.md           - 开发文档
  docs/MAINTENANCE.md           - 维护指南
  docs/PERFORMANCE.md           - 性能优化
  README.md                     - 项目说明
  CHANGELOG.md                  - 更新日志
```

## 🎨 配置要点

### 颜色配置
```stylus
// source/_data/variables.styl
$ginka-primary-color = #37c6c0    // 主色
$ginka-secondary-color = #ff6b6b   // 辅助色
$ginka-accent-color = #ffd93d      // 强调色
```

### 菜单配置
```yaml
# _config.next.yml
menu:
  home: / || fa fa-home
  archives: /archives/ || fa fa-archive
  tags: /tags/ || fa fa-tags
  categories: /categories/ || fa fa-th
```

### 评论配置
```yaml
# _config.next.yml
comments:
  active: twikoo
twikoo:
  envId: https://your-backend.vercel.app
```

## ✍️ 文章模板

### 基础文章
```markdown
---
title: 文章标题
date: 2025-12-21 10:00:00
tags:
  - 标签1
  - 标签2
categories:
  - 分类
description: 简短描述
---

文章内容...

<!-- more -->

更多内容...
```

### 逆向工程文章
```markdown
---
title: 题目名称
date: 2025-12-21
tags:
  - CTF
  - Reverse
  - IDA Pro
categories:
  - Reverse
description: 题目描述
difficulty: Easy/Medium/Hard
source: 比赛名称
---

## 题目信息
- 名称: xxx
- 来源: xxx
- 难度: xxx

## 分析过程
...

## 解题思路
...

## EXP
```python
# 代码
```

## 总结
...
```

## 🔧 故障排查

### 常见问题

**问题**: 样式丢失
```bash
# 解决方案
hexo clean
hexo generate
# 检查 _config.yml 中的 skip_render 配置
```

**问题**: 部署失败
```bash
# 检查 Git 配置
git config --list

# 重新配置
hexo clean && hexo deploy
```

**问题**: 搜索无效
```bash
# 重新安装搜索插件
npm install hexo-generator-searchdb --save
hexo clean && hexo generate
```

## 📊 性能检查

### 本地测试
```bash
# 使用 Lighthouse
lighthouse http://localhost:4000 --view

# 检查文件大小
du -sh public/
```

### 性能指标
- FCP < 1.8s
- LCP < 2.5s
- CLS < 0.1
- FID < 100ms

## 🔐 部署前检查

- [ ] 所有文章已保存
- [ ] 本地预览正常
- [ ] 图片已上传
- [ ] 链接有效
- [ ] 配置无误
- [ ] 测试通过

## 📚 快速链接

### 文档
- [完整开发文档](docs/DEVELOPMENT.md)
- [维护指南](docs/MAINTENANCE.md)
- [性能优化](docs/PERFORMANCE.md)
- [更新日志](CHANGELOG.md)

### 外部资源
- [Hexo 文档](https://hexo.io/zh-cn/docs/)
- [NexT 文档](https://theme-next.js.org/)
- [Markdown 语法](https://www.markdownguide.org/)

## 💡 小技巧

### Git 相关
```bash
# 查看提交历史
git log --oneline --graph --all

# 撤销最后一次提交
git reset --soft HEAD^

# 查看文件变更
git diff
```

### Hexo 相关
```bash
# 生成草稿
hexo new draft "标题"

# 发布草稿
hexo publish draft "标题"

# 查看详细日志
hexo --debug
```

### 文章写作
- 使用 `<!-- more -->` 分隔摘要
- 图片放在文章同名文件夹中
- 使用 Markdown 标准语法
- 添加适当的标签和分类

## 🎯 最佳实践

1. **定期备份**: 每周备份源文件
2. **版本控制**: 所有修改都提交到 Git
3. **测试先行**: 本地测试后再部署
4. **文档更新**: 及时更新文档
5. **性能优先**: 定期检查性能

## 📞 获取帮助

- 📖 查看[完整文档](docs/)
- 🐛 提交 [Issue](https://github.com/Zhouhang9527/zhouhang9527.github.io/issues)
- 💬 联系作者: mm9527

---

**提示**: 保存此文件为书签，方便随时查阅！
