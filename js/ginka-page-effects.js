(function () {
  'use strict';

  function matches(query) {
    try {
      return !!(window.matchMedia && window.matchMedia(query).matches);
    } catch (_error) {
      return false;
    }
  }

  function getGsap() {
    return window.gsap || null;
  }

  function getScrollTrigger() {
    return window.ScrollTrigger || null;
  }

  function ensureGsapPlugins() {
    var gsapApi = getGsap();
    var scrollTriggerApi = getScrollTrigger();
    if (!gsapApi || !scrollTriggerApi || window.__ginkaGsapPluginsReady) return;
    try {
      gsapApi.registerPlugin(scrollTriggerApi);
      window.__ginkaGsapPluginsReady = true;
    } catch (_error) {
      // keep silent and fall back to native behavior
    }
  }

  function prefersReducedMotion() {
    return matches('(prefers-reduced-motion: reduce)');
  }

  function isTouchDevice() {
    return matches('(hover: none) and (pointer: coarse)');
  }

  ensureGsapPlugins();

  (function initTitleReaction() {
    var originTitle = document.title;
    var titleTimer = 0;
    var gsapApi = getGsap();
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
        if (gsapApi) {
          gsapApi.killTweensOf(document, 'ginkaTitleReset');
        }
        clearTimeout(titleTimer);
        return;
      }

      document.title = '(ฅ>ω<*ฅ) 噫又好啦 ~ ' + originTitle;
      clearTimeout(titleTimer);
      titleTimer = setTimeout(function () {
        document.title = originTitle;
      }, 2000);
    });
  })();

  (function initOpeningSequence() {
    var OPENING_FORCE_ALWAYS = false;
    var OPENING_VERSION = 'opening-v2-gsap';
    var OPENING_DATE_KEY = 'ginka:opening:last-date';
    var OPENING_VERSION_KEY = 'ginka:opening:version';
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
        // ignore storage failures
      }
    }

    function shouldPlayByDateAndVersion() {
      var today = getTodayKey();
      var savedDate = safeStorageGet(OPENING_DATE_KEY);
      var savedVersion = safeStorageGet(OPENING_VERSION_KEY);
      return !(savedDate === today && savedVersion === OPENING_VERSION);
    }

    function markPlayedToday() {
      safeStorageSet(OPENING_DATE_KEY, getTodayKey());
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

    function cleanupOpening(node) {
      var gsapApi = getGsap();
      if (gsapApi && node) {
        gsapApi.killTweensOf(node.querySelectorAll('*'));
        gsapApi.killTweensOf(node);
      }
      document.body.classList.remove('is-opening-active');
      document.body.classList.remove('is-opening-leaving');
      document.body.classList.remove('is-opening-preparing');
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }

    function runOpeningFallback(node, options) {
      var timers = [];
      var fadeInMs = options.fadeInMs;
      var centerFadeOutMs = options.centerFadeOutMs;
      var curtainMs = options.curtainMs;
      var reduceMotion = options.reduceMotion;
      var holdMs = 110;

      document.body.classList.add('is-opening-preparing');
      document.body.appendChild(node);
      document.body.classList.add('is-opening-active');

      requestAnimationFrame(function () {
        node.classList.add('is-visible');
        requestAnimationFrame(function () {
          document.body.classList.remove('is-opening-preparing');
        });
      });

      timers.push(setTimeout(function () {
        node.classList.add('is-center-fading');
        document.body.classList.add('is-opening-leaving');
      }, fadeInMs + holdMs));

      if (!reduceMotion) {
        timers.push(setTimeout(function () {
          node.classList.add('is-curtain-open');
        }, fadeInMs + holdMs + centerFadeOutMs + 60));
      }

      timers.push(setTimeout(function () {
        timers.forEach(function (timer) { clearTimeout(timer); });
        cleanupOpening(node);
      }, reduceMotion ? (fadeInMs + centerFadeOutMs + 180) : (fadeInMs + centerFadeOutMs + curtainMs + 260)));
    }

    function runOpening() {
      if (!document.body || window.__ginkaOpeningRuntimePlayed) return;
      if (!OPENING_FORCE_ALWAYS && !shouldPlayByDateAndVersion()) return;

      window.__ginkaOpeningRuntimePlayed = true;
      if (!OPENING_FORCE_ALWAYS) {
        markPlayedToday();
      }

      var reduceMotion = prefersReducedMotion();
      var mobile = isTouchDevice();
      var fadeInMs = reduceMotion ? 120 : (mobile ? 680 : 980);
      var centerFadeOutMs = reduceMotion ? 120 : (mobile ? 320 : 460);
      var curtainMs = reduceMotion ? 0 : (mobile ? 520 : 760);
      var node = createOpeningNode();
      var gsapApi = getGsap();

      document.body.classList.add('is-opening-preparing');
      document.body.appendChild(node);
      document.body.classList.add('is-opening-active');

      if (!gsapApi) {
        runOpeningFallback(node, {
          fadeInMs: fadeInMs,
          centerFadeOutMs: centerFadeOutMs,
          curtainMs: curtainMs,
          reduceMotion: reduceMotion
        });
        return;
      }

      var center = node.querySelector('.ginka-opening__center');
      var seam = node.querySelector('.ginka-opening__seam');
      var curtains = node.querySelectorAll('.ginka-opening__curtain');
      var holdSeconds = reduceMotion ? 0.08 : 0.14;

      gsapApi.set(node, { autoAlpha: 1 });
      gsapApi.set(center, {
        autoAlpha: 0,
        yPercent: 3,
        scale: 0.985,
        force3D: true
      });
      gsapApi.set(seam, {
        autoAlpha: 0.88,
        transformOrigin: '50% 50%'
      });
      gsapApi.set(curtains, {
        yPercent: 0,
        force3D: true
      });

      document.body.classList.remove('is-opening-preparing');

      gsapApi.timeline({
        defaults: {
          ease: 'power3.out',
          overwrite: 'auto'
        },
        onComplete: function () {
          cleanupOpening(node);
        }
      })
        .to(center, {
          autoAlpha: 1,
          yPercent: 0,
          scale: 1,
          duration: fadeInMs / 1000
        }, 0)
        .to(seam, {
          autoAlpha: 1,
          duration: Math.max(0.18, fadeInMs / 1500)
        }, 0.04)
        .add(function () {
          document.body.classList.add('is-opening-leaving');
        }, holdSeconds + (fadeInMs / 1000))
        .to(center, {
          autoAlpha: 0,
          yPercent: -4,
          scale: 0.968,
          duration: centerFadeOutMs / 1000
        }, holdSeconds + (fadeInMs / 1000))
        .to(seam, {
          autoAlpha: 0,
          scaleX: 0.86,
          duration: Math.max(0.16, centerFadeOutMs / 1200)
        }, '<')
        .to(curtains[0], {
          yPercent: reduceMotion ? 0 : -103,
          duration: curtainMs / 1000,
          ease: 'power2.inOut'
        }, reduceMotion ? '>' : '>-0.02')
        .to(curtains[1], {
          yPercent: reduceMotion ? 0 : 103,
          duration: curtainMs / 1000,
          ease: 'power2.inOut'
        }, '<')
        .to(node, {
          autoAlpha: 0,
          duration: reduceMotion ? 0.08 : 0.18
        }, reduceMotion ? '>' : '>-0.02');
    }

    if (document.body) {
      runOpening();
    } else if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runOpening, { once: true });
    } else {
      runOpening();
    }
  })();

  (function initGsapReveals() {
    function cleanupReveals() {
      if (window.__ginkaRevealMatchMedia) {
        window.__ginkaRevealMatchMedia.revert();
        window.__ginkaRevealMatchMedia = null;
      }
    }

    function initReveals() {
      var gsapApi = getGsap();
      var scrollTriggerApi = getScrollTrigger();
      ensureGsapPlugins();

      cleanupReveals();
      if (!gsapApi || !scrollTriggerApi) return;

      var mm = gsapApi.matchMedia();
      mm.add({
        isDesktop: '(min-width: 769px)',
        isMobile: '(max-width: 768px)',
        reduceMotion: '(prefers-reduced-motion: reduce)'
      }, function (context) {
        var conditions = context.conditions || {};
        var reduceMotion = !!conditions.reduceMotion;
        var isDesktop = !!conditions.isDesktop;

        if (reduceMotion) {
          gsapApi.set('.main-inner.index .post-block, .post-header, .post-body, .comments', { clearProps: 'all' });
          return;
        }

        var cards = gsapApi.utils.toArray('.main-inner.index .post-block');
        if (cards.length) {
          gsapApi.set(cards, {
            autoAlpha: 0,
            y: isDesktop ? 22 : 12,
            willChange: 'transform, opacity'
          });

          scrollTriggerApi.batch(cards, {
            once: true,
            start: isDesktop ? 'top 88%' : 'top 94%',
            interval: 0.08,
            batchMax: isDesktop ? 4 : 2,
            onEnter: function (batch) {
              gsapApi.to(batch, {
                autoAlpha: 1,
                y: 0,
                duration: isDesktop ? 0.72 : 0.5,
                ease: 'power3.out',
                overwrite: 'auto',
                stagger: {
                  each: isDesktop ? 0.08 : 0.05,
                  from: 'start'
                },
                clearProps: 'willChange'
              });
            }
          });
        }

        var articleParts = gsapApi.utils.toArray('.post-header, .post-body, .comments');
        if (articleParts.length) {
          gsapApi.fromTo(articleParts, {
            autoAlpha: 0,
            y: isDesktop ? 18 : 10
          }, {
            autoAlpha: 1,
            y: 0,
            duration: isDesktop ? 0.58 : 0.42,
            ease: 'power2.out',
            overwrite: 'auto',
            stagger: isDesktop ? 0.06 : 0.04
          });
        }

        var sidebar = document.querySelector('.sidebar-inner');
        if (sidebar && sidebar.dataset.ginkaSidebarAnimated !== '1') {
          sidebar.dataset.ginkaSidebarAnimated = '1';
          gsapApi.fromTo(sidebar, {
            autoAlpha: 0,
            x: isDesktop ? 18 : 0
          }, {
            autoAlpha: 1,
            x: 0,
            duration: isDesktop ? 0.5 : 0.3,
            ease: 'power2.out',
            overwrite: 'auto'
          });
        }

        setTimeout(function () {
          if (scrollTriggerApi && typeof scrollTriggerApi.refresh === 'function') {
            scrollTriggerApi.refresh();
          }
        }, 60);
      });

      window.__ginkaRevealMatchMedia = mm;
    }

    function scheduleInit() {
      var runtime = window.GINKA_RUNTIME;
      if (runtime && typeof runtime.scheduleBackgroundTask === 'function') {
        runtime.scheduleBackgroundTask('ginka-scroll-reveal', initReveals, {
          timeout: 1400,
          requireInteraction: false
        });
        return;
      }
      setTimeout(initReveals, 120);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scheduleInit, { once: true });
    } else {
      scheduleInit();
    }

    document.addEventListener('pjax:complete', function () {
      setTimeout(initReveals, 80);
    });
  })();

  (function initClickRipple() {
    if (prefersReducedMotion() || isTouchDevice()) return;

    var lastRippleAt = 0;
    document.addEventListener('click', function (event) {
      var gsapApi = getGsap();
      var target = event.target;
      var now = Date.now();
      if (now - lastRippleAt < 110) return;
      if (!target) return;
      if (target.closest('input, textarea, select, iframe, .giscus, .tk-content')) return;
      lastRippleAt = now;

      var ripple = document.createElement('div');
      ripple.className = 'click-ripple';
      document.body.appendChild(ripple);

      if (!gsapApi) {
        ripple.style.left = event.clientX + 'px';
        ripple.style.top = event.clientY + 'px';
        ripple.style.opacity = '0.75';
        ripple.style.transform = 'translate(-50%, -50%) scale(0)';
        requestAnimationFrame(function () {
          ripple.style.opacity = '0';
          ripple.style.transform = 'translate(-50%, -50%) scale(3)';
        });
        setTimeout(function () {
          ripple.remove();
        }, 550);
        return;
      }

      gsapApi.set(ripple, {
        left: event.clientX,
        top: event.clientY,
        xPercent: -50,
        yPercent: -50,
        scale: 0,
        autoAlpha: 0.68,
        force3D: true
      });

      gsapApi.to(ripple, {
        scale: 3,
        autoAlpha: 0,
        duration: 0.52,
        ease: 'power2.out',
        overwrite: 'auto',
        onComplete: function () {
          ripple.remove();
        }
      });
    });
  })();

  (function initLikeDislikeBridge() {
    var dislikeSelector = '.tk-action-icon.__dislike, .vdown, .dislike-btn, .post-dislike-btn';
    var likeSelector = '.tk-action-icon.__like, .vup, .like-btn, .reward-button, .post-like-btn';

    document.addEventListener('click', function (event) {
      var target = event.target;
      var atri = window.atri;
      if (!target || !atri || !atri.showMessage) return;

      if (target.closest(dislikeSelector)) {
        var playedDislike = atri.playVoice ? atri.playVoice('angry') : false;
        if (!playedDislike) {
          atri.showMessage('呜...为什么要点踩呢...是我哪里做得不好吗？(｡•́︿•̀｡)', 4000);
          if (atri.playRandomMotion) atri.playRandomMotion();
        }
        return;
      }

      if (target.closest(likeSelector)) {
        var playedLike = atri.playVoice ? atri.playVoice('happy') : false;
        if (!playedLike) {
          atri.showMessage('哇！谢谢你的喜欢！我会继续加油的！(≧∇≦)ﾉ', 4000);
          if (atri.playRandomMotion) atri.playRandomMotion();
        }
      }
    });
  })();

  (function initImageOptimization() {
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

    document.addEventListener('pjax:complete', optimizeImages);
  })();

  (function initPjaxLoader() {
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

    function getMainInner() {
      return document.querySelector('.main-inner');
    }

    function animateMainInner(y, alpha, duration) {
      var gsapApi = getGsap();
      var mainInner = getMainInner();
      if (!gsapApi || !mainInner) return;
      gsapApi.to(mainInner, {
        y: y,
        autoAlpha: alpha,
        duration: duration,
        ease: 'power2.out',
        overwrite: 'auto'
      });
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
        var gsapApi = getGsap();
        var node = ensureLoader();
        if (!node) return;

        node.classList.add('is-visible');
        document.body.classList.add('is-page-loading');
        document.body.classList.add('is-pjax-loading');
        document.body.classList.remove('is-pjax-enter');
        visible = true;
        enterAt = Date.now();

        if (gsapApi) {
          gsapApi.to(node, {
            autoAlpha: 1,
            duration: 0.26,
            ease: 'power2.out',
            overwrite: 'auto'
          });
          animateMainInner(8, 0.72, 0.26);
        }
      }, SHOW_DELAY_MS);
    }

    function markPjaxEnter() {
      var gsapApi = getGsap();
      clearTimeout(pjaxEnterTimer);
      document.body.classList.remove('is-pjax-loading');
      document.body.classList.add('is-pjax-enter');

      if (gsapApi) {
        var mainInner = getMainInner();
        if (mainInner) {
          gsapApi.fromTo(mainInner, {
            y: 12,
            autoAlpha: 0.78
          }, {
            y: 0,
            autoAlpha: 1,
            duration: 0.42,
            ease: 'power3.out',
            overwrite: 'auto'
          });
        }
      } else {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            document.body.classList.remove('is-pjax-enter');
          });
        });
      }

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
        var gsapApi = getGsap();
        var node = ensureLoader();
        if (!node) return;

        if (gsapApi) {
          gsapApi.to(node, {
            autoAlpha: 0,
            duration: force ? 0.12 : 0.24,
            ease: 'power2.out',
            overwrite: 'auto',
            onComplete: function () {
              node.classList.remove('is-visible');
            }
          });
        } else {
          node.classList.remove('is-visible');
        }

        document.body.classList.remove('is-page-loading');
        if (!force) {
          markPjaxEnter();
        } else {
          document.body.classList.remove('is-pjax-loading');
          document.body.classList.remove('is-pjax-enter');
          animateMainInner(0, 1, 0.18);
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
})();
