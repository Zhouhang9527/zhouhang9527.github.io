'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const url = process.env.GINKA_TEST_BASE_URL || 'http://127.0.0.1:4004';
(async () => {
  const browser = await chromium.launch(process.env.GINKA_CHROME_PATH
    ? { executablePath: process.env.GINKA_CHROME_PATH }
    : { channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
    await page.goto(url, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => window.GINKA_THEME && window.GinkaMotion);
    await page.evaluate(() => window.GINKA_THEME.set('day'));
    await page.waitForFunction(() => {
      const img = document.querySelector('.journal-hero-art');
      return img?.complete && img.naturalWidth && img.currentSrc.includes('hero-katana-day-') &&
        !document.querySelector('.ginka-hero-previous') && !document.body.classList.contains('sidebar-active');
    });
    // Delay the target CG so the outgoing image has to remain present.
    await page.route('**/hero-katana-night-*.webp', async route => {
      await new Promise(resolve => setTimeout(resolve, 700));
      await route.continue();
    });
    await page.evaluate(() => window.GINKA_THEME.set('moonlit'));
    await page.waitForFunction(() => !!document.querySelector('.ginka-hero-previous'));
    assert.equal(await page.locator('.ginka-hero-previous').count(), 1);
    await page.waitForFunction(() => {
      const img = document.querySelector('.journal-hero-art');
      return img?.complete && img.naturalWidth && img.currentSrc.includes('hero-katana-night-') &&
        !document.querySelector('.ginka-hero-previous');
    });
    await page.evaluate(() => { window.GINKA_THEME.set('day'); window.GINKA_THEME.set('moonlit'); });
    await page.waitForFunction(() => !document.querySelector('.ginka-hero-previous'));
    assert.equal(await page.locator('.journal-hero-dust i').count(), 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('.ginka-sword-stage'));
    await page.evaluate(() => window.GINKA_THEME.set('day'));
    await page.waitForFunction(() => {
      const img = document.querySelector('.journal-hero-art');
      return img?.complete && img.naturalWidth && img.currentSrc.includes('hero-katana-day-');
    });
    assert.equal(await page.locator('.ginka-hero-previous').count(), 0);
    console.log('PASS decoded CG transition, rapid theme toggles, no continuous dust, reduced motion');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
