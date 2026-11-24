'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.GINKA_TEST_BASE_URL || 'http://127.0.0.1:4004';
const out = path.resolve(process.env.GINKA_SHOTS_DIR || 'artifacts/visual-review');
const issues = [];
const report = [];
const routes = [['home','/'],['archives','/archives/'],['tags','/tags/'],['categories','/categories/'],['links','/links/'],['about','/about/'],['404','/404.html']];
(async () => {
  await fs.mkdir(out,{recursive:true});
  const browser = await chromium.launch(process.env.GINKA_CHROME_PATH ? {executablePath:process.env.GINKA_CHROME_PATH} : {channel:'chrome'});
  try {
    // Discover a real article from the generated home page rather than hardcoding a permalink.
    const probe = await browser.newPage();
    await probe.goto(base,{waitUntil:'domcontentloaded'});
    const article = await probe.locator('.journal-entry h3 a, .post-title-link').first().getAttribute('href').catch(()=>null);
    if (article) routes.push(['article',article]);
    else issues.push('No article link found');
    await probe.close();
    for (const width of [390,768,1440,1920]) {
      for (const mode of ['day','moonlit']) {
        const context = await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce',colorScheme:mode==='day'?'light':'dark'});
        await context.addInitScript(m=>localStorage.setItem('ginka-theme',m),mode);
        const page = await context.newPage();
        const shot = async name => {
          await page.screenshot({path:path.join(out,width+'-'+mode+'-'+name+'.png'),animations:'disabled',timeout:15000});
        };
        for (const [name,route] of routes) {
          try {
            const response = await page.goto(new URL(route,base).href,{waitUntil:'domcontentloaded',timeout:25000});
            await page.waitForFunction(()=>window.GINKA_THEME,{timeout:10000});
            await page.waitForTimeout(400);
            await shot(name);
            const result = await page.evaluate(()=>({
              theme:document.documentElement.dataset.theme,
              overflow:document.documentElement.scrollWidth>innerWidth+1,
              hero:document.querySelector('.journal-hero-art')?.currentSrc||null,
              drawer:document.querySelector('#main-content')?.dataset.sceneKind||null,
              dialogue:document.querySelectorAll('.journal-dialogue').length
            }));
            report.push({width,mode,name,status:response?.status(),...result});
            if (result.theme!==mode||result.overflow||result.dialogue>1) issues.push(width+' '+mode+' '+name+' layout/theme');
            if(name==='article' && (width===390||width===1440)) {
              const code=page.locator('.journal-code').first();
              if(await code.count()){await code.scrollIntoViewIfNeeded();await shot('code');}
              const dialogue=page.locator('.journal-dialogue').first();
              if(await dialogue.count()){
                await dialogue.scrollIntoViewIfNeeded();await page.waitForTimeout(1000);await shot('comments');
                const frame=page.locator('.journal-dialogue-frame');
                const structure=await frame.evaluate(el=>({height:el.getBoundingClientRect().height,hasIframe:!!el.querySelector('iframe'),next:el.nextElementSibling?.classList.contains('journal-dialogue-comments')}));
                if(structure.hasIframe||!structure.next||structure.height>190)issues.push(width+' '+mode+' dialogue structure');
                const count=await page.locator('iframe.giscus-frame').count();
                report.push({width,mode,name:'giscus',count,structure});
                if(count>1)issues.push(width+' '+mode+' duplicate Giscus');
              }
            }
            if(name==='home'&&(width===390||width===1440)) {
              const drawer=page.locator('[data-journal-sidebar-open]').first();
              if(await drawer.isVisible()){
                await drawer.click();await page.waitForTimeout(350);await shot('sidebar');
                const playlist=page.locator('#music-playlist-toggle');
                if(await playlist.isVisible()){await playlist.click();await page.waitForTimeout(250);await shot('playlist');}
                await page.locator('.journal-sidebar-close').click();await page.waitForTimeout(300);
              }
              const search=page.locator('.popup-trigger').first();
              if(await search.isVisible()){await search.click();await page.waitForTimeout(400);await shot('search');await page.keyboard.press('Escape');}
              if(width===1440){
                await page.mouse.click(900,480,{button:'right'});await shot('context-menu');await page.mouse.click(900,480);
              }
              const gallery=page.locator('.journal-scene-card').first();
              if(await gallery.count()){await gallery.scrollIntoViewIfNeeded();await gallery.click();await page.waitForTimeout(600);await shot('fancybox');await page.keyboard.press('Escape');}
              const atri=page.locator('#atri-launcher');
              if(await atri.isVisible()){await atri.click();await page.waitForTimeout(1800);await shot('atri');}
            }
          } catch(error){issues.push(width+' '+mode+' '+name+': '+error.message);}
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({report,issues},null,2));
  }
  if(issues.length){console.error(issues.join('\n'));process.exitCode=1;}
})().catch(error=>{console.error(error);process.exit(1);});
