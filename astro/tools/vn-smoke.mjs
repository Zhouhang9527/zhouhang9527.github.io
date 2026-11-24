import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.GINKA_TEST_BASE_URL||'http://127.0.0.1:4321';
const origin=new URL(base).origin;
const browser=await chromium.launch();
fs.mkdirSync('artifacts/vn',{recursive:true});
const results=[];
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const result={width,errors,ok:false};
  const visible=selector=>page.locator(selector).first().waitFor({state:'visible'});
  const go=async(path,selector)=>{await page.goto(base+path,{waitUntil:'domcontentloaded'});await visible(selector);};
  const shot=async name=>{
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow: '+name);
   await page.screenshot({path:'artifacts/vn/'+width+'-'+name+'.png'});
  };
  try{
   await go('/','[data-vn-title]');
   assert.equal(await page.locator('[data-vn-continue]').isVisible(),false);
   await page.locator('[data-vn-start]').focus();
   await page.keyboard.press('ArrowDown');
   assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('href')),'/library/');
   await shot('title');
   const audio=await page.evaluateHandle(()=>document.querySelector('#bg-music'));
   await page.locator('[data-vn-start]').click();
   await visible('[data-vn-chapter]');
   await shot('chapter');
   const links=await page.locator('[data-vn-post]').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href')));
   assert.ok(links.length>=1);
   await page.locator('[data-vn-post]').first().click();
   await visible('.post-body');
   await visible('[data-vn-mark]');
   const article=page.url();
   const pathname=new URL(article).pathname;
   assert.ok(await page.evaluate(old=>old===document.querySelector('#bg-music'),audio),'Audio replaced by navigation');
   await page.locator('[data-vn-bookmark]').click();
   await page.locator('[data-vn-mark]').click();
   await page.waitForFunction(()=>document.querySelector('[data-vn-mark]')?.getAttribute('aria-pressed')==='true');
   // Persist a deterministic position to test explicit resume independent of
   // article length, remote image loading and scroll animation.
   await page.evaluate(path=>{
    const key='ginka.vn.progress.v1',state=JSON.parse(localStorage.getItem(key));
    state.positions[path]={ratio:.55,heading:null,section:.55};
    localStorage.setItem(key,JSON.stringify(state));
   },pathname);
   await page.locator('[data-vn-return]').click();
   await visible('[data-vn-title]');
   assert.equal(await page.locator('[data-vn-title]').getAttribute('data-vn-frame'),'data-003');
   await page.locator('.vn-menu a[href="/map/"]').click();
   await visible('[data-vn-map][data-vn-map-phase="first-encounter"]');
   await shot('map');
   await page.locator('.vn-panel-header .vn-return').click();
   await page.locator('.vn-menu a[href="/library/"]').click();
   await visible('[data-vn-slot]:visible');
   await page.locator('[data-vn-filter="bookmarks"]').click();
   assert.equal(await page.locator('[data-vn-slot]:visible').count(),1);
   await shot('load');
   await page.locator('[data-vn-slot]:visible [data-vn-resume]').click();
   await visible('.post-body');
   assert.equal(page.url(),article);
   await page.waitForFunction(()=>!sessionStorage.getItem('ginka.vn.resume.v1'));
   await page.locator('[data-vn-return]').click();
   await page.locator('.vn-menu a[href="/gallery/"]').click();
   await visible('[data-vn-screen="gallery"]');
   await page.locator('.vn-gallery-grid .journal-scene-card').first().click();
   await visible('.astro-gallery[open]');
   await page.keyboard.press('Escape');
   await page.locator('.astro-gallery').waitFor({state:'hidden'});
   await shot('gallery');
   await page.locator('.vn-panel-header .vn-return').click();
   await page.locator('.vn-menu a[href="/search/"]').click();
   await visible('[data-vn-query]');
   await page.locator('[data-vn-query]').fill('Android');
   await visible('[data-vn-results] a');
   await shot('search');
   await page.locator('.vn-panel-header .vn-return').click();
   await page.locator('.vn-menu a[href="/music-room/"]').click();
   await visible('[data-vn-music]');
   assert.equal(await page.locator('audio#bg-music').count(),1);
   await shot('music');
   await page.locator('.vn-panel-header .vn-return').click();
   await page.locator('.vn-menu a[href="/settings/"]').click();
   await visible('[data-vn-config]');
   await page.locator('input[name="vn-motion"][value="reduced"]').check();
   await page.locator('input[name="vn-mode"][value="reader"]').check();
   await shot('config');
   await page.goto(base+'/archives/',{waitUntil:'domcontentloaded'});
   await visible('[data-vn-view="reader"]');
   assert.equal(await page.locator('[data-vn-view="game"]').isVisible(),false);
   await shot('reader');
   await go('/settings/','[data-vn-config]');
   await page.locator('input[name="vn-mode"][value="game"]').check();
   await page.locator('.vn-panel-header .vn-return').click();
   await visible('[data-vn-title]');
   await page.reload();
   await visible('[data-vn-continue]');
   assert.equal(await page.locator('[data-vn-title]').getAttribute('data-vn-frame'),'data-003');
   assert.deepEqual(errors,[]);
   result.ok=true;
  }catch(error){result.error=String(error);await page.screenshot({path:'artifacts/vn/'+width+'-failure.png'}).catch(()=>{});}
  finally{results.push(result);await page.close();}
 }
 const page=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:900}});
 try{await page.goto(base+'/');await page.locator('[data-vn-start]').click();await page.locator('[data-vn-post]').first().click();await page.locator('.post-body').waitFor();results.push({mode:'no-js',ok:true});}
 catch(error){results.push({mode:'no-js',ok:false,error:String(error)});}finally{await page.close();}
}finally{await browser.close();fs.writeFileSync('artifacts/vn/report.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
if(results.some(x=>!x.ok))process.exitCode=1;
