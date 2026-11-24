import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import legacy from '../config/legacy-routes.json' with {type:'json'};
for(const route of legacy)assert.ok(fs.existsSync(path.join('dist',route,'index.html')),'Lost route '+route);
for(const route of ['index.html','404.html','about/index.html','links/index.html','pagefind/pagefind.js','images/avatar.png','css/giscus-day.css','.nojekyll','sitemap.xml','baidusitemap.xml','robots.txt','atom.xml','article-index.json'])assert.ok(fs.existsSync(path.join('dist',route)),'Missing '+route);
const privateArt='dist/images/ginka/scenes/local-preview';assert.ok(!fs.existsSync(privateArt),'Local art leaked');
const posts=legacy.filter(r=>/^20\d\d\//.test(r));
for(const route of posts){
 const html=fs.readFileSync(path.join('dist',route,'index.html'),'utf8');
 assert.match(html,/data-repo="Zhouhang9527\/blog-comments"/);
 assert.match(html,/data-mapping="pathname"/);
 for(const match of html.matchAll(/<img\b[^>]*\bsrc="(\/[^"]+)"/g)){
  const src=match[1].split('?')[0];assert.ok(fs.existsSync(path.join('dist',decodeURIComponent(src))),'Missing image '+src+' on '+route);
 }
}
console.log('PASS',legacy.length,'legacy routes, article comments and local images');

const versions=JSON.parse(fs.readFileSync('.generated/assets.json','utf8'));
const {createHash}=await import('node:crypto');
const home=fs.readFileSync('dist/index.html','utf8');
for(const [asset,hash] of Object.entries(versions)){
 assert.equal(createHash('sha256').update(fs.readFileSync(path.join('dist',asset))).digest('hex').slice(0,10),hash,'Asset hash mismatch '+asset);
 assert.ok(home.includes('/'+asset+'?v='+hash),'Asset not versioned in home '+asset);
}
console.log('PASS content-hashed asset manifest');

const vn=JSON.parse(fs.readFileSync('config/vn-scenes.json','utf8'));
for(const spec of [vn.title.background,vn.chapter])for(const mode of ['day','night'])for(const w of vn.widths)assert.ok(fs.existsSync(path.join('dist','images/ginka/scenes',spec.slug+'-'+mode+'-'+w+'.webp')),'Missing VN scene '+spec.slug);
assert.match(home,/data-vn-start/);
assert.match(fs.readFileSync('dist/archives/index.html','utf8'),/data-vn-post/);
console.log('PASS VN scene manifest and navigation entry points');

assert.equal(vn.title.background.id,'torii');
assert.equal(vn.title.states[0].minCompleted,0);
assert.deepEqual(Object.keys(vn.title.frames).sort(),['data-003','data-004','data-005']);
assert.equal(new Set(vn.title.states.map(s=>s.frame)).size,3);
for(const [i,state] of vn.title.states.entries()){
 assert.ok(!i||state.minCompleted>vn.title.states[i-1].minCompleted);
 assert.equal(state.present,typeof state.expression==='string');
 const frame=vn.title.frames[state.frame];assert.equal(frame.width,1280);assert.equal(frame.height,720);
 assert.ok(!('asset' in state),'Do not composite character sprites');
}
assert.match(home,/data-vn-cover="torii"/);
assert.match(home,/data-vn-original="false"/);
assert.doesNotMatch(home,/data-vn-character-art|--vn-original-frame\s*:/);
assert.ok(!fs.existsSync('dist/__ginka_local_title__'),'Private original title CG leaked');
console.log('PASS complete CG frame contract and production isolation');

assert.doesNotMatch(home,/__ginka_local_font__|Ginka Local UI/,'Private font reference leaked');
assert.ok(!fs.existsSync('dist/__ginka_local_font__'),'Private font files leaked');
const vnCss=fs.readFileSync('dist/css/vn-stage.css','utf8');
assert.match(vnCss,/--vn-font-menu:/);
assert.match(vnCss,/--vn-font-ui:/);
assert.doesNotMatch(vnCss,/__ginka_local_font__|@font-face/);
console.log('PASS VN typography roles and private font isolation');

for(const [route,screen] of [['library','load'],['gallery','gallery'],['settings','config']]){
 const html=fs.readFileSync('dist/'+route+'/index.html','utf8');
 assert.ok(html.includes('data-vn-screen="'+screen+'"'),'Missing VN '+screen);
 assert.ok(home.includes('href="/'+route+'/"'),'Unreachable VN '+route);
}
console.log('PASS VN load, gallery and config routes');

assert.ok(!fs.existsSync('dist/__ginka_local_ui__'),'Private UI files leaked');
for(const route of ['index.html','gallery/index.html','library/index.html','settings/index.html']){
 assert.doesNotMatch(fs.readFileSync('dist/'+route,'utf8'),/__ginka_local_ui__|data-vn-ui-original="true"/,'Private UI reference leaked');
}
console.log('PASS private UI build isolation');

for(const [route,screen] of [['search','search']]){
 const html=fs.readFileSync('dist/'+route+'/index.html','utf8');
 assert.ok(html.includes('data-vn-screen="'+screen+'"'),'Missing VN '+screen);
 assert.ok(fs.readFileSync('dist/gallery/index.html','utf8').includes('href="/'+route+'/"'),'Unreachable VN '+route);
}
const settingsHtml=fs.readFileSync('dist/settings/index.html','utf8');
assert.match(settingsHtml,/data-vn-option-panel="sound"/);
assert.match(settingsHtml,/data-vn-volume/);
assert.doesNotMatch(home,/href="\/music-room\/"/);
assert.match(fs.readFileSync('dist/music-room/index.html','utf8'),/\/settings\/#sound/);
console.log('PASS VN search and integrated SOUND settings');

const mapHtml=fs.readFileSync('dist/map/index.html','utf8');
assert.match(mapHtml,/data-vn-map/);
assert.match(mapHtml,/data-vn-map-original="false"/);
assert.doesNotMatch(mapHtml,/__ginka_local_ui__/);
assert.ok(fs.readFileSync('dist/gallery/index.html','utf8').includes('href="/map/"'));
for(const state of vn.map.states)assert.ok(Object.hasOwn(vn.map.frames,state.frame),'Unknown map frame');
console.log('PASS map state manifest and private isolation');

const sitemap=fs.readFileSync('dist/sitemap.xml','utf8');
for(const route of ['library','settings','search','music-room'])assert.ok(!sitemap.includes('/'+route+'/</loc>'),'Private UI route in sitemap '+route);
console.log('PASS noindex page sitemap exclusion');

assert.doesNotMatch(home,/__ginka_local_title__|vn-original-logo/,'Original title overlay leaked');
assert.equal(vn.motion.systemCrossfadeMs,300);
assert.equal(vn.motion.backlogCrossfadeMs,300);
console.log('PASS original UI timing and title logo isolation');

assert.equal(vn.privateUI.assets.option.width,1280);
assert.equal(vn.privateUI.assets.optionAtlas.width,593);
assert.equal(vn.privateUI.assets.optionAtlas.height,158);
assert.match(settingsHtml,/data-vn-option-help/);
assert.equal((settingsHtml.match(/data-vn-option-tab=/g)||[]).length,7);
console.log('PASS original option background and atlas contract');

assert.deepEqual(vn.privateUI.titleMenu.order,['CONTINUE','NEXT','START','LOAD','SYSTEM','EXTRA','INFORMATION','EXIT']);
assert.match(home,/data-vn-next/);assert.match(home,/data-vn-no-next/);
assert.match(home,/data-vn-title-menu-original="false"/);
for(const [key,rect] of Object.entries(vn.privateUI.titleMenu.hover)){
 const [x,y,w,h]=rect;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=223&&y+h<=245,'Title atlas bounds '+key);
}
assert.equal(vn.privateUI.assets.choice.height,261);
assert.equal(vn.privateUI.assets.saveFrame.width,189);
assert.doesNotMatch(fs.readFileSync('dist/archives/index.html','utf8'),/__ginka_local_ui__/);
console.log('PASS title, choice and save atlas manifest');

assert.deepEqual(Object.keys(vn.privateUI.titleMenu.normal).sort(),vn.privateUI.titleMenu.order.slice().sort());
for(const [key,slice] of Object.entries(vn.privateUI.titleMenu.normal)){
 const [x,y,w,h]=slice.rect;
 assert.ok(x>=0&&y>=0&&x+w<=223&&y+h<=245&&[0,90].includes(slice.rotate),'Normal title glyph '+key);
}
assert.doesNotMatch(home,/title-(normal|hover)-.*\.png/);
console.log('PASS original normal glyph slices and isolation');

assert.equal(vn.privateUI.loadGeometry.columns*vn.privateUI.loadGeometry.rows,10);
const libraryHtml=fs.readFileSync('dist/library/index.html','utf8');
assert.equal((libraryHtml.match(/data-vn-empty-slot/g)||[]).length,10);
assert.match(libraryHtml,/data-vn-library-pages/);
assert.doesNotMatch(libraryHtml,/__ginka_local_ui__/);
for(const [key,slices] of Object.entries(vn.privateUI.slices))for(const [name,rect] of Object.entries(slices)){
 const [x,y,w,h]=rect,asset=vn.privateUI.assets[key];
 assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=asset.width&&y+h<=asset.height,'Atlas bounds '+key+' '+name);
}
console.log('PASS LOAD ten-slot layout and original sprite boundaries');

for(const key of ['display','program','text','sound','dialog','touch','shortcut'])for(const state of ['normal','selected','hover'])assert.ok(vn.privateUI.slices.optionTabs[key+'-'+state],'Missing option state');
assert.doesNotMatch(settingsHtml,/optionTabs-.*\.png|Labels-heading\.png/);
console.log('PASS original option tabs and footer sprite contract');

for(const route of posts){
 const html=fs.readFileSync(path.join('dist',route,'index.html'),'utf8');
 if(html.includes('data-vn-backlog')){assert.match(html,/data-vn-log-open/);assert.match(html,/data-vn-log-scrollport/);assert.doesNotMatch(html,/__ginka_local_ui__/);}
}
console.log('PASS original reader toolbar and backlog private isolation');
