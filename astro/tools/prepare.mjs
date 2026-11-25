import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import matter from 'gray-matter';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {assertPublicStagingApproved,isPublicAsset} from './public-asset-policy.mjs';
import legacy from '../config/legacy-routes.json' with {type:'json'};
import {readPostDates,withPostDates,legacyPostRoutes,postRoute} from './post-frontmatter.mjs';
const project=fileURLToPath(new URL('../',import.meta.url));
const root=path.resolve(project,'..'), out=path.join(project,'public'), stage=path.join(project,'.generated');
const source=path.join(root,'source');
const tracked=execFileSync('git',['ls-files','-z','source'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
// Fail before deleting or writing staging output. Git tracking is not permission.
assertPublicStagingApproved(tracked,root);
for(const dir of [out,stage]) {fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});}
function copy(src,dest){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);}
for(const file of tracked){
 if(!isPublicAsset(file)||file.startsWith('source/_posts/'))continue;
 const rel=file.slice('source/'.length);
 copy(path.join(root,file),path.join(out,rel));
}
const postDir=path.join(source,'_posts');
const enc=s=>s.split('/').map(encodeURIComponent).join('/');
const routeByStem=legacyPostRoutes(legacy);
const rows=[];
fs.mkdirSync(path.join(stage,'posts'),{recursive:true});
fs.mkdirSync(path.join(stage,'pages'),{recursive:true});
for(const file of fs.readdirSync(postDir).filter(n=>n.endsWith('.md')).sort()){
 // Only tracked articles enter the production staging tree. Drafts and extracted
 // material cannot be accidentally published by a local build.
 if(!tracked.includes('source/_posts/'+file))continue;
 const stem=file.slice(0,-3), parsed=matter(fs.readFileSync(path.join(postDir,file),'utf8'),{});
 const dates=readPostDates(parsed,file);
 const route=postRoute(stem,dates.dateOnly,routeByStem);
 const attachment=path.join(postDir,stem);
 for(const item of tracked.filter(p=>p.startsWith('source/_posts/'+stem+'/'))){
  const suffix=item.slice(('source/_posts/'+stem+'/').length);
  if(suffix.includes('local-preview/'))continue;
  copy(path.join(root,item),path.join(out,route,suffix));
 }
 // Preserve original URL paths; change only relative local Markdown image URLs.
 const content=parsed.content.replace(/(!\[[^\]\n]*\]\()([^\s)]+)([^\n)]*\))/g,(all,open,src,tail)=>{
  if(/^(?:[a-z]+:|\/|#)/i.test(src))return all;
  let name;try{name=decodeURIComponent(src);}catch{name=src;}
  if(fs.existsSync(path.join(attachment,name)))return open+'/'+enc(route+name)+tail;
  return all;
 });
 const list=v=>Array.isArray(v)?v.flat(Infinity).map(String):v==null?[]:[String(v)];
 const data={...withPostDates(parsed.data,dates),route,title:String(parsed.data.title||stem),tags:list(parsed.data.tags),categories:list(parsed.data.categories)};
 fs.writeFileSync(path.join(stage,'posts',file),matter.stringify(content,data));
 rows.push({route,title:data.title,stem,...dates,description:String(data.description||''),tags:data.tags,categories:data.categories});
}
for(const slug of ['about','links']){
 const parsed=matter(fs.readFileSync(path.join(source,slug,'index.md'),'utf8'));
 fs.writeFileSync(path.join(stage,'pages',slug+'.md'),matter.stringify(parsed.content,{title:String(parsed.data.title||slug)}));
}
const missing=legacy.filter(r=>/^20\d\d\//.test(r)&&!rows.some(p=>p.route===r));
if(missing.length)throw Error('Lost historical post routes: '+missing.join(', '));
fs.writeFileSync(path.join(stage,'routes.json'),JSON.stringify(rows,null,2));
let build='dev';try{build=execFileSync('git',['rev-parse','--short=10','HEAD'],{cwd:root,encoding:'utf8'}).trim()}catch{}
fs.writeFileSync(path.join(out,'site-version.json'),JSON.stringify({version:build}));
fs.writeFileSync(path.join(stage,'build.json'),JSON.stringify({version:build}));
// Preserve the current pinned remote theme. Local new assets never enter this staging directory.
console.log('Prepared',rows.length,'original posts and tracked public assets');

copy(path.join(project,'public-shell.js'),path.join(out,'js/astro-shell.js'));
copy(path.join(project,'src/styles/base.css'),path.join(out,'css/astro-base.css'));
copy(path.join(project,'src/styles/game/stage.css'),path.join(out,'css/vn-stage.css'));
fs.writeFileSync(path.join(out,'.nojekyll'),'');

const assetVersions = {};
for(const relative of ['css/astro-base.css','css/vn-stage.css',...['editorial','pages','reading','runtime','motion','theme','comments'].map(n=>'css/ginka-'+n+'.css'),...['theme-init','reading','ui-shell','theme','comments','controls','motion','music'].map(n=>'js/ginka-'+n+'.js'),'js/astro-shell.js']){
 const bytes=fs.readFileSync(path.join(out,relative));
 assetVersions[relative]=createHash('sha256').update(bytes).digest('hex').slice(0,10);
}
fs.writeFileSync(path.join(stage,'assets.json'),JSON.stringify(assetVersions,null,2));
