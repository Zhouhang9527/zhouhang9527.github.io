// KAG-style option pages. Only settings that actually affect the blog are exposed.
const TEXT_KEY='ginka.vn.text-size.v1',TAB_KEY='ginka.vn.option-tab.v1';
const tabs=['display','program','text','sound','dialog','touch','shortcut'];
const help:Record<string,string>={display:'调整画面尺寸、主题与表现方式',program:'打开阅读索引与存档',text:'调整正文文字大小',sound:'设置背景音乐音量，选择播放曲目',dialog:'管理阅读存档，清除前将确认',touch:'查看触屏操作方式',shortcut:'查看键盘操作方式'};
let textSize=16;
function loadText(){try{const value=Number(localStorage.getItem(TEXT_KEY)||16);textSize=Number.isInteger(value)&&value>=14&&value<=22?value:16;}catch{}}
function applyText(root:Document=document){root.documentElement.style.setProperty('--vn-reader-size',textSize+'px');}
function select(key:string,focus=false){
 if(!tabs.includes(key))key='display';
 const config=document.querySelector<HTMLElement>('[data-vn-config]');if(!config)return;
 try{localStorage.setItem(TAB_KEY,key);}catch{}
 config.querySelectorAll<HTMLButtonElement>('[data-vn-option-tab]').forEach(button=>{const selected=button.dataset.vnOptionTab===key;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;if(selected&&focus)button.focus();});
 config.querySelectorAll<HTMLElement>('[data-vn-option-panel]').forEach(panel=>panel.hidden=panel.dataset.vnOptionPanel!==key);
 const heading=document.querySelector('[data-vn-option-heading]');if(heading)heading.textContent=key.toUpperCase();
 const title=document.getElementById('vn-option-title');if(title){title.dataset.vnHeadingKey=key;const suffix=title.querySelector('small');if(suffix)suffix.textContent=key==='shortcut'?'List':'Setting';}
 const desc=document.querySelector('[data-vn-option-help]');if(desc)desc.textContent=help[key];
}
function sync(){
 const config=document.querySelector<HTMLElement>('[data-vn-config]');if(!config)return;
 config.querySelectorAll<HTMLButtonElement>('[data-vn-window]').forEach(b=>{b.disabled=b.dataset.vnWindow==='full'&&!document.fullscreenEnabled;b.setAttribute('aria-pressed',String(b.dataset.vnWindow===(document.fullscreenElement?'full':'window')));});
 let theme='system';try{theme=localStorage.getItem('ginka-theme')||'system';}catch{}
 config.querySelectorAll<HTMLButtonElement>('[data-vn-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.vnTheme===theme)));
 const input=config.querySelector<HTMLInputElement>('[data-vn-text-size]');if(input)input.value=String(textSize);
 const output=config.querySelector<HTMLOutputElement>('[data-vn-text-value]');if(output)output.value=String(textSize);
}
function mount(){applyText();let last='display';try{last=localStorage.getItem(TAB_KEY)||last;}catch{}select(location.hash.slice(1)||last);sync();}
loadText();mount();
document.addEventListener('click',event=>{
 const el=(event.target as Element|null)?.closest<HTMLButtonElement>('[data-vn-option-tab],[data-vn-window],[data-vn-theme],[data-vn-option-default]');if(!el)return;
 if(el.dataset.vnOptionTab){const key=el.dataset.vnOptionTab;select(key);history.replaceState(history.state,'','#'+key);return;}
 if(el.dataset.vnWindow==='full'){if(document.fullscreenEnabled&&!document.fullscreenElement)void document.documentElement.requestFullscreen().catch(()=>{});return;}
 if(el.dataset.vnWindow==='window'){if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});return;}
 if(el.dataset.vnTheme){const api=(window as Window&{GINKA_THEME?:{set:(v:string)=>void}}).GINKA_THEME;api?.set(el.dataset.vnTheme);sync();return;}
 if(el.hasAttribute('data-vn-option-default')){
  const config=el.closest('[data-vn-config]');if(!config)return;
  for(const selector of ['input[name="vn-motion"][value="system"]','input[name="vn-mode"][value="game"]']){const radio=config.querySelector<HTMLInputElement>(selector);if(radio){radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));}}
  const input=config.querySelector<HTMLInputElement>('[data-vn-text-size]');if(input){input.value='16';input.dispatchEvent(new Event('input',{bubbles:true}));}
  const volume=config.querySelector<HTMLInputElement>('[data-vn-volume]');if(volume){volume.value='88';volume.dispatchEvent(new Event('input',{bubbles:true}));}
  sync();
 }
});
document.addEventListener('input',event=>{
 const input=event.target;if(!(input instanceof HTMLInputElement)||!input.matches('[data-vn-text-size]'))return;
 textSize=Math.max(14,Math.min(22,Number(input.value)||16));try{localStorage.setItem(TEXT_KEY,String(textSize));}catch{}applyText();sync();
});
document.addEventListener('keydown',event=>{
 const target=event.target;if(!(target instanceof HTMLButtonElement)||!target.matches('[data-vn-option-tab]'))return;
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 const i=tabs.indexOf(target.dataset.vnOptionTab||'');if(i<0)return;
 const index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
 event.preventDefault();select(tabs[index],true);history.replaceState(history.state,'','#'+tabs[index]);
});
document.addEventListener('fullscreenchange',sync);
document.addEventListener('astro:before-swap',event=>applyText((event as Event&{newDocument:Document}).newDocument));
document.addEventListener('astro:page-load',mount);
window.addEventListener('hashchange',()=>select(location.hash.slice(1)));
window.addEventListener('storage',event=>{if(event.key===TEXT_KEY||event.key===null){loadText();applyText();}sync();});
export {};
