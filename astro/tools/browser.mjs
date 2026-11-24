import {chromium} from 'playwright';import fs from 'node:fs';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
fs.mkdirSync('artifacts',{recursive:true});
const results=[];
try{
 for(const width of [390,768,1440])for(const mode of ['day','moonlit']){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.addInitScript(m=>localStorage.setItem('ginka-theme',m),mode);
   await page.goto('http://127.0.0.1:4321/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.GINKA_THEME?.theme===document.documentElement.dataset.theme);
   await page.screenshot({path:`artifacts/${width}-${mode}-home.png`});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'home overflow');
   const old=await page.evaluateHandle(()=>document.querySelector('#bg-music'));
   await page.locator('.journal-entry h3 a').first().click();
   await page.locator('.post-body').waitFor();
   assert.ok(await page.evaluate(audio=>audio===document.querySelector('#bg-music'),old),'audio replaced');
   assert.equal(await page.evaluate(()=>document.querySelector('link[rel=canonical]').href),'https://www.mm9527.top'+new URL(page.url()).pathname);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'article overflow');
   await page.screenshot({path:`artifacts/${width}-${mode}-article.png`});
   await page.locator('.journal-dialogue').scrollIntoViewIfNeeded();
   const frame=page.locator('iframe.giscus-frame');await frame.waitFor({state:'attached',timeout:20000});
   await page.screenshot({path:`artifacts/${width}-${mode}-comments.png`});
   assert.equal(await page.locator('iframe.giscus-frame').count(),1);
   results.push({width,mode,ok:true,errors});
  }catch(error){results.push({width,mode,ok:false,error:String(error),errors});await page.screenshot({path:`artifacts/${width}-${mode}-failure.png`}).catch(()=>{});}
  await page.close();
 }
}finally{await browser.close();fs.writeFileSync('artifacts/report.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));if(results.some(x=>!x.ok||x.errors.length))process.exitCode=1;
