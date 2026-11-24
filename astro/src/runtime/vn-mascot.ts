import {KEY,parse} from '../domain/reading-state';
import {HISTORY_KEY,parseHistory,appendHistory} from '../domain/voice-history';
type Pose={character:'child'|'adult';phase:'main'|'afterstory';outfit:string;expression:string;gesture:string;base:string;blink:string|null;mouth:string|null;motion:{image:string;ms:number}[]};
type Line={id:string;speaker:string;text:string;pose:string;phase:'main'|'afterstory';voice:string};
type Pack={version:1;defaultPose:string;poses:Record<string,Pose>;lines:Line[]};
const VOL='ginka.vn.voice.volume.v1',SAVED='ginka.vn.voice.saved.v1',MUTE='ginka.vn.voice.mute.v1',CHAR='ginka.vn.mascot.character.v1',OUTFIT='ginka.vn.mascot.outfit.v1';
let character='all',outfit='all',motionTimer=0,motionIndex=0;
let pack:Pack|null=null,loading:Promise<void>|null=null,root:HTMLElement|null=null,audio:HTMLAudioElement|null=null,current:Line|null=null,open=false,volume=80,muted=false,blinkTimer=0,blinkEnd=0,reveal=0,raf=0,ctx:AudioContext|null=null,analyser:AnalyserNode|null=null,lastPose='',generation=0;
const $=(s:string)=>root?.querySelector<HTMLElement>(s);
let revealTarget:HTMLElement|null=null,readyFrames=new Set<string>(),frameGeneration=0;
const frameImage=(selector:string)=>$('[data-mascot-'+selector+']') as HTMLImageElement|undefined;
const frameUsable=(img:HTMLImageElement|undefined)=>!!img?.getAttribute('src')&&img.complete&&img.naturalWidth>0;
function stopMotion(){clearTimeout(motionTimer);motionTimer=0;}
function stopBlink(){clearTimeout(blinkTimer);clearTimeout(blinkEnd);blinkTimer=blinkEnd=0;const blink=frameImage('blink');if(blink)blink.hidden=true;}
function showFrame(kind:'base'|'blink'|'mouth'){
 const b=frameImage('base'),e=frameImage('blink'),m=frameImage('mouth');
 const showM=kind==='mouth'&&frameUsable(m),showE=kind==='blink'&&frameUsable(e);
 if(m)m.hidden=!showM;if(e)e.hidden=!showE;if(b)b.hidden=showM||showE;
}
function preloadPose(p:Pose){
 const token=++frameGeneration;readyFrames=new Set();
 // Fetch only the selected pose, not the entire private wardrobe.
 for(const url of new Set([p.base,p.blink,p.mouth,...p.motion.map(f=>f.image)])){
  if(!url)continue;const image=new Image();image.src=url;
  void image.decode().then(()=>{if(token===frameGeneration)readyFrames.add(url);}).catch(()=>{});
 }
}
const reduce=()=>document.documentElement.dataset.vnMotion==='reduced'||matchMedia('(prefers-reduced-motion: reduce)').matches;
const cleared=()=>{try{return parse(localStorage.getItem(KEY)).mainCleared;}catch{return false;}};
const poseAllowed=(p:Pose)=>p.phase==='main'||cleared();
const allowed=(line:Line)=>(line.phase==='main'||cleared())&&!!pack?.poses[line.pose]&&poseAllowed(pack.poses[line.pose]);
const choices=()=>pack?.lines.filter(l=>allowed(l)&&(character==='all'||pack?.poses[l.pose].character===character)&&(outfit==='all'||pack?.poses[l.pose].outfit===outfit))||[];
function readSettings(){try{const v=Number(localStorage.getItem(VOL)??80);volume=Number.isFinite(v)?Math.max(0,Math.min(100,v)):80;muted=localStorage.getItem(MUTE)==='1';character=localStorage.getItem(CHAR)||'all';outfit=localStorage.getItem(OUTFIT)||'all';}catch{}}
function saved():string[]{try{const v=JSON.parse(localStorage.getItem(SAVED)||'[]');return Array.isArray(v)?v.filter((x):x is string=>typeof x==='string').slice(0,100):[];}catch{return [];}}
function readHistory(){try{return parseHistory(localStorage.getItem(HISTORY_KEY));}catch{return [];}}
function recordHistory(line:Line){try{localStorage.setItem(HISTORY_KEY,JSON.stringify({version:1,entries:appendHistory(readHistory(),{id:line.id,at:Date.now(),path:location.pathname})}));}catch{}renderHistory();}
function renderHistory(){
 const rows=readHistory().flatMap(entry=>{const line=pack?.lines.find(l=>l.id===entry.id&&allowed(l));return line?[{entry,line}]:[];});
 document.querySelectorAll<HTMLElement>('[data-vn-log-history-tabs]').forEach(el=>el.hidden=!pack);
 for(const list of document.querySelectorAll<HTMLElement>('[data-vn-voice-history]')){
  const key=JSON.stringify(rows.map(({entry,line})=>[entry.at,entry.path,line.id,line.text,saved().includes(line.id)]));if(list.dataset.vnHistoryKey===key)continue;list.dataset.vnHistoryKey=key;
  const active=document.activeElement instanceof HTMLElement?document.activeElement:null,focused=active&&list.contains(active)?active.dataset.vnHistoryEntry:null,action=active?.dataset.vnVoiceHistorySave?'save':'replay';
  const fragment=document.createDocumentFragment();let focusTarget:HTMLButtonElement|undefined;
  for(const [index,{entry,line}] of rows.entries()){
   const row=document.createElement('article');row.className='vn-voice-history-row';const header=document.createElement('header'),name=document.createElement('strong'),time=document.createElement('small');name.textContent=line.speaker;time.textContent=new Date(entry.at).toLocaleString();header.append(name,time);
   const text=document.createElement('p');text.textContent=line.text;const nav=document.createElement('nav');
   const replay=document.createElement('button');replay.type='button';replay.dataset.vnVoiceHistoryReplay=line.id;replay.dataset.vnHistoryEntry=String(index)+':'+entry.at;replay.textContent='VOICE';replay.setAttribute('aria-label','回放 '+line.speaker+' 语音');
   const save=document.createElement('button');save.type='button';save.dataset.vnVoiceHistorySave=line.id;save.dataset.vnHistoryEntry=replay.dataset.vnHistoryEntry;save.textContent='V.SAVE';save.setAttribute('aria-label','收藏 '+line.speaker+' 语音');save.setAttribute('aria-pressed',String(saved().includes(line.id)));
   if(focused===replay.dataset.vnHistoryEntry)focusTarget=action==='save'?save:replay;
   nav.append(replay,save);row.append(header,text,nav);fragment.append(row);
  }
  if(!rows.length){const p=document.createElement('p');p.textContent=pack?'暂无实际播放记录':'原作语音需要本地素材包';fragment.append(p);}
  list.replaceChildren(fragment);focusTarget?.focus({preventScroll:true});
 }
}
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
 const available=Object.values(pack?.poses||{}).filter(poseAllowed);
 const fill=(selector:string,values:[string,string][],selected:string)=>{for(const el of document.querySelectorAll<HTMLSelectElement>(selector)){const options=values.map(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;return o;});el.replaceChildren(...options);el.value=values.some(([v])=>v===selected)?selected:'all';el.disabled=!pack;}};
 const characters:[string,string][]=[['all','全部']];if(available.some(p=>p.character==='child'))characters.push(['child','小银花']);if(available.some(p=>p.character==='adult'))characters.push(['adult','大银花']);if(!characters.some(([v])=>v===character))character='all';
 const outfits:[string,string][]=[['all','全部服装'],...Array.from(new Set(available.filter(p=>character==='all'||p.character===character).map(p=>p.outfit))).map(x=>[x,x] as [string,string])];if(!outfits.some(([v])=>v===outfit))outfit='all';
 fill('[data-vn-mascot-character]',characters,character);fill('[data-vn-mascot-outfit]',outfits,outfit);
 applyVolume();renderHistory();
}
function setImage(selector:string,url:string|null){const img=$('[data-mascot-'+selector+']') as HTMLImageElement|undefined;if(!img)return;if(url){if(img.getAttribute('src')!==url)img.src=url;}else img.removeAttribute('src');if(selector!=='base')img.hidden=true;}
function pose(id:string){const p=pack?.poses[id];if(!p||!poseAllowed(p))return;stopMotion();stopBlink();cancelAnimationFrame(raf);motionIndex=0;if(lastPose!==id)preloadPose(p);lastPose=id;setImage('base',p.base);setImage('blink',p.blink);setImage('mouth',p.mouth);showFrame('base');}
function startMotion(){stopMotion();const id=lastPose,p=pack?.poses[id];if(!p?.motion.length||reduce()||!open||document.hidden)return;const tick=()=>{if(!open||!audio?.paused||lastPose!==id||reduce()||document.hidden)return;const frame=p.motion[motionIndex++%p.motion.length];if(readyFrames.has(frame.image)&&frameImage('blink')?.hidden!==false&&frameImage('mouth')?.hidden!==false)setImage('base',frame.image);motionTimer=window.setTimeout(tick,frame.ms);};tick();}
function stopReveal(){cancelAnimationFrame(reveal);reveal=0;revealTarget=null;}
function finishReveal(){if(!revealTarget||!current)return false;revealTarget.textContent=current.text;stopReveal();return true;}
function clearDialogue(){stopReveal();const name=document.querySelector<HTMLElement>('[data-vn-dialogue-speaker]'),text=document.querySelector<HTMLElement>('[data-vn-dialogue-text]');if(name)name.hidden=true;if(text)text.hidden=true;document.querySelectorAll<HTMLElement>('[data-vn-current-heading],[data-vn-game-description]:not([data-vn-dialogue-text])').forEach(e=>e.hidden=false);const w=$('[data-mascot-window]');if(w)w.hidden=true;}
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
 text.textContent='';revealTarget=text;const start=performance.now();
 function tick(now:number){if(!text?.isConnected||current!==line||!open)return;const count=Math.min(chars.length,Math.floor((now-start)/30)+1);text.textContent=chars.slice(0,count).join('');if(count<chars.length)reveal=requestAnimationFrame(tick);else stopReveal();}
 reveal=requestAnimationFrame(tick);
}
function resetMouth(){cancelAnimationFrame(raf);raf=0;showFrame('base');}
function animateMouth(){cancelAnimationFrame(raf);if(!analyser||!audio||audio.paused||reduce()||muted||!open){resetMouth();return;}const data=new Uint8Array(analyser.fftSize);let prev=false;
 const tick=()=>{if(!audio||audio.paused||!open||!analyser||muted||reduce()||document.hidden){resetMouth();return;}analyser.getByteTimeDomainData(data);let sum=0;for(const n of data)sum+=((n-128)/128)**2;const amp=Math.sqrt(sum/data.length);const active=amp>(prev ? .024 : .045);prev=active;const mouth=$('[data-mascot-mouth]') as HTMLImageElement|undefined;if(frameUsable(mouth)){if(active)showFrame('mouth');else if(frameImage('blink')?.hidden!==false)showFrame('base');}raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
}
function scheduleBlink(){stopBlink();showFrame('base');if(!open||reduce()||document.hidden||!frameImage('blink')?.getAttribute('src'))return;
 blinkTimer=window.setTimeout(()=>{if(!open||reduce()||document.hidden)return;
  if(frameImage('mouth')?.hidden!==false&&frameUsable(frameImage('blink'))){showFrame('blink');blinkEnd=window.setTimeout(()=>{if(frameImage('blink')?.hidden===false)showFrame('base');scheduleBlink();},130);}else scheduleBlink();
 },3000+Math.random()*3500);
}
async function play(line:Line,animate=true){
 if(!audio||!allowed(line))return;
 const token=++generation;audio.pause();stopMotion();stopBlink();resetMouth();current=line;open=true;const character=$('[data-mascot-character]');if(character)character.hidden=false;$('[data-mascot-action=open]')?.setAttribute('aria-expanded','true');renderLine(line,animate);scheduleBlink();syncSettings();
 audio.src=line.voice;applyVolume();
 try{
  // Web Audio is optional: lack of analyser support must not block native playback.
  try{if(!ctx&&typeof AudioContext!=='undefined'){ctx=new AudioContext();analyser=ctx.createAnalyser();analyser.fftSize=256;const node=ctx.createMediaElementSource(audio);node.connect(analyser);analyser.connect(ctx.destination);}if(ctx?.state==='suspended')void ctx.resume().catch(()=>{});}catch{analyser=null;}
  await audio.play();if(token===generation&&!audio.paused&&open){recordHistory(line);animateMouth();}
 }
 catch{if(token===generation){feedback('语音未能播放，请点击 VOICE 重试');resetMouth();startMotion();}}
}
function next(){if(finishReveal())return;const lines=choices();if(!lines.length){feedback('当前角色和服装没有已验证语音');return;}const index=lines.findIndex(x=>x.id===current?.id);void play(lines[(index+1)%lines.length]);}
function close(restoreFocus=false){const focused=root?.contains(document.activeElement);open=false;generation++;stopMotion();stopBlink();audio?.pause();resetMouth();clearDialogue();const c=$('[data-mascot-character]');if(c)c.hidden=true;const launcher=$('[data-mascot-action=open]');launcher?.setAttribute('aria-expanded','false');if(restoreFocus&&focused)launcher?.focus({preventScroll:true});}
function saveVoice(line:Line|null=current){if(!line||!allowed(line))return;try{localStorage.setItem(SAVED,JSON.stringify([line.id,...saved().filter(x=>x!==line.id)].slice(0,100)));feedback('语音已收藏');syncSettings();}catch{feedback('无法保存语音收藏');}}
function action(a:string){if(a==='open'){if(open){close(true);return;}if(current&&choices().includes(current))void play(current,false);else next();}else if(a==='next')next();else if(a==='close')close(true);else if(a==='replay'&&current&&allowed(current))void play(current,false);else if(a==='save')saveVoice();}
function validURL(value:unknown):value is string{return typeof value==='string'&&/^\/__ginka_local_mascot__\/asset-\d+\.(png|webp|ogg|wav|mp3|m4a)$/.test(value);}
function mount(){
 root=document.querySelector<HTMLElement>('[data-ginka-mascot]');if(!root)return;
 const nextAudio=root.querySelector<HTMLAudioElement>('[data-mascot-audio]');if(audio!==nextAudio){generation++;stopMotion();stopBlink();resetMouth();audio?.pause();if(ctx)void ctx.close().catch(()=>{});cancelAnimationFrame(raf);audio=nextAudio;ctx=null;analyser=null;audio?.addEventListener('ended',()=>{resetMouth();startMotion();});audio?.addEventListener('pause',resetMouth);audio?.addEventListener('error',()=>{resetMouth();startMotion();});}
 if(pack){root.hidden=false;if(open&&current&&allowed(current))renderLine(current,false);syncSettings();return;}
 const source=root.dataset.mascotSource;if(!source||loading){syncSettings();return;}
 loading=fetch(source,{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Pack unavailable');const p=await r.json() as Pack;if(p.version!==1||!Array.isArray(p.lines)||!p.poses||!p.poses[p.defaultPose]||!Object.values(p.poses).every(v=>validURL(v.base)&&(!v.blink||validURL(v.blink))&&(!v.mouth||validURL(v.mouth))&&Array.isArray(v.motion)&&v.motion.every(f=>validURL(f.image)&&Number.isInteger(f.ms)&&f.ms>=40&&f.ms<=10000))||!p.lines.every(l=>typeof l.text==='string'&&validURL(l.voice)&&Object.hasOwn(p.poses,l.pose)))throw Error('Invalid pack');pack=p;pose(p.defaultPose);if(root)root.hidden=false;syncSettings();}).catch(()=>{feedback('本地看板娘素材包未就绪');}).finally(()=>{loading=null;});
}
document.addEventListener('click',event=>{const e=(event.target as Element|null)?.closest<HTMLElement>('[data-mascot-action],[data-vn-voice-mute],[data-vn-voice-replay],[data-vn-voice-saved],[data-vn-voice-history-replay],[data-vn-voice-history-save]');if(!e)return;if(e.dataset.vnVoiceHistoryReplay||e.dataset.vnVoiceHistorySave){const line=pack?.lines.find(l=>l.id===(e.dataset.vnVoiceHistoryReplay??e.dataset.vnVoiceHistorySave)&&allowed(l));if(line){if(e.dataset.vnVoiceHistorySave)saveVoice(line);else void play(line,false);}return;}if(e.dataset.mascotAction){action(e.dataset.mascotAction);return;}if(e.hasAttribute('data-vn-voice-mute')){muted=!muted;try{localStorage.setItem(MUTE,muted?'1':'0');}catch{}syncSettings();animateMouth();return;}if(e.hasAttribute('data-vn-voice-replay'))action('replay');if(e.dataset.vnVoiceSaved){const line=pack?.lines.find(l=>l.id===e.dataset.vnVoiceSaved&&allowed(l));if(line)void play(line,false);}});
document.addEventListener('change',event=>{const e=event.target;if(!(e instanceof HTMLSelectElement))return;if(e.matches('[data-vn-mascot-character]')){character=e.value;outfit='all';}else if(e.matches('[data-vn-mascot-outfit]'))outfit=e.value;else return;try{localStorage.setItem(CHAR,character);localStorage.setItem(OUTFIT,outfit);}catch{}if(current&&!choices().includes(current)){close();current=null;}syncSettings();});
document.addEventListener('input',event=>{const e=event.target;if(!(e instanceof HTMLInputElement)||!e.matches('[data-vn-voice-volume]'))return;volume=Math.max(0,Math.min(100,Number(e.value)||0));try{localStorage.setItem(VOL,String(volume));}catch{}syncSettings();});
document.addEventListener('vn:voice-action',event=>action(String((event as CustomEvent).detail)));
document.addEventListener('astro:before-preparation',()=>{close();});
document.addEventListener('astro:page-load',mount);
document.addEventListener('vn:view-change',()=>{if(open&&current&&allowed(current)){renderLine(current,false);scheduleBlink();if(audio?.paused)startMotion();else animateMouth();}});
document.addEventListener('vn:progress-reset',()=>{try{localStorage.removeItem(HISTORY_KEY);}catch{}if(current&&!allowed(current)){close();current=null;}syncSettings();});
window.addEventListener('storage',()=>{readSettings();if(current&&(!allowed(current)||!choices().includes(current))){close();current=null;}syncSettings();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){generation++;finishReveal();audio?.pause();stopMotion();stopBlink();resetMouth();}else if(open){scheduleBlink();startMotion();}});
readSettings();mount();
