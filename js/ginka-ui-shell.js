(function () {
  'use strict';

  if (window.__ginkaUiShellBooted) return;
  window.__ginkaUiShellBooted = true;

  var runtime = window.GINKA_RUNTIME || null;

  function matches(query) {
    try {
      return !!(window.matchMedia && window.matchMedia(query).matches);
    } catch (_error) {
      return false;
    }
  }

  function isTouchOnly() {
    return matches('(hover: none) and (pointer: coarse)');
  }

  function isReducedMotion() {
    return matches('(prefers-reduced-motion: reduce)');
  }

  function isLowPower() {
    return !!(runtime && runtime.isLowPower);
  }

  function scheduleBackgroundTask(name, task, options) {
    if (runtime && typeof runtime.scheduleBackgroundTask === 'function') {
      runtime.scheduleBackgroundTask(name, task, options || {});
      return;
    }

    window.setTimeout(task, Math.max(300, Number(options && options.timeout) || 1200));
  }

  function bindSidebarAutoCollapse() {
    if (window.__ginkaSidebarAutoCollapseBound) return;
    window.__ginkaSidebarAutoCollapseBound = true;

    var edgeTriggerPx = 30;
    var autoHideDelay = isLowPower() ? 900 : 1150;
    var sidebarHovered = false;
    var autoHideTimer = 0;
    var autoHideDeadline = 0;
    var remainingHideMs = autoHideDelay;

    function isSidebarActive() {
      return document.body.classList.contains('sidebar-active');
    }

    function clearAutoHideTimer(keepRemaining) {
      if (!autoHideTimer) return;
      if (keepRemaining && autoHideDeadline) {
        remainingHideMs = Math.max(80, autoHideDeadline - Date.now());
      }
      clearTimeout(autoHideTimer);
      autoHideTimer = 0;
      autoHideDeadline = 0;
    }

    function hideSidebar() {
      clearAutoHideTimer(false);
      remainingHideMs = autoHideDelay;
      if (!isSidebarActive()) return;
      window.dispatchEvent(new Event('sidebar:hide'));
    }

    function startAutoHideTimer() {
      clearAutoHideTimer(false);
      if (!isSidebarActive() || sidebarHovered) return;

      var delay = Math.max(80, Number(remainingHideMs) || autoHideDelay);
      autoHideDeadline = Date.now() + delay;
      autoHideTimer = window.setTimeout(function () {
        autoHideTimer = 0;
        autoHideDeadline = 0;
        remainingHideMs = autoHideDelay;
        if (sidebarHovered || !isSidebarActive()) return;
        hideSidebar();
      }, delay);
    }

    function resetAutoHideCountdown() {
      remainingHideMs = autoHideDelay;
      startAutoHideTimer();
    }

    function pauseAutoHideCountdown() {
      clearAutoHideTimer(true);
    }

    function resumeAutoHideCountdown() {
      if (!isSidebarActive() || sidebarHovered) return;
      startAutoHideTimer();
    }

    function showSidebar() {
      if (!isSidebarActive()) {
        window.dispatchEvent(new Event('sidebar:show'));
      }
      if (!sidebarHovered) {
        resetAutoHideCountdown();
      }
    }

    document.addEventListener('mousemove', function (event) {
      if (window.innerWidth < 768) return;
      if (event.clientX <= edgeTriggerPx) {
        showSidebar();
        return;
      }
      if (isSidebarActive() && !sidebarHovered && !autoHideTimer) {
        resumeAutoHideCountdown();
      }
    });

    function bindSidebarBehavior() {
      var sidebar = document.querySelector('.sidebar');
      if (!sidebar || sidebar.dataset.ginkaAutoBound === '1') return !!sidebar;

      sidebar.dataset.ginkaAutoBound = '1';
      sidebar.addEventListener('mouseenter', function () {
        sidebarHovered = true;
        pauseAutoHideCountdown();
      });
      sidebar.addEventListener('mouseleave', function () {
        sidebarHovered = false;
        resumeAutoHideCountdown();
      });

      var mainBody = document.querySelector('.main');
      if (mainBody) {
        mainBody.addEventListener('mouseenter', function () {
          if (!isSidebarActive()) return;
          sidebarHovered = false;
          resumeAutoHideCountdown();
        });
      }

      return true;
    }

    if (!bindSidebarBehavior()) {
      document.addEventListener('DOMContentLoaded', bindSidebarBehavior, { once: true });
    }

    window.addEventListener('sidebar:show', function () {
      if (!sidebarHovered) resetAutoHideCountdown();
    });

    window.addEventListener('sidebar:hide', function () {
      clearAutoHideTimer(false);
      remainingHideMs = autoHideDelay;
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        pauseAutoHideCountdown();
        return;
      }
      if (isSidebarActive() && !sidebarHovered) {
        resumeAutoHideCountdown();
      }
    });
  }

  var particleInterval = 0;
  var particleCleanupTimers = [];

  function shouldEnableParticles() {
    return !isLowPower() && !isReducedMotion() && !isTouchOnly();
  }

  function clearParticleTimers() {
    while (particleCleanupTimers.length) {
      clearTimeout(particleCleanupTimers.pop());
    }
  }

  function trimParticles() {
    document.querySelectorAll('.page-particle').forEach(function (node) {
      node.remove();
    });
  }

  function createParticle() {
    if (document.hidden || !shouldEnableParticles()) return;

    var particle = document.createElement('div');
    particle.className = 'page-particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.width = (Math.random() * 9 + 5) + 'px';
    particle.style.height = particle.style.width;
    particle.style.background = 'radial-gradient(circle, rgba(' +
      (Math.random() > 0.5 ? '102, 126, 234' : '118, 75, 162') +
      ', 0.35), transparent)';
    particle.style.borderRadius = '50%';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (Math.random() * 4 + 7) + 's';
    document.body.appendChild(particle);

    particleCleanupTimers.push(window.setTimeout(function () {
      particle.remove();
    }, 12500));
  }

  function stopParticles(clearNodes) {
    if (particleInterval) {
      clearInterval(particleInterval);
      particleInterval = 0;
    }
    clearParticleTimers();
    if (clearNodes) trimParticles();
  }

  function startParticles() {
    stopParticles(false);
    if (!shouldEnableParticles() || document.hidden) return;

    createParticle();
    particleCleanupTimers.push(window.setTimeout(createParticle, 900));
    particleInterval = window.setInterval(createParticle, 6500);
  }

  function bindAmbientParticles() {
    if (window.__ginkaParticlesBound) return;
    window.__ginkaParticlesBound = true;

    scheduleBackgroundTask('ambient-particles', startParticles, {
      timeout: 2600
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stopParticles(true);
        return;
      }
      startParticles();
    });

    window.addEventListener('pagehide', function () {
      stopParticles(true);
    });

    document.addEventListener('pjax:complete', function () {
      startParticles();
    });
  }

  function playPjaxVoiceHint() {
    var atri = window.ATRI;
    if (!atri) return;

    var cooldownKey = '__ginkaAtriUiVoiceCooldownAt';
    var now = Date.now();
    var last = Number(window[cooldownKey] || 0);
    if (now - last < 5000) return;
    window[cooldownKey] = now;

    var plan = [
      { category: 'welcome', options: { duration: 2000, disableMotion: true } },
      { category: 'talk', options: { duration: 2000, disableMotion: true } },
      { category: 'click', options: { duration: 1600, disableMotion: true, showSubtitle: false } }
    ];

    if (typeof atri.playVoiceByPriority === 'function') {
      try {
        atri.playVoiceByPriority(plan);
        return;
      } catch (_error) {}
    }

    if (typeof atri.playVoice !== 'function') return;
    for (var i = 0; i < plan.length; i++) {
      try {
        if (atri.playVoice(plan[i].category, plan[i].options || {})) {
          return;
        }
      } catch (_error) {}
    }
  }

  function bindPjaxHelpers() {
    if (window.__ginkaPjaxUiBound) return;
    window.__ginkaPjaxUiBound = true;

    document.addEventListener('pjax:complete', function () {
      if (window.ATRI) playPjaxVoiceHint();
    });
  }

  function bindHomeNavFix() {
    if (window.__ginkaHomeNavFixBound) return;
    window.__ginkaHomeNavFixBound = true;

    document.addEventListener('click', function (event) {
      var anchor = event.target && event.target.closest ? event.target.closest('a') : null;
      if (!anchor) return;
      if (!anchor.matches('.menu-item-home > a') && !anchor.matches('a.brand[rel="start"]')) return;

      event.preventDefault();
      var homeUrl = (window.CONFIG && window.CONFIG.root) ? window.CONFIG.root : '/';
      try {
        if (window.pjax && typeof window.pjax.loadUrl === 'function') {
          window.pjax.loadUrl(homeUrl);
          return;
        }
      } catch (_error) {}
      window.location.href = homeUrl;
    }, { capture: true });
  }

  function bindContextMenu() {
    if (window.__ginkaContextMenuBound || isTouchOnly()) return;

    var contextMenu = document.getElementById('custom-context-menu');
    if (!contextMenu) return;

    window.__ginkaContextMenuBound = true;

    function closeMenu() {
      contextMenu.style.display = 'none';
    }

    document.addEventListener('contextmenu', function (event) {
      event.preventDefault();
      contextMenu.style.display = 'block';

      var menuX = event.clientX + 5;
      var menuY = event.clientY + 5;
      contextMenu.style.left = menuX + 'px';
      contextMenu.style.top = menuY + 'px';

      requestAnimationFrame(function () {
        var rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
          menuX = event.clientX - rect.width - 5;
        }
        if (rect.bottom > window.innerHeight) {
          menuY = event.clientY - rect.height - 5;
        }
        contextMenu.style.left = Math.max(5, menuX) + 'px';
        contextMenu.style.top = Math.max(5, menuY) + 'px';
      });

      if (window.ATRI && Math.random() < 0.3) {
        window.ATRI.showMessage('打开菜单啦~', 2000);
      }
    });

    document.addEventListener('click', closeMenu);
    document.addEventListener('pjax:send', closeMenu);

    var scrollTimer = 0;
    window.addEventListener('scroll', function () {
      if (contextMenu.style.display !== 'block') return;
      clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(closeMenu, 100);
    }, { passive: true });

    contextMenu.querySelectorAll('.context-menu-item').forEach(function (item) {
      item.addEventListener('click', function (event) {
        event.stopPropagation();
        var action = item.getAttribute('data-action');

        switch (action) {
          case 'back':
            window.history.back();
            break;
          case 'forward':
            window.history.forward();
            break;
          case 'refresh':
            window.location.reload();
            break;
          case 'home':
            (function () {
              var homeUrl = (window.CONFIG && window.CONFIG.root) ? window.CONFIG.root : '/';
              try {
                if (window.pjax && typeof window.pjax.loadUrl === 'function') {
                  window.pjax.loadUrl(homeUrl);
                  return;
                }
              } catch (_error) {}
              window.location.href = homeUrl;
            })();
            break;
          case 'top':
            window.scrollTo({ top: 0, behavior: 'smooth' });
            break;
          case 'atri':
            if (window.ATRI) {
              var categories = (window.ATRI.voiceConfig && window.ATRI.voiceConfig.categories) ? window.ATRI.voiceConfig.categories : {};
              var preferred = ['welcome', 'greet', 'hello', 'menu'];
              var picked = '';
              for (var index = 0; index < preferred.length; index++) {
                if (categories && categories[preferred[index]] && categories[preferred[index]].length) {
                  picked = preferred[index];
                  break;
                }
              }

              var hour = new Date().getHours();
              var replied = false;
              var greetingFilter = (function () {
                var patterns = {
                  morning: /(早上|早安|morning|おはよう)/i,
                  noon: /(中午|午安|noon|lunch)/i,
                  afternoon: /(下午|afternoon)/i,
                  evening: /(晚上|晚好|evening|こんばんは)/i,
                  night: /(夜深|深夜|夜晚|晚安|night|おやすみ)/i
                };

                var allow = ['morning'];
                if (hour >= 12 && hour < 14) allow = ['noon'];
                else if (hour >= 14 && hour < 18) allow = ['afternoon'];
                else if (hour >= 18 && hour < 22) allow = ['evening', 'night'];
                else if (hour >= 22 || hour < 5) allow = ['night'];

                var banned = Object.keys(patterns)
                  .filter(function (key) { return allow.indexOf(key) === -1; })
                  .map(function (key) { return patterns[key]; });

                return function (voice) {
                  var text = ((voice && voice.text) ? String(voice.text) : '') + ' ' + ((voice && voice.ja) ? String(voice.ja) : '');
                  for (var i = 0; i < banned.length; i++) {
                    if (banned[i].test(text)) return false;
                  }
                  return true;
                };
              })();

              if (picked && typeof window.ATRI.playVoice === 'function') {
                replied = !!window.ATRI.playVoice(picked, { filter: greetingFilter });
              }

              if (!replied) {
                var greetings = [
                  '你好呀！有什么需要帮助的吗？',
                  '我在这里哦~',
                  '嘿嘿，找我有什么事吗？',
                  '欢迎光临！',
                  '今天也要加油哦！'
                ];
                window.ATRI.showMessage(greetings[Math.floor(Math.random() * greetings.length)], 3000);
                window.ATRI.playRandomMotion();
              }
            }
            break;
          case 'music':
            var toggleBtn = document.getElementById('music-toggle');
            if (toggleBtn) toggleBtn.click();
            break;
        }

        closeMenu();
      });
    });
  }

  function fixMobileMenu() {
    if (window.innerWidth > 768 || !isTouchOnly() || window.__ginkaMobileMenuFixing) return;
    window.__ginkaMobileMenuFixing = true;

    requestAnimationFrame(function () {
      var siteNav = document.querySelector('.site-nav');
      if (siteNav) {
        siteNav.style.setProperty('display', 'block', 'important');
        siteNav.style.setProperty('opacity', '1', 'important');
        siteNav.style.setProperty('visibility', 'visible', 'important');
        siteNav.style.setProperty('height', 'auto', 'important');
        siteNav.style.setProperty('background', '#fff', 'important');
        siteNav.style.setProperty('padding', '10px 0', 'important');
        siteNav.style.setProperty('pointer-events', 'auto', 'important');
      }

      var menu = document.querySelector('.menu');
      if (menu) {
        menu.style.setProperty('display', 'flex', 'important');
        menu.style.setProperty('flex-wrap', 'wrap', 'important');
        menu.style.setProperty('justify-content', 'center', 'important');
        menu.style.setProperty('background', 'transparent', 'important');
        menu.style.setProperty('margin', '0', 'important');
        menu.style.setProperty('padding', '0', 'important');
        menu.style.setProperty('pointer-events', 'auto', 'important');

        menu.querySelectorAll('.menu-item').forEach(function (item) {
          item.style.setProperty('display', 'inline-block', 'important');
          item.style.setProperty('margin', '0 5px', 'important');
          item.style.setProperty('pointer-events', 'auto', 'important');

          var link = item.querySelector('a');
          if (!link) return;
          link.style.setProperty('color', '#333', 'important');
          link.style.setProperty('font-size', '14px', 'important');
          link.style.setProperty('display', 'inline-block', 'important');
          link.style.setProperty('pointer-events', 'auto', 'important');
          link.style.setProperty('cursor', 'pointer', 'important');

          if (link.dataset.fixedClick === 'true') return;
          link.dataset.fixedClick = 'true';
          link.addEventListener('click', function (event) {
            event.stopPropagation();
            var href = this.getAttribute('href');
            if (href && href !== '#' && !href.startsWith('javascript:')) {
              window.location.href = href;
            }
          }, true);
        });
      }

      var brand = document.querySelector('.site-brand-container');
      if (brand) {
        brand.style.setProperty('display', 'block', 'important');
        brand.style.setProperty('opacity', '1', 'important');
        brand.style.setProperty('visibility', 'visible', 'important');
        brand.style.setProperty('pointer-events', 'auto', 'important');
        var title = brand.querySelector('.site-title');
        if (title) title.style.setProperty('color', '#333', 'important');
      }

      var header = document.querySelector('.header');
      var headerInner = document.querySelector('.header-inner');
      if (header) {
        header.style.setProperty('z-index', '99', 'important');
        header.style.setProperty('background', '#fff', 'important');
        header.style.setProperty('pointer-events', 'auto', 'important');
      }
      if (headerInner) {
        headerInner.style.setProperty('height', 'auto', 'important');
        headerInner.style.setProperty('overflow', 'visible', 'important');
        headerInner.style.setProperty('padding', '10px 0', 'important');
        headerInner.style.setProperty('pointer-events', 'auto', 'important');
      }

      window.__ginkaMobileMenuFixing = false;
    });
  }

  function bindMobileMenuFix() {
    if (window.__ginkaMobileMenuFixBound) return;
    window.__ginkaMobileMenuFixBound = true;

    var observerTimer = 0;
    var scheduleFix = function () {
      if (window.innerWidth > 768 || !isTouchOnly()) return;
      clearTimeout(observerTimer);
      observerTimer = window.setTimeout(fixMobileMenu, 80);
    };

    window.addEventListener('load', fixMobileMenu, { once: true });
    window.addEventListener('resize', fixMobileMenu);
    document.addEventListener('pjax:complete', fixMobileMenu);

    var targetNode = document.querySelector('.header') || document.body;
    var observer = new MutationObserver(scheduleFix);
    observer.observe(targetNode, { attributes: true, childList: true, subtree: true });
    window.setTimeout(function () {
      observer.disconnect();
    }, 12000);
  }

  function bindSiteTimeTicker() {
    if (window.__ginkaSiteTimeBound) return;
    window.__ginkaSiteTimeBound = true;

    var startedAt = Date.UTC(2025, 9, 17, 0, 0, 0);

    function updateSiteTime() {
      var node = document.getElementById('sitetime');
      if (!node) return;

      var diff = Math.max(0, Date.now() - startedAt);
      var totalSeconds = Math.floor(diff / 1000);
      var diffDays = Math.floor(totalSeconds / 86400);
      var diffHours = Math.floor((totalSeconds % 86400) / 3600);
      var diffMinutes = Math.floor((totalSeconds % 3600) / 60);
      var diffSeconds = totalSeconds % 60;

      node.textContent = '本站已安全运行 ' +
        diffDays + ' 天 ' +
        diffHours + ' 小时 ' +
        diffMinutes + ' 分 ' +
        diffSeconds + ' 秒';
    }

    window.siteTime = updateSiteTime;
    updateSiteTime();

    if (window.__ginkaSiteTimeTimer) {
      clearInterval(window.__ginkaSiteTimeTimer);
    }
    window.__ginkaSiteTimeTimer = window.setInterval(updateSiteTime, 1000);
  }

  function bindBackgroundReveal() {
    if (window.__ginkaBackgroundRevealBound) return;
    window.__ginkaBackgroundRevealBound = true;

    var bg = document.getElementById('video-background');
    var img = bg && bg.querySelector('img');
    if (!bg || !img) return;

    function revealBackground() {
      bg.classList.add('is-loaded');
    }

    function decodeThenReveal() {
      if (typeof img.decode === 'function') {
        img.decode().catch(function () {}).then(revealBackground);
        return;
      }
      revealBackground();
    }

    if (img.complete && img.naturalWidth > 0) {
      decodeThenReveal();
      return;
    }

    img.addEventListener('load', decodeThenReveal, { once: true });
    img.addEventListener('error', revealBackground, { once: true });
  }

  function shouldLoadCanvasNest() {
    if (!/\bcanvasNest=1\b/.test(window.location.search)) return false;
    if (matches('(max-width: 768px)')) return false;
    if (isReducedMotion()) return false;
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection && connection.saveData) return false;
    return true;
  }

  function loadCanvasNest() {
    if (!shouldLoadCanvasNest()) return;
    if (document.querySelector('script[data-ginka-canvas-nest]')) return;

    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-nest.js@1/dist/canvas-nest.js';
    script.setAttribute('color', '91,155,213');
    script.setAttribute('opacity', '0.5');
    script.setAttribute('zIndex', '-1');
    script.setAttribute('count', '36');
    script.setAttribute('data-ginka-canvas-nest', '1');
    document.body.appendChild(script);
  }

  function scheduleCanvasNest() {
    scheduleBackgroundTask('canvas-nest', function () {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(loadCanvasNest, { timeout: 2800 });
        return;
      }
      window.setTimeout(loadCanvasNest, 1600);
    }, {
      timeout: 1800
    });
  }

  function boot() {
    // The reading drawer is opened and closed explicitly, so the TOC stays put.
    bindAmbientParticles();
    bindPjaxHelpers();
    bindHomeNavFix();
    bindContextMenu();
    bindMobileMenuFix();
    bindSiteTimeTicker();
    bindBackgroundReveal();
    scheduleCanvasNest();
    fixMobileMenu();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
