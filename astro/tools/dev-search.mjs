import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createIndex,close} from 'pagefind';

const project=fileURLToPath(new URL('../',import.meta.url));
const assertIndexed=response=>{if(response.errors.length)throw Error(response.errors.join('\n'));return response;};

// The same Pagefind HTML index as production, over the actual Astro-rendered
// article documents. No second renderer, text extractor, public staging or disk index.
export async function indexDevArticles(routes,render){
 let index;
 try{
  index=assertIndexed(await createIndex()).index;
  if(!index)throw Error('Pagefind did not create an index');
  for(const url of routes)assertIndexed(await index.addHTMLFile({url,content:await render(url)}));
  return new Map(assertIndexed(await index.getFiles()).files.map(file=>[file.path,Buffer.from(file.content)]));
 }finally{
  if(index)await index.deleteIndex();
  await close();
 }
}

export function devSearch(){
 return {name:'ginka-dev-pagefind',apply:'serve',configureServer(server){
  let files=null,pending=null,revision=0,closed=false;
  const controller=new AbortController();
  async function currentFiles(){
   if(closed)throw Error('Development server closed');
   if(files)return files;
   if(pending)return pending;
   const token=revision;
   const task=(async()=>{
    const address=server.httpServer.address();
    if(!address||typeof address==='string')throw Error('Pagefind needs a listening Astro development server');
    const origin='http://'+(address.address==='::1'?'[::1]':'127.0.0.1')+':'+address.port;
    const rows=JSON.parse(await fs.readFile(path.join(project,'.generated/routes.json'),'utf8'));
    const routes=rows.map(row=>'/'+row.route.split('/').map(encodeURIComponent).join('/'));
    const result=await indexDevArticles(routes,async url=>{
     const response=await fetch(origin+url,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30000)])});
     if(!response.ok)throw Error('Cannot index current article: '+response.status+' '+url);
     return response.text();
    });
    if(closed)throw Error('Development server closed');
    if(token===revision){files=result;return result;}
    pending=null;return currentFiles();
   })();
   pending=task;
   try{return await task;}finally{if(pending===task)pending=null;}
  }
  const invalidate=file=>{
   const relative=path.relative(path.join(project,'.generated'),file).replaceAll('\\','/');
   if(relative==='routes.json'||relative.startsWith('posts/')&&relative.endsWith('.md')){revision++;files=null;server.ws.send({type:'full-reload'});}
  };
  server.watcher.on('change',invalidate);
  server.httpServer.once('close',async()=>{
   closed=true;controller.abort();server.watcher.off('change',invalidate);
   try{await pending;}catch{/* In-flight renders are cancelled on server shutdown. */}
   files=null;await close();
  });
  server.middlewares.use(async(req,res,next)=>{
   const pathname=new URL(req.url,'http://localhost').pathname;
   if(!pathname.startsWith('/pagefind/'))return next();
   if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');res.statusCode=405;res.end();return;}
   try{
    const bytes=(await currentFiles()).get(pathname.slice('/pagefind/'.length));
    if(!bytes){res.statusCode=404;res.end('Unknown Pagefind asset');return;}
    const extension=path.extname(pathname);
    res.setHeader('Content-Type',extension==='.js'?'application/javascript; charset=utf-8':extension==='.css'?'text/css; charset=utf-8':extension==='.json'?'application/json; charset=utf-8':'application/octet-stream');
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Length',bytes.length);
    res.end(req.method==='HEAD'?undefined:bytes);
   }catch(error){server.config.logger.error('Pagefind development index failed: '+error.message);res.statusCode=503;res.end('Current article search index could not be built');}
  });
 }};
}
