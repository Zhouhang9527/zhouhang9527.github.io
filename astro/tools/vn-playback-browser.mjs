// Real private text/voice + the production text reveal clock. The read-only
// storage interception is an explicit failure fixture, not a provider test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const base=process.env.GINKA_TEST_BASE_URL||'http://127.0.0.1:4354';
const out=process.env.GINKA_TEST_OUTPUT||'artifacts/vn/d-playback';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch(),results=[];
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'no-preference'}),result={width,realPrivateTextAndVoice:true,readOnlyStorageFixture:true,ok:false,errors:[]};results.push(result);page.on('pageerror',e=>result.errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  try{
   await page.goto(base+'/settings/#text');await page.locator('[data-vn-playback=textRevealMs]').waitFor({state:'visible'});
   await page.locator('[data-vn-playback=textRevealMs]').focus();await page.keyboard.press('End');
   await page.locator('[data-vn-option-tab=program]').click();await page.locator('[data-vn-option-panel=program] [data-mascot-action=preview]').waitFor({state:'visible'});
   await page.waitForFunction(()=>!document.querySelector('[data-vn-option-panel=program] [data-mascot-action=preview]').disabled);
   await page.locator('[data-vn-option-panel=program] [data-mascot-action=preview]').click();
   const lines=await page.evaluate(async()=>{const m=await (await fetch('/__ginka_local_mascot__/manifest.json')).json();return m.lines.filter(l=>l.phase==='main'&&m.poses[l.pose]?.phase==='main');});assert.ok(lines.length>2);
   await page.waitForFunction(text=>document.querySelector('[data-mascot-text]').textContent===text,lines[0].text);
   for(let i=1;i<2;i++){await page.locator('.ginka-mascot-window nav [data-mascot-action=next]').click();await page.waitForFunction(text=>document.querySelector('[data-mascot-text]').textContent===text,lines[i].text);}
   const line=lines[2];await page.locator('.ginka-mascot-window nav [data-mascot-action=next]').click();
   await page.waitForFunction(text=>{const e=document.querySelector('[data-mascot-text]');return e&&e.textContent.length>0&&e.textContent.length<text.length;},line.text);
   // Keep the short real line actively revealing: send the native input event in
   // one page turn instead of spending its whole duration scrolling between tabs.
   await page.locator('[data-vn-playback=textRevealMs]').evaluate(input=>{const original=Storage.prototype.setItem;window.__dRestore=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(key,value){if(key==='ginka.vn.playback.v1')throw new DOMException('D quota fixture','QuotaExceededError');return original.call(this,key,value);};input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(text=>document.querySelector('[data-mascot-text]').textContent===text,line.text);
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ginka.vn.playback.v1')).textRevealMs),100);
   assert.equal(await page.locator('[data-vn-playback=textRevealMs]').inputValue(),'0');
   assert.match(await page.locator('[data-vn-option-feedback]').textContent(),/无法保存/);
   assert.equal(await page.locator('[data-mascot-audio]').count(),1);assert.deepEqual(result.errors,[]);
   result.checks=['slow reveal observed on real line','UI zero-speed detail finishes the active reveal despite storage denial','stored old value retained, no fabricated persistence success'];result.ok=true;
  }catch(error){result.failure=error.stack||String(error);await page.screenshot({path:path.join(out,width+'-failure.png')}).catch(()=>{});}
  finally{await page.context().close();}
 }
}finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));if(results.some(r=>!r.ok))process.exitCode=1;
