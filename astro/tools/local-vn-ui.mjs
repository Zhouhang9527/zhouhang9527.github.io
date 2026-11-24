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
    for(const [name,rect] of Object.entries(manifest.privateUI.slices?.[key]??{})){
     assets.set(prefix+key+'-'+name+'.png',encodePNG(cropAtlas(image,rect)));
    }
    if(key==='titleMenu'){
     for(const [name,button] of Object.entries(manifest.privateUI.titleMenu.states)){
      for(const state of ['normal','hover','pressed']){
       const slice=button[state],sprite=cropAtlas(image,slice.rect,slice.rotate),[ox,oy]=slice.offset,[,,width,height]=button.bounds;
       if(ox<0||oy<0||ox+sprite.width>width||oy+sprite.height>height)throw Error('Invalid logical title button '+name+' '+state);
       const pixels=Buffer.alloc(width*height*4);
       for(let y=0;y<sprite.height;y++)sprite.pixels.copy(pixels,((oy+y)*width+ox)*4,y*sprite.width*4,(y+1)*sprite.width*4);
       assets.set(prefix+'title-'+state+'-'+name.toLowerCase()+'.png',encodePNG({width,height,pixels}));
      }
     }
     assets.set(prefix+'title-new.png',encodePNG(cropAtlas(image,manifest.privateUI.titleMenu.newBadge.rect)));
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
