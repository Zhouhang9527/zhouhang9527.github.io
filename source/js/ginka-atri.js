(async function () {
  'use strict';

  if (window.__ginkaAtriBooting) return;
  window.__ginkaAtriBooting = true;

  // ===================================================
  // ATRI Live2D（修复版：恢复按钮/语音/双语字幕）
  // ===================================================

  const siteRoot = (window.CONFIG && window.CONFIG.root) ? window.CONFIG.root : '/';
  const rootBase = (siteRoot && siteRoot.endsWith('/')) ? siteRoot : (siteRoot + '/');
  const assetUrl = (p) => rootBase + String(p).replace(/^\/+/, '');

  // ===================================================
  // 设备适配管理器
  // ===================================================
  const DeviceManager = {
    isMobile: () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768,
    
    getConfig: function() {
      const w = window.innerWidth;
      // 超小屏 (<= 360px)
      if (w <= 360) return { width: 0, height: 0, scale: 0, messageTimeout: 3000, hidden: true };
      // 小屏手机 (<= 480px)
      if (w <= 480) return { width: 160, height: 240, scale: 0.15, messageTimeout: 3000, hidden: false };
      // 普通手机 (<= 768px)
      if (w <= 768) return { width: 200, height: 300, scale: 0.18, messageTimeout: 3000, hidden: false };
      // 平板 (<= 1024px)
      if (w <= 1024) return { width: 280, height: 400, scale: 0.22, messageTimeout: 3500, hidden: false };
      // 桌面端
      return { width: 350, height: 500, scale: 0.25, messageTimeout: 4000, hidden: false };
    }
  };

  const initialConfig = DeviceManager.getConfig();

  const CONFIG = {
    modelPath: assetUrl('live2d/ATRI/ATRI.model3.json?v=20260426-perf2'),
    canvasId: 'atri-canvas',
    width: initialConfig.width,
    height: initialConfig.height,
    scale: initialConfig.scale,
    enableMessage: true,
    messageTimeout: initialConfig.messageTimeout,
    messages: {
      welcome: ['你好呀！我是 ATRI~', '欢迎来到这里！', '让我陪你一起吧~'],
      click: ['呀！不要戳我~', '嘿嘿~', '怎么了吗？', '在呢在呢~'],
      talk: ['有什么想和我聊的吗？', '今天过得怎么样？', '要不要休息一下？']
    }
  };

  class ATRILive2D {
    constructor(config) {
      this.config = config;
      this.widget = document.getElementById('atri-live2d-widget');
      this.canvas = document.getElementById(config.canvasId);
      this.messageBox = document.getElementById('atri-message-box');
      this.isVisible = true;
      const runtime = window.GINKA_RUNTIME || {};
      this.performance = {
        lowPower: !!runtime.isLowPower,
        targetFps: runtime.isLowPower ? 30 : 60,
        talkFps: runtime.isLowPower ? 24 : 48,
        gestureFps: runtime.isLowPower ? 30 : 60,
        idleInterval: runtime.isLowPower ? 20000 : 12000,
        idleCooldown: runtime.isLowPower ? 24000 : 16000,
        resolution: runtime.isLowPower ? 1 : 1.25,
        antialias: !runtime.isLowPower
      };
      
      // 暴露实例到全局，以便外部调用
      window.atri = this;

      this.app = null;
      this.model = null;

      this.voiceConfig = null;
      this.voicePlayer = null;
      this.messageTimer = null;
      this._messageVersion = 0;

      this._talkingRaf = 0;
      this._talkingActive = false;

      this._mouthSmooth = 0;
      this._audioCtx = null;
      this._analyser = null;
      this._analyserData = null;
      this._mediaSource = null;
      this._paramMotionRaf = 0;
      this._paramMotionActive = false;

      this._idleMotionTimer = 0;
      this._lastInteractionAt = Date.now();
      this._motionProfileIndex = 0;
      this._lastTalkFrameAt = 0;
      this._lastGestureFrameAt = 0;
      this._visibilityHandler = null;
      this._modelTickerHandler = null;
    }

    _ensureAudioAnalyser() {
      if (!this.voicePlayer) return;
      if (this._analyser && this._audioCtx) return;

      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        this._audioCtx = this._audioCtx || new Ctx();

        if (!this._mediaSource) {
          this._mediaSource = this._audioCtx.createMediaElementSource(this.voicePlayer);
        }

        this._analyser = this._audioCtx.createAnalyser();
        this._analyser.fftSize = 1024;
        this._analyser.smoothingTimeConstant = 0.85;
        this._analyserData = new Uint8Array(this._analyser.fftSize);

        // 连接：source -> analyser -> speakers
        this._mediaSource.connect(this._analyser);
        this._analyser.connect(this._audioCtx.destination);
      } catch (e) {
        // 可能因为跨域/CORS 或重复 createMediaElementSource 导致失败
        this._audioCtx = null;
        this._analyser = null;
        this._analyserData = null;
        this._mediaSource = null;
      }
    }

    _getCoreModel() {
      try {
        return this.model && this.model.internalModel && this.model.internalModel.coreModel
          ? this.model.internalModel.coreModel
          : null;
      } catch (_) {
        return null;
      }
    }

    _setMouthOpen(value) {
      const v = Math.max(0, Math.min(1, Number(value) || 0));
      const coreModel = this._getCoreModel();
      if (!coreModel || typeof coreModel.setParameterValueById !== 'function') return;
      try { coreModel.setParameterValueById('ParamMouthOpenY', v); } catch (_) {}
      try { coreModel.setParameterValueById('ParamMouthForm', (v - 0.5) * 0.5); } catch (_) {}
    }

    _getParamValue(id, fallback) {
      const coreModel = this._getCoreModel();
      if (!coreModel || typeof coreModel.getParameterValueById !== 'function') {
        return Number(fallback) || 0;
      }
      try {
        const value = coreModel.getParameterValueById(id);
        return Number.isFinite(value) ? value : (Number(fallback) || 0);
      } catch (_) {
        return Number(fallback) || 0;
      }
    }

    _shouldSkipFrame(now, lastAt, fps) {
      const targetFps = Math.max(12, Number(fps) || 60);
      return lastAt > 0 && (now - lastAt) < (1000 / targetFps);
    }

    _setAppRunning(active) {
      if (!this.app) return;
      try {
        if (this.app.stage) {
          this.app.stage.renderable = !!active;
        }
        if (active) {
          if (typeof this.app.start === 'function') this.app.start();
          else if (this.app.ticker && typeof this.app.ticker.start === 'function') this.app.ticker.start();
          return;
        }
        if (typeof this.app.stop === 'function') this.app.stop();
        else if (this.app.ticker && typeof this.app.ticker.stop === 'function') this.app.ticker.stop();
      } catch (_) {}
    }

    setupVisibilityLifecycle() {
      if (this._visibilityHandler) return;
      this._visibilityHandler = () => {
        if (!this.isVisible || document.hidden) {
          this.stopTalkingFace();
          this.stopParameterGesture();
          this._setAppRunning(false);
          return;
        }

        this._setAppRunning(true);
        if (this.voicePlayer && !this.voicePlayer.paused) {
          this.startTalkingFace();
        }
      };

      document.addEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler();
    }

    stopParameterGesture() {
      this._paramMotionActive = false;
      if (this._paramMotionRaf) {
        cancelAnimationFrame(this._paramMotionRaf);
        this._paramMotionRaf = 0;
      }
      this._lastGestureFrameAt = 0;
    }

    performParameterGesture(style, options) {
      const coreModel = this._getCoreModel();
      if (!coreModel || typeof coreModel.setParameterValueById !== 'function') return false;

      const profile = {
        greet: {
          duration: 1280,
          angleX: 11,
          angleY: 3,
          angleZ: -6,
          bodyX: 4,
          bodyY: 1.5,
          nod: 3.8,
          eyeSmile: 0.38,
          mouthForm: 0.38,
          cheek: 0.28,
          handL: 0.68,
          handR: 0.2
        },
        gentle: {
          duration: 1550,
          angleX: 4.4,
          angleY: 1.8,
          angleZ: -2,
          bodyX: 2,
          bodyY: 1.1,
          nod: 2.6,
          eyeSmile: 0.24,
          mouthForm: 0.25,
          cheek: 0.16,
          handL: 0.3,
          handR: 0.15
        },
        think: {
          duration: 1500,
          angleX: -7.5,
          angleY: 2.4,
          angleZ: 4,
          bodyX: -2.4,
          bodyY: 1,
          nod: 1.6,
          browY: 0.42,
          browAngle: 0.3,
          eyeBallX: -0.3,
          mouthForm: -0.15,
          handL: 0.4,
          handR: 0.1
        },
        bright: {
          duration: 1380,
          angleX: 8,
          angleY: 2.2,
          angleZ: -3.2,
          bodyX: 2.8,
          bodyY: 1.5,
          nod: 3.2,
          eyeSmile: 0.5,
          mouthForm: 0.46,
          cheek: 0.34,
          handL: 0.5,
          handR: 0.36
        }
      };

      const cfg = profile[style] || profile.gentle;
      const duration = Math.max(600, Number(options && options.duration) || cfg.duration || 1200);

      const base = {
        angleX: this._getParamValue('ParamAngleX', 0),
        angleY: this._getParamValue('ParamAngleY', 0),
        angleZ: this._getParamValue('ParamAngleZ', 0),
        bodyX: this._getParamValue('ParamBodyAngleX', 0),
        bodyY: this._getParamValue('ParamBodyAngleY', 0),
        eyeSmileL: this._getParamValue('ParamEyeLSmile', 0),
        eyeSmileR: this._getParamValue('ParamEyeRSmile', 0),
        eyeBallX: this._getParamValue('ParamEyeBallX', 0),
        browLY: this._getParamValue('ParamBrowLY', 0),
        browRY: this._getParamValue('ParamBrowRY', 0),
        browLAngle: this._getParamValue('ParamBrowLAngle', 0),
        browRAngle: this._getParamValue('ParamBrowRAngle', 0),
        mouthForm: this._getParamValue('ParamMouthForm', 0),
        cheek: this._getParamValue('ParamCheek', 0),
        handL: this._getParamValue('Param12', 0),
        handR: this._getParamValue('Param13', 0)
      };

      this.stopParameterGesture();
      this._paramMotionActive = true;

      const start = performance.now();
      const setSafe = (id, value) => {
        try { coreModel.setParameterValueById(id, value); } catch (_) {}
      };

      const tick = (now) => {
        if (!this._paramMotionActive) return;
        if (this._shouldSkipFrame(now, this._lastGestureFrameAt, this.performance.gestureFps)) {
          this._paramMotionRaf = requestAnimationFrame(tick);
          return;
        }
        this._lastGestureFrameAt = now;

        const t = Math.max(0, Math.min(1, (now - start) / duration));
        const pulse = Math.sin(Math.PI * t);
        const sway = Math.sin(Math.PI * 2 * t) * (1 - t);
        const nod = Math.sin(Math.PI * 3 * t) * (1 - t);
        const smilePulse = Math.pow(pulse, 1.18);

        setSafe('ParamAngleX', base.angleX + (cfg.angleX || 0) * pulse + (cfg.angleX || 0) * 0.15 * sway + (cfg.nod || 0) * nod);
        setSafe('ParamAngleY', base.angleY + (cfg.angleY || 0) * pulse + (cfg.nod || 0) * 0.25 * nod);
        setSafe('ParamAngleZ', base.angleZ + (cfg.angleZ || 0) * pulse);
        setSafe('ParamBodyAngleX', base.bodyX + (cfg.bodyX || 0) * pulse);
        setSafe('ParamBodyAngleY', base.bodyY + (cfg.bodyY || 0) * pulse + (cfg.nod || 0) * 0.2 * nod);

        setSafe('ParamEyeLSmile', base.eyeSmileL + (cfg.eyeSmile || 0) * smilePulse);
        setSafe('ParamEyeRSmile', base.eyeSmileR + (cfg.eyeSmile || 0) * smilePulse);
        setSafe('ParamEyeBallX', base.eyeBallX + (cfg.eyeBallX || 0) * pulse);

        setSafe('ParamBrowLY', base.browLY + (cfg.browY || 0) * pulse);
        setSafe('ParamBrowRY', base.browRY + (cfg.browY || 0) * pulse);
        setSafe('ParamBrowLAngle', base.browLAngle + (cfg.browAngle || 0) * pulse);
        setSafe('ParamBrowRAngle', base.browRAngle + (cfg.browAngle || 0) * pulse);

        setSafe('ParamMouthForm', base.mouthForm + (cfg.mouthForm || 0) * (0.6 * pulse + 0.4 * smilePulse));
        setSafe('ParamCheek', base.cheek + (cfg.cheek || 0) * smilePulse);
        setSafe('Param12', base.handL + (cfg.handL || 0) * pulse);
        setSafe('Param13', base.handR + (cfg.handR || 0) * pulse);

        if (t < 1) {
          this._paramMotionRaf = requestAnimationFrame(tick);
          return;
        }

        setSafe('ParamAngleX', base.angleX);
        setSafe('ParamAngleY', base.angleY);
        setSafe('ParamAngleZ', base.angleZ);
        setSafe('ParamBodyAngleX', base.bodyX);
        setSafe('ParamBodyAngleY', base.bodyY);
        setSafe('ParamEyeLSmile', base.eyeSmileL);
        setSafe('ParamEyeRSmile', base.eyeSmileR);
        setSafe('ParamEyeBallX', base.eyeBallX);
        setSafe('ParamBrowLY', base.browLY);
        setSafe('ParamBrowRY', base.browRY);
        setSafe('ParamBrowLAngle', base.browLAngle);
        setSafe('ParamBrowRAngle', base.browRAngle);
        setSafe('ParamMouthForm', base.mouthForm);
        setSafe('ParamCheek', base.cheek);
        setSafe('Param12', base.handL);
        setSafe('Param13', base.handR);

        this._paramMotionActive = false;
        this._paramMotionRaf = 0;
        this._lastGestureFrameAt = 0;
      };

      this._paramMotionRaf = requestAnimationFrame(tick);
      return true;
    }

    startTalkingFace() {
      if (this._talkingActive) return;
      this._talkingActive = true;

      try {
        if (this.model && typeof this.model.expression === 'function') this.model.expression();
      } catch (_) {}

      // 尝试用音频幅度驱动口型（更自然）；不可用则回退为正弦口型
      this._ensureAudioAnalyser();
      if (this._audioCtx && this._audioCtx.state === 'suspended') {
        try { this._audioCtx.resume(); } catch (_) {}
      }

      const tick = (t) => {
        if (!this._talkingActive) return;
        if (this._shouldSkipFrame(t, this._lastTalkFrameAt, this.performance.talkFps)) {
          this._talkingRaf = requestAnimationFrame(tick);
          return;
        }
        this._lastTalkFrameAt = t;

        let open = 0;
        if (this._analyser && this._analyserData && this.voicePlayer && !this.voicePlayer.paused) {
          try {
            this._analyser.getByteTimeDomainData(this._analyserData);
            let sum = 0;
            for (let i = 0; i < this._analyserData.length; i++) {
              const v = (this._analyserData[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / this._analyserData.length);
            // 口型映射：rms 通常很小，适当放大并加底噪
            open = Math.max(0.06, Math.min(1, rms * 2.2 + 0.04));
          } catch (_) {
            open = 0;
          }
        }

        if (!open) {
          const wave = 0.5 + 0.5 * Math.sin(t / 85);
          open = 0.15 + wave * 0.55;
        }

        // 平滑一下，避免抖动
        this._mouthSmooth = this._mouthSmooth * 0.65 + open * 0.35;
        this._setMouthOpen(this._mouthSmooth);
        this._talkingRaf = requestAnimationFrame(tick);
      };
      this._talkingRaf = requestAnimationFrame(tick);
    }

    stopTalkingFace() {
      this._talkingActive = false;
      if (this._talkingRaf) {
        cancelAnimationFrame(this._talkingRaf);
        this._talkingRaf = 0;
      }
      this._lastTalkFrameAt = 0;
      this._setMouthOpen(0);
      try {
        if (this.model && typeof this.model.expression === 'function') this.model.expression();
      } catch (_) {}
    }

    async init() {
      if (!this.widget || !this.canvas) {
        console.error('[ATRI] 缺少容器或 canvas');
        return;
      }
      if (!window.PIXI || !window.PIXI.live2d) {
        console.error('[ATRI] Live2D 依赖未加载（PIXI / pixi-live2d-display）');
        return;
      }

      // 恢复上次拖拽位置
      this.applySavedPosition();

      this.app = new PIXI.Application({
        view: this.canvas,
        width: this.config.width,
        height: this.config.height,
        // Pixi v7+ 推荐使用 backgroundAlpha 控制透明；transparent 可能被忽略导致黑底
        backgroundAlpha: 0,
        backgroundColor: 0x000000,
        clearBeforeRender: true,
        transparent: true,
        autoDensity: true,
        autoStart: false,
        antialias: this.performance.antialias,
        resolution: Math.min(window.devicePixelRatio || 1, this.performance.resolution)
      });
      if (this.app && this.app.ticker) {
        this.app.ticker.maxFPS = this.performance.targetFps;
      }

      await this.loadModel();
      this.setupControls();
      this.setupCanvasEvents();
      this.setupResponsiveHandler();
      this.setupVisibilityLifecycle();
      if (this.isVisible && !document.hidden) {
        this._setAppRunning(true);
      }
      this.startIdleMotionLoop();
      this.scheduleVoiceInit();
      this.welcomeOnce();
    }

    scheduleVoiceInit() {
      const runtime = window.GINKA_RUNTIME;
      const requireInteraction = !!(runtime && runtime.isLowPower);
      const timeout = requireInteraction ? 4000 : 1600;
      const start = () => {
        this.initVoicePlayer().catch(function () {
          // keep silent
        });
      };

      if (runtime && typeof runtime.scheduleBackgroundTask === 'function') {
        runtime.scheduleBackgroundTask('atri-voice', start, {
          timeout: timeout,
          requireInteraction: requireInteraction
        });
        return;
      }

      setTimeout(start, requireInteraction ? 0 : 1200);
    }

    setupResponsiveHandler() {
      // 响应窗口大小变化，调整 ATRI 位置和大小
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          this.updateLayout();
        }, 300);
      });
    }

    updateLayout() {
      const config = DeviceManager.getConfig();
      
      // 更新配置
      this.config.width = config.width;
      this.config.height = config.height;
      this.config.scale = config.scale;
      
      // 更新 Canvas 尺寸
      if (this.app && this.app.renderer) {
        this.app.renderer.resize(config.width, config.height);
      }
      
      // 更新模型
      if (this.model) {
        this.fitModelToCanvas();
      }
      
      this.keepWidgetInViewport();
      
      // 处理隐藏逻辑
      if (config.hidden) {
        this.widget.style.display = 'none';
        this._setAppRunning(false);
      } else {
        this.widget.style.display = 'block';
        if (this.isVisible && !document.hidden) {
          this._setAppRunning(true);
        }
      }
    }

    applySavedPosition() {
      try {
        const raw = localStorage.getItem('atri_widget_pos');
        if (!raw) return;
        const pos = JSON.parse(raw);
        if (!pos || !Number.isFinite(pos.left) || !Number.isFinite(pos.top)) {
          localStorage.removeItem('atri_widget_pos');
          return;
        }

        // 固定定位改为 left/top（清掉 right/bottom）
        this.widget.style.right = '';
        this.widget.style.bottom = '';
        this.widget.style.left = pos.left + 'px';
        this.widget.style.top = pos.top + 'px';
        this.keepWidgetInViewport(true);
      } catch (_) {
        try { localStorage.removeItem('atri_widget_pos'); } catch (_) {}
      }
    }

    keepWidgetInViewport(persist) {
      if (!this.widget) return;

      const rect = this.widget.getBoundingClientRect();
      const width = rect.width || this.config.width || 260;
      const height = rect.height || this.config.height || 360;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || width;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || height;
      const margin = DeviceManager.isMobile() ? 4 : 8;
      const maxLeft = Math.max(margin, viewportWidth - width - margin);
      const maxTop = Math.max(margin, viewportHeight - height - margin);
      const hasLeftTop = this.widget.style.left !== '' || this.widget.style.top !== '';

      if (!hasLeftTop) return;

      const currentLeft = Number.isFinite(parseFloat(this.widget.style.left))
        ? parseFloat(this.widget.style.left)
        : rect.left;
      const currentTop = Number.isFinite(parseFloat(this.widget.style.top))
        ? parseFloat(this.widget.style.top)
        : rect.top;
      const nextLeft = Math.min(maxLeft, Math.max(margin, currentLeft));
      const nextTop = Math.min(maxTop, Math.max(margin, currentTop));

      this.widget.style.right = '';
      this.widget.style.bottom = '';
      this.widget.style.left = nextLeft + 'px';
      this.widget.style.top = nextTop + 'px';

      if (persist) {
        try {
          localStorage.setItem('atri_widget_pos', JSON.stringify({ left: nextLeft, top: nextTop }));
        } catch (_) {}
      }
    }

    fitModelToCanvas() {
      if (!this.model || !this.model.internalModel) return;

      this.model.visible = true;
      this.model.alpha = 1;
      this.model.anchor.set(0.5, 1.0);
      this.model.x = this.config.width / 2;
      this.model.y = this.config.height;

      let scale = this.config.scale;
      try {
        const iw = this.model.internalModel.width;
        const ih = this.model.internalModel.height;
        if (Number.isFinite(iw) && iw > 0 && Number.isFinite(ih) && ih > 0) {
          const fitW = (this.config.width * 0.92) / iw;
          const fitH = (this.config.height * 0.92) / ih;
          const fitted = Math.min(fitW, fitH);
          if (Number.isFinite(fitted) && fitted > 0) scale = fitted;
        }
      } catch (_) {
        // ignore
      }
      this.model.scale.set(scale);
    }

    async loadModel() {
      try {
        console.log('[ATRI] 加载模型:', this.config.modelPath);
        // 改成手动 tick：避免共享 ticker 与本地 Pixi app 双重更新时间线。
        // 这样可以减少全局刷新链压力，也更容易在页面隐藏/小屏时统一暂停。
        this.model = await PIXI.live2d.Live2DModel.from(this.config.modelPath, {
          autoUpdate: false,
          autoInteract: false
        });
        this.app.stage.addChild(this.model);
        this.attachModelTicker();

        // 自适应缩放/定位
        this.fitModelToCanvas();

        // 尝试在首次加载后触发一次动作/表情，确认渲染链路正常
        setTimeout(() => {
          try {
            this.playRandomMotion();
            if (typeof this.model.expression === 'function') this.model.expression();
          } catch (_) {
            // ignore
          }
        }, 200);
      } catch (e) {
        console.error('[ATRI] 模型加载失败:', e);
        this.showMessage('模型加载失败：请打开控制台查看报错', 8000);
      }
    }

    welcomeOnce() {
      setTimeout(() => {
        // 有语音配置时：欢迎语按时间段筛选，避免晚上说早上好
        if (this.voiceConfig && this.voiceConfig.enabled) {
          const hour = new Date().getHours();
          // 不是强制“必须说晚上好”，而是“排除明显错时”的问候（允许通用问候）
          const greetingFilter = (() => {
            const rx = {
              morning: /(早上|早安|morning|おはよう)/i,
              noon: /(中午|午安|noon|lunch)/i,
              afternoon: /(下午|afternoon)/i,
              evening: /(晚上|晚好|evening|こんばんは)/i,
              night: /(夜深|深夜|夜晚|晚安|night|おやすみ)/i
            };

            let allow = ['morning'];
            if (hour >= 12 && hour < 14) allow = ['noon'];
            else if (hour >= 14 && hour < 18) allow = ['afternoon'];
            else if (hour >= 18 && hour < 22) allow = ['evening', 'night'];
            else if (hour >= 22 || hour < 5) allow = ['night'];
            else if (hour >= 5 && hour < 12) allow = ['morning'];

            const banned = Object.keys(rx)
              .filter((k) => allow.indexOf(k) === -1)
              .map((k) => rx[k]);

            return (voice) => {
              const t = ((voice && voice.text) ? String(voice.text) : '') + ' ' + ((voice && voice.ja) ? String(voice.ja) : '');
              // 不包含时间词的通用问候会通过；包含“错时词”的会被排除
              for (const r of banned) {
                if (r.test(t)) return false;
              }
              return true;
            };
          })();

          const categories = (this.voiceConfig && this.voiceConfig.categories) ? this.voiceConfig.categories : {};
          const candidates = [];
          // 优先尝试更“时间段”语义的分类名（如果作者有这样分）
          if (hour >= 5 && hour < 9) candidates.push('morning');
          else if (hour >= 9 && hour < 12) candidates.push('forenoon', 'morning');
          else if (hour >= 12 && hour < 14) candidates.push('noon');
          else if (hour >= 14 && hour < 18) candidates.push('afternoon');
          else if (hour >= 18 && hour < 22) candidates.push('evening');
          else candidates.push('night');
          // 最后再用通用欢迎类
          candidates.push('welcome', 'greet', 'hello');

          for (const cat of candidates) {
            if (categories && categories[cat] && categories[cat].length) {
              const ok = this.playVoice(cat, {
                filter: greetingFilter
              });
              if (ok) return;
            }
          }

          // 如果没找到匹配时间段的语音，就不要强行放错的语音，退化为文本问候
        }

        // 无语音配置：退化为文本问候
        const hour = new Date().getHours();
        let greeting;
        if (hour >= 5 && hour < 9) greeting = '早上好！新的一天开始啦~';
        else if (hour >= 9 && hour < 12) greeting = '上午好！工作顺利吗？';
        else if (hour >= 12 && hour < 14) greeting = '中午好！记得吃午饭哦~';
        else if (hour >= 14 && hour < 18) greeting = '下午好！继续加油！';
        else if (hour >= 18 && hour < 22) greeting = '晚上好！今天辛苦啦~';
        else greeting = '夜深了，早点休息哦~';

        this.showMessage(greeting, 5000);
        this.playRandomMotion();
      }, 1200);
    }

    setupCanvasEvents() {
      // 点击/触摸模型：触发 click 语音/字幕（或仅文字）
      const handleInteraction = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.touchInteraction('tap');
        if (this.voiceConfig && this.voiceConfig.enabled) {
          this.playVoice('click');
        } else {
          this.showRandomText('click');
          this.playRandomMotion();
        }
      };

      // 双击触发更明显的礼貌动作（按 ATRI 人设）
      this.canvas.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.touchInteraction('manual');
        this.playCanonicalAtriMotion();
      });
      
      // 移动端触摸（避免触发两次）
      let touchHandled = false;
      this.canvas.addEventListener('touchstart', (e) => {
        touchHandled = true;
        handleInteraction(e);
      });
      
      // 如果触摸已处理，跳过点击事件
      this.canvas.addEventListener('click', (e) => {
        if (touchHandled) {
          touchHandled = false;
          return;
        }
        handleInteraction(e);
      });
    }

    attachModelTicker() {
      if (!this.app || !this.app.ticker || !this.model || this._modelTickerHandler) return;
      this._modelTickerHandler = () => {
        if (!this.model || !this.isVisible || document.hidden) return;
        try {
          this.model.update(this.app.ticker.deltaMS);
        } catch (_) {
          // keep silent: model lifecycle can cross with PJAX disposal
        }
      };
      this.app.ticker.add(this._modelTickerHandler);
    }

    setupControls() {
      const ensureElement = (id) => document.getElementById(id);

      const toggleBtn = ensureElement('atri-toggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.isVisible = !this.isVisible;
          this.canvas.style.opacity = this.isVisible ? '1' : '0';
          this.canvas.style.pointerEvents = this.isVisible ? 'auto' : 'none';
          this.showMessage(this.isVisible ? '我回来啦~' : '我先藏起来了~');
          if (this.isVisible && !document.hidden) {
            this._setAppRunning(true);
          } else {
            this.stopTalkingFace();
            this.stopParameterGesture();
            this._setAppRunning(false);
          }
        });
      }

      const photoBtn = ensureElement('atri-photo');
      if (photoBtn) {
        photoBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.takeScreenshot();
        });
      }

      const talkBtn = ensureElement('atri-talk');
      if (talkBtn) {
        talkBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.voiceConfig && this.voiceConfig.enabled) {
            this.playVoice('talk');
          } else {
            this.showRandomText('talk');
            this.playRandomMotion();
          }
        });
      }

      const motionBtn = ensureElement('atri-motion');
      if (motionBtn) {
        motionBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.touchInteraction('manual');
          this.playCanonicalAtriMotion();
        });
      }

      const homeBtn = ensureElement('atri-home');
      if (homeBtn) {
        homeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          localStorage.removeItem('atri_widget_pos');
          this.widget.style.left = '';
          this.widget.style.top = '';
          this.widget.style.right = '20px';
          this.widget.style.bottom = '0';
          this.showMessage('好的，回到原来的位置了~');
        });
      }

      const dragBtn = ensureElement('atri-drag');
      if (dragBtn) {
        const onPointerDown = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();

          const rect = this.widget.getBoundingClientRect();
          const startX = ev.clientX;
          const startY = ev.clientY;
          const startLeft = rect.left;
          const startTop = rect.top;

          // 切换为 left/top 定位
          this.widget.style.right = '';
          this.widget.style.bottom = '';
          this.widget.style.left = startLeft + 'px';
          this.widget.style.top = startTop + 'px';

          const vw = () => window.innerWidth || document.documentElement.clientWidth;
          const vh = () => window.innerHeight || document.documentElement.clientHeight;

          const onMove = (e) => {
            e.preventDefault();
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            const wRect = this.widget.getBoundingClientRect();
            const maxLeft = Math.max(0, vw() - wRect.width);
            const maxTop = Math.max(0, vh() - wRect.height);

            const nextLeft = Math.max(0, Math.min(maxLeft, startLeft + dx));
            const nextTop = Math.max(0, Math.min(maxTop, startTop + dy));

            this.widget.style.left = nextLeft + 'px';
            this.widget.style.top = nextTop + 'px';
          };

          const onUp = (e) => {
            e.preventDefault();
            document.removeEventListener('pointermove', onMove, true);
            document.removeEventListener('pointerup', onUp, true);
            document.removeEventListener('pointercancel', onUp, true);

            const left = parseFloat(this.widget.style.left || '0') || 0;
            const top = parseFloat(this.widget.style.top || '0') || 0;
            localStorage.setItem('atri_widget_pos', JSON.stringify({ left, top }));
          };

          document.addEventListener('pointermove', onMove, true);
          document.addEventListener('pointerup', onUp, true);
          document.addEventListener('pointercancel', onUp, true);
        };

        dragBtn.addEventListener('pointerdown', onPointerDown);
      }

      const volumeBtn = ensureElement('atri-volume');
      if (volumeBtn) {
        // 默认语音音量稍微降低一点（用户反馈偏大声）
        let voiceVolume = parseFloat(localStorage.getItem('atri_voice_volume') || '0.55');
        const updateIcon = (vol) => {
          const icon = volumeBtn.querySelector('i');
          if (!icon) return;
          if (vol === 0) icon.className = 'fa fa-volume-off';
          else if (vol < 0.5) icon.className = 'fa fa-volume-down';
          else icon.className = 'fa fa-volume-up';
        };

        updateIcon(voiceVolume);
        this.setVoiceVolume(voiceVolume);

        volumeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          if (voiceVolume > 0.6) {
            voiceVolume = 0.3;
            this.showMessage('语音音量：30%', 2000);
          } else if (voiceVolume > 0) {
            voiceVolume = 0;
            this.showMessage('语音静音模式', 2000);
          } else {
            voiceVolume = 0.7;
            this.showMessage('语音音量：70%', 2000);
          }

          updateIcon(voiceVolume);
          localStorage.setItem('atri_voice_volume', String(voiceVolume));
          this.setVoiceVolume(voiceVolume);
        });
      }
    }

    hideMessage(version) {
      if (!this.messageBox) return;
      if (typeof version === 'number' && version !== this._messageVersion) return;
      clearTimeout(this.messageTimer);
      this.messageTimer = null;
      this.messageBox.style.display = 'none';
    }

    showMessage(text, duration) {
      if (!this.config.enableMessage || !this.messageBox) return;
      clearTimeout(this.messageTimer);

      const content = this.messageBox.querySelector('.atri-message-content');
      if (!content) return;
      const version = ++this._messageVersion;

      if (typeof text === 'object' && text && text.zh && text.ja) {
        content.innerHTML = `<div class="atri-msg-zh">${text.zh}</div><div class="atri-msg-ja">${text.ja}</div>`;
      } else {
        content.textContent = String(text);
      }

      this.messageBox.style.display = 'block';
      const timeout = duration || this.config.messageTimeout;
      this.messageTimer = setTimeout(() => {
        if (version !== this._messageVersion) return;
        this.hideMessage(version);
      }, timeout);
      return version;
    }

    showRandomText(type) {
      const list = (this.config.messages && this.config.messages[type]) || [];
      if (!list.length) return;
      const msg = list[Math.floor(Math.random() * list.length)];
      this.showMessage(msg, 4000);
    }


    touchInteraction() {
      this._lastInteractionAt = Date.now();
    }

    startIdleMotionLoop() {
      if (this._idleMotionTimer) {
        clearInterval(this._idleMotionTimer);
      }
      this._idleMotionTimer = setInterval(() => {
        if (!this.model || !this.isVisible) return;
        if (document.hidden) return;
        if (this._talkingActive) return;
        if (this.voicePlayer && !this.voicePlayer.paused) return;
        if (Date.now() - this._lastInteractionAt < this.performance.idleCooldown) return;

        const styles = ['gentle', 'think', 'gentle', 'bright'];
        const style = styles[Math.floor(Math.random() * styles.length)];
        this.performAtriMotion(style);
      }, this.performance.idleInterval);
    }

    hasPlayableMotions() {
      if (!this.model || !this.model.internalModel || !this.model.internalModel.motionManager) return false;
      const defs = this.model.internalModel.motionManager.definitions || {};
      const groups = Object.keys(defs);
      return groups.some((name) => defs[name] && defs[name].length);
    }

    pickMotionGroupByKeywords(keywords) {
      if (!this.hasPlayableMotions()) return null;
      const defs = this.model.internalModel.motionManager.definitions || {};
      const groups = Object.keys(defs).filter((name) => defs[name] && defs[name].length);
      if (!groups.length) return null;

      const scored = groups
        .map((group) => {
          const low = String(group).toLowerCase();
          let score = 0;
          for (let i = 0; i < keywords.length; i++) {
            if (low.includes(keywords[i])) {
              score += (keywords.length - i) * 2;
            }
          }
          return { group, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

      return scored.length ? scored[0].group : null;
    }

    performAtriMotion(style) {
      const profile = {
        greet: ['greet', 'hello', 'wave', 'hand', 'tapbody', 'tap', 'idle'],
        gentle: ['idle', 'normal', 'stand', 'tapbody', 'tap'],
        think: ['think', 'question', 'wonder', 'idle', 'tapbody'],
        bright: ['happy', 'smile', 'joy', 'tapbody', 'tap', 'idle']
      };

      const styleName = profile[style] ? style : 'gentle';
      const keywords = profile[styleName];

      if (!this.hasPlayableMotions()) {
        this.performParameterGesture(styleName);
        return;
      }

      const group = this.pickMotionGroupByKeywords(keywords);

      if (!group || !this.model || !this.model.internalModel || !this.model.internalModel.motionManager) {
        this.performParameterGesture(styleName);
        return;
      }

      const defs = this.model.internalModel.motionManager.definitions || {};
      const motions = defs[group] || [];
      if (!motions.length) {
        this.performParameterGesture(styleName);
        return;
      }

      const idx = Math.floor(Math.random() * motions.length);
      try {
        this.model.motion(group, idx);
      } catch (_) {
        this.performParameterGesture(styleName);
      }
    }

    playVoiceByPriority(plan) {
      if (!Array.isArray(plan) || !plan.length) return false;
      for (const item of plan) {
        const category = typeof item === 'string' ? item : item && item.category;
        if (!category) continue;
        const options = item && typeof item === 'object' && item.options ? item.options : {};
        const ok = this.playVoice(category, {
          ...options,
          disableMotion: true
        });
        if (ok) return true;
      }
      return false;
    }

    playCanonicalAtriMotion() {
      const sequence = [
        {
          style: 'greet',
          voicePlan: [
            { category: 'welcome' },
            { category: 'talk' }
          ]
        },
        {
          style: 'gentle',
          voicePlan: [
            { category: 'talk' },
            { category: 'welcome' }
          ]
        },
        {
          style: 'think',
          voicePlan: [
            {
              category: 'talk',
              options: {
                filter: (voice) => {
                  const content = `${voice && voice.text ? voice.text : ''} ${voice && voice.ja ? voice.ja : ''}`;
                  return /[?？]|どう|かな|何/.test(content);
                }
              }
            },
            { category: 'talk' }
          ]
        },
        {
          style: 'bright',
          voicePlan: [
            { category: 'happy' },
            { category: 'talk' }
          ]
        }
      ];

      const item = sequence[this._motionProfileIndex % sequence.length];
      this._motionProfileIndex = (this._motionProfileIndex + 1) % sequence.length;

      this.performAtriMotion(item.style);
      const voiced = this.playVoiceByPriority(item.voicePlan);
      if (!voiced) {
        this.showRandomText(item.style === 'bright' ? 'click' : 'talk');
      }
    }
    playRandomMotion() {
      if (!this.hasPlayableMotions()) {
        this.performParameterGesture('gentle', { duration: 1050 });
        return;
      }
      const defs = this.model.internalModel.motionManager.definitions || {};
      const groups = Object.keys(defs);
      if (!groups.length) {
        this.performParameterGesture('gentle', { duration: 1050 });
        return;
      }

      const preferred = ['TapBody', 'Tap', 'tap_body', 'Idle', 'idle', 'TouchBody', 'touch_body'];
      const shuffled = [...preferred, ...groups].filter((v, i, arr) => arr.indexOf(v) === i);
      for (const group of shuffled) {
        const motions = defs[group];
        if (motions && motions.length) {
          const idx = Math.floor(Math.random() * motions.length);
          try { this.model.motion(group, idx); } catch (_) {}
          return;
        }
      }
      this.performParameterGesture('gentle', { duration: 1050 });
    }

    playTalkingMotion() {
      if (!this.hasPlayableMotions()) {
        this.performParameterGesture('bright', { duration: 950 });
        return;
      }
      const defs = this.model.internalModel.motionManager.definitions || {};
      const groups = ['Talk', 'talk', 'TapBody', 'Tap', 'tap_body'];
      for (const group of groups) {
        const motions = defs[group];
        if (motions && motions.length) {
          const idx = Math.floor(Math.random() * motions.length);
          try { this.model.motion(group, idx); } catch (_) {}
          return;
        }
      }
      this.performParameterGesture('bright', { duration: 950 });
    }

    async initVoicePlayer() {
      try {
        const cdnConfigUrls = [
          '/voice-config.json',
          'https://cdn.jsdelivr.net/gh/Zhouhang9527/atri-voice-data@main/voice-config.json',
          'https://fastly.jsdelivr.net/gh/Zhouhang9527/atri-voice-data@main/voice-config.json',
          'https://gcore.jsdelivr.net/gh/Zhouhang9527/atri-voice-data@main/voice-config.json'
        ];

        const cdnBasePaths = {
          'local': '/voice/atri/',
          'cdn.jsdelivr.net': 'https://cdn.jsdelivr.net/gh/Zhouhang9527/atri-voice-data@main/voice/',
          'fastly.jsdelivr.net': 'https://fastly.jsdelivr.net/gh/Zhouhang9527/atri-voice-data@main/voice/',
          'gcore.jsdelivr.net': 'https://gcore.jsdelivr.net/gh/Zhouhang9527/atri-voice-data@main/voice/'
        };

        const tryUrls = [...cdnConfigUrls];
        let loadedFrom = '';
        let cfg = null;

        for (const url of tryUrls) {
          try {
            const resp = await fetch(url, { cache: 'no-cache' });
            if (!resp.ok) continue;
            cfg = await resp.json();
            loadedFrom = url;
            break;
          } catch (_) {
            // ignore
          }
        }

        if (!cfg) {
          console.warn('[ATRI Voice] 配置加载失败（CDN/本地均不可用），语音禁用');
          return;
        }

        this.voiceConfig = cfg;
        if (typeof this.voiceConfig.enabled === 'undefined') this.voiceConfig.enabled = true;

        // 优先使用配置文件中的 baseUrl
        if (this.voiceConfig.baseUrl) {
          this.voiceConfig.basePath = this.voiceConfig.baseUrl;
        } else {
           const host = (() => { try { return new URL(loadedFrom).host; } catch (_) { return ''; } })();
           this.voiceConfig.basePath = cdnBasePaths[host] || cdnBasePaths['cdn.jsdelivr.net'];
        }

        this.voicePlayer = new Audio();
        // CDN 语音用于 WebAudio 分析口型，需要 CORS
        try { this.voicePlayer.crossOrigin = 'anonymous'; } catch (_) {}
        // 默认音量稍微降低一点（用户反馈偏大声）
        const storedVol = parseFloat(localStorage.getItem('atri_voice_volume') || String(this.voiceConfig.volume || '0.55'));
        this.voicePlayer.volume = Number.isFinite(storedVol) ? storedVol : 0.55;
        this.voiceConfig.volume = this.voicePlayer.volume;

        // 语音播放时联动口型/表情
        this.voicePlayer.addEventListener('play', () => this.startTalkingFace());
        this.voicePlayer.addEventListener('pause', () => this.stopTalkingFace());
        this.voicePlayer.addEventListener('ended', () => this.stopTalkingFace());
        this.voicePlayer.addEventListener('error', () => this.stopTalkingFace());

        console.log('[ATRI Voice] ✓ 配置加载成功:', loadedFrom);
      } catch (e) {
        console.warn('[ATRI Voice] 初始化失败:', e);
      }
    }

    getVoiceSubtitleDuration(fallbackMs) {
      const fallback = Math.max(1200, Number(fallbackMs) || 4000);
      const durationSec = Number(this.voicePlayer && this.voicePlayer.duration);
      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        return fallback;
      }
      const synced = Math.round(durationSec * 1000 + 260);
      return Math.max(1200, Math.min(20000, synced));
    }

    playVoice(category, options) {
      if (!this.voiceConfig || !this.voicePlayer || !this.voiceConfig.enabled) return false;
      const voices = (this.voiceConfig.categories && this.voiceConfig.categories[category]) || [];
      if (!voices.length) {
        console.log(`[ATRI Voice] 类别 "${category}" 没有可用语音`);
        return false;
      }

      let pool = voices;
      const filterFn = options && typeof options === 'object' && typeof options.filter === 'function' ? options.filter : null;
      if (filterFn) {
        const filtered = voices.filter((v) => {
          try { return !!filterFn(v); } catch (_) { return false; }
        });
        if (filtered.length) pool = filtered;
        else return false;
      }

      const voice = pool[Math.floor(Math.random() * pool.length)];
      const voicePath = this.voiceConfig.basePath + voice.file;
      const fallbackDuration = Math.max(1200, Number(options && options.duration) || 4000);
      const subtitlePayload = voice.ja ? { zh: voice.text, ja: voice.ja } : voice.text;
      const showSubtitle = !(options && options.showSubtitle === false);
      let subtitleVersion = 0;

      if (!(options && options.disableMotion)) {
        this.playTalkingMotion();
      }
      this.startTalkingFace();
      this.voicePlayer.pause();
      this.voicePlayer.currentTime = 0;
      this.voicePlayer.src = voicePath;

      if (showSubtitle) {
        subtitleVersion = this.showMessage(subtitlePayload, fallbackDuration);
        const syncSubtitle = () => {
          const syncedDuration = this.getVoiceSubtitleDuration(fallbackDuration);
          subtitleVersion = this.showMessage(subtitlePayload, syncedDuration);
        };

        this.voicePlayer.addEventListener('loadedmetadata', syncSubtitle, { once: true });
        this.voicePlayer.addEventListener('durationchange', syncSubtitle, { once: true });
        this.voicePlayer.addEventListener('ended', () => {
          this.hideMessage(subtitleVersion);
        }, { once: true });
      }

      this.voicePlayer.play().catch((err) => {
        console.log('[ATRI Voice] 播放失败（可能需要用户交互）:', err && err.message ? err.message : err);
        this.stopTalkingFace();
      });

      return true;
    }

    setVoiceVolume(volume) {
      if (!this.voicePlayer) return;
      this.voicePlayer.volume = Math.max(0, Math.min(1, volume));
      if (this.voiceConfig) this.voiceConfig.volume = this.voicePlayer.volume;
    }


    dispose() {
      this.stopTalkingFace();
      this.stopParameterGesture();
      if (this._visibilityHandler) {
        document.removeEventListener('visibilitychange', this._visibilityHandler);
        this._visibilityHandler = null;
      }
      if (this._idleMotionTimer) {
        clearInterval(this._idleMotionTimer);
        this._idleMotionTimer = 0;
      }
      if (this.messageTimer) {
        clearTimeout(this.messageTimer);
        this.messageTimer = null;
      }
      if (this.app) {
        try {
          this._setAppRunning(false);
          if (this._modelTickerHandler && this.app.ticker) {
            this.app.ticker.remove(this._modelTickerHandler);
          }
          this.app.destroy(false, { children: true, texture: false, baseTexture: false });
        } catch (_) {}
        this.app = null;
      }
      this._modelTickerHandler = null;
      this.model = null;
    }
    takeScreenshot() {
      try {
        if (!this.app) return;
        const canvas = this.app.renderer.extract.canvas(this.app.stage);
        canvas.toBlob((blob) => {
          if (!blob) {
            this.showMessage('截图失败，请重试');
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'ATRI_screenshot_' + Date.now() + '.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          this.showMessage('截图保存成功！');
        }, 'image/png');
      } catch (e) {
        console.error('[ATRI] 截图失败:', e);
        this.showMessage('截图失败，请重试');
      }
    }
  }

  try {
    if (window.ATRI && typeof window.ATRI.dispose === 'function') {
      window.ATRI.dispose();
    }
    const widget = document.getElementById('atri-live2d-widget');
    if (widget) {
      widget.classList.remove('is-ready');
    }
    const atri = new ATRILive2D(CONFIG);
    await atri.init();
    window.ATRI = atri;
    if (widget) {
      requestAnimationFrame(() => {
        widget.classList.add('is-ready');
      });
    }
  } catch (e) {
    console.error('[ATRI] 初始化失败:', e);
  } finally {
    window.__ginkaAtriBooting = false;
  }
})();
