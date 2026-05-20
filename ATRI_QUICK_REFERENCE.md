# 🎀 ATRI Live2D 快速参考

## 🚀 一分钟上手

### 基础交互
- **点击 ATRI** → 触发对话和动画
- **拖拽移动** → 按住拖动到任意位置
- **鼠标悬停** → 眼睛会跟随你的鼠标

### 控制按钮
- **👁️ 显示/隐藏** → 切换 ATRI 显示状态
- **📷 截图** → 保存当前画面为 PNG
- **🏠 回到原位** → 重置到默认位置

---

## ⚙️ 配置速查

### 文件位置
```
themes/next/layout/_partials/atri-live2d.njk  # 主程序
source/_data/atri-config.js                    # 配置文件
public/live2d/ATRI/                            # 模型文件
```

### 快速配置
```javascript
// 在 atri-live2d.njk 中修改
const CONFIG = {
  modelPath: '/live2d/ATRI/ATRI.model3.json',
  width: 350,                    // 宽度
  height: 500,                   // 高度
  scale: 0.25,                   // 桌面缩放
  mobileScale: 0.18,             // 移动端缩放
  enableDrag: true,              // 启用拖拽
  enableMessage: true,           // 启用消息
  enableControls: true           // 启用控制面板
};
```

---

## 💬 消息类型

| 类型 | 触发时机 | 频率 |
|------|---------|------|
| welcome | 页面加载 | 一次 |
| click | 点击 ATRI | 每次 |
| hover | 鼠标悬停 | 30% |
| copy | 复制内容 | 每次 |
| scroll | 页面滚动 | 10% |

---

## 🎨 样式自定义

### 主题色
```css
--atri-primary: #4FC3F7;        /* 主色调 */
--atri-secondary: #42A5F5;      /* 辅助色 */
--atri-bg: rgba(255,255,255,0.95); /* 背景色 */
```

### 位置调整
```css
#atri-live2d-widget {
  right: 20px;   /* 距右边 */
  bottom: 0;     /* 距底部 */
}
```

---

## 🔧 控制台命令

```javascript
// 显示自定义消息
window.ATRI.showMessage('你好！', 3000);

// 播放动画
window.ATRI.playRandomMotion();

// 隐藏/显示
window.ATRI.hide();
window.ATRI.show();

// 重置位置
window.ATRI.resetPosition();

// 截图
window.ATRI.takeScreenshot();
```

---

## 🐛 故障排查

### ATRI 不显示
1. 按 `F12` 打开控制台
2. 查看是否有 `[ATRI]` 错误
3. 确认看到 `[ATRI] 初始化成功!`
4. 检查模型文件路径

### 性能问题
1. 使用 PERFORMANCE 预设
2. 降低 `scale` 值
3. 关闭 `enableMessage`
4. 限制 `maxFPS` 到 30

### 功能异常
1. 清除浏览器缓存
2. 运行 `hexo clean`
3. 重新生成 `hexo generate`
4. 强制刷新 `Ctrl + F5`

---

## 📊 性能参考

| 设备类型 | 推荐配置 | 性能影响 |
|---------|---------|---------|
| 高性能桌面 | FULL | 低 (< 5%) |
| 普通桌面 | PERFORMANCE | 中 (< 10%) |
| 移动设备 | MOBILE | 低 (< 8%) |
| 低端设备 | MINIMAL | 极低 (< 3%) |

---

## 🎯 预设模式对比

| 功能 | MINIMAL | PERFORMANCE | MOBILE | FULL |
|------|---------|-------------|--------|------|
| 对话系统 | ❌ | ✅ | ✅ | ✅ |
| 控制面板 | ❌ | ✅ | ❌ | ✅ |
| 拖拽移动 | ✅ | ✅ | ❌ | ✅ |
| 消息频率 | 0% | 50% | 80% | 100% |
| 性能消耗 | 极低 | 低 | 低 | 中 |

---

## 📚 文档链接

- **完整指南**: [ATRI_使用说明.md](ATRI_使用说明.md)
- **开发文档**: [docs/ATRI_GUIDE.md](docs/ATRI_GUIDE.md)
- **配置示例**: [source/_data/atri-config.js](source/_data/atri-config.js)

---

## 💡 快捷键

| 操作 | 快捷键 |
|------|-------|
| 打开控制台 | `F12` |
| 强制刷新 | `Ctrl + F5` |
| 截图 | 点击控制面板 📷 按钮 |
| 隐藏 ATRI | 点击控制面板 👁️ 按钮 |

---

## 🔗 资源链接

- **PixiJS**: https://pixijs.com/
- **Live2D SDK**: https://www.live2d.com/sdk/
- **pixi-live2d-display**: https://github.com/guansss/pixi-live2d-display

---

**制作时间**: 2024  
**版本**: v2.0.0  
**作者**: GINKA

---

💡 **提示**: 保存此文件作为快速参考，遇到问题时可以快速查找解决方案！
