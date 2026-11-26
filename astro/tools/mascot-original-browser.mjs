// Local-only acceptance for the real verified pack. Never upload its screenshots or recordings to CI.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {projectMascotCamera,computeMascotGeometry,projectLinkedMascotOverlay} from '../src/lib/mascot-geometry.ts';
import {SceneActionScheduler} from '../src/domain/vn-actions.ts';
const origin=new URL(process.env.GINKA_TEST_BASE_URL||'http://127.0.0.1:4321');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(origin.hostname),'Use a private loopback preview only');
const endpoint=new URL('/__ginka_local_mascot__/manifest.json',origin);
const response=await fetch(endpoint);assert.equal(response.status,200);const pack=await response.json();
assert.equal(pack.available,true,'No verified original pack');assert.equal(pack.version,2);
assert.doesNotMatch(JSON.stringify(pack),/"(?:source|voiceSource|phaseSource|sourceBlob|nativeStorage|nameHash)"|_hxv4_hash\//,'HTTP projection must not expose private provenance');
const lines=pack.lines,poses=pack.poses;
assert.ok(lines.some(l=>l.phase==='main'&&poses[l.pose].character==='child'&&l.voice),'Missing voiced child');
assert.ok(lines.some(l=>l.phase==='afterstory'&&poses[l.pose].character==='adult'&&l.voice),'Missing voiced adult');
async function assertOverlayPixels(page,line,pose){
 const binding=line.sceneAction,p0=binding.projection,frame=binding.initial,properties={...p0.properties,...frame.objects.actor.properties},camera={...p0.camera,...frame.camera.properties};
 assert.equal(binding.actions.length,0,'Static emotion acceptance must not imply show/hide timeline support');
 const actor=projectMascotCamera({...p0,canvas:pose.canvas,properties,camera});
 const overlays=binding.overlays.map(overlay=>{const {image,...input}=overlay;return {image,order:overlay.properties.order??0,...projectLinkedMascotOverlay({...input,stage:p0.stage,camera,parentProperties:properties})};});
 const result=await page.evaluate(async({pose,actor,overlays,stage,actorOrder})=>{
  const actual=document.querySelector('[data-mascot-canvas]'),expected=document.createElement('canvas');expected.width=stage.width;expected.height=stage.height;const c=expected.getContext('2d'),cache=new Map();
  for(const url of new Set([pose.base,...pose.layers.map(layer=>layer.image),...overlays.map(overlay=>overlay.image)])){const img=new Image();img.src=url;await img.decode();cache.set(url,img);}
  const nodes=[{order:actorOrder,draw(){if(!actor.visible)return;c.setTransform(...actor.matrix);c.globalAlpha=actor.opacity;c.drawImage(cache.get(pose.base),pose.baseOffset?.x??0,pose.baseOffset?.y??0);for(const layer of pose.layers){const img=cache.get(layer.image);if(layer.blend==='replace')c.clearRect(layer.x,layer.y,img.naturalWidth,img.naturalHeight);c.drawImage(img,layer.x,layer.y);}}}];
  // Independent test compositor: matrices come from source-backed pure geometry,
  // not the production runtime's CSS or canvas transformations.
  for(const overlay of overlays)nodes.push({order:overlay.order,draw(){if(!overlay.visible)return;c.setTransform(...overlay.matrix);c.globalAlpha=overlay.opacity;c.drawImage(cache.get(overlay.image),0,0);}});
  for(const node of nodes.sort((a,b)=>a.order-b.order)){c.save();node.draw();c.restore();}
  const want=c.getImageData(0,0,expected.width,expected.height).data,got=actual.getContext('2d').getImageData(0,0,actual.width,actual.height).data;let changedChannels=0;for(let i=0;i<want.length;i++)if(want[i]!==got[i])changedChannels++;
  return {changedChannels,canvasCount:document.querySelectorAll('[data-mascot-canvas]').length,composition:actual.dataset.mascotComposition};
 },{pose,actor,overlays,stage:p0.stage,actorOrder:properties.order??0});
 assert.deepEqual(result,{changedChannels:0,canvasCount:1,composition:'stage'},'Source static emotion and actor must compose pixel-exactly in the existing single stage canvas');
}
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
   await canvas.evaluate(c=>window.__originalMascotCanvas=c);
   let projected=0,overlays=0;
   for(const [i,line] of allowed.entries()){
    if(i)await next.click();
    await page.waitForFunction(text=>document.querySelector('[data-mascot-text]')?.textContent===text,line.text);
    await page.waitForFunction(()=>document.querySelector('.ginka-mascot-portrait')?.dataset.mascotRender==='ready');
    const pose=poses[line.pose],composite=!!line.sceneAction?.overlays?.length,size=composite?line.sceneAction.projection.stage:pose.canvas;assert.deepEqual(await canvas.evaluate(c=>[c.width,c.height]),[size.width,size.height]);
    if(composite){await assertOverlayPixels(page,line,pose);overlays++;}
    assert.ok(await canvas.evaluate(c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=3;i<p.length;i+=4)if(p[i])return true;return false;}),'Blank original portrait');
    assert.ok(await canvas.evaluate(c=>c===window.__originalMascotCanvas),'No second portrait renderer');
    const binding=line.sceneAction;
    if(binding){
     projected++;assert.ok(['complete','static-verified'].includes(await page.locator('[data-ginka-mascot]').getAttribute('data-mascot-scene')),'Reduced motion samples real numeric endpoint, never loops');
    }else{
     assert.equal(await page.locator('[data-ginka-mascot]').getAttribute('data-mascot-scene'),'unavailable');
     assert.ok(await canvas.evaluate(c=>{const p=c.closest('.ginka-mascot-portrait'),r=c.getBoundingClientRect(),b=p.getBoundingClientRect(),scale=Math.min(p.clientWidth/c.width,p.clientHeight/c.height);return Math.abs(r.width-c.width*scale)<.1&&Math.abs(r.bottom-b.bottom)<.1;}),'B geometry retains default full-page anchor');
    }
    if(line.voice){
     await page.waitForFunction(({id,voice})=>{const a=document.querySelector('[data-mascot-audio]');return a?.currentSrc.endsWith(voice)&&Number.isFinite(a.duration)&&a.duration>0&&JSON.parse(localStorage.getItem('ginka.vn.voice.history.v1')||'null')?.entries?.some(e=>e.id===id);},{id:line.id,voice:line.voice});
     assert.ok(await audio.evaluate(a=>!a.error),'Original voice decode error');
    }
   }
   const before=await page.evaluate(()=>localStorage.getItem('ginka.vn.voice.history.v1'));
   await page.locator('[data-mascot-action=replay]').click();await page.waitForFunction(()=>!document.querySelector('[data-mascot-audio]').paused);
   assert.equal(await page.evaluate(()=>localStorage.getItem('ginka.vn.voice.history.v1')),before,'Real VOICE replay must not append duplicate history');
   await next.click();assert.equal(await page.locator('[data-mascot-text]').textContent(),allowed[0].text);
   await page.locator('.ginka-mascot-selection summary').click();
   const character=page.locator('.ginka-mascot-selection [data-vn-mascot-character]'),outfit=page.locator('.ginka-mascot-selection [data-vn-mascot-outfit]'),expression=page.locator('.ginka-mascot-selection [data-vn-mascot-expression]'),gesture=page.locator('.ginka-mascot-selection [data-vn-mascot-gesture]');
   let selections=0;
   for(const p of Object.values(poses).filter(p=>unlocked||p.phase==='main')){
    await character.selectOption(p.character);await outfit.selectOption(p.outfit);await expression.selectOption(p.expression);await gesture.selectOption(p.gesture);
    await page.waitForFunction(()=>document.querySelector('.ginka-mascot-portrait')?.dataset.mascotRender==='ready');
    const id=await page.locator('.ginka-mascot-portrait').getAttribute('data-mascot-pose'),selected=poses[id];
    assert.deepEqual([selected.character,selected.outfit,selected.expression,selected.gesture],[p.character,p.outfit,p.expression,p.gesture]);
    assert.equal(await page.locator('[data-mascot-action=replay]').isDisabled(),true,'Independent pose preview must not borrow unrelated audio');selections++;
   }
   await page.locator('.ginka-mascot-selection summary').click();
   await page.locator('[data-mascot-character] [data-mascot-action=close]').click();assert.equal(await audio.evaluate(a=>a.paused),true);
   assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   results.push({width,unlocked,lines:allowed.length,poses:new Set(allowed.map(l=>l.pose)).size,projected,selections,overlays});
   await page.close();
  }
 }
 const dynamic=lines.find(l=>l.sceneAction?.actions.length);
 if(dynamic){
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin.origin?r.continue():r.abort());
  await page.addInitScript(()=>{localStorage.setItem('ginka.vn.mode.v1','reader');localStorage.setItem('ginka.vn.playback.v1',JSON.stringify({version:1,textRevealMs:0,effectSpeed:.5}));});
  await page.goto(origin.href,{waitUntil:'domcontentloaded'});await page.locator('[data-mascot-action=open]').click();
  const main=lines.filter(l=>l.phase==='main'&&poses[l.pose].phase==='main'),index=main.indexOf(dynamic);
  assert.ok(index>=0,'Dynamic acceptance sample must have reviewed spoiler-free phase');
  for(let i=0;i<index;i++)await page.locator('[data-mascot-window] [data-mascot-action=next]').click();
  await page.waitForFunction(()=>document.querySelector('[data-ginka-mascot]').dataset.mascotScene==='playing');
  const canvas=page.locator('[data-mascot-canvas]'),initial=await canvas.evaluate(c=>c.style.transform);
  await page.waitForFunction(m=>document.querySelector('[data-mascot-canvas]').style.transform!==m,initial);
  await page.waitForFunction(()=>document.querySelector('[data-ginka-mascot]').dataset.mascotScene==='complete');
  const {projection}=dynamic.sceneAction,p=poses[dynamic.pose],scheduler=new SceneActionScheduler(dynamic.sceneAction.initial);
  for(const command of dynamic.sceneAction.actions){assert.equal(scheduler.dispatch(command).ok,true);scheduler.advance(1e6);}
  const frame=scheduler.frame(),raw=projectMascotCamera({...projection,canvas:p.canvas,properties:{...projection.properties,...frame.objects.actor.properties},camera:{...projection.camera,...frame.camera.properties}});
  // Compare the observed endpoint against the independently supplied original projection for this sample.
  assert.ok(raw.matrix.every(Number.isFinite));
  const size=await page.locator('.ginka-mascot-portrait').evaluate(p=>({width:p.clientWidth,height:p.clientHeight})),fit=computeMascotGeometry({canvas:projection.stage,viewport:size});
  const actual=await canvas.evaluate(c=>Array.from(new DOMMatrix(c.style.transform).toFloat64Array()).filter((_,i)=>[0,1,4,5,12,13].includes(i)));
  const expected=raw.matrix.map((v,i)=>v*fit.scale+(i===4?fit.drawRect.x:i===5?fit.drawRect.y:0));
  assert.equal(actual.length,6);actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<.002,'Real original numeric endpoint projection mismatch'));
  await page.locator('[data-mascot-character] [data-mascot-action=close]').click();
  assert.equal(await page.locator('[data-mascot-audio]').evaluate(a=>a.paused),true);
  await page.close();results.push({dynamic:true,sameCanvas:true,sourceTiming:'reviewed-numeric-fragment',endpoint:true});
 }
}finally{await browser.close();}
console.log(JSON.stringify({mode:'real-private-pack',results},null,2));
