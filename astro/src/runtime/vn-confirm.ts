import {CONFIRM_KEY,shouldConfirm,type ConfirmAction} from '../domain/vn-options';

let cancelPending:(()=>void)|null=null;
// One native modal, one outstanding decision. No delayed confirmation may
// commit an action after Astro has started leaving its source document.
export function confirmVN(message:string,action?:ConfirmAction):Promise<boolean>{
 if(cancelPending)return Promise.resolve(false);
 if(action){let raw=null;try{raw=localStorage.getItem(CONFIRM_KEY);}catch{}if(!shouldConfirm(action,raw))return Promise.resolve(true);}
 const dialog=document.querySelector<HTMLDialogElement>('[data-vn-confirm]');
 if(!dialog||typeof dialog.showModal!=='function')return Promise.resolve(window.confirm(message));
 if(dialog.open)return Promise.resolve(false);
 const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
 const text=dialog.querySelector<HTMLElement>('[data-vn-confirm-message]');if(text)text.textContent=message;
 dialog.returnValue='no';
 return new Promise(resolve=>{
  let settled=false;
  const finish=(accepted:boolean,restoreFocus=true)=>{
   if(settled)return;settled=true;cancelPending=null;dialog.removeEventListener('close',onClose);
   if(dialog.open)dialog.close(accepted?'yes':'no');
   if(restoreFocus&&opener?.isConnected&&!opener.closest('[hidden],[inert]')&&opener.getClientRects().length)opener.focus({preventScroll:true});
   resolve(accepted&&dialog.isConnected);
  };
  const onClose=()=>finish(dialog.returnValue==='yes');
  cancelPending=()=>finish(false,false);
  dialog.addEventListener('close',onClose);
  try{dialog.showModal();dialog.querySelector<HTMLElement>('[data-vn-confirm-no]')?.focus({preventScroll:true});}
  catch{finish(false);}
 });
}
document.addEventListener('keydown',event=>{
 const dialog=document.querySelector<HTMLDialogElement>('[data-vn-confirm][open]');if(!dialog||!dialog.contains(event.target as Node))return;
 if(event.repeat&&event.key==='Enter'){event.preventDefault();return;}
 if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
 const buttons=Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
 const current=buttons.indexOf(document.activeElement as HTMLButtonElement);if(current<0)return;
 event.preventDefault();buttons[(current+1)%buttons.length]?.focus();
});
document.addEventListener('astro:before-preparation',()=>cancelPending?.());
window.addEventListener('pagehide',()=>cancelPending?.());
