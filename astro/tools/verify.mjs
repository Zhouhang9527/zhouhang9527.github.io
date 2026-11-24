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
