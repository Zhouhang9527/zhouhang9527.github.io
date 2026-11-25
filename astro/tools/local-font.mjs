import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {isPrivateRequest,servePrivateBytes} from './private-http.mjs';

const PREFIX='/__ginka_local_font__/';
const FAMILY='Ginka Local UI';

export function readFont(file){
 const stat=fs.statSync(file);
 if(!stat.isFile()||stat.size<12||stat.size>64*1024*1024)throw Error('Invalid font size');
 const bytes=fs.readFileSync(file);
 const signature=bytes.subarray(0,4).toString('hex');
 const format=signature==='4f54544f'?'opentype':signature==='00010000'?'truetype':null;
 if(!format)throw Error('Expected standalone OTF or TTF');
 const count=bytes.readUInt16BE(4);
 if(!count||12+count*16>bytes.length)throw Error('Invalid SFNT directory');
 let names={};
 for(let i=0;i<count;i++){
  const p=12+i*16, tag=bytes.toString('ascii',p,p+4);
  const offset=bytes.readUInt32BE(p+8), length=bytes.readUInt32BE(p+12);
  if(offset+length>bytes.length)throw Error('Invalid SFNT table '+tag);
  if(tag!=='name'||length<6)continue;
  const table=bytes.subarray(offset,offset+length);
  const records=table.readUInt16BE(2), strings=table.readUInt16BE(4);
  if(6+12*records>table.length||strings>table.length)continue;
  for(let j=0;j<records;j++){
   const pos=6+j*12, platform=table.readUInt16BE(pos);
   const id=table.readUInt16BE(pos+6), len=table.readUInt16BE(pos+8), start=strings+table.readUInt16BE(pos+10);
   if(![1,2,4,6,16,17].includes(id)||start+len>table.length)continue;
   if(![0,3].includes(platform)||len%2)continue;
   const value=Buffer.from(table.subarray(start,start+len)).swap16().toString('utf16le').replace(/\0/g,'').trim();
   if(value)(names[id]??=new Set()).add(value);
  }
 }
 names=Object.fromEntries(Object.entries(names).map(([id,values])=>[id,[...values]]));
 return {bytes,format,names};
}

export function listFonts(root){
 const result=[];
 function walk(dir){
  for(const item of fs.readdirSync(dir,{withFileTypes:true})){
   const file=path.join(dir,item.name);
   if(item.isDirectory())walk(file);
   else if(item.isFile()&&/\.(otf|ttf)$/i.test(item.name)){
    try{
     const {bytes,format,names}=readFont(file);
     result.push({file:path.relative(root,file),size:bytes.length,format,names});
    }catch(error){result.push({file:path.relative(root,file),error:String(error)});}
   }
  }
 }
 walk(root);
 return result;
}

// Fixed routes, no user-supplied path, no writes to public or dist.
export function localFont(){
 return {name:'ginka-private-ui-font',apply:'serve',
  configureServer(server){
   const input=process.env.GINKA_UI_FONT;
   if(!input)return;
   const {bytes,format,names}=readFont(path.resolve(input));
   const ext=format==='opentype'?'otf':'ttf';
   const css='@font-face{font-family:"'+FAMILY+'";src:url("'+PREFIX+'ui.'+ext+'") format("'+format+'");font-style:normal;font-weight:400;font-display:swap}:root{--vn-font-original:"'+FAMILY+'";}';
   server.middlewares.use((req,res,next)=>{
    const url=(req.url||'').split('?')[0];
    if(!url.startsWith(PREFIX))return next();
    if(!isPrivateRequest(req)){res.statusCode=403;res.end();return;}
    const isCss=url===PREFIX+'ui.css';
    if(!isCss&&url!==PREFIX+'ui.'+ext){res.statusCode=404;res.end();return;}
    const body=isCss?Buffer.from(css):bytes;
    servePrivateBytes(req,res,body,isCss?'text/css; charset=utf-8':ext==='otf'?'font/otf':'font/ttf');
   });
   console.log('GINKA: private UI font enabled on localhost only',names);
  }
 };
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 if(!process.argv[2])throw Error('Usage: node tools/local-font.mjs <extracted data directory>');
 console.log(JSON.stringify(listFonts(path.resolve(process.argv[2])),null,2));
}
