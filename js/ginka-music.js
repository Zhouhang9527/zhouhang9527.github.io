(function() {
  window.GINKA_BOOT_MUSIC = function() {
    if (window.__ginkaMusicBooted) return;
    window.__ginkaMusicBooted = true;

    const musicRoot = document.getElementById('music-player');
    if (musicRoot) {
      musicRoot.setAttribute('data-ginka-music-state', 'ready');
    }

    const DEBUG = false;
    const DEFAULT_MUSIC_VOLUME = 0.88;
    const MIN_AUDIBLE_VOLUME = 0.1;
    const UNMUTE_FALLBACK_VOLUME = 0.82;
    const PLAY_MODES = ['list', 'single', 'shuffle'];
    const PLAY_MODE_META = {
      list: { label: '按列表', icon: 'fa-list-ol' },
      single: { label: '单曲循环', icon: 'fa-repeat' },
      shuffle: { label: '随机播放', icon: 'fa-random' }
    };
    const PRE_PLAY_LYRIC_TEXT = '我希望平静 然后幸福';
    const AUTO_GAIN_TARGET_RMS = 0.126;
    const AUTO_GAIN_MIN = 0.62;
    const AUTO_GAIN_MAX = 1.45;
    const AUTO_GAIN_STRENGTH = 1.22;
    const MUSIC_VOICE_COOLDOWN_MS = 5000;
    const AUTO_GAIN_SAMPLE_MS = 4600;
    const AUTO_GAIN_MIN_SAMPLES = 36;
    const STORAGE = {
      index: 'music_current_index',
      volume: 'music_volume',
      playing: 'music_playing',
      currentTime: 'music_currentTime',
      hidden: 'music_hidden',
      lastVolume: 'music_last_volume',
      playlistExpanded: 'music_playlist_expanded',
      playMode: 'music_play_mode'
    };
  
    const siteRoot = (window.CONFIG && window.CONFIG.root) ? window.CONFIG.root : '/';
    const assetUrl = (path) => {
      const base = siteRoot.endsWith('/') ? siteRoot : `${siteRoot}/`;
      return base + String(path || '').replace(/^\//, '');
    };
  
    const musicList = [
      {
        title: '光放て！',
        artist: '柳麻美',
        album: 'ATRI -My Dear Moments- (Original Soundtrack)',
        src: assetUrl('music/ginka-op-hikari-hanate.mp3'),
        cover: assetUrl('music/ginka-op-hikari-hanate.webp'),
        lyricsSrc: assetUrl('music/ginka-op-hikari-hanate.lrc')
      },
      {
        title: '夢浮桥',
        artist: '青木阳菜',
        album: 'GINKA ED',
        src: assetUrl('music/ginka-ed-yumeukihashi.mp3'),
        cover: assetUrl('music/ginka-ed-yumeukihashi.jpg'),
        lyricsSrc: assetUrl('music/ginka-ed-yumeukihashi.lrc')
      },
      {
        title: 'AIR',
        artist: 'Lia',
        album: 'AIR OST',
        src: assetUrl('music/air.mp3'),
        cover: assetUrl('music/air.jpg'),
        lyricsSrc: assetUrl('music/air.lrc')
      },
      {
        title: 'unhappy',
        artist: 's0rrow',
        album: 'Single',
        src: encodeURI(assetUrl('music/s0rrow - unhappy.mp3')),
        cover: assetUrl('music/unhappy.jpg'),
        lyricsSrc: encodeURI(assetUrl('music/s0rrow - unhappy.lrc')),
        translations: {
          'Every day we talk a little less': '每天我们说的话都在逐渐减少',
          'It looks like you are losing interest': '看起来你正在慢慢失去兴趣',
          'These feelings I have for you': '这些我对你的感情',
          'But you don\'t feel the same': '可你却没有同样的感觉',
          'So I\'ll pack all my things': '所以我会收拾好我的一切',
          'And go run far away': '然后逃到很远的地方',
          'You are, you are very pretty': '你啊 你真的很漂亮',
          'I\'m so very ugly': '而我是那么的丑陋',
          'Will you even love me, anymore (love me)': '你会再爱我吗 哪怕一点点（爱我）',
          'You can, you can live without me': '你可以 你可以没有我的生活着',
          'That makes me unhappy': '那让我感到不开心',
          'I should get a piercing through my heart': '我应该将我的心也一并刺穿',
          'What do you even want me to be': '你究竟想要我成为什么样子',
          'You never ever pay attention to me': '你从来从来都不愿多看我一眼',
          'So I\'ll close my blinds in misery': '所以我拉上窗帘沉进悲伤里',
          'And I\'ll wait for you for a couple of weeks': '然后我会一直等着你好几个星期'
        }
      }
    ];
    const DEFAULT_TRACK_INDEX = (() => {
      const idx = musicList.findIndex((item) => item && String(item.title || '').toLowerCase() === 'unhappy');
      return idx >= 0 ? idx : 0;
    })();
  
    const audio = document.getElementById('bg-music');
    const toggleBtn = document.getElementById('music-toggle');
    const nextBtn = document.getElementById('music-next');
    const icon = document.getElementById('music-icon');
    const progressBar = document.getElementById('music-progress-bar');
    const progressContainer = document.getElementById('music-progress');
    const musicInfo = document.getElementById('music-info');
    const timeDisplay = document.getElementById('music-time');
    const volumeToggle = document.getElementById('music-volume-toggle');
    const volumeSlider = document.getElementById('music-volume-slider');
    const volumeIcon = document.getElementById('volume-icon');
    const hideToggle = document.getElementById('music-hide-toggle');
    const playModeToggle = document.getElementById('music-play-mode-toggle');
    const playModeIcon = document.getElementById('music-play-mode-icon');
    const playlistToggle = document.getElementById('music-playlist-toggle');
    const playlistIcon = document.getElementById('playlist-icon');
    const playlistPanel = document.getElementById('music-playlist-panel');
    const playlistItems = document.getElementById('music-playlist-items');
    const playlistCount = document.getElementById('music-playlist-count');
    const playerMain = document.getElementById('music-player-main');
    const miniBtn = document.getElementById('music-mini-btn');
    const musicTitle = document.getElementById('music-title');
    const musicCover = document.querySelector('#music-cover img');
    const musicArtist = document.querySelector('#music-info > div:nth-child(2)');
    const lyricsPanel = document.getElementById('music-lyrics-panel');
    const lyricsTrack = document.getElementById('music-lyrics-track');
    const lyricsViewport = document.getElementById('music-lyrics-viewport');
    const lyricsList = document.getElementById('music-lyrics-list');
  
    if (!audio || !toggleBtn || !icon || !timeDisplay || !progressBar || !progressContainer || !playerMain || !miniBtn) {
      console.error('[Music] 音乐播放器关键节点缺失');
      return;
    }
  
    const log = (...args) => { if (DEBUG) console.log('[Music]', ...args); };
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const normalizeIndex = (value) => {
      const index = Number.isFinite(value) ? Math.floor(value) : 0;
      if (index < 0) return 0;
      if (index >= musicList.length) return 0;
      return index;
    };
    const normalizePlayMode = (value) => {
      const mode = String(value || '').toLowerCase();
      return PLAY_MODES.indexOf(mode) >= 0 ? mode : 'list';
    };
    const resolveTrackCacheKey = (index) => {
      const track = musicList[normalizeIndex(index)];
      return track && track.src ? String(track.src) : String(normalizeIndex(index));
    };
    const autoGainCache = new Map();
    let masterVolume = DEFAULT_MUSIC_VOLUME;
    let autoGainFactor = 1;
    let currentPlayMode = 'list';
    let autoGainCtx = null;
    let autoGainSourceNode = null;
    let autoGainAnalyser = null;
    let autoGainFrame = 0;
    let autoGainToken = 0;
    let hasStartedPlayback = false;
    const MUSIC_VOICE_PROFILE = {
      default: {
        play: ['talk', 'welcome'],
        pause: ['talk', 'click'],
        switch: ['click', 'talk']
      },
      '光放て！': {
        play: ['happy', 'morning', 'click'],
        pause: ['click', 'talk'],
        switch: ['happy', 'click', 'morning']
      },
      '夢浮桥': {
        play: ['welcome', 'morning', 'talk'],
        pause: ['talk', 'welcome'],
        switch: ['welcome', 'morning', 'click']
      },
      AIR: {
        play: ['night', 'welcome', 'talk'],
        pause: ['night', 'talk'],
        switch: ['night', 'welcome', 'click']
      },
      unhappy: {
        play: ['night', 'angry', 'talk'],
        pause: ['night', 'talk'],
        switch: ['angry', 'night', 'click']
      }
    };
  
    function consumeAtriVoiceCooldown(minGapMs) {
      const gap = Math.max(MUSIC_VOICE_COOLDOWN_MS, Number(minGapMs) || 0);
      const key = '__ginkaAtriUiVoiceCooldownAt';
      const now = Date.now();
      const last = Number(window[key] || 0);
      if (now - last < gap) return false;
      window[key] = now;
      return true;
    }
  
    function getTrackTitleByIndex(index) {
      const track = musicList[normalizeIndex(index)];
      return track && track.title ? String(track.title) : '';
    }
  
    function getMusicVoicePlan(action, trackTitle) {
      const safeAction = action === 'pause' || action === 'switch' ? action : 'play';
      const title = String(trackTitle || '').trim();
      const profile = MUSIC_VOICE_PROFILE[title] || MUSIC_VOICE_PROFILE.default;
      const categories = Array.isArray(profile[safeAction]) && profile[safeAction].length
        ? profile[safeAction]
        : MUSIC_VOICE_PROFILE.default[safeAction];
      return categories.map((category) => ({
        category,
        options: {
          duration: safeAction === 'switch' ? 2600 : 2200,
          disableMotion: true
        }
      }));
    }
  
    function playAtriVoicePlan(plan) {
      const atri = window.ATRI;
      if (!atri || !Array.isArray(plan) || !plan.length) return false;
  
      if (typeof atri.playVoiceByPriority === 'function') {
        try {
          return !!atri.playVoiceByPriority(plan);
        } catch (_) {}
      }
  
      if (typeof atri.playVoice !== 'function') return false;
      for (const item of plan) {
        if (!item || !item.category) continue;
        try {
          const ok = atri.playVoice(item.category, item.options || {});
          if (ok) return true;
        } catch (_) {}
      }
      return false;
    }
  
    function announceMusicVoice(action, options) {
      const opt = options || {};
      if (opt.silent) return false;
      if (!consumeAtriVoiceCooldown(opt.minGapMs)) return false;
  
      const trackTitle = opt.trackTitle || getTrackTitleByIndex(currentMusicIndex);
      const plan = getMusicVoicePlan(action, trackTitle);
      const spoken = playAtriVoicePlan(plan);
      return spoken;
    }
  
    function getStoredNumber(key, fallback) {
      const value = Number(localStorage.getItem(key));
      return Number.isFinite(value) ? value : fallback;
    }
  
    function formatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${String(secs).padStart(2, '0')}`;
    }
  
    function updatePlayIcon(isPlaying) {
      icon.classList.remove('fa-play', 'fa-pause', 'fa-circle-notch', 'fa-spin');
      if (isPlaying) icon.classList.add('fa-pause');
      else icon.classList.add('fa-play');
    }
  
    function setLoadingIcon() {
      icon.classList.remove('fa-play', 'fa-pause');
      icon.classList.add('fa-circle-notch', 'fa-spin');
    }
  
    function updateVolumeIcon(volume) {
      if (!volumeIcon) return;
      volumeIcon.classList.remove('fa-volume-up', 'fa-volume-down', 'fa-volume-off');
      if (volume <= 0) volumeIcon.classList.add('fa-volume-off');
      else if (volume < 0.5) volumeIcon.classList.add('fa-volume-down');
      else volumeIcon.classList.add('fa-volume-up');
    }
  
    function syncVolumeSlider(volume) {
      if (!volumeSlider) return;
      const safe = clamp(Number(volume), 0, 1);
      volumeSlider.value = String(Math.round(safe * 100));
    }
  
    function updatePlayModeUI(mode) {
      if (!playModeToggle || !playModeIcon) return;
      const safeMode = normalizePlayMode(mode || currentPlayMode);
      const meta = PLAY_MODE_META[safeMode] || PLAY_MODE_META.list;
      playModeIcon.className = `fa ${meta.icon}`;
      playModeToggle.title = `播放模式：${meta.label}`;
      playModeToggle.setAttribute('aria-label', `播放模式：${meta.label}`);
      playModeToggle.classList.toggle('is-active', safeMode !== 'list');
    }
  
    function applyEffectiveVolume(persist) {
      const effective = clamp(masterVolume * autoGainFactor, 0, 1);
      audio.volume = effective;
      updateVolumeIcon(effective);
      syncVolumeSlider(masterVolume);
      if (volumeToggle) {
        volumeToggle.title = `音量 ${Math.round(masterVolume * 100)}%（自动补偿 ${Math.round(autoGainFactor * 100)}%）`;
      }
  
      if (persist !== false) {
        localStorage.setItem(STORAGE.volume, String(masterVolume));
      }
      if (masterVolume > 0.01) {
        localStorage.setItem(STORAGE.lastVolume, String(masterVolume));
      }
    }
  
    function setMasterVolume(volume, persist) {
      masterVolume = clamp(Number(volume), 0, 1);
      applyEffectiveVolume(persist);
    }
  
    function initAutoGainAnalyser() {
      if (autoGainAnalyser) {
        if (autoGainCtx && autoGainCtx.state === 'suspended') {
          autoGainCtx.resume().catch(() => {});
        }
        return true;
      }
  
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx || !audio) return false;
  
      try {
        autoGainCtx = new Ctx();
        autoGainSourceNode = autoGainCtx.createMediaElementSource(audio);
        autoGainAnalyser = autoGainCtx.createAnalyser();
        autoGainAnalyser.fftSize = 2048;
        autoGainAnalyser.smoothingTimeConstant = 0.65;
        autoGainSourceNode.connect(autoGainAnalyser);
        autoGainAnalyser.connect(autoGainCtx.destination);
        if (autoGainCtx.state === 'suspended') {
          autoGainCtx.resume().catch(() => {});
        }
        return true;
      } catch (error) {
        log('自动音量分析器初始化失败:', error && error.message ? error.message : error);
        autoGainCtx = null;
        autoGainSourceNode = null;
        autoGainAnalyser = null;
        return false;
      }
    }
  
    function stopAutoGainSampler() {
      autoGainToken += 1;
      if (autoGainFrame) {
        cancelAnimationFrame(autoGainFrame);
        autoGainFrame = 0;
      }
    }
  
    function applyAutoGainForTrack(trackIndex) {
      const cacheKey = resolveTrackCacheKey(trackIndex);
      if (autoGainCache.has(cacheKey)) {
        autoGainFactor = autoGainCache.get(cacheKey);
        applyEffectiveVolume(false);
        return;
      }
  
      autoGainFactor = 1;
      applyEffectiveVolume(false);
  
      if (!initAutoGainAnalyser() || !autoGainAnalyser) return;
      if (autoGainCtx && autoGainCtx.state === 'suspended') {
        autoGainCtx.resume().catch(() => {});
      }
  
      const token = ++autoGainToken;
      const buffer = new Float32Array(autoGainAnalyser.fftSize);
      const startedAt = performance.now();
      let sampleCount = 0;
      let rmsSum = 0;
  
      const sample = () => {
        if (token !== autoGainToken) return;
        if (currentMusicIndex !== normalizeIndex(trackIndex)) return;
        if (!autoGainAnalyser || !audio || audio.paused || audio.ended) {
          autoGainFrame = requestAnimationFrame(sample);
          return;
        }
  
        autoGainAnalyser.getFloatTimeDomainData(buffer);
        let squareSum = 0;
        for (let i = 0; i < buffer.length; i += 1) {
          squareSum += buffer[i] * buffer[i];
        }
  
        const rms = Math.sqrt(squareSum / Math.max(1, buffer.length));
        if (rms > 0.0012) {
          rmsSum += rms;
          sampleCount += 1;
        }
  
        const elapsed = performance.now() - startedAt;
        if (sampleCount < AUTO_GAIN_MIN_SAMPLES && elapsed < AUTO_GAIN_SAMPLE_MS) {
          autoGainFrame = requestAnimationFrame(sample);
          return;
        }
  
        const avgRms = sampleCount ? (rmsSum / sampleCount) : 0;
        const targetGain = avgRms > 0.0008
          ? (() => {
            const baseGain = AUTO_GAIN_TARGET_RMS / avgRms;
            const strengthened = 1 + (baseGain - 1) * AUTO_GAIN_STRENGTH;
            return clamp(strengthened, AUTO_GAIN_MIN, AUTO_GAIN_MAX);
          })()
          : 1;
  
        autoGainCache.set(cacheKey, targetGain);
        autoGainFactor = targetGain;
        applyEffectiveVolume(false);
        autoGainFrame = 0;
        log('自动音量补偿:', cacheKey, 'avgRms=', avgRms.toFixed(5), 'gain=', targetGain.toFixed(3));
      };
  
      if (autoGainFrame) {
        cancelAnimationFrame(autoGainFrame);
        autoGainFrame = 0;
      }
      autoGainFrame = requestAnimationFrame(sample);
    }
  
    function cyclePlayMode() {
      const currentIndex = PLAY_MODES.indexOf(currentPlayMode);
      const nextMode = PLAY_MODES[(currentIndex + 1) % PLAY_MODES.length];
      currentPlayMode = nextMode;
      localStorage.setItem(STORAGE.playMode, nextMode);
      updatePlayModeUI(nextMode);
    }
  
    function setPlaylistExpanded(expanded, persist) {
      if (!playlistPanel || !playlistToggle) return;
      const open = !!expanded;
      playlistPanel.classList.toggle('is-open', open);
      playlistPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
      playlistToggle.classList.toggle('is-active', open);
      if (playlistIcon) {
        playlistIcon.classList.remove('fa-list-ul', 'fa-times');
        playlistIcon.classList.add(open ? 'fa-times' : 'fa-list-ul');
      }
      if (persist !== false) {
        localStorage.setItem(STORAGE.playlistExpanded, open ? 'true' : 'false');
      }
    }
  
    function updatePlaylistActive() {
      if (!playlistItems) return;
      const nodes = playlistItems.querySelectorAll('.music-playlist-item');
      nodes.forEach((node) => {
        const itemIndex = Number(node.getAttribute('data-index'));
        node.classList.toggle('is-active', itemIndex === currentMusicIndex);
      });
    }
  
    function setHidden(hidden, persist) {
      if (hidden) {
        playerMain.style.display = 'none';
        miniBtn.style.display = 'flex';
        setPlaylistExpanded(false, false);
      } else {
        playerMain.style.display = 'flex';
        miniBtn.style.display = 'none';
      }
      if (lyricsPanel) {
        lyricsPanel.classList.remove('is-hidden');
        lyricsPanel.setAttribute('aria-hidden', 'false');
      }
      if (persist !== false) {
        localStorage.setItem(STORAGE.hidden, hidden ? 'true' : 'false');
      }
    }
  
    function updateProgressUI() {
      const current = Number(audio.currentTime) || 0;
      const duration = Number(audio.duration) || 0;
      const progress = duration > 0 ? (current / duration) * 100 : 0;
      progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
      timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    }
  
    function persistPlaybackState(force) {
      const currentSecond = Math.floor(Number(audio.currentTime) || 0);
      if (!force && currentSecond === persistPlaybackState.lastSavedSecond) return;
      persistPlaybackState.lastSavedSecond = currentSecond;
      if (currentSecond > 0) {
        localStorage.setItem(STORAGE.currentTime, String(currentSecond));
      }
    }
    persistPlaybackState.lastSavedSecond = -1;
  
    function loadMusic(index, options) {
      const opt = options || {};
      const normalized = normalizeIndex(index);
      const music = musicList[normalized];
      if (!music) return;
  
      const keepTime = !!opt.keepTime;
      const targetTime = keepTime ? Math.max(0, getStoredNumber(STORAGE.currentTime, 0)) : 0;
  
      musicTitle.textContent = music.title;
      if (musicArtist) {
        musicArtist.textContent = `${music.artist} / ${music.album}`;
      }
      if (musicCover) {
        musicCover.src = music.cover;
        musicCover.alt = `${music.title} - ${music.artist}`;
        musicCover.onerror = function () {
          this.style.objectFit = 'contain';
          this.style.padding = '6px';
        };
      }
  
      currentMusicIndex = normalized;
      localStorage.setItem(STORAGE.index, String(normalized));
  
      resetLyrics();
      audio.src = music.src;
      audio.preload = 'metadata';
      audio.load();
      prepareLyricsForTrack(music, normalized);
      stopAutoGainSampler();
      autoGainFactor = 1;
      applyEffectiveVolume(false);
  
      if (keepTime && targetTime > 0) {
        audio.addEventListener('loadedmetadata', function restoreTime() {
          const duration = Number(audio.duration) || 0;
          if (duration > 1) {
            audio.currentTime = Math.min(targetTime, Math.max(0, duration - 0.4));
          }
        }, { once: true });
      } else {
        localStorage.setItem(STORAGE.currentTime, '0');
      }
  
      updateProgressUI();
      updatePlaylistActive();
    }
  
    function renderPlaylist() {
      if (!playlistItems) return;
      playlistItems.innerHTML = '';
      musicList.forEach((music, index) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'music-playlist-item';
        item.setAttribute('data-index', String(index));
        item.innerHTML = `<span class="music-playlist-title">${music.title}</span><span class="music-playlist-meta">${music.artist}</span>`;
  
        item.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
  
        const sameTrack = index === currentMusicIndex;
        if (!sameTrack) {
          loadMusic(index, { keepTime: false });
          announceMusicVoice('switch', {
            trackTitle: getTrackTitleByIndex(index),
            minGapMs: 480
          });
        }
  
          setPlaylistExpanded(false);
          setLoadingIcon();
          attemptPlay(sameTrack ? 'playlist-resume' : 'playlist-select');
        });
  
        playlistItems.appendChild(item);
      });
      if (playlistCount) {
        playlistCount.textContent = `${musicList.length} 首`;
      }
      updatePlaylistActive();
    }
  
    async function attemptPlay(reason) {
      try {
        await audio.play();
        hasStartedPlayback = true;
        ensureLyricLinesRendered();
        updatePlayIcon(true);
        localStorage.setItem(STORAGE.playing, 'true');
        if (reason === 'toggle' || reason === 'playlist-resume' || reason === 'gesture-resume' || reason === 'restore') {
          announceMusicVoice('play', { minGapMs: 520 });
        }
        log('播放成功:', reason);
        return true;
      } catch (error) {
        updatePlayIcon(false);
        localStorage.setItem(STORAGE.playing, 'false');
        if (musicTitle) {
          musicTitle.textContent = musicList[currentMusicIndex] ? musicList[currentMusicIndex].title : '点击播放';
        }
        log('播放失败:', reason, error && error.message ? error.message : error);
        return false;
      }
    }
  
    function pausePlayback(reason) {
      audio.pause();
      updatePlayIcon(false);
      localStorage.setItem(STORAGE.playing, 'false');
      announceMusicVoice('pause', { minGapMs: 420 });
      log('暂停:', reason);
    }
  
    function togglePlay() {
      if (audio.paused) {
        setLoadingIcon();
        attemptPlay('toggle');
      } else {
        pausePlayback('toggle');
      }
    }
  
    function getRandomTrackIndex(excludeIndex) {
      if (musicList.length <= 1) return normalizeIndex(excludeIndex);
      let picked = normalizeIndex(excludeIndex);
      let guard = 0;
      while (picked === normalizeIndex(excludeIndex) && guard < 12) {
        picked = Math.floor(Math.random() * musicList.length);
        guard += 1;
      }
      return normalizeIndex(picked);
    }
  
    function resolveNextTrackIndex(options) {
      const opt = options || {};
      if (Number.isFinite(opt.forceIndex)) {
        return normalizeIndex(opt.forceIndex);
      }
      if (opt.ignoreMode) {
        return (currentMusicIndex + 1) % musicList.length;
      }
  
      if (currentPlayMode === 'single' && opt.fromEnded) {
        return currentMusicIndex;
      }
      if (currentPlayMode === 'shuffle') {
        return getRandomTrackIndex(currentMusicIndex);
      }
      return (currentMusicIndex + 1) % musicList.length;
    }
  
    function nextMusic(options) {
      const opt = options || {};
      const shouldAutoPlay = opt.autoplay !== false;
      const targetIndex = resolveNextTrackIndex(opt);
      loadMusic(targetIndex, { keepTime: false });
      if (opt.userAction) {
        announceMusicVoice('switch', {
          trackTitle: getTrackTitleByIndex(targetIndex),
          minGapMs: 480
        });
      }
      if (shouldAutoPlay) {
        setLoadingIcon();
        attemptPlay(opt.reason || 'next');
      }
    }
  
    function toggleVolume() {
      if (masterVolume > 0.01) {
        localStorage.setItem(STORAGE.lastVolume, String(masterVolume));
        setMasterVolume(0, true);
        return;
      }
  
      const lastVolume = clamp(getStoredNumber(STORAGE.lastVolume, UNMUTE_FALLBACK_VOLUME), MIN_AUDIBLE_VOLUME, 1);
      setMasterVolume(lastVolume, true);
    }
  
    function nudgeVolume(delta) {
      const step = Number(delta) || 0;
      setMasterVolume(masterVolume + step, true);
    }
  
    function seekByClientX(clientX) {
      const rect = progressContainer.getBoundingClientRect();
      const percent = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      const duration = Number(audio.duration) || 0;
      if (duration > 0) {
        audio.currentTime = percent * duration;
        updateProgressUI();
        persistPlaybackState(true);
      }
    }
  
    function isInputLike(target) {
      if (!target) return false;
      const tag = String(target.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      return !!target.isContentEditable;
    }
  
    const lyricsCache = new Map();
    let lyricsLoadToken = 0;
    let currentLyricIndex = -1;
    let currentLyricLines = [];
  
    function setLyricTrackLabel(track) {
      if (!lyricsTrack) return;
      if (!track) {
        lyricsTrack.textContent = '歌词';
        return;
      }
      lyricsTrack.textContent = `${track.title} · ${track.artist}`;
    }
  
    function setLyricLoadingState(text) {
      if (!lyricsList) return;
      lyricsList.innerHTML = '';
      const line = document.createElement('div');
      line.className = 'music-lyric-line is-active';
      line.textContent = text || '歌词加载中...';
      lyricsList.appendChild(line);
      lyricsList.style.transform = 'translateY(0)';
    }
  
    function normalizeLyricKey(text) {
      return String(text || '')
        .toLowerCase()
        .replace(/[’]/g, '\'')
        .replace(/\s+/g, ' ')
        .trim();
    }
  
    function resolveLyricTranslation(track, text) {
      if (!track || !track.translations || typeof track.translations !== 'object') return '';
      var raw = String(text || '').trim();
      if (!raw) return '';
  
      if (typeof track.translations[raw] === 'string') {
        return track.translations[raw].trim();
      }
  
      var normalized = normalizeLyricKey(raw);
      for (var key in track.translations) {
        if (!Object.prototype.hasOwnProperty.call(track.translations, key)) continue;
        if (normalizeLyricKey(key) === normalized) {
          return String(track.translations[key] || '').trim();
        }
      }
      return '';
    }
  
    function normalizeLyricLines(lines, track) {
      const normalized = Array.isArray(lines)
        ? lines
          .map((line) => {
            const time = Number(line && line.time);
            const text = line && line.text ? String(line.text).trim() : '';
            if (!Number.isFinite(time) || time < 0 || !text) return null;
            const translation = line && line.translation
              ? String(line.translation).trim()
              : resolveLyricTranslation(track, text);
            return { time, text, translation };
          })
          .filter(Boolean)
          .sort((a, b) => a.time - b.time)
        : [];
  
      if (!normalized.length && track) {
        normalized.push({
          time: 0,
          text: `${track.title}${track.artist ? ` - ${track.artist}` : ''}`
        });
      }
      return normalized;
    }
  
    function parseLrc(rawText) {
      if (!rawText) return [];
      const parsed = [];
      const rows = String(rawText).split(/\r?\n/);
  
      rows.forEach((row) => {
        if (!row) return;
        const matches = [...row.matchAll(/\[(\d{1,2}):(\d{1,2}(?:\.\d{1,3})?)\]/g)];
        if (!matches.length) return;
        const text = row.replace(/\[(\d{1,2}):(\d{1,2}(?:\.\d{1,3})?)\]/g, '').trim();
        if (!text) return;
  
        matches.forEach((match) => {
          const mins = Number(match[1]);
          const secs = Number(match[2]);
          if (!Number.isFinite(mins) || !Number.isFinite(secs)) return;
          parsed.push({ time: mins * 60 + secs, text });
        });
      });
  
      return parsed.sort((a, b) => a.time - b.time);
    }
  
    async function resolveTrackLyrics(track) {
      if (!track) return [];
      const cacheKey = track.lyricsSrc || `${track.title}|${track.artist}`;
      if (lyricsCache.has(cacheKey)) {
        return lyricsCache.get(cacheKey);
      }
  
      let resolved = [];
      if (Array.isArray(track.lyrics) && track.lyrics.length) {
        resolved = track.lyrics;
      } else if (track.lyricsSrc) {
        try {
          const response = await fetch(track.lyricsSrc, { cache: 'force-cache' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          resolved = parseLrc(await response.text());
        } catch (error) {
          log('歌词加载失败:', track.title, error && error.message ? error.message : error);
        }
      }
  
      const normalized = normalizeLyricLines(resolved, track);
      lyricsCache.set(cacheKey, normalized);
      return normalized;
    }
  
    function renderLyricLines(lines) {
      if (!lyricsList) return;
      lyricsList.innerHTML = '';
      lines.forEach((line) => {
        const node = document.createElement('div');
        node.className = 'music-lyric-line';
        const main = document.createElement('div');
        main.className = 'music-lyric-main';
        main.textContent = line.text;
        node.appendChild(main);
  
        if (line.translation) {
          const trans = document.createElement('div');
          trans.className = 'music-lyric-trans';
          trans.textContent = line.translation;
          node.appendChild(trans);
        }
  
        lyricsList.appendChild(node);
      });
      lyricsList.style.transform = 'translateY(0)';
    }
  
    function ensureLyricLinesRendered() {
      if (!lyricsList || !currentLyricLines.length) return;
      if (lyricsList.querySelector('.music-lyric-main')) return;
      renderLyricLines(currentLyricLines);
    }
  
    function applyLyricFocus(index, immediate) {
      if (!lyricsList) return;
      const nodes = lyricsList.querySelectorAll('.music-lyric-line');
      if (!nodes.length) return;
  
      const safeIndex = clamp(Number(index) || 0, 0, nodes.length - 1);
      nodes.forEach((node, nodeIndex) => {
        const distance = Math.abs(nodeIndex - safeIndex);
        node.classList.toggle('is-active', distance === 0);
        node.classList.toggle('is-near', distance === 1);
        node.classList.toggle('is-dim', distance >= 2);
      });
  
      if (lyricsViewport) {
        const activeNode = nodes[safeIndex];
        const targetOffset = Math.max(0, activeNode.offsetTop - (lyricsViewport.clientHeight - activeNode.offsetHeight) / 2);
        if (immediate) {
          const prevTransition = lyricsList.style.transition;
          lyricsList.style.transition = 'none';
          lyricsList.style.transform = `translateY(${-targetOffset}px)`;
          requestAnimationFrame(() => {
            lyricsList.style.transition = prevTransition || '';
          });
        } else {
          lyricsList.style.transform = `translateY(${-targetOffset}px)`;
        }
      }
  
      currentLyricIndex = safeIndex;
    }
  
    async function prepareLyricsForTrack(track, trackIndex) {
      setLyricTrackLabel(track);
      setLyricLoadingState(audio.paused ? PRE_PLAY_LYRIC_TEXT : '歌词加载中...');
      currentLyricLines = [];
      currentLyricIndex = -1;
  
      const token = ++lyricsLoadToken;
      const lines = await resolveTrackLyrics(track);
      if (token !== lyricsLoadToken || trackIndex !== currentMusicIndex) return;
  
      currentLyricLines = lines;
      if (audio.paused) {
        setLyricLoadingState(PRE_PLAY_LYRIC_TEXT);
        return;
      }
      renderLyricLines(lines);
      updateLyrics(true);
    }
  
    function resetLyrics() {
      currentLyricIndex = -1;
      currentLyricLines = [];
      setLyricLoadingState(audio.paused ? PRE_PLAY_LYRIC_TEXT : '歌词加载中...');
    }
  
    function updateLyrics(force) {
      if (!currentLyricLines.length) return;
      if (audio.paused) return;
      ensureLyricLinesRendered();
      const now = Number(audio.currentTime) || 0;
      let targetIndex = 0;
      for (let i = currentLyricLines.length - 1; i >= 0; i--) {
        if (now >= currentLyricLines[i].time) {
          targetIndex = i;
          break;
        }
      }
      if (!force && targetIndex === currentLyricIndex) return;
      applyLyricFocus(targetIndex, !!force);
    }
  
    let errorSkipCount = 0;
    function handleAudioError() {
      errorSkipCount += 1;
      stopAutoGainSampler();
      updatePlayIcon(false);
      if (errorSkipCount >= musicList.length) {
        if (musicTitle) musicTitle.textContent = '音频不可用';
        localStorage.setItem(STORAGE.playing, 'false');
        return;
      }
      nextMusic({ autoplay: true, ignoreMode: true, reason: 'error-skip' });
    }
  
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePlay();
    });
  
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        nextMusic({ autoplay: !audio.paused, reason: 'manual-next', userAction: true });
      });
    }
  
    if (volumeToggle) {
      volumeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleVolume();
      });
  
      volumeToggle.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation();
        nudgeVolume(e.deltaY < 0 ? 0.08 : -0.08);
      }, { passive: false });
  
      volumeToggle.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        nudgeVolume(1);
      });
    }
  
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const value = Number(e.target && e.target.value);
        if (!Number.isFinite(value)) return;
        setMasterVolume(value / 100, true);
      });
    }
  
    if (playModeToggle) {
      playModeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        cyclePlayMode();
      });
    }
  
    if (hideToggle) {
      hideToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setHidden(playerMain.style.display !== 'none');
      });
    }
  
    if (playlistToggle) {
      playlistToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const opening = !playlistPanel || !playlistPanel.classList.contains('is-open');
        setPlaylistExpanded(opening);
      });
    }
  
    if (playlistPanel) {
      playlistPanel.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  
    document.addEventListener('click', (e) => {
      if (!playlistPanel || !playlistToggle) return;
      if (!playlistPanel.classList.contains('is-open')) return;
      if (playlistPanel.contains(e.target) || playlistToggle.contains(e.target)) return;
      setPlaylistExpanded(false);
    });
  
    miniBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setHidden(false);
    });
  
    progressContainer.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      seekByClientX(e.clientX);
    });
  
    progressContainer.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType !== 'touch') return;
      e.preventDefault();
      seekByClientX(e.clientX);
      const onMove = (ev) => seekByClientX(ev.clientX);
      const onUp = () => {
        document.removeEventListener('pointermove', onMove, true);
        document.removeEventListener('pointerup', onUp, true);
        document.removeEventListener('pointercancel', onUp, true);
      };
      document.addEventListener('pointermove', onMove, true);
      document.addEventListener('pointerup', onUp, true);
      document.addEventListener('pointercancel', onUp, true);
    });
  
    audio.addEventListener('timeupdate', () => {
      updateProgressUI();
      persistPlaybackState(false);
      updateLyrics(false);
    });
  
    audio.addEventListener('loadedmetadata', () => {
      updateProgressUI();
      updateLyrics(true);
      applyEffectiveVolume(false);
    });
  
    audio.addEventListener('play', () => {
      hasStartedPlayback = true;
      updatePlayIcon(true);
      localStorage.setItem(STORAGE.playing, 'true');
      applyAutoGainForTrack(currentMusicIndex);
      if (currentLyricLines.length && lyricsList && !lyricsList.querySelector('.music-lyric-main')) {
        renderLyricLines(currentLyricLines);
      }
      updateLyrics(true);
    });
  
    audio.addEventListener('pause', () => {
      updatePlayIcon(false);
      localStorage.setItem(STORAGE.playing, 'false');
      stopAutoGainSampler();
      setLyricLoadingState(PRE_PLAY_LYRIC_TEXT);
    });
  
    audio.addEventListener('volumechange', () => {
      updateVolumeIcon(audio.volume);
    });
  
    audio.addEventListener('ended', () => {
      stopAutoGainSampler();
      nextMusic({ autoplay: true, fromEnded: true, reason: 'ended' });
    });
  
    audio.addEventListener('loadstart', () => {
      stopAutoGainSampler();
    });
  
    audio.addEventListener('error', () => {
      handleAudioError();
    });
  
    audio.addEventListener('playing', () => {
      errorSkipCount = 0;
    });
  
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isInputLike(e.target)) return;
      if (e.code === 'Escape') {
        setPlaylistExpanded(false);
        return;
      }
      if (e.code === 'Space' && playerMain.style.display !== 'none') {
        e.preventDefault();
        togglePlay();
        return;
      }
      if (e.code === 'KeyN') {
        e.preventDefault();
        nextMusic({ autoplay: !audio.paused, reason: 'shortcut-next', userAction: true });
      }
    });
  
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      if (!audio.paused) updateLyrics(true);
    });
  
    window.addEventListener('resize', () => {
      if (!currentLyricLines.length) return;
      updateLyrics(true);
    });
  
    window.addEventListener('pagehide', () => {
      persistPlaybackState(true);
      localStorage.setItem(STORAGE.volume, String(masterVolume));
      localStorage.setItem(STORAGE.playing, audio.paused ? 'false' : 'true');
    });
  
    window.addEventListener('beforeunload', () => {
      persistPlaybackState(true);
      localStorage.setItem(STORAGE.volume, String(masterVolume));
      stopAutoGainSampler();
    });
  
    let currentMusicIndex = normalizeIndex(getStoredNumber(STORAGE.index, DEFAULT_TRACK_INDEX));
    const storedVolume = getStoredNumber(STORAGE.volume, NaN);
    masterVolume = Number.isFinite(storedVolume)
      ? clamp(storedVolume, 0, 1)
      : DEFAULT_MUSIC_VOLUME;
    currentPlayMode = normalizePlayMode(localStorage.getItem(STORAGE.playMode));
    const wasPlaying = localStorage.getItem(STORAGE.playing) === 'true';
    const wasHidden = localStorage.getItem(STORAGE.hidden) === 'true';
    const wasPlaylistExpanded = localStorage.getItem(STORAGE.playlistExpanded) === 'true';
    hasStartedPlayback = !audio.paused;
  
    autoGainFactor = 1;
    applyEffectiveVolume(false);
    updatePlayModeUI(currentPlayMode);
    localStorage.setItem(STORAGE.playMode, currentPlayMode);
    localStorage.setItem(STORAGE.volume, String(masterVolume));
    setHidden(wasHidden, false);
    loadMusic(currentMusicIndex, { keepTime: true });
    renderPlaylist();
    setPlaylistExpanded(!wasHidden && wasPlaylistExpanded, false);
  
    if (window.innerWidth < 768 && musicInfo) {
      musicInfo.style.minWidth = '100px';
      musicInfo.style.maxWidth = '120px';
    }
  
    let pendingAutoplay = wasPlaying;
    if (pendingAutoplay) {
      setTimeout(() => {
        setLoadingIcon();
        attemptPlay('restore').then((ok) => {
          pendingAutoplay = !ok;
        });
      }, 450);
    } else {
      updatePlayIcon(false);
    }
  
    const resumeOnGesture = () => {
      if (!pendingAutoplay || !audio.paused) return;
      setLoadingIcon();
      attemptPlay('gesture-resume').then(() => {
        pendingAutoplay = false;
      });
    };
    document.addEventListener('pointerdown', resumeOnGesture, { capture: true, once: true });
  };
})();

(function () {
  'use strict';

  var scheduled = false;

  function bootMusic() {
    if (window.__ginkaMusicBooted) return;
    if (typeof window.GINKA_BOOT_MUSIC !== 'function') return;
    window.GINKA_BOOT_MUSIC();
  }

  function scheduleMusicBoot() {
    if (scheduled) return;
    scheduled = true;

    var runtime = window.GINKA_RUNTIME;
    var requireInteraction = !!(runtime && runtime.isLowPower);
    var timeout = requireInteraction ? 4200 : 2200;

    if (runtime && typeof runtime.scheduleBackgroundTask === 'function') {
      runtime.scheduleBackgroundTask('music-player', bootMusic, {
        timeout: timeout,
        requireInteraction: requireInteraction
      });
      return;
    }

    if (document.readyState === 'complete') {
      window.setTimeout(bootMusic, requireInteraction ? 0 : 1200);
      return;
    }

    window.addEventListener('load', function () {
      window.setTimeout(bootMusic, requireInteraction ? 0 : 1200);
    }, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleMusicBoot, { once: true });
  } else {
    scheduleMusicBoot();
  }
})();
