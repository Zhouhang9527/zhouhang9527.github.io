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
assert.equal(vn.title.states[0].present,false);
for(const [i,state] of vn.title.states.entries()){
 assert.ok(!i||state.minCompleted>vn.title.states[i-1].minCompleted,'Title progress thresholds must increase');
 assert.equal(state.present,typeof state.expression==='string');
 assert.ok(!('slug' in state),'Title progress may not replace the background');
 if(state.asset){assert.ok(state.present);assert.ok(state.asset.src.startsWith('/images/ginka/'));assert.ok(fs.existsSync(path.join('dist',state.asset.src)),'Missing verified character difference');}
}
assert.match(home,/data-vn-cover="torii"/);
console.log('PASS fixed torii title and independent character state contract');
