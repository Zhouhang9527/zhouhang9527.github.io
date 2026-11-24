import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import matter from 'gray-matter';
import legacy from '../config/legacy-routes.json' with {type:'json'};
const root=path.resolve('..'), out=path.resolve('public'), stage=path.resolve('.generated');
const source=path.join(root,'source');
const excluded=new Set(['images/background.mp4','images/ginka-static-background.webp','fonts/LxgwWenKai.ttf','fonts/OppoSans.ttf','fonts/OppoSans-Bold.ttf','live2d/ATRI/ATRI.cmo3','live2d/ATRI/ATRI.psd','live2d/ATRI/ATRI.4096/texture_00.png']);
for(const dir of [out,stage]) {fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});}
const tracked=execFileSync('git',['ls-files','-z','source','astro/vendor-assets'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
function copy(src,dest){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);}
for(const file of tracked){
 const vendor=file.startsWith('astro/vendor-assets/');
 const rel=file.replace(vendor?'astro/vendor-assets/':'source/','');
 if(rel.startsWith('_')||rel.endsWith('.md')||rel.includes('/local-preview/')||excluded.has(rel)||rel.endsWith('.gitkeep')) continue;
 if(!vendor&&!/^(images|fonts|js|css|live2d|music|voice)\b|^(CNAME|manifest\.webmanifest|sw\.js|voice-config.*\.json)$/.test(rel))continue;
 copy(path.join(root,file),path.join(out,rel));
}
const postDir=path.join(source,'_posts');
const enc=s=>s.split('/').map(encodeURIComponent).join('/');
const routeByStem=new Map(legacy.filter(r=>/^20\d\d\//.test(r)).map(r=>[r.replace(/\/$/,'').split('/').at(-1),r]));
const rows=[];
fs.mkdirSync(path.join(stage,'posts'),{recursive:true});
fs.mkdirSync(path.join(stage,'pages'),{recursive:true});
for(const file of fs.readdirSync(postDir).filter(n=>n.endsWith('.md'))){
 const stem=file.slice(0,-3), parsed=matter(fs.readFileSync(path.join(postDir,file),'utf8'));
 const date=String(parsed.matter.match(/^date:\s*['"]?(\d{4}-\d\d-\d\d)/m)?.[1]||'');
 if(!date)throw Error('Missing original date: '+file);
 const route=routeByStem.get(stem)||date.replaceAll('-','/')+'/'+stem+'/';
 const attachment=path.join(postDir,stem);
 if(fs.existsSync(attachment)) fs.cpSync(attachment,path.join(out,route),{recursive:true});
 // Preserve original URL paths; change only relative local Markdown image URLs.
 const content=parsed.content.replace(/(!\[[^\]\n]*\]\()([^\s)]+)([^\n)]*\))/g,(all,open,src,tail)=>{
  if(/^(?:[a-z]+:|\/|#)/i.test(src))return all;
  let name;try{name=decodeURIComponent(src);}catch{name=src;}
  if(fs.existsSync(path.join(attachment,name)))return open+'/'+enc(route+name)+tail;
  return all;
 });
 const list=v=>Array.isArray(v)?v.flat(Infinity).map(String):v==null?[]:[String(v)];
 const data={...parsed.data,date,route,title:String(parsed.data.title||stem),tags:list(parsed.data.tags),categories:list(parsed.data.categories)};
 fs.writeFileSync(path.join(stage,'posts',file),matter.stringify(content,data));
 rows.push({route,title:data.title,stem});
}
for(const slug of ['about','links']){
 const parsed=matter(fs.readFileSync(path.join(source,slug,'index.md'),'utf8'));
 fs.writeFileSync(path.join(stage,'pages',slug+'.md'),matter.stringify(parsed.content,{title:String(parsed.data.title||slug)}));
}
const missing=legacy.filter(r=>/^20\d\d\//.test(r)&&!rows.some(p=>p.route===r));
if(missing.length)throw Error('Lost historical post routes: '+missing.join(', '));
fs.writeFileSync(path.join(stage,'routes.json'),JSON.stringify(rows,null,2));
let build='dev';try{build=execFileSync('git',['rev-parse','--short','HEAD'],{cwd:root,encoding:'utf8'}).trim()}catch{}
fs.writeFileSync(path.join(out,'site-version.json'),JSON.stringify({version:build}));
fs.writeFileSync(path.join(stage,'build.json'),JSON.stringify({version:build}));
// Preserve the current pinned remote theme. Local new assets never enter this staging directory.
console.log('Prepared',rows.length,'original posts and tracked public assets');
