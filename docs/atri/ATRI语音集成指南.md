# 🎙️ ATRI 原版语音集成指南

## 📋 目录
1. [获取语音文件](#获取语音文件)
2. [文件组织](#文件组织)
3. [代码集成](#代码集成)
4. [使用说明](#使用说明)

---

## 1. 获取语音文件

### 方法A：从Steam游戏中提取（推荐）

如果你在Steam上购买了《ATRI -My Dear Moments-》：

1. **找到游戏安装目录**：
   ```
   Steam\steamapps\common\ATRI -My Dear Moments-\
   ```

2. **语音文件位置**（通常在以下路径之一）：
   ```
   data/voice/
   voice/
   audio/voice/
   ```

3. **需要的文件类型**：
   - `.ogg` 格式
   - `.wav` 格式
   - 或打包在 `.pak` / `.xp3` 文件中（需要解包工具）

### 方法B：从其他平台获取

- **GOG版本**：类似Steam，在安装目录查找
- **日文原版**：`voice` 或 `data` 文件夹

### 解包工具（如需要）

如果语音打包在 `.pak` 或 `.xp3` 文件中：

```bash
# 对于 .xp3 文件（常见于VN游戏）
# 使用 GARbro 或 XP3Viewer
# 下载地址：https://github.com/morkt/GARbro

# 对于 .pak 文件
# 使用 UnrealPakTool 或 QuickBMS
```

---

## 2. 文件组织

### 推荐的目录结构

```
GINKA-Blog/
└── source/
    └── voice/
        └── atri/
            ├── welcome/
            │   ├── voice_001.ogg
            │   ├── voice_002.ogg
            │   └── voice_003.ogg
            ├── click/
            │   ├── voice_011.ogg
            │   ├── voice_012.ogg
            │   └── voice_013.ogg
            ├── hover/
            │   ├── voice_021.ogg
            │   └── voice_022.ogg
            ├── talk/
            │   ├── voice_031.ogg
            │   ├── voice_032.ogg
            │   ├── voice_033.ogg
            │   └── ...
            └── special/
                ├── photo.ogg
                └── home.ogg
```

### 语音文件命名规范

| 场景 | 文件名示例 | 说明 |
|------|-----------|------|
| 欢迎语 | `welcome_001.ogg` ~ `welcome_005.ogg` | 页面加载时 |
| 点击 | `click_001.ogg` ~ `click_006.ogg` | 点击ATRI时 |
| 悬停 | `hover_001.ogg` ~ `hover_003.ogg` | 鼠标悬停时 |
| 对话 | `talk_001.ogg` ~ `talk_020.ogg` | 点击对话按钮 |
| 截图 | `photo_001.ogg` | 点击截图按钮 |
| 回家 | `home_001.ogg` | 点击复位按钮 |

---

## 3. 代码集成

### 步骤1：准备语音配置

在 `source/_data/body-end.njk` 中添加语音配置：

```javascript
// ATRI 语音配置
const ATRI_VOICE_CONFIG = {
  enabled: true,
  basePath: '/voice/atri/',
  volume: 0.7, // 70% 音量
  
  // 语音文件映射
  voiceFiles: {
    welcome: [
      'welcome/voice_001.ogg',
      'welcome/voice_002.ogg',
      'welcome/voice_003.ogg',
      'welcome/voice_004.ogg',
      'welcome/voice_005.ogg'
    ],
    click: [
      'click/voice_001.ogg',
      'click/voice_002.ogg',
      'click/voice_003.ogg',
      'click/voice_004.ogg',
      'click/voice_005.ogg',
      'click/voice_006.ogg'
    ],
    hover: [
      'hover/voice_001.ogg',
      'hover/voice_002.ogg',
      'hover/voice_003.ogg'
    ],
    talk: [
      'talk/voice_001.ogg',
      'talk/voice_002.ogg',
      'talk/voice_003.ogg',
      'talk/voice_004.ogg',
      'talk/voice_005.ogg',
      'talk/voice_006.ogg',
      'talk/voice_007.ogg',
      'talk/voice_008.ogg',
      'talk/voice_009.ogg'
    ],
    photo: ['special/photo.ogg'],
    home: ['special/home.ogg']
  }
};

// 语音播放器类
class ATRIVoicePlayer {
  constructor(config) {
    this.config = config;
    this.currentAudio = null;
    this.volume = config.volume || 0.7;
  }
  
  // 播放指定类型的语音
  play(type) {
    if (!this.config.enabled) return;
    
    const voices = this.config.voiceFiles[type];
    if (!voices || voices.length === 0) return;
    
    // 停止当前播放的语音
    this.stop();
    
    // 随机选择一个语音文件
    const randomVoice = voices[Math.floor(Math.random() * voices.length)];
    const voiceUrl = this.config.basePath + randomVoice;
    
    // 创建音频对象
    this.currentAudio = new Audio(voiceUrl);
    this.currentAudio.volume = this.volume;
    
    // 播放
    this.currentAudio.play().catch(err => {
      console.log('[ATRI Voice] 播放失败:', err);
    });
    
    console.log('[ATRI Voice] 播放:', voiceUrl);
  }
  
  // 停止当前语音
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
  }
  
  // 设置音量
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
    localStorage.setItem('atri_voice_volume', this.volume.toString());
  }
  
  // 切换启用/禁用
  toggle() {
    this.config.enabled = !this.config.enabled;
    if (!this.config.enabled) {
      this.stop();
    }
    localStorage.setItem('atri_voice_enabled', this.config.enabled.toString());
    return this.config.enabled;
  }
}

// 初始化语音播放器
window.atriVoicePlayer = new ATRIVoicePlayer(ATRI_VOICE_CONFIG);
```

### 步骤2：集成到ATRI事件中

找到ATRI的事件处理函数，添加语音播放：

```javascript
// 在 showMessage 函数中添加语音
showMessage(text, type = 'talk') {
  // ... 原有代码 ...
  
  // 播放对应类型的语音
  if (window.atriVoicePlayer) {
    window.atriVoicePlayer.play(type);
  }
}

// 欢迎消息
setTimeout(() => {
  this.showMessage(welcomeMsg, 'welcome');
  // 已经在 showMessage 中播放语音了
}, 2000);

// 点击事件
canvas.addEventListener('click', () => {
  const msg = this.config.messages.click[Math.floor(Math.random() * this.config.messages.click.length)];
  this.showMessage(msg, 'click');
});

// 悬停事件
canvas.addEventListener('mouseenter', () => {
  if (Math.random() < 0.3) {
    const msg = this.config.messages.hover[Math.floor(Math.random() * this.config.messages.hover.length)];
    this.showMessage(msg, 'hover');
  }
});

// 对话按钮
const talkBtn = document.getElementById('atri-talk');
if (talkBtn) {
  talkBtn.addEventListener('click', () => {
    const msg = this.config.messages.talk[Math.floor(Math.random() * this.config.messages.talk.length)];
    this.showMessage(msg, 'talk');
  });
}

// 截图按钮
const photoBtn = document.getElementById('atri-photo');
if (photoBtn) {
  photoBtn.addEventListener('click', () => {
    window.atriVoicePlayer.play('photo');
    this.takeScreenshot();
  });
}

// 回家按钮
const homeBtn = document.getElementById('atri-home');
if (homeBtn) {
  homeBtn.addEventListener('click', () => {
    window.atriVoicePlayer.play('home');
    // ... 原有代码 ...
  });
}
```

### 步骤3：添加音量控制

修改音量按钮功能：

```javascript
// 音量按钮现在控制ATRI语音
const volumeBtn = document.getElementById('atri-volume');
if (volumeBtn) {
  let voiceVolume = parseFloat(localStorage.getItem('atri_voice_volume') || '0.7');
  
  const updateIcon = (vol) => {
    const icon = volumeBtn.querySelector('i');
    if (vol === 0) {
      icon.className = 'fa fa-volume-off';
    } else if (vol < 0.5) {
      icon.className = 'fa fa-volume-down';
    } else {
      icon.className = 'fa fa-volume-up';
    }
  };
  
  updateIcon(voiceVolume);
  
  volumeBtn.addEventListener('click', () => {
    // 循环: 70% -> 30% -> 0% -> 70%
    if (voiceVolume > 0.6) {
      voiceVolume = 0.3;
    } else if (voiceVolume > 0) {
      voiceVolume = 0;
    } else {
      voiceVolume = 0.7;
    }
    
    window.atriVoicePlayer.setVolume(voiceVolume);
    updateIcon(voiceVolume);
    
    // 测试播放
    if (voiceVolume > 0) {
      window.atriVoicePlayer.play('click');
    }
  });
}
```

---

## 4. 使用说明

### 放置语音文件

1. 将提取的语音文件按照上述目录结构放置
2. 确保文件格式为 `.ogg`（推荐）或 `.mp3`
3. 如果是 `.wav` 格式，建议转换为 `.ogg` 以减小文件大小

### 文件格式转换（如需要）

使用 FFmpeg 转换格式：

```bash
# 安装 FFmpeg
# Windows: https://ffmpeg.org/download.html
# 下载后添加到系统环境变量

# 批量转换 wav 到 ogg
cd source/voice/atri/welcome
for %%f in (*.wav) do ffmpeg -i "%%f" -c:a libvorbis -q:a 4 "%%~nf.ogg"

# 或转换为 mp3（兼容性更好但文件稍大）
for %%f in (*.wav) do ffmpeg -i "%%f" -c:a libmp3lame -b:a 128k "%%~nf.mp3"
```

### 文件大小优化

- 推荐比特率：96-128 kbps
- 采样率：44100 Hz 或 22050 Hz
- 单声道即可（语音不需要立体声）

```bash
# 优化现有 ogg 文件
ffmpeg -i input.ogg -c:a libvorbis -b:a 96k -ar 22050 -ac 1 output.ogg
```

### 测试语音

1. 生成博客：`hexo generate`
2. 启动服务器：`hexo server`
3. 打开浏览器开发者工具（F12）
4. 查看 Console 标签，应该看到 `[ATRI Voice] 播放: ...` 日志
5. 点击ATRI或各个按钮测试

### 调试

如果语音不播放，检查：

1. **文件路径是否正确**：
   ```javascript
   // 在浏览器控制台测试
   const audio = new Audio('/voice/atri/click/voice_001.ogg');
   audio.play();
   ```

2. **浏览器自动播放策略**：
   - 首次需要用户交互后才能播放
   - 点击页面任意位置后语音应正常工作

3. **文件格式兼容性**：
   - Chrome/Edge: 支持 ogg, mp3, wav
   - Firefox: 支持 ogg, mp3, wav
   - Safari: 支持 mp3, wav（不支持 ogg）

---

## 5. 高级功能

### 添加语音预加载

避免首次播放延迟：

```javascript
// 预加载常用语音
const preloadVoices = [
  'welcome/voice_001.ogg',
  'click/voice_001.ogg',
  'talk/voice_001.ogg'
];

preloadVoices.forEach(voice => {
  const audio = new Audio(ATRI_VOICE_CONFIG.basePath + voice);
  audio.preload = 'auto';
});
```

### 添加语音字幕同步

显示当前语音对应的文字：

```javascript
const VOICE_SUBTITLES = {
  'welcome/voice_001.ogg': '你好呀！我是 ATRI~',
  'welcome/voice_002.ogg': '欢迎来到这里！',
  'click/voice_001.ogg': '呀！不要戳我~',
  // ... 更多映射
};

play(type) {
  // ... 原有代码 ...
  
  // 显示字幕
  const subtitle = VOICE_SUBTITLES[randomVoice];
  if (subtitle && window.ATRI) {
    window.ATRI.showMessage(subtitle);
  }
}
```

### 添加语音开关按钮

在控制面板添加静音按钮：

```html
<button class="atri-control-btn" id="atri-voice-toggle" title="语音开关">
  <i class="fa fa-microphone" style="color: rgba(91, 155, 213, 0.9);"></i>
</button>
```

```javascript
const voiceToggleBtn = document.getElementById('atri-voice-toggle');
if (voiceToggleBtn) {
  voiceToggleBtn.addEventListener('click', () => {
    const enabled = window.atriVoicePlayer.toggle();
    const icon = voiceToggleBtn.querySelector('i');
    icon.className = enabled ? 'fa fa-microphone' : 'fa fa-microphone-slash';
  });
}
```

---

## 📝 快速检查清单

- [ ] 已合法获取游戏语音文件
- [ ] 文件已放置在 `source/voice/atri/` 目录
- [ ] 文件格式已转换为 `.ogg` 或 `.mp3`
- [ ] 已添加语音配置代码
- [ ] 已集成到事件处理函数
- [ ] 已测试播放功能
- [ ] 浏览器控制台无错误

---

## ❓ 常见问题

**Q: 语音文件太大怎么办？**
A: 使用FFmpeg压缩，降低比特率到96kbps，转为单声道，降低采样率到22050Hz。

**Q: Safari浏览器不播放？**
A: Safari不支持ogg格式，将文件转换为mp3格式。

**Q: 首次不播放？**
A: 浏览器自动播放限制，用户需要先与页面交互（点击任意位置）。

**Q: 如何减少HTTP请求？**
A: 可以将多个小语音合并成一个文件，使用Web Audio API切片播放。

**Q: 可以使用其他角色的语音吗？**
A: 可以，只需替换语音文件并调整配置即可。

---

## 🎯 后续优化建议

1. **音频精灵（Audio Sprite）**：将多个语音合并为一个文件
2. **懒加载**：仅在需要时加载语音
3. **Service Worker缓存**：加快重复访问速度
4. **音量淡入淡出**：更自然的播放效果
5. **语音队列**：避免语音重叠

---

**需要帮助？** 检查浏览器控制台的 `[ATRI Voice]` 日志输出。
