// Real localhost private recordings + existing single voice audio. External
// Giscus/music requests are blocked; this is NOT a live Giscus/provider test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const base=process.env.GINKA_TEST_BASE_URL||'http://127.0.0.1:4354';
const out=process.env.GINKA_TEST_OUTPUT||'artifacts/vn/d-backlog';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),results=[],HISTORY='ginka.vn.voice.history.v1';
try{
 for(const width of [390,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width===390});
  const result={width,realPrivateRecordings:true,externalServices:'blocked',checks:[],errors:[],ok:false};results.push(result);page.on('pageerror',e=>result.errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const visible=s=>page.locator(s).first().waitFor({state:'visible'});
  const check=async(name,fn)=>{await fn();result.checks.push(name);};
  try{
   await page.goto(base+'/library/');await visible('[data-vn-manual-grid]');const article=await page.locator('[data-vn-slot]').first().getAttribute('data-vn-slot');
   await page.goto(base+article);await visible('[data-ginka-mascot]:not([hidden]) [data-mascot-action=open]');await visible('[data-vn-game-reader]:not([hidden])');
   await page.evaluate(()=>{window.__dVoice=document.querySelector('[data-mascot-audio]');window.__dBgm=document.querySelector('#bg-music');window.__dComments=document.querySelector('.giscus-container');});
   await check('real private voice starts and only actual successful plays enter BACKLOG',async()=>{
    assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'{"entries":[]}').entries.length,HISTORY),0);
    await page.locator('[data-mascot-action=open]').click();
    await page.waitForFunction(k=>{const a=document.querySelector('[data-mascot-audio]');return a?.readyState>=2&&!a.paused&&!a.error&&JSON.parse(localStorage.getItem(k)||'{"entries":[]}').entries.length>0;},HISTORY);
    const audio=await page.locator('[data-mascot-audio]').evaluate(a=>({duration:a.duration,source:a.getAttribute('src'),count:document.querySelectorAll('[data-mascot-audio]').length}));
    assert.ok(audio.duration>0);assert.match(audio.source,/^\/__ginka_local_mascot__\/asset-\d+\./);assert.equal(audio.count,1);
   });
   await check('BACKLOG defaults to real history, keeps comments container and traps focus',async()=>{
    await page.locator('.vn-game-buttons [data-vn-game-action=log]').click();await visible('[data-vn-log-open=true]');
    await page.waitForFunction(()=>document.querySelector('[data-vn-log-panel=dialogue]').hidden===false);
    assert.equal(await page.locator('[data-vn-log-tab=dialogue]').getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('[data-mascot-audio]').evaluate(a=>a.paused),true);
    assert.equal(await page.locator('[data-vn-log-close]').evaluate(e=>e===document.activeElement),true);
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('[data-vn-backlog]').contains(document.activeElement)),true);
    const replay=page.locator('[data-vn-voice-history-replay]').last();await replay.focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('[data-vn-backlog]').contains(document.activeElement)),true);
    assert.equal(await page.evaluate(()=>window.__dComments===document.querySelector('.giscus-container')),true);
   });
   await check('history replay/save/stop use the existing audio and never append replay history',async()=>{
    const before=await page.evaluate(k=>localStorage.getItem(k),HISTORY);
    const replay=page.locator('[data-vn-voice-history-replay]').last(),save=page.locator('[data-vn-voice-history-save]').last();
    await replay.click();await page.waitForFunction(()=>{const a=document.querySelector('[data-mascot-audio]');return a&&!a.paused&&a.readyState>=2;});
    await page.waitForFunction(()=>document.querySelector('.vn-voice-history-row[data-playing=true]'));
    assert.equal(await replay.getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(k=>localStorage.getItem(k),HISTORY),before);
    await save.click();await page.waitForFunction(()=>document.querySelector('[data-vn-voice-history-save][aria-pressed=true]'));
    await page.locator('[data-vn-log-panel=dialogue] [data-vn-voice-stop]').click();assert.equal(await page.locator('[data-mascot-audio]').evaluate(a=>a.paused),true);
    assert.equal(await page.evaluate(()=>window.__dVoice===document.querySelector('[data-mascot-audio]')),true);
    await replay.click();await page.waitForFunction(()=>!document.querySelector('[data-mascot-audio]').paused);
    await page.keyboard.press('Escape');await page.locator('[data-vn-log-open=true]').waitFor({state:'hidden'});
    assert.equal(await page.locator('[data-mascot-audio]').evaluate(a=>a.paused),true);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),HISTORY),before);
   });
   await check('BACKLOG tabs and page controls remain operable, close restores normal page/inert',async()=>{
    await page.locator('.vn-game-buttons [data-vn-game-action=log]').click();await visible('[data-vn-log-open=true]');
    await page.locator('[data-vn-log-tab=comments]').click();assert.equal(await page.locator('[data-vn-log-panel=comments]').isVisible(),true);
    await page.keyboard.press('End');assert.equal(await page.locator('[data-vn-log-tab=dialogue]').evaluate(e=>e===document.activeElement),true);
    for(const direction of ['top','up','down','end'])await page.locator('[data-vn-log-scroll='+direction+']').click();
    await page.locator('[data-vn-log-close]').click();await page.locator('[data-vn-log-open=true]').waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');
    assert.equal(await page.evaluate(()=>document.querySelector('[data-vn-article]').inert||document.querySelector('main').inert),false);
    assert.equal(await page.locator('.vn-game-buttons [data-vn-game-action=log]').evaluate(e=>e===document.activeElement),true);
   });
   await page.locator('.vn-game-buttons [data-vn-game-action=option]').click();await page.waitForURL(base+'/settings/');await visible('[data-vn-config]');await page.locator('[data-vn-option-tab=sound]').click();await visible('[data-vn-voice-volume]');
   await check('SOUND volume/mute act on real audio; DEFAULT resets VOICE 80/unmuted and BGM88',async()=>{
    await page.locator('[data-vn-voice-volume]').focus();await page.keyboard.press('Home');await page.locator('[data-vn-voice-mute]').click();
    assert.deepEqual(await page.locator('[data-mascot-audio]').evaluate(a=>[a.volume,a.muted]),[0,true]);
    await page.locator('[data-vn-volume]').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#bg-music').evaluate(a=>a.volume),0);
    const saved=await page.evaluate(()=>localStorage.getItem('ginka.vn.voice.saved.v1'));
    await page.locator('.vn-option-footer [data-vn-option-default]').click();await visible('[data-vn-confirm][open]');await page.locator('[data-vn-confirm-yes]').click();
    await page.waitForFunction(()=>document.querySelector('[data-mascot-audio]').volume===.8&&!document.querySelector('[data-mascot-audio]').muted);
    assert.deepEqual(await page.locator('[data-mascot-audio]').evaluate(a=>[a.volume,a.muted]),[.8,false]);assert.equal(await page.locator('#bg-music').evaluate(a=>a.volume),.88);
    assert.equal(await page.locator('[data-vn-voice-volume]').inputValue(),'80');assert.equal(await page.locator('[data-vn-voice-mute]').getAttribute('aria-pressed'),'false');
    assert.equal(await page.evaluate(()=>localStorage.getItem('ginka.vn.voice.saved.v1')),saved);
    assert.equal(await page.evaluate(()=>window.__dVoice===document.querySelector('[data-mascot-audio]')&&window.__dBgm===document.querySelector('#bg-music')),true);
   });
   await check('SOUND DEFAULT reports external consumer storage denial without lying about persistence',async()=>{
    await page.locator('[data-vn-voice-volume]').focus();await page.keyboard.press('End');await page.locator('[data-vn-voice-mute]').click();
    await page.locator('[data-vn-volume]').focus();await page.keyboard.press('Home');
    await page.evaluate(()=>{const original=Storage.prototype.setItem;window.__dSoundRestore=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(key,value){if(['music_volume','ginka.vn.voice.volume.v1','ginka.vn.voice.mute.v1'].includes(key))throw new DOMException('D external consumer storage fixture','QuotaExceededError');return original.call(this,key,value);};});
    await page.locator('.vn-option-footer [data-vn-option-default]').click();await visible('[data-vn-confirm][open]');await page.locator('[data-vn-confirm-yes]').click();
    await page.waitForFunction(()=>document.querySelector('[data-vn-option-feedback]').textContent.includes('未能全部保存'));
    assert.deepEqual(await page.locator('[data-mascot-audio]').evaluate(a=>[a.volume,a.muted]),[.8,false]);
    assert.equal(await page.evaluate(()=>localStorage.getItem('ginka.vn.voice.volume.v1')),'100');assert.equal(await page.evaluate(()=>localStorage.getItem('ginka.vn.voice.mute.v1')),'1');assert.equal(await page.evaluate(()=>Number(localStorage.getItem('music_volume'))),0);
    await page.evaluate(()=>window.__dSoundRestore());
   });
   await check('saved real recording replays without opening a second player or adding history',async()=>{
    const count=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).entries.length,HISTORY);
    await page.locator('[data-vn-voice-saved]').first().click();await page.waitForFunction(()=>!document.querySelector('[data-mascot-audio]').paused);
    await page.locator('[data-vn-voice-stop]').click();assert.equal(await page.locator('[data-mascot-audio]').evaluate(a=>a.paused),true);
    assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).entries.length,HISTORY),count);assert.equal(await page.locator('[data-mascot-audio]').count(),1);
   });
   await check('PROGRAM verified expression/gesture selectors use the same C preview, not mismatched audio',async()=>{
    await page.locator('[data-vn-option-tab=program]').click();
    const expressions=page.locator('[data-vn-option-panel=program] [data-vn-mascot-expression]');
    await page.waitForFunction(()=>document.querySelector('[data-vn-option-panel=program] [data-vn-mascot-expression]').options.length>1);
    const value=await expressions.locator('option').nth(1).getAttribute('value');await expressions.selectOption(value);
    await page.waitForFunction(()=>document.querySelector('.ginka-mascot-portrait').dataset.mascotRender==='ready');
    assert.equal(await page.locator('[data-mascot-audio]').evaluate(a=>a.paused),true);
    assert.equal(await page.locator('[data-vn-voice-replay]').isDisabled(),true);
    const pose=await page.locator('.ginka-mascot-portrait').getAttribute('data-mascot-pose');
    assert.equal(await page.evaluate(async pose=>(await (await fetch('/__ginka_local_mascot__/manifest.json')).json()).poses[pose].expression,pose),value);
    const gestures=page.locator('[data-vn-option-panel=program] [data-vn-mascot-gesture]');
    const gesture=await gestures.locator('option').nth(1).getAttribute('value');await gestures.selectOption(gesture);
    const selected=await page.locator('.ginka-mascot-portrait').getAttribute('data-mascot-pose');
    assert.equal(await page.evaluate(async pose=>(await (await fetch('/__ginka_local_mascot__/manifest.json')).json()).poses[pose].gesture,selected),gesture);
    const saved=await page.evaluate(()=>localStorage.getItem('ginka.vn.voice.saved.v1'));
    await page.locator('.ginka-mascot-window nav [data-mascot-action=close]').click();await page.locator('[data-mascot-window]').waitFor({state:'hidden'});
    assert.equal(await gestures.evaluate(e=>e===document.activeElement),true,'closing PROGRAM preview must return focus to the selecting control');
    await page.locator('.vn-option-footer [data-vn-option-default]').click();await visible('[data-vn-confirm][open]');await page.locator('[data-vn-confirm-yes]').click();
    await page.waitForFunction(()=>['character','outfit','expression','gesture'].every(key=>document.querySelector('[data-vn-option-panel=program] [data-vn-mascot-'+key+']').value==='all'));
    for(const key of ['character','outfit','expression','gesture'])assert.equal(await page.evaluate(key=>localStorage.getItem('ginka.vn.mascot.'+key+'.v1'),key),'all');
    assert.equal(await page.evaluate(()=>localStorage.getItem('ginka.vn.voice.saved.v1')),saved);
   });
   assert.deepEqual(result.errors,[]);result.ok=true;
  }catch(error){result.failure=error.stack||String(error);result.url=page.url();await page.screenshot({path:path.join(out,width+'-failure.png')}).catch(()=>{});}
  finally{await page.context().close();}
 }
}finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.ok))process.exitCode=1;
