# GINKA Live2D 模型获取指南

由于我无法直接搜索网络，这里提供几个获取 GINKA Live2D 模型的方向：

## 方案1: 使用专门的 ATRI 模型 (强烈推荐!)
🎉 您找到了专门的 ATRI 模型！来自: https://github.com/AgeTime/live2D_npm/tree/main/ATRI

我已经配置了 ATRI 专用模型，这是完美的 GINKA 替代方案：

主选配置 (已设置):
- `live2d-widget-model-ATRI`: 专门的 ATRI 包

如果不工作，可尝试的备选包名:
- `ATRI`: 简化包名
- `live2d-widget-model-atri`: 小写版本
- `live2d-widget-ATRI`: 混合命名

## 立即测试
请现在运行 "一键清理并启动.bat" 来测试 ATRI 模型！

## 如果 ATRI 包不可用
如果 npm 上没有发布这个包，我们可以：
1. 手动下载 ATRI 文件夹到本地
2. 配置为本地模型路径

## 方案2: 寻找 GINKA 专用模型
您可以在以下地方寻找：
1. **GitHub**: 搜索 "ginka live2d model" 或 "ginka l2d"
2. **bilibili**: 搜索 "GINKA Live2D" 或 "银华 Live2D"
3. **Live2D 社区论坛**
4. **游戏资源提取**: 如果您有 GINKA 游戏本体，可能包含 Live2D 资源

## 方案3: 自定义模型路径
如果您找到了 GINKA 模型文件，可以：
1. 将模型文件夹放到 `themes/next/source/live2d/ginka/`
2. 修改 `_config.yml` 中的配置：
```yaml
live2d:
  model:
    jsonPath: /live2d/ginka/model.json  # 改为本地路径
```

## 方案4: 临时替代
现在使用的 `hijiki` 模型应该能正常显示。如果不行，可以尝试：
- `shizuku`: 最稳定的白发角色
- `z16`: 机械风格（已知可用）

请先运行 "一键清理并启动.bat" 看看 `hijiki` 模型是否能正常显示。如果可以，我们就有了一个不错的替代方案。

如果您找到了真正的 GINKA 模型资源，我可以帮您配置到博客中。