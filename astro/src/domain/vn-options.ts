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
