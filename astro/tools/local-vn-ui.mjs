import fs from 'node:fs';
import path from 'node:path';
import manifest from '../config/vn-scenes.json' with {type:'json'};
import {decodePNG,encodePNG,removeMagenta,cropAtlas} from './png-atlas.mjs';
const prefix='/__ginka_local_ui__/';
export function localVNUI(){
 return {name:'ginka-private-ui-skin',apply:'serve',configureServer(server){
  const assets=new Map();
  function register(input,specs,kind=''){
   if(!input)return;
   const root=path.resolve(input);
   for(const [key,spec] of Object.entries(specs)){
   const bytes=fs.readFileSync(path.join(root,spec.source));
   if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)!==spec.width||bytes.readUInt32BE(20)!==spec.height)throw Error('Invalid private UI image: '+key);
   if(!kind&&manifest.privateUI.keyedAtlases.includes(key)){
    const image=removeMagenta(decodePNG(bytes));
    assets.set(prefix+key+'.png',encodePNG(image));
    if(key==='titleMenu'){
     for(const [name,slice] of Object.entries(manifest.privateUI.titleMenu.normal)){
      assets.set(prefix+'title-normal-'+name.toLowerCase()+'.png',encodePNG(cropAtlas(image,slice.rect,slice.rotate)));
     }
     for(const [name,rect] of Object.entries(manifest.privateUI.titleMenu.hover)){
      assets.set(prefix+'title-hover-'+name.toLowerCase()+'.png',encodePNG(cropAtlas(image,rect)));
     }
    }
   }else assets.set(prefix+kind+key+'.png',bytes);
   }
  }
  register(process.env.GINKA_VN_UI_DATA,manifest.privateUI.assets);
  register(process.env.GINKA_MAP_DATA,manifest.map.frames,'map-');
  if(!assets.size)return;
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
