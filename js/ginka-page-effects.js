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
