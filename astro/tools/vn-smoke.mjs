import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GINKA_TEST_BASE_URL||'http://127.0.0.1:4321';
const origin=new URL(base).origin;
const original=process.env.GINKA_TEST_ORIGINAL==='1';
const browser=await chromium.launch();
fs.mkdirSync('artifacts/vn',{recursive:true});
const results=[];
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[],privateRequests=[],privateFailures=[];
  const isPrivate=url=>new URL(url).origin===origin&&/^\/__ginka_local_(title|ui|font|mascot)__\//.test(new URL(url).pathname);
  page.on('request',request=>{if(isPrivate(request.url()))privateRequests.push(request.url());});
  page.on('response',response=>{if(isPrivate(response.url())&&response.status()>=400)privateFailures.push(response.status()+' '+response.url());});
  page.on('requestfailed',request=>{if(isPrivate(request.url())&&request.failure()?.errorText!=='net::ERR_ABORTED')privateFailures.push(request.failure()?.errorText+' '+request.url());});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const result={width,mode:original?'original':'public',errors,privateRequests,privateFailures,ok:false};
  const visible=selector=>page.locator(selector).first().waitFor({state:'visible'});
  const go=async(path,selector)=>{await page.goto(base+path,{waitUntil:'domcontentloaded'});await visible(selector);};
  const back=async(selector)=>{result.step='return from '+new URL(page.url()).pathname;await page.locator(selector).click();await page.waitForURL(url=>url.pathname==='/');await visible('[data-vn-title]');};
  const shot=async name=>{
   result.lastScreenshot=name;result.url=page.url();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow: '+name);
   await page.screenshot({path:'artifacts/vn/'+width+'-'+name+'.png'});
  };
  try{
   await go('/','[data-vn-title]');
   assert.equal(await page.locator('[data-vn-continue]').isVisible(),false);
   assert.equal(await page.locator('[data-vn-next]').isVisible(),false);
   assert.equal(await page.locator('[data-vn-extra]').isVisible(),false);
   if(original)assert.equal(await page.locator('[data-vn-no-next]').isVisible(),false);else await visible('[data-vn-no-next][aria-disabled=true]');
   await visible('[data-vn-no-extra][aria-disabled=true]');
   assert.equal(await page.locator('[data-vn-next-new]').isVisible(),false);
   assert.equal(await page.locator('[data-vn-title]').getAttribute('data-vn-original'),String(original));
   // Locking EXTRA on the title must not prevent direct access to public articles.
   await go('/afterstory/','[data-vn-afterstory-locked]');
   assert.equal(await page.locator('[data-vn-afterstory-content]').isVisible(),false);
   await go('/','[data-vn-title]');
   assert.deepEqual(await page.locator('.vn-menu > :visible > span').allTextContents(),original?['CONTINUE','START','LOAD','SYSTEM','EXTRA','INFORMATION','EXIT']:['CONTINUE','NEXT','START','LOAD','SYSTEM','EXTRA','INFORMATION','EXIT']);
   await page.locator('[data-vn-start]').focus();
   await page.keyboard.press('ArrowDown');
   assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('href')),'/library/');
   await shot('title');
   let audio=await page.evaluateHandle(()=>document.querySelector('#bg-music'));
   await page.locator('[data-vn-start]').click();
   await visible('[data-vn-chapter]');
   await shot('chapter');
   const links=await page.locator('[data-vn-post]').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href')));
   assert.ok(links.length>=1);
   await page.locator('[data-vn-post]').first().click();
   await visible('.post-body');
   await visible('[data-vn-mark]');
   const dock=page.locator('.vn-game-buttons');
   await visible('[data-vn-game-reader]');
   if(!original){assert.equal(await page.locator('[data-ginka-mascot]').isVisible(),false);assert.equal(await dock.locator('[data-vn-game-action="vreplay"]').isDisabled(),true);assert.equal(await dock.locator('[data-vn-game-action="vsave"]').isDisabled(),true);}
   await dock.locator('[data-vn-game-action="qsave"]').click();
   assert.ok(await page.evaluate(()=>localStorage.getItem('ginka.vn.quick.v1')));
   await dock.locator('[data-vn-game-action="qload"]').click();
   await visible('[data-vn-confirm][open]');
   await page.locator('[data-vn-confirm-no]').click();
   await page.locator('[data-vn-confirm]').waitFor({state:'hidden'});
   await page.locator('[data-vn-quick-toggle]').click();
   await visible('[data-vn-quick-menu]');await shot('quick-menu');
   await page.keyboard.press('Escape');
   await page.locator('[data-vn-quick-menu]').waitFor({state:'hidden'});
   if(await page.locator('[data-vn-log-open]').count()){
    await dock.locator('[data-vn-game-action="log"]').click();
    await visible('[data-vn-backlog][data-vn-log-open=true]');
    assert.equal(await page.locator('[data-vn-article]').evaluate(el=>el.inert),true);
    await shot('backlog');
    await page.locator('[data-vn-log-close]').click();
    assert.equal(await page.locator('[data-vn-backlog]').getAttribute('data-vn-log-open'),null);
    assert.equal(await dock.locator('[data-vn-game-action="log"]').evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.locator('[data-vn-article]').evaluate(el=>el.inert),false);
   }
   await dock.locator('[data-vn-game-action="save"]').click();
   await visible('[data-vn-screen="load"][data-vn-save-mode=true]');
   assert.equal(await page.locator('[data-vn-save-tab]').isEnabled(),true);
   await page.locator('[data-vn-filter="manual"]').click();await visible('[data-vn-screen="load"][data-vn-save-mode=false]');
   await page.locator('[data-vn-save-tab]').click();await visible('[data-vn-screen="load"][data-vn-save-mode=true]');
   await page.locator('[data-vn-manual-action="0"]').click();
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ginka.vn.saves.v1')||'null')?.slots?.['0']);
   await page.locator('[data-vn-save-back]').click();await visible('.post-body');
   const article=page.url();
   await page.locator('.vn-game-buttons [data-vn-game-action="load"]').click();await visible('[data-vn-screen="load"][data-vn-save-mode=false]');
   assert.equal(await page.locator('[data-vn-save-tab]').isEnabled(),true);
   await page.locator('[data-vn-save-back]').click();await visible('.post-body');assert.equal(page.url(),article);
   const pathname=new URL(article).pathname;
   assert.ok(await page.evaluate(old=>old===document.querySelector('#bg-music'),audio),'Audio replaced by navigation');
   await page.locator('[data-vn-bookmark]').click();
   await page.locator('[data-vn-mark]').click();
   // The footer is genuinely clickable, not covered by the fixed dock.
   await page.locator('[data-vn-return]').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>{const link=document.querySelector('[data-vn-return]'),r=link?.getBoundingClientRect();if(!r)return false;const top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!top&&link.contains(top);});
   await page.waitForFunction(()=>document.querySelector('[data-vn-mark]')?.getAttribute('aria-pressed')==='true');
   // Persist a deterministic position to test explicit resume independent of
   // article length, remote image loading and scroll animation.
   await page.evaluate(path=>{
    const key='ginka.vn.progress.v1',state=JSON.parse(localStorage.getItem(key));
    state.positions[path]={ratio:.55,heading:null,section:.55};
    localStorage.setItem(key,JSON.stringify(state));
   },pathname);
   await back('[data-vn-return]');
   assert.equal(await page.locator('[data-vn-title]').getAttribute('data-vn-frame'),'data-003');
   // Exercise actual mainline completion, rather than directly injecting mainCleared.
   await page.evaluate(()=>{const key='ginka.vn.progress.v1',state=JSON.parse(localStorage.getItem(key));const title=document.querySelector('[data-vn-title]');const required=JSON.parse(title.dataset.vnMainline);if(required.length!==15)throw Error('v1 mainline changed');state.completed=required;state.mainCleared=false;localStorage.setItem(key,JSON.stringify(state));});
   await page.reload();await visible('[data-vn-next]');
   // Deliberate document reload invalidates JSHandles. Reacquire the persistent player for this document.
   audio=await page.evaluateHandle(()=>document.querySelector('#bg-music'));await visible('[data-vn-extra]');await visible('[data-vn-next-new]');
   assert.equal(await page.locator('[data-vn-next]').getAttribute('href'),'/afterstory/');
   await page.locator('[data-vn-next]').click();await visible('[data-vn-afterstory-content]');
   assert.equal(await page.locator('[data-vn-afterstory-locked]').isVisible(),false);
   await page.locator('[data-vn-afterstory-content] a').click();await visible('[data-vn-next]');
   assert.equal(await page.locator('[data-vn-next-new]').isVisible(),false);
   await page.locator('.vn-menu a[href="/gallery/"]').click();
   await page.locator('.vn-extra-nav a[href="/map/"]').click();
   await visible('[data-vn-map][data-vn-map-phase="first-encounter"]');
   await shot('map');
   await back('[data-vn-screen="map"] .vn-panel-header .vn-return');
   await page.locator('.vn-menu a[href="/library/"]').click();
   await visible('[data-vn-manual-grid]');
   assert.equal(await page.locator('[data-vn-save-tab]').isDisabled(),true,'Title LOAD must not invent a caller save');
   assert.equal(await page.locator('[data-vn-manual-slot]:visible').count(),10);
   assert.equal(await page.locator('[data-vn-manual-empty]:visible').count(),9);
   for(let i=0;i<14;i++){const next=page.locator('[data-vn-page-step="1"]');if(await next.isVisible())await next.click();else await page.locator('[data-vn-page="'+(i+1)+'"]').click();}
   assert.equal(await page.locator('[data-vn-manual-slot]').first().getAttribute('data-vn-manual-slot'),'140');
   assert.equal(await page.locator('[data-vn-manual-empty]:visible').count(),10);
   await page.locator('[data-vn-filter="quick"]').click();assert.equal(await page.locator('#vn-load-title').textContent(),'Q.LOAD');
   await page.locator('[data-vn-filter="manual"]').click();assert.equal(await page.locator('[data-vn-manual-empty]:visible').count(),9);
   await page.locator('[data-vn-filter="recent"]').click();await visible('[data-vn-slot]:visible');
   assert.equal(await page.locator('[data-vn-slot]:visible,[data-vn-empty-slot]:visible').count(),10);
   await page.locator('[data-vn-filter="bookmarks"]').click();
   assert.equal(await page.locator('[data-vn-slot]:visible').count(),1);
   await shot('load');
   await page.locator('[data-vn-slot]:visible [data-vn-resume]').click();
   await visible('.post-body');
   assert.equal(page.url(),article);
   await page.waitForFunction(()=>!sessionStorage.getItem('ginka.vn.resume.v1'));
   await back('[data-vn-return]');
   await page.locator('.vn-menu a[href="/gallery/"]').click();
   await visible('[data-vn-screen="gallery"]');
   const galleryCard=page.locator('.vn-gallery-grid .journal-scene-card').first();
   await galleryCard.click();
   await visible('.astro-gallery[open]');
   assert.equal(new URL(page.url()).pathname,'/gallery/','CG preview must not navigate to an image document');
   await page.keyboard.press('Escape');
   await page.locator('.astro-gallery').waitFor({state:'hidden'});
   await page.waitForFunction(()=>document.activeElement?.matches('.vn-gallery-grid .journal-scene-card'));
   assert.equal(new URL(page.url()).pathname,'/gallery/');
   assert.ok(await page.evaluate(old=>old===document.querySelector('#bg-music'),audio),'CG preview replaced persistent BGM');
   await shot('gallery');
   await back('[data-vn-screen="gallery"] .vn-panel-header .vn-return');
   await page.locator('.vn-menu a[href="/gallery/"]').click();
   await page.locator('.vn-extra-nav a[href="/search/"]').click();
   await visible('[data-vn-query]');
   await page.locator('[data-vn-query]').fill('Android');
   await visible('[data-vn-results] a');
   await shot('search');
   await back('[data-vn-screen="search"] .vn-panel-header .vn-return');
   await page.locator('.vn-menu a[href="/settings/"]').click();
   await visible('[data-vn-config]');
   await page.locator('[data-vn-option-tab="sound"]').click();
   await visible('[data-vn-music]');
   assert.equal(await page.locator('audio#bg-music').count(),1);
   await shot('sound');
   const volume=page.locator('[data-vn-volume]');await volume.focus();await volume.press('Home');
   await page.locator('[data-vn-option-tab="text"]').click();const size=page.locator('[data-vn-text-size]');await size.focus();await size.press('End');
   await page.waitForFunction(()=>localStorage.getItem('ginka.vn.text-size.v1')==='22');
   await page.locator('.vn-option-footer [data-vn-option-default]').click();await visible('[data-vn-confirm][open]');await page.locator('[data-vn-confirm-yes]').click();
   await page.waitForFunction(()=>localStorage.getItem('ginka.vn.text-size.v1')==='16');
   await page.locator('[data-vn-option-tab="sound"]').click();assert.equal(await volume.inputValue(),'0','TEXT reset must not reset BGM');
   await page.locator('.vn-option-footer [data-vn-option-default]').click({modifiers:['Shift']});await visible('[data-vn-confirm][open]');await page.locator('[data-vn-confirm-yes]').click();
   await page.waitForFunction(()=>document.querySelector('[data-vn-volume]')?.value==='88');
   assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('ginka.vn.saves.v1')||'null')?.slots?.['0']),'Settings reset must not delete saved progress');
   await page.locator('[data-vn-option-tab="display"]').click();
   await page.locator('input[name="vn-motion"][value="reduced"]').check();
   await page.locator('input[name="vn-mode"][value="reader"]').check();
   await shot('config');
   await page.goto(base+'/archives/',{waitUntil:'domcontentloaded'});
   await visible('[data-vn-view="reader"]');
   assert.equal(await page.locator('[data-vn-view="game"]').isVisible(),false);
   await shot('reader');
   await go('/settings/','[data-vn-config]');
   await page.locator('[data-vn-option-tab="display"]').click();
   await page.locator('input[name="vn-mode"][value="game"]').check();
   await back('[data-vn-option-back]');
   await visible('[data-vn-title]');
   await page.reload();
   await visible('[data-vn-continue]');
   assert.equal(await page.locator('[data-vn-title]').getAttribute('data-vn-frame'),'data-003');
   assert.deepEqual(errors,[]);
   assert.deepEqual(privateFailures,[]);
   if(original)assert.ok(privateRequests.some(url=>url.includes('/__ginka_local_title__/')),'Original title art not requested');
   else assert.deepEqual(privateRequests,[],'Production preview requested private assets');
   result.ok=true;
  }catch(error){result.url=page.url();result.error=String(error);await page.screenshot({path:'artifacts/vn/'+width+'-failure.png'}).catch(()=>{});}
  finally{results.push(result);await page.close();}
 }
 const motionPage=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'no-preference'});
 try{await motionPage.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());await motionPage.goto(base+'/');await motionPage.locator('[data-vn-start]').click();const overlay=motionPage.locator('[data-vn-title-departure]');await overlay.waitFor({state:'attached'});assert.equal(await overlay.evaluate(el=>el.getAnimations()[0]?.effect?.getTiming().duration),1000);await motionPage.keyboard.press('Escape');await motionPage.waitForURL(url=>url.pathname==='/archives/');await motionPage.locator('[data-vn-chapter]').waitFor();assert.equal(await overlay.count(),0);results.push({mode:'title-motion',ok:true});}catch(error){results.push({mode:'title-motion',ok:false,error:String(error),url:motionPage.url()});}finally{await motionPage.close();}
 const page=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:900}});
 try{await page.goto(base+'/');await page.locator('[data-vn-start]').click();await page.locator('[data-vn-post]').first().click();await page.locator('.post-body').waitFor();results.push({mode:'no-js',ok:true});}
 catch(error){results.push({mode:'no-js',ok:false,error:String(error)});}finally{await page.close();}
}finally{await browser.close();fs.writeFileSync('artifacts/vn/report.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
if(results.some(x=>!x.ok))process.exitCode=1;
