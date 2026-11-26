export const optionPages=['display','program','text','sound','dialog','touch','shortcut'] as const;
export type OptionPage=typeof optionPages[number];
export const defaultTextSize=16;
export const defaultBgmVolume=88;
export function isOptionPage(value:unknown):value is OptionPage{return typeof value==='string'&&(optionPages as readonly string[]).includes(value);}
export function optionPage(value:unknown):OptionPage{return isOptionPage(value)?value:'display';}
export function textSize(value:unknown):number{const n=typeof value==='number'?value:typeof value==='string'&&value.trim()!==''?Number(value):NaN;return Number.isInteger(n)&&n>=14&&n<=22?n:defaultTextSize;}
export function resetPages(page:OptionPage,all:boolean):readonly OptionPage[]{const mutable:readonly OptionPage[]=['display','text','sound','dialog'];return all?mutable:mutable.includes(page)?[page]:[];}
export function optionReturn(raw:unknown,origin:string):string{
 if(typeof raw!=='string'||!raw)return '/';
 try{const url=new URL(raw,origin);if(url.origin!==origin||url.username||url.password||url.pathname==='/settings/'||url.pathname.startsWith('//')||url.pathname.startsWith('/__')||!url.pathname.endsWith('/'))return '/';return url.pathname+url.search+url.hash;}catch{return '/';}
}

// These five actions exist in the recovered DIALOG controls. All-on is the
// blog's safe default, not a claim about the original game's default values.
export const CONFIRM_KEY='ginka.vn.confirm.v1';
export const confirmActions=['overwrite','load','qsave','qload','delete'] as const;
export type ConfirmAction=typeof confirmActions[number];
export type Confirmations=Record<ConfirmAction,boolean>;
export const defaultConfirmations=():Confirmations=>({overwrite:true,load:true,qsave:true,qload:true,delete:true});
export function isConfirmAction(value:unknown):value is ConfirmAction{return typeof value==='string'&&(confirmActions as readonly string[]).includes(value);}
export function parseConfirmations(raw:string|null):Confirmations{
 const settings=defaultConfirmations();
 try{const value=JSON.parse(raw||'null');if(value?.version!==1)return settings;
  for(const key of confirmActions)if(typeof value[key]==='boolean')settings[key]=value[key];
 }catch{}return settings;
}
export function shouldConfirm(action:ConfirmAction,raw:string|null):boolean{return parseConfirmations(raw)[action];}

// Blog playback preferences over the existing clocks; these are not recovered
// original defaults. No second timer, store, audio object or scene flags.
export const PLAYBACK_KEY='ginka.vn.playback.v1';
export type PlaybackOptions={textRevealMs:number;autoGapMs:number;autoScrollSpeed:number;skipSeenOnly:boolean;effectSpeed:number};
export const defaultPlayback=():PlaybackOptions=>({textRevealMs:30,autoGapMs:700,autoScrollSpeed:45,skipSeenOnly:true,effectSpeed:1});
export function parsePlayback(raw:string|null):PlaybackOptions{
 const out=defaultPlayback();
 try{const value=JSON.parse(raw||'null');if(value?.version!==1)return out;
  for(const [key,min,max] of [['textRevealMs',0,100],['autoGapMs',0,5000],['autoScrollSpeed',10,180]] as const){const n=value[key];if(Number.isInteger(n)&&n>=min&&n<=max)out[key]=n;}
  if(typeof value.skipSeenOnly==='boolean')out.skipSeenOnly=value.skipSeenOnly;
  if([.5,.75,1,1.25,1.5,1.75,2].includes(value.effectSpeed))out.effectSpeed=value.effectSpeed;
 }catch{}return out;
}
