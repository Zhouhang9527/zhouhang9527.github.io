# GINKA Blog 维护指南

## 📋 维护清单

### 🔄 日常维护

#### 每日检查
- [ ] 检查网站是否正常访问
- [ ] 审核新评论
- [ ] 查看访问统计

#### 每周任务
- [ ] 检查并更新依赖包
- [ ] 备份重要数据
- [ ] 清理临时文件和缓存
- [ ] 检查死链
- [ ] 审查新内容质量

#### 每月任务
- [ ] 全面更新依赖
- [ ] 性能测试和优化
- [ ] SEO 检查
- [ ] 安全审查
- [ ] 数据库备份

#### 每季度任务
- [ ] 主题版本更新
- [ ] 重大功能升级
- [ ] 全站内容审查
- [ ] 竞品分析
- [ ] 用户反馈收集

## 🔧 常见维护任务

### 1. 依赖更新

```bash
# 查看过时的包
npm outdated

# 更新所有包到最新版本（谨慎使用）
npm update

# 更新特定包
npm update hexo --save

# 检查安全漏洞
npm audit

# 自动修复安全问题
npm audit fix
```

### 2. 数据备份

#### 自动备份脚本 (PowerShell)

```powershell
# backup.ps1
$backupDir = "backups"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$backupDir\blog-backup-$timestamp.zip"

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir
}

# 压缩重要文件
Compress-Archive -Path @(
    "source",
    "_config.yml",
    "_config.next.yml",
    "package.json",
    "db.json"
) -DestinationPath $backupFile

Write-Host "备份完成: $backupFile" -ForegroundColor Green

# 删除30天前的备份
Get-ChildItem $backupDir -Filter "*.zip" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
    Remove-Item -Force
```

#### 手动备份

```bash
# 完整备份
tar -czf backup-$(date +%Y%m%d).tar.gz source/ _config.yml _config.next.yml package.json

# 仅备份文章
tar -czf posts-backup-$(date +%Y%m%d).tar.gz source/_posts/

# 备份到云端
rclone sync ./backups/ remote:blog-backups/
```

### 3. 缓存清理

```bash
# 清理 Hexo 缓存
hexo clean

# 清理 npm 缓存
npm cache clean --force

# 清理 Git 缓存
git gc --prune=now

# 删除临时文件
rm -rf db.json public/ .deploy_git/
```

### 4. 性能优化

#### 图片优化

```bash
# 使用 ImageOptim 批量压缩图片
find source/images -type f \( -name "*.jpg" -o -name "*.png" \) -exec imageoptim {} \;

# 转换为 WebP
for img in source/images/*.jpg; do
    cwebp -q 80 "$img" -o "${img%.jpg}.webp"
done
```

#### 代码优化

在 `_config.yml` 中启用压缩:

```yaml
# HTML 压缩
html_minifier:
  enable: true
  exclude:

# CSS 压缩
css_minifier:
  enable: true
  exclude:
    - '*.min.css'

# JS 压缩
js_minifier:
  enable: true
  mangle: true
  output:
  compress:
  exclude:
    - '*.min.js'
```

### 5. SEO 优化

#### 检查清单

- [ ] 所有页面有唯一的 title
- [ ] Meta description 正确设置
- [ ] 图片有 alt 属性
- [ ] 内部链接正常
- [ ] sitemap.xml 已生成
- [ ] robots.txt 配置正确
- [ ] 结构化数据标记

#### 生成 sitemap

```bash
# 安装插件
npm install hexo-generator-sitemap --save

# _config.yml
sitemap:
  path: sitemap.xml
  template: ./sitemap_template.xml
  rel: false
```

### 6. 安全检查

#### 定期审查

```bash
# 检查依赖漏洞
npm audit

# 更新有漏洞的包
npm audit fix

# 强制更新（可能破坏兼容性）
npm audit fix --force
```

#### 配置安全头

在 Nginx 配置中添加:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

## 🐛 故障排查

### 常见问题诊断

#### 1. 网站无法访问

**排查步骤**:
```bash
# 检查部署状态
git log -1

# 验证生成的文件
ls -la public/

# 测试本地服务器
hexo server

# 检查 GitHub Pages 状态
# 访问: https://www.githubstatus.com/
```

#### 2. 样式丢失

**可能原因**:
- skip_render 配置错误
- CDN 资源加载失败
- 缓存未清理

**解决方案**:
```bash
hexo clean
hexo generate
# 检查 public/css 目录是否存在
```

#### 3. 生成失败

**调试方法**:
```bash
# 详细日志
hexo generate --debug

# 检查语法错误
hexo generate --draft --debug

# 逐步排查
mv source/_posts source/_posts_backup
mkdir source/_posts
# 逐个移回文章
```

#### 4. 部署失败

**检查点**:
```bash
# Git 配置
git config user.name
git config user.email

# 仓库权限
git push origin main

# SSH 密钥
ssh -T git@github.com
```

### 日志分析

#### 启用详细日志

```bash
# 生成时启用调试
hexo generate --debug

# 部署时查看详情
hexo deploy --debug

# 查看 Hexo 版本信息
hexo version
```

#### 常见错误信息

| 错误信息 | 可能原因 | 解决方案 |
|---------|---------|---------|
| `ENOENT: no such file` | 文件路径错误 | 检查文件是否存在 |
| `YAMLException` | YAML 语法错误 | 检查 Front-matter |
| `Template render error` | 模板语法错误 | 检查主题文件 |
| `Error: spawn ENOENT` | 缺少命令工具 | 安装对应工具 |

## 📊 监控与分析

### 性能监控

#### 使用 Lighthouse

```bash
# 安装
npm install -g lighthouse

# 运行测试
lighthouse https://Zhouhang9527.github.io --output html --output-path ./report.html
```

#### 关键指标

- **FCP (First Contentful Paint)**: < 1.8s
- **LCP (Largest Contentful Paint)**: < 2.5s
- **CLS (Cumulative Layout Shift)**: < 0.1
- **FID (First Input Delay)**: < 100ms

### 访问统计

#### 百度统计

```html
<!-- 添加到 body_end.njk -->
<script>
var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?YOUR_SITE_ID";
  var s = document.getElementsByTagName("script")[0]; 
  s.parentNode.insertBefore(hm, s);
})();
</script>
```

#### Google Analytics

```yaml
# _config.next.yml
google_analytics:
  enable: true
  id: G-XXXXXXXXXX
```

### 错误追踪

#### Sentry 集成

```javascript
// source/js/sentry-init.js
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
  beforeSend(event, hint) {
    // 过滤敏感信息
    return event;
  }
});
```

## 🔄 更新策略

### 版本控制

```bash
# 创建功能分支
git checkout -b feature/new-feature

# 开发完成后合并
git checkout main
git merge feature/new-feature

# 打标签
git tag -a v2.0.0 -m "Version 2.0.0"
git push origin v2.0.0
```

### 主题更新

```bash
# 查看主题版本
cd themes/next
git log -1

# 更新主题
git pull origin master

# 如有冲突，解决后
git commit -am "Update NexT theme"
```

### 依赖升级

```bash
# 使用 npm-check-updates
npm install -g npm-check-updates

# 检查更新
ncu

# 交互式更新
ncu -u -i

# 安装更新
npm install
```

## 🚨 应急处理

### 回滚操作

```bash
# Git 回滚到上一个版本
git reset --hard HEAD^

# 回滚到指定版本
git reset --hard <commit-hash>

# 强制推送
git push -f origin main
```

### 紧急修复

```bash
# 创建热修复分支
git checkout -b hotfix/critical-bug

# 修复后快速部署
hexo clean && hexo generate && hexo deploy

# 合并回主分支
git checkout main
git merge hotfix/critical-bug
```

### 数据恢复

```bash
# 从备份恢复
tar -xzf backup-20251221.tar.gz

# 恢复特定文件
git checkout HEAD -- source/_posts/lost-post.md

# 从 Git 历史恢复
git log --all -- source/_posts/deleted-post.md
git checkout <commit-hash> -- source/_posts/deleted-post.md
```

## 📝 维护记录

### 记录模板

```markdown
## 维护记录 - 2025-12-21

### 执行的任务
- [x] 更新依赖包
- [x] 清理缓存
- [x] 备份数据

### 发现的问题
- 无

### 采取的措施
- 更新 hexo 到 8.0.1
- 优化图片加载速度

### 下次维护计划
- 更新主题到最新版本
- 添加新功能

### 备注
- 一切正常
```

### 自动化维护日志

```javascript
// scripts/maintenance-log.js
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../maintenance.log');
const timestamp = new Date().toISOString();

const log = {
  timestamp,
  tasks: ['dependency update', 'cache clean'],
  issues: [],
  notes: 'Regular maintenance'
};

fs.appendFileSync(logFile, JSON.stringify(log) + '\n');
```

## 🎯 最佳实践

### 1. 定期备份
- 每周自动备份
- 保留最近 30 天的备份
- 关键更新前手动备份

### 2. 版本控制
- 所有修改都提交到 Git
- 使用有意义的提交信息
- 重要版本打标签

### 3. 测试先行
- 本地测试后再部署
- 使用测试分支
- 关键功能手动验证

### 4. 文档更新
- 及时更新文档
- 记录重要变更
- 维护 CHANGELOG

### 5. 性能优先
- 定期性能测试
- 优化图片和代码
- 使用 CDN 加速

## 📚 相关资源

- [Hexo 故障排查](https://hexo.io/docs/troubleshooting)
- [NexT 常见问题](https://theme-next.js.org/docs/troubleshooting)
- [Git 最佳实践](https://git-scm.com/book/zh/v2)
- [Web 性能优化](https://web.dev/performance/)

---

**维护负责人**: mm9527  
**最后更新**: 2025-12-21  
**版本**: 2.0.0
