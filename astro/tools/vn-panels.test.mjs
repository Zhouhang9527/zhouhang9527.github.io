import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as options from '../src/domain/vn-options.ts';

test('DIALOG preferences are strict booleans; unknown or corrupt fields stay safe',()=>{
 const all={overwrite:true,load:true,qsave:true,qload:true,delete:true};
 for(const raw of [null,'','broken','false','[]','{"version":2,"delete":false}','{"version":1,"load":0,"delete":"false"}'])assert.deepEqual(options.parseConfirmations(raw),all);
 assert.deepEqual(options.parseConfirmations(JSON.stringify({version:1,overwrite:false,delete:false,unrelated:false})),{...all,overwrite:false,delete:false});
 for(const action of options.confirmActions){assert.equal(options.shouldConfirm(action,null),true);assert.equal(options.shouldConfirm(action,JSON.stringify({version:1,[action]:false})),false);}
 assert.equal(options.isConfirmAction('reset'),false);assert.equal(options.isConfirmAction('__proto__'),false);
 assert.notEqual(options.defaultConfirmations(),options.defaultConfirmations());
 assert.deepEqual(options.resetPages('dialog',false),['dialog']);assert.deepEqual(options.resetPages('touch',false),[]);
});

test('playback prefs validate numeric type, bounded integers and explicit effect steps',()=>{
 const defaults={textRevealMs:30,autoGapMs:700,autoScrollSpeed:45,skipSeenOnly:true,effectSpeed:1};
 for(const raw of [null,'broken','[]','{"version":2,"textRevealMs":0}'])assert.deepEqual(options.parsePlayback(raw),defaults);
 const invalid={version:1,textRevealMs:'0',autoGapMs:5001,autoScrollSpeed:9,skipSeenOnly:0,effectSpeed:1.1};assert.deepEqual(options.parsePlayback(JSON.stringify(invalid)),defaults);
 const custom={textRevealMs:0,autoGapMs:5000,autoScrollSpeed:180,skipSeenOnly:false,effectSpeed:.5};assert.deepEqual(options.parsePlayback(JSON.stringify({version:1,...custom})),custom);
 for(const key of ['textRevealMs','autoGapMs','autoScrollSpeed'])for(const v of [-1,Infinity,null,1.2])assert.equal(options.parsePlayback(JSON.stringify({version:1,[key]:v}))[key],defaults[key]);
 assert.notEqual(options.defaultPlayback(),options.defaultPlayback());
});

// The native-modal unit harness controls close timing to exercise delayed events
// and navigation races. It does not claim browser focus/inert verification.
function modalHarness(raw=null){
 class Element {isConnected=true;focusCount=0;closest(){return null;}getClientRects(){return [{}];}focus(){this.focusCount++;document.activeElement=this;}}
 class Button extends Element {}
 const document=new EventTarget();document.activeElement=new Element();const opener=document.activeElement;
 const yes=new Button(),no=new Button();
 class Dialog extends EventTarget {
  open=false;isConnected=true;returnValue='';message={textContent:''};
  showModal(){this.open=true;}
  close(value){this.returnValue=value??this.returnValue;this.open=false;queueMicrotask(()=>this.dispatchEvent(new Event('close')));}
  querySelector(selector){return selector.includes('message')?this.message:selector.includes('no')?no:yes;}
  querySelectorAll(){return [yes,no];}
  contains(node){return node===yes||node===no;}
 }
 const dialog=new Dialog();document.querySelector=selector=>selector.includes('[open]')&&!dialog.open?null:dialog;
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(new URL('../src/runtime/vn-confirm.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:()=>options,document,window:new EventTarget(),localStorage:{getItem:()=>raw},HTMLElement:Element,HTMLButtonElement:Button,Event,Promise});
 return {confirm:module.exports.confirmVN,document,dialog,opener,yes,no};
}
test('confirmation opens on NO, rejects concurrent decisions, restores opener on close',async()=>{
 const h=modalHarness(),pending=h.confirm('Overwrite?');assert.equal(h.dialog.message.textContent,'Overwrite?');assert.equal(h.document.activeElement,h.no);
 assert.equal(await h.confirm('Concurrent?'),false);h.dialog.close('yes');assert.equal(await pending,true);assert.equal(h.document.activeElement,h.opener);
});
test('navigation cancels before delayed close; a detached dialog never accepts',async()=>{
 const h=modalHarness(),pending=h.confirm('Delete?');h.document.dispatchEvent(new Event('astro:before-preparation'));assert.equal(await pending,false);assert.equal(h.opener.focusCount,0);
 const next=h.confirm('Again?');h.dialog.isConnected=false;h.dialog.close('yes');assert.equal(await next,false);
});
test('a queued old close event cannot cancel a same-tick reopened confirmation',async()=>{
 const h=modalHarness(),first=h.confirm('Old?');h.document.dispatchEvent(new Event('astro:before-preparation'));
 const next=h.confirm('New?');let settled=false;next.then(()=>settled=true);
 assert.equal(await first,false);await Promise.resolve();assert.equal(h.dialog.open,true);assert.equal(settled,false);
 h.dialog.close('yes');assert.equal(await next,true);
});
test('disabled action preference skips only that action, never unconditional reset',async()=>{
 const h=modalHarness('{"version":1,"qsave":false}');assert.equal(await h.confirm('Quick?','qsave'),true);assert.equal(h.dialog.open,false);
 const forced=h.confirm('Reset?');assert.equal(h.dialog.open,true);h.dialog.close('no');assert.equal(await forced,false);
});
