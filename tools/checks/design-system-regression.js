'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p,'utf8');
const parse = s => Object.fromEntries([...s.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
const root = s => s.slice(s.indexOf('{')+1,s.indexOf('}'));
const editorial = read('source/css/ginka-editorial.css');
const theme = read('source/css/ginka-theme.css');
const pages = read('source/css/ginka-pages.css');
const day = {...parse(root(editorial.slice(editorial.indexOf(':root {')))),...parse(root(pages.slice(pages.indexOf(':root {'))))};
const dark = {...day,...parse(root(theme.slice(theme.indexOf("html[data-theme='moonlit'] {"))))};
function resolve(tokens,name,depth=0){
 if(depth>8)throw Error('Token cycle '+name);
 const value=tokens[name];
 if(!value)throw Error('Missing '+name);
 const alias=value.match(/^var\((--[\w-]+)\)$/);
 return alias?resolve(tokens,alias[1],depth+1):value;
}
function lum(hex){assert.match(hex,/^#[0-9a-f]{6}$/i);return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
function ratio(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const [mode,tokens] of [['day',day],['moonlit',dark]]){
 for(const [fg,bg,min] of [
 ['--ink','--paper',4.5],['--body-text','--paper',4.5],['--muted','--paper',4.5],
 ['--blue','--bg-canvas',4.5],['--journal-focus','--paper',3],
 ['--music-title','--music-bg',4.5],['--music-text','--music-bg',4.5],
 ['--music-muted','--music-bg',4.5],['--music-on-accent','--music-accent',4.5]
 ]){
  const r=ratio(resolve(tokens,fg),resolve(tokens,bg));assert.ok(r>=min,mode+' '+fg+' / '+bg+' '+r.toFixed(2)+' < '+min);
  console.log('PASS',mode,fg,bg,r.toFixed(2));
 }
}
assert.equal(day['--reading-font-size'],'16px');
assert.equal(day['--target-touch'],'44px');
assert.ok(read('source/css/ginka-reading.css').includes('font-size: var(--reading-font-size)'));
assert.ok(fs.existsSync('design-system/ginka/MASTER.md'));
console.log('PASS semantic design tokens (not a full rendered accessibility audit)');
