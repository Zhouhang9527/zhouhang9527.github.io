(function () {
  'use strict';
  const runtime = window.GINKA_RUNTIME;
  if (window.__ginkaEffectsLoaderInstalled || !runtime || runtime.isLowPower) return;
  window.__ginkaEffectsLoaderInstalled = true;
  runtime.scheduleBackgroundTask('ginka-gsap', async () => {
    if (!window.gsap) await runtime.loadScript('/vendor/gsap/3.12.5/gsap.min.js');
    if (!window.ScrollTrigger) await runtime.loadScript('/vendor/gsap/3.12.5/ScrollTrigger.min.js');
    window.dispatchEvent(new CustomEvent('ginka:gsap-ready'));
  }, { timeout: 2200, requireInteraction: true });
})();
