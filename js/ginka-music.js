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
