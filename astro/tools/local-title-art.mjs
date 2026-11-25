import {readPrivateFile,isPrivateRequest,servePrivateBytes} from './private-http.mjs';
import manifest from '../config/vn-scenes.json' with {type:'json'};

// This middleware is installed only by Vite's development server. It does not
// write to public, .generated or dist and is never installed for build/preview.
export function localTitleArt(){
 return {name:'ginka-local-original-title',apply:'serve',
  configureServer(server){
   const input=process.env.GINKA_TITLE_DATA;
   if(!input)return;
   const root=input;
   const frames=new Map();
   for(const [id,spec] of Object.entries({...manifest.title.frames,logo:manifest.title.logo})){
    const bytes=readPrivateFile(root,spec.source);
    if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)!==spec.width||bytes.readUInt32BE(20)!==spec.height)throw Error('Invalid original title CG: '+id);
    frames.set('/__ginka_local_title__/'+id+'.png',bytes);
   }
   server.middlewares.use((req,res,next)=>{
    const url=(req.url||'').split('?')[0];
    if(!url.startsWith('/__ginka_local_title__/'))return next();
    if(!isPrivateRequest(req)){res.statusCode=403;res.end();return;}
    const bytes=frames.get(url);
    if(!bytes){res.statusCode=404;res.end();return;}
    servePrivateBytes(req,res,bytes,'image/png');
   });
   console.log('GINKA: three original full title CGs and original logo available on local dev server only');
  }
 };
}
