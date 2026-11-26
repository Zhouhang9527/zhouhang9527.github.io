import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Independent title/progress regression. Manual-library pagination/thumbnail
// acceptance belongs to vn-save-browser; no original game bytes are exported.
const base=process.env.GINKA_TEST_BASE_URL||'http://127.0.0.1:4321';
const origin=new URL(base).origin;
const browser=await chromium.launch();
const results=[];
const KEY='ginka.vn.progress.v1',SAVE='ginka.vn.saves.v1',QUICK='ginka.vn.quick.v1';
try{
 for(const width of [390,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const result={width,ok:false,checks:[]};
  const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  const title=async()=>{await page.goto(base+'/');await page.waitForFunction(()=>{const toggle=document.querySelector('[data-vn-mode-toggle]');return !!toggle&&!toggle.hidden;});await page.locator('[data-vn-title]').waitFor({state:'visible'});};
  const confirm=async yes=>{await page.locator('[data-vn-confirm][open]').waitFor({state:'visible'});await page.locator(yes?'[data-vn-confirm-yes]':'[data-vn-confirm-no]').click();};
  try{
   await title();
   assert.equal(await page.locator('[data-vn-next]').isVisible(),false);
   await page.goto(base+'/afterstory/');await page.locator('[data-vn-afterstory-locked]').waitFor({state:'visible'});
   assert.equal(await page.locator('[data-vn-afterstory-content]').isVisible(),false);
   assert.equal(await state(),null);
   result.checks.push('locked direct afterstory does not consume NEW');
   await title();
   const required=await page.locator('[data-vn-title]').evaluate(node=>JSON.parse(node.dataset.vnMainline));assert.equal(required.length,15);
   const path=required.at(-1),position={ratio:.3,heading:null,section:.3};
   // Seed old read marks and old/new save records, not earned unlock flags. The
   // final mark, NEXT consumption and NEW GAME below use actual page controls.
   const initial={version:1,completed:required.slice(0,-1),last:path,recent:{[path]:1},bookmarks:[path],positions:{[path]:position},mainCleared:false,afterstoryStarted:false};
   const record={path,position,title:'Progress regression fixture',at:1,story:{completed:initial.completed,mainCleared:false,afterstoryStarted:false}};
   const {story,...legacy}=record;
   await page.evaluate(({initial,record,legacy,KEY,SAVE,QUICK})=>{localStorage.setItem(KEY,JSON.stringify(initial));localStorage.setItem(SAVE,JSON.stringify({version:1,slots:{0:record}}));localStorage.setItem(QUICK,JSON.stringify(legacy));window.dispatchEvent(new StorageEvent('storage',{key:KEY}));},{initial,record,legacy,KEY,SAVE,QUICK});
   assert.equal(await page.locator('[data-vn-next]').isVisible(),false);
   await page.goto(base+path);await page.locator('[data-vn-mark]').waitFor({state:'visible'});
   assert.equal(await page.evaluate(()=>scrollY),0,'A normal URL must not implicitly resume');
   await page.locator('[data-vn-mark]').click();await page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).mainCleared,KEY);
   assert.equal((await state()).completed.length,15);
   await page.locator('[data-vn-mark]').click();assert.equal((await state()).completed.length,14);assert.equal((await state()).mainCleared,true);
   result.checks.push('actual final mark earns permanent clear; unmark does not revoke it');
   await title();assert.equal(await page.locator('[data-vn-title]').getAttribute('data-vn-frame'),'familiar');
   assert.equal(await page.locator('[data-vn-next-new]').isVisible(),true);
   await page.locator('[data-vn-next]').click();await page.waitForURL(url=>url.pathname==='/afterstory/');
   await page.locator('[data-vn-afterstory-content]').waitFor({state:'visible'});
   assert.match(await page.locator('[data-vn-afterstory-content]').textContent(),/正文尚未发布/);
   assert.equal((await state()).afterstoryStarted,true);
   await title();assert.equal(await page.locator('[data-vn-next-new]').isVisible(),false);
   result.checks.push('independent NEXT consumes NEW and survives full reload; unpublished stays explicit');
   const before=await page.evaluate(({KEY,SAVE,QUICK})=>({progress:localStorage.getItem(KEY),manual:localStorage.getItem(SAVE),quick:localStorage.getItem(QUICK)}),{KEY,SAVE,QUICK});
   await page.locator('[data-vn-start]').click();await confirm(false);
   assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),before.progress);
   await page.locator('[data-vn-start]').click();await confirm(true);await page.waitForURL(url=>url.pathname==='/archives/');await page.locator('[data-vn-chapter]').waitFor({state:'visible'});
   const restarted=await state(),previous=JSON.parse(before.progress);
   assert.deepEqual(restarted.completed,[]);assert.equal(restarted.last,null);assert.deepEqual(restarted.positions,{});
   assert.deepEqual(restarted.recent,previous.recent);assert.deepEqual(restarted.bookmarks,previous.bookmarks);assert.equal(restarted.mainCleared,true);assert.equal(restarted.afterstoryStarted,true);
   assert.equal(await page.evaluate(key=>localStorage.getItem(key),SAVE),before.manual);assert.equal(await page.evaluate(key=>localStorage.getItem(key),QUICK),before.quick);
   await title();assert.equal(await page.locator('[data-vn-continue]').isVisible(),false);assert.equal(await page.locator('[data-vn-title]').getAttribute('data-vn-frame'),'familiar');
   result.checks.push('confirmed START resets route only; cancellation and earned unlock/library boundaries hold');
   await page.locator('.vn-menu a[href="/library/"]').click();await page.locator('[data-vn-manual-action="0"]').waitFor({state:'visible'});
   await page.locator('[data-vn-manual-action="0"]').click();await confirm(true);await page.waitForURL(url=>url.pathname===path);await page.locator('[data-vn-mark]').waitFor({state:'visible'});
   await page.waitForFunction(()=>scrollY>100);
   const loaded=await state();assert.equal(loaded.completed.length,14);assert.equal(loaded.mainCleared,true);assert.equal(loaded.afterstoryStarted,true);
   assert.equal(await page.evaluate(()=>sessionStorage.getItem('ginka.vn.slot-restore.v1')),null);
   await title();await page.locator('[data-vn-continue]').click();await page.waitForURL(url=>url.pathname===path);await page.waitForFunction(()=>scrollY>100);
   // Loading the same URL is a browser reload and may preserve native scroll;
   // exercise an ordinary direct link from another route, not reload behavior.
   await page.goto(base+'/archives/');await page.locator('[data-vn-chapter]').waitFor({state:'visible'});
   await page.goto(base+path);await page.locator('[data-vn-mark]').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>scrollY),0);
   result.checks.push('LOAD restores slot story/position without revoking unlocks; only explicit CONTINUE restores scroll');
   assert.deepEqual(errors,[]);result.ok=true;
  }catch(error){result.error=String(error);result.url=page.url();result.pageErrors=errors;}
  finally{results.push(result);await page.close();}
 }
}finally{await browser.close();fs.mkdirSync('artifacts/vn-progress',{recursive:true});fs.writeFileSync('artifacts/vn-progress/report.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
if(results.some(result=>!result.ok))process.exitCode=1;
