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
      const section=page.locator('.journal-dialogue');
      assert.equal(await section.count(),1,'One real comment area per article');
      assert.equal(await page.locator('.journal-dialogue-frame,.journal-dialogue-intro,.journal-dialogue-next').count(),0,'No introductory scene');
      for(const mode of ['day','moonlit']){
        await page.evaluate(mode=>window.GINKA_THEME.set(mode),mode);
        const bounds=await section.evaluate(el=>{
          const body=document.querySelector('.post-body').getBoundingClientRect();
          const box=el.getBoundingClientRect();
          return {deltaLeft:Math.abs(body.left-box.left),deltaRight:Math.abs(body.right-box.right),overflow:document.documentElement.scrollWidth>innerWidth+1,widget:!!el.querySelector('#journal-comments .giscus-container')};
        });
        assert.ok(bounds.deltaLeft<4&&bounds.deltaRight<4,JSON.stringify({width,mode,...bounds}));
        assert.ok(bounds.widget&&!bounds.overflow,JSON.stringify(bounds));
      }
      await section.scrollIntoViewIfNeeded();
      await page.locator('iframe.giscus-frame').waitFor();
      assert.equal(await page.locator('iframe.giscus-frame').count(),1);
      const frame=page.locator('iframe.giscus-frame');
      assert.ok(await frame.evaluate(el=>el.getBoundingClientRect().width<=el.closest('.journal-dialogue').getBoundingClientRect().width+1));
      await frame.evaluate(el=>{el.style.height='1800px'});
      assert.equal(await page.locator('.journal-dialogue-frame').count(),0);
      assert.ok(await section.evaluate(el=>el.getBoundingClientRect().height>=1800));
      console.log('PASS direct comment area, lazy loading and reading alignment',width);
      await page.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
