import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import config from '../config/site.json' with {type:'json'};
const browser=await chromium.launch({headless:true});
const base=process.env.GINKA_TEST_BASE_URL||'http://127.0.0.1:4321';
fs.mkdirSync('artifacts',{recursive:true});
const results=[];
const overflow=page=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
async function checkStaticComments(page) {
 await page.goto(base+'/about/',{waitUntil:'domcontentloaded'});
 const audio=await page.evaluateHandle(()=>document.querySelector('#bg-music'));
 async function checkAbout() {
  await page.locator('.journal-static-content').waitFor();
  await page.locator('.giscus-container').waitFor({state:'attached'});
  assert.equal(await page.locator('.giscus-container').count(),1,'one about comment surface');
  assert.equal(await page.locator('#journal-comments').count(),1,'one about comment anchor');
  for(const [attribute,key] of Object.entries({'repo':'repo','repo-id':'repoId','category-id':'categoryId','mapping':'mapping'})) {
   assert.equal(await page.locator('.giscus-container').getAttribute('data-'+attribute),config.giscus[key]);
  }
  await page.locator('#journal-comments').scrollIntoViewIfNeeded();
  const frame=page.locator('iframe.giscus-frame');
  await frame.waitFor({state:'attached',timeout:20000});
  assert.equal(await frame.count(),1,'no duplicate about Giscus iframe');
  const src=new URL(await frame.getAttribute('src'));
  assert.equal(src.origin,'https://giscus.app');
  assert.equal(src.searchParams.get('repo'),config.giscus.repo);
  assert.equal(src.searchParams.get('repoId'),config.giscus.repoId);
  assert.equal(src.searchParams.get('categoryId'),config.giscus.categoryId);
  assert.equal(src.searchParams.get('term'),'about/','legacy pathname discussion term');
  await page.frameLocator('iframe.giscus-frame').locator('.gsc-comment-box').first().waitFor({state:'visible',timeout:25000});
  assert.ok(!await overflow(page),'about overflow');
 }
 await checkAbout();
 await page.locator('[data-journal-sidebar-open]:visible').first().click();
 await page.locator('.journal-sidebar-links a[href="/links/"]').click();
 await page.waitForURL(base+'/links/');
 await page.locator('.journal-static-content').waitFor();
 assert.equal(await page.locator('.giscus-container,iframe.giscus-frame,[data-vn-backlog]').count(),0,'links must not inherit about comments');
 assert.ok(await page.evaluate(old=>old===document.querySelector('#bg-music'),audio),'about to links replaced persistent audio');
 await page.goBack();
 await page.waitForURL(base+'/about/');
 await checkAbout();
 assert.ok(await page.evaluate(old=>old===document.querySelector('#bg-music'),audio),'about history return replaced persistent audio');
 await page.goto(base+'/information/',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('.giscus-container,iframe.giscus-frame,[data-vn-backlog]').count(),0,'INFORMATION must not duplicate about comments');
 return {term:'about/',loaded:true,linksClean:true,historyIdentity:true,informationClean:true};
}
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
   assert.ok(!await overflow(page),JSON.stringify(await page.evaluate(()=>({error:'home overflow',width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.right>innerWidth+2&&getComputedStyle(e).position!=='fixed'&&!e.closest('.journal-scene-strip,.sidebar,.journal-mobile-links')}).slice(0,12).map(e=>({tag:e.tagName,class:e.className?.toString(),right:e.getBoundingClientRect().right}))}))));
   await page.locator('[data-vn-title][data-vn-cover="torii"][data-vn-stage="arrival"]').waitFor();
   assert.equal(await page.locator('.header').isVisible(),false,'traditional header on title screen');
   assert.equal(await page.locator('[data-vn-continue]').isVisible(),false,'continue visible without a save');
   assert.equal(await page.locator('[data-vn-title]').getAttribute('data-vn-frame'),'arrival');
   const fixedCover=await page.locator('[data-vn-art]').evaluate(el=>getComputedStyle(el).backgroundImage);
   assert.equal(fixedCover,'none','public title must not substitute unapproved artwork');
   assert.equal(await page.locator('[data-vn-title]').getAttribute('data-vn-character-present'),'true','initial title stage follows observed title_base/data-003 state');
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
   await page.waitForFunction(()=>!document.querySelector('.astro-search').open,{}, {timeout:3000});
   // The original title hides the reader shell; exercise the sidebar in its real mode.
   await page.locator('[data-vn-mode-set="reader"][href="#latest"]').click();
   await page.waitForFunction(()=>document.documentElement.dataset.vnMode==='reader');
   const trigger=page.locator('[data-journal-sidebar-open]:visible').first();
   await trigger.click();
   await page.waitForFunction(()=>document.body.classList.contains('sidebar-active'));
   await page.locator('.journal-sidebar-close').click();
   await page.waitForFunction(()=>!document.body.classList.contains('sidebar-active'));
   await page.locator('.vn-reader-return[data-vn-mode-toggle]').click();
   await page.waitForFunction(()=>document.documentElement.dataset.vnMode==='game');
   const old=await page.evaluateHandle(()=>document.querySelector('#bg-music'));
   await page.locator('[data-vn-start]').click();
   await page.locator('[data-vn-confirm][open]').waitFor({state:'visible'});
   await page.locator('[data-vn-confirm-yes]').click();
   await page.waitForURL(base+'/archives/');
   await page.locator('[data-vn-chapter]').waitFor();
   await checkNav(page);
   assert.ok(!await overflow(page),'chapter overflow');
   await page.screenshot({path:`artifacts/${width}-${mode}-chapter.png`});
   await page.locator('[data-vn-post]').first().click();
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
   const articleFrame=new URL(await frame.getAttribute('src'));
   assert.equal(articleFrame.searchParams.get('term'),new URL(page.url()).pathname.replace(/^\//,''),'article pathname discussion term');
   assert.equal(articleFrame.searchParams.get('repo'),config.giscus.repo);
   const editor=page.frameLocator('iframe.giscus-frame').locator('.gsc-comment-box').first();
   await editor.waitFor({state:'visible',timeout:25000});
   result.giscus=await editor.evaluate(e=>({gradient:getComputedStyle(e).backgroundImage,toolbar:getComputedStyle(e.querySelector('.gsc-comment-box-tabs'),'::after').backgroundImage}));
   assert.ok(result.giscus.gradient.includes('linear-gradient')&&result.giscus.toolbar.includes('linear-gradient'),'custom Giscus theme not applied');
   await frame.screenshot({path:`artifacts/${width}-${mode}-iframe.png`});
   const articleURL=page.url();
   await page.locator('[data-vn-bookmark]').click();
   await page.locator('[data-vn-bookmark][aria-pressed="true"]').waitFor();
   await page.locator('[data-vn-mark]').click();
   await page.waitForFunction(()=>document.querySelector('[data-vn-mark]')?.getAttribute('aria-pressed')==='true');
   await page.goBack();
   await page.locator('[data-vn-chapter]').waitFor();
   assert.ok(await page.evaluate(audio=>audio===document.querySelector('#bg-music'),old),'audio replaced on back');
   await page.locator('.vn-return').click();
   await page.locator('[data-vn-title][data-vn-cover="torii"][data-vn-stage="first-encounter"]').waitFor();
   assert.equal(await page.locator('[data-vn-art]:visible').count(),1,'multiple active cover art layers');
   assert.equal(await page.locator('[data-vn-art]').evaluate(el=>getComputedStyle(el).backgroundImage),fixedCover,'progress changed title background');
   assert.equal(await page.locator('[data-vn-title]').getAttribute('data-vn-character-present'),'true');
   assert.equal(await page.locator('[data-vn-title]').getAttribute('data-vn-expression'),'eyes-open');
   assert.equal(await page.locator('[data-vn-title]').getAttribute('data-vn-frame'),'first-encounter');
   assert.equal(await page.locator('[data-vn-title]').getAttribute('data-vn-frame-render'),'unavailable');
   assert.equal(await page.locator('[data-vn-character-art]').count(),0,'no character overlay');
   await page.screenshot({path:`artifacts/${width}-${mode}-unlocked.png`});
   await page.locator('[data-vn-continue]').click();
   await page.waitForURL(articleURL);
   await page.locator('[data-vn-mark][aria-pressed="true"]').waitFor();
   await page.locator('[data-vn-return]').click();
   await page.locator('[data-vn-title][data-vn-cover="torii"][data-vn-stage="first-encounter"]').waitFor();
   assert.ok(await page.evaluate(audio=>audio===document.querySelector('#bg-music'),old),'audio replaced on title return');
   if(width===390){
    await page.locator('.vn-menu a[href="/library/"]').click();
    await page.locator('[data-vn-screen="load"]').waitFor();
    await page.locator('[data-vn-manual-grid]:visible').waitFor();
    assert.equal(await page.locator('[data-vn-manual-slot]:visible').count(),10);
    await page.locator('[data-vn-filter="bookmarks"]').click();
    assert.equal(await page.locator('[data-vn-slot]:visible').count(),1);
    assert.ok(!await overflow(page),'load overflow');
    await page.screenshot({path:`artifacts/${width}-${mode}-load.png`});
    await page.locator('.vn-load-return:visible').click();
    await page.waitForURL(base+'/');
    assert.equal(await page.locator('[data-vn-extra]').isVisible(),false);
    // EXTRA is locked on title, but the public gallery remains reachable.
    await page.goto(base+'/gallery/',{waitUntil:'domcontentloaded'});
    await page.locator('[data-vn-screen="gallery"]').waitFor();
    await page.locator('[data-gallery-unavailable]').waitFor({state:'visible'});
    assert.equal(await page.locator('.vn-gallery-grid .journal-scene-card').count(),0);
    assert.ok(!await overflow(page),'gallery overflow');
    await page.screenshot({path:`artifacts/${width}-${mode}-gallery.png`});
    await page.locator('[data-vn-screen="gallery"] .vn-panel-header .vn-return').click();
    await page.waitForURL(base+'/');
    await page.locator('.vn-menu a[href="/settings/"]').click();
    await page.locator('[data-vn-config]:visible').waitFor();
    await page.locator('[data-vn-option-tab="sound"]').click();
    await page.locator('[data-vn-volume]').waitFor();
    await page.locator('[data-vn-option-tab="display"]').click();
    await page.locator('input[name="vn-motion"][value="reduced"]').check();
    await page.waitForFunction(()=>document.documentElement.dataset.vnMotion==='reduced');
    await page.screenshot({path:`artifacts/${width}-${mode}-config.png`});
    await page.locator('[data-vn-option-back]').click();
    await page.waitForURL(base+'/');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('[data-vn-title][data-vn-cover="torii"][data-vn-stage="first-encounter"]').waitFor();
    await page.locator('[data-vn-continue]').click();
    await page.locator('[data-vn-mark][aria-pressed="true"]').click();
    await page.locator('[data-vn-mark][aria-pressed="false"]').waitFor();
    await page.locator('[data-vn-return]').click();
    await page.locator('[data-vn-title][data-vn-cover="torii"][data-vn-stage="arrival"]').waitFor();
   }
   result.ok=true;
  } catch(error) {
   result.url=page.url();result.error=String(error);
   await page.screenshot({path:`artifacts/${width}-${mode}-failure.png`}).catch(()=>{});
  } finally {results.push(result);await page.close();}
 }
 for(const width of [390,1440])for(const mode of ['day','moonlit']){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const result={width,mode,check:'live-static-comments',ok:false,errors:[]};
  page.on('pageerror',error=>result.errors.push(error.message));
  try{
   await page.addInitScript(theme=>{localStorage.setItem('ginka-theme',theme);localStorage.setItem('ginka.vn.mode.v1','reader');},mode);
   result.giscus=await checkStaticComments(page);
   result.ok=true;
  }catch(error){result.url=page.url();result.error=String(error);await page.screenshot({path:`artifacts/${width}-${mode}-static-comments-failure.png`}).catch(()=>{});}
  finally{results.push(result);await page.close();}
 }
 const noJS=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:900}});
 try{
  await noJS.goto(base+'/');await noJS.locator('[data-vn-start]').click();await noJS.locator('[data-vn-post]').first().click();await noJS.locator('.post-body').waitFor();
  results.push({mode:'no-js',ok:true,errors:[]});
 }catch(error){results.push({mode:'no-js',ok:false,error:String(error),errors:[]});}finally{await noJS.close();}
} finally {await browser.close();fs.writeFileSync('artifacts/report.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
if(results.some(x=>!x.ok||x.errors.length))process.exitCode=1;
