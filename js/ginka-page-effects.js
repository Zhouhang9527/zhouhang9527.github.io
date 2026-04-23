(function () {
  var originTitle = document.title;
  var titleTime;

  var titleNode = document.querySelector('title');
  if (titleNode) {
    var titleObserver = new MutationObserver(function () {
      if (!document.hidden) {
        originTitle = document.title;
      }
    });
    titleObserver.observe(titleNode, { childList: true });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      document.title = '╭(°A°`)╮ 页面崩溃啦 ~';
      clearTimeout(titleTime);
    } else {
      document.title = '(ฅ>ω<*ฅ) 噫又好啦 ~ ' + originTitle;
      titleTime = setTimeout(function () {
        document.title = originTitle;
      }, 2000);
    }
  });
})();

(function () {
  var OPENING_FORCE_ALWAYS = true;
  var OPENING_VERSION = 'opening-v1';
  var OPENING_DATE_KEY = 'ginka:opening:last-date';
  var OPENING_VERSION_KEY = 'ginka:opening:version';
  var DESKTOP_FADE_IN_MS = 1000;
  var DESKTOP_CENTER_FADE_OUT_MS = 500;
  var DESKTOP_CURTAIN_MS = 800;
  var MOBILE_FADE_IN_MS = 700;
  var MOBILE_CENTER_FADE_OUT_MS = 350;
  var MOBILE_CURTAIN_MS = 560;
  var REDUCED_MOTION_MS = 120;
  var REDUCED_MOTION_HOLD_MS = 90;
  var TITLE_TEXT = '欢迎来到mm9527的博客';

  function getRootPath() {
    var root = window.CONFIG && typeof window.CONFIG.root === 'string' ? window.CONFIG.root : '/';
    return root.endsWith('/') ? root : (root + '/');
  }

  function getFallbackAvatarSrc() {
    return getRootPath() + 'images/avatar.png';
  }

  function pad2(num) {
    return num < 10 ? ('0' + num) : String(num);
  }

  function getTodayKey() {
    var now = new Date();
    return now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
  }

  function safeStorageGet(key) {
    try {
      return window.localStorage ? localStorage.getItem(key) : null;
    } catch (_error) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      if (window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (_error) {
      // keep silent
    }
  }

  function shouldPlayByDateAndVersion() {
    var today = getTodayKey();
    var savedDate = safeStorageGet(OPENING_DATE_KEY);
    var savedVersion = safeStorageGet(OPENING_VERSION_KEY);
    return !(savedDate === today && savedVersion === OPENING_VERSION);
  }

  function markPlayedToday() {
    var today = getTodayKey();
    safeStorageSet(OPENING_DATE_KEY, today);
    safeStorageSet(OPENING_VERSION_KEY, OPENING_VERSION);
  }

  function resolveAvatarSrc() {
    var avatar = document.querySelector('.site-author-image');
    if (avatar) {
      var src = avatar.getAttribute('src') || avatar.getAttribute('data-src') || avatar.currentSrc;
      if (src && src.trim()) return src.trim();
    }
    return getFallbackAvatarSrc();
  }

  function cleanupOpening(node, timers) {
    timers.forEach(function (timer) {
      clearTimeout(timer);
    });
    document.body.classList.remove('is-opening-active');
    document.body.classList.remove('is-opening-leaving');
    document.body.classList.remove('is-opening-preparing');
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  function createOpeningNode() {
    var wrapper = document.createElement('div');
    wrapper.className = 'ginka-opening';
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.innerHTML = [
      '<div class="ginka-opening__curtain ginka-opening__curtain--top"></div>',
      '<div class="ginka-opening__curtain ginka-opening__curtain--bottom"></div>',
      '<div class="ginka-opening__seam"></div>',
      '<div class="ginka-opening__center">',
      '  <img class="ginka-opening__avatar" alt="mm9527 avatar">',
      '  <div class="ginka-opening__title"></div>',
      '</div>'
    ].join('');

    var avatar = wrapper.querySelector('.ginka-opening__avatar');
    var title = wrapper.querySelector('.ginka-opening__title');
    avatar.src = resolveAvatarSrc();
    avatar.onerror = function () {
      this.onerror = null;
      this.src = getFallbackAvatarSrc();
    };
    title.textContent = TITLE_TEXT;
    return wrapper;
  }

  function runOpening() {
    if (!document.body || window.__ginkaOpeningRuntimePlayed) return;
    if (!OPENING_FORCE_ALWAYS && !shouldPlayByDateAndVersion()) return;

    window.__ginkaOpeningRuntimePlayed = true;
    if (!OPENING_FORCE_ALWAYS) {
      markPlayedToday();
    }

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isMobile = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    var fadeInMs = isMobile ? MOBILE_FADE_IN_MS : DESKTOP_FADE_IN_MS;
    var centerFadeOutMs = isMobile ? MOBILE_CENTER_FADE_OUT_MS : DESKTOP_CENTER_FADE_OUT_MS;
    var curtainMs = isMobile ? MOBILE_CURTAIN_MS : DESKTOP_CURTAIN_MS;

    if (reduceMotion) {
      fadeInMs = REDUCED_MOTION_MS;
      centerFadeOutMs = REDUCED_MOTION_MS;
      curtainMs = 0;
    }

    var openingNode = createOpeningNode();
    var timers = [];
    document.body.classList.add('is-opening-preparing');
    document.body.appendChild(openingNode);
    document.body.classList.add('is-opening-active');

    requestAnimationFrame(function () {
      openingNode.classList.add('is-visible');
      requestAnimationFrame(function () {
        if (document.body) {
          document.body.classList.remove('is-opening-preparing');
        }
      });
    });

    timers.push(setTimeout(function () {
      openingNode.classList.add('is-center-fading');
      document.body.classList.add('is-opening-leaving');
    }, fadeInMs + REDUCED_MOTION_HOLD_MS));

    if (!reduceMotion) {
      timers.push(setTimeout(function () {
        openingNode.classList.add('is-curtain-open');
      }, fadeInMs + REDUCED_MOTION_HOLD_MS + centerFadeOutMs + 80));
    }

    var cleanupDelay = reduceMotion
      ? (fadeInMs + REDUCED_MOTION_HOLD_MS + centerFadeOutMs + 80)
      : (fadeInMs + REDUCED_MOTION_HOLD_MS + centerFadeOutMs + curtainMs + 220);

    timers.push(setTimeout(function () {
      cleanupOpening(openingNode, timers);
    }, cleanupDelay));
  }

  function init() {
    if (window.__ginkaOpeningInitBound) return;
    window.__ginkaOpeningInitBound = true;
    runOpening();
  }

  if (document.body) {
    init();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouchDevice = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (reduceMotion || isTouchDevice) return;

  var lastRippleAt = 0;
  document.addEventListener('click', function (e) {
    var now = Date.now();
    if (now - lastRippleAt < 90) return;
    lastRippleAt = now;

    var ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = e.clientX + 'px';
    ripple.style.top = e.clientY + 'px';
    document.body.appendChild(ripple);

    ripple.addEventListener('animationend', function () {
      ripple.remove();
    });
  });
})();

(function () {
  var dislikeSelector = '.tk-action-icon.__dislike, .vdown, .dislike-btn, .post-dislike-btn';
  var likeSelector = '.tk-action-icon.__like, .vup, .like-btn, .reward-button, .post-like-btn';

  document.addEventListener('click', function (e) {
    var target = e.target;
    var atri = window.atri;
    if (!target || !atri || !atri.showMessage) return;

    if (target.closest(dislikeSelector)) {
      var played1 = atri.playVoice ? atri.playVoice('angry') : false;
      if (!played1) {
        atri.showMessage('呜...为什么要点踩呢...是我哪里做得不好吗？(｡•́︿•̀｡)', 4000);
        if (atri.playRandomMotion) atri.playRandomMotion();
      }
      return;
    }

    if (target.closest(likeSelector)) {
      var played2 = atri.playVoice ? atri.playVoice('happy') : false;
      if (!played2) {
        atri.showMessage('哇！谢谢你的喜欢！我会继续加油的！(≧∇≦)ﾉ', 4000);
        if (atri.playRandomMotion) atri.playRandomMotion();
      }
      return;
    }
  });
})();

(function () {
  function optimizeImages() {
    var images = document.querySelectorAll('img');
    if (!images || !images.length) return;

    images.forEach(function (img) {
      if (!img || img.dataset.ginkaOptimized === '1') return;
      img.dataset.ginkaOptimized = '1';

      if (!img.decoding) {
        img.decoding = 'async';
      }

      if (img.closest('#atri-live2d-widget')) return;

      var rect = img.getBoundingClientRect();
      var inFirstScreen = rect.top > -120 && rect.top < window.innerHeight * 1.2;
      if (!inFirstScreen) {
        if (!img.loading) img.loading = 'lazy';
        if (!img.fetchPriority) img.fetchPriority = 'low';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', optimizeImages, { once: true });
  } else {
    optimizeImages();
  }
})();

(function () {
  var SHOW_DELAY_MS = 60;
  var MIN_VISIBLE_MS = 320;
  var PJAX_ENTER_CLEANUP_MS = 550;

  var loaderNode = null;
  var showTimer = 0;
  var hideTimer = 0;
  var pjaxEnterTimer = 0;
  var enterAt = 0;
  var visible = false;

  function ensureLoader() {
    if (loaderNode && loaderNode.isConnected) return loaderNode;
    loaderNode = document.querySelector('.ginka-loader');
    if (loaderNode) return loaderNode;
    if (!document.body) return null;

    loaderNode = document.createElement('div');
    loaderNode.className = 'ginka-loader';
    loaderNode.setAttribute('aria-hidden', 'true');
    document.body.appendChild(loaderNode);
    return loaderNode;
  }

  function showLoader() {
    clearTimeout(hideTimer);
    clearTimeout(showTimer);
    if (visible) return;
    if (document.body && (
      document.body.classList.contains('is-opening-active') ||
      document.body.classList.contains('is-opening-leaving')
    )) return;

    showTimer = setTimeout(function () {
      var node = ensureLoader();
      if (!node) return;
      node.classList.add('is-visible');
      document.body.classList.add('is-page-loading');
      document.body.classList.add('is-pjax-loading');
      document.body.classList.remove('is-pjax-enter');
      visible = true;
      enterAt = Date.now();
    }, SHOW_DELAY_MS);
  }

  function markPjaxEnter() {
    if (!document.body) return;
    clearTimeout(pjaxEnterTimer);
    document.body.classList.remove('is-pjax-loading');
    document.body.classList.add('is-pjax-enter');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.body.classList.remove('is-pjax-enter');
      });
    });
    pjaxEnterTimer = setTimeout(function () {
      document.body.classList.remove('is-pjax-enter');
    }, PJAX_ENTER_CLEANUP_MS);
  }

  function hideLoader(force) {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);

    var elapsed = Date.now() - enterAt;
    var wait = force ? 0 : Math.max(0, MIN_VISIBLE_MS - elapsed);

    hideTimer = setTimeout(function () {
      var node = ensureLoader();
      if (!node) return;
      node.classList.remove('is-visible');
      document.body.classList.remove('is-page-loading');
      if (!force) {
        markPjaxEnter();
      } else {
        document.body.classList.remove('is-pjax-loading');
        document.body.classList.remove('is-pjax-enter');
      }
      visible = false;
    }, wait);
  }

  function bindPageEvents() {
    document.addEventListener('pjax:send', function () {
      if (document.body && (
        document.body.classList.contains('is-opening-active') ||
        document.body.classList.contains('is-opening-leaving')
      )) return;
      document.body.classList.add('is-pjax-loading');
      document.body.classList.remove('is-pjax-enter');
      showLoader();
    });

    document.addEventListener('pjax:complete', function () {
      hideLoader(false);
    });

    document.addEventListener('pjax:error', function () {
      document.body.classList.remove('is-pjax-loading');
      document.body.classList.remove('is-pjax-enter');
      hideLoader(true);
    });

    window.addEventListener('beforeunload', function () {
      showLoader();
    });

    window.addEventListener('load', function () {
      hideLoader(true);
    }, { once: true });
  }

  function init() {
    ensureLoader();
    hideLoader(true);
    bindPageEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
