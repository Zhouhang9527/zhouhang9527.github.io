// Native modal semantics keep background focus and destructive actions safe.
export function confirmVN(message:string):Promise<boolean>{
 const dialog=document.querySelector<HTMLDialogElement>('[data-vn-confirm]');
 if(!dialog||typeof dialog.showModal!=='function')return Promise.resolve(window.confirm(message));
 if(dialog.open)return Promise.resolve(false);
 const text=dialog.querySelector<HTMLElement>('[data-vn-confirm-message]');if(text)text.textContent=message;
 dialog.returnValue='no';
 return new Promise(resolve=>{
  dialog.addEventListener('close',()=>resolve(dialog.returnValue==='yes'),{once:true});
  dialog.showModal();
 });
}
document.addEventListener('astro:before-preparation',()=>{const d=document.querySelector<HTMLDialogElement>('[data-vn-confirm][open]');if(d)d.close('no');});
