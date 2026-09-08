# 🎀 ATRI Live2D 增强版使用说明 v2.0

## ✨ 新版本重大更新！

### 🎉 新增功能

#### 1. **智能对话系统**
- ✅ 欢迎消息（页面加载时）
- ✅ 点击互动消息
- ✅ 鼠标悬停提示（30% 概率）
- ✅ 复制内容提示
- ✅ 页面滚动互动（10% 概率）
- ✅ 支持自定义消息

#### 2. **控制面板**
- ✅ 显示/隐藏切换按钮
- ✅ 截图保存功能
- ✅ 一键回到原位

#### 3. **高级交互**
- ✅ 拖拽移动位置
- ✅ 鼠标跟踪优化
- ✅ 多种动画支持
- ✅ 响应式设计

#### 4. **美化增强**
- ✅ 渐变色对话框
- ✅ 流畅动画效果
- ✅ 阴影和圆角优化
- ✅ 暗色模式支持

---

## 📖 详细文档

完整的使用指南请查看：
👉 **[ATRI 完整使用指南](docs/ATRI_GUIDE.md)**

---

## 🚀 快速开始

### 1. 基础配置

配置文件位置：`themes/next/layout/_partials/atri-live2d.njk`

```javascript
const CONFIG = {
  modelPath: '/live2d/ATRI/ATRI.model3.json',
  width: 350,
  height: 500,
  scale: 0.25,
  mobileScale: 0.18,
  enableDrag: true,
  enableMessage: true,
  enableControls: true
};
```

### 2. 自定义消息

参考配置文件：`source/_data/atri-config.js`

```javascript
messages: {
  welcome: ['你的欢迎消息'],
  click: ['点击消息'],
  // 更多消息类型...
}
```

### 3. 控制台调试

打开浏览器控制台（F12），输入：

```javascript
// 显示消息
window.ATRI.showMessage('测试消息');

// 播放动画
window.ATRI.playRandomMotion();

// 截图
window.ATRI.takeScreenshot();
```

---

## 🎨 功能展示

### 对话系统

| 场景 | 触发 | 示例 |
|------|------|------|
| 欢迎 | 页面加载 | "你好呀！我是 ATRI~" |
| 点击 | 点击ATRI | "呀！不要戳我~" |
| 复制 | 复制内容 | "复制成功啦！" |

### 控制按钮

- 👁️ **显示/隐藏** - 切换 ATRI 显示状态
- 📷 **截图** - 保存 ATRI 当前画面
- 🏠 **回到原位** - 重置位置到默认

---

---

## ⚙️ 配置预设

我们提供了 4 种预设配置，在 `source/_data/atri-config.js` 中选择：

### 1️⃣ MINIMAL - 极简模式
```javascript
presets.MINIMAL // 最小配置，性能最优
```

### 2️⃣ FULL - 完整模式 ⭐ 推荐
```javascript
presets.FULL // 所有功能启用
```

### 3️⃣ MOBILE - 移动端模式
```javascript
presets.MOBILE // 移动端优化
```

### 4️⃣ PERFORMANCE - 性能模式
```javascript
presets.PERFORMANCE // 平衡性能与功能
```

---

## 🛠️ 自定义配置

### 1. 修改对话消息

在 `source/_data/atri-config.js` 中编辑：

```javascript
messages: {
  welcome: ['你好呀！我是 ATRI~', '欢迎来到 GINKA 的博客！'],
  click: ['呀！不要戳我~', '咦？有什么事吗？'],
  hover: ['在看什么呢？', '嘿嘿~'],
  copy: ['复制成功啦！', '内容已经复制好了~'],
  scroll: ['慢慢看哦~', '别着急翻页呀~']
}
```

### 2. 修改动画配置

```javascript
motionGroups: {
  idle: ['Idle'],
  tap: ['Tap', 'TapBody', 'Shake'],
  pinch: ['PinchIn', 'PinchOut']
}
```

### 3. 调整显示位置

在 `atri-live2d.njk` 中修改：

```javascript
position: {
  right: '20px',   // 距右边
  bottom: '0',     // 距底部
  width: '350px',  // 宽度
  height: '500px'  // 高度
}
```

---

## 🎨 样式自定义

### 修改主题色

在 `atri-live2d.njk` 的样式部分：

```css
--atri-primary: #4FC3F7;        /* 主题色 */
--atri-secondary: #42A5F5;      /* 辅助色 */
--atri-bg: rgba(255,255,255,0.95); /* 背景色 */
```

### 调整对话框样式

```css
.atri-message-box {
  background: linear-gradient(135deg, var(--atri-primary), var(--atri-secondary));
  border-radius: 18px;
  padding: 12px 18px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}
```

---

## 🐛 常见问题

### Q: ATRI 没有显示？
**A:** 检查以下几点：
1. 确保 Live2D 模型文件在 `public/live2d/ATRI/` 目录
2. 检查浏览器控制台是否有错误
3. 确认 PixiJS 库已正确加载
4. 强制刷新浏览器 (Ctrl+F5)

### Q: 如何关闭某些功能？
**A:** 在配置中设置对应功能为 `false`：
```javascript
enableMessage: false,  // 关闭消息
enableControls: false, // 关闭控制面板
enableDrag: false      // 关闭拖拽
```

### Q: 控制台出现错误？
**A:** 
1. 查看 `[ATRI]` 开头的日志
2. 确认看到 `[ATRI] 初始化成功!`
3. 检查模型文件路径是否正确

### Q: 如何调整消息显示频率？
**A:** 修改 `atri-live2d.njk`：
```javascript
// 悬停消息显示概率 (0-1)
if (Math.random() < 0.3) { // 改为 0.5 提高概率
  this.showMessage(msg);
}
```

---

## 📊 性能监控

开启性能监控模式：

```javascript
performance: {
  enableMonitoring: true,  // 开启监控
  logLevel: 'info'         // 日志级别：info/warn/error
}
```

浏览器控制台会显示：
- ✅ 初始化时间
- ✅ 加载状态
- ✅ 动画性能
- ✅ 内存使用

---

## 🔒 安全说明

- ✅ 所有用户数据本地存储（位置记忆）
- ✅ 截图功能仅保存到本地
- ✅ 无外部数据传输
- ✅ 尊重用户隐私

---

## 🎯 最佳实践

### 1. **性能优化**
- 移动端使用较小的 scale 值
- 减少消息显示频率
- 关闭不需要的功能

### 2. **用户体验**
- 保持消息简短有趣
- 控制动画播放频率
- 提供足够的视觉反馈

### 3. **维护建议**
- 定期检查控制台日志
- 测试不同设备和浏览器
- 根据用户反馈调整配置

---

## 💡 高级技巧

### 1. 自定义表情动画

```javascript
// 添加新的表情
window.ATRI.playMotion('Idle', 2); // 播放第 3 个 Idle 动画
```

### 2. 程序化控制

```javascript
// 显示自定义消息
window.ATRI.showMessage('这是自定义消息', 3000);

// 隐藏 ATRI
window.ATRI.hide();

// 显示 ATRI
window.ATRI.show();

// 重置位置
window.ATRI.resetPosition();
```

### 3. 事件监听

```javascript
// 监听 ATRI 点击事件
document.addEventListener('atri-clicked', () => {
  console.log('ATRI 被点击了！');
});
```

---

## 📚 参考资源

- **完整文档**: [ATRI_GUIDE.md](docs/ATRI_GUIDE.md)
- **配置文件**: [atri-config.js](source/_data/atri-config.js)
- **源代码**: [atri-live2d.njk](themes/next/layout/_partials/atri-live2d.njk)
- **PixiJS 官方文档**: https://pixijs.com/
- **Live2D SDK**: https://www.live2d.com/sdk/

---

## 💡 版本信息

- **当前版本**: v2.0.0
- **更新日期**: 2024
- **核心依赖**: PixiJS 7.2.4, pixi-live2d-display
- **模型格式**: Live2D Cubism 3.0

---

## 🤝 贡献与支持

如有问题或建议，欢迎：
1. 查看完整文档
2. 检查控制台日志
3. 提交 Issue
4. 参与优化

---

## 🎉 使用建议

**快速上手:**
1. 使用默认配置启动
2. 尝试点击、拖拽 ATRI
3. 查看浏览器控制台日志
4. 根据需求调整配置

**进阶使用:**
1. 自定义对话消息
2. 调整样式和主题色
3. 配置性能参数
4. 添加自定义事件

---

**享受你的 ATRI Live2D 之旅！** 🎉💖
