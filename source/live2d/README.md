# 本地 ATRI 模型配置说明

## 如何添加本地 ATRI 模型

### 步骤1: 下载 ATRI 模型文件
1. 访问: https://github.com/AgeTime/live2D_npm/tree/main/ATRI
2. 点击 "Code" -> "Download ZIP" 下载整个仓库
3. 或者使用 Git: `git clone https://github.com/AgeTime/live2D_npm.git`

### 步骤2: 复制文件到本地
将下载的 ATRI 文件夹完整复制到: `themes/next/source/live2d/ATRI/`

### 步骤3: 修改配置
在 `_config.yml` 中修改 live2d 配置：

```yaml
live2d:
  enable: true
  scriptFrom: jsdelivr
  model:
    # 使用本地模型路径，注意这是 Live2D 3.0 格式
    jsonPath: /live2d/ATRI/ATRI.model3.json
  display:
    position: right
    width: 150
    height: 300
  mobile:
    show: false
```

## ATRI 模型文件结构
从 GitHub 可以看到 ATRI 包含：
- `ATRI.model3.json` - 主模型文件 (Live2D 3.0 格式)
- `ATRI.moc3` - 模型数据
- `ATRI.4096/` - 高分辨率纹理文件夹
- `ATRI.physics3.json` - 物理效果
- 其他配置文件

## 注意事项
- ATRI 使用的是 Live2D 3.0 格式 (.model3.json)
- 确保下载完整的文件夹，包括所有纹理文件
- 路径必须是 `/live2d/ATRI/ATRI.model3.json`