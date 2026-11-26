// Explicit network/audio failures: exercises the real persistent player and
// SOUND view, not the live music provider or audible playback quality.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const base=process.env.GINKA_TEST_BASE_URL||'http://127.0.0.1:4354';
const out=process.env.GINKA_TEST_OUTPUT||'artifacts/vn/d-sound';fs.mkdirSync(out,{recursive:true});
const wav=Buffer.alloc(44+8000*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
const browser=await chromium.launch(),results=[];
try{
 for(const mode of ['blocked','media-error','playlist-error']){
  const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'}),result={mode,fixture:true,ok:false,errors:[]};results.push(result);page.on('pageerror',e=>result.errors.push(e.message));
  await page.addInitScript(({mode})=>{const original=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(this.id==='bg-music')return Promise.reject(new DOMException('D explicit failure fixture',mode==='blocked'?'NotAllowedError':'NotSupportedError'));return original.call(this);};},{mode});
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());if(url.origin===base)return route.continue();
   const headers={'access-control-allow-origin':'*','cache-control':'no-store'};
   if(url.searchParams.get('type')==='playlist')return route.fulfill({status:mode==='playlist-error'?503:200,contentType:'application/json',headers,body:JSON.stringify([{id:'d-sound-fixture',title:'D fixture song',author:'D fixture',url:'https://fixture.invalid/audio?type=url&id=d-sound-fixture'}])});
   if(url.hostname==='fixture.invalid')return route.fulfill({status:200,contentType:'audio/wav',headers,body:wav});
   return route.abort();
  });
  try{
   await page.goto(base+'/settings/#sound');await page.locator('[data-vn-music]').waitFor({state:'visible'});
   if(mode==='playlist-error'){
    await page.waitForFunction(()=>document.querySelector('#music-player').dataset.ginkaMusicState==='error');
    assert.equal(await page.locator('[data-vn-track-status]').isVisible(),true);assert.match(await page.locator('[data-vn-track-status]').textContent(),/歌单.*无法/);
   }else{
    await page.waitForFunction(()=>document.querySelector('#music-player').dataset.ginkaMusicState==='ready'&&document.querySelectorAll('[data-vn-track]').length>0);
    await page.locator('[data-vn-music-action=music-toggle]').click();
    const state=mode==='blocked'?'blocked':'error';
    await page.waitForFunction(state=>document.querySelector('#music-player').dataset.ginkaPlaybackState===state,state);
    await page.locator('[data-vn-music-feedback]').waitFor({state:'visible'});
    assert.equal(await page.locator('[data-vn-music-feedback]').textContent(),await page.locator('#music-player').getAttribute('data-ginka-playback-message'));
    assert.equal(await page.locator('#music-player').getAttribute('data-ginka-music-state'),'ready');
    assert.equal(await page.locator('[data-vn-track-status]').isVisible(),false);
    assert.equal(await page.locator('[data-vn-track]').count(),1);assert.match(await page.locator('[data-vn-music-title]').textContent(),/D fixture song/);
   }
   assert.equal(await page.locator('#bg-music').count(),1);assert.deepEqual(result.errors,[]);result.ok=true;
  }catch(error){result.failure=error.stack||String(error);await page.screenshot({path:path.join(out,mode+'-failure.png')}).catch(()=>{});}
  finally{await page.context().close();}
 }
}finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.ok))process.exitCode=1;
