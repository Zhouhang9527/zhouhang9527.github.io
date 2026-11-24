'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
// Representative upstream class structure from Comment.tsx, Reply.tsx, CommentBox.tsx.
// This fixture tests the committed CSS, not the live Discussions network or authentication.
const fixture = '<main><div class="gsc-comments"><div class="gsc-comment"><div class="color-bg-primary w-full min-w-0 rounded-md border"><div class="gsc-comment-header"><div class="gsc-comment-author"><a class="gsc-comment-author-avatar" href="#author"><img alt="Sample avatar" width="30" height="30"><span class="link-primary">sample-user</span></a><a class="link-secondary" href="#time"><time>2 days ago</time></a></div></div><div class="markdown gsc-comment-content"><p>Sample comment, <a href="#link">link</a></p><pre><code>const a = 1;</code></pre></div><div class="gsc-comment-footer"><button type="button">Reaction</button><span>1 reply</span></div><div class="gsc-replies"><div class="gsc-reply"><div class="gsc-tl-line"></div><div style="display:flex"><div class="gsc-reply-author-avatar"><a href="#reply-author"><img width="30" height="30" alt="Reply avatar"></a></div><div style="width:100%;min-width:0;margin-left:8px"><div class="gsc-reply-header"><div class="gsc-reply-author"><a href="#reply-author"><span class="link-primary">sample-reply</span></a><a class="link-secondary" href="#reply-time"><time>Today</time></a></div></div><div class="markdown gsc-reply-content">Sample reply</div><div class="gsc-reply-footer"><button>Reaction</button></div></div></div></div></div><div class="gsc-reply-box"><button>Write a reply</button></div></div></div><div class="gsc-comment"><div class="color-bg-primary w-full min-w-0 rounded-md border"><div class="gsc-comment-header"><div class="gsc-comment-author"><a class="gsc-comment-author-avatar" href="#other"><img width="30" height="30" alt="Avatar"><span class="link-primary">second-user</span></a><a class="link-secondary" href="#date"><time>Today</time></a></div></div><div class="markdown gsc-comment-content">Second comment in the transcript</div></div></div></div><form class="gsc-comment-box"><div class="gsc-comment-box-tabs"><div><button class="color-bg-canvas" type="button">Write</button><button type="button">Preview</button></div><div class="gsc-comment-box-md-toolbar"><button class="gsc-toolbar-item" type="button" title="Fixed width">T</button></div></div><div class="gsc-comment-box-main"><div class="gsc-comment-box-write"><textarea class="gsc-comment-box-textarea" aria-label="Comment" placeholder="Write a comment"></textarea><div class="gsc-comment-box-textarea-extras"><a class="gsc-comment-box-markdown-hint" href="#markdown">Markdown</a></div></div><div class="markdown gsc-comment-box-preview" hidden>Preview</div></div><div class="gsc-comment-box-bottom"><button type="button">Sign out</button><div class="gsc-comment-box-buttons"><button class="btn btn-primary" type="submit" disabled>Comment</button><a class="btn btn-primary" href="#login">Sign in with GitHub</a></div></div></form><div class="gsc-loading-image"></div></main>';
const baseCSS = '*{box-sizing:border-box}main{font:14px system-ui,sans-serif;color:var(--color-fg-default);background:var(--color-canvas-default)}.gsc-comments{display:flex;flex-direction:column}.gsc-comment{display:flex}.gsc-comment>div{width:100%;border:1px solid var(--color-border-default)}.gsc-comment-header,.gsc-comment-author,.gsc-comment-author-avatar,.gsc-reply-author,.gsc-comment-footer{display:flex;align-items:center;gap:8px}.gsc-comment-footer{justify-content:space-between}.gsc-reply{position:relative}.gsc-reply-author>a:first-child{display:flex;align-items:center}.gsc-comment-box-textarea{width:100%;min-height:100px}';
(async()=>{
 const browser=await chromium.launch(process.env.GINKA_CHROME_PATH?{executablePath:process.env.GINKA_CHROME_PATH}:{channel:'chrome'});
 try {
  for(const width of [320,768]) for(const mode of ['day','moonlit']){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   const css=fs.readFileSync(path.join(__dirname,'../../source/css/giscus-'+mode+'.css'),'utf8');
   await page.setContent('<style>'+baseCSS+'</style><style>'+css+'</style>'+fixture);
   const x=await page.evaluate(()=>{
    const card=document.querySelector('.gsc-comment>div');
    const name=document.querySelector('.gsc-comment-author .link-primary');
    const reply=document.querySelector('.gsc-reply-content');
    const editor=document.querySelector('.gsc-comment-box-textarea');
    return {gradient:getComputedStyle(card).backgroundImage,
     backlog:getComputedStyle(document.querySelector('.gsc-comments')).backgroundColor,
     backlogLabel:getComputedStyle(document.querySelector('.gsc-comments'),'::before').content,
     entries:document.querySelectorAll('.gsc-comment').length,
     motif:getComputedStyle(document.querySelector('.gsc-comment-author-avatar'),'::before').backgroundImage,
     line:getComputedStyle(document.querySelector('.gsc-comment-header'),'::after').backgroundImage,
     name:getComputedStyle(name).color,reply:getComputedStyle(reply).color,
     editor:getComputedStyle(editor).backgroundColor,
     editorColor:getComputedStyle(editor).color,
     editorGradient:getComputedStyle(editor.closest('form')).backgroundImage,
     toolbar:getComputedStyle(document.querySelector('.gsc-comment-box-tabs'),'::after').backgroundImage,
     editorMotif:getComputedStyle(document.querySelector('.gsc-comment-box-tabs > div:first-child'),'::before').backgroundImage,
     disabled:getComputedStyle(document.querySelector('.gsc-comment-box button:disabled')).cursor,
     loading:getComputedStyle(document.querySelector('.gsc-loading-image')).borderRadius,
     overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert.equal(x.gradient,'none');
   assert.equal(x.backlog,'rgb(21, 32, 44)');
   assert.ok(x.backlogLabel.includes('BACKLOG')&&x.entries===2&&x.motif.includes('data:image/png')&&x.line.includes('linear-gradient'),JSON.stringify(x));
   assert.equal(x.name,'rgb(240, 243, 247)');
   assert.equal(x.reply,'rgb(240, 243, 247)');
   assert.equal(x.editor,'rgba(0, 0, 0, 0)');
   assert.equal(x.editorColor,'rgb(240, 243, 247)');
   assert.ok(x.editorGradient.includes('linear-gradient')&&x.toolbar.includes('linear-gradient')&&x.editorMotif.includes('data:image/png'),JSON.stringify(x));
   assert.equal(x.disabled,'not-allowed');
   assert.ok(await page.locator('.gsc-comment-box button:disabled').isDisabled());
   assert.equal(x.loading,'50%');
   assert.ok(!x.overflow,JSON.stringify(x));
   await page.locator('textarea').fill('preserve this input');
   assert.equal(await page.locator('textarea').inputValue(),'preserve this input');
   const dir=process.env.GINKA_SHOTS_DIR||'artifacts/visual-review';
   fs.mkdirSync(dir,{recursive:true});
   await page.screenshot({path:path.join(dir,'giscus-fixture-'+width+'-'+mode+'.png')});
   console.log('PASS Giscus dialogue CSS fixture',width,mode);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
