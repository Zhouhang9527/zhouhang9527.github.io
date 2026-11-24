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
  const browser = await chromium.launch(process.env.GINKA_CHROME_PATH ? { executablePath: process.env.GINKA_CHROME_PATH } : { channel: 'chrome' });
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

  // Test application recovery independently of the external music provider.
  let playlistFails = true;
  await page.route('https://meting.mm9527.top/api?**', route => {
    const url = new URL(route.request().url());
    const headers = {'access-control-allow-origin':'*'};
    if (url.searchParams.get('type') === 'playlist') {
      if (playlistFails) return route.fulfill({status:503,headers,body:'Unavailable'});
      const track = new URL(url); track.searchParams.set('type','url'); track.searchParams.set('id','test-track');
      return route.fulfill({contentType:'application/json',headers,body:JSON.stringify([{id:'test-track',name:'Fixture track',author:'Fixture',url:track.href}])});
    }
    return route.fulfill({status:200,headers,contentType:'text/plain',body:''});
  });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  await check('removed large homepage logo and old opening background', async () => {
    return page.locator('.ginka-opening__logo, img[src*="ginka-static-background"], video[src*="background.mp4"]').count().then(count => count === 0);
  });

  await check('page can scroll after opening overlay settles', async () => {
    await page.waitForFunction(()=>!document.body.classList.contains('is-opening-active'));
    await page.mouse.move(900,450);
    await page.mouse.wheel(0,500);
    await page.waitForFunction(()=>window.scrollY>0,{}, {timeout:5000});
    return true;
  });

  await check('online playlist failure is recoverable', async () => {
    await page.waitForFunction(()=>document.getElementById('music-player')?.dataset.ginkaMusicState==='error');
    const retry = page.locator('.music-unavailable button');
    if (!await retry.count() || await retry.isDisabled()) return false;
    playlistFails = false;
    // The persistent drawer is closed: invoke the real button's click handler.
    await retry.evaluate(el=>el.click());
    await page.waitForFunction(()=>document.getElementById('music-player')?.dataset.ginkaMusicState==='ready');
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

  await check('drawer hides decorative scrollbar without disabling scrolling', async () => {
    return page.evaluate(() => {
      const drawer = document.querySelector('#journal-sidebar');
      if (!drawer) return false;
      const style = getComputedStyle(drawer);
      return style.scrollbarWidth === 'none' && ['auto', 'scroll'].includes(style.overflowY);
    });
  });

  await check('route scene metadata is complete and theme-aware', async () => {
    return page.evaluate(() => {
      const main = document.getElementById('main-content');
      return !!main?.dataset.sidebarSceneDay && !!main?.dataset.sidebarSceneNight &&
        main.dataset.sidebarSceneDay !== main.dataset.sidebarSceneNight;
    });
  });

  const article = page.locator('.journal-entry h3 a, .post-title-link').first();
  if (await article.count()) {
    const audioBeforePjax = await page.locator('#bg-music').elementHandle();
    const playbackBeforePjax = await page.evaluate(() => {
      const audio = document.getElementById('bg-music');
      if (!audio) return null;
      return { paused: audio.paused, currentTime: audio.currentTime };
    });
    const target = new URL(await article.getAttribute('href'),page.url()).href;
    const response = await context.request.get(target);
    if (!response.ok()) throw Error('Direct article fetch failed: '+response.status());
    const expected = await page.evaluate(html=>{
      const d=new DOMParser().parseFromString(html,'text/html');
      return {canonical:d.querySelector('link[rel="canonical"]')?.getAttribute('href'),og:d.querySelector('meta[property="og:url"]')?.content};
    },await response.text());
    await article.click();
    await page.waitForURL(target);
    await page.locator('.journal-reading-shell').waitFor();
    await check('code toolbar icon-only wrap toggle in both themes', async () => {
      const wrap = page.locator('.journal-code-wrap').first();
      if (!await wrap.count()) return true; // Article without a code listing.
      const initialMode = await page.evaluate(() => window.GINKA_THEME.mode);
      try {
        for (const mode of ['day', 'moonlit']) {
          await page.evaluate(mode => window.GINKA_THEME.set(mode), mode);
          const initial = await wrap.getAttribute('aria-pressed');
          if (initial === 'true') await wrap.click();
          const info = await wrap.evaluate(button => {
            const rect = button.getBoundingClientRect();
            const copy = button.parentElement.querySelector('.journal-copy').getBoundingClientRect();
            return { icon: !!button.querySelector('svg[aria-hidden="true"]'),
              label: button.getAttribute('aria-label'), text: button.textContent.trim(),
              width: rect.width, height: rect.height, aligned: Math.abs(rect.height - copy.height) < 1 };
          });
          if (!info.icon || info.label !== '自动换行' || info.text || info.width < 28 || !info.aligned) return false;
          await wrap.click();
          if (await wrap.getAttribute('aria-pressed') !== 'true') return false;
          if (await wrap.evaluate(button => button.closest('.journal-code').dataset.codeWrap) !== 'on') return false;
          await wrap.click();
          if (await wrap.getAttribute('aria-pressed') !== 'false') return false;
          if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) return false;
        }
        return true;
      } finally {
        await page.evaluate(mode => window.GINKA_THEME.set(mode), initialMode);
      }
    });
    await check('pjax metadata follows article URL', async () => {
      if (!expected.canonical || !expected.og) return false;
      await page.waitForFunction(expected => {
        return document.querySelector('link[rel="canonical"]')?.getAttribute('href') === expected.canonical &&
          document.querySelector('meta[property="og:url"]')?.content === expected.og;
      },expected,{timeout:7000});
      return true;
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
