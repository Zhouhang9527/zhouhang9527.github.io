import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadMascotPack} from './local-mascot.mjs';
test('verified pack maps only local allowlisted files and rejects escapes',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ginka-mascot-'));
 try{
  fs.writeFileSync(path.join(dir,'base.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==','base64'));
  fs.writeFileSync(path.join(dir,'wide.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAC0lEQVR4nGNggAIAAAkAAftSuKkAAAAASUVORK5CYII=','base64'));
  fs.writeFileSync(path.join(dir,'broken.png'),'not an image');
  fs.writeFileSync(path.join(dir,'voice.ogg'),'fixture');
  const file=path.join(dir,'manifest.json'),pack={version:1,defaultPose:'a',poses:{a:{base:'base.png',source:'test pose',character:'child',phase:'main',outfit:'fixture',expression:'neutral',gesture:'idle'}},lines:[{id:'l',speaker:'test',text:'fixture',pose:'a',phase:'main',voice:'voice.ogg',source:'test script',voiceSource:'test audio',verified:true}]};
  fs.writeFileSync(file,JSON.stringify(pack));const result=loadMascotPack(file);assert.equal(result.files.size,2);assert.match(result.manifest.lines[0].voice,/asset-1\.ogg$/);
  assert.equal(result.manifest.poses.a.character,'child');
  assert.deepEqual(result.manifest.poses.a.canvas,{width:1,height:1});
  pack.poses.a.blink='wide.png';fs.writeFileSync(file,JSON.stringify(pack));assert.throws(()=>loadMascotPack(file),/Unaligned mascot canvas/);
  pack.poses.a.blink='base.png';pack.poses.a.motion=[{image:'wide.png',ms:120}];fs.writeFileSync(file,JSON.stringify(pack));assert.throws(()=>loadMascotPack(file),/Unaligned mascot canvas/);
  pack.poses.a.motion=[{image:'base.png',ms:120}];pack.poses.a.mouth='broken.png';fs.writeFileSync(file,JSON.stringify(pack));assert.throws(()=>loadMascotPack(file),/Invalid PNG\/WebP canvas/);
  pack.poses.a.mouth='base.png';fs.writeFileSync(file,JSON.stringify(pack));assert.equal(loadMascotPack(file).files.size,2);
  pack.poses.a.phase='afterstory';fs.writeFileSync(file,JSON.stringify(pack));assert.throws(()=>loadMascotPack(file));pack.poses.a.phase='main';
  pack.lines[0].verified=false;fs.writeFileSync(file,JSON.stringify(pack));assert.throws(()=>loadMascotPack(file));
  pack.lines[0].verified=true;pack.lines[0].voice='../voice.ogg';fs.writeFileSync(file,JSON.stringify(pack));assert.throws(()=>loadMascotPack(file));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('evidence-only manifest stays unavailable without exposing any files',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ginka-evidence-'));
 try{const file=path.join(dir,'manifest.json');fs.writeFileSync(file,JSON.stringify({version:1,available:false,status:'evidence_only',defaultPose:null,poses:{},lines:[],reason:'private evidence'}));
 const result=loadMascotPack(file);assert.equal(result.files.size,0);assert.deepEqual(result.manifest,{version:1,available:false,status:'evidence_only'});
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('v2 verifies sparse ordered layers, independent alternatives and silent dialogue',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ginka-layers-'));
 try{
  fs.writeFileSync(path.join(dir,'base.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAC0lEQVR4nGNggAIAAAkAAftSuKkAAAAASUVORK5CYII=','base64'));
  fs.writeFileSync(path.join(dir,'part.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==','base64'));
  const part={image:'part.png',x:1,y:0,blend:'over',source:'fixture part'},file=path.join(dir,'manifest.json');
  const pose={base:'base.png',source:'fixture pose',character:'adult',phase:'main',phaseSource:'fixture phase',outfit:'d1',expression:'f1',gesture:'p1',verified:true,layers:[{slot:'eye',...part,alternate:{...part,blend:'replace'}},{slot:'mouth',...part}]};
  const pack={version:2,defaultPose:'a',poses:{a:pose},lines:[{id:'l',speaker:'fixture',text:'fixture',pose:'a',phase:'main',phaseSource:'fixture phase',voice:null,source:'fixture script',verified:true}]};
  const load=()=>{fs.writeFileSync(file,JSON.stringify(pack));return loadMascotPack(file);};
  const result=load();assert.equal(result.manifest.version,2);assert.equal(result.manifest.lines[0].voice,null);assert.deepEqual(result.manifest.poses.a.layers.map(x=>x.slot),['eye','mouth']);
  pose.layers[0].x=2;assert.throws(load,/Layer outside/);pose.layers[0].x=1;
  pose.layers[0].alternate.source='';assert.throws(load,/Invalid layer evidence/);pose.layers[0].alternate.source='fixture part';
  pose.verified=false;assert.throws(load,/Unverified layered pose/);pose.verified=true;
  pack.lines[0].verified=false;assert.throws(load,/Unverified or invalid dialogue/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
