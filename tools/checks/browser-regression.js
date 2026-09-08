'use strict';

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (_error) {
  console.error('FAIL Playwright is not installed. Install it before running npm run check:browser.');
  process.exit(1);
}

const baseUrl = process.env.GINKA_TEST_BASE_URL || 'http://127.0.0.1:4000';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    reducedMotion: 'no-preference'
  });
  const page = await context.newPage();
  const failures = [];

  async function check(name, fn) {
    try {
      const ok = await fn();
      if (ok) console.log(`PASS ${name}`);
      else {
        failures.push(name);
        console.error(`FAIL ${name}`);
      }
    } catch (error) {
      failures.push(name);
      console.error(`FAIL ${name}: ${error.message}`);
    }
  }

  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  await check('removed large homepage logo and old opening background', async () => {
    return page.locator('.ginka-opening__logo, img[src*="ginka-static-background"], video[src*="background.mp4"]').count().then(count => count === 0);
  });

  await check('page can scroll after opening overlay settles', async () => {
    await page.waitForTimeout(5600);
    await page.mouse.wheel(0, 500);
    return page.evaluate(() => window.scrollY > 0 && !document.body.classList.contains('is-opening-active'));
  });

  await check('online music loads with the homepage', async () => {
    return page.evaluate(() => {
      const player = document.getElementById('music-player');
      const audio = document.getElementById('bg-music');
      return !!player && !!audio &&
        player.dataset.ginkaMusicState === 'ready' &&
        audio.querySelectorAll('source').length === 0 &&
        audio.getAttribute('preload') === 'metadata';
    });
  });

  await check('no horizontal overflow on desktop', async () => {
    return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  });

  const article = page.locator('.journal-entry h3 a, .post-title-link').first();
  if (await article.count()) {
    const audioBeforePjax = await page.locator('#bg-music').elementHandle();
    const playbackBeforePjax = await page.evaluate(() => {
      const audio = document.getElementById('bg-music');
      if (!audio) return null;
      return { paused: audio.paused, currentTime: audio.currentTime };
    });
    await article.click();
    await page.waitForLoadState('networkidle');
    await check('pjax metadata follows article URL', async () => {
      return page.evaluate(() => {
        const canonical = document.querySelector('link[rel="canonical"]');
        const ogUrl = document.querySelector('meta[property="og:url"]');
        const normalize = value => String(value || '').replace(/\/index\.html$/, '/');
        return !!canonical &&
          !!ogUrl &&
          normalize(canonical.href) === normalize(location.href) &&
          normalize(ogUrl.content) === normalize(location.href);
      });
    });
    await check('pjax keeps one audio node', async () => {
      const statePreserved = await page.evaluate(({ wasPlaying, previousTime }) => {
        const audio = document.getElementById('bg-music');
        const playbackPreserved = !wasPlaying || (!audio.paused && audio.currentTime >= previousTime);
        return document.querySelectorAll('#bg-music').length === 1 && playbackPreserved;
      }, {
        wasPlaying: !!(playbackBeforePjax && !playbackBeforePjax.paused),
        previousTime: playbackBeforePjax ? playbackBeforePjax.currentTime : 0
      });
      const sameNode = !!audioBeforePjax && await audioBeforePjax.evaluate(
        audio => audio === document.getElementById('bg-music')
      );
      return statePreserved && sameNode;
    });
  }

  await browser.close();
  process.exit(failures.length ? 1 : 0);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
