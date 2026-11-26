import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readFont,listFonts,localFont} from './local-font.mjs';

// Minimal SFNT name table fixture, not a renderable font or original game data.
function fixture(){
 const name=Buffer.from('Fixture UI','utf16le').swap16();
 const b=Buffer.alloc(46+name.length);
 b.write('OTTO',0);b.writeUInt16BE(1,4);
 b.write('name',12);b.writeUInt32BE(28,20);b.writeUInt32BE(18+name.length,24);
 b.writeUInt16BE(1,30);b.writeUInt16BE(18,32);
 b.writeUInt16BE(3,34);b.writeUInt16BE(1,36);b.writeUInt16BE(0x409,38);
 b.writeUInt16BE(1,40);b.writeUInt16BE(name.length,42);name.copy(b,46);
 return b;
}
function weightedFixture(weight){
 const nameTable=fixture().subarray(28),b=Buffer.alloc(50+nameTable.length);
 b.write('OTTO',0);b.writeUInt16BE(2,4);
 b.write('OS/2',12);b.writeUInt32BE(44,20);b.writeUInt32BE(6,24);b.writeUInt16BE(weight,48);
 b.write('name',28);b.writeUInt32BE(50,36);b.writeUInt32BE(nameTable.length,40);nameTable.copy(b,50);
 return b;
}
test('configured font weight comes from the original SFNT metadata, not a hardcoded Regular alias',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ginka-font-weight-')),previous=process.env.GINKA_UI_FONT;
 try{
  const file=path.join(root,'bold.otf');fs.writeFileSync(file,weightedFixture(700));
  assert.equal(readFont(file).weight,700);assert.equal(listFonts(root)[0].weight,700);
  process.env.GINKA_UI_FONT=file;let middleware;
  localFont().configureServer({middlewares:{use:fn=>middleware=fn}});
  const res={setHeader(){},end(body){this.body=body;}};
  middleware({url:'/__ginka_local_font__/ui.css',method:'GET',headers:{host:'127.0.0.1:4321'},socket:{remoteAddress:'127.0.0.1'}},res,()=>assert.fail('Expected font CSS'));
  assert.match(res.body.toString(),/font-weight:700/);assert.match(res.body.toString(),/\.vn-game-reader/);assert.match(res.body.toString(),/font-family:inherit/);
  fs.writeFileSync(file,weightedFixture(0));assert.throws(()=>readFont(file),/Invalid OS\/2 font weight/);
 }finally{if(previous===undefined)delete process.env.GINKA_UI_FONT;else process.env.GINKA_UI_FONT=previous;fs.rmSync(root,{recursive:true,force:true});}
});
test('inspect and serve only the configured private font',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ginka-font-'));
 const previous=process.env.GINKA_UI_FONT;
 try{
  const file=path.join(root,'fixture.otf');
  const bytes=fixture();
  fs.writeFileSync(file,bytes);
  fs.writeFileSync(path.join(root,'broken.ttf'),'invalid');
  assert.deepEqual(readFont(file).names,{'1':['Fixture UI']});
  assert.equal(readFont(file).format,'opentype');
  assert.equal(listFonts(root).length,2);
  assert.throws(()=>readFont(path.join(root,'broken.ttf')));
  process.env.GINKA_UI_FONT=file;
  let middleware;
  const plugin=localFont();
  assert.equal(plugin.apply,'serve');
  plugin.configureServer({middlewares:{use:fn=>{middleware=fn;}}});
  function request(url,method='GET',remoteAddress='127.0.0.1'){
   const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=body;}};
   middleware({url,method,headers:{host:'127.0.0.1:4321'},socket:{remoteAddress}},res,()=>{res.next=true;});
   return res;
  }
  const css=request('/__ginka_local_font__/ui.css');
  assert.equal(css.statusCode,200);assert.match(css.body.toString(),/Ginka Local UI/);
  const font=request('/__ginka_local_font__/ui.otf');
  assert.deepEqual(font.body,bytes);
  assert.equal(font.headers['Cache-Control'],'no-store');
  assert.equal(request('/__ginka_local_font__/ui.otf','HEAD').body,undefined);
  assert.equal(request('/__ginka_local_font__/ui.otf','GET','192.168.1.1').statusCode,403);
  assert.equal(request('/__ginka_local_font__/ui.otf','POST').statusCode,403);
  assert.equal(request('/__ginka_local_font__/other.otf').statusCode,404);
  assert.equal(request('/archives/').next,true);
  delete process.env.GINKA_UI_FONT;
  let installed=false;
  localFont().configureServer({middlewares:{use(){installed=true;}}});
  assert.equal(installed,false);
 }finally{
  if(previous===undefined)delete process.env.GINKA_UI_FONT;else process.env.GINKA_UI_FONT=previous;
  fs.rmSync(root,{recursive:true,force:true});
 }
});
