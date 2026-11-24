'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.GINKA_TEST_BASE_URL || 'http://127.0.0.1:4004';
(async () => {
  const browser = await chromium.launch(process.env.GINKA_CHROME_PATH ? {executablePath:process.env.GINKA_CHROME_PATH} : {channel:'chrome'});
  try {
    for (const width of [390,768,1440,1920]) {
      const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
      // Isolate comment layout from external Giscus/GitHub availability.
      // This is not a test of the live Discussions API or authentication.
      await page.route('https://giscus.app/client.js', route=>route.fulfill({contentType:'application/javascript',body:
        "(function(){const s=document.currentScript;const frame=document.createElement('iframe');frame.className='giscus-frame';frame.title='Mock comments';frame.src='https://giscus.app/en/widget?theme='+encodeURIComponent(s.dataset.theme);frame.style.height='230px';s.parentNode.append(frame);s.remove()})()"}));
      await page.route('https://giscus.app/en/widget?**', route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Mock Giscus</title><textarea aria-label="Comment"></textarea>'}));
      await page.goto(base,{waitUntil:'domcontentloaded'});
      const link = page.locator('.journal-entry h3 a, .post-title-link').first();
      const href = await link.getAttribute('href');
      assert.ok(href,'Missing article link');
      await page.goto(new URL(href,base).href,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.GINKA_THEME);
      const frame=page.locator('.journal-dialogue-frame');
      assert.equal(await frame.count(),1,'One introduction per article');
      for(const mode of ['day','moonlit']){
        await page.evaluate(mode=>window.GINKA_THEME.set(mode),mode);
        const bounds=await frame.evaluate(el=>{
          const body=document.querySelector('.post-body').getBoundingClientRect();
          const box=el.getBoundingClientRect();
          return {deltaLeft:Math.abs(body.left-box.left),deltaRight:Math.abs(body.right-box.right),height:box.height,overflow:document.documentElement.scrollWidth>innerWidth+1,separate:el.nextElementSibling?.classList.contains('journal-dialogue-comments')};
        });
        assert.ok(bounds.deltaLeft<4&&bounds.deltaRight<4,JSON.stringify({width,mode,...bounds}));
        assert.ok(bounds.height>=100&&bounds.height<=190,JSON.stringify(bounds));
        assert.ok(bounds.separate&&!bounds.overflow);
      }
      await frame.locator('.journal-dialogue-next').click();
      await page.locator('iframe.giscus-frame').waitFor();
      assert.equal(await page.locator('iframe.giscus-frame').count(),1);
      assert.equal(await page.locator('.journal-dialogue-frame iframe').count(),0);
      const before=(await frame.boundingBox()).height;
      await page.locator('iframe.giscus-frame').evaluate(el=>{el.style.height='1800px'});
      assert.equal((await frame.boundingBox()).height,before);
      console.log('PASS dialogue alignment, focus/advance, independent height',width);
      await page.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
