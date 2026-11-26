import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadMascotPack,localMascot,projectSceneAction,projectTranslations} from './local-mascot.mjs';
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
  const json=JSON.stringify(result.manifest);assert.ok(!/source|voiceSource|nameHash|nativeStorage|_hxv4_hash/.test(json),'runtime projection must not expose provenance');
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
  pose.baseRect={x:1,y:1,width:2,height:1};pose.canvas={width:3,height:3};assert.deepEqual(load().manifest.poses.a.baseOffset,{x:1,y:1});assert.deepEqual(load().manifest.poses.a.canvas,{width:3,height:3});pose.baseRect.width=3;assert.throws(load,/Invalid sparse base rectangle/);delete pose.baseRect;delete pose.canvas;
  pose.layers[0].width=2;pose.layers[0].height=1;assert.throws(load,/Original layer size mismatch/);delete pose.layers[0].width;delete pose.layers[0].height;
  pose.layers[0].x=2;assert.throws(load,/Layer outside/);pose.layers[0].x=1;
  pose.layers[0].alternate.source='';assert.throws(load,/Invalid layer evidence/);pose.layers[0].alternate.source='fixture part';
  pose.phaseVerified=false;assert.throws(load,/Unverified layered pose/);delete pose.phaseVerified;
  pack.lines[0].phaseVerified=false;assert.throws(load,/Invalid unlock phase/);delete pack.lines[0].phaseVerified;
  pose.source='_hxv4_hash/private nativeStorage nameHash';pack.lines[0].source=pose.source;pack.lines[0].voiceSource=pose.source;const projected=JSON.stringify(load().manifest);assert.doesNotMatch(projected,/source|Source|_hxv4_hash|nativeStorage|nameHash/);
  pose.verified=false;assert.throws(load,/Unverified layered pose/);pose.verified=true;
  pack.lines[0].verified=false;assert.throws(load,/Unverified or invalid dialogue/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('private mascot HTTP uses the common origin and range policy',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ginka-mascot-http-')),previous=process.env.GINKA_MASCOT_MANIFEST;
 try{
  const file=path.join(dir,'manifest.json');fs.writeFileSync(file,JSON.stringify({version:1,available:false,status:'evidence_only',defaultPose:null,poses:{},lines:[]}));
  process.env.GINKA_MASCOT_MANIFEST=file;let middleware;localMascot().configureServer({middlewares:{use(fn){middleware=fn;}}});
  const request=(headers={},method='GET',url='/__ginka_local_mascot__/manifest.json')=>{const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(body){this.body=body;}};middleware({url,method,headers:{host:'127.0.0.1:4321',...headers},socket:{remoteAddress:'127.0.0.1'}},res,()=>{res.next=true;});return res;};
  assert.equal(request().statusCode,200);assert.equal(request().headers['X-Content-Type-Options'],'nosniff');
  assert.equal(request({host:'evil.test'}).statusCode,403);assert.equal(request({origin:'http://evil.test'}).statusCode,403);assert.equal(request({'sec-fetch-site':'cross-site'}).statusCode,403);
  assert.equal(request({range:'bytes=-1'}).body.toString(),'}');assert.equal(request({range:'bytes=999-'}).statusCode,416);
  assert.equal(request({},'HEAD').body,undefined);assert.equal(request({},'POST').statusCode,403);assert.equal(request({},'GET','/__ginka_local_mascot__/../manifest.json').statusCode,404);
 }finally{if(previous===undefined)delete process.env.GINKA_MASCOT_MANIFEST;else process.env.GINKA_MASCOT_MANIFEST=previous;fs.rmSync(dir,{recursive:true,force:true});}
});


test('numeric scene projection binds the exact record, strips provenance, and rejects unsupported input',()=>{
 const source='fixture _hxv4_hash/source#record',canvas={width:6,height:6};
 const raw={verified:true,source,initial:{objects:{actor:{properties:{xpos:0}}},camera:{properties:{}}},actions:[['envupdate','update',[{name:'actor',action:[['xpos',[{handler:'MoveAction',value:2,time:400}]]]}]]],projection:{verified:true,source:'private calibration nameHash nativeStorage',stage:{width:12,height:12},resolution:100,rightHanded:false,camera:{cameraoffsetz:-100,cameraoffsetzmax:100,camerarh:0},properties:{xpos:0}}};
 const safe=projectSceneAction(raw,source,canvas);assert.equal(safe.actions.length,1);assert.doesNotMatch(JSON.stringify(safe),/source|Source|_hxv4_hash|nativeStorage|nameHash/);
 assert.throws(()=>projectSceneAction(raw,'another record',canvas),/binding/);
 const change=fn=>{const v=structuredClone(raw);fn(v);return ()=>projectSceneAction(v,source,canvas);};
 assert.throws(change(v=>v.projection.verified=false),/projection/);
 assert.throws(change(v=>v.initial.objects.nameHash=v.initial.objects.actor),/canonical actor/);
 assert.throws(change(v=>v.projection.stage.nameHash=123),/stage/);
 assert.throws(change(v=>v.projection.camera.nativeStorage=1),/Unsupported camera property/);
 assert.throws(change(v=>v.actions[0][2][0].action[0][1][0].handler='eval'),/Unsupported scene action/);
 assert.throws(change(v=>v.actions[0][2][0].name='sourceBlob'),/Unsupported scene action/);
 assert.throws(change(v=>v.initial.objects.actor.properties.xpos=Infinity));
 raw.actions.push(['wait','time',250],['envupdate','update',[{name:'actor',action:[['xpos',[{handler:'MoveAction',value:'@+1',time:400}]]]}]]);
 assert.deepEqual(projectSceneAction(raw,source,canvas).actions,raw.actions,'projection preserves consecutive commands and explicit waits without advancing a synthetic per-command clock');
 raw.actions=[];assert.equal(projectSceneAction(raw,source,canvas).actions.length,0,'static verified snapshot is not fabricated motion');
 const overlay={verified:true,source:'private overlay sourceBlob',image:'private.png',canvas:{width:1,height:1},origin:{x:0,y:0},resolution:100,properties:{xpos:0,ypos:0,order:3},linkmode:0,linkmask:0,rightHanded:true};
 raw.overlays=[overlay];const register=(path,canvas)=>{assert.equal(path,'private.png');assert.deepEqual(canvas,{width:1,height:1});return '/__ginka_local_mascot__/asset-99.png';};
 const projected=projectSceneAction(raw,source,canvas,register);assert.equal(projected.overlays[0].image,'/__ginka_local_mascot__/asset-99.png');assert.doesNotMatch(JSON.stringify(projected),/source|Source|_hxv4_hash|nativeStorage|nameHash|private/);
 overlay.linkmode=1;assert.throws(()=>projectSceneAction(raw,source,canvas,register),/Unsupported linked overlay/);overlay.linkmode=0;
 overlay.rightHanded=undefined;assert.throws(()=>projectSceneAction(raw,source,canvas,register),/calibration/);overlay.rightHanded=true;
 overlay.verified=false;assert.throws(()=>projectSceneAction(raw,source,canvas,register),/Unverified linked overlay/);
 assert.equal(projectSceneAction(undefined,source,canvas),null);
});


test('optional exact subtitles preserve null speakers and never project evidence or invent missing languages',()=>{
 assert.equal(projectTranslations(undefined),null);
 const original={'zh-CN':{speaker:'测试',text:'原文'},ja:{speaker:'検証',text:'　日本語 fixture　',source:'private _hxv4_hash/nameHash'},en:{speaker:null,text:'English fixture'}};
 const out=projectTranslations(original);assert.deepEqual(out,{'zh-CN':{speaker:'测试',text:'原文'},ja:{speaker:'検証',text:'　日本語 fixture　'},en:{speaker:null,text:'English fixture'}});
 assert.doesNotMatch(JSON.stringify(out),/source|_hxv4_hash|nameHash/);assert.deepEqual(projectTranslations({ja:original.ja}),{ja:out.ja},'missing variants remain missing, not translated or borrowed');
 assert.throws(()=>projectTranslations({fr:{speaker:null,text:'unknown'}}),/languages/);
 assert.throws(()=>projectTranslations({ja:{text:'no speaker field'}}),/subtitle/);
 assert.throws(()=>projectTranslations({ja:{speaker:null,text:''}}),/subtitle/);
 assert.throws(()=>projectTranslations({ja:{speaker:123,text:'invalid speaker'}}),/subtitle/);
 assert.throws(()=>projectTranslations({ja:{speaker:null,text:'x'.repeat(601)}}),/subtitle/);
 assert.equal(original.ja.source,'private _hxv4_hash/nameHash','projection must not mutate source variants');
});
