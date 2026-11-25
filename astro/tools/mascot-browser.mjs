// Independent synthetic integration fixture. No original art, recordings or game script.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {deflateSync} from 'node:zlib';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ginka-mascot-browser-'));
const url='http://127.0.0.1:4379';
let server,browser,log='';
function crc32(buffer){
 let crc=0xffffffff;
 for(const b of buffer){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 return (crc^0xffffffff)>>>0;
}
function chunk(name,data){
 const n=Buffer.alloc(4),c=Buffer.alloc(4),body=Buffer.concat([Buffer.from(name),data]);
 n.writeUInt32BE(data.length);c.writeUInt32BE(crc32(body));return Buffer.concat([n,body,c]);
}
function png(name,w,h,rgba){
 const ih=Buffer.alloc(13);ih.writeUInt32BE(w);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;
 const row=Buffer.concat([Buffer.from([0]),Buffer.from(Array.from({length:w},()=>rgba).flat())]);
 fs.writeFileSync(path.join(dir,name),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',deflateSync(Buffer.concat(Array.from({length:h},()=>row)))),chunk('IEND',Buffer.alloc(0))]));
}
function tone(){
 const rate=8000,count=rate*3,h=Buffer.alloc(44),pcm=Buffer.alloc(count*2);
 h.write('RIFF');h.writeUInt32LE(36+pcm.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(rate,24);h.writeUInt32LE(rate*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);
 for(let i=0;i<count;i++)pcm.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*440/rate)*8000),i*2);
 fs.writeFileSync(path.join(dir,'tone.wav'),Buffer.concat([h,pcm]));
}
try{
 png('base.png',4,4,[255,0,0,255]);png('eye.png',1,1,[0,255,0,255]);png('blink.png',1,1,[0,0,255,255]);png('mouth.png',1,1,[255,255,0,255]);png('open.png',1,1,[255,0,255,255]);tone();
 const part=(image,x,y)=>({image,x,y,blend:'over',source:'synthetic integration fixture'});
 const pose={verified:true,phaseSource:'fixture',source:'fixture',character:'child',phase:'main',outfit:'fixture',expression:'neutral',gesture:'idle',base:'base.png',canvas:{width:6,height:6},baseRect:{x:1,y:1,width:4,height:4},layers:[{slot:'eye',...part('eye.png',1,1),alternate:part('blink.png',1,1)},{slot:'mouth',...part('mouth.png',2,1),alternate:part('open.png',2,1)}]};
 const line=(id,text,voice,p='main',poseId='a')=>({id,text,voice,phase:p,pose:poseId,speaker:'Synthetic fixture',source:'fixture',phaseSource:'fixture',voiceSource:voice?'generated test tone':null,verified:true});
 const file=path.join(dir,'manifest.json');
 fs.writeFileSync(file,JSON.stringify({version:2,defaultPose:'a',poses:{a:pose,b:{...pose,character:'adult',phase:'afterstory',outfit:'locked'}},lines:[line('silent','Silent fixture',null),line('tone','Tone fixture','tone.wav'),line('locked','Locked fixture',null,'afterstory','b')]}));
 server=spawn(process.execPath,['node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','4379'],{env:{...process.env,GINKA_MASCOT_MANIFEST:file},stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])stream.on('data',c=>{log=(log+c).slice(-12000);});
 for(let i=0;i<90;i++){if(server.exitCode!==null)throw Error('Fixture dev server exited');try{if((await fetch(url+'/__ginka_local_mascot__/manifest.json')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 const response=await fetch(url+'/__ginka_local_mascot__/manifest.json');assert.equal(response.status,200);assert.equal((await response.json()).version,2);
 browser=await chromium.launch();
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===url?route.continue():route.abort());
  await page.addInitScript(()=>localStorage.setItem('ginka.vn.mode.v1','reader'));
  await page.goto(url+'/',{waitUntil:'domcontentloaded'});
  const launcher=page.locator('[data-mascot-action=open]');
  await launcher.waitFor({state:'visible'});
  await launcher.click();
  const canvas=page.locator('[data-mascot-canvas]'),next=page.locator('[data-mascot-window] [data-mascot-action=next]');
  await canvas.waitFor({state:'visible'});
  assert.deepEqual(await canvas.evaluate(c=>Array.from(c.getContext('2d').getImageData(1,1,2,1).data)),[0,255,0,255,255,255,0,255]);
  assert.deepEqual(await canvas.evaluate(c=>[c.width,c.height,...c.getContext('2d').getImageData(0,0,1,1).data,...c.getContext('2d').getImageData(3,3,1,1).data]),[6,6,0,0,0,0,255,0,0,255]);
  assert.equal(await page.locator('[data-mascot-text]').textContent(),'Silent fixture');
  assert.equal(await page.locator('[data-mascot-action=replay]').isDisabled(),true);
  assert.equal(await page.locator('[data-mascot-action=save]').isDisabled(),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('ginka.vn.voice.history.v1')),null);
  await next.click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ginka.vn.voice.history.v1')||'null')?.entries?.some(e=>e.id==='tone'));
  assert.equal(await page.locator('[data-mascot-text]').textContent(),'Tone fixture');
  await page.locator('[data-mascot-action=save]').click();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ginka.vn.voice.saved.v1'))),['tone']);
  await next.click();assert.equal(await page.locator('[data-mascot-text]').textContent(),'Silent fixture');
  await page.locator('[data-mascot-character] [data-mascot-action=close]').click();assert.equal(await launcher.getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('[data-mascot-character]').isVisible(),false);
  assert.equal(await page.locator('[data-mascot-audio]').evaluate(a=>a.paused),true);
  assert.equal(await page.evaluate(()=>document.activeElement?.matches('[data-mascot-action=open]')),true);
  await page.evaluate(()=>{localStorage.setItem('ginka.vn.progress.v1',JSON.stringify({version:1,completed:[],mainCleared:true}));window.dispatchEvent(new StorageEvent('storage'));});
  await launcher.click();await next.click();await next.click();assert.equal(await page.locator('[data-mascot-text]').textContent(),'Locked fixture');
  await page.evaluate(()=>{localStorage.removeItem('ginka.vn.progress.v1');document.dispatchEvent(new Event('vn:progress-reset'));});
  assert.equal(await page.locator('[data-mascot-character]').isVisible(),false);
  await page.goto(url+'/settings/#sound',{waitUntil:'domcontentloaded'});
  await page.locator('[data-vn-voice-saved] [data-vn-voice-saved]').waitFor({state:'visible'});
  await page.locator('button[data-vn-voice-saved="tone"]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-mascot-audio]').paused);
  assert.equal(await page.locator('[data-mascot-character]').isVisible(),false,'Saved voice playback must not open the portrait');
  await page.locator('[data-vn-voice-stop]').click();
  assert.equal(await page.locator('[data-mascot-audio]').evaluate(a=>a.paused),true);
  await page.locator('[data-vn-voice-remove="tone"]').click();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ginka.vn.voice.saved.v1'))),[]);
  await page.locator('[data-vn-option-tab="program"]').click();
  const preview=page.locator('[data-mascot-action=preview]');await preview.click();await canvas.waitFor({state:'visible'});
  await page.keyboard.press('Escape');assert.equal(await page.locator('[data-mascot-character]').isVisible(),false);
  assert.deepEqual(errors,[]);
  await page.close();console.log('PASS synthetic layered mascot browser at '+width+'px');
 }
} catch(error){console.error(log);throw error;}
finally{await browser?.close();if(server){server.kill();if(server.exitCode===null)await new Promise(resolve=>{server.once('exit',resolve);setTimeout(resolve,2000).unref();});}fs.rmSync(dir,{recursive:true,force:true});}
