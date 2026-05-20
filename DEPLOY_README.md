# Hexo 博客部署脚本使用说明

本目录包含三个便捷部署脚本,用于简化 Hexo 博客的构建和部署流程。

## 脚本列表

### 1. `deploy.ps1` / `deploy.bat` - 一键清理和本地部署
**功能**: 清理缓存 → 生成静态文件 → 启动本地服务器

**使用方法**:
- **PowerShell**: 右键点击 `deploy.ps1` → "使用 PowerShell 运行"
- **批处理**: 双击 `deploy.bat` 文件
- **命令行**: 
  ```powershell
  .\deploy.ps1
  ```
  或
  ```cmd
  deploy.bat
  ```

**适用场景**: 
- 日常开发和预览
- 快速启动本地服务器
- 确保看到最新更改

### 2. `build.ps1` - 快速清理和生成
**功能**: 清理缓存 → 生成静态文件 → 显示统计信息

**使用方法**:
- 右键点击 `build.ps1` → "使用 PowerShell 运行"
- 或命令行: `.\build.ps1`

**适用场景**:
- 仅需要构建静态文件
- 准备部署到生产环境前的构建
- 检查生成文件数量

### 3. `1.sh` - Linux/Git Bash 部署脚本
**功能**: 适用于 Linux 或 Git Bash 环境的部署脚本

**使用方法**:
```bash
bash 1.sh
```

## 脚本特性

✅ **UTF-8 编码支持** - 确保中文字符正确显示  
✅ **错误处理** - 每个步骤都有错误检查  
✅ **进度显示** - 清晰的步骤提示和完成状态  
✅ **文件统计** - 显示生成的文件数量  
✅ **颜色标记** - 使用颜色区分不同状态(成功/失败/进行中)

## 执行流程

### deploy.ps1 / deploy.bat
```
[1/4] 清理缓存和旧文件...
  └─ hexo clean
  
[2/4] 生成静态文件...
  └─ hexo generate
  
[3/4] 检查生成的文件...
  └─ 统计 public/ 目录文件数
  
[4/4] 启动本地服务器...
  └─ hexo server
  └─ 访问 http://localhost:4000
```

### build.ps1
```
[1/2] 清理缓存和旧文件...
  └─ hexo clean
  
[2/2] 生成静态文件...
  └─ hexo generate
  └─ 显示统计信息
```

## 常见问题

### Q: PowerShell 脚本无法运行,提示"无法加载,因为在此系统上禁止运行脚本"
**A**: 需要修改 PowerShell 执行策略
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Q: 中文显示为乱码
**A**: 脚本已自动设置 UTF-8 编码。如果仍有问题:
1. 确保 PowerShell 使用 UTF-8 编码
2. 检查终端字体是否支持中文
3. 运行 `chcp 65001` 设置代码页

### Q: 服务器启动后如何停止?
**A**: 按 `Ctrl + C` 停止服务器

### Q: 如何只生成不启动服务器?
**A**: 使用 `build.ps1` 脚本

### Q: 脚本在其他目录运行会怎样?
**A**: 脚本会检查 `package.json` 文件,如果不存在会提示错误并退出

## 手动执行命令

如果不想使用脚本,也可以手动执行以下命令:

```powershell
# 清理
hexo clean

# 生成
hexo generate

# 启动服务器
hexo server

# 或者一行执行
hexo clean && hexo generate && hexo server
```

## 生产环境部署

部署到生产环境时,建议使用:
```powershell
hexo clean
hexo generate
hexo deploy  # 需要配置 _config.yml 的 deploy 选项
```

## 技术说明

- **编码**: UTF-8 (确保中文正确显示)
- **PowerShell 版本**: 5.1+ (Windows 10/11 内置)
- **批处理版本**: 兼容 Windows 所有版本
- **错误处理**: 每个步骤都有错误检查和退出机制

## 更新日志

- **2025-01-11**: 创建初始脚本
  - 添加 deploy.ps1 (PowerShell 部署脚本)
  - 添加 deploy.bat (批处理部署脚本)
  - 添加 build.ps1 (PowerShell 构建脚本)
  - 确保 UTF-8 编码支持
  - 添加错误处理和进度显示
