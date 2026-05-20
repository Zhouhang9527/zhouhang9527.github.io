# ATRI Live2D 增强版 - 完整使用指南 v2.0

## 🎉 新版本特性

### ✨ 核心功能

#### 1. **智能对话系统**
- 欢迎消息
- 点击互动消息
- 鼠标悬停提示
- 复制内容提示
- 页面滚动互动

#### 2. **高级交互**
- 鼠标跟踪（眼睛和头部）
- 点击播放动画
- 拖拽移动位置
- 自动闲置动画

#### 3. **控制面板**
- 显示/隐藏切换
- 截图保存功能
- 一键回到原位

#### 4. **响应式设计**
- 自适应移动设备
- Retina 屏幕优化
- 超小屏自动隐藏

## 📋 功能详解

### 对话系统

ATRI 会在不同场景下说话：

| 场景 | 触发条件 | 示例消息 |
|------|---------|---------|
| 欢迎 | 页面加载完成 | "你好呀！我是 ATRI~" |
| 点击 | 点击 ATRI | "呀！不要戳我~" |
| 悬停 | 鼠标悬停（30%概率） | "有什么需要帮助的吗？" |
| 复制 | 复制页面内容 | "复制成功啦！" |
| 滚动 | 滚动页面（10%概率） | "看到什么有趣的内容了吗？" |

### 动画系统

支持的动画组：
- `tap_body` - 点击身体
- `shake` - 摇晃
- `idle` - 闲置
- `flick_head` - 摇头

每15秒自动播放一次闲置动画。

### 控制按钮

| 按钮 | 图标 | 功能 |
|------|------|------|
| 显示/隐藏 | 👁️ | 切换 ATRI 显示状态 |
| 截图 | 📷 | 保存 ATRI 截图 |
| 回到原位 | 🏠 | 重置 ATRI 位置 |

## 🎨 自定义配置

### 修改配置参数

编辑 `themes/next/layout/_partials/atri-live2d.njk`，找到 `CONFIG` 对象：

```javascript
const CONFIG = {
  // 模型路径
  modelPath: '/live2d/ATRI/ATRI.model3.json',
  
  // Canvas 尺寸
  width: 350,
  height: 500,
  
  // 缩放比例
  scale: 0.25,        // 桌面端
  mobileScale: 0.18,  // 移动端
  
  // 消息配置
  messages: {
    welcome: ['你好呀！', '欢迎！'],
    click: ['呀！', '嘿嘿~'],
    // 添加更多消息...
  },
  
  // 动画组
  motionGroups: ['tap_body', 'shake', 'idle'],
  
  // 功能开关
  enableDrag: true,      // 启用拖拽
  enableMessage: true,    // 启用消息
  enableControls: true,   // 启用控制面板
  
  // 消息显示时长（毫秒）
  messageTimeout: 3000
};
```

### 添加自定义消息

```javascript
messages: {
  welcome: [
    '你好呀！我是 ATRI~',
    '欢迎来到博客！',
    '今天也要加油哦！',
    // 添加你的消息...
  ],
  custom: [
    '自定义场景消息'
  ]
}
```

### 修改位置和尺寸

```javascript
// 在 CSS 中修改
#atri-live2d-widget {
  right: 20px;    // 距离右边
  bottom: 0;      // 距离底部
}

// 或在 JavaScript 配置中
width: 400,      // Canvas 宽度
height: 600,     // Canvas 高度
scale: 0.3,      // 放大一点
```

### 修改颜色主题

```css
/* 对话框颜色 */
#atri-message-box {
  background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
}

/* 控制按钮颜色 */
.atri-control-btn {
  background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
}
```

## 🔧 高级功能

### 1. 添加新的交互事件

```javascript
// 在 setupPageEvents() 方法中添加
setupPageEvents() {
  // 现有事件...
  
  // 添加自定义事件
  document.addEventListener('yourEvent', () => {
    this.showMessage('自定义消息');
    this.playRandomMotion();
  });
}
```

### 2. 扩展动画系统

```javascript
// 添加特定动画播放方法
playSpecificMotion(group, index) {
  if (this.model.internalModel && this.model.internalModel.motionManager) {
    this.model.motion(group, index);
  }
}

// 使用
window.ATRI.playSpecificMotion('tap_body', 0);
```

### 3. 控制台调试

```javascript
// 打开控制台，输入以下命令

// 播放指定动画
window.ATRI.playRandomMotion();

// 显示消息
window.ATRI.showMessage('测试消息');

// 隐藏/显示
window.ATRI.isVisible = false;
window.ATRI.canvas.style.opacity = '0';

// 截图
window.ATRI.takeScreenshot();
```

### 4. 添加表情系统

```javascript
// 在 CONFIG 中添加
expressions: ['normal', 'happy', 'sad', 'angry'],

// 添加方法
playExpression(name) {
  if (this.model.internalModel && this.model.internalModel.expressionManager) {
    this.model.expression(name);
  }
}
```

## 📱 移动端优化

### 触摸事件支持

移动端自动支持：
- 点击 = `pointertap`
- 拖拽 = `touchmove`
- 悬停 = 不支持（自动禁用）

### 性能优化

```javascript
// 降低帧率
app.ticker.maxFPS = 30;

// 降低分辨率
resolution: 1,  // 不使用 devicePixelRatio

// 缩小尺寸
mobileScale: 0.15
```

## 🎯 使用场景

### 博客互动

```javascript
// 文章阅读进度提示
let lastScrollPercent = 0;
window.addEventListener('scroll', () => {
  const percent = Math.round((window.scrollY / document.body.scrollHeight) * 100);
  
  if (percent > lastScrollPercent + 25) {
    window.ATRI.showMessage('已经读了 ' + percent + '% 啦！');
    lastScrollPercent = percent;
  }
});
```

### 特殊日期问候

```javascript
// 在 init() 后添加
const now = new Date();
const hour = now.getHours();

if (hour < 6) {
  this.showMessage('这么晚还不睡吗？');
} else if (hour < 12) {
  this.showMessage('早上好！');
} else if (hour < 18) {
  this.showMessage('下午好！');
} else {
  this.showMessage('晚上好！');
}
```

### 节日彩蛋

```javascript
const today = now.getMonth() + '-' + now.getDate();

const holidays = {
  '1-1': '新年快乐！',
  '2-14': '情人节快乐~',
  '12-25': '圣诞快乐！',
  // 添加更多节日...
};

if (holidays[today]) {
  this.showMessage(holidays[today]);
}
```

## 🐛 故障排查

### ATRI 不显示

1. **检查控制台**
   ```
   F12 → Console → 查看 [ATRI] 日志
   ```

2. **常见错误**
   - 库加载失败 → 检查文件路径
   - 模型加载失败 → 检查模型文件
   - Canvas 未找到 → 检查 HTML 结构

3. **手动测试**
   ```javascript
   console.log(window.PIXI);
   console.log(window.ATRI);
   ```

### 对话框不显示

```javascript
// 检查配置
console.log(window.ATRI.config.enableMessage);

// 手动显示
window.ATRI.showMessage('测试');
```

### 控制按钮失效

```javascript
// 检查是否启用
console.log(window.ATRI.config.enableControls);

// 检查元素
console.log(document.getElementById('atri-controls'));
```

### 性能问题

```javascript
// 降低帧率
window.ATRI.app.ticker.maxFPS = 24;

// 禁用拖拽
window.ATRI.config.enableDrag = false;

// 减少消息显示
window.ATRI.config.enableMessage = false;
```

## 📊 性能监控

### 查看 FPS

```javascript
setInterval(() => {
  console.log('FPS:', window.ATRI.app.ticker.FPS);
}, 1000);
```

### 内存使用

```javascript
// Chrome DevTools → Performance → Record
```

## 🎨 样式定制

### 渐变色方案

```css
/* 紫色渐变（默认） */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* 蓝色渐变 */
background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);

/* 粉色渐变 */
background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);

/* 绿色渐变 */
background: linear-gradient(135deg, #30cfd0 0%, #330867 100%);
```

### 动画速度

```css
/* 加快动画 */
transition: all 0.2s ease;

/* 减慢动画 */
transition: all 0.5s ease;

/* 弹性动画 */
transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

## 🔐 安全注意事项

1. **XSS 防护**
   - 消息内容已转义
   - 不使用 innerHTML

2. **性能限制**
   - 事件节流
   - 定时器清理
   - 内存管理

3. **隐私保护**
   - 本地加载资源
   - 无外部追踪
   - 无数据收集

## 📚 API 参考

### 公开方法

```javascript
// 显示消息
window.ATRI.showMessage(text);

// 显示随机消息
window.ATRI.showRandomMessage(type);

// 播放动画
window.ATRI.playRandomMotion();

// 截图
window.ATRI.takeScreenshot();
```

### 配置选项

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| modelPath | string | - | 模型文件路径 |
| width | number | 350 | Canvas 宽度 |
| height | number | 500 | Canvas 高度 |
| scale | number | 0.25 | 桌面缩放 |
| mobileScale | number | 0.18 | 移动端缩放 |
| enableDrag | boolean | true | 启用拖拽 |
| enableMessage | boolean | true | 启用消息 |
| enableControls | boolean | true | 启用控制面板 |
| messageTimeout | number | 3000 | 消息显示时长（毫秒） |

## 🎯 最佳实践

1. **性能优化**
   - 移动端降低分辨率
   - 使用节流限制事件
   - 及时清理定时器

2. **用户体验**
   - 消息不要过于频繁
   - 动画要自然流畅
   - 提供关闭选项

3. **可访问性**
   - 支持键盘操作
   - 提供文字说明
   - 允许禁用动画

4. **维护性**
   - 配置与代码分离
   - 添加详细注释
   - 保持代码整洁

## 📖 更新日志

### v2.0.0 (2025-12-21)
- ✨ 新增对话系统
- ✨ 新增控制面板
- ✨ 新增拖拽功能
- ✨ 新增截图功能
- ⚡ 优化性能
- 🎨 美化样式
- 📝 完善文档

### v1.0.0
- 基础 Live2D 显示
- 鼠标跟踪
- 点击交互

---

**作者**: GINKA Blog Team  
**版本**: 2.0.0  
**更新**: 2025-12-21  
**反馈**: [GitHub Issues](https://github.com/Zhouhang9527/zhouhang9527.github.io/issues)
