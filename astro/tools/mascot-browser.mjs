// Independent synthetic integration fixture. No original art, recordings or game script.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),astroPackage=require.resolve('astro/package.json');
const astroCli=path.resolve(path.dirname(astroPackage),require(astroPackage).bin.astro);
import {spawn} from 'node:child_process';
import {deflateSync} from 'node:zlib';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ginka-mascot-browser-'));
const port=process.env.GINKA_TEST_PORT||'4379';
const url='http://127.0.0.1:'+port;
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
 png('base.png',4,4,[255,0,0,255]);png('base100.png',4,4,[255,0,0,255]);png('base200.png',4,4,[255,0,0,255]);png('eye.png',1,1,[0,255,0,255]);png('blink.png',1,1,[0,0,255,255]);png('mouth.png',1,1,[255,255,0,255]);png('open.png',1,1,[255,0,255,255]);tone();
 const part=(image,x,y)=>({image,x,y,blend:'over',source:'synthetic integration fixture'});
 const pose={verified:true,phaseSource:'fixture',source:'fixture',character:'child',phase:'main',outfit:'fixture',expression:'neutral',gesture:'idle',base:'base.png',canvas:{width:6,height:6},baseRect:{x:1,y:1,width:4,height:4},layers:[{slot:'eye',...part('eye.png',1,1),alternate:part('blink.png',1,1)},{slot:'mouth',...part('mouth.png',2,1),alternate:part('open.png',2,1)}]};
 pose.tiers=[{...pose,resolution:50},{...pose,resolution:100,base:'base100.png',canvas:{width:7,height:7}},{...pose,resolution:200,base:'base200.png',canvas:{width:9,height:9}}];
 const line=(id,text,voice,p='main',poseId='a')=>({id,text,voice,phase:p,pose:poseId,speaker:'Synthetic fixture',source:'fixture',phaseSource:'fixture',voiceSource:voice?'generated test tone':null,verified:true});
 const sceneAction={verified:true,source:'fixture',initial:{objects:{actor:{properties:{xpos:0,zoomx:100,zoomy:100}}},camera:{properties:{}}},actions:[['envupdate','update',[{name:'actor',action:[['xpos',[{handler:'MoveAction',value:2,time:800}]],['zoomx',[{handler:'MoveAction',value:200,time:800}]],['zoomy',[{handler:'MoveAction',value:200,time:800}]]]}]]],projection:{verified:true,source:'synthetic calibration only',stage:{width:12,height:12},resolution:100,rightHanded:false,camera:{cameraoffsetz:-100,cameraoffsetzmax:100,camerarh:0},properties:{xpos:0}}};
 const spoken={...line('tone','Tone fixture','tone.wav'),sceneAction,translations:{'zh-CN':{speaker:'Synthetic fixture',text:'Tone fixture'},ja:{speaker:'検証',text:'日本語 fixture 字幕'},en:{speaker:null,text:'English fixture subtitles'}}};
 const locked={...line('locked','Locked fixture',null,'afterstory','b'),sceneAction:{...sceneAction,actions:[],overlays:[{verified:true,source:'synthetic static overlay only',image:'blink.png',canvas:{width:1,height:1},origin:{x:0,y:0},resolution:100,properties:{xpos:-3,ypos:3,order:3},linkmode:0,linkmask:0,rightHanded:true}]}};
 const file=path.join(dir,'manifest.json');
 fs.writeFileSync(file,JSON.stringify({version:2,defaultPose:'a',poses:{a:pose,b:{...pose,character:'adult',phase:'afterstory',outfit:'locked'},c:{...pose,expression:'smile',gesture:'wave'}},lines:[line('silent','Silent fixture',null),spoken,locked]}));
 server=spawn(process.execPath,[astroCli,'dev','--host','127.0.0.1','--port',port],{env:{...process.env,GINKA_MASCOT_MANIFEST:file},stdio:['ignore','pipe','pipe']});
 for(const stream of [server.stdout,server.stderr])stream.on('data',c=>{log=(log+c).slice(-12000);});
 for(let i=0;i<90;i++){if(server.exitCode!==null)throw Error('Fixture dev server exited');try{if((await fetch(url+'/__ginka_local_mascot__/manifest.json')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 const response=await fetch(url+'/__ginka_local_mascot__/manifest.json');assert.equal(response.status,200);assert.equal((await response.json()).version,2);
 browser=await chromium.launch();
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===url?route.continue():route.abort());
  await page.addInitScript(()=>{localStorage.setItem('ginka.vn.mode.v1','reader');window.__mascotLifecycle=[];for(const type of ['astro:before-preparation','astro:before-swap','astro:after-swap','astro:page-load'])document.addEventListener(type,()=>{window.__mascotLifecycle.push({type,path:location.pathname,at:performance.now()});if(type==='astro:page-load')window.__mascotPageLoad=location.pathname;});});
  await page.goto(url+'/',{waitUntil:'domcontentloaded'});
  const launcher=page.locator('[data-mascot-action=open]');
  await launcher.waitFor({state:'visible'});
  await launcher.click();
  const canvas=page.locator('[data-mascot-canvas]'),next=page.locator('[data-mascot-window] [data-mascot-action=next]');
  await canvas.waitFor({state:'visible'});
  assert.deepEqual(await canvas.evaluate(c=>Array.from(c.getContext('2d').getImageData(1,1,2,1).data)),[0,255,0,255,255,255,0,255]);
  assert.deepEqual(await canvas.evaluate(c=>[c.width,c.height,...c.getContext('2d').getImageData(0,0,1,1).data,...c.getContext('2d').getImageData(3,3,1,1).data]),[6,6,0,0,0,0,255,0,0,255]);
  assert.equal(await page.locator('[data-mascot-text]').textContent(),'Silent fixture');
  assert.equal(await page.locator('[data-ginka-mascot]').getAttribute('data-mascot-scene'),'unavailable');
  assert.ok(await canvas.evaluate(c=>{const p=c.closest('.ginka-mascot-portrait'),r=c.getBoundingClientRect(),b=p.getBoundingClientRect(),scale=Math.min(p.clientWidth/c.width,p.clientHeight/c.height);return Math.abs(r.width-c.width*scale)<.1&&Math.abs(r.bottom-b.bottom)<.1;}),'shared geometry preserves contain/bottom anchor');
  assert.ok(!(await page.locator('.ginka-mascot-selection [data-vn-mascot-character]').innerHTML()).includes('adult'),'locked adult metadata must not appear');
  assert.equal(await page.locator('[data-mascot-action=replay]').isDisabled(),true);
  assert.equal(await page.locator('[data-mascot-action=save]').isDisabled(),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('ginka.vn.voice.history.v1')),null);
  await next.click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('ginka.vn.voice.history.v1')||'null')?.entries?.some(e=>e.id==='tone'));
  assert.equal(await page.locator('[data-mascot-text]').textContent(),'Tone fixture');
  assert.equal(await page.locator('[data-ginka-mascot]').getAttribute('data-mascot-scene'),'complete','reduced motion samples the supported numeric endpoint');
  await page.waitForFunction(()=>document.querySelector('.ginka-mascot-portrait').dataset.mascotResolution==='200');assert.deepEqual(await canvas.evaluate(c=>[c.width,c.height]),[9,9],'source zoom selects the decoded explicit original tier, not canvas*DPR');
  const historyBeforeReplay=await page.evaluate(()=>localStorage.getItem('ginka.vn.voice.history.v1'));
  await page.locator('[data-mascot-action=replay]').click();await page.waitForFunction(()=>!document.querySelector('[data-mascot-audio]').paused);
  assert.equal(await page.evaluate(()=>localStorage.getItem('ginka.vn.voice.history.v1')),historyBeforeReplay,'VOICE replay must not recursively append history');
  await page.locator('[data-mascot-action=save]').click();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ginka.vn.voice.saved.v1'))),['tone']);
  await next.click();assert.equal(await page.locator('[data-mascot-text]').textContent(),'Silent fixture');
  await page.locator('[data-mascot-character] [data-mascot-action=close]').click();assert.equal(await launcher.getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('[data-mascot-character]').isVisible(),false);
  assert.equal(await page.locator('[data-mascot-audio]').evaluate(a=>a.paused),true);
  assert.equal(await page.evaluate(()=>document.activeElement?.matches('[data-mascot-action=open]')),true);
  await page.evaluate(()=>{localStorage.setItem('ginka.vn.progress.v1',JSON.stringify({version:1,completed:[],mainCleared:true}));window.dispatchEvent(new StorageEvent('storage'));});
  await launcher.click();await next.click();await next.click();assert.equal(await page.locator('[data-mascot-text]').textContent(),'Locked fixture');
  await page.waitForFunction(()=>document.querySelector('[data-mascot-canvas]').dataset.mascotComposition==='stage');
  assert.deepEqual(await canvas.evaluate(c=>[c.width,c.height,...c.getContext('2d').getImageData(3,3,1,1).data]),[12,12,0,0,255,255],'static linked bitmap uses the same stage canvas with independent source matrix');
  assert.equal(await page.locator('[data-mascot-canvas]').count(),1,'overlay must not create a second renderer');
  await page.evaluate(()=>{localStorage.removeItem('ginka.vn.progress.v1');document.dispatchEvent(new Event('vn:progress-reset'));});
  assert.equal(await page.locator('[data-mascot-character]').isVisible(),false);
  await page.goto(url+'/settings/#sound',{waitUntil:'domcontentloaded'});
  await page.locator('[data-vn-voice-saved] [data-vn-voice-saved]').waitFor({state:'visible'});
  await page.locator('button[data-vn-voice-saved="tone"]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-mascot-audio]').paused);
  assert.equal(await page.locator('[data-mascot-character]').isVisible(),false,'Saved voice playback must not open the portrait');
  const historyBeforeSaved=await page.evaluate(()=>localStorage.getItem('ginka.vn.voice.history.v1'));
  assert.equal(historyBeforeSaved,null,'saved playback after a history reset is not new history');
  await page.locator('[data-vn-voice-volume]').fill('12');await page.locator('[data-vn-voice-mute]').click();
  await page.evaluate(()=>document.dispatchEvent(new Event('vn:voice-defaults')));
  assert.deepEqual(await page.locator('[data-mascot-audio]').evaluate(a=>[a.volume,a.muted]),[.8,false]);
  await page.locator('[data-vn-voice-stop]').click();
  assert.equal(await page.locator('[data-mascot-audio]').evaluate(a=>a.paused),true);
  await page.locator('[data-vn-voice-remove="tone"]').click();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ginka.vn.voice.saved.v1'))),[]);
  await page.locator('[data-vn-option-tab="program"]').click();
  const preview=page.locator('[data-mascot-action=preview]');await preview.click();await canvas.waitFor({state:'visible'});
  if(await page.locator('[data-mascot-text]').textContent()==='Tone fixture')await next.click();
  assert.equal(await page.locator('[data-mascot-text]').textContent(),'Silent fixture');
  const auto=page.locator('[data-mascot-action=auto]');
  await auto.click();assert.equal(await auto.getAttribute('aria-pressed'),'true');
  await page.waitForFunction(()=>document.querySelector('[data-mascot-text]')?.textContent==='Tone fixture');
  await page.keyboard.press('Escape');assert.equal(await page.locator('[data-mascot-character]').isVisible(),false);
  assert.equal(await auto.getAttribute('aria-pressed'),'false');
  assert.equal(await preview.evaluate(el=>document.activeElement===el),true);
  const settingsOutfit=page.locator('[data-vn-option-panel=program] [data-vn-mascot-outfit]');await settingsOutfit.focus();await settingsOutfit.selectOption('fixture');await canvas.waitFor({state:'visible'});
  await page.locator('[data-mascot-window] [data-mascot-action=close]').click();assert.equal(await settingsOutfit.evaluate(el=>document.activeElement===el),true,'HIDE must restore the actual external select, not an invisible launcher');
  await settingsOutfit.selectOption('all');await page.keyboard.press('Escape');assert.equal(await settingsOutfit.evaluate(el=>document.activeElement===el),true);
  await page.locator('[data-vn-option-panel=program] a[data-vn-mode-set=game]').click();
  await page.locator('[data-vn-start]').click();if(await page.locator('[data-vn-confirm][open]').count())await page.locator('[data-vn-confirm-yes]').click();await page.locator('[data-vn-post]').first().click();
  // DOM swap and URL commit precede Astro's current-route initialization.
  await page.waitForFunction(()=>window.__mascotPageLoad===location.pathname&&!!document.querySelector('[data-vn-game-reader]')&&!document.querySelector('[data-vn-game-reader]').hidden&&!document.querySelector('[data-vn-game-window]')?.hidden);
  const dock=page.locator('.vn-game-buttons');
  await launcher.click();
  const navigationState=()=>page.evaluate(()=>({path:location.pathname,pageLoadPath:window.__mascotPageLoad,mode:document.documentElement.dataset.vnMode,hidden:document.hidden,open:document.querySelector('[data-mascot-action=open]')?.getAttribute('aria-expanded'),characterHidden:document.querySelector('[data-mascot-character]')?.hidden,rootConnected:document.querySelector('[data-ginka-mascot]')?.isConnected,rootHidden:document.querySelector('[data-ginka-mascot]')?.hidden,pose:document.querySelector('.ginka-mascot-portrait')?.dataset.mascotPose,render:document.querySelector('.ginka-mascot-portrait')?.dataset.mascotRender,scene:document.querySelector('[data-ginka-mascot]')?.dataset.mascotScene,gameWindowHidden:document.querySelector('[data-vn-game-window]')?.hidden,readerHidden:document.querySelector('[data-vn-game-reader]')?.hidden,gameText:document.querySelector('[data-vn-dialogue-text]')?.textContent,mascotText:document.querySelector('[data-mascot-text]')?.textContent,audio:{paused:document.querySelector('[data-mascot-audio]')?.paused,src:document.querySelector('[data-mascot-audio]')?.getAttribute('src')},events:window.__mascotLifecycle}));
  try{await page.waitForFunction(()=>['Silent fixture','Tone fixture'].includes(document.querySelector('[data-vn-dialogue-text]')?.textContent));}catch(error){console.error('Synthetic navigation failure',JSON.stringify(await navigationState()),errors);throw error;}
  if(await page.locator('[data-vn-dialogue-text]').textContent()==='Tone fixture')await dock.locator('[data-vn-game-action=xprev]').click();
  await page.waitForFunction(()=>document.querySelector('[data-vn-dialogue-text]')?.textContent==='Silent fixture');
  await dock.locator('[data-vn-game-action=next]').click();
  await page.waitForFunction(()=>document.querySelector('[data-vn-dialogue-text]')?.textContent==='Tone fixture');
  await dock.locator('[data-vn-game-action=hide]').click();
  assert.equal(await page.locator('[data-mascot-character]').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute('data-vn-mascot-dialogue')),false);
  assert.deepEqual(errors,[]);
  await page.close();console.log('PASS synthetic layered mascot browser at '+width+'px');
 }
 // Alternatives are real fixture pixels, not verified animation timing: never auto-enable them.
 const animated=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'}),animationErrors=[];
 animated.on('pageerror',error=>animationErrors.push(error.message));
 await animated.route('**/*',route=>new URL(route.request().url()).origin===url?route.continue():route.abort());
 await animated.addInitScript(()=>localStorage.setItem('ginka.vn.mode.v1','reader'));
 await animated.goto(url+'/',{waitUntil:'domcontentloaded'});
 await animated.locator('[data-mascot-action=open]').click();
 await animated.waitForFunction(()=>document.querySelector('[data-mascot-text]')?.textContent==='Silent fixture');
 await animated.locator('[data-mascot-window] [data-mascot-action=next]').click();
 await animated.waitForFunction(()=>!document.querySelector('[data-mascot-audio]').paused);
 await animated.waitForFunction(()=>document.querySelector('[data-ginka-mascot]').dataset.mascotScene==='playing');
 const before=await animated.locator('[data-mascot-canvas]').evaluate(c=>c.style.transform);
 await animated.waitForFunction(value=>document.querySelector('[data-mascot-canvas]').style.transform!==value,before);
 await animated.waitForFunction(()=>document.querySelector('[data-ginka-mascot]').dataset.mascotScene==='complete');
 const historyBeforeDynamicReplay=await animated.evaluate(()=>localStorage.getItem('ginka.vn.voice.history.v1'));
 await animated.evaluate(()=>{window.__playbackGet=Storage.prototype.getItem;Storage.prototype.getItem=function(key){if(key==='ginka.vn.playback.v1')throw new DOMException('Storage denied','SecurityError');return window.__playbackGet.call(this,key);};document.dispatchEvent(new CustomEvent('vn:playback-change',{detail:{textRevealMs:0,autoGapMs:700,autoScrollSpeed:45,skipSeenOnly:true,effectSpeed:1}}));});
 await animated.locator('[data-mascot-action=replay]').click();
 await animated.waitForFunction(()=>document.querySelector('[data-ginka-mascot]').dataset.mascotScene==='playing');
 const replayStart=await animated.locator('[data-mascot-canvas]').evaluate(c=>c.style.transform);
 await animated.waitForFunction(value=>document.querySelector('[data-mascot-canvas]').style.transform!==value,replayStart);
 await animated.waitForFunction(()=>document.querySelector('[data-ginka-mascot]').dataset.mascotScene==='complete');
 assert.equal(await animated.locator('[data-mascot-text]').textContent(),'Tone fixture');
 await animated.evaluate(()=>{Storage.prototype.getItem=window.__playbackGet;delete window.__playbackGet;});
 assert.equal(await animated.evaluate(()=>localStorage.getItem('ginka.vn.voice.history.v1')),historyBeforeDynamicReplay,'Replayed numeric fragment must restart but never append voice history');
 const subtitleAudio=await animated.locator('[data-mascot-audio]').evaluate(a=>{window.__subtitleAudio=a;return {src:a.currentSrc,time:a.currentTime};}),subtitleMatrix=await animated.locator('[data-mascot-canvas]').evaluate(c=>c.style.transform);
 await animated.locator('.ginka-mascot-selection summary').click();
 const language=animated.locator('.ginka-mascot-selection [data-vn-mascot-language]');
 await language.selectOption('ja');assert.equal(await animated.locator('[data-mascot-text]').textContent(),'日本語 fixture 字幕');assert.equal(await animated.locator('[data-mascot-speaker]').textContent(),'検証');
 await language.selectOption('en');assert.equal(await animated.locator('[data-mascot-text]').textContent(),'English fixture subtitles');assert.equal(await animated.locator('[data-mascot-speaker]').isVisible(),false,'null source speaker must not borrow another language name');
 assert.ok(await animated.locator('[data-mascot-audio]').evaluate((a,state)=>a===window.__subtitleAudio&&a.currentSrc===state.src&&a.currentTime>=state.time-.01,subtitleAudio),'subtitle changes must preserve native audio identity/source/time');
 assert.equal(await animated.evaluate(()=>localStorage.getItem('ginka.vn.voice.history.v1')),historyBeforeDynamicReplay);assert.equal(await animated.locator('[data-mascot-canvas]').evaluate(c=>c.style.transform),subtitleMatrix,'subtitle change does not restart the numeric scene');
 await animated.locator('.ginka-mascot-selection summary').click();
 await animated.locator('[data-mascot-window] [data-mascot-action=next]').click();
 assert.match(await animated.locator('[data-mascot-text]').textContent(),/尚无已核验的English字幕/,'missing per-line caption is explicit, never another-language fallback');
 await animated.locator('.ginka-mascot-selection summary').click();await language.selectOption('zh-CN');assert.equal(await animated.locator('[data-mascot-text]').textContent(),'Silent fixture');await animated.locator('.ginka-mascot-selection summary').click();
 await animated.waitForTimeout(3500);
 assert.deepEqual(await animated.locator('[data-mascot-canvas]').evaluate(c=>[c.dataset.mascotEye,c.dataset.mascotMouth,...c.getContext('2d').getImageData(1,1,2,1).data]),['false','false',0,255,0,255,255,255,0,255]);
 await animated.locator('.ginka-mascot-selection summary').click();
 await animated.locator('.ginka-mascot-selection [data-vn-mascot-expression]').selectOption('smile');
 await animated.waitForFunction(()=>document.querySelector('[data-mascot-speaker]').textContent==='已验证差分预览');
 assert.equal(await animated.locator('.ginka-mascot-portrait').getAttribute('data-mascot-pose'),'c');
 assert.equal(await animated.locator('[data-mascot-action=replay]').isDisabled(),true,'pose-only selection must never borrow unrelated speech');
 assert.equal(await animated.evaluate(()=>localStorage.getItem('ginka.vn.mascot.expression.v1')),'smile');
 assert.equal(await animated.locator('[data-ginka-mascot]').getAttribute('data-mascot-scene'),'unavailable');
 await animated.locator('[data-mascot-character] [data-mascot-action=close]').click();
 assert.deepEqual(animationErrors,[]);
 await animated.close();console.log('PASS synthetic numeric replay, source subtitles, storage-denied preferences and disabled unverified alternatives');
 // Delayed source-tier decode may never overwrite a newer line or resurrect a closed host.
 const safePack=await (await fetch(url+'/__ginka_local_mascot__/manifest.json')).json(),tierUrl=safePack.poses.a.tiers.find(tier=>tier.resolution===200).base;
 const race=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});let releaseTier,requestedTier;
 const tierGate=new Promise(resolve=>releaseTier=resolve),tierRequested=new Promise(resolve=>requestedTier=resolve);
 await race.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==url)return route.abort();if(u.pathname===tierUrl){requestedTier();await tierGate;}return route.continue();});
 await race.addInitScript(()=>localStorage.setItem('ginka.vn.mode.v1','reader'));await race.goto(url+'/',{waitUntil:'domcontentloaded'});await race.locator('[data-mascot-action=open]').click();
 await race.locator('[data-mascot-window] [data-mascot-action=next]').click();await tierRequested;
 assert.deepEqual(await race.locator('[data-mascot-canvas]').evaluate(c=>[c.width,c.height]),[6,6],'keep the decoded tier and its own geometry while replacement is pending');
 await race.locator('[data-mascot-window] [data-mascot-action=next]').click();const finished=race.waitForResponse(response=>new URL(response.url()).pathname===tierUrl);releaseTier();await (await finished).finished();
 await race.evaluate(async url=>{const img=new Image();img.src=url;await img.decode();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);},tierUrl);
 assert.equal(await race.locator('[data-mascot-text]').textContent(),'Silent fixture');assert.deepEqual(await race.locator('[data-mascot-canvas]').evaluate(c=>[c.width,c.height]),[6,6],'late decode is generation-scoped and cannot replace the new line');
 await race.locator('[data-mascot-character] [data-mascot-action=close]').click();await race.close();console.log('PASS source-tier selection, pending-decode retention and stale-tier cancellation');
} catch(error){console.error(log);throw error;}
finally{await browser?.close();if(server){server.kill();if(server.exitCode===null)await new Promise(resolve=>{server.once('exit',resolve);setTimeout(resolve,2000).unref();});}fs.rmSync(dir,{recursive:true,force:true});}
