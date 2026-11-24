import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadMascotPack} from './local-mascot.mjs';
test('verified pack maps only local allowlisted files and rejects escapes',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ginka-mascot-'));
 try{
  fs.writeFileSync(path.join(dir,'base.png'),'fixture');
  fs.writeFileSync(path.join(dir,'voice.ogg'),'fixture');
  const file=path.join(dir,'manifest.json'),pack={version:1,defaultPose:'a',poses:{a:{base:'base.png',source:'test pose',character:'child',phase:'main',outfit:'fixture',expression:'neutral',gesture:'idle'}},lines:[{id:'l',speaker:'test',text:'fixture',pose:'a',phase:'main',voice:'voice.ogg',source:'test script',voiceSource:'test audio',verified:true}]};
  fs.writeFileSync(file,JSON.stringify(pack));const result=loadMascotPack(file);assert.equal(result.files.size,2);assert.match(result.manifest.lines[0].voice,/asset-1\.ogg$/);
  assert.equal(result.manifest.poses.a.character,'child');
  pack.poses.a.phase='afterstory';fs.writeFileSync(file,JSON.stringify(pack));assert.throws(()=>loadMascotPack(file));pack.poses.a.phase='main';
  pack.lines[0].verified=false;fs.writeFileSync(file,JSON.stringify(pack));assert.throws(()=>loadMascotPack(file));
  pack.lines[0].verified=true;pack.lines[0].voice='../voice.ogg';fs.writeFileSync(file,JSON.stringify(pack));assert.throws(()=>loadMascotPack(file));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
