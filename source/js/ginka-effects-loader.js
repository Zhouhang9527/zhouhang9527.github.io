(function () {
  'use strict';

  if (window.__ginkaEffectsLoaderInstalled) return;
  window.__ginkaEffectsLoaderInstalled = true;

  const CDN_ROOT = 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/';

  function loadScript(name) {
    return new Promise(function (resolve, reject) {
      const existing = document.querySelector(`script[data-ginka-effect="${name}"]`);
      if (existing) {
        if (existing.dataset.loaded === 'true') resolve();
        else existing.addEventListener('load', resolve, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = CDN_ROOT + name;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.ginkaEffect = name;
      script.addEventListener('load', function () {
        script.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }

  async function loadEffects() {
    if (!window.gsap) await loadScript('gsap.min.js');
    if (!window.ScrollTrigger) await loadScript('ScrollTrigger.min.js');
    window.dispatchEvent(new CustomEvent('ginka:gsap-ready'));
  }

  const runtime = window.GINKA_RUNTIME;
  if (runtime && typeof runtime.scheduleBackgroundTask === 'function') {
    runtime.scheduleBackgroundTask('ginka-gsap', loadEffects, { timeout: 2200 });
  } else {
    window.addEventListener('load', function () {
      window.setTimeout(loadEffects, 0);
    }, { once: true });
  }
})();
