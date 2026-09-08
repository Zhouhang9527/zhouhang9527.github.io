# ATRI 语音系统部署指南

## ✅ 已完成的工作

### 1. 语音文件处理
- ✅ 从 2164 个原始文件中筛选出 1555 个适合看板娘的语音
- ✅ 已分类：欢迎22条、点击56条、悬停184条、对话447条、特殊889条
- ✅ 所有文件已复制到 `d:\GINKA-Blog\source\voice\atri\`

### 2. 代码集成
- ✅ 修改 `body-end.njk` 支持双语显示（繁体中文 + 日文）
- ✅ 添加语音播放功能
- ✅ 字幕显示：上方繁体中文（蓝色），下方日文（灰色斜体）

### 3. 配置文件
- ✅ 生成 `voice-config.json` 包含所有语音元数据
- ✅ 准备好上传到 GitHub 的脚本和 README

## 📋 下一步操作

### 方案1：上传到 GitHub（推荐）

#### 步骤1：创建 GitHub 仓库

1. 访问 https://github.com/new
2. 填写信息：
   - Repository name: `atri-voice-data`
   - Description: `ATRI voice data for Hexo blog mascot`
   - 选择 **Public** （公开仓库才能使用 CDN）
   - 不要勾选 "Initialize this repository with a README"
3. 点击 "Create repository"

#### 步骤2：运行上传脚本

打开 PowerShell，运行：

\`\`\`powershell
cd d:\GINKA-Blog
.\tools\deploy\upload-to-github.ps1
# 输入你的 GitHub 用户名（例如：YourUsername）
\`\`\`

脚本会自动：
- 创建临时仓库目录
- 复制所有语音文件
- 生成 README.md
- 创建 Git 提交

#### 步骤3：推送到 GitHub

\`\`\`bash
cd d:\temp-atri-repo
git branch -M main
git remote add origin https://github.com/你的用户名/atri-voice-data.git
git push -u origin main
\`\`\`

如果使用 SSH：
\`\`\`bash
git remote add origin git@github.com:你的用户名/atri-voice-data.git
git push -u origin main
\`\`\`

#### 步骤4：更新博客配置

修改 `body-end.njk` 中的语音配置路径：

\`\`\`javascript
async initVoicePlayer() {
  const response = await fetch('https://cdn.jsdelivr.net/gh/你的用户名/atri-voice-data@main/voice-config.json');
  // ...
}
\`\`\`

并修改配置文件中的 basePath：
\`\`\`json
{
  "basePath": "https://cdn.jsdelivr.net/gh/你的用户名/atri-voice-data@main/voice/"
}
\`\`\`

### 方案2：直接使用本地文件（测试用）

如果暂时不想上传 GitHub，可以先在本地测试：

1. 确保语音文件在 `source/voice/atri/`
2. 确保 `voice-config.json` 在 `source/` 目录
3. basePath 设置为 `/voice/atri/`
4. 运行 `hexo generate` 重新生成
5. 访问 http://localhost:4000 测试

## 🎨 双语字幕显示效果

点击 ATRI 时，消息框会显示：

\`\`\`
你好呀！我是 ATRI~  (蓝色，14px，加粗)
こんにちは！私はアトリです  (灰色，12px，斜体)
\`\`\`

## 📝 TODO：添加日文原文

由于原始台词文件只有中文翻译，没有日文原文，需要：

1. **选项A**：手动添加日文原文
   - 编辑 `voice-config.json`
   - 为每条台词添加 `"ja"` 字段

2. **选项B**：使用游戏原始脚本
   - 从游戏安装目录提取脚本文件
   - 匹配语音文件名和对应的日文台词
   - 自动生成包含日文的配置文件

3. **选项C**：简化版本（当前状态）
   - 保持只显示中文
   - 播放语音时中文和日语音不完全对应

## 🚀 快速部署命令（GitHub）

\`\`\`bash
# 1. 创建 GitHub 仓库后，复制仓库 URL

# 2. 运行（替换你的用户名）
cd d:\temp-atri-repo  # 上传脚本创建的目录
git branch -M main
git remote add origin https://github.com/你的用户名/atri-voice-data.git
git push -u origin main

# 3. 等待上传完成（1555个文件，可能需要几分钟）

# 4. 更新博客配置，重新生成
cd d:\GINKA-Blog
hexo clean
hexo generate
hexo deploy
\`\`\`

## 📊 文件大小统计

- 语音文件总数：1555 个
- 配置文件：voice-config.json (~200KB)
- 预计仓库总大小：~50-100MB（取决于 opus 文件压缩率）

## ⚠️ 注意事项

1. GitHub 单文件限制 100MB，opus 文件通常小于 1MB，不会超限
2. jsDelivr CDN 每月流量限制，如访问量大建议使用其他 CDN
3. 确保配置中的路径使用 `/` 而不是 `\`
4. 测试语音时需要用户交互（点击）才能自动播放

## 🎯 当前状态

- ✅ 语音文件：已准备好
- ✅ 配置文件：已生成
- ✅ 代码集成：已完成
- ⏳ GitHub 上传：等待用户操作
- ⏳ 日文台词：需要额外提取

**现在可以直接测试本地版本，或按照上述步骤上传到 GitHub！**
