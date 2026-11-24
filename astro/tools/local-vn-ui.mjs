import fs from 'node:fs';
import path from 'node:path';
import manifest from '../config/vn-scenes.json' with {type:'json'};
const prefix='/__ginka_local_ui__/';
export function localVNUI(){
 return {name:'ginka-private-ui-skin',apply:'serve',configureServer(server){
  if(!process.env.GINKA_VN_UI_DATA)return;
  const root=path.resolve(process.env.GINKA_VN_UI_DATA);
  const assets=new Map();
  for(const [key,spec] of Object.entries(manifest.privateUI.assets)){
   const bytes=fs.readFileSync(path.join(root,spec.source));
   if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)!==spec.width||bytes.readUInt32BE(20)!==spec.height)throw Error('Invalid private UI image: '+key);
   assets.set(prefix+key+'.png',bytes);
  }
  server.middlewares.use((req,res,next)=>{
   const url=(req.url||'').split('?')[0];
   if(!url.startsWith(prefix))return next();
   if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||!['GET','HEAD'].includes(req.method)){res.statusCode=403;res.end();return;}
   const bytes=assets.get(url);
   if(!bytes){res.statusCode=404;res.end();return;}
   res.setHeader('Content-Type','image/png');res.setHeader('Cache-Control','no-store');res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('Content-Length',bytes.length);
   res.end(req.method==='HEAD'?undefined:bytes);
  });
 }};
}
