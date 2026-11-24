'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.GINKA_TEST_BASE_URL || 'http://127.0.0.1:4004';
const dir = path.resolve('artifacts/comment-live');
(async()=>{
 const browser=await chromium.launch(process.env.GINKA_CHROME_PATH?{executablePath:process.env.GINKA_CHROME_PATH}:{channel:'chrome'});
 await fs.mkdir(dir,{recursive:true});
 const result=[];
 try {
  const probe=await browser.newPage();
  await probe.goto(base,{waitUntil:'domcontentloaded'});
  const href=await probe.locator('.journal-entry h3 a, .post-title-link').first().getAttribute('href');
  await probe.close();
  // Parallel isolated pages keep the review short. Never post a real comment.
  await Promise.all([390,768,1440,1920].flatMap(width=>['day','moonlit'].map(async mode=>{
   const page=await browser.newPage({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});
   const rec={width,mode};
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   try {
    await page.addInitScript(m=>localStorage.setItem('ginka-theme',m),mode);
    await page.goto(new URL(href,base).href,{waitUntil:'domcontentloaded',timeout:25000});
    await page.waitForFunction(()=>window.GINKA_THEME);
    const scene=page.locator('.journal-dialogue');
    await scene.scrollIntoViewIfNeeded();
    rec.layout=await scene.evaluate(el=>{
     const a=el.getBoundingClientRect(),b=document.querySelector('.post-body').getBoundingClientRect();
     return {leftDelta:Math.abs(a.left-b.left),rightDelta:Math.abs(a.right-b.right),overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    rec.introCount=await page.locator('.journal-dialogue-frame,.journal-dialogue-intro').count();
    const frame=page.locator('iframe.giscus-frame');
    await frame.waitFor({timeout:15000});
    rec.src=await frame.getAttribute('src');
    const editor=page.frameLocator('iframe.giscus-frame').locator('.gsc-comment-box').first();
    await editor.waitFor({state:'visible',timeout:20000});
    rec.editor=await editor.evaluate(el=>({gradient:getComputedStyle(el).backgroundImage,toolbar:getComputedStyle(el.querySelector('.gsc-comment-box-tabs'),'::after').backgroundImage,textarea:el.querySelector('textarea')&&getComputedStyle(el.querySelector('textarea')).backgroundColor,comments:document.querySelectorAll('.gsc-comment').length}));
    rec.custom=rec.editor.gradient.includes('linear-gradient')&&rec.editor.toolbar.includes('linear-gradient');
    await editor.scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(dir,width+'-'+mode+'-editor.png')});
    await frame.screenshot({path:path.join(dir,width+'-'+mode+'-iframe.png')});
   } catch(error){
    rec.error=error.message;
    rec.frameText=await page.frameLocator('iframe.giscus-frame').locator('body').innerText({timeout:2000}).catch(()=>null);
    await page.screenshot({path:path.join(dir,width+'-'+mode+'-blocked.png')}).catch(()=>{});
   } finally {rec.pageErrors=errors;result.push(rec);await page.close();}
  })));
 }finally{await browser.close();await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(result,null,2));}
 if(result.some(r=>r.introCount!==0||!r.custom||r.layout?.overflow||r.layout?.leftDelta>=4||r.layout?.rightDelta>=4)){console.error(JSON.stringify(result,null,2));process.exitCode=1;}
})().catch(error=>{console.error(error);process.exit(1)});
