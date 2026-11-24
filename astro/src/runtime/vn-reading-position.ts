import type {Position} from '../domain/reading-state';
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const absolute=(el:Element)=>el.getBoundingClientRect().top+scrollY;
function geometry(article:HTMLElement){
 const body=article.querySelector<HTMLElement>('.post-body');
 if(!body)return null;
 const top=absolute(body),end=top+body.getBoundingClientRect().height;
 const headings=Array.from(body.querySelectorAll<HTMLElement>('h2[id],h3[id],h4[id],h5[id],h6[id]'));
 return {top,end,headings};
}
const offset=()=>Math.min(100,innerHeight*.16);
export function capturePosition(article:HTMLElement):Position|null{
 const g=geometry(article);if(!g)return null;
 const y=scrollY+offset();
 let start=g.top,end=g.end,heading:string|null=null;
 for(const el of g.headings){
  const pos=absolute(el);
  if(pos<=y){start=pos;heading=el.id;}else{end=pos;break;}
 }
 return {ratio:clamp((y-g.top)/Math.max(1,g.end-g.top)),heading,section:clamp((y-start)/Math.max(1,end-start))};
}
export function restorePosition(article:HTMLElement,pos:Position){
 const g=geometry(article);if(!g)return;
 let y=g.top+pos.ratio*(g.end-g.top);
 if(pos.heading){
  const i=g.headings.findIndex(el=>el.id===pos.heading);
  if(i>=0){const start=absolute(g.headings[i]),end=i+1<g.headings.length?absolute(g.headings[i+1]):g.end;y=start+pos.section*(end-start);}
 }
 window.scrollTo({top:Math.max(0,y-offset()),behavior:'instant'});
}
