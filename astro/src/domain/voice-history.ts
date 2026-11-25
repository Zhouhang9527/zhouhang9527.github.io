// Only verified line IDs and playback metadata are persisted; no original text or audio.
export const HISTORY_KEY='ginka.vn.voice.history.v1';
export const HISTORY_LIMIT=100;
export type VoiceHistoryEntry={id:string;at:number;path:string|null};
const validId=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(v);
const validPath=(v:unknown):v is string=>typeof v==='string'&&v.startsWith('/')&&!v.startsWith('//')&&!v.includes('\\')&&!/[?#]/.test(v)&&v.length<=1024;
function entry(raw:unknown):VoiceHistoryEntry|null{
 if(!raw||typeof raw!=='object')return null;
 const v=raw as Record<string,unknown>;
 if(!validId(v.id)||typeof v.at!=='number'||!Number.isFinite(v.at)||v.at<0)return null;
 return {id:v.id,at:v.at,path:validPath(v.path)?v.path:null};
}
export function parseHistory(raw:string|null):VoiceHistoryEntry[]{
 try{const value=JSON.parse(raw||'null');if(value?.version!==1||!Array.isArray(value.entries))return [];
 return value.entries.map(entry).filter((v:VoiceHistoryEntry|null):v is VoiceHistoryEntry=>v!==null).slice(-HISTORY_LIMIT);}
 catch{return [];}
}
export function appendHistory(history:readonly VoiceHistoryEntry[],value:VoiceHistoryEntry):VoiceHistoryEntry[]{
 const next=entry(value);return next?[...history,next].slice(-HISTORY_LIMIT):history.slice(-HISTORY_LIMIT);
}
