import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import config from '../config/site.json' with {type:'json'};
const browser=await chromium.launch({headless:true});
const base=process.env.GINKA_TEST_BASE_URL||'http://127.0.0.1:4321';
fs.mkdirSync('artifacts',{recursive:true});
const results=[];
const overflow=page=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
async function checkNav(page) {
 const bounds=await page.evaluate(()=>{
  const nav=document.querySelector('.site-nav').getBoundingClientRect();
  const controls=[...document.querySelectorAll('.main-menu > .menu-item')].map(e=>({label:e.textContent.trim(),rect:e.getBoundingClientRect().toJSON()})).filter(x=>x.rect.width>0);
  return {width:innerWidth,controls,nav,ok:controls.every(x=>x.rect.left>=nav.left-2&&x.rect.right<=nav.right+2)};
 });
 assert.ok(bounds.ok,JSON.stringify(bounds));
}
try {
 for(const width of [320,390,768,1440,1920])for(const mode of ['day','moonlit']){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const result={width,mode,ok:false,errors};
  try {
   await page.addInitScript(m=>localStorage.setItem('ginka-theme',m),mode);
   await page.goto(base+'/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(m=>window.GINKA_THEME?.theme===m&&document.documentElement.dataset.theme===m,mode);
   await page.evaluate(()=>document.fonts.ready);
   assert.ok(!await overflow(page),'home overflow');
   await checkNav(page);
   const feed=await page.locator('.journal-feed').evaluate(el=>({width:el.getBoundingClientRect().width,layout:el.parentElement.getBoundingClientRect().width}));
   assert.ok(width>960||feed.width>=feed.layout-2,'mobile feed squeezed: '+JSON.stringify(feed));
   await page.screenshot({path:`artifacts/${width}-${mode}-home.png`});
   await page.evaluate(()=>window.scrollTo(0,400));
   await page.waitForFunction(()=>window.scrollY>0);
   await page.keyboard.press('Control+k');
   const search=page.locator('.astro-search');
   await search.waitFor({state:'visible'});
   await page.locator('#astro-query').fill('Android');
   await page.locator('#astro-results a').first().waitFor({timeout:12000});
   await page.keyboard.press('Escape');
   assert.equal(await search.evaluate(e=>e.open),false);
   const trigger=page.locator('[data-journal-sidebar-open]:visible').first();
   await trigger.click();
   await page.waitForFunction(()=>document.body.classList.contains('sidebar-active'));
   await page.locator('.journal-sidebar-close').click();
   await page.waitForFunction(()=>!document.body.classList.contains('sidebar-active'));
   const old=await page.evaluateHandle(()=>document.querySelector('#bg-music'));
   await page.locator('.journal-entry h3 a').first().click();
   await page.locator('.post-body').waitFor();
   await page.waitForFunction(()=>document.querySelector('link[rel=canonical]')?.href.endsWith(location.pathname));
   assert.ok(await page.evaluate(audio=>audio===document.querySelector('#bg-music'),old),'audio replaced');
   assert.equal(await page.evaluate(()=>document.querySelector('link[rel=canonical]').href),config.url+new URL(page.url()).pathname);
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),mode);
   assert.ok(!await overflow(page),'article overflow');
   await page.screenshot({path:`artifacts/${width}-${mode}-article.png`});
   const section=page.locator('.journal-dialogue');
   await section.scrollIntoViewIfNeeded();
   const frame=page.locator('iframe.giscus-frame');
   await frame.waitFor({state:'attached',timeout:20000});
   assert.equal(await frame.count(),1);
   const editor=page.frameLocator('iframe.giscus-frame').locator('.gsc-comment-box').first();
   await editor.waitFor({state:'visible',timeout:25000});
   result.giscus=await editor.evaluate(e=>({gradient:getComputedStyle(e).backgroundImage,toolbar:getComputedStyle(e.querySelector('.gsc-comment-box-tabs'),'::after').backgroundImage}));
   assert.ok(result.giscus.gradient.includes('linear-gradient')&&result.giscus.toolbar.includes('linear-gradient'),'custom Giscus theme not applied');
   await frame.screenshot({path:`artifacts/${width}-${mode}-iframe.png`});
   await page.goBack();
   await page.locator('.journal-hero').waitFor();
   assert.ok(await page.evaluate(audio=>audio===document.querySelector('#bg-music'),old),'audio replaced on back');
   result.ok=true;
  } catch(error) {
   result.error=String(error);
   await page.screenshot({path:`artifacts/${width}-${mode}-failure.png`}).catch(()=>{});
  } finally {results.push(result);await page.close();}
 }
} finally {await browser.close();fs.writeFileSync('artifacts/report.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
if(results.some(x=>!x.ok||x.errors.length))process.exitCode=1;
