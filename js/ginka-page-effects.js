(function () {
  'use strict';
  if (window.__ginkaPageEffectsReady) return;
  window.__ginkaPageEffectsReady = true;

  (function initReveals() {
    var media = null;
    var frame = 0;
    function cleanup() {
      cancelAnimationFrame(frame);
      if (media) media.revert();
      media = null;
    }
    function init() {
      cleanup();
      var gsap = window.gsap;
      var triggers = window.ScrollTrigger;
      if (!gsap || !triggers) return;
      gsap.registerPlugin(triggers);
      media = gsap.matchMedia();
      media.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', function (context) {
        // Late loading must never hide something the reader has already seen.
        var cards = gsap.utils.toArray('.journal-entry, .journal-archive-row, .journal-taxonomy-item, .journal-island-heading')
          .filter(function (node) { return node.getBoundingClientRect().top >= window.innerHeight + 12; });
        if (!cards.length) return;
        gsap.set(cards, { autoAlpha: 0, y: 8 });
        context.add('reveal', function (batch) {
          gsap.to(batch, {
            autoAlpha: 1, y: 0, duration: .44, ease: 'power2.out',
            stagger: .035, overwrite: 'auto', clearProps: 'transform,opacity,visibility'
          });
        });
        triggers.batch(cards, {
          start: 'top 97%', once: true, interval: .06, batchMax: 4,
          onEnter: function (batch) { context.reveal(batch); },
          onEnterBack: function (batch) { context.reveal(batch); }
        });
      });
    }
    function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(init); }
    window.addEventListener('ginka:gsap-ready', schedule);
    document.addEventListener('pjax:send', cleanup);
    document.addEventListener('pjax:complete', schedule);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true });
    else schedule();
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

  (function initRouteFeedback() {
    var progress;
    var showTimer = 0;
    var enterTimer = 0;
    var activeMain = null;
    function ensureProgress() {
      if (progress) return progress;
      progress = document.createElement('div');
      progress.className = 'journal-route-progress';
      progress.setAttribute('aria-hidden', 'true');
      document.body.appendChild(progress);
      return progress;
    }
    function reset() {
      clearTimeout(showTimer);
      clearTimeout(enterTimer);
      if (progress) progress.classList.remove('is-visible');
      if (activeMain) activeMain.classList.remove('journal-route-enter');
      activeMain = null;
    }
    document.addEventListener('pjax:send', function () {
      reset();
      showTimer = setTimeout(function () { ensureProgress().classList.add('is-visible'); }, 140);
    });
    document.addEventListener('pjax:complete', function () {
      reset();
      activeMain = document.querySelector('.main-inner');
      if (!activeMain) return;
      activeMain.classList.add('journal-route-enter');
      enterTimer = setTimeout(function () {
        if (activeMain) activeMain.classList.remove('journal-route-enter');
        activeMain = null;
      }, 360);
    });
    document.addEventListener('pjax:error', reset);
    window.addEventListener('pagehide', reset);
  })();
})();
