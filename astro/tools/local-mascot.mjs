import fs from 'node:fs';
import path from 'node:path';
const prefix='/__ginka_local_mascot__/';
const idPattern=/^[a-zA-Z0-9_-]{1,80}$/;
const mime={'.png':'image/png','.webp':'image/webp','.ogg':'audio/ogg','.wav':'audio/wav','.mp3':'audio/mpeg','.m4a':'audio/mp4'};
// Read canvas geometry only, not a substitute for actual browser decode/visual review.
export function imageCanvas(file){
 const h=Buffer.alloc(32);const fd=fs.openSync(file,'r');let n;
 try{n=fs.readSync(fd,h,0,h.length,0);}finally{fs.closeSync(fd);}
 let width=0,height=0;
 if(n>=24&&h.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&h.readUInt32BE(8)===13&&h.toString('ascii',12,16)==='IHDR'){
  width=h.readUInt32BE(16);height=h.readUInt32BE(20);
 }else if(n>=25&&h.toString('ascii',0,4)==='RIFF'&&h.toString('ascii',8,12)==='WEBP'){
  const chunk=h.toString('ascii',12,16);
  if(chunk==='VP8X'&&n>=30){width=1+h.readUIntLE(24,3);height=1+h.readUIntLE(27,3);}
  else if(chunk==='VP8L'&&h[20]===0x2f){const bits=h.readUInt32LE(21);width=1+(bits&0x3fff);height=1+((bits>>>14)&0x3fff);}
  else if(chunk==='VP8 '&&n>=30&&h[23]===0x9d&&h[24]===1&&h[25]===0x2a){width=h.readUInt16LE(26)&0x3fff;height=h.readUInt16LE(28)&0x3fff;}
 }
 if(!width||!height)throw Error('Invalid PNG/WebP canvas: '+path.basename(file));
 return {width,height};
}
export function loadMascotPack(input){
 const manifest=fs.realpathSync(input),root=path.dirname(manifest),raw=JSON.parse(fs.readFileSync(manifest,'utf8'));
 if(raw.version!==1||!raw.poses||!Array.isArray(raw.lines)||!raw.lines.length||raw.lines.length>500||typeof raw.defaultPose!=='string'||!idPattern.test(raw.defaultPose))throw Error('Invalid mascot pack');
 const files=new Map(),poses=Object.create(null),lines=[],ids=new Set(),registered=new Map();
 function register(relative,kind){
  if(typeof relative!=='string'||path.isAbsolute(relative)||relative.includes('\\')||relative.split('/').some(s=>!s||s==='..'||s==='.'))throw Error('Invalid mascot asset path');
  const file=fs.realpathSync(path.join(root,relative)),rel=path.relative(root,file);
  if(rel.startsWith('..'+path.sep)||rel==='..'||path.isAbsolute(rel)||!fs.statSync(file).isFile())throw Error('Asset outside mascot pack');
  const ext=path.extname(file).toLowerCase(),type=mime[ext];
  if(!type||!type.startsWith(kind+'/'))throw Error('Unsupported mascot asset '+relative);
  if(registered.has(file))return registered.get(file);
  const size=fs.statSync(file).size;if(!size)throw Error('Empty asset');const canvas=kind==='image'?imageCanvas(file):null;const key='asset-'+files.size+ext;files.set(key,{file,type,size,canvas});registered.set(file,prefix+key);return prefix+key;
 }
 for(const [id,pose] of Object.entries(raw.poses)){
  if(!idPattern.test(id)||!pose||typeof pose.source!=='string'||!pose.source.trim())throw Error('Invalid pose evidence');
  if(!['child','adult'].includes(pose.character)||!['main','afterstory'].includes(pose.phase)||!['outfit','expression','gesture'].every(k=>typeof pose[k]==='string'&&pose[k].trim()&&pose[k].length<=80))throw Error('Missing character/wardrobe/expression/gesture metadata: '+id);
  const base=register(pose.base,'image');
  const motion=pose.motion??[];
  if(!Array.isArray(motion)||motion.length>120)throw Error('Invalid pose motion');
  const frames=motion.map(frame=>{if(!frame||!Number.isInteger(frame.ms)||frame.ms<40||frame.ms>10000)throw Error('Invalid frame timing');return {image:register(frame.image,'image'),ms:frame.ms};});
  const blink=pose.blink?register(pose.blink,'image'):null,mouth=pose.mouth?register(pose.mouth,'image'):null;
  const canvas=files.get(base.slice(prefix.length)).canvas;
  for(const url of [blink,mouth,...frames.map(f=>f.image)]){
   if(!url)continue;const other=files.get(url.slice(prefix.length)).canvas;
   if(other.width!==canvas.width||other.height!==canvas.height)throw Error('Unaligned mascot canvas: '+id);
  }
  poses[id]={character:pose.character,phase:pose.phase,outfit:pose.outfit,expression:pose.expression,gesture:pose.gesture,base,blink,mouth,motion:frames,source:pose.source,canvas};
 }
 if(!Object.hasOwn(poses,raw.defaultPose)||poses[raw.defaultPose].phase!=='main')throw Error('Unknown default pose');
 for(const line of raw.lines){
  if(!line||typeof line.id!=='string'||!idPattern.test(line.id)||ids.has(line.id)||typeof line.text!=='string'||!line.text.trim()||line.text.length>600||typeof line.speaker!=='string'||!line.speaker.trim()||!Object.hasOwn(poses,line.pose)||typeof line.source!=='string'||!line.source.trim()||typeof line.voiceSource!=='string'||!line.voiceSource.trim()||line.verified!==true)throw Error('Unverified or invalid dialogue entry');
  if(!['main','afterstory'].includes(line.phase)||(line.phase==='main'&&poses[line.pose].phase==='afterstory'))throw Error('Invalid unlock phase');
  ids.add(line.id);lines.push({id:line.id,speaker:line.speaker,text:line.text,pose:line.pose,phase:line.phase,voice:register(line.voice,'audio'),source:line.source,voiceSource:line.voiceSource});
 }
 return {files,manifest:{version:1,defaultPose:raw.defaultPose,poses,lines}};
}
export function localMascot(){
 return {name:'ginka-private-mascot',apply:'serve',configureServer(server){
  const input=process.env.GINKA_MASCOT_MANIFEST;if(!input)return;
  const pack=loadMascotPack(input);
  server.middlewares.use((req,res,next)=>{
   const url=(req.url||'').split('?')[0];if(!url.startsWith(prefix))return next();
   if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||!['GET','HEAD'].includes(req.method)){res.statusCode=403;res.end();return;}
   res.setHeader('Cache-Control','no-store');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
   const key=url.slice(prefix.length);
   if(key==='manifest.json'){const body=JSON.stringify(pack.manifest);res.setHeader('Content-Type','application/json; charset=utf-8');res.end(req.method==='HEAD'?undefined:body);return;}
   const asset=pack.files.get(key);if(!asset){res.statusCode=404;res.end();return;}
   let start=0,end=asset.size-1;
   if(req.headers.range){const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!m||Number(m[1])>end||(m[2]&&Number(m[2])<Number(m[1]))){res.statusCode=416;res.setHeader('Content-Range','bytes */'+asset.size);res.end();return;}start=Number(m[1]);end=m[2]?Math.min(end,Number(m[2])):end;res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${asset.size}`);}
   res.setHeader('Content-Type',asset.type);res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Length',end-start+1);
   if(req.method==='HEAD')res.end();else{const stream=fs.createReadStream(asset.file,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);}
  });
 }};
}
