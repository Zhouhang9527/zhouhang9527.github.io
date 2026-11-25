// Local-only acceptance for the real verified pack. Never upload its screenshots or recordings to CI.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=new URL(process.env.GINKA_TEST_BASE_URL||'http://127.0.0.1:4321');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(origin.hostname),'Use a private loopback preview only');
const endpoint=new URL('/__ginka_local_mascot__/manifest.json',origin);
const response=await fetch(endpoint);assert.equal(response.status,200);const pack=await response.json();
assert.equal(pack.available,true,'No verified original pack');assert.equal(pack.version,2);
const lines=pack.lines,poses=pack.poses;
assert.ok(lines.some(l=>l.phase==='main'&&poses[l.pose].character==='child'&&l.voice),'Missing voiced child');
assert.ok(lines.some(l=>l.phase==='afterstory'&&poses[l.pose].character==='adult'&&l.voice),'Missing voiced adult');
const browser=await chromium.launch();const results=[];
try{
 for(const width of [390,1440]){
  for(const unlocked of [false,true]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   const errors=[],failures=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(origin.origin+'/__ginka_local_mascot__/')&&r.status()>=400)failures.push(r.status());});
   await page.route('**/*',r=>new URL(r.request().url()).origin===origin.origin?r.continue():r.abort());
   await page.addInitScript(unlocked=>{localStorage.setItem('ginka.vn.mode.v1','reader');if(unlocked)localStorage.setItem('ginka.vn.progress.v1',JSON.stringify({version:1,completed:[],mainCleared:true}));},unlocked);
   await page.goto(new URL('/',origin).href,{waitUntil:'domcontentloaded'});
   const launcher=page.locator('[data-mascot-action=open]'),canvas=page.locator('[data-mascot-canvas]'),audio=page.locator('[data-mascot-audio]'),next=page.locator('[data-mascot-window] [data-mascot-action=next]');
   const allowed=lines.filter(l=>unlocked||l.phase==='main'&&poses[l.pose].phase==='main');
   await launcher.click();
   for(const [i,line] of allowed.entries()){
    if(i)await next.click();
    await page.waitForFunction(text=>document.querySelector('[data-mascot-text]')?.textContent===text,line.text);
    await page.waitForFunction(()=>document.querySelector('.ginka-mascot-portrait')?.dataset.mascotRender==='ready');
    const pose=poses[line.pose];assert.deepEqual(await canvas.evaluate(c=>[c.width,c.height]),[pose.canvas.width,pose.canvas.height]);
    assert.ok(await canvas.evaluate(c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<p.length;i+=4)if(p[i])return true;return false;}),'Blank original portrait');
    if(line.voice){
     await page.waitForFunction(({id,voice})=>{const a=document.querySelector('[data-mascot-audio]');return a?.currentSrc.endsWith(voice)&&Number.isFinite(a.duration)&&a.duration>0&&JSON.parse(localStorage.getItem('ginka.vn.voice.history.v1')||'null')?.entries?.some(e=>e.id===id);},{id:line.id,voice:line.voice});
     assert.ok(await audio.evaluate(a=>!a.error),'Original voice decode error');
    }
   }
   await next.click();assert.equal(await page.locator('[data-mascot-text]').textContent(),allowed[0].text);
   assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
   await page.locator('[data-mascot-character] [data-mascot-action=close]').click();assert.equal(await audio.evaluate(a=>a.paused),true);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   results.push({width,unlocked,lines:allowed.length,poses:new Set(allowed.map(l=>l.pose)).size});
   await page.close();
  }
 }
}finally{await browser.close();}
console.log(JSON.stringify({mode:'real-private-pack',results},null,2));
