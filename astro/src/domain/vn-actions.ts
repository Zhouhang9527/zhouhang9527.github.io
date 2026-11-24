// Exact original SystemAction calls only. Never evaluate recovered TJS/PBD expressions.
export const readerActions={
 hold:'SystemAction.toggleHold()',save:'SystemAction.save()',load:'SystemAction.load()',
 qsave:'SystemAction.qsave()',qload:'SystemAction.qload()',xprev:'SystemAction.qmprev()',
 next:'SystemAction.qmnext()',auto:'SystemAction.auto()',skip:'SystemAction.skip()',
 log:'SystemAction.log()',option:'SystemAction.option()',hide:'SystemAction.hide()',
 vreplay:'SystemAction.vreplay()',vsave:'SystemAction.vsave()'
} as const;
export type ReaderAction=keyof typeof readerActions;
export function isReaderAction(value:unknown):value is ReaderAction{
 return typeof value==='string'&&Object.hasOwn(readerActions,value);
}
export function resolveOriginalAction(expression:unknown):ReaderAction|null{
 if(typeof expression!=='string')return null;
 for(const key of Object.keys(readerActions)){if(isReaderAction(key)&&readerActions[key]===expression)return key;}
 return null;
}
