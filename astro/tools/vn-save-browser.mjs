// D-owned real-browser SAVE/LOAD coverage. Storage seeds below are explicitly
// compatibility/concurrency fixtures; the actual SAVE flow captures a real page.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const base=process.env.GINKA_TEST_BASE_URL||'http://127.0.0.1:4354';
const out=process.env.GINKA_TEST_OUTPUT||'artifacts/vn/d-save';fs.mkdirSync(out,{recursive:true});
const SAVE='ginka.vn.saves.v1',QUICK='ginka.vn.quick.v1',KEY='ginka.vn.progress.v1';
const browser=await chromium.launch(),results=[];
try{
 for(const width of [390,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width===390});
  const result={width,checks:[],errors:[],ok:false};results.push(result);page.on('pageerror',e=>result.errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const visible=s=>page.locator(s).first().waitFor({state:'visible'});
  const check=async(name,fn)=>{await fn();result.checks.push(name);};
  const decide=async yes=>{await visible('[data-vn-confirm][open]');assert.equal(await page.locator('[data-vn-confirm-no]').evaluate(e=>e===document.activeElement),true);await page.locator(yes?'[data-vn-confirm-yes]':'[data-vn-confirm-no]').click();await page.locator('[data-vn-confirm][open]').waitFor({state:'hidden'});};
  const slots=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)||'{"slots":{}}').slots,SAVE);
  const index=async n=>{for(let i=0;!(await page.locator('[data-vn-page="'+n+'"]').count())&&i<15;i++)await page.locator('[data-vn-page-step="'+(n===0?-1:1)+'"]').click();await page.locator('[data-vn-page="'+n+'"]').click();};
  try{
   await page.goto(base+'/library/');await visible('[data-vn-manual-grid]');
   const articles=await page.locator('[data-vn-slot]').evaluateAll(nodes=>nodes.map(n=>({path:n.dataset.vnSlot,title:n.querySelector('strong').textContent,thumbnail:n.dataset.vnThumbnail})));assert.ok(articles.length>=2);
   const chosen=articles.find(a=>a.thumbnail)||articles[0],other=articles.find(a=>a.path!==chosen.path);
   await page.evaluate(({key,paths})=>localStorage.setItem(key,JSON.stringify({version:1,completed:paths,mainCleared:true,afterstoryStarted:false})),{key:KEY,paths:[chosen.path,other.path]});
   await page.goto(base+chosen.path);await visible('[data-vn-game-reader]:not([hidden])');
   await page.evaluate(()=>{const article=document.querySelector('[data-vn-article]'),body=article.querySelector('.post-body');window.scrollTo({top:scrollY+body.getBoundingClientRect().top+body.getBoundingClientRect().height*.4-100,behavior:'instant'});});
   await page.locator('.vn-game-buttons [data-vn-game-action=save]').click();await visible('[data-vn-screen=load][data-vn-save-mode=true]');
   const draft=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('ginka.vn.manual-draft.v1')));assert.equal(draft.path,chosen.path);assert.ok(draft.story);assert.ok(draft.position.ratio>.1);
   await check('manual SAVE captures actual article position and optional blog story',async()=>{
    await page.locator('[data-vn-manual-action="0"]').click();await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k)||'{"slots":{}}').slots[0],SAVE);
    const record=(await slots())[0];assert.equal(record.path,chosen.path);assert.deepEqual(record.position,draft.position);assert.deepEqual(new Set(record.story.completed),new Set([chosen.path,other.path]));
    assert.equal(await page.locator('[data-vn-manual-slot="0"] [data-vn-manual-number]').textContent(),'001');
    if(chosen.thumbnail){await visible('[data-vn-manual-slot="0"] img[data-vn-manual-thumbnail]');await page.waitForFunction(()=>document.querySelector('[data-vn-manual-slot="0"] img').naturalWidth>0);}
   });
   await check('overwrite cancel/accept and last independent slot preserve unrelated data',async()=>{
    const before=JSON.stringify((await slots())[0]);await page.locator('[data-vn-manual-action="0"]').click();await decide(false);assert.equal(JSON.stringify((await slots())[0]),before);
    await page.locator('[data-vn-manual-action="0"]').click();await decide(true);await page.waitForFunction(()=>document.querySelector('[data-vn-manual-feedback]').textContent.includes('已保存'));
    await index(14);assert.equal(await page.locator('[data-vn-manual-slot="149"] [data-vn-manual-number]').textContent(),'150');await page.locator('[data-vn-manual-action="149"]').click();
    await page.waitForFunction(k=>!!JSON.parse(localStorage.getItem(k)).slots[149],SAVE);assert.ok((await slots())[0]);
    await page.locator('[data-vn-filter=manual]').click();await page.locator('[data-vn-manual-delete="149"]').click();await decide(false);assert.ok((await slots())[149]);
    await page.locator('[data-vn-manual-delete="149"]').click();await decide(true);await page.waitForFunction(k=>!JSON.parse(localStorage.getItem(k)).slots[149],SAVE);assert.ok((await slots())[0]);
   });
   await check('same-slot changes in another tab cannot be overwritten after confirmation',async()=>{
    await page.locator('[data-vn-save-tab]').click();await index(0);await page.locator('[data-vn-manual-action="0"]').click();await visible('[data-vn-confirm][open]');
    await page.evaluate(k=>{const all=JSON.parse(localStorage.getItem(k));all.slots[0].title='Concurrent fixture';localStorage.setItem(k,JSON.stringify(all));window.dispatchEvent(new StorageEvent('storage',{key:k}));},SAVE);
    await decide(true);await page.waitForFunction(()=>document.querySelector('[data-vn-manual-feedback]').textContent.includes('变化'));assert.equal((await slots())[0].title,'Concurrent fixture');
   });
   // Restore the real captured record but alter the current route completion. The
   // saved story must restore completion, never revoke an earned global unlock.
   await page.evaluate(({key,save,draft})=>{localStorage.setItem(save,JSON.stringify({version:1,slots:{0:draft}}));localStorage.setItem(key,JSON.stringify({version:1,completed:[],mainCleared:true}));}, {key:KEY,save:SAVE,draft});
   await page.goto(base+'/library/');await visible('[data-vn-manual-grid]');
   await check('LOAD restores saved position and completion while permanent unlock survives',async()=>{
    await page.locator('[data-vn-manual-action="0"]').click();await decide(true);await visible('[data-vn-article]');
    await page.waitForFunction(({key,ratio})=>{const article=document.querySelector('[data-vn-article]'),body=article?.querySelector('.post-body');if(!body)return false;const current=(scrollY+100-(scrollY+body.getBoundingClientRect().top))/body.getBoundingClientRect().height;return Math.abs(current-ratio)<.04&&JSON.parse(localStorage.getItem(key)).completed.length===2;},{key:KEY,ratio:draft.position.ratio});
    const state=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);assert.equal(state.mainCleared,true);assert.deepEqual(new Set(state.completed),new Set(draft.story.completed));
   });
   const legacy={path:other.path,title:'Legacy quick fixture',at:Date.now(),position:{ratio:.25,heading:null,section:.25}};
   await page.evaluate(({quick,record})=>localStorage.setItem(quick,JSON.stringify(record)),{quick:QUICK,record:legacy});
   await page.goto(base+'/library/');await visible('[data-vn-manual-grid]');
   await check('quick is one separate deletable slot and old record restores position only',async()=>{
    await page.locator('[data-vn-filter=quick]').click();assert.equal(await page.locator('[data-vn-manual-slot]:visible').count(),1);assert.equal(await page.locator('[data-vn-manual-number]:visible').textContent(),'Q');
    await page.locator('[data-vn-manual-action="0"]').click();await decide(false);assert.match(page.url(),/library/);
    await page.locator('[data-vn-manual-action="0"]').click();await decide(true);await page.waitForURL(base+other.path);await visible('[data-vn-article]');
    await page.waitForFunction(()=>scrollY>100);const state=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);assert.deepEqual(new Set(state.completed),new Set(draft.story.completed));
    await page.goto(base+'/library/');await visible('[data-vn-manual-grid]');await page.locator('[data-vn-filter=quick]').click();await page.locator('[data-vn-manual-delete="0"]').click();await decide(true);
    await page.waitForFunction(k=>localStorage.getItem(k)===null,QUICK);assert.ok((await slots())[0]);assert.equal(await page.locator('[data-vn-manual-action="0"]').isDisabled(),true);
   });
   await check('damaged save data is visible and never silently replaced',async()=>{
    await page.evaluate(k=>{localStorage.setItem(k,'broken');window.dispatchEvent(new StorageEvent('storage',{key:k}));},SAVE);await page.locator('[data-vn-filter=manual]').click();
    await page.waitForFunction(()=>document.querySelector('[data-vn-manual-feedback]').textContent.includes('无法读取'));assert.equal(await page.evaluate(k=>localStorage.getItem(k),SAVE),'broken');
   });
   assert.deepEqual(result.errors,[]);result.ok=true;
  }catch(error){result.failure=error.stack||String(error);result.url=page.url();await page.screenshot({path:path.join(out,width+'-failure.png')}).catch(()=>{});}
  finally{await page.context().close();}
 }
}finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.ok))process.exitCode=1;
