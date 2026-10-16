// Shared by the local quality command and Codex's browser tools.
async (page) => {
  const origin = new URL(page.url()).origin;
  const results = [];
  const browser = page.context().browser();
  async function check(name, run) {
    try { const passed = await run(); results.push({ name, passed: passed !== false }); }
    catch (error) { results.push({ name, passed: false, error: error.message }); }
  }
  const context = await browser.newContext({ serviceWorkers: 'block', reducedMotion: 'reduce' });
  const p = await context.newPage();
  p.setDefaultTimeout(7000);
  const errors = [];
  p.on('pageerror', error => errors.push(error.message));
  const article = '/2025/11/05/%5BNSSCTF%202025%20%E7%A7%8B%E6%8B%9B%E8%B5%9B%5DCodeRunner/';
  try {
    for (const width of [320, 390, 768, 1440]) {
      await p.setViewportSize({ width, height: 900 });
      await check(`${width}px menu label fits and the drawer works by keyboard`, async () => {
        await p.goto(origin + '/');
        const toggle = p.locator('.sidebar-toggle');
        const fits = await toggle.evaluate(element => {
          const style = getComputedStyle(element, '::after');
          const rect = element.getBoundingClientRect();
          const canvas = document.createElement('canvas').getContext('2d');
          canvas.font = style.font;
          const textWidth = canvas.measureText('菜单').width + 2 * parseFloat(style.letterSpacing || 0);
          return style.display !== 'none' && style.whiteSpace === 'nowrap' && parseFloat(style.lineHeight) >= 14
            && parseFloat(style.width) + 1 >= textWidth && rect.width >= 44 && rect.height >= 44
            && rect.left >= 0 && rect.right <= innerWidth;
        });
        await toggle.focus(); await p.keyboard.press('Enter');
        await p.waitForFunction(() => document.querySelector('.sidebar-toggle').getAttribute('aria-expanded') === 'true'
          && document.activeElement.matches('.journal-sidebar-close'));
        const drawer = await p.locator('#journal-sidebar').evaluate(element => !element.inert && element.contains(document.activeElement));
        await p.keyboard.press('Escape');
        await p.waitForFunction(() => document.querySelector('.sidebar-toggle').getAttribute('aria-expanded') === 'false');
        return fits && drawer && await toggle.evaluate(element => element === document.activeElement);
      });
      for (const route of ['/', '/tags/', '/archives/', article]) {
        await check(`${width}px ${route} has no horizontal overflow`, async () => {
          await p.goto(origin + route);
          await p.locator('#main-content').waitFor();
          return await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
        });
      }
    }
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(origin + article);
    await p.locator('.journal-code').first().waitFor();
    await check('gallery stays deferred until an image is opened', async () => {
      const before = await p.evaluate(() => !window.Fancybox);
      await p.locator('.fancybox').first().click();
      await p.locator('.fancybox__container').waitFor();
      await p.keyboard.press('Escape');
      await p.locator('.fancybox__container').waitFor({ state: 'hidden' });
      return before;
    });
    await check('code can be scrolled with a keyboard', async () => {
      const region = p.locator('.journal-code [tabindex="0"]').first();
      await region.focus(); await p.keyboard.press('ArrowRight');
      await p.waitForFunction(() => document.querySelector('.journal-code [tabindex="0"]').scrollLeft > 0);
    });
    await check('code copying and repeated page initialization stay correct', async () => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
      const stats = await p.locator('[data-reading-stats]').textContent();
      await p.locator('.journal-copy').first().click();
      await p.getByRole('button', { name: '已复制', exact: true }).waitFor();
      const copied = await p.evaluate(() => navigator.clipboard.readText());
      await p.evaluate(() => document.dispatchEvent(new Event('page:loaded')));
      await p.locator('.journal-code').first().waitFor();
      return copied.length > 30 && stats === await p.locator('[data-reading-stats]').textContent()
        && await p.locator('.journal-code-toolbar').count() === await p.locator('.journal-code').count();
    });
    await check('long code expands and wrapping keeps the complete source intact', async () => {
      const expand = p.locator('.journal-code-expand').first();
      const shell = p.locator('.journal-code').filter({ has: expand }).first();
      const code = shell.locator('figure.highlight,pre').first();
      const source = await code.textContent();
      await expand.click();
      const expanded = await expand.getAttribute('aria-expanded') === 'true';
      await shell.locator('.journal-code-wrap').click();
      const wrapped = await shell.getAttribute('data-wrap') === 'true';
      const unchanged = source === await code.textContent();
      await shell.locator('.journal-code-wrap').click();
      await expand.click();
      return expanded && wrapped && unchanged && await expand.getAttribute('aria-expanded') === 'false';
    });
    await check('reading positions survive a reload', async () => {
      await p.evaluate(() => window.scrollTo({ top: 1400, behavior: 'instant' }));
      await p.reload(); await p.locator('.journal-code').first().waitFor();
      return await p.evaluate(() => Math.abs(scrollY - 1400) < 20);
    });
    await check('search opens by keyboard and keeps focus inside the dialog', async () => {
      await p.keyboard.press('Control+k');
      await p.locator('.search-input').fill('Android');
      await p.locator('.search-result-title').first().waitFor();
      await p.keyboard.press('Shift+Tab');
      const trapped = await p.locator('.search-result-list a').last().evaluate(element => element === document.activeElement);
      await p.keyboard.press('Tab');
      const wrapped = await p.locator('.search-input').evaluate(element => element === document.activeElement);
      await p.keyboard.press('Escape');
      return trapped && wrapped;
    });
    await check('tag filtering and reset work after PJAX navigation', async () => {
      await p.locator('.header .menu-item-tags a').first().evaluate(element => element.click());
      await p.waitForURL('**/tags/');
      const total = await p.locator('.journal-taxonomy-item').count();
      await p.locator('#journal-topic-query').fill('ctf');
      await p.waitForFunction(() => document.querySelectorAll('.journal-taxonomy-item:not([hidden])').length === 1);
      await p.getByRole('button', { name: '清空', exact: true }).click();
      return await p.locator('.journal-taxonomy-item:not([hidden])').count() === total;
    });
    await check('page scripts produce no uncaught errors', async () => errors.length === 0);
    await check('the not found page offers a working way back', async () => {
      await p.goto(origin + '/404.html');
      await p.getByRole('link', { name: '返回首页 →', exact: true }).click();
      await p.waitForURL(origin + '/');
      return await p.locator('.journal-hero').isVisible();
    });
  } finally { await context.close(); }

  const retryContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  let attempts = 0;
  await retryContext.route('**/js/ginka-music.js?*', async route => {
    attempts++;
    if (attempts === 1) await route.fulfill({ status: 503, body: 'temporarily unavailable' });
    else await route.continue();
  });
  const retryPage = await retryContext.newPage();
  retryPage.setDefaultTimeout(7000);
  try {
    await check('music loading failures can be retried', async () => {
      await retryPage.goto(origin + '/');
      await retryPage.locator('.sidebar-toggle').click();
      await retryPage.waitForFunction(() => document.getElementById('music-player').dataset.ginkaMusicState === 'error');
      await retryPage.locator('#music-toggle').click();
      await retryPage.waitForFunction(() => !!window.__ginkaMusicBooted);
      return attempts === 2;
    });
  } finally { await retryContext.close(); }

  const searchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  let searchAttempts = 0;
  await searchContext.route('**/search.xml', async route => {
    if (++searchAttempts === 1) await route.fulfill({ status: 503, body: 'temporarily unavailable' });
    else await route.continue();
  });
  const searchPage = await searchContext.newPage();
  searchPage.setDefaultTimeout(7000);
  try {
    await check('search index errors show a working retry action', async () => {
      await searchPage.goto(origin + '/');
      await searchPage.locator('.menu-item-search button').click();
      await searchPage.getByRole('button', { name: '重新加载', exact: true }).click();
      await searchPage.locator('.search-input').fill('Android');
      await searchPage.locator('.search-result-title').first().waitFor();
      return searchAttempts === 2;
    });
  } finally { await searchContext.close(); }

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const desktopPage = await desktop.newPage();
  desktopPage.setDefaultTimeout(10000);
  const desktopErrors = [];
  desktopPage.on('pageerror', error => desktopErrors.push(error.message));
  try {
    await check('ATRI loads without interaction while music and effects stay deferred', async () => {
      await desktopPage.goto(origin + '/');
      await desktopPage.waitForFunction(() => window.GINKA_ATRI_LOADER.state === 'ready' && window.ATRI.isReady, null, { timeout: 35000 });
      const deferred = await desktopPage.evaluate(() => !window.gsap && !GINKA_RUNTIME.hasInteracted && !document.getElementById('atri-tools-toggle'));
      await desktopPage.locator('.sidebar-toggle').click();
      await desktopPage.waitForFunction(() => document.activeElement.matches('.journal-sidebar-close'));
      await desktopPage.waitForFunction(() => !!window.ScrollTrigger && !!window.__ginkaMusicBooted);
      await desktopPage.waitForFunction(() => window.GINKA_ATRI_LOADER.state === 'ready' && window.ATRI.isReady, {}, { timeout: 35000 });
      return deferred && desktopErrors.length === 0 && await desktopPage.evaluate(() => {
        const paths = [...document.scripts].map(script => script.src).filter(Boolean).map(src => new URL(src).pathname);
        return new Set(paths).size === paths.length && getComputedStyle(document.querySelector('.main-inner')).opacity === '1';
      });
    });
    await check('ATRI renders visible pixels before enabling its companion controls', async () => {
      await desktopPage.keyboard.press('Escape');
      await desktopPage.waitForFunction(() => ATRI.app.stage.renderable);
      await desktopPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      return await desktopPage.evaluate(() => {
        const pixels = ATRI.app.renderer.extract.pixels(ATRI.app.stage);
        let visible = 0;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) visible++;
        const canvas = ATRI.canvas.getBoundingClientRect();
        const panel = document.querySelector('#atri-controls').getBoundingClientRect();
        return visible > 1000 && !document.querySelector('#atri-controls').hidden
          && panel.top >= canvas.bottom && panel.bottom <= innerHeight;
      });
    });
    await check('ATRI voice, movement, reset and restore controls respond', async () => {
      await desktopPage.locator('#atri-volume').click();
      const volume = await desktopPage.locator('#atri-message-box').textContent();
      await desktopPage.locator('#atri-talk').click();
      await desktopPage.waitForFunction(() => ATRI.voicePlayer && !!ATRI.voicePlayer.src);
      const voice = await desktopPage.evaluate(() => !!ATRI.voiceConfig.enabled && !ATRI.voicePlayer.error);
      await desktopPage.locator('#atri-motion').click();
      const motion = await desktopPage.evaluate(() => ATRI._paramMotionActive || ATRI._lastInteractionAt > Date.now() - 3000);
      const handle = await desktopPage.locator('#atri-drag').boundingBox();
      await desktopPage.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
      await desktopPage.mouse.down(); await desktopPage.mouse.move(handle.x - 70, handle.y - 50, { steps: 4 }); await desktopPage.mouse.up();
      const moved = await desktopPage.evaluate(() => !!localStorage.getItem('atri_widget_pos'));
      await desktopPage.locator('#atri-home').click();
      const reset = await desktopPage.evaluate(() => !localStorage.getItem('atri_widget_pos'));
      await desktopPage.locator('#atri-toggle').click();
      await desktopPage.locator('#atri-restore').click();
      return volume.includes('静音') && voice && motion && moved && reset
        && await desktopPage.locator('#atri-live2d-widget').isVisible();
    });
    await check('native context menus remain available on links and code', async () => {
      await desktopPage.goto(origin + article);
      await desktopPage.locator('.journal-code').first().waitFor();
      return await desktopPage.evaluate(() => ['.post-body pre', '.header a'].every(selector => {
        const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        document.querySelector(selector).dispatchEvent(event);
        return !event.defaultPrevented;
      }));
    });
    await check('quiet effects preserve reading and reveal articles after scrolling', async () => {
      await desktopPage.goto(origin + '/');
      await desktopPage.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await desktopPage.locator('.journal-hero h2').click();
      await desktopPage.waitForFunction(() => !!window.ScrollTrigger);
      await desktopPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const last = desktopPage.locator('.journal-entry').last();
      await last.scrollIntoViewIfNeeded();
      await desktopPage.waitForFunction(() => {
        const entry = [...document.querySelectorAll('.journal-entry')].at(-1);
        return getComputedStyle(entry).opacity === '1' && getComputedStyle(entry).visibility === 'visible';
      });
      const quiet = await desktopPage.evaluate(() => !document.querySelector('.ginka-opening,.click-ripple,.page-particle')
        && getComputedStyle(document.querySelector('.main-inner')).opacity === '1');
      await desktopPage.emulateMedia({ reducedMotion: 'reduce' });
      const accessible = await last.evaluate(element => getComputedStyle(element).visibility === 'visible' && getComputedStyle(element).transform === 'none');
      await desktopPage.emulateMedia({ reducedMotion: 'no-preference' });
      return quiet && accessible && desktopErrors.length === 0;
    });
    await check('desktop contents follow the current chapter', async () => {
      await desktopPage.goto(origin + article);
      const link = desktopPage.locator('.journal-outline a').last();
      await link.click();
      await desktopPage.waitForFunction(() => [...document.querySelectorAll('.journal-outline a')].at(-1)?.getAttribute('aria-current') === 'location');
      return await link.getAttribute('aria-current') === 'location';
    });
  } finally { await desktop.close(); }

  const atriContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  const atriPage = await atriContext.newPage();
  let releaseTexture;
  const textureGate = new Promise(resolve => { releaseTexture = resolve; });
  let textureRequested = false;
  await atriContext.route('**/live2d/ATRI/ATRI.2048/texture_00.png', async route => {
    textureRequested = true;
    await textureGate;
    await route.continue();
  });
  try {
    await check('slow ATRI textures keep voice, welcome and controls disabled until the model is drawn', async () => {
      await atriPage.goto(origin + '/', { waitUntil: 'domcontentloaded' });
      for (let count = 0; !textureRequested && count < 100; count++) await atriPage.waitForTimeout(50);
      const waiting = textureRequested && await atriPage.evaluate(() => GINKA_ATRI_LOADER.state === 'loading'
        && !window.ATRI && !window.atri?.voicePlayer && !document.querySelector('#atri-live2d-widget').classList.contains('is-ready')
        && document.querySelector('#atri-controls').hidden && getComputedStyle(document.querySelector('#atri-message-box')).display === 'none');
      releaseTexture();
      await atriPage.waitForFunction(() => GINKA_ATRI_LOADER.state === 'ready' && ATRI.isReady, null, { timeout: 35000 });
      return waiting;
    });
    await check('small screens automatically show ATRI and its controls without a feature switch', async () => {
      const fits = await atriPage.evaluate(() => {
        const widget = ATRI.widget.getBoundingClientRect();
        const canvas = ATRI.canvas.getBoundingClientRect();
        const controls = document.querySelector('#atri-controls').getBoundingClientRect();
        return widget.left >= 0 && widget.right <= innerWidth && widget.top >= 0 && widget.bottom <= innerHeight
          && controls.top >= canvas.bottom && document.documentElement.scrollWidth === innerWidth;
      });
      const download = atriPage.waitForEvent('download');
      await atriPage.locator('#atri-photo').click();
      const photo = await download;
      await atriPage.keyboard.press('Escape');
      let smallFits = true;
      for (const viewport of [{ width: 320, height: 844 }, { width: 768, height: 360 }, { width: 1024, height: 768 }]) {
        await atriPage.setViewportSize(viewport);
        await atriPage.waitForTimeout(400);
        smallFits = smallFits && await atriPage.evaluate(() => {
          const rect = ATRI.widget.getBoundingClientRect();
          const canvas = ATRI.canvas.getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth
            && Math.abs(canvas.width - ATRI.config.width) < 1 && Math.abs(canvas.height - ATRI.config.height) < 1
            && [...document.querySelectorAll('#atri-controls button')].every(button => button.scrollWidth <= button.clientWidth);
        });
        await atriPage.keyboard.press('Escape');
      }
      return fits && smallFits && photo.suggestedFilename().endsWith('.png') && await atriPage.locator('#atri-controls').isVisible();
    });
  } finally { releaseTexture(); await atriContext.close(); }

  const atriRetryContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  let modelAttempts = 0;
  await atriRetryContext.route('**/live2d/ATRI/ATRI.model3.json?*', async route => {
    if (++modelAttempts === 1) await route.fulfill({ status: 503, body: 'temporarily unavailable' });
    else await route.continue();
  });
  const atriRetry = await atriRetryContext.newPage();
  try {
    await check('a failed ATRI model can retry into a working model and single control handlers', async () => {
      await atriRetry.goto(origin + '/');
      await atriRetry.waitForFunction(() => GINKA_ATRI_LOADER.state === 'error');
      await atriRetry.getByRole('button', { name: 'ATRI · 重试', exact: true }).click();
      await atriRetry.waitForFunction(() => GINKA_ATRI_LOADER.state === 'ready' && ATRI.isReady, null, { timeout: 35000 });
      await atriRetry.locator('#atri-volume').click();
      const muted = await atriRetry.evaluate(() => localStorage.getItem('atri_voice_volume') === '0');
      await atriRetry.locator('#atri-volume').click();
      return modelAttempts === 2 && muted && await atriRetry.evaluate(() => localStorage.getItem('atri_voice_volume') === '0.7'
        && document.querySelectorAll('script[data-ginka-atri-src*="ginka-atri.js"]').length === 1);
    });
  } finally { await atriRetryContext.close(); }

  const responsiveContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const responsive = await responsiveContext.newPage();
  try {
    await check('mobile selects a smaller illustration and preloads it only once', async () => {
      await responsive.goto(origin + '/');
      await responsive.locator('.journal-hero-art').waitFor();
      return await responsive.evaluate(() => {
        const hero = document.querySelector('.journal-hero-art');
        const resources = performance.getEntriesByType('resource').filter(entry => entry.name.includes('/hero-silver'));
        return hero.currentSrc.includes('/responsive/') && resources.length === 1;
      });
    });
    await check('search safely highlights literal markup and shows dates and topics', async () => {
      await responsive.route('**/search.xml', route => route.fulfill({ contentType: 'application/xml', body: '<search format="text"><entry><title>&lt;img src=x onerror=alert(1)&gt; Android</title><content>Android &lt;script&gt;literal code&lt;/script&gt;</content><url>/about/</url><date>2026-10-16</date><tags>Android / Frida</tags></entry></search>' }));
      await responsive.keyboard.press('Control+k');
      await responsive.locator('.search-input').fill('Android');
      await responsive.locator('.search-result-title').waitFor();
      return await responsive.locator('.search-result-list img,.search-result-list script').count() === 0
        && (await responsive.locator('.search-result-title').textContent()).includes('<img')
        && await responsive.locator('.search-result-list mark').count() >= 2
        && (await responsive.locator('.journal-search-meta').textContent()).includes('Frida');
    });
  } finally { await responsiveContext.close(); }

  const lateContext = await browser.newContext({ serviceWorkers: 'block', reducedMotion: 'reduce' });
  const latePage = await lateContext.newPage();
  try {
    await check('search initializes once when its script arrives after page readiness', async () => {
      await lateContext.route('**/js/third-party/search/local-search.js?*', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
      await latePage.goto(origin + '/');
      const source = await latePage.locator('script[src*="third-party/search/local-search.js"]').getAttribute('src');
      await lateContext.unroute('**/js/third-party/search/local-search.js?*');
      await latePage.addScriptTag({ url: origin + source });
      await latePage.addScriptTag({ url: origin + source });
      await latePage.keyboard.press('Control+k');
      await latePage.locator('.search-input').fill('Android');
      await latePage.locator('.search-result-title').first().waitFor();
      return await latePage.locator('.journal-search-status').count() === 1;
    });
  } finally { await lateContext.close(); }

  const proxyContext = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
  await proxyContext.addInitScript(() => {
    // Model a CDN loader that virtualizes readiness and withholds load events.
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'loading' });
    const documentAdd = document.addEventListener.bind(document);
    document.addEventListener = (type, ...args) => { if (type !== 'DOMContentLoaded') documentAdd(type, ...args); };
    const windowAdd = window.addEventListener.bind(window);
    window.addEventListener = (type, ...args) => { if (type !== 'load') windowAdd(type, ...args); };
  });
  const proxyPage = await proxyContext.newPage();
  proxyPage.setDefaultTimeout(7000);
  try {
    await check('CDN readiness proxies cannot disable navigation, search or reading', async () => {
      await proxyPage.goto(origin + '/');
      await proxyPage.locator('.sidebar-toggle').click();
      await proxyPage.waitForFunction(() => document.activeElement.matches('.journal-sidebar-close'));
      await proxyPage.keyboard.press('Escape');
      await proxyPage.keyboard.press('Control+k');
      await proxyPage.locator('.search-input').fill('Android');
      const result = proxyPage.locator('.search-result-title').first();
      await result.waitFor(); await result.click();
      await proxyPage.locator('.journal-code').first().waitFor();
      return await proxyPage.locator('.journal-related-card').count() === 3
        && await proxyPage.evaluate(() => document.readyState === 'loading' && window.__ginkaThemeBooted && window.__ginkaReadingBound);
    });
  } finally { await proxyContext.close(); }

  const offlineContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const offlinePage = await offlineContext.newPage();
  offlinePage.setDefaultTimeout(10000);
  try {
    await check('cached articles remain styled and readable offline', async () => {
      await offlinePage.goto(origin + '/');
      await offlinePage.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
      });
      await offlinePage.goto(origin + article);
      await offlinePage.locator('.journal-code').first().waitFor();
      await offlinePage.waitForFunction(async () => !!await caches.match(location.href));
      await offlineContext.setOffline(true);
      await offlinePage.reload(); await offlinePage.locator('.journal-code').first().waitFor();
      return await offlinePage.locator('.main-inner').evaluate(element => getComputedStyle(element).opacity === '1');
    });
  } finally { await offlineContext.setOffline(false); await offlineContext.close(); }

  const nojsContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  const nojsPage = await nojsContext.newPage();
  nojsPage.setDefaultTimeout(7000);
  try {
    await check('article contents and images work with JavaScript disabled', async () => {
      await nojsPage.goto(origin + article);
      await nojsPage.locator('.journal-article-toc summary').click();
      return await nojsPage.locator('.journal-article-toc').getAttribute('open') !== null
        && await nojsPage.locator('.main-inner').evaluate(element => getComputedStyle(element).opacity === '1')
        && !!await nojsPage.locator('.post-body img').first().getAttribute('src');
    });
  } finally { await nojsContext.close(); }
  return { passed: results.every(result => result.passed), results };
}
