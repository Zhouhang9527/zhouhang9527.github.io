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
    const PRE_PLAY_LYRIC_TEXT = '加载中...';
    const MUSIC_VOICE_COOLDOWN_MS = 5000;
    const PLAYLIST_CACHE_VERSION = 2;
    const STORAGE = {
      index: 'music_current_index',
      source: 'music_current_source',
      trackId: 'music_current_track_id',
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
  
    let musicList = [];
    const configNode = document.getElementById('ginka-music-config');
    let musicConfig = {};
    try {
      musicConfig = configNode ? JSON.parse(configNode.textContent || '{}') : {};
    } catch (error) {
      console.warn('[Music] 音乐配置无效。', error);
    }

    const normalizeConfiguredTrack = (track, source) => {
      const value = track && typeof track === 'object' ? track : {};
      const rawPath = (path) => {
        const text = String(path || '');
        if (!text) return '';
        return /^https:\/\//i.test(text) ? text : assetUrl(text);
      };
      const configuredCover = String(value.pic || value.cover || '');
      const configuredLyrics = String(value.lrc || '');
      return {
        id: String(value.id || value.url_id || value.mid || value.title || value.name || ''),
        source: source || 'local',
        title: String(value.title || value.name || '未知曲目'),
        artist: String(value.artist || value.author || '未知艺术家'),
        album: String(value.album || ''),
        src: rawPath(value.src || value.url),
        cover: rawPath(value.cover || value.pic) || rawPath(musicConfig.default_cover),
        lyricsSrc: rawPath(value.lyricsSrc || value.lrc),
        translations: value.translations && typeof value.translations === 'object' ? value.translations : undefined
      };
    };

    musicList = [];
    const onlineConfig = musicConfig.online && typeof musicConfig.online === 'object' ? musicConfig.online : {};
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
    const sourceRetryBtn = document.getElementById('music-source-retry');
  
    if (!audio || !toggleBtn || !icon || !timeDisplay || !progressBar || !progressContainer || !playerMain || !miniBtn) {
      console.error('[Music] 音乐播放器关键节点缺失');
      return;
    }
  
    const log = (...args) => { if (DEBUG) console.log('[Music]', ...args); };
    const storageGet = (key) => {
      try { return window.localStorage ? localStorage.getItem(key) : null; } catch (_error) { return null; }
    };
    const storageSet = (key, value) => {
      try { if (window.localStorage) localStorage.setItem(key, String(value)); } catch (_error) {}
    };
    let currentSource = 'online';
    let onlineMusicList = [];
    let playlistRequest = null;
    let playlistRequestSequence = 0;
    let trackRequestSequence = 0;
    let onlineFailureCount = 0;
    let onlineFailedTrackIds = new Set();
    let onlineRetryForTrack = '';
    let suppressMediaError = 0;
    let playbackWanted = false;
    let lyricMotionTimer = 0;

    const setRefreshLoading = (loading) => {
      if (!sourceRetryBtn) return;
      sourceRetryBtn.classList.toggle('is-loading', !!loading);
      sourceRetryBtn.setAttribute('aria-busy', String(!!loading));
    };
    const setActiveList = (source, tracks, options) => {
      const opt = options || {};
      const normalized = Array.isArray(tracks) ? tracks.filter((track) => track && track.id && track.src) : [];
      if (!normalized.length) return false;
      currentSource = source === 'online' ? 'online' : 'local';
      musicList = normalized;
      if (!opt.preserveTrack) currentMusicIndex = 0;
      renderPlaylist();
      return true;
    };
    const getCurrentTrack = () => musicList[normalizeIndex(currentMusicIndex)] || null;
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
      return track && track.id ? `${track.source || currentSource}:${track.id}` : String(normalizeIndex(index));
    };

    const metingUrl = (type, id) => {
      const base = String(onlineConfig.api_base || '').trim();
      if (!base || !/^https:\/\//i.test(base)) return '';
      try {
        const url = new URL(base, window.location.href);
        url.searchParams.set('server', String(onlineConfig.platform || 'netease'));
        url.searchParams.set('type', type);
        url.searchParams.set('id', String(id));
        return url.toString();
      } catch (_error) { return ''; }
    };

    const secureMetingResource = (value, expectedType) => {
      const text = String(value || '').trim();
      if (!/^https:\/\//i.test(text)) return '';
      try {
        const url = new URL(text);
        const resourceType = url.searchParams.get('type');
        if (expectedType && resourceType && resourceType !== expectedType) return '';
        return url.toString();
      } catch (_error) { return ''; }
    };

    const onlineTrackId = (value) => {
      const directId = value.id || value.url_id || value.songId || value.mid || value.song_id;
      if (directId) return String(directId);
      const resolver = secureMetingResource(value.url, 'url');
      if (!resolver) return '';
      try { return String(new URL(resolver).searchParams.get('id') || ''); } catch (_error) { return ''; }
    };

    const readCachedPlaylist = () => {
      try {
        const raw = storageGet('music_online_playlist_cache');
        const cached = raw ? JSON.parse(raw) : null;
        const ttl = Math.max(60000, Number(onlineConfig.cache_ttl_ms) || 1800000);
        return cached && cached.version === PLAYLIST_CACHE_VERSION && Array.isArray(cached.tracks) && Date.now() - Number(cached.savedAt) < ttl
          ? cached.tracks
          : null;
      } catch (_error) { return null; }
    };

    const mapOnlineTrack = (item, index) => {
      const value = item && typeof item === 'object' ? item : {};
      const id = onlineTrackId(value);
      // Meting playlist responses contain signed resolver URLs. They are API
      // endpoints, not the provider's expiring media URL, so they are safe to
      // retain with the short-lived metadata cache.
      const playbackUrl = secureMetingResource(value.url, 'url') || String(metingUrl('url', id) || '');
      const configuredCover = secureMetingResource(value.pic, 'pic') || secureMetingResource(value.cover);
      const configuredLyrics = secureMetingResource(value.lrc, 'lrc') || secureMetingResource(value.lyricsSrc);
      if (!id || !/^https:\/\//i.test(playbackUrl)) return null;
      return {
        id: String(id),
        source: 'online',
        title: String(value.title || value.name || `在线曲目 ${index + 1}`),
        artist: String(value.author || value.artist || '未知艺术家'),
        album: String(value.album || ''),
        src: playbackUrl,
        resolverUrl: playbackUrl,
        cover: /^https:\/\//i.test(configuredCover)
          ? configuredCover
          : String(musicConfig.default_cover || assetUrl('music/unhappy.jpg')),
        lyricsSrc: /^https:\/\//i.test(configuredLyrics) ? configuredLyrics : String(metingUrl('lrc', id) || '')
      };
    };

    async function fetchOnlinePlaylist(options) {
      const opt = options || {};
      const playlistType = String(onlineConfig.type || 'playlist');
      if (!onlineConfig.enabled || !metingUrl(playlistType, onlineConfig.playlist_id)) {
        return [];
      }
      if (!opt.force) {
        const cached = readCachedPlaylist();
        if (cached && cached.length) return cached;
      }
      if (playlistRequest) return playlistRequest;
      const sequence = ++playlistRequestSequence;
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), Math.max(1000, Number(onlineConfig.timeout_ms) || 8000));
      const playlistEndpoint = new URL(metingUrl(playlistType, onlineConfig.playlist_id));
      if (opt.force) playlistEndpoint.searchParams.set('_refresh', String(Date.now()));
      playlistRequest = fetch(playlistEndpoint.toString(), {
        mode: 'cors', credentials: 'omit', cache: opt.force ? 'no-store' : 'default', signal: controller.signal
      }).then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const items = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
        const tracks = items.map(mapOnlineTrack).filter(Boolean);
        if (!tracks.length) throw new Error('没有可播放的在线曲目');
        if (sequence === playlistRequestSequence) {
          onlineMusicList = tracks;
          storageSet('music_online_playlist_cache', JSON.stringify({ version: PLAYLIST_CACHE_VERSION, savedAt: Date.now(), tracks }));
        }
        return tracks;
      }).catch((error) => {
        log('在线歌单不可用:', error && error.message ? error.message : error);
        return [];
      }).finally(() => {
        window.clearTimeout(timeout);
        if (sequence === playlistRequestSequence) playlistRequest = null;
      });
      return playlistRequest;
    }

    async function refreshOnlineTrackUrl(track) {
      const requestId = ++trackRequestSequence;
      const endpoint = secureMetingResource(track && (track.resolverUrl || track.src), 'url') || metingUrl('url', track && track.id);
      if (!endpoint) return '';
      // If the final media host has not passed CORS validation, let the media
      // element follow the signed resolver redirect directly. Fetching it here
      // could be blocked even though ordinary audio playback remains possible.
      if (!onlineConfig.cors_audio_verified) {
        const retryUrl = new URL(endpoint);
        retryUrl.searchParams.set('_retry', String(Date.now()));
        return requestId === trackRequestSequence ? retryUrl.toString() : '';
      }
      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), Math.max(1000, Number(onlineConfig.timeout_ms) || 8000));
        const response = await fetch(endpoint, { mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal });
        window.clearTimeout(timeout);
        if (!response.ok || requestId !== trackRequestSequence) return '';
        const type = response.headers.get('content-type') || '';
        if (type.includes('application/json')) {
          const payload = await response.json();
          return String(payload.url || (payload.data && payload.data.url) || '');
        }
        return response.url && /^https:\/\//i.test(response.url) ? response.url : endpoint;
      } catch (_error) { return ''; }
    }

    async function tryOnlinePlaylist(options) {
      const opt = options || {};
      setRefreshLoading(true);
      const tracks = await fetchOnlinePlaylist({ force: !!opt.force });
      setRefreshLoading(false);
      if (!tracks.length) {
        return false;
      }
      onlineMusicList = tracks;
      // A recovered network must never cut off a local song that is already playing.
      if (!audio.paused && !opt.restore) {
        return true;
      }
      if (opt.activate || opt.restore) {
        const requestedId = opt.trackId || storageGet(STORAGE.trackId);
        const index = Math.max(0, tracks.findIndex((track) => track.id === requestedId));
        setActiveList('online', tracks);
        loadMusic(index, { keepTime: !!opt.keepTime });
      }
      return true;
    }

    let masterVolume = DEFAULT_MUSIC_VOLUME;
    let autoGainFactor = 1;
    let currentPlayMode = 'list';
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
      const value = Number(storageGet(key));
      return Number.isFinite(value) ? value : fallback;
    }
  
    function formatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${String(secs).padStart(2, '0')}`;
    }
  
    function updatePlayIcon(isPlaying) {
      musicRoot.classList.toggle('is-playing', isPlaying);
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
        volumeToggle.title = `音量 ${Math.round(masterVolume * 100)}%`;
      }
  
      if (persist !== false) {
        storageSet(STORAGE.volume, masterVolume);
      }
      if (masterVolume > 0.01) {
        storageSet(STORAGE.lastVolume, masterVolume);
      }
    }
  
    function setMasterVolume(volume, persist) {
      masterVolume = clamp(Number(volume), 0, 1);
      applyEffectiveVolume(persist);
    }
  
    function stopAutoGainSampler() {}

    function applyAutoGainForTrack(trackIndex) {
      // Keep this persistent media element on its native playback path. Routing it
      // through Web Audio can silence later cross-origin tracks even when the URL
      // itself is playable, and a MediaElementSource cannot be detached safely.
      autoGainFactor = 1;
      applyEffectiveVolume(false);
    }
  
    function cyclePlayMode() {
      const currentIndex = PLAY_MODES.indexOf(currentPlayMode);
      const nextMode = PLAY_MODES[(currentIndex + 1) % PLAY_MODES.length];
      currentPlayMode = nextMode;
      storageSet(STORAGE.playMode, nextMode);
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
        storageSet(STORAGE.playlistExpanded, open ? 'true' : 'false');
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
      // The sidebar owns visibility; keep the controls expanded inside it.
      if (musicRoot.closest('#journal-sidebar')) hidden = false;
      musicRoot.classList.toggle('is-expanded', !hidden);
      if (hidden) {
        playerMain.style.display = 'none';
        miniBtn.style.display = 'flex';
        setPlaylistExpanded(false, false);
      } else {
        playerMain.style.display = 'flex';
        miniBtn.style.display = 'none';
      }
      if (lyricsPanel) {
        lyricsPanel.classList.toggle('is-hidden', hidden);
        lyricsPanel.setAttribute('aria-hidden', hidden ? 'true' : 'false');
      }
      if (persist !== false) {
        storageSet(STORAGE.hidden, hidden ? 'true' : 'false');
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
        storageSet(STORAGE.currentTime, currentSecond);
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
        musicCover.removeAttribute('data-sidebar-src');
        musicCover.src = music.cover;
        musicCover.alt = `${music.title} - ${music.artist}`;
        musicCover.onerror = function () {
          this.style.objectFit = 'contain';
          this.style.padding = '6px';
        };
      }
  
      currentMusicIndex = normalized;
      storageSet(STORAGE.index, normalized);
      storageSet(STORAGE.source, music.source || currentSource);
      storageSet(STORAGE.trackId, music.id || normalized);
  
      resetLyrics();
      // Native media playback does not require CORS. An empty crossorigin
      // attribute still selects anonymous CORS, so remove it before assigning src.
      audio.removeAttribute('crossorigin');
      suppressMediaError += 1;
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
        storageSet(STORAGE.currentTime, '0');
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
        const title = document.createElement('span');
        title.className = 'music-playlist-title';
        title.textContent = music.title;
        const meta = document.createElement('span');
        meta.className = 'music-playlist-meta';
        meta.textContent = music.artist;
        item.append(title, meta);
  
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
        playbackWanted = true;
        hasStartedPlayback = true;
        ensureLyricLinesRendered();
        updatePlayIcon(true);
        storageSet(STORAGE.playing, 'true');
        if (reason === 'toggle' || reason === 'playlist-resume' || reason === 'gesture-resume' || reason === 'restore') {
          announceMusicVoice('play', { minGapMs: 520 });
        }
        log('播放成功:', reason);
        return true;
      } catch (error) {
        playbackWanted = false;
        updatePlayIcon(false);
        storageSet(STORAGE.playing, 'false');
        if (error && error.name === 'NotAllowedError') {
          return false;
        }
        if (musicTitle) {
          musicTitle.textContent = musicList[currentMusicIndex] ? musicList[currentMusicIndex].title : '点击播放';
        }
        log('播放失败:', reason, error && error.message ? error.message : error);
        return false;
      }
    }
  
    function pausePlayback(reason) {
      playbackWanted = false;
      audio.pause();
      updatePlayIcon(false);
      storageSet(STORAGE.playing, 'false');
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
        storageSet(STORAGE.lastVolume, masterVolume);
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
    let lyricsRequestController = null;
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
  
    async function resolveTrackLyrics(track, signal) {
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
          const response = await fetch(track.lyricsSrc, {
            mode: 'cors', credentials: 'omit', cache: 'force-cache', signal
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          resolved = parseLrc(await response.text());
        } catch (error) {
          log('歌词加载失败:', track.title, error && error.message ? error.message : error);
        }
      }
  
      if (!resolved.length) {
        resolved = [{ time: 0, text: '暂无歌词' }];
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
          lyricsList.classList.add('is-moving');
          window.clearTimeout(lyricMotionTimer);
          lyricMotionTimer = window.setTimeout(() => {
            lyricsList.classList.remove('is-moving');
          }, 480);
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
      if (lyricsRequestController) lyricsRequestController.abort();
      const controller = new AbortController();
      lyricsRequestController = controller;
      const timeout = window.setTimeout(() => controller.abort(), Math.max(1000, Number(onlineConfig.timeout_ms) || 8000));
      const lines = await resolveTrackLyrics(track, controller.signal);
      window.clearTimeout(timeout);
      if (token !== lyricsLoadToken || controller !== lyricsRequestController || trackIndex !== currentMusicIndex) return;
  
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
    async function handleAudioError() {
      if (suppressMediaError > 0) return;
      const failedTrack = getCurrentTrack();
      stopAutoGainSampler();
      updatePlayIcon(false);
      if (!failedTrack || !playbackWanted) return;

      if (currentSource === 'online') {
        const trackKey = `${failedTrack.source}:${failedTrack.id}`;
        if (onlineRetryForTrack !== trackKey) {
          onlineRetryForTrack = trackKey;
          setRefreshLoading(true);
          const refreshed = await refreshOnlineTrackUrl(failedTrack);
          setRefreshLoading(false);
          const stillCurrent = currentSource === 'online' && getCurrentTrack() && getCurrentTrack().id === failedTrack.id;
          if (refreshed && stillCurrent) {
            failedTrack.src = refreshed;
            loadMusic(currentMusicIndex, { keepTime: false });
            setLoadingIcon();
            attemptPlay('online-url-retry');
            return;
          }
        }

        onlineFailedTrackIds.add(failedTrack.id);
        onlineFailureCount += 1;
        const allFailed = onlineFailedTrackIds.size >= musicList.length;
        if (onlineFailureCount >= 3 || allFailed) {
          playbackWanted = false;
          if (musicTitle) musicTitle.textContent = '在线音乐暂时不可用，请刷新歌单';
          return;
        }
        nextMusic({ autoplay: true, ignoreMode: true, reason: 'online-error-skip' });
        return;
      }

      errorSkipCount += 1;
      if (errorSkipCount >= musicList.length) {
        playbackWanted = false;
        if (musicTitle) musicTitle.textContent = '本地音频不可用';
        storageSet(STORAGE.playing, 'false');
        return;
      }
      nextMusic({ autoplay: true, ignoreMode: true, reason: 'local-error-skip' });
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

    if (sourceRetryBtn) {
      sourceRetryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        tryOnlinePlaylist({ force: true, activate: audio.paused && currentSource === 'local' });
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
      storageSet(STORAGE.playing, 'true');
      applyAutoGainForTrack(currentMusicIndex);
      if (currentLyricLines.length && lyricsList && !lyricsList.querySelector('.music-lyric-main')) {
        renderLyricLines(currentLyricLines);
      }
      updateLyrics(true);
    });
  
    audio.addEventListener('pause', () => {
      updatePlayIcon(false);
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
      if (suppressMediaError > 0) suppressMediaError -= 1;
    });
  
    audio.addEventListener('error', () => {
      handleAudioError();
    });
  
    audio.addEventListener('playing', () => {
      errorSkipCount = 0;
      onlineRetryForTrack = '';
      setRefreshLoading(false);
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
      storageSet(STORAGE.volume, masterVolume);
      storageSet(STORAGE.playing, playbackWanted ? 'true' : 'false');
    });
  
    window.addEventListener('beforeunload', () => {
      persistPlaybackState(true);
      storageSet(STORAGE.volume, masterVolume);
      stopAutoGainSampler();
    });
  
    const storedSource = 'online';
    const storedTrackId = storageGet(STORAGE.trackId);
    let currentMusicIndex = 0;
    const storedVolume = getStoredNumber(STORAGE.volume, NaN);
    masterVolume = Number.isFinite(storedVolume)
      ? clamp(storedVolume, 0, 1)
      : DEFAULT_MUSIC_VOLUME;
    currentPlayMode = normalizePlayMode(storageGet(STORAGE.playMode));
    const wasPlaying = storageGet(STORAGE.playing) === 'true';
    const wasHidden = !musicRoot.closest('#journal-sidebar') && storageGet(STORAGE.hidden) !== 'false';
    const wasPlaylistExpanded = storageGet(STORAGE.playlistExpanded) === 'true';
    hasStartedPlayback = !audio.paused;
  
    autoGainFactor = 1;
    applyEffectiveVolume(false);
    updatePlayModeUI(currentPlayMode);
    storageSet(STORAGE.playMode, currentPlayMode);
    storageSet(STORAGE.volume, masterVolume);
    setHidden(wasHidden, false);
    setPlaylistExpanded(false, false);
  
    if (window.innerWidth < 768 && musicInfo) {
      musicInfo.style.minWidth = '100px';
      musicInfo.style.maxWidth = '120px';
    }
  
    let pendingAutoplay = wasPlaying;
    const resumeStoredPlayback = () => {
      if (!pendingAutoplay) return;
      setTimeout(() => {
        setLoadingIcon();
        attemptPlay('restore').then((ok) => {
          pendingAutoplay = !ok;
        });
      }, 450);
    };
    {
      // The player is online-only. Hide it when the initial playlist cannot load.
      toggleBtn.disabled = true;
      setLoadingIcon();
      tryOnlinePlaylist({
        activate: true,
        restore: storedSource === 'online',
        trackId: storedTrackId,
        keepTime: storedSource === 'online'
      }).then((loaded) => {
        if (!loaded) {
          musicRoot.style.display = 'none';
          return;
        }
        toggleBtn.disabled = false;
        setPlaylistExpanded(wasPlaylistExpanded, false);
        if (pendingAutoplay) resumeStoredPlayback();
        else updatePlayIcon(false);
      });
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
    // Fetch playlist metadata alongside the page. This resolves only the active
    // track; the rest of the online playlist is never preloaded as audio.
    bootMusic();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleMusicBoot, { once: true });
  } else {
    scheduleMusicBoot();
  }
})();
