export const optionPages=['display','program','text','sound','dialog','touch','shortcut'] as const;
export type OptionPage=typeof optionPages[number];
export const defaultTextSize=16;
export const defaultBgmVolume=88;
export function isOptionPage(value:unknown):value is OptionPage{return typeof value==='string'&&(optionPages as readonly string[]).includes(value);}
export function optionPage(value:unknown):OptionPage{return isOptionPage(value)?value:'display';}
export function textSize(value:unknown):number{const n=typeof value==='number'?value:typeof value==='string'&&value.trim()!==''?Number(value):NaN;return Number.isInteger(n)&&n>=14&&n<=22?n:defaultTextSize;}
export function resetPages(page:OptionPage,all:boolean):readonly OptionPage[]{const mutable:readonly OptionPage[]=['display','text','sound'];return all?mutable:mutable.includes(page)?[page]:[];}
export function optionReturn(raw:unknown,origin:string):string{
 if(typeof raw!=='string'||!raw)return '/';
 try{const url=new URL(raw,origin);if(url.origin!==origin||url.username||url.password||url.pathname==='/settings/'||url.pathname.startsWith('//')||url.pathname.startsWith('/__')||!url.pathname.endsWith('/'))return '/';return url.pathname+url.search+url.hash;}catch{return '/';}
}
