// Persisted v1 reading state. Old completed/last-only saves remain valid.
export type Position={ratio:number;heading:string|null;section:number};
export type Progress={version:1;completed:string[];last:string|null;recent:Record<string,number>;bookmarks:string[];positions:Record<string,Position>;mainCleared:boolean;afterstoryStarted:boolean};
export const KEY='ginka.vn.progress.v1';
export const LIMIT=100;
export const empty=():Progress=>({version:1,completed:[],last:null,recent:{},bookmarks:[],positions:{},mainCleared:false,afterstoryStarted:false});
export function isPath(value:unknown):value is string{
 if(typeof value!=='string'||!/^\/20\d{2}\/\d{2}\/\d{2}\/[^?#]+\/$/.test(value)||/[\\\u0000-\u001f\u007f]/.test(value))return false;
 try{const decoded=decodeURIComponent(value);return !/[\u0000-\u001f\u007f]/.test(decoded)&&!decoded.split('/').some(s=>s==='..'||s==='.'||s.includes('\\'));}catch{return false;}
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
  return {version:1,completed:paths(value.completed),last:isPath(value.last)?value.last:null,recent,bookmarks:paths(value.bookmarks),positions,mainCleared:value.mainCleared===true,afterstoryStarted:value.mainCleared===true&&value.afterstoryStarted===true};
 }catch{return empty();}
}
export function visit(state:Progress,path:string,stamp:number):Progress{
 if(!isPath(path)||!Number.isFinite(stamp)||stamp<0)return state;
 const recent=Object.fromEntries(Object.entries({...state.recent,[path]:stamp}).sort((a,b)=>b[1]-a[1]).slice(0,LIMIT));
 const positions=Object.fromEntries(Object.entries(state.positions).filter(([key])=>key in recent));
 return {...state,last:path,recent,positions};
}
export function savePosition(state:Progress,path:string,position:Position):Progress{
 if(!isPath(path)||!(path in state.recent)||!unit(position.ratio)||!unit(position.section)||!(position.heading===null||typeof position.heading==='string'&&position.heading.length<=512))return state;
 return {...state,positions:{...state.positions,[path]:{...position}}};
}

// A one-way local unlock: new articles and unmarking an old entry never revoke it.
export function unlockMain(state:Progress,required:readonly string[]):Progress{
 if(state.mainCleared||!required.length||!required.every(isPath))return state;
 const done=new Set(state.completed);return required.every(path=>done.has(path))?{...state,mainCleared:true}:state;
}
export function startAfterstory(state:Progress):Progress{return state.mainCleared&&!state.afterstoryStarted?{...state,afterstoryStarted:true}:state;}

// Blog-only presentation/unlocks. Never interpret these as original game flags,
// a chapter cursor, or proof of a character/outfit's original availability.
export function readingUnlocks(state:Pick<Progress,'mainCleared'|'afterstoryStarted'>){
 return {mainCleared:state.mainCleared===true,afterstoryStarted:state.mainCleared===true&&state.afterstoryStarted===true};
}
export function readingStage(state:Progress,required:readonly string[]){
 const done=new Set(state.completed),completed=new Set(required.filter(path=>done.has(path))).size;
 return {completed,total:required.length,stage:state.afterstoryStarted&&state.mainCleared?'afterstory':state.mainCleared?'main-cleared':completed?'reading':'unread'} as const;
}
// START reopens the reading route, not the global library or earned unlocks.
export function startReadingRun(state:Progress):Progress{return {...state,completed:[],last:null,positions:{}};}
export type ReadingStory={completed:string[];mainCleared:boolean;afterstoryStarted:boolean};
function parseReadingStory(raw:unknown):ReadingStory|null{
 const value=object(raw);
 if(!Array.isArray(value.completed)||!value.completed.every(isPath)||typeof value.mainCleared!=='boolean'||typeof value.afterstoryStarted!=='boolean'||value.afterstoryStarted&&!value.mainCleared)return null;
 return {completed:paths(value.completed),...readingUnlocks(value as ReadingStory)};
}
export function captureReadingStory(state:Progress):ReadingStory{return {completed:[...state.completed],...readingUnlocks(state)};}
export function restoreReadingStory(state:Progress,story?:ReadingStory):Progress{
 if(!story)return state;const snapshot=parseReadingStory(story);if(!snapshot)return state;
 // Reading completion is slot-local. Global unlocks are one-way until reset;
 // loading an earlier slot must not erase an earned unlock or restore favorites.
 const mainCleared=state.mainCleared||snapshot.mainCleared;
 return {...state,completed:snapshot.completed,mainCleared,afterstoryStarted:mainCleared&&(state.afterstoryStarted||snapshot.afterstoryStarted)};
}

// Independent user-selected save slots; automatic reading history is not a manual save.
export const SAVE_KEY='ginka.vn.saves.v1';
export const SAVE_PAGES=15,SAVE_PAGE_SIZE=10,SAVE_LIMIT=SAVE_PAGES*SAVE_PAGE_SIZE;
// Optional story extends v1 in place: legacy records still restore position only.
export type SaveRecord={path:string;position:Position;title:string;at:number;story?:ReadingStory};
export type SaveSlots=Record<string,SaveRecord>;
export function parseSaveRecord(raw:unknown):SaveRecord|null{
 const v=object(raw),p=object(v.position);
 if(!isPath(v.path)||typeof v.title!=='string'||!v.title.trim()||v.title.length>1024||typeof v.at!=='number'||!Number.isFinite(v.at)||v.at<0||!unit(p.ratio)||!unit(p.section)||!(p.heading===null||typeof p.heading==='string'&&p.heading.length<=512))return null;
 const story=v.story===undefined?undefined:parseReadingStory(v.story);
 if(story===null)return null;
 return {path:v.path,title:v.title,at:v.at,position:{ratio:p.ratio,section:p.section,heading:p.heading as string|null},...(story?{story}:{})};
}
export function validSlot(slot:number){return Number.isInteger(slot)&&slot>=0&&slot<SAVE_LIMIT;}
export function parseSaveSlots(raw:string|null):SaveSlots{
 try{const value=object(JSON.parse(raw||'null'));if(value.version!==1)return {};
  const out:SaveSlots={};
  for(const [key,entry] of Object.entries(object(value.slots))){const n=Number(key);if(!validSlot(n)||String(n)!==key)continue;const record=parseSaveRecord(entry);if(record)out[key]=record;}
  return out;
 }catch{return {};}
}
