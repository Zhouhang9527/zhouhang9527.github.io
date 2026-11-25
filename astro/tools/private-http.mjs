import fs from 'node:fs';
import path from 'node:path';

// All extracted original assets are explicitly configured, never resolved from the URL.
function inside(root,file){const relative=path.relative(root,file);return !!relative&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);}
export function readPrivateFile(root,relative,maxBytes=64*1024*1024){
 if(typeof relative!=='string'||path.isAbsolute(relative))throw Error('Invalid private asset path');
 const base=fs.realpathSync(root),candidate=path.resolve(base,relative);
 if(!inside(base,candidate))throw Error('Private asset outside root');
 const file=fs.realpathSync(candidate);
 if(!inside(base,file))throw Error('Private asset symlink outside root');
 const stat=fs.statSync(file);
 if(!stat.isFile()||stat.size<1||stat.size>maxBytes)throw Error('Invalid private asset size/type');
 return fs.readFileSync(file);
}
export function isPrivateRequest(req){
 if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket?.remoteAddress)||!['GET','HEAD'].includes(req.method))return false;
 const host=req.headers?.host;
 if(typeof host!=='string')return false;
 const match=/^(localhost|127\.0\.0\.1|\[::1\])(?::(\d{1,5}))?$/i.exec(host);
 if(!match||match[2]&&(Number(match[2])<1||Number(match[2])>65535))return false;
 const site=req.headers?.['sec-fetch-site'];
 if(site!==undefined&&!['same-origin','none'].includes(site))return false;
 const origin=req.headers?.origin;
 if(origin!==undefined){
  if(typeof origin!=='string')return false;
  try{const parsed=new URL(origin),scheme=req.socket?.encrypted?'https:':'http:';
   if(parsed.protocol!==scheme||parsed.origin!==new URL(scheme+'//'+host).origin||parsed.pathname!=='/'||parsed.search||parsed.hash||parsed.username||parsed.password)return false;
  }catch{return false;}
 }
 return true;
}
export function byteRange(value,length){
 if(typeof value!=='string'||!Number.isSafeInteger(length)||length<1)return null;
 const match=/^bytes=(\d*)-(\d*)$/.exec(value.trim());
 if(!match||!match[1]&&!match[2])return null;
 if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<1)return null;return [Math.max(0,length-suffix),length-1];}
 const start=Number(match[1]),end=match[2]?Number(match[2]):length-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=length||end<start)return null;
 return [start,Math.min(end,length-1)];
}
export function servePrivateBytes(req,res,bytes,mime){
 res.setHeader('Content-Type',mime);
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Cross-Origin-Resource-Policy','same-origin');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Accept-Ranges','bytes');
 const range=req.method==='GET'&&!req.headers?.['if-range']?req.headers?.range:undefined;
 if(range!==undefined){
  const selected=byteRange(range,bytes.length);
  if(!selected){res.statusCode=416;res.setHeader('Content-Range','bytes */'+bytes.length);res.setHeader('Content-Length',0);res.end();return;}
  const [start,end]=selected;
  res.statusCode=206;res.setHeader('Content-Range','bytes '+start+'-'+end+'/'+bytes.length);res.setHeader('Content-Length',end-start+1);res.end(bytes.subarray(start,end+1));return;
 }
 res.statusCode=200;res.setHeader('Content-Length',bytes.length);res.end(req.method==='HEAD'?undefined:bytes);
}
