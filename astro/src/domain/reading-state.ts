// Persisted v1 reading state. Old completed/last-only saves remain valid.
export type Position={ratio:number;heading:string|null;section:number};
export type Progress={version:1;completed:string[];last:string|null;recent:Record<string,number>;bookmarks:string[];positions:Record<string,Position>};
export const KEY='ginka.vn.progress.v1';
export const LIMIT=100;
export const empty=():Progress=>({version:1,completed:[],last:null,recent:{},bookmarks:[],positions:{}});
export function isPath(value:unknown):value is string{
 if(typeof value!=='string'||!/^\/20\d{2}\/\d{2}\/\d{2}\/[^?#]+\/$/.test(value)||value.includes('\\'))return false;
 try{return !decodeURIComponent(value).split('/').some(s=>s==='..'||s==='.'||s.includes('\\'));}catch{return false;}
}
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const paths=(v:unknown)=>Array.isArray(v)?Array.from(new Set(v.filter(isPath))):[];
const unit=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1;
export function parse(raw:string|null):Progress{
 try{
  const value=object(JSON.parse(raw||'null'));
  if(value.version!==1||!Array.isArray(value.completed))return empty();
  const recent=Object.fromEntries(Object.entries(object(value.recent)).filter((entry):entry is [string,number]=>isPath(entry[0])&&typeof entry[1]==='number'&&Number.isFinite(entry[1])&&entry[1]>=0).sort((a,b)=>b[1]-a[1]).slice(0,LIMIT));
  const positions:Record<string,Position>={};
  for(const [path,rawPosition] of Object.entries(object(value.positions))){
   const p=object(rawPosition);
   if(!isPath(path)||!(path in recent)||!unit(p.ratio)||!unit(p.section))continue;
   positions[path]={ratio:p.ratio,section:p.section,heading:typeof p.heading==='string'&&p.heading.length<=512?p.heading:null};
  }
  return {version:1,completed:paths(value.completed),last:isPath(value.last)?value.last:null,recent,bookmarks:paths(value.bookmarks),positions};
 }catch{return empty();}
}
export function visit(state:Progress,path:string,stamp:number):Progress{
 if(!isPath(path))return state;
 const recent=Object.fromEntries(Object.entries({...state.recent,[path]:stamp}).sort((a,b)=>b[1]-a[1]).slice(0,LIMIT));
 const positions=Object.fromEntries(Object.entries(state.positions).filter(([key])=>key in recent));
 return {...state,last:path,recent,positions};
}
export function savePosition(state:Progress,path:string,position:Position):Progress{
 if(!isPath(path)||!(path in state.recent))return state;
 return {...state,positions:{...state.positions,[path]:position}};
}
