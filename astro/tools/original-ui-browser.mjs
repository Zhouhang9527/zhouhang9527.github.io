// Geometry/interaction acceptance: synthetic fixture by default; explicit loopback real-private mode never exports assets.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const astroPackage=require.resolve('astro/package.json');
const astroCli=path.resolve(path.dirname(astroPackage),require(astroPackage).bin.astro);
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import manifest from '../config/vn-scenes.json' with {type:'json'};
import {createSyntheticUI} from './synthetic-ui-fixture.mjs';
const real=process.env.GINKA_TEST_ORIGINAL==='1';
const port=process.env.GINKA_TEST_PORT||'4380';
assert.ok(/^\d+$/.test(port)&&Number(port)>0&&Number(port)<=65535,'Invalid fixture test port');
const root=real?null:fs.mkdtempSync(path.join(os.tmpdir(),'ginka-original-ui-'));
const base=real?(process.env.GINKA_TEST_BASE_URL||'http://127.0.0.1:4321'):'http://127.0.0.1:'+port;
if(real)assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'Real private acceptance must stay on loopback');
const out=process.env.GINKA_TEST_REPORT_DIR||(real?'artifacts/vn/original-ui-real-private':'artifacts/vn/original-ui-fixture');
const {optionGeometry:option,loadGeometry:load,galleryGeometry:gallery}=manifest.privateUI;
fs.mkdirSync(out,{recursive:true});
let server,browser,log='';
const results=[];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 const probe=base+'/__ginka_local_ui__/soundLabels-wordmark.png';
 if(!real){
  const env={...process.env,...createSyntheticUI(root)};
  for(const key of ['GINKA_MASCOT_MANIFEST','GINKA_UI_FONT','GINKA_RULE_PREVIEW'])delete env[key];
  server=spawn(process.execPath,[astroCli,'dev','--host','127.0.0.1','--port',port],{env,stdio:['ignore','pipe','pipe']});
  for(const stream of [server.stdout,server.stderr])stream.on('data',chunk=>{log=(log+chunk).slice(-40000);});
  for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error('Dev server exited');try{if((await fetch(probe,{signal:AbortSignal.timeout(1500)})).ok)break;}catch{}await wait(300);}
 }
 assert.equal((await fetch(probe,{signal:AbortSignal.timeout(15000)})).status,200,'Private UI source is not available');
 browser=await chromium.launch();
 for(const width of [390,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width===390});
  const result={width,synthetic:!real,mode:real?'real-private':'synthetic-fixture',touch:width===390,checks:[],geometry:[],errors:[],privateFailures:[],requests:[],ok:false};
  const privateURL=url=>new URL(url).origin===base&&/^\/__ginka_local_(ui|title)__\//.test(new URL(url).pathname);
  page.on('pageerror',e=>result.errors.push(e.message));
  page.on('request',r=>{if(privateURL(r.url()))result.requests.push(new URL(r.url()).pathname);});
  page.on('response',r=>{if(privateURL(r.url())&&r.status()>=400)result.privateFailures.push(r.status()+' '+r.url());});
  page.on('requestfailed',r=>{if(privateURL(r.url())&&r.failure()?.errorText!=='net::ERR_ABORTED')result.privateFailures.push(r.url());});
  await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  const visible=selector=>page.locator(selector).first().waitFor({state:'visible'});
  const check=async(name,fn)=>{try{await fn();result.checks.push({name,ok:true});}catch(error){result.checks.push({name,ok:false,error:String(error)});}};
  const shot=async name=>{await page.screenshot({path:out+'/'+width+'-'+name+'.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow '+name);};
  const geometry=async(stage,selector,expected)=>{
   if(width<960)return;
   const actual=await page.locator(selector).evaluate((el,stage)=>{const r=el.getBoundingClientRect(),s=document.querySelector(stage).getBoundingClientRect(),scale=1280/s.width;return [(r.x-s.x)*scale,(r.y-s.y)*scale,r.width*scale,r.height*scale];},stage);
   const delta=actual.map((v,i)=>Math.round((v-expected[i])*100)/100);
   result.geometry.push({selector,expected,actual:actual.map(v=>Math.round(v*100)/100),delta,ok:delta.every(v=>Math.abs(v)<=2)});
  };
  try{
   await page.goto(base+'/',{waitUntil:'domcontentloaded'});await visible('[data-vn-title][data-vn-original=true]');
   assert.equal(await page.locator('[data-vn-no-next]').isVisible(),false);
   await shot('title');
   if(width===390)await page.locator('.vn-menu a[href="/settings/"]').tap();else await page.locator('.vn-menu a[href="/settings/"]').click();
   await visible('[data-vn-config]');
   const stage='[data-vn-screen="config"]';
   assert.equal(await page.locator(stage).getAttribute('data-vn-ui-original'),'true');
   for(const key of ['display','program','text','sound','dialog','touch','shortcut']){
    await page.locator('[data-vn-option-tab="'+key+'"]').click();
    await visible('[data-vn-option-panel="'+key+'"]');
    await geometry(stage,'[data-vn-option-tab="'+key+'"]',option.controls[key]);
    await geometry(stage,'#vn-option-title',option.headings[key]);
    if(width>=960)await check(key+' wordmark',async()=>assert.match(await page.locator('#vn-option-title').evaluate(el=>getComputedStyle(el).backgroundImage),new RegExp(key+'Labels-wordmark\\.png')));
    if(key==='display'){
     for(const [selector,id] of [['[data-vn-window="window"]','window'],['[data-vn-window="full"]','fullscreen'],['label:has(input[name="vn-motion"][value="system"])','effectOn'],['label:has(input[name="vn-motion"][value="reduced"])','effectOff']])await geometry(stage,selector,option.display[id]);
    }
    if(key==='text'){
     await page.locator('[data-vn-text-size]').focus();await page.locator('[data-vn-text-size]').press('End');
     await page.waitForFunction(()=>localStorage.getItem('ginka.vn.text-size.v1')==='22');
    }
    if(key==='sound'){await page.locator('[data-vn-volume]').focus();await page.locator('[data-vn-volume]').press('Home');assert.equal(await page.locator('[data-vn-volume]').inputValue(),'0');}
    await shot('system-'+key);
   }
   for(const [selector,key] of [['[data-vn-option-back]','back'],['.vn-option-footer [data-vn-option-default]','defaults'],['.vn-option-footer [data-vn-mode-set="game"]','title']])await geometry(stage,selector,option.controls[key]);
   await page.locator('[data-vn-option-back]').click();await visible('[data-vn-title]');
   await page.locator('.vn-menu a[href="/library/"]').click();await visible('[data-vn-manual-grid]');
   const library='[data-vn-screen="load"]';
   assert.equal(await page.locator(library).getAttribute('data-vn-ui-original'),'true');
   assert.equal(await page.locator('[data-vn-save-tab]').isDisabled(),true);
   for(const [selector,key] of [['[data-vn-save-tab]','save'],['[data-vn-filter="manual"]','load'],['[data-vn-filter="quick"]','quick'],['[data-vn-library-title]','title'],['.vn-load-return','back'],['[data-vn-library-exit]','exit']])await geometry(library,selector,load.controls[key]);
   for(let i=0;i<10;i++){
    const row=Math.floor(i/load.columns),col=i%load.columns;
    await geometry(library,'[data-vn-manual-slot="'+i+'"]',[load.first[0]+col*load.step[0],load.first[1]+row*load.step[1],...load.slot]);
   }
   if(width>=960){
    for(let i=0;i<load.normalPages;i++)await geometry(library,'[data-vn-page="'+i+'"]',load.controls['page'+(i+1)]);
    await page.locator('[data-vn-page="14"]').click();
   }else for(let i=1;i<load.normalPages;i++)await page.locator('[data-vn-page-step="1"]').click();
   assert.equal(await page.locator('[data-vn-manual-slot]').first().getAttribute('data-vn-manual-slot'),'140');
   await shot('load-page15');
   await page.locator('[data-vn-filter="quick"]').click();assert.equal(await page.locator('#vn-load-title').textContent(),'Q.LOAD');
   await shot('quick-load');
   await page.locator('.vn-load-return').click();await visible('[data-vn-title]');
   // Exercise the unlocked blog gallery, not a reconstructed original CG flag.
   // These geometry checks deliberately do not establish locked-route behavior.
   await page.evaluate(()=>{const title=document.querySelector('[data-vn-title]'),key='ginka.vn.progress.v1';const state=JSON.parse(localStorage.getItem(key)||'{}');state.version=1;state.completed=JSON.parse(title?.getAttribute('data-vn-mainline')||'[]');state.mainCleared=true;localStorage.setItem(key,JSON.stringify(state));});
   result.galleryUnlockScope='Seeded fixed blog mainline completion; not original CG flags';
   await page.goto(base+'/gallery/',{waitUntil:'domcontentloaded'});await visible('[data-vn-screen="gallery"]');
   await geometry('[data-vn-screen="gallery"]','#vn-panel-heading',gallery.heading);
   await geometry('[data-vn-screen="gallery"]','.vn-panel-header .vn-return',gallery.back);
   for(let i=0;i<manifest.gallery.length;i++)await geometry('[data-vn-screen="gallery"]','.vn-gallery-grid .journal-scene-item:nth-child('+(i+1)+')',gallery.items[i]);
   await shot('extra');
   await page.locator('.vn-panel-header .vn-return').click();await visible('[data-vn-title]');
   await page.locator('.vn-menu a[href="/information/"]').click();await visible('[data-vn-screen="information"]');
   const information='[data-vn-screen="information"]';
   for(const [id,bounds] of Object.entries(manifest.privateUI.informationGeometry.controls))await geometry(information,'[data-vn-info="'+id+'"]',bounds);
   assert.equal(await page.locator('.vn-info-links a').count(),7);
   if(width>=960)await check('information original wordmark',async()=>assert.match(await page.locator('#vn-info-title').evaluate(el=>getComputedStyle(el).backgroundImage),/informationLabels-maintitle-normal\.png/));
   await shot('information');
   await check('private raster decode with responsive scope',async()=>{
    const decoded=await page.evaluate(async fallback=>{
     const urls=new Set();
     for(const element of document.querySelectorAll('main,main *')){
      if(!element.getClientRects().length)continue;
      for(const match of getComputedStyle(element).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g))if(match[1].includes('/__ginka_local_'))urls.add(match[1]);
      if(element instanceof HTMLImageElement&&element.currentSrc.includes('/__ginka_local_'))urls.add(element.currentSrc);
     }
     const scope=urls.size?'visible INFORMATION rasters':'previously requested raster; responsive INFORMATION uses text controls';
     if(!urls.size)for(const url of fallback)urls.add(url);
     const images=await Promise.all([...urls].map(async url=>{const image=new Image(),start=performance.now();image.src=url;await image.decode();return {path:new URL(url,location.href).pathname,width:image.naturalWidth,height:image.naturalHeight,decodeMs:Math.round((performance.now()-start)*100)/100};}));
     return {scope,images};
    },[...new Set(result.requests.filter(url=>url.endsWith('.png')))].slice(0,3));
    result.decodedImages=decoded.images;result.rasterDecodeScope=decoded.scope;
    assert.ok(result.decodedImages.length>0,'No private raster was decoded');
    assert.ok(result.decodedImages.every(image=>image.width>0&&image.height>0),'Invalid private raster dimensions');
   });
   await page.locator('[data-vn-info="back"]').click();await visible('[data-vn-title]');
   await check('private resources loaded',async()=>{assert.ok(result.requests.some(p=>p.startsWith('/__ginka_local_title__/')));assert.ok(result.requests.some(p=>p.startsWith('/__ginka_local_ui__/')));});
   await check('private requests and page errors',async()=>{assert.deepEqual(result.privateFailures,[]);assert.deepEqual(result.errors,[]);});
   result.ok=result.checks.every(c=>c.ok)&&result.geometry.every(g=>g.ok);
  }catch(error){result.error=String(error);await page.screenshot({path:out+'/'+width+'-failure.png'}).catch(()=>{});}
  finally{result.url=page.url();results.push(result);await page.close();}
 }
}catch(error){results.push({ok:false,error:String(error)});}
finally{
 await browser?.close();
 if(server){server.kill();if(server.exitCode===null)await Promise.race([new Promise(r=>server.once('exit',r)),wait(2000)]);}
 fs.writeFileSync(out+'/server.log',log);
 fs.writeFileSync(out+'/report.json',JSON.stringify(results,null,2));
 if(root)fs.rmSync(root,{recursive:true,force:true});
}
console.log(JSON.stringify(results.map(({requests,geometry,...r})=>({...r,requests:requests?.length,geometryChecks:geometry?.length,geometryFailures:geometry?.filter(g=>!g.ok)})),null,2));
if(results.some(r=>!r.ok))process.exitCode=1;
