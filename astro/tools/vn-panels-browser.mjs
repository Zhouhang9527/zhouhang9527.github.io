// Dedicated D UI verification against an explicitly running isolated dev server.
// Real private assets are opt-in; network failure fixtures are labelled separately.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const base=process.env.GINKA_TEST_BASE_URL||'http://127.0.0.1:4354';
const original=process.env.GINKA_TEST_ORIGINAL==='1';
const integrated=process.env.GINKA_TEST_INTEGRATED==='1';
const out=process.env.GINKA_TEST_OUTPUT||'artifacts/vn/d-panels';
fs.mkdirSync(out,{recursive:true});
const results=[],browser=await chromium.launch();
const settingsKey='ginka.vn.playback.v1',progressKey='ginka.vn.progress.v1';
try{
 for(const width of [320,390,768,1024,1440,1920]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width<800});
  const page=await context.newPage(),result={width,original,integrated,checks:[],errors:[],ok:false};results.push(result);
  page.on('pageerror',e=>result.errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const wait=selector=>page.locator(selector).first().waitFor({state:'visible'});
  const check=async(name,fn)=>{await fn();result.checks.push(name);};
  const overflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  const confirm=async(yes)=>{await wait('[data-vn-confirm][open]');assert.equal(await page.locator('[data-vn-confirm-no]').evaluate(e=>e===document.activeElement),true);if(yes)await page.locator('[data-vn-confirm-yes]').click();else await page.keyboard.press('Escape');await page.locator('[data-vn-confirm][open]').waitFor({state:'hidden'});};
  try{
   await page.goto(base+'/settings/');await wait('[data-vn-config]');
   await check('seven tabs and roving keyboard focus',async()=>{
    assert.equal(await page.locator('[data-vn-option-tab]').count(),7);
    await page.locator('[data-vn-option-tab=display]').focus();await page.keyboard.press('End');
    assert.equal(await page.locator('[data-vn-option-tab=shortcut]').evaluate(e=>e===document.activeElement),true);
    await page.keyboard.press('Home');assert.equal(await page.locator('[data-vn-option-tab=display]').getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('[data-vn-option-panel]:not([hidden])').count(),1);await overflow();
   });
   await check('mode, motion and reader theme are actual persisted controls',async()=>{
    await page.locator('input[name=vn-motion][value=reduced]').check();
    await page.locator('[data-vn-theme=moonlit]').click();
    await page.waitForFunction(()=>document.documentElement.dataset.theme==='moonlit');
    await page.locator('input[name=vn-mode][value=reader]').check();
    assert.equal(await page.evaluate(()=>document.documentElement.dataset.vnMode),'reader');
    await page.locator('input[name=vn-mode][value=game]').check();
    assert.equal(await page.locator('[data-vn-theme=moonlit]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-vn-playback=effectSpeed]').focus();await page.keyboard.press('End');
    assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).effectSpeed,settingsKey),2);
   });
   await check('text and AUTO/SKIP settings validate, persist and reset only current page',async()=>{
    await page.locator('[data-vn-option-tab=text]').click();
    for(const key of ['textRevealMs','autoGapMs','autoScrollSpeed']){await page.locator('[data-vn-playback='+key+']').focus();await page.keyboard.press('End');}
    await page.locator('[data-vn-playback=skipSeenOnly]').uncheck();
    await page.locator('[data-vn-text-size]').focus();await page.keyboard.press('End');
    const values=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),settingsKey);
    assert.deepEqual([values.textRevealMs,values.autoGapMs,values.autoScrollSpeed,values.skipSeenOnly,values.effectSpeed],[100,5000,180,false,2]);
    assert.equal(await page.locator('[data-vn-text-sample]').evaluate(e=>getComputedStyle(e).fontSize),'22px');
    await page.locator('.vn-option-footer [data-vn-option-default]').click();
    await wait('[data-vn-confirm][open]');await page.keyboard.press('Tab');
    assert.equal(await page.locator('[data-vn-confirm-yes]').evaluate(e=>e===document.activeElement),true);
    await page.keyboard.press('Shift+Tab');assert.equal(await page.locator('[data-vn-confirm-no]').evaluate(e=>e===document.activeElement),true);
    await page.keyboard.press('Escape');await page.locator('[data-vn-confirm][open]').waitFor({state:'hidden'});
    assert.equal(await page.locator('[data-vn-text-size]').inputValue(),'22');
    assert.equal(await page.locator('.vn-option-footer [data-vn-option-default]').evaluate(e=>e===document.activeElement),true);
    await page.locator('.vn-option-footer [data-vn-option-default]').click();await confirm(true);
    await page.waitForFunction(()=>document.querySelector('[data-vn-text-size]').value==='16');
    assert.equal(await page.locator('[data-vn-text-size]').inputValue(),'16');
    const reset=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),settingsKey);
    assert.deepEqual([reset.textRevealMs,reset.autoGapMs,reset.autoScrollSpeed,reset.skipSeenOnly,reset.effectSpeed],[30,700,45,true,2]);
    assert.equal(await page.evaluate(()=>localStorage.getItem('ginka-theme')),'moonlit');await overflow();
   });
   await check('DIALOG preferences persist, DEFAULT is unconditional and resets all five',async()=>{
    await page.locator('[data-vn-option-tab=dialog]').click();
    for(const item of await page.locator('[data-vn-confirm-setting]').all())await item.uncheck();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ginka.vn.confirm.v1')).qsave),false);
    await page.locator('.vn-option-footer [data-vn-option-default]').click();await confirm(true);
    await page.waitForFunction(()=>document.querySelectorAll('[data-vn-confirm-setting]:checked').length===5);
    assert.equal(await page.locator('[data-vn-confirm-setting]:checked').count(),5);
    await page.locator('[data-vn-option-default=all]').click();await confirm(false);
   });
   await check('all seven panels fit, controls remain keyboard and touch reachable',async()=>{
    for(const key of ['display','program','text','sound','dialog','touch','shortcut']){
     await page.locator('[data-vn-option-tab='+key+']').click();await wait('[data-vn-option-panel='+key+']');await overflow();
     if(width<800){const small=await page.locator('[data-vn-option-tab]').evaluateAll(items=>items.some(e=>e.getBoundingClientRect().height<44));assert.equal(small,false);}
    }
   });
   await check('fullscreen rejection has visible retry feedback (failure fixture)',async()=>{
    await page.locator('[data-vn-option-tab=display]').click();
    if(await page.locator('[data-vn-window=full]').isEnabled()){
     await page.evaluate(()=>{window.__dRequestFullscreen=document.documentElement.requestFullscreen;document.documentElement.requestFullscreen=()=>Promise.reject(new Error('D blocked fullscreen fixture'));});
     await page.locator('[data-vn-window=full]').click();await page.waitForFunction(()=>document.querySelector('[data-vn-display-feedback]').textContent.includes('未允许'));
     await page.evaluate(()=>document.documentElement.requestFullscreen=window.__dRequestFullscreen);
    }
   });
   await check('read-only storage keeps validated session event and truthful DEFAULT failure feedback',async()=>{
    await page.locator('[data-vn-option-tab=text]').click();await page.locator('[data-vn-playback=textRevealMs]').focus();await page.keyboard.press('End');
    await page.evaluate(()=>{const original=Storage.prototype.setItem;window.__dRestoreStorage=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(key,value){if(key==='ginka.vn.playback.v1'||key==='ginka.vn.text-size.v1')throw new DOMException('D read-only fixture','QuotaExceededError');return original.call(this,key,value);};window.__dPlaybackSeen=null;document.addEventListener('vn:playback-change',event=>window.__dPlaybackSeen=event.detail);});
    await page.locator('[data-vn-playback=textRevealMs]').focus();await page.keyboard.press('Home');
    assert.equal(await page.evaluate(()=>window.__dPlaybackSeen.textRevealMs),0);assert.equal(await page.locator('[data-vn-playback=textRevealMs]').inputValue(),'0');
    assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).textRevealMs,settingsKey),100);
    await page.locator('.vn-option-footer [data-vn-option-default]').click();await confirm(true);
    await page.waitForFunction(()=>document.querySelector('[data-vn-option-feedback]').textContent.includes('未能全部保存'));
    assert.equal(await page.evaluate(()=>window.__dPlaybackSeen.textRevealMs),30);
    assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).textRevealMs,settingsKey),100);
    await page.evaluate(()=>window.__dRestoreStorage());await page.reload();await wait('[data-vn-option-panel=text]');
    assert.equal(await page.locator('[data-vn-playback=textRevealMs]').inputValue(),'100');
   });
   await page.goto(base+'/library/');await wait('[data-vn-manual-grid]:not([hidden])');
   await check('all 150 independent manual slots and 15 pages are reachable',async()=>{
    const slots=[];
    for(let index=0;index<15;index++){
     if(index)await page.locator('[data-vn-page="'+index+'"]').click();
     const values=await page.locator('[data-vn-manual-slot]').evaluateAll(nodes=>nodes.filter(n=>!n.hidden).map(n=>Number(n.dataset.vnManualSlot)));
     assert.deepEqual(values,Array.from({length:10},(_,i)=>index*10+i));slots.push(...values);
     if(index<14&&width<960&&!(await page.locator('[data-vn-page="'+(index+1)+'"]').count()))throw Error('Next page inaccessible');
    }
    assert.equal(new Set(slots).size,150);await overflow();
   });
   if(original&&width>=960)await check('LOAD PBD geometry incl viewport wider than 16:9 canvas',async()=>{
    const actual=await page.locator('[data-vn-manual-slot]').first().evaluate(e=>{const r=e.getBoundingClientRect(),s=e.closest('.vn-load').getBoundingClientRect(),scale=1280/s.width;return [(r.x-s.x)*scale,(r.y-s.y)*scale,r.width*scale,r.height*scale];});
    for(const [i,expected] of [35,158,589,93].entries())assert.ok(Math.abs(actual[i]-expected)<1.1,JSON.stringify(actual));
   });
   if(original){
    await page.goto(base+'/gallery/');await wait('[data-vn-gallery-locked]');
    await check('locked EXTRA does not request scene images',async()=>{assert.equal(await page.locator('[data-vn-gallery-content]').isVisible(),false);assert.equal(await page.locator('[data-vn-gallery-src][src]').count(),0);});
    await page.evaluate(k=>localStorage.setItem(k,JSON.stringify({version:1,completed:[],mainCleared:true})),progressKey);await page.reload();
    await check('EXTRA local mainline unlock opens actual images in the one dialog',async()=>{
     await wait('.vn-gallery-grid .journal-scene-card');const first=page.locator('.vn-gallery-grid .journal-scene-card').first();
     await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-vn-gallery-src]')).every(img=>img.complete&&img.naturalWidth>0));
     await first.click();await wait('.astro-gallery[open]');await page.keyboard.press('Escape');await page.locator('.astro-gallery[open]').waitFor({state:'hidden'});
     assert.equal(await first.evaluate(e=>e===document.activeElement),true);await overflow();
    });
   }
   assert.deepEqual(result.errors,[]);result.ok=true;
  }catch(error){result.failure=error.stack||String(error);result.url=page.url();await page.screenshot({path:path.join(out,width+'-failure.png')}).catch(()=>{});}
  finally{await context.close();}
 }
}finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.ok))process.exitCode=1;
