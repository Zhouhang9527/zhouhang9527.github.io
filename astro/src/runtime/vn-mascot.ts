import {KEY,parse} from '../domain/reading-state';
type Pose={base:string;blink:string|null;mouth:string|null};
type Line={id:string;speaker:string;text:string;pose:string;phase:'main'|'afterstory';voice:string};
type Pack={version:1;defaultPose:string;poses:Record<string,Pose>;lines:Line[]};
const VOL='ginka.vn.voice.volume.v1',SAVED='ginka.vn.voice.saved.v1',MUTE='ginka.vn.voice.mute.v1';
let pack:Pack|null=null,loading:Promise<void>|null=null,root:HTMLElement|null=null,audio:HTMLAudioElement|null=null,current:Line|null=null,open=false,volume=80,muted=false,frame=0,blinkTimer=0,blinkEnd=0,reveal=0,raf=0,ctx:AudioContext|null=null,analyser:AnalyserNode|null=null,lastPose='',generation=0;
const $=(s:string)=>root?.querySelector<HTMLElement>(s);
const reduce=()=>document.documentElement.dataset.vnMotion==='reduced'||matchMedia('(prefers-reduced-motion: reduce)').matches;
const cleared=()=>{try{return parse(localStorage.getItem(KEY)).mainCleared;}catch{return false;}};
const allowed=(line:Line)=>line.phase==='main'||cleared();
function readSettings(){try{const v=Number(localStorage.getItem(VOL)??80);volume=Number.isFinite(v)?Math.max(0,Math.min(100,v)):80;muted=localStorage.getItem(MUTE)==='1';}catch{}}
function saved():string[]{try{const v=JSON.parse(localStorage.getItem(SAVED)||'[]');return Array.isArray(v)?v.filter((x):x is string=>typeof x==='string').slice(0,100):[];}catch{return [];}}
function feedback(s:string){const el=$('[data-mascot-feedback]');if(el)el.textContent=s;}
function applyVolume(){if(audio){audio.volume=volume/100;audio.muted=muted;}}
function syncSettings(){
 const ready=!!current&&allowed(current);document.documentElement.toggleAttribute('data-vn-voice-ready',ready);document.dispatchEvent(new Event('vn:voice-state'));
 document.querySelectorAll<HTMLInputElement>('[data-vn-voice-volume]').forEach(e=>e.value=String(volume));
 document.querySelectorAll<HTMLOutputElement>('[data-vn-voice-value]').forEach(e=>e.value=String(volume));
 document.querySelectorAll<HTMLButtonElement>('[data-vn-voice-mute]').forEach(e=>{e.textContent=muted?'取消静音':'静音';e.setAttribute('aria-pressed',String(muted));});
 document.querySelectorAll<HTMLButtonElement>('[data-vn-voice-replay]').forEach(e=>e.disabled=!ready);
 document.querySelectorAll<HTMLElement>('[data-vn-voice-status]').forEach(e=>e.textContent=pack?'已连接本地原作语音':root?.dataset.mascotSource?'等待本地素材包加载':'原作语音需要本地素材包');
 for(const list of document.querySelectorAll<HTMLElement>('[data-vn-voice-saved]')){
  list.replaceChildren();for(const id of saved()){const l=pack?.lines.find(x=>x.id===id&&allowed(x));if(!l)continue;const b=document.createElement('button');b.type='button';b.dataset.vnVoiceSaved=id;b.textContent=l.speaker+' · '+l.text.slice(0,28);list.append(b);}
  if(!list.childElementCount)list.textContent='暂无语音收藏';
 }
 applyVolume();
}
function setImage(selector:string,url:string|null){const img=$('[data-mascot-'+selector+']') as HTMLImageElement|undefined;if(!img)return;if(url){if(img.getAttribute('src')!==url)img.src=url;}else img.removeAttribute('src');if(selector!=='base')img.hidden=true;}
function pose(id:string){const p=pack?.poses[id];if(!p||id===lastPose)return;lastPose=id;setImage('base',p.base);setImage('blink',p.blink);setImage('mouth',p.mouth);}
function stopReveal(){cancelAnimationFrame(reveal);reveal=0;}
function clearDialogue(){stopReveal();const name=document.querySelector<HTMLElement>('[data-vn-dialogue-speaker]'),text=document.querySelector<HTMLElement>('[data-vn-dialogue-text]');if(name)name.hidden=true;if(text)text.hidden=true;document.querySelectorAll<HTMLElement>('[data-vn-current-heading],[data-vn-game-description]').forEach(e=>e.hidden=false);const w=$('[data-mascot-window]');if(w)w.hidden=true;}
function renderLine(line:Line,animate:boolean){
 clearDialogue();pose(line.pose);
 const article=document.querySelector<HTMLElement>('[data-vn-game-window]'),dock=document.querySelector<HTMLElement>('[data-vn-game-reader]');
 const inGame=document.documentElement.dataset.vnMode!=='reader'&&!!article&&!article.hidden&&!!dock&&!dock.hidden;
 const speaker=inGame?article?.querySelector<HTMLElement>('[data-vn-dialogue-speaker]'):$('[data-mascot-speaker]');
 const text=inGame?article?.querySelector<HTMLElement>('[data-vn-dialogue-text]'):$('[data-mascot-text]');
 if(inGame){article?.querySelectorAll<HTMLElement>('[data-vn-current-heading],[data-vn-game-description]:not([data-vn-dialogue-text])').forEach(e=>e.hidden=true);if(speaker)speaker.hidden=false;if(text)text.hidden=false;}
 else{const w=$('[data-mascot-window]');if(w)w.hidden=false;}
 if(speaker)speaker.textContent=line.speaker;
 if(!text)return;const chars=Array.from(line.text);if(!animate||reduce()){text.textContent=line.text;return;}
 text.textContent='';let start=performance.now();
 function tick(now:number){if(!text?.isConnected||current!==line||!open)return;const count=Math.min(chars.length,Math.floor((now-start)/30)+1);text.textContent=chars.slice(0,count).join('');if(count<chars.length)reveal=requestAnimationFrame(tick);}
 reveal=requestAnimationFrame(tick);
}
function resetMouth(){const m=$('[data-mascot-mouth]');if(m)m.hidden=true;const base=$('[data-mascot-base]');if(base)base.hidden=false;}
function animateMouth(){cancelAnimationFrame(raf);if(!analyser||!audio||audio.paused||reduce()||muted||!open){resetMouth();return;}const data=new Uint8Array(analyser.fftSize);let prev=false;
 const tick=()=>{if(!audio||audio.paused||!open||!analyser){resetMouth();return;}analyser.getByteTimeDomainData(data);let sum=0;for(const n of data)sum+=((n-128)/128)**2;const amp=Math.sqrt(sum/data.length);const active=amp>(prev?.024:.045);prev=active;const mouth=$('[data-mascot-mouth]') as HTMLImageElement|undefined,base=$('[data-mascot-base]');if(mouth?.getAttribute('src')){mouth.hidden=!active;if(base)base.hidden=active;}raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
}
function scheduleBlink(){clearTimeout(blinkTimer);clearTimeout(blinkEnd);const blink=$('[data-mascot-blink]') as HTMLImageElement|undefined;if(blink)blink.hidden=true;if(!open||reduce()||!blink?.getAttribute('src'))return;
 blinkTimer=window.setTimeout(()=>{if(!open)return;const mouth=$('[data-mascot-mouth]');if(mouth?.hidden!==false){blink.hidden=false;const b=$('[data-mascot-base]');if(b)b.hidden=true;blinkEnd=window.setTimeout(()=>{blink.hidden=true;const m=$('[data-mascot-mouth]');if(b)b.hidden=m?.hidden===false;scheduleBlink();},130);}else scheduleBlink();},3000+Math.random()*3500);
}
async function play(line:Line,animate=true){
 if(!audio||!allowed(line))return;
 const token=++generation;current=line;open=true;const character=$('[data-mascot-character]');if(character)character.hidden=false;$('[data-mascot-action=open]')?.setAttribute('aria-expanded','true');renderLine(line,animate);scheduleBlink();syncSettings();
 audio.pause();audio.src=line.voice;applyVolume();
 try{if(!ctx&&typeof AudioContext!=='undefined'){ctx=new AudioContext();analyser=ctx.createAnalyser();analyser.fftSize=256;const node=ctx.createMediaElementSource(audio);node.connect(analyser);analyser.connect(ctx.destination);}if(ctx?.state==='suspended')void ctx.resume().catch(()=>{});await audio.play();if(token===generation)animateMouth();}
 catch{if(token===generation){feedback('语音未能播放，请点击 VOICE 重试');resetMouth();}}
}
function next(){const choices=pack?.lines.filter(allowed)||[];if(!choices.length)return;const index=choices.findIndex(x=>x.id===current?.id);void play(choices[(index+1)%choices.length]);}
function close(){open=false;generation++;audio?.pause();cancelAnimationFrame(raf);clearTimeout(blinkTimer);clearTimeout(blinkEnd);resetMouth();clearDialogue();const c=$('[data-mascot-character]');if(c)c.hidden=true;$('[data-mascot-action=open]')?.setAttribute('aria-expanded','false');}
function saveVoice(){if(!current||!allowed(current))return;try{localStorage.setItem(SAVED,JSON.stringify([current.id,...saved().filter(x=>x!==current?.id)].slice(0,100)));feedback('语音已收藏');syncSettings();}catch{feedback('无法保存语音收藏');}}
function action(a:string){if(a==='open'){if(open){close();return;}if(current&&allowed(current))void play(current,false);else next();}else if(a==='next')next();else if(a==='close')close();else if(a==='replay'&&current&&allowed(current))void play(current,false);else if(a==='save')saveVoice();}
function validURL(value:unknown):value is string{return typeof value==='string'&&/^\/__ginka_local_mascot__\/asset-\d+\.(png|webp|ogg|wav|mp3|m4a)$/.test(value);}
function mount(){
 root=document.querySelector<HTMLElement>('[data-ginka-mascot]');if(!root)return;
 const nextAudio=root.querySelector<HTMLAudioElement>('[data-mascot-audio]');if(audio!==nextAudio){audio=nextAudio;ctx=null;analyser=null;audio?.addEventListener('ended',resetMouth);audio?.addEventListener('pause',resetMouth);}
 if(pack){root.hidden=false;if(open&&current&&allowed(current))renderLine(current,false);syncSettings();return;}
 const source=root.dataset.mascotSource;if(!source||loading){syncSettings();return;}
 loading=fetch(source,{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Pack unavailable');const p=await r.json() as Pack;if(p.version!==1||!Array.isArray(p.lines)||!p.poses||!p.poses[p.defaultPose]||!Object.values(p.poses).every(v=>validURL(v.base)&&(!v.blink||validURL(v.blink))&&(!v.mouth||validURL(v.mouth)))||!p.lines.every(l=>typeof l.text==='string'&&validURL(l.voice)&&Object.hasOwn(p.poses,l.pose)))throw Error('Invalid pack');pack=p;pose(p.defaultPose);if(root)root.hidden=false;syncSettings();}).catch(()=>{feedback('本地看板娘素材包未就绪');}).finally(()=>{loading=null;});
}
document.addEventListener('click',event=>{const e=(event.target as Element|null)?.closest<HTMLElement>('[data-mascot-action],[data-vn-voice-mute],[data-vn-voice-replay],[data-vn-voice-saved]');if(!e)return;if(e.dataset.mascotAction){action(e.dataset.mascotAction);return;}if(e.hasAttribute('data-vn-voice-mute')){muted=!muted;try{localStorage.setItem(MUTE,muted?'1':'0');}catch{}syncSettings();return;}if(e.hasAttribute('data-vn-voice-replay'))action('replay');if(e.dataset.vnVoiceSaved){const line=pack?.lines.find(l=>l.id===e.dataset.vnVoiceSaved&&allowed(l));if(line)void play(line,false);}});
document.addEventListener('input',event=>{const e=event.target;if(!(e instanceof HTMLInputElement)||!e.matches('[data-vn-voice-volume]'))return;volume=Math.max(0,Math.min(100,Number(e.value)||0));try{localStorage.setItem(VOL,String(volume));}catch{}syncSettings();});
document.addEventListener('vn:voice-action',event=>action(String((event as CustomEvent).detail)));
document.addEventListener('astro:before-preparation',()=>{close();});
document.addEventListener('astro:page-load',mount);
document.addEventListener('vn:progress-reset',()=>{if(current&&!allowed(current)){close();current=null;}syncSettings();});
window.addEventListener('storage',()=>{readSettings();if(current&&!allowed(current)){close();current=null;}syncSettings();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio?.pause();resetMouth();}});
readSettings();mount();
