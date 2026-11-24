import fs from 'node:fs';
import path from 'node:path';
const prefix='/__ginka_local_mascot__/';
const idPattern=/^[a-zA-Z0-9_-]{1,80}$/;
const mime={'.png':'image/png','.webp':'image/webp','.ogg':'audio/ogg','.wav':'audio/wav','.mp3':'audio/mpeg','.m4a':'audio/mp4'};
export function loadMascotPack(input){
 const manifest=fs.realpathSync(input),root=path.dirname(manifest),raw=JSON.parse(fs.readFileSync(manifest,'utf8'));
 if(raw.version!==1||!raw.poses||!Array.isArray(raw.lines)||!raw.lines.length||raw.lines.length>500||!idPattern.test(raw.defaultPose))throw Error('Invalid mascot pack');
 const files=new Map(),poses=Object.create(null),lines=[],ids=new Set(),registered=new Map();
 function register(relative,kind){
  if(typeof relative!=='string'||path.isAbsolute(relative)||relative.includes('\\')||relative.split('/').some(s=>!s||s==='..'||s==='.'))throw Error('Invalid mascot asset path');
  const file=fs.realpathSync(path.join(root,relative)),rel=path.relative(root,file);
  if(rel.startsWith('..'+path.sep)||rel==='..'||path.isAbsolute(rel)||!fs.statSync(file).isFile())throw Error('Asset outside mascot pack');
  const ext=path.extname(file).toLowerCase(),type=mime[ext];
  if(!type||!type.startsWith(kind+'/'))throw Error('Unsupported mascot asset '+relative);
  if(registered.has(file))return registered.get(file);
  const size=fs.statSync(file).size;if(!size)throw Error('Empty asset');const key='asset-'+files.size+ext;files.set(key,{file,type,size});registered.set(file,prefix+key);return prefix+key;
 }
 for(const [id,pose] of Object.entries(raw.poses)){
  if(!idPattern.test(id)||!pose||typeof pose.source!=='string'||!pose.source.trim())throw Error('Invalid pose evidence');
  if(!['child','adult'].includes(pose.character)||!['main','afterstory'].includes(pose.phase)||!['outfit','expression','gesture'].every(k=>typeof pose[k]==='string'&&pose[k].trim()&&pose[k].length<=80))throw Error('Missing character/wardrobe/expression/gesture metadata: '+id);
  const base=register(pose.base,'image');
  const motion=pose.motion??[];
  if(!Array.isArray(motion)||motion.length>120)throw Error('Invalid pose motion');
  const frames=motion.map(frame=>{if(!frame||!Number.isInteger(frame.ms)||frame.ms<40||frame.ms>10000)throw Error('Invalid frame timing');return {image:register(frame.image,'image'),ms:frame.ms};});
  poses[id]={character:pose.character,phase:pose.phase,outfit:pose.outfit,expression:pose.expression,gesture:pose.gesture,base,blink:pose.blink?register(pose.blink,'image'):null,mouth:pose.mouth?register(pose.mouth,'image'):null,motion:frames,source:pose.source};
 }
 if(!Object.hasOwn(poses,raw.defaultPose)||poses[raw.defaultPose].phase!=='main')throw Error('Unknown default pose');
 for(const line of raw.lines){
  if(!line||!idPattern.test(line.id)||ids.has(line.id)||typeof line.text!=='string'||!line.text.trim()||line.text.length>600||typeof line.speaker!=='string'||!line.speaker.trim()||!Object.hasOwn(poses,line.pose)||typeof line.source!=='string'||!line.source.trim()||typeof line.voiceSource!=='string'||!line.voiceSource.trim()||line.verified!==true)throw Error('Unverified or invalid dialogue entry');
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
