import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {normalizePbd} from './pbd-ui.mjs';
const input=process.argv[2],output=process.argv[3];
if(!input||!output)throw Error('Usage: node tools/extract-pbd-ui.mjs <private repo> <private output directory>');
const root=fs.realpathSync(input),out=path.resolve(output),blog=fs.realpathSync(path.join(import.meta.dirname,'..','..'));
const inside=(p,parent)=>p===parent||p.startsWith(parent+path.sep);
if(inside(out,blog))throw Error('PBD manifests contain original scripts; output must stay outside blog repository');
fs.mkdirSync(out,{recursive:true});
if(inside(fs.realpathSync(out),blog))throw Error('Private output resolves inside blog repository');
const data=path.join(root,'assets','data','_hxv4_hash','AF5FB0494CCF915F');
const report={version:1,files:[],errors:[]};
for(const name of fs.readdirSync(data).filter(n=>n.endsWith('.pbd.json')).sort()){
 try{
  const source=path.relative(root,path.join(data,name)).split(path.sep).join('/');
  const bytes=fs.readFileSync(path.join(data,name)),hash=createHash('sha256').update(bytes).digest('hex');
  const dest=path.join(out,name.replace(/\.pbd\.json$/,'.ui.json'));
  let cached=false;
  if(fs.existsSync(dest)&&!process.argv.includes('--force')){try{const old=JSON.parse(fs.readFileSync(dest,'utf8'));cached=old.inputSha256===hash&&old.version===1&&old.controls&&typeof old.controls==='object';}catch{}}
  if(!cached){const result=normalizePbd(JSON.parse(bytes.toString('utf8')),source);fs.writeFileSync(dest,JSON.stringify({...result,inputSha256:hash},null,2)+'\n');}
  report.files.push({source,output:path.basename(dest),sha256:hash,cached});
 }catch(error){report.errors.push({name,error:String(error)});}
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log('PBD files:',report.files.length,'errors:',report.errors.length);
if(report.errors.length||!report.files.length)process.exitCode=1;
