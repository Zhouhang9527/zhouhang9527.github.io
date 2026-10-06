// ===================================================
// GINKA Blog - 智能懒加载器
// 用于优化大型资源的加载时机
// ===================================================

(function() {
  'use strict';

  const LazyLoader = {
    // 加载状态追踪
    loadedScripts: new Set(),
    loadingScripts: new Map(),

    /**
     * 动态加载脚本
     * @param {string} src - 脚本 URL
     * @param {Object} options - 加载选项
     * @returns {Promise}
     */
    loadScript: function(src, options = {}) {
      // 如果已加载，直接返回
      if (this.loadedScripts.has(src)) {
        return Promise.resolve();
      }

      // 如果正在加载，返回现有 Promise
      if (this.loadingScripts.has(src)) {
        return this.loadingScripts.get(src);
      }

      const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = options.async !== false;
        script.defer = options.defer || false;
        
        if (options.module) {
          script.type = 'module';
        }

        script.onload = () => {
          this.loadedScripts.add(src);
          this.loadingScripts.delete(src);
          console.log(`[LazyLoader] Loaded: ${src}`);
          resolve();
        };

        script.onerror = () => {
          this.loadingScripts.delete(src);
          console.error(`[LazyLoader] Failed to load: ${src}`);
          reject(new Error(`Failed to load script: ${src}`));
        };

        document.head.appendChild(script);
      });

      this.loadingScripts.set(src, promise);
      return promise;
    },

    /**
     * 批量加载脚本（按顺序）
     * @param {Array} scripts - 脚本 URL 数组
     * @returns {Promise}
     */
    loadScriptsSequential: function(scripts) {
      return scripts.reduce((promise, src) => {
        return promise.then(() => this.loadScript(src));
      }, Promise.resolve());
    },

    /**
     * 批量加载脚本（并行）
     * @param {Array} scripts - 脚本 URL 数组
     * @returns {Promise}
     */
    loadScriptsParallel: function(scripts) {
      return Promise.all(scripts.map(src => this.loadScript(src)));
    },

    /**
     * 加载样式表
     * @param {string} href - 样式表 URL
     * @returns {Promise}
     */
    loadStylesheet: function(href) {
      return new Promise((resolve, reject) => {
        // 检查是否已加载
        const existing = document.querySelector(`link[href="${href}"]`);
        if (existing) {
          resolve();
          return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        
        link.onload = () => {
          console.log(`[LazyLoader] Loaded CSS: ${href}`);
          resolve();
        };
        
        link.onerror = () => {
          console.error(`[LazyLoader] Failed to load CSS: ${href}`);
          reject(new Error(`Failed to load stylesheet: ${href}`));
        };

        document.head.appendChild(link);
      });
    },

    /**
     * 延迟加载 ATRI Live2D（仅在需要时加载）
     * @returns {Promise}
     */
    loadATRI: function() {
      console.log('[LazyLoader] Loading ATRI Live2D...');
      
      // 按依赖顺序加载
      return this.loadScriptsSequential([
        '/js/pixi.min.js',
        '/js/live2dcubismcore.min.js',
        '/js/live2d.min.js',
        '/js/pixi-live2d-display.min.js',
        '/js/ginka-atri.js'
      ]).then(() => {
        console.log('[LazyLoader] ATRI Live2D loaded successfully');
        // 触发自定义事件
        document.dispatchEvent(new CustomEvent('atri:loaded'));
      }).catch(err => {
        console.error('[LazyLoader] Failed to load ATRI:', err);
      });
    },

    /**
     * 延迟加载音乐播放器
     * @returns {Promise}
     */
    loadMusic: function() {
      console.log('[LazyLoader] Loading Music Player...');
      
      return this.loadScript('/js/ginka-music.js').then(() => {
        console.log('[LazyLoader] Music Player loaded successfully');
        document.dispatchEvent(new CustomEvent('music:loaded'));
      });
    },

    /**
     * 延迟加载页面特效
     * @returns {Promise}
     */
    loadPageEffects: function() {
      console.log('[LazyLoader] Loading Page Effects...');
      
      return this.loadScript('/js/ginka-page-effects.js').then(() => {
        console.log('[LazyLoader] Page Effects loaded successfully');
        document.dispatchEvent(new CustomEvent('effects:loaded'));
      });
    },

    /**
     * 根据用户交互智能加载资源
     */
    smartLoad: function() {
      const self = this;
      
      // 策略 1: 空闲时加载非关键资源
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          // 空闲时加载页面特效
          self.loadPageEffects();
        }, { timeout: 2000 });

        requestIdleCallback(() => {
          // 空闲时加载音乐播放器
          self.loadMusic();
        }, { timeout: 3000 });
      } else {
        // 降级方案：延迟加载
        setTimeout(() => self.loadPageEffects(), 2000);
        setTimeout(() => self.loadMusic(), 3000);
      }

      // 策略 2: 用户交互后加载 ATRI
      let atriLoadTriggered = false;
      const triggerATRILoad = () => {
        if (atriLoadTriggered) return;
        atriLoadTriggered = true;
        
        // 添加短暂延迟，避免阻塞交互
        setTimeout(() => self.loadATRI(), 500);
      };

      // 首次滚动时加载
      let scrolled = false;
      window.addEventListener('scroll', () => {
        if (!scrolled && window.scrollY > 100) {
          scrolled = true;
          triggerATRILoad();
        }
      }, { passive: true, once: true });

      // 或者 3 秒后自动加载
      setTimeout(triggerATRILoad, 3000);
    },

    /**
     * 预加载关键资源
     */
    preloadCritical: function() {
      const resources = [
        { url: '/css/ginka-custom.css', as: 'style' },
        { url: '/js/ginka-main.js', as: 'script' }
      ];

      resources.forEach(res => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = res.url;
        link.as = res.as;
        if (res.as === 'script') {
          link.crossOrigin = 'anonymous';
        }
        document.head.appendChild(link);
      });
    },

    /**
     * 初始化懒加载器
     */
    init: function() {
      console.log('[LazyLoader] Initializing...');
      
      // 预加载关键资源
      this.preloadCritical();
      
      // 页面加载完成后开始智能加载
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.smartLoad();
        });
      } else {
        this.smartLoad();
      }
    }
  };

  // 暴露到全局
  window.GinkaLazyLoader = LazyLoader;

  // 自动初始化
  LazyLoader.init();

})();
