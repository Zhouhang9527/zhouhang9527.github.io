---
title: 🎀 ATRI Live2D 使用文档
categories:
  - 文档
tags:
  - Live2D
  - JavaScript
  - PixiJS
  - 博客美化
description: ATRI Live2D 看板娘增强版使用文档 - v2.0 版本完整使用指南
comments: false
---

# 🎀 ATRI Live2D v2.0 功能展示

欢迎来到 ATRI Live2D 看板娘的功能展示页面！这里将全面介绍新版本的所有特性和使用方法。

<!-- more -->

## ✨ 新版本亮点

### 🎉 v2.0 重大更新

相比旧版本，v2.0 带来了全面的功能升级：

| 功能模块 | v1.0 | v2.0 |
|---------|------|------|
| 对话系统 | ❌ | ✅ 5种场景 |
| 控制面板 | ❌ | ✅ 3个按钮 |
| 拖拽移动 | ❌ | ✅ 自由定位 |
| 截图功能 | ❌ | ✅ 一键保存 |
| 配置系统 | ❌ | ✅ 4种预设 |
| 样式优化 | 基础 | ✅ 渐变美化 |
| 响应式 | 基础 | ✅ 完全适配 |

---

## 🎮 互动功能演示

### 1. 智能对话系统

ATRI 会在不同场景下与你互动：

#### 欢迎消息
当你第一次打开页面时，ATRI 会主动向你问好：
- "你好呀！我是 ATRI~"
- "欢迎来到 GINKA 的博客！"
- "很高兴见到你~"

#### 点击互动
点击 ATRI 会触发各种可爱的反应：
- "呀！不要戳我~"
- "咦？有什么事吗？"
- "emmm...在叫我吗？"
- "嘿嘿，找我有事吗？"

#### 鼠标悬停（30% 概率）
当你的鼠标悬停在 ATRI 上时，她可能会说：
- "在看什么呢？"
- "嘿嘿~"
- "需要帮助吗？"

#### 复制内容
当你复制页面内容时：
- "复制成功啦！"
- "内容已经复制好了~"
- "记得注明出处哦~"

#### 页面滚动（10% 概率）
在你浏览文章时，偶尔会提醒：
- "慢慢看哦~"
- "别着急翻页呀~"
- "有什么不懂的可以问我~"

---

### 2. 控制面板

右上角的控制面板提供了三个实用按钮：

#### 👁️ 显示/隐藏
- **功能**：一键切换 ATRI 的显示状态
- **使用场景**：需要专注阅读时可以暂时隐藏
- **状态记忆**：会记住你的选择

#### 📷 截图
- **功能**：保存 ATRI 当前画面
- **文件格式**：PNG 透明背景
- **保存位置**：浏览器默认下载位置
- **文件名**：`ATRI_screenshot_[时间戳].png`

#### 🏠 回到原位
- **功能**：重置 ATRI 位置到默认位置
- **使用场景**：拖拽移动后想恢复原位
- **动画效果**：平滑过渡

---

### 3. 拖拽移动

#### 如何使用
1. 将鼠标悬停在 ATRI 上
2. 按住鼠标左键
3. 拖动到你想要的位置
4. 释放鼠标

#### 特性
- ✅ 平滑跟随光标
- ✅ 自动边界检测
- ✅ 位置记忆功能
- ✅ 视觉反馈（阴影变化）

---

### 4. 鼠标跟踪

ATRI 的眼睛和头部会实时跟随你的鼠标移动：

#### 跟踪范围
- **水平角度**：-30° ~ +30°
- **垂直角度**：-30° ~ +30°
- **眼球移动**：独立于头部
- **平滑过渡**：使用缓动算法

#### 实现细节
```javascript
// 头部旋转
ParamAngleX: 水平角度
ParamAngleY: 垂直角度

// 眼球移动
ParamEyeBallX: 眼球水平
ParamEyeBallY: 眼球垂直
```

---

## 🎨 样式展示

### 对话框设计

#### 视觉特点
- **渐变背景**：蓝色到青色的现代渐变
- **圆角设计**：18px 圆角，更加柔和
- **阴影效果**：多层阴影营造立体感
- **三角指示器**：指向 ATRI 的对话框箭头

#### CSS 实现
```css
.atri-message-box {
  background: linear-gradient(135deg, #4FC3F7 0%, #42A5F5 100%);
  border-radius: 18px;
  padding: 12px 18px;
  box-shadow: 
    0 4px 15px rgba(0,0,0,0.2),
    0 0 0 1px rgba(255,255,255,0.1);
}
```

---

### 控制面板设计

#### 视觉特点
- **毛玻璃效果**：背景模糊
- **图标按钮**：清晰的视觉语言
- **悬停反馈**：背景色和缩放变化
- **点击反馈**：按下动画

#### 交互动画
```css
/* 悬停效果 */
.atri-control-btn:hover {
  background: rgba(255,255,255,0.2);
  transform: scale(1.1);
}

/* 点击效果 */
.atri-control-btn:active {
  transform: scale(0.95);
}
```

---

## ⚙️ 配置系统

### 预设模式

我们提供了 4 种开箱即用的配置预设：

#### 1. MINIMAL - 极简模式
```javascript
{
  enableMessage: false,
  enableControls: false,
  enableDrag: true,
  messageFrequency: 0
}
```
**适用场景**：追求极致性能，只需要基础展示

#### 2. FULL - 完整模式 ⭐ 推荐
```javascript
{
  enableMessage: true,
  enableControls: true,
  enableDrag: true,
  messageFrequency: 1
}
```
**适用场景**：享受所有功能，最佳用户体验

#### 3. MOBILE - 移动端模式
```javascript
{
  scale: 0.18,
  enableMessage: true,
  enableControls: false,
  enableDrag: false
}
```
**适用场景**：移动设备优化，减少交互复杂度

#### 4. PERFORMANCE - 性能模式
```javascript
{
  enableMessage: true,
  enableControls: true,
  enableDrag: true,
  messageFrequency: 0.5
}
```
**适用场景**：平衡功能与性能

---

### 自定义配置

#### 消息配置
```javascript
messages: {
  welcome: [
    '你好呀！我是 ATRI~',
    '欢迎来到 GINKA 的博客！',
    '很高兴见到你~'
  ],
  click: [
    '呀！不要戳我~',
    '咦？有什么事吗？'
  ],
  // ... 更多消息
}
```

#### 动画配置
```javascript
motionGroups: {
  idle: ['Idle'],           // 闲置动画
  tap: ['Tap', 'TapBody'],  // 点击动画
  pinch: ['PinchIn']        // 捏动画
}
```

#### 性能配置
```javascript
performance: {
  enableMonitoring: true,   // 性能监控
  maxFPS: 60,               // 最大帧率
  updateInterval: 16,       // 更新间隔
  logLevel: 'info'          // 日志级别
}
```

---

## 🔧 技术实现

### 核心技术栈

#### 渲染引擎
- **PixiJS 7.2.4**：高性能 WebGL 渲染
- **pixi-live2d-display**：Live2D 展示库
- **Live2D Cubism 3.0**：模型格式

#### 架构设计
```javascript
class ATRILive2D {
  constructor(config) {
    this.config = config;
    this.app = null;
    this.model = null;
    this.messageBox = null;
  }

  async init() {
    await this.loadLibraries();
    await this.createApplication();
    await this.loadModel();
    this.setupInteractions();
    this.setupControls();
  }

  // ... 更多方法
}
```

---

### 性能优化

#### 1. 懒加载
```javascript
// 库文件按需加载
const loadLibrary = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
};
```

#### 2. 节流防抖
```javascript
// 鼠标移动事件节流
const throttledMouseMove = throttle((e) => {
  updateMouseTracking(e);
}, 16); // 60 FPS
```

#### 3. 资源优化
- Canvas 分辨率自适应
- 贴图压缩
- 动画缓存
- 事件代理

---

## 📊 性能监控

### 启用监控

在配置中开启：
```javascript
performance: {
  enableMonitoring: true,
  logLevel: 'info'
}
```

### 监控指标

#### 初始化性能
```
[ATRI] 初始化开始
[ATRI] 库加载完成: 1.2s
[ATRI] 模型加载完成: 0.8s
[ATRI] 总初始化时间: 2.0s
```

#### 运行时性能
```
[ATRI] 平均 FPS: 60
[ATRI] 内存使用: 25MB
[ATRI] 模型渲染时间: 2ms
```

---

## 🎯 使用建议

### 适合场景
- ✅ 个人博客美化
- ✅ 技术文档站点
- ✅ 作品展示页面
- ✅ 学习交流平台

### 不适合场景
- ❌ 企业官网（过于活泼）
- ❌ 新闻资讯（干扰阅读）
- ❌ 电商网站（影响转化）

### 配置建议

#### 桌面端
```javascript
{
  scale: 0.25,
  enableMessage: true,
  enableControls: true,
  enableDrag: true
}
```

#### 移动端
```javascript
{
  scale: 0.18,
  enableMessage: false,
  enableControls: false,
  enableDrag: false
}
```

---

## 🚀 快速开始

### 1. 检查文件
确保以下文件存在：
- `themes/next/layout/_partials/atri-live2d.njk`
- `source/_data/atri-config.js`
- `public/live2d/ATRI/` 模型文件夹

### 2. 配置主题
在 `_config.next.yml` 中启用：
```yaml
custom_file_path:
  bodyEnd: source/_data/body-end.njk
```

### 3. 引入组件
在 `body-end.njk` 中添加：
```njk
{% include '../../../themes/next/layout/_partials/atri-live2d.njk' %}
```

### 4. 生成部署
```bash
hexo clean
hexo generate
hexo server
```

### 5. 浏览测试
打开 `http://localhost:4000`，你应该能看到 ATRI 出现在右下角！

---

## 📚 完整文档

### 核心文档
- 📖 [完整使用指南](../atri/ATRI_使用说明.md)
- 🔧 [开发文档](../docs/ATRI_GUIDE.md)
- ⚙️ [配置参考](../source/_data/atri-config.js)

### 技术参考
- [PixiJS 官方文档](https://pixijs.com/)
- [Live2D SDK](https://www.live2d.com/sdk/)
- [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display)

---

## 💡 小贴士

### 开发调试

#### 打开控制台
按 `F12` 打开浏览器控制台，你会看到：
```
[ATRI] 初始化开始...
[ATRI] 库加载完成
[ATRI] 模型加载成功
[ATRI] 初始化完成！
```

#### 手动测试
在控制台输入：
```javascript
// 显示消息
window.ATRI.showMessage('测试消息');

// 播放动画
window.ATRI.playRandomMotion();

// 截图
window.ATRI.takeScreenshot();

// 隐藏
window.ATRI.hide();

// 显示
window.ATRI.show();
```

---

### 常见问题

#### Q: ATRI 不显示？
**检查清单**：
- [ ] 模型文件是否完整
- [ ] 库文件是否加载
- [ ] 控制台是否有错误
- [ ] 路径配置是否正确

#### Q: 性能不佳？
**优化建议**：
- 使用 PERFORMANCE 预设
- 降低 FPS 限制
- 关闭部分功能
- 减小 canvas 分辨率

#### Q: 如何自定义样式？
**修改位置**：
- 对话框：`.atri-message-box` 样式
- 控制面板：`.atri-controls` 样式
- 主容器：`#atri-live2d-widget` 样式

---

## 🎉 结语

ATRI Live2D v2.0 是一次全面的功能升级，我们希望它能为你的博客增添更多趣味和互动性！

### 特别感谢
- Live2D 团队提供的优秀技术
- PixiJS 社区的开源贡献
- 所有使用和反馈的用户

### 下一步计划
- [ ] 支持更多 Live2D 模型
- [ ] 添加语音交互
- [ ] 多语言支持
- [ ] 主题商店

---

**快去试试吧！** 🎀💖

如有问题或建议，欢迎在评论区留言~
