import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import matter from 'gray-matter';
import {readPostDates, withPostDates, legacyPostRoutes, postRoute} from './post-frontmatter.mjs';
import config from '../config/site.json' with {type:'json'};
import legacy from '../config/legacy-routes.json' with {type:'json'};
import mainline from '../config/vn-mainline.json' with {type:'json'};
import vnScenes from '../config/vn-scenes.json' with {type:'json'};

// Compile/type-check/render real date-bearing sources in memory. Only unrelated
// UI/media children and the content loader are fixtures; no prepare/build, media
// reads, generated-directory writes, network, browser or real-content rendering here.
const require=createRequire(import.meta.url);
const {transform, convertToTSX}=require('@astrojs/compiler');
const ts=require('typescript');
const {experimental_AstroContainer}=await import(pathToFileURL(require.resolve('astro/container')).href);
const runtime=pathToFileURL(require.resolve('astro/compiler-runtime')).href;
const project=fileURLToPath(new URL('../',import.meta.url));
const root=path.resolve(project,'..');
// CI may already have prepared/built output. Prove this entire in-memory suite
// leaves both absent and existing generated trees unchanged, rather than
// requiring a pristine checkout. Include empty dirs, links and exact file bytes;
// exclude access times because observing a file can itself change its atime.
function snapshotGeneratedDirectories(base=project){
 const entries=[];
 function visit(relative){
  const absolute=path.join(base,relative);
  let stat;
  try{stat=fs.lstatSync(absolute);}catch(error){if(error.code==='ENOENT'){entries.push([relative,'absent']);return;}throw error;}
  const metadata={mode:stat.mode,mtimeMs:stat.mtimeMs};
  if(stat.isSymbolicLink())entries.push([relative,'symlink',metadata,fs.readlinkSync(absolute)]);
  else if(stat.isDirectory()){
   entries.push([relative,'directory',metadata]);
   for(const name of fs.readdirSync(absolute).sort())visit(relative+'/'+name);
  }else if(stat.isFile())entries.push([relative,'file',metadata,stat.size,createHash('sha256').update(fs.readFileSync(absolute)).digest('hex')]);
  else throw new Error('Unsupported generated entry: '+relative);
 }
 for(const dir of ['public','.generated','dist'])visit(dir);
 return entries;
}
const generatedBefore=snapshotGeneratedDirectories();
after(()=>assert.deepEqual(snapshotGeneratedDirectories(),generatedBefore,'date-template tests must leave generated directories and files unchanged'));
const read=relative=>fs.readFileSync(new URL(relative,import.meta.url),'utf8');
const moduleURL=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const jsonModule=value=>moduleURL('export default '+JSON.stringify(value));
const empty=moduleURL('export {};');
function remap(code, imports){
 for(const [specifier,url] of Object.entries(imports))code=code.replaceAll(JSON.stringify(specifier),JSON.stringify(url)).replaceAll("'"+specifier+"'",JSON.stringify(url));
 return code;
}
const transpile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
async function compile(source,filename,imports={}){
 const result=await transform(source,{filename,internalURL:runtime,renderScript:true,resolvePath:async specifier=>imports[specifier]||specifier});
 assert.deepEqual(result.diagnostics.filter(d=>d.severity===1),[],filename+' compiler errors');
 return moduleURL(transpile(remap(result.code.replaceAll('import.meta.env.DEV','false'),imports)));
}
const routeByStem=legacyPostRoutes(legacy);
const list=value=>Array.isArray(value)?value.flat(Infinity).map(String):value==null?[]:[String(value)];
const posts=fs.readdirSync(path.join(root,'source/_posts')).filter(file=>file.endsWith('.md')).map(file=>{
 const parsed=matter(fs.readFileSync(path.join(root,'source/_posts',file),'utf8'),{});
 const dates=readPostDates(parsed,file);
 return {id:file.slice(0,-3),collection:'posts',data:{...withPostDates(parsed.data,dates),title:String(parsed.data.title||file.slice(0,-3)),tags:list(parsed.data.tags),categories:list(parsed.data.categories),route:postRoute(file.slice(0,-3),dates.dateOnly,routeByStem)}};
});
const contentData=moduleURL('export async function getCollection(){return '+JSON.stringify(posts)+';}');
const siteURL=moduleURL(remap(transpile(read('../src/lib/site.ts')),{
 'astro:content':contentData,
 '../../config/legacy-routes.json':jsonModule(legacy),'../../config/vn-mainline.json':jsonModule(mainline),
 '../../config/site.json':jsonModule(config),'../../tools/post-dates.mjs':new URL('./post-dates.mjs',import.meta.url).href
}));
const siteModule=await import(siteURL);
const schemaURL=moduleURL(remap(transpile(read('../src/content.config.ts')),{
 'astro:content':moduleURL('export {z} from '+JSON.stringify(pathToFileURL(require.resolve('astro/zod')).href)+';export const defineCollection=value=>value;'),
 'astro/loaders':moduleURL('export const glob=()=>({name:"memory loader"});')
}));
const {collections}=await import(schemaURL);
const noUI=await compile('<Fragment/>','EmptyDateChild.astro');
const passthrough=await compile('<slot/>','DateLayoutFixture.astro');
const body=await compile('<p data-date-body>Non-media body fixture</p>','DateBodyFixture.astro');
const content=moduleURL('import Content from '+JSON.stringify(body)+';export async function render(){return {Content,headings:[]};}');
const vn=moduleURL('export const vnScenes='+JSON.stringify(vnScenes)+';export const sceneVars=()=>"";');
const controls=moduleURL('export const rectStyle=()=>"";export const stateStyle=()=>"";');
const templateImports={
 '../lib/site':siteURL,'../../lib/site':siteURL,
 '../lib/vn-scenes':vn,'../../lib/vn-scenes':vn,'../lib/vn-control':controls,
 '../layouts/Layout.astro':passthrough,'./Comments.astro':noUI,'./game/ReaderControls.astro':noUI,
 '../components/game/TitleScreen.astro':noUI,'astro:content':content
};
const filenames=['components/Article.astro','components/Collection.astro','components/game/ChapterSelect.astro','layouts/Layout.astro','pages/[...path].astro','pages/index.astro','pages/library.astro'];
const renderers={};
for(const name of filenames.filter(name=>!['layouts/Layout.astro','pages/[...path].astro'].includes(name))){
 const url=await compile(read('../src/'+name),name,templateImports);
 renderers[name]=(await import(url)).default;
}
const layoutURL=await compile(read('../src/layouts/Layout.astro'),'Layout.astro',{
 '../lib/site':siteURL,'../../tools/post-dates.mjs':new URL('./post-dates.mjs',import.meta.url).href,
 '../../.generated/build.json':jsonModule({version:'memory-date-check'}),
 '../lib/assets':moduleURL('export const asset=path=>"/"+path;'),
 'astro:transitions':moduleURL('export {default as ClientRouter} from '+JSON.stringify(noUI)+';'),
 '../components/game/ConfirmDialog.astro':noUI,'../components/Header.astro':noUI,'../components/Sidebar.astro':noUI,'../components/game/GinkaMascot.astro':noUI,
 '@fontsource-variable/noto-serif-sc':empty,'@fontsource-variable/jetbrains-mono':empty,'@fortawesome/fontawesome-free/css/all.min.css':empty,
 'astro/components/viewtransitions.css':empty
});
const Layout=(await import(layoutURL)).default;
const routeURL=await compile(read('../src/pages/[...path].astro'),'[...path].astro',{
 '../lib/site':siteURL,'../layouts/Layout.astro':layoutURL,
 '../components/Article.astro':await compile(read('../src/components/Article.astro'),'Article.astro',templateImports),
 '../components/Collection.astro':noUI,'../components/game/ChapterSelect.astro':noUI,'../components/StaticPage.astro':noUI
});
const Route=(await import(routeURL)).default;
async function render(Component,props,route='archives/'){
 const container=await experimental_AstroContainer.create();
 try{return await container.renderToString(Component,{props,request:new Request(config.url+'/'+route.split('/').map(encodeURIComponent).join('/'))});}
 catch(error){if(error.stack)error.stack=error.stack.replace(/data:text\/javascript;base64,[A-Za-z0-9+/=]+/g,'[in-memory module]');throw error;}
}
const timeTags=html=>[...html.matchAll(/<time\b[^>]*datetime="([^"]+)"[^>]*>([\s\S]*?)<\/time>/g)].map(match=>({datetime:match[1],text:match[2].replace(/<[^>]*>/g,'').trim()}));

// Virtual TSX graph uses the installed Astro type generator's template, the
// actual zod schema and actual component Props. Do not use astro:content's any
// fallback: a negative sentinel verifies data/dateOnly/updated are truly typed.
async function typeDiagnostics(){
 const virtual=new Map();
 const key=file=>path.resolve(file).replaceAll('\\','/').toLowerCase();
 const put=(file,text)=>virtual.set(key(path.join(project,file)),text);
 const entries=fs.readdirSync(path.join(project,'src'),{recursive:true}).filter(file=>file.endsWith('.astro'));
 for(const file of entries){
  const filename=path.join(project,'src',file);
  const result=await convertToTSX(fs.readFileSync(filename,'utf8'),{filename:filename.replaceAll('\\','/'),includeScripts:false});
  put(path.join('src',file)+'.tsx',result.code);
 }
 const astroDir=path.dirname(require.resolve('astro/package.json'));
 const contentBase=fs.readFileSync(path.join(astroDir,'types/content.d.ts'),'utf8');
 virtual.set(key(path.join(astroDir,'types/content.d.ts')),contentBase.slice(0,contentBase.indexOf('\t/** Run `astro dev`'))+'}\n');
 let generated=fs.readFileSync(path.join(astroDir,'templates/content/types.d.ts'),'utf8');
 generated=generated.replace('// @@DATA_ENTRY_MAP@@',['posts','pages'].map(name=>JSON.stringify(name)+': Record<string, {id:string;collection:'+JSON.stringify(name)+';data:InferEntrySchema<'+JSON.stringify(name)+'>;body?:string;rendered?:RenderedContent}>;').join('\n'))
  .replace("'@@CONTENT_CONFIG_TYPE@@'","typeof import('./src/content.config.js')")
  .replace("'@@LIVE_CONTENT_CONFIG_TYPE@@'",'{collections:{}}');
 put('date-memory-content.d.ts',generated);
 put('.generated/build.json',JSON.stringify({version:'memory-date-check'}));
 const assets=['css/astro-base.css','css/vn-stage.css',...['editorial','pages','reading','runtime','motion','theme','comments'].map(name=>'css/ginka-'+name+'.css'),...['theme-init','runtime','reading','ui-shell','theme','comments','controls','motion','music'].map(name=>'js/ginka-'+name+'.js'),'js/astro-shell.js'];
 put('.generated/assets.json',JSON.stringify(Object.fromEntries(assets.map(name=>[name,'fixture']))));
 put('date-memory-sentinel.ts',`import type {Post} from './src/lib/types';
declare const post:Post;
type IsAny<T> = 0 extends (1 & T) ? true : false;
const notAny:IsAny<Post['data']>=false;
const date:string=post.data.date;
const dateOnly:string=post.data.dateOnly;
const updated:string|undefined=post.data.updated;
// @ts-expect-error dateOnly is a real string, not any
const badDate:number=post.data.dateOnly;
// @ts-expect-error updated is not unconditionally present
const missingUpdated:string=post.data.updated;
`);
 const options={strict:true,noEmit:true,skipLibCheck:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,jsx:ts.JsxEmit.Preserve,jsxImportSource:'astro',resolveJsonModule:true,esModuleInterop:true,types:['node'],lib:['lib.es2022.d.ts','lib.dom.d.ts']};
 const host=ts.createCompilerHost(options);
 const original={readFile:host.readFile.bind(host),fileExists:host.fileExists.bind(host),directoryExists:host.directoryExists.bind(host),getSourceFile:host.getSourceFile.bind(host)};
 host.getCurrentDirectory=()=>project;
 host.readFile=file=>virtual.get(key(file))??original.readFile(file);
 host.fileExists=file=>virtual.has(key(file))||original.fileExists(file);
 host.directoryExists=dir=>[...virtual.keys()].some(file=>file.startsWith(key(dir)+'/'))||original.directoryExists(dir);
 host.getSourceFile=(file,version,onError,createNew)=>virtual.has(key(file))?ts.createSourceFile(file,virtual.get(key(file)),version,true):original.getSourceFile(file,version,onError,createNew);
 host.resolveModuleNames=(names,containing)=>names.map(name=>{
  if(name.endsWith('.astro')&&name.startsWith('.')){
   const resolved=path.resolve(path.dirname(containing),name)+'.tsx';
   if(host.fileExists(resolved))return {resolvedFileName:resolved,extension:ts.Extension.Tsx};
  }
  return ts.resolveModuleName(name,containing,options,host).resolvedModule;
 });
 const roots=[require.resolve('astro/client'),path.join(astroDir,'env.d.ts'),path.join(project,'date-memory-content.d.ts'),path.join(project,'date-memory-sentinel.ts'),...filenames.map(name=>path.join(project,'src',name)+'.tsx')];
 const program=ts.createProgram(roots,options,host);
 return ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>({file:d.file?.fileName,message:ts.flattenDiagnosticMessageText(d.messageText,'\n'),code:d.code}));
}

function assertCanonicalEqual(actual,expected){
 assert.ok(actual,'canonical link href exists');
 const actualURL=new URL(actual);
 const expectedURL=new URL(expected);
 assert.equal(actualURL.origin,expectedURL.origin,'canonical origin');
 assert.equal(actualURL.username,expectedURL.username,'canonical username');
 assert.equal(actualURL.password,expectedURL.password,'canonical password');
 assert.deepEqual(actualURL.pathname.split('/').map(decodeURIComponent),expectedURL.pathname.split('/').map(decodeURIComponent),'canonical path segments');
 assert.equal(actualURL.search,expectedURL.search,'canonical query');
 assert.equal(actualURL.hash,expectedURL.hash,'canonical fragment');
}

test('actual prepare article loop and schema retain full dates in memory without updated invention',()=>{
 const source=read('./prepare.mjs');
 const start=source.indexOf('const postDir=');
 const end=source.indexOf("for(const slug of ['about','links'])",start);
 assert.ok(start>0&&end>start,'bounded real article staging loop');
 const writes=new Map();
 const tracked=posts.map(post=>'source/_posts/'+post.id+'.md');
 const context={fs:{...fs,mkdirSync:()=>{},writeFileSync:(file,value)=>writes.set(file,value)},path,source:path.join(root,'source'),stage:'/memory-only',out:'/memory-only-public',tracked,matter,legacy,readPostDates,withPostDates,legacyPostRoutes,postRoute,copy:()=>{throw Error('Unexpected asset copy');}};
 vm.runInNewContext(source.slice(start,end)+'\nglobalThis.resultRows=rows;',context);
 assert.equal(writes.size,15);
 assert.deepEqual(Array.from(context.resultRows,row=>row.route).sort(),posts.map(post=>post.data.route).sort());
 for(const post of posts){
  const staged=matter(writes.get(path.join('/memory-only','posts',post.id+'.md')),{});
  const data=collections.posts.schema.parse(staged.data);
  assert.equal(data.date,post.data.date);assert.equal(data.dateOnly,post.data.dateOnly);
  assert.equal(data.updated,undefined);assert.equal(staged.data.updated,undefined);
  assert.equal(data.route,post.data.route);
 }
});

test('real allPosts ordering uses full same-day instants and mainline paths stay frozen',async()=>{
 const ordered=await siteModule.allPosts();
 assert.deepEqual(ordered.filter(post=>post.data.dateOnly==='2025-12-23').map(post=>post.id),['[miniVN] VSnake','[miniVN] Crackme','[miniVN] ezAndroid']);
 assert.deepEqual(siteModule.mainlinePaths(ordered),mainline.routes.map(siteModule.href));
});

test('modified Astro TSX graph has zero strict type errors with real schema inference',async()=>{
 assert.deepEqual(await typeDiagnostics(),[]);
});

test('actual article/archive/chapter/index/library templates display dates without dropping machine precision',async()=>{
 for(const post of posts){
  const html=await render(renderers['components/Article.astro'],{post},post.data.route);
  assert.deepEqual(timeTags(html),[{datetime:post.data.date,text:post.data.dateOnly}]);
 }
 const list={kind:'archive',title:'Dates',posts};
 for(const name of ['components/Collection.astro','components/game/ChapterSelect.astro','pages/index.astro']){
  const times=timeTags(await render(renderers[name],list));
  assert.equal(times.length,15,name);
  for(const time of times){assert.match(time.datetime,/T\d\d:\d\d:\d\d\+08:00$/);assert.doesNotMatch(time.text,/[T+]\d/);}
 }
 const library=await render(renderers['pages/library.astro'],{});
 for(const post of posts)assert.ok(library.includes('data-published="'+post.data.dateOnly+'">'+post.data.dateOnly+'</small>'));
});

test('real Layout uses source publication and explicit updated only, retaining canonical URLs',async()=>{
 for(const post of posts){
  const html=await render(Layout,{title:post.data.title,article:true,published:post.data.date},post.data.route);
  assert.ok(html.includes('property="article:published_time" content="'+post.data.date+'"'));
  assert.doesNotMatch(html,/article:modified_time/,'originals have no modification history');
  assertCanonicalEqual(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1],config.url+siteModule.href(post.data.route));
 }
 const updated=await render(Layout,{title:'Updated fixture',article:true,published:'2025-12-23T10:40:00+08:00',updated:'2026-11-25T11:02:03Z'});
 assert.ok(updated.includes('property="article:modified_time" content="2026-11-25T19:02:03+08:00"'));
 assert.doesNotMatch(await render(Layout,{title:'Archive'}),/article:(published|modified)_time/);
});

test('actual dynamic article route forwards full timestamps to Layout without changing article URLs',async()=>{
 for(const post of posts){
  const html=await render(Route,{kind:'post',post},post.data.route);
  assert.ok(html.includes('property="article:published_time" content="'+post.data.date+'"'));
  assert.deepEqual(timeTags(html),[{datetime:post.data.date,text:post.data.dateOnly}]);
  assertCanonicalEqual(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1],config.url+siteModule.href(post.data.route));
  assert.doesNotMatch(html,/article:modified_time/);
 }
});
