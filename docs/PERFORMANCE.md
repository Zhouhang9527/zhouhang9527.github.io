# GINKA Blog 性能优化配置

## 🚀 优化概述

本文档包含 GINKA Blog 的所有性能优化配置和最佳实践。

## 📊 性能目标

| 指标 | 目标值 | 当前值 |
|------|--------|--------|
| FCP | < 1.8s | TBD |
| LCP | < 2.5s | TBD |
| CLS | < 0.1 | TBD |
| FID | < 100ms | TBD |
| 页面大小 | < 1MB | TBD |

## ⚡ 优化策略

### 1. 资源压缩

#### HTML 压缩

```bash
# 安装插件
npm install hexo-html-minifier --save
```

```yaml
# _config.yml
html_minifier:
  enable: true
  exclude: 
    - '*.min.html'
  ignoreCustomComments:
    - /^\s*more/
  removeComments: true
  removeCommentsFromCDATA: true
  collapseWhitespace: true
  collapseBooleanAttributes: true
  removeEmptyAttributes: true
  minifyJS: true
  minifyCSS: true
```

#### CSS/JS 压缩

```bash
# 安装插件
npm install hexo-clean-css hexo-uglify --save
```

```yaml
# _config.yml
clean_css:
  enable: true
  exclude:
    - '*.min.css'

uglify:
  enable: true
  mangle: true
  compress:
    warnings: false
  exclude:
    - '*.min.js'
```

### 2. 图片优化

#### 使用 WebP 格式

```yaml
# _config.yml
# 安装 hexo-filter-webp
webp:
  enable: true
  quality: 80
  exclude: []
```

#### 图片懒加载

```javascript
// 在 ginka-main.js 中已实现
lazyLoad: function() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });
    
    document.querySelectorAll('img.lazy').forEach(img => {
      imageObserver.observe(img);
    });
  }
}
```

### 3. CDN 加速

#### 配置 CDN

```yaml
# _config.next.yml
vendors:
  # 使用 jsDelivr CDN
  _internal: jsdelivr
  
  # 自定义 CDN
  jquery: https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js
  fancybox_css: https://cdn.jsdelivr.net/npm/@fancyapps/fancybox@3/dist/jquery.fancybox.min.css
  fancybox: https://cdn.jsdelivr.net/npm/@fancyapps/fancybox@3/dist/jquery.fancybox.min.js
```

#### 图片 CDN

```yaml
# _config.yml
# 使用图床服务
cdn:
  enable: true
  host: https://cdn.example.com
  # 或使用七牛云、阿里云 OSS 等
```

### 4. 缓存策略

#### 浏览器缓存

在服务器配置文件中添加：

**Nginx:**
```nginx
# 静态资源缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# HTML 文件短期缓存
location ~* \.html$ {
    expires 1h;
    add_header Cache-Control "public, must-revalidate";
}
```

**Apache (.htaccess):**
```apache
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType text/html "access plus 1 hour"
</IfModule>
```

### 5. 代码分割

#### 按需加载

```javascript
// 异步加载非关键脚本
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

// 延迟加载
document.addEventListener('DOMContentLoaded', () => {
  // 页面加载后再加载评论系统
  setTimeout(() => {
    loadScript('/js/comments.js');
  }, 2000);
});
```

### 6. 预加载和预连接

```html
<!-- 在 head.njk 中添加 -->
<!-- 预连接到外部资源 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://cdn.jsdelivr.net">

<!-- DNS 预解析 -->
<link rel="dns-prefetch" href="//fonts.googleapis.com">
<link rel="dns-prefetch" href="//cdn.jsdelivr.net">

<!-- 预加载关键资源 -->
<link rel="preload" href="/css/main.css" as="style">
<link rel="preload" href="/js/ginka-main.js" as="script">
```

### 7. 字体优化

```yaml
# _config.next.yml
font:
  enable: true
  host: https://fonts.googleapis.com
  
  # 使用 font-display: swap
  global:
    external: true
    family: "Noto Serif SC"
  
  codes:
    external: true
    family: "JetBrains Mono"
```

```css
/* 在 CSS 中添加 */
@font-face {
  font-family: 'Noto Serif SC';
  font-display: swap;
  src: url('...') format('woff2');
}
```

### 8. Service Worker (PWA)

```javascript
// sw.js
const CACHE_NAME = 'ginka-blog-v2.0.0';
const urlsToCache = [
  '/',
  '/css/main.css',
  '/js/ginka-main.js',
  '/images/avatar.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

### 9. 数据库优化

```yaml
# _config.yml
# 优化 Hexo 数据库
database:
  type: memory  # 使用内存数据库加速
```

### 10. 构建优化

```json
// package.json
{
  "scripts": {
    "build": "hexo clean && hexo generate",
    "build:production": "NODE_ENV=production hexo clean && hexo generate",
    "analyze": "npm run build && bundlesize"
  }
}
```

## 📈 性能监控

### 1. Lighthouse CI

```yaml
# lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:4000'],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['error', {minScore: 0.9}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        'categories:best-practices': ['error', {minScore: 0.9}],
        'categories:seo': ['error', {minScore: 0.9}]
      }
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-results'
    }
  }
};
```

### 2. Web Vitals 监控

```javascript
// 在 ginka-main.js 中添加
function reportWebVitals() {
  if ('web-vital' in window) {
    getCLS(console.log);
    getFID(console.log);
    getLCP(console.log);
  }
}

window.addEventListener('load', reportWebVitals);
```

### 3. 性能预算

```javascript
// performance-budget.js
module.exports = {
  budgets: [
    {
      resourceSizes: [
        { resourceType: 'script', budget: 300 },
        { resourceType: 'stylesheet', budget: 150 },
        { resourceType: 'image', budget: 500 },
        { resourceType: 'font', budget: 100 },
        { resourceType: 'total', budget: 1000 }
      ]
    }
  ]
};
```

## 🔍 性能测试

### 本地测试

```bash
# 使用 Lighthouse
lighthouse http://localhost:4000 --view

# 使用 WebPageTest
# 访问 https://www.webpagetest.org/

# 使用 GTmetrix
# 访问 https://gtmetrix.com/
```

### 自动化测试

```yaml
# .github/workflows/performance.yml
name: Performance Test

on: [push]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v8
        with:
          urls: |
            https://Zhouhang9527.github.io
          uploadArtifacts: true
```

## 📊 优化检查清单

### 图片优化
- [ ] 所有图片已压缩
- [ ] 使用 WebP 格式
- [ ] 实现懒加载
- [ ] 设置正确的尺寸
- [ ] 使用 CDN

### 代码优化
- [ ] HTML/CSS/JS 已压缩
- [ ] 移除未使用的代码
- [ ] 代码分割实现
- [ ] 异步加载非关键资源
- [ ] 使用现代化的 JavaScript

### 缓存策略
- [ ] 静态资源长期缓存
- [ ] HTML 短期缓存
- [ ] Service Worker 配置
- [ ] CDN 缓存设置

### 加载优化
- [ ] 关键 CSS 内联
- [ ] 预加载关键资源
- [ ] 预连接外部资源
- [ ] DNS 预解析
- [ ] 字体优化

### 渲染优化
- [ ] 避免布局抖动
- [ ] 优化关键渲染路径
- [ ] 减少重绘重排
- [ ] 使用 CSS 动画代替 JS

## 📝 优化建议

### 立即实施
1. 启用 HTML/CSS/JS 压缩
2. 配置浏览器缓存
3. 使用 CDN 加速
4. 优化图片大小

### 短期计划
1. 实现图片懒加载
2. 添加 Service Worker
3. 优化字体加载
4. 代码分割

### 长期规划
1. 迁移到 HTTP/3
2. 实现完整的 PWA
3. 使用边缘计算
4. 实时性能监控

## 🎯 预期效果

实施所有优化后，预期达到：

- **Lighthouse 性能评分**: > 90
- **首次内容绘制 (FCP)**: < 1.5s
- **最大内容绘制 (LCP)**: < 2.0s
- **总阻塞时间 (TBT)**: < 200ms
- **累积布局偏移 (CLS)**: < 0.1
- **页面总大小**: < 800KB
- **请求数量**: < 50

## 📚 参考资源

- [Web.dev Performance](https://web.dev/performance/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)
- [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)

---

**最后更新**: 2025-12-21  
**版本**: 2.0.0
