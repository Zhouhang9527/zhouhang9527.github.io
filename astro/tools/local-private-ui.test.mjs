import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import manifest from '../config/vn-scenes.json' with {type:'json'};
import {decodePNG} from './png-atlas.mjs';
import {createSyntheticUI} from './synthetic-ui-fixture.mjs';
import {localVNUI} from './local-vn-ui.mjs';
import {localTitleArt} from './local-title-art.mjs';
function install(plugin){let middleware;assert.equal(plugin.apply,'serve');plugin.configureServer({middlewares:{use(fn){middleware=fn;}}});return middleware;}
function request(middleware,url,headers={},method='GET'){const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=body;}};middleware({url,method,headers:{host:'127.0.0.1:4321',...headers},socket:{remoteAddress:'127.0.0.1'}},res,()=>{res.next=true;});return res;}
test('all configured UI atlases compose and only fixed private routes respond',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ginka-private-ui-'));
 const keys=['GINKA_TITLE_DATA','GINKA_VN_UI_DATA','GINKA_MAP_DATA'],previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  Object.assign(process.env,createSyntheticUI(root));
  const ui=install(localVNUI()),title=install(localTitleArt());
  for(const [atlas,sprites] of Object.entries(manifest.privateUI.logicalSprites))for(const [name,sprite] of Object.entries(sprites)){
   const res=request(ui,'/__ginka_local_ui__/'+atlas+'-'+name+'.png');
   assert.equal(res.statusCode,200,atlas+' '+name);
   assert.deepEqual([res.body.readUInt32BE(16),res.body.readUInt32BE(20)],sprite.size,atlas+' '+name);
  }
  const text=request(ui,'/__ginka_local_ui__/textLabels-wordmark.png');const image=decodePNG(text.body);assert.deepEqual([image.width,image.height],[344,75]);
  assert.equal(request(title,'/__ginka_local_title__/data-004.png').statusCode,200);
  assert.equal(request(ui,'/__ginka_local_ui__/map-day.png',{range:'bytes=0-7'}).body.toString('hex'),'89504e470d0a1a0a');
  assert.equal(request(title,'/__ginka_local_title__/data-004.png',{host:'evil.test'}).statusCode,403);
  assert.equal(request(ui,'/__ginka_local_ui__/../config.json').statusCode,404);
  assert.equal(request(ui,'/__ginka_local_ui__/not-listed.png').statusCode,404);
  assert.equal(request(ui,'/archives/').next,true);
 }finally{for(const k of keys){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}fs.rmSync(root,{recursive:true,force:true});}
});
