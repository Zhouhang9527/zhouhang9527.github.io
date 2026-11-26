// SYSTEM is a view over the existing theme, music, voice and reading modules.
const TEXT_KEY='ginka.vn.text-size.v1',TAB_KEY='ginka.vn.option-tab.v1';
import {confirmVN} from './vn-confirm';
import {isPath} from '../domain/reading-state';
import {setVNFullscreen} from './vn-ui';
import {optionPages as tabs,optionPage,textSize as parseTextSize,resetPages,optionReturn,defaultTextSize,defaultBgmVolume,CONFIRM_KEY,parseConfirmations,isConfirmAction,defaultConfirmations,PLAYBACK_KEY,parsePlayback,defaultPlayback,type PlaybackOptions,type OptionPage} from '../domain/vn-options';
let currentPage:OptionPage='display',returnTarget=optionReturn(document.referrer,location.origin);
const help:Record<OptionPage,string>={display:'全屏、画面效果和阅读主题；原作画面保持固定色彩',program:'打开阅读索引与存档，选择已验证的看板娘',text:'调整实际正文文字大小，下方同步预览',sound:'控制现有背景音乐与语音播放器，不重复创建音频',dialog:'选择存读档确认方式；清除全部记录始终确认',touch:'点击选择，原生滑动浏览，不接管系统返回手势',shortcut:'菜单、页签和弹窗均可使用键盘操作'};
let textSize=defaultTextSize,playback=defaultPlayback();
function loadPlayback(){let raw=null;try{raw=localStorage.getItem(PLAYBACK_KEY);}catch{}playback=parsePlayback(raw);}
function publishPlayback(){persist(PLAYBACK_KEY,JSON.stringify({version:1,...playback}));document.dispatchEvent(new CustomEvent('vn:playback-change',{detail:{...playback}}));}
function feedback(message:string){const node=document.querySelector<HTMLElement>('[data-vn-option-feedback]');if(node)node.textContent=message;}
function persist(key:string,value:string){try{localStorage.setItem(key,value);return true;}catch{feedback('无法保存本机设置，请检查浏览器存储权限');return false;}}
function loadText(){textSize=defaultTextSize;try{textSize=parseTextSize(localStorage.getItem(TEXT_KEY));}catch{}}
function applyText(root:Document=document){root.documentElement.style.setProperty('--vn-reader-size',textSize+'px');}
function themeAPI(){return (window as Window&{GINKA_THEME?:{set:(v:string)=>void;mode:string}}).GINKA_THEME;}
function select(value:string,focus=false){
 const key=optionPage(value),config=document.querySelector<HTMLElement>('[data-vn-config]');if(!config)return;
 const previous=config.querySelector<HTMLElement>('[data-vn-option-panel]:not([hidden])');
 const moveFocus=focus||!!previous?.contains(document.activeElement)&&previous.dataset.vnOptionPanel!==key;
 currentPage=key;persist(TAB_KEY,key);
 config.querySelectorAll<HTMLButtonElement>('[data-vn-option-tab]').forEach(button=>{const selected=button.dataset.vnOptionTab===key;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;if(selected&&moveFocus)button.focus({preventScroll:true});});
 config.querySelectorAll<HTMLElement>('[data-vn-option-panel]').forEach(panel=>panel.hidden=panel.dataset.vnOptionPanel!==key);
 const heading=document.querySelector('[data-vn-option-heading]');if(heading)heading.textContent=key.toUpperCase();
 const title=document.getElementById('vn-option-title');if(title){title.dataset.vnHeadingKey=key;const suffix=title.querySelector('small');if(suffix)suffix.textContent=key==='shortcut'?'List':'Setting';}
 const desc=document.querySelector('[data-vn-option-help]');if(desc)desc.textContent=help[key];
}
function sync(){
 const config=document.querySelector<HTMLElement>('[data-vn-config]');if(!config)return;
 config.querySelectorAll<HTMLButtonElement>('[data-vn-window]').forEach(b=>{b.disabled=b.dataset.vnWindow==='full'&&!document.fullscreenEnabled;b.setAttribute('aria-pressed',String(b.dataset.vnWindow===(document.fullscreenElement?'full':'window')));});
 let theme=themeAPI()?.mode||'system';try{theme=localStorage.getItem('ginka-theme')||theme;}catch{}
 config.querySelectorAll<HTMLButtonElement>('[data-vn-theme]').forEach(b=>{b.disabled=!themeAPI();b.setAttribute('aria-pressed',String(b.dataset.vnTheme===theme));});
 const input=config.querySelector<HTMLInputElement>('[data-vn-text-size]');if(input)input.value=String(textSize);
 const output=config.querySelector<HTMLOutputElement>('[data-vn-text-value]');if(output)output.value=String(textSize);
 let raw=null;try{raw=localStorage.getItem(CONFIRM_KEY);}catch{}
 config.querySelectorAll<HTMLInputElement>('[data-vn-playback]').forEach(input=>{const key=input.dataset.vnPlayback as keyof PlaybackOptions;if(Object.hasOwn(playback,key)){if(input.type==='checkbox')input.checked=Boolean(playback[key]);else input.value=String(playback[key]);}});
 config.querySelectorAll<HTMLOutputElement>('[data-vn-playback-value]').forEach(output=>{const key=output.dataset.vnPlaybackValue as keyof PlaybackOptions;if(Object.hasOwn(playback,key))output.value=String(playback[key]);});
 const confirmation=parseConfirmations(raw);
 config.querySelectorAll<HTMLInputElement>('[data-vn-confirm-setting]').forEach(input=>{if(isConfirmAction(input.dataset.vnConfirmSetting))input.checked=confirmation[input.dataset.vnConfirmSetting];});
}
function mount(){
 applyText();let last='display';try{last=localStorage.getItem(TAB_KEY)||last;}catch{}select(location.hash.slice(1)||last);sync();
 const back=document.querySelector<HTMLAnchorElement>('[data-vn-option-back]');if(back){back.href=returnTarget;back.toggleAttribute('data-vn-resume',isPath(new URL(returnTarget,location.origin).pathname));}
}
document.addEventListener('astro:before-preparation',event=>{
 const e=event as Event&{from?:URL;to?:URL;navigationType?:string};
 if(e.to?.pathname==='/settings/'&&e.from?.pathname!=='/settings/'&&e.navigationType!=='traverse')returnTarget=optionReturn(e.from?.href,location.origin);
});
loadText();loadPlayback();mount();
document.addEventListener('click',async event=>{
 const el=(event.target as Element|null)?.closest<HTMLButtonElement>('[data-vn-option-tab],[data-vn-window],[data-vn-theme],[data-vn-option-default]');if(!el||el.disabled)return;
 if(el.dataset.vnOptionTab){const key=el.dataset.vnOptionTab;select(key);history.replaceState(history.state,'','#'+key);return;}
 if(el.dataset.vnWindow){await setVNFullscreen(el.dataset.vnWindow==='full');sync();return;}
 if(el.dataset.vnTheme){themeAPI()?.set(el.dataset.vnTheme);sync();return;}
 if(!el.hasAttribute('data-vn-option-default'))return;
 const config=el.closest('[data-vn-config]');if(!config)return;
 const all=event.shiftKey||el.dataset.vnOptionDefault==='all',pages=resetPages(currentPage,all);
 if(!pages.length){feedback('本页是功能入口或操作说明，没有可重置的设置');return;}
 // Deliberately no action argument: reset always asks, even with all toggles off.
 if(!await confirmVN(all?'恢复全部公共设置？不会清除阅读记录或语音收藏。':'恢复当前页默认设置？')||!config.isConnected)return;
 if(pages.includes('display')){
  for(const selector of ['input[name="vn-motion"][value="system"]','input[name="vn-mode"][value="game"]']){const radio=config.querySelector<HTMLInputElement>(selector);if(radio){radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));}}
  themeAPI()?.set('system');playback.effectSpeed=defaultPlayback().effectSpeed;if(document.fullscreenElement)await setVNFullscreen(false);
 }
 if(pages.includes('text')){textSize=defaultTextSize;persist(TEXT_KEY,String(textSize));applyText();const defaults=defaultPlayback();playback={...defaults,effectSpeed:playback.effectSpeed};}
 if(pages.includes('display')||pages.includes('text'))publishPlayback();
 if(pages.includes('sound')){
  const volume=config.querySelector<HTMLInputElement>('[data-vn-volume]');if(volume){volume.value=String(defaultBgmVolume);volume.dispatchEvent(new Event('input',{bubbles:true}));}
  document.dispatchEvent(new Event('vn:voice-defaults'));
 }
 if(pages.includes('dialog'))persist(CONFIRM_KEY,JSON.stringify({version:1,...defaultConfirmations()}));
 sync();feedback(all?'已恢复全部公共设置；阅读记录与语音收藏未改变':'已恢复当前页默认设置');
});
function updatePlayback(input:HTMLInputElement){
 const key=input.dataset.vnPlayback as keyof PlaybackOptions;if(!Object.hasOwn(playback,key))return;
 playback=parsePlayback(JSON.stringify({version:1,...playback,[key]:input.type==='checkbox'?input.checked:Number(input.value)}));publishPlayback();sync();
}
document.addEventListener('input',event=>{
 const input=event.target;if(!(input instanceof HTMLInputElement))return;
 if(input.matches('[data-vn-playback]')&&input.type!=='checkbox'){updatePlayback(input);return;}
 if(!input.matches('[data-vn-text-size]'))return;
 textSize=parseTextSize(input.value);persist(TEXT_KEY,String(textSize));applyText();sync();
});
document.addEventListener('change',event=>{
 const input=event.target;if(!(input instanceof HTMLInputElement))return;
 if(input.matches('[data-vn-playback]')&&input.type==='checkbox'){updatePlayback(input);return;}
 if(!isConfirmAction(input.dataset.vnConfirmSetting))return;
 let raw=null;try{raw=localStorage.getItem(CONFIRM_KEY);}catch{}
 const settings=parseConfirmations(raw);settings[input.dataset.vnConfirmSetting]=input.checked;
 if(persist(CONFIRM_KEY,JSON.stringify({version:1,...settings})))feedback('确认方式已保存');sync();
});
document.addEventListener('keydown',event=>{
 const target=event.target;if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||!(target instanceof HTMLButtonElement)||!target.matches('[data-vn-option-tab]'))return;
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
 const i=tabs.indexOf(optionPage(target.dataset.vnOptionTab));
 const step=event.key==='ArrowRight'||event.key==='ArrowDown'?1:-1;
 const index=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+step+tabs.length)%tabs.length;
 event.preventDefault();select(tabs[index],true);target.closest('[role=tablist]')?.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest',inline:'nearest'});history.replaceState(history.state,'','#'+tabs[index]);
});
document.addEventListener('fullscreenchange',sync);
document.addEventListener('ginka:themechange',sync);
document.addEventListener('astro:before-swap',event=>applyText((event as Event&{newDocument:Document}).newDocument));
document.addEventListener('astro:page-load',mount);
window.addEventListener('hashchange',()=>select(location.hash.slice(1)));
window.addEventListener('storage',event=>{if(event.key===TEXT_KEY||event.key===null){loadText();applyText();}if(event.key===PLAYBACK_KEY||event.key===null)loadPlayback();sync();});
export {};
