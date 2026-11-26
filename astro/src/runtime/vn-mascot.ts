import {KEY,parse} from '../domain/reading-state';
import {HISTORY_KEY,parseHistory,appendHistory} from '../domain/voice-history';
import {computeMascotGeometry,projectMascotCamera} from '../lib/mascot-geometry';
import type {MascotProjectionInput} from '../lib/mascot-geometry';
import {SceneActionScheduler} from '../domain/vn-actions';
import type {SceneActionState,SceneActionFrame} from '../domain/vn-actions';
import {PLAYBACK_KEY,parsePlayback} from '../domain/vn-options';
let playback=parsePlayback(null);
type Part={image:string;x:number;y:number;blend:'over'|'replace'};
type Layer=Part&{slot:string;alternate:Part|null};
type Pose={layers:Layer[]|null;canvas:{width:number;height:number};baseOffset?:{x:number;y:number};character:'child'|'adult';phase:'main'|'afterstory';outfit:string;outfitLabel?:string;expression:string;gesture:string;base:string;blink:string|null;mouth:string|null;motion:{image:string;ms:number}[]};
type SceneBinding={initial:SceneActionState;actions:unknown[];projection:Omit<MascotProjectionInput,'canvas'>};
type Line={id:string;speaker:string;text:string;pose:string;phase:'main'|'afterstory';voice:string|null;sceneAction?:SceneBinding};
type Pack={version:1|2;defaultPose:string;poses:Record<string,Pose>;lines:Line[]};
const VOL='ginka.vn.voice.volume.v1',SAVED='ginka.vn.voice.saved.v1',MUTE='ginka.vn.voice.mute.v1',CHAR='ginka.vn.mascot.character.v1',OUTFIT='ginka.vn.mascot.outfit.v1',EXPR='ginka.vn.mascot.expression.v1',GESTURE='ginka.vn.mascot.gesture.v1';
let character='all',outfit='all',expression='all',gesture='all',motionTimer=0,motionIndex=0;
let pack:Pack|null=null,loading:Promise<void>|null=null,root:HTMLElement|null=null,audio:HTMLAudioElement|null=null,current:Line|null=null,open=false,volume=80,muted=false,reveal=0,lastPose='',generation=0,playingId:string|null=null;
const $=(s:string)=>root?.querySelector<HTMLElement>(s);
let openTrigger:HTMLElement|null=null,dialogueAuto=false,autoTimer=0;
let unavailable=false,layerToken=0,layerImages=new Map<string,HTMLImageElement>(),layerPose:Pose|null=null,layerPending=false;
// The original stand engine has eye/lip variables, but this pack has no verified timing/pairing.
// Render the observed normal layers only. Do not turn visually inspected alternatives into scripted animation.
const imageCache=new Map<string,HTMLImageElement>(),imagePending=new Map<string,Promise<HTMLImageElement>>();
function cacheImage(url:string,img:HTMLImageElement){
 imageCache.delete(url);imageCache.set(url,img);
 let pixels=[...imageCache.values()].reduce((sum,image)=>sum+image.naturalWidth*image.naturalHeight,0);
 while(imageCache.size>24||pixels>12_000_000&&imageCache.size>1){const key=imageCache.keys().next().value as string;const removed=imageCache.get(key)!;pixels-=removed.naturalWidth*removed.naturalHeight;imageCache.delete(key);}
}
function decodeImage(url:string):Promise<HTMLImageElement>{
 const ready=imageCache.get(url);if(ready){cacheImage(url,ready);return Promise.resolve(ready);}
 const pending=imagePending.get(url);if(pending)return pending;
 const img=new Image();img.src=url;
 const task=img.decode().then(()=>{cacheImage(url,img);return img;}).finally(()=>imagePending.delete(url));
 imagePending.set(url,task);return task;
}
function poseUrls(p:Pose){return [...new Set([p.base,...(p.layers||[]).map(l=>l.image)])];}
function renderState(value:'loading'|'ready'|'error'){
 const portrait=$('.ginka-mascot-portrait'),status=$('[data-mascot-render-status]');
 if(portrait){portrait.dataset.mascotRender=value;portrait.setAttribute('aria-busy',String(value==='loading'));}
 if(status){status.hidden=value==='ready';status.textContent=value==='loading'?'正在载入银花…':value==='error'?'立绘载入失败，点击重试':'';}
}
let portraitObserver:ResizeObserver|null=null,observedPortrait:HTMLElement|null=null;
let scene:SceneActionScheduler|null=null,sceneBinding:SceneBinding|null=null,sceneFrame:SceneActionFrame|null=null,commandIndex=0,hostTimestamp:number|null=null,revealElapsed=0;
function positionMedia(){
 const portrait=$('.ginka-mascot-portrait'),p=lastPose&&pack?.poses[lastPose];if(!portrait||!p||portrait.clientWidth<=0||portrait.clientHeight<=0)return;
 const viewport={width:portrait.clientWidth,height:portrait.clientHeight};
 let g=computeMascotGeometry({canvas:{...p.canvas,baseOffset:p.baseOffset},viewport}),matrix=g.matrix,opacity=1;
 if(sceneBinding&&sceneFrame){
  const p0=sceneBinding.projection,raw=projectMascotCamera({...p0,canvas:p.canvas,properties:{...p0.properties,...sceneFrame.objects.actor.properties},camera:{...p0.camera,...sceneFrame.camera.properties} as MascotProjectionInput['camera']});
  // Fit the explicit original stage into the blog portrait viewport; raw coordinates never become CSS deltas.
  g=computeMascotGeometry({canvas:p0.stage,viewport});const [a,b,c,d,e,f]=raw.matrix,k=g.scale;
  matrix=[k*a,k*b,k*c,k*d,k*e+g.drawRect.x,k*f+g.drawRect.y];opacity=raw.visible?raw.opacity:0;
 }
 for(const node of portrait.querySelectorAll<HTMLElement>('img,canvas')){node.style.inset='auto';node.style.left='0px';node.style.top='0px';node.style.width=p.canvas.width+'px';node.style.height=p.canvas.height+'px';node.style.objectFit='fill';node.style.objectPosition='initial';node.style.transformOrigin='0 0';node.style.transform='matrix('+matrix.join(',')+')';node.style.opacity=String(opacity);}
 portrait.dataset.mascotGeometry='shared';
}
function observePortrait(){
 const portrait=$('.ginka-mascot-portrait');if(portrait===observedPortrait)return;portraitObserver?.disconnect();observedPortrait=portrait??null;
 if(portrait&&typeof ResizeObserver!=='undefined'){portraitObserver??=new ResizeObserver(positionMedia);portraitObserver.observe(portrait);}
}
function drawLayers(){
 const canvas=$('[data-mascot-canvas]') as HTMLCanvasElement|undefined,p=layerPose;
 if(!open||!canvas||!p?.layers)return;
 const base=layerImages.get(p.base),context=canvas.getContext('2d');if(!base||!context)return;
 if(canvas.width!==p.canvas.width)canvas.width=p.canvas.width;if(canvas.height!==p.canvas.height)canvas.height=p.canvas.height;
 context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(base,p.baseOffset?.x??0,p.baseOffset?.y??0);
 for(const layer of p.layers){const image=layerImages.get(layer.image);if(!image)return;if(layer.blend==='replace')context.clearRect(layer.x,layer.y,image.naturalWidth,image.naturalHeight);context.drawImage(image,layer.x,layer.y);}
 canvas.dataset.mascotEye='false';canvas.dataset.mascotMouth='false';canvas.hidden=false;positionMedia();renderState('ready');
}
function loadLayers(p:Pose){
 const canvas=$('[data-mascot-canvas]') as HTMLCanvasElement|undefined,portrait=$('.ginka-mascot-portrait');
 if(p.layers&&layerPose===p&&(layerPending||layerImages.size)){if(!layerPending)drawLayers();return;}
 const token=++layerToken;layerPose=p.layers?p:null;layerImages=new Map();layerPending=false;
 portrait?.toggleAttribute('data-layered',!!p.layers);if(canvas)canvas.hidden=true;
 const active=()=>open&&token===layerToken&&lastPose!==''&&pack?.poses[lastPose]===p;
 if(!p.layers){renderState('loading');void decodeImage(p.base).then(()=>{if(active())renderState('ready');}).catch(()=>{if(active())renderState('error');});return;}
 const required=poseUrls(p),finish=(entries:readonly (readonly [string,HTMLImageElement])[])=>{if(!active())return;layerPending=false;layerImages=new Map(entries);drawLayers();};
 const cached=required.map(url=>[url,imageCache.get(url)] as const);
 if(cached.every((entry):entry is readonly [string,HTMLImageElement]=>!!entry[1])){finish(cached);return;}
 layerPending=true;renderState('loading');
 void Promise.all(required.map(async url=>[url,await decodeImage(url)] as const)).then(finish).catch(()=>{if(active()){layerPending=false;layerImages.clear();renderState('error');feedback('角色差分素材未能解码');}});
}
function warmNext(){
 const lines=choices(),index=lines.findIndex(x=>x.id===current?.id),next=lines[(index+1)%lines.length],p=next&&pack?.poses[next.pose];
 if(!p?.layers||p===layerPose)return;for(const url of poseUrls(p))void decodeImage(url).catch(()=>{});
}
let revealTarget:HTMLElement|null=null,dialogueView:string|undefined,readyFrames=new Set<string>(),frameGeneration=0;
const frameImage=(selector:string)=>$('[data-mascot-'+selector+']') as HTMLImageElement|undefined;
function stopMotion(){clearTimeout(motionTimer);motionTimer=0;}
function preloadPose(p:Pose){
 const token=++frameGeneration;readyFrames=new Set();
 for(const url of new Set([p.base,...p.motion.map(f=>f.image)])){void decodeImage(url).then(()=>{if(token===frameGeneration)readyFrames.add(url);}).catch(()=>{});}
}
const reduce=()=>document.documentElement.dataset.vnMotion==='reduced'||matchMedia('(prefers-reduced-motion: reduce)').matches;
const cleared=()=>{try{return parse(localStorage.getItem(KEY)).mainCleared;}catch{return false;}};
// Blog preview phase policy only; never an assertion about original outfit flags or character age.
const poseAllowed=(p:Pose)=>p.phase==='main'||cleared();
const allowed=(line:Line)=>(line.phase==='main'||cleared())&&!!pack?.poses[line.pose]&&poseAllowed(pack.poses[line.pose]);
const availablePoses=()=>Object.entries(pack?.poses||{}).filter(([,p])=>poseAllowed(p));
const matchingPose=(p:Pose)=>(character==='all'||p.character===character)&&(outfit==='all'||p.outfit===outfit)&&(expression==='all'||p.expression===expression)&&(gesture==='all'||p.gesture===gesture);
const choices=()=>pack?.lines.filter(l=>allowed(l)&&matchingPose(pack!.poses[l.pose]))||[];
function readSettings(){try{playback=parsePlayback(localStorage.getItem(PLAYBACK_KEY));const v=Number(localStorage.getItem(VOL)??80);volume=Number.isFinite(v)?Math.max(0,Math.min(100,v)):80;muted=localStorage.getItem(MUTE)==='1';character=localStorage.getItem(CHAR)||'all';outfit=localStorage.getItem(OUTFIT)||'all';expression=localStorage.getItem(EXPR)||'all';gesture=localStorage.getItem(GESTURE)||'all';}catch{}}
function persistSelection(){try{for(const [key,value] of [[CHAR,character],[OUTFIT,outfit],[EXPR,expression],[GESTURE,gesture]])localStorage.setItem(key,value);}catch{}}
function saved():string[]{try{const v=JSON.parse(localStorage.getItem(SAVED)||'[]');return Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(x)).slice(0,100):[];}catch{return [];}}
function readHistory(){try{return parseHistory(localStorage.getItem(HISTORY_KEY));}catch{return [];}}
function recordHistory(line:Line){try{localStorage.setItem(HISTORY_KEY,JSON.stringify({version:1,entries:appendHistory(readHistory(),{id:line.id,at:Date.now(),path:location.pathname})}));}catch{}renderHistory();}
function renderHistory(){
 const rows=readHistory().flatMap(entry=>{const line=pack?.lines.find(l=>l.id===entry.id&&!!l.voice&&allowed(l));return line?[{entry,line}]:[];});
 document.querySelectorAll<HTMLElement>('[data-vn-log-history-tabs]').forEach(el=>el.hidden=!pack?.lines.some(l=>l.voice&&allowed(l)));
 for(const list of document.querySelectorAll<HTMLElement>('[data-vn-voice-history]')){
  const key=JSON.stringify(rows.map(({entry,line})=>[entry.at,entry.path,line.id,line.text,saved().includes(line.id)]));
  if(list.dataset.vnHistoryKey!==key){
   list.dataset.vnHistoryKey=key;
   const active=document.activeElement instanceof HTMLElement?document.activeElement:null,focused=active&&list.contains(active)?active.dataset.vnHistoryEntry:null,action=active?.dataset.vnVoiceHistorySave?'save':'replay';
   const fragment=document.createDocumentFragment();let focusTarget:HTMLButtonElement|undefined;
   for(const [index,{entry,line}] of rows.entries()){
    const row=document.createElement('article');row.className='vn-voice-history-row';row.dataset.vnVoiceLine=line.id;
    const header=document.createElement('header'),name=document.createElement('strong'),time=document.createElement('small');name.textContent=line.speaker;time.textContent=new Date(entry.at).toLocaleString();header.append(name,time);
    const text=document.createElement('p');text.textContent=line.text;const nav=document.createElement('nav');
    const replay=document.createElement('button');replay.type='button';replay.dataset.vnVoiceHistoryReplay=line.id;replay.dataset.vnHistoryEntry=String(index)+':'+entry.at;replay.textContent='VOICE';replay.setAttribute('aria-label','回放 '+line.speaker+' 语音');
    const save=document.createElement('button');save.type='button';save.dataset.vnVoiceHistorySave=line.id;save.dataset.vnHistoryEntry=replay.dataset.vnHistoryEntry;save.textContent='V.SAVE';save.setAttribute('aria-label','收藏 '+line.speaker+' 语音');save.setAttribute('aria-pressed',String(saved().includes(line.id)));
    if(focused===replay.dataset.vnHistoryEntry)focusTarget=action==='save'?save:replay;
    nav.append(replay,save);row.append(header,text,nav);fragment.append(row);
   }
   if(!rows.length){const p=document.createElement('p');p.textContent=pack?'暂无实际播放记录':'原作语音需要本地素材包';fragment.append(p);}
   list.replaceChildren(fragment);focusTarget?.focus({preventScroll:true});
  }
  for(const row of list.querySelectorAll<HTMLElement>('.vn-voice-history-row')){const active=row.dataset.vnVoiceLine===playingId;row.dataset.playing=String(active);row.querySelector('[data-vn-voice-history-replay]')?.setAttribute('aria-pressed',String(active));}
 }
}
function feedback(s:string){const el=$('[data-mascot-feedback]');if(el)el.textContent=s;document.querySelectorAll<HTMLElement>('[data-vn-voice-feedback]').forEach(node=>node.textContent=s);}
function voiceStatus(){
 const playing=!!audio&&!audio.paused&&!audio.ended&&!audio.error;
 if(!playing)playingId=null;
 document.querySelectorAll<HTMLButtonElement>('[data-vn-voice-stop]').forEach(e=>e.disabled=!playing);
 document.querySelectorAll<HTMLElement>('[data-vn-voice-playing]').forEach(e=>e.textContent=playing&&current?.voice?'正在播放 · '+current.speaker:'语音未播放');renderHistory();
}
function stopVoice(){setAuto(false);generation++;audio?.pause();playingId=null;startMotion();voiceStatus();}
function applyVolume(){if(audio){audio.volume=volume/100;audio.muted=muted;}}
function syncSelection(){
 const available=availablePoses().map(([,p])=>p);
 const fill=(selector:string,values:[string,string][],selected:string)=>{for(const el of document.querySelectorAll<HTMLSelectElement>(selector)){const options=values.map(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;return o;});if(el.options.length!==options.length||options.some((o,i)=>el.options[i]?.value!==o.value||el.options[i]?.text!==o.text))el.replaceChildren(...options);el.value=selected;el.disabled=!pack;}};
 const characters:[string,string][]=[['all','全部']];if(available.some(p=>p.character==='child'))characters.push(['child','小银花']);if(available.some(p=>p.character==='adult'))characters.push(['adult','大银花']);if(!characters.some(([v])=>v===character))character='all';
 const byCharacter=available.filter(p=>character==='all'||p.character===character);
 const outfits:[string,string][]=[['all','全部服装'],...new Map(byCharacter.map(p=>[p.outfit,(character==='all'?(p.character==='child'?'小银花 · ':'大银花 · '):'')+(p.outfitLabel||p.outfit)])).entries()];if(!outfits.some(([v])=>v===outfit))outfit='all';
 const byOutfit=byCharacter.filter(p=>outfit==='all'||p.outfit===outfit),expressions:[string,string][]=[['all','全部表情'],...Array.from(new Set(byOutfit.map(p=>p.expression))).map(v=>[v,v] as [string,string])];if(!expressions.some(([v])=>v===expression))expression='all';
 const gestures:[string,string][]=[['all','全部姿势'],...Array.from(new Set(byOutfit.filter(p=>expression==='all'||p.expression===expression).map(p=>p.gesture))).map(v=>[v,v] as [string,string])];if(!gestures.some(([v])=>v===gesture))gesture='all';
 fill('[data-vn-mascot-character]',characters,character);fill('[data-vn-mascot-outfit]',outfits,outfit);fill('[data-vn-mascot-expression]',expressions,expression);fill('[data-vn-mascot-gesture]',gestures,gesture);
 // Selection is based on verified poses, not on which poses happen to have curated speech.
 document.querySelectorAll<HTMLButtonElement>('[data-mascot-action=preview]').forEach(e=>e.disabled=!available.some(matchingPose));
}
function syncSettings(){
 syncSelection();const ready=!!current?.voice&&allowed(current);document.documentElement.toggleAttribute('data-vn-voice-ready',ready);document.dispatchEvent(new Event('vn:voice-state'));
 document.querySelectorAll<HTMLInputElement>('[data-vn-voice-volume]').forEach(e=>e.value=String(volume));
 document.querySelectorAll<HTMLOutputElement>('[data-vn-voice-value]').forEach(e=>e.value=String(volume));
 document.querySelectorAll<HTMLButtonElement>('[data-vn-voice-mute]').forEach(e=>{e.textContent=muted?'取消静音':'静音';e.setAttribute('aria-pressed',String(muted));});
 document.querySelectorAll<HTMLButtonElement>('[data-vn-voice-replay],[data-mascot-action=replay],[data-mascot-action=save]').forEach(e=>e.disabled=!ready);
 document.querySelectorAll<HTMLButtonElement>('[data-mascot-action=save]').forEach(e=>e.setAttribute('aria-pressed',String(!!current&&saved().includes(current.id))));
 document.querySelectorAll<HTMLElement>('[data-vn-voice-status]').forEach(e=>e.textContent=pack?.lines.some(l=>l.voice&&allowed(l))?'已连接本地原作语音':unavailable?'原作素材尚未完成核验':pack?'当前素材仅有已验证文本，语音未匹配':root?.dataset.mascotSource?'等待本地素材包加载':'原作语音需要本地素材包');
 for(const list of document.querySelectorAll<HTMLElement>('div[data-vn-voice-saved]')){
  const rows=saved().flatMap(id=>{const l=pack?.lines.find(x=>x.id===id&&!!x.voice&&allowed(x));return l?[l]:[];}),key=JSON.stringify(rows.map(l=>l.id));if(list.dataset.savedKey===key)continue;list.dataset.savedKey=key;
  const fragment=document.createDocumentFragment();
  for(const l of rows){const row=document.createElement('div');row.className='vn-voice-saved-row';const b=document.createElement('button');b.type='button';b.dataset.vnVoiceSaved=l.id;b.textContent=l.speaker+' · '+l.text.slice(0,28);const remove=document.createElement('button');remove.type='button';remove.dataset.vnVoiceRemove=l.id;remove.textContent='移除';remove.setAttribute('aria-label','移除 '+l.speaker+' 语音收藏');row.append(b,remove);fragment.append(row);}
  if(!rows.length)fragment.append(document.createTextNode('暂无语音收藏'));list.replaceChildren(fragment);
 }
 applyVolume();voiceStatus();
}
function setImage(selector:string,url:string|null){const img=frameImage(selector);if(!img)return;if(url){if(img.getAttribute('src')!==url)img.src=url;}else img.removeAttribute('src');}
function pose(id:string){
 const p=pack?.poses[id];if(!p||!poseAllowed(p))return;stopMotion();motionIndex=0;if(!p.layers&&lastPose!==id)preloadPose(p);lastPose=id;loadLayers(p);setImage('base',p.layers?null:p.base);const base=frameImage('base');if(base)base.hidden=!!p.layers;positionMedia();
 const portrait=$('.ginka-mascot-portrait');if(portrait){portrait.dataset.mascotPose=id;portrait.setAttribute('aria-label',(p.character==='child'?'小银花':'大银花')+' · '+(p.outfitLabel||p.outfit)+' · '+p.expression+' · '+p.gesture+' · 下一句');}
}
function startMotion(){stopMotion();const id=lastPose,p=pack?.poses[id];if(!p?.motion.length||reduce()||!open||document.hidden)return;const tick=()=>{if(!open||!audio?.paused||lastPose!==id||reduce()||document.hidden)return;const frame=p.motion[motionIndex++%p.motion.length];if(readyFrames.has(frame.image))setImage('base',frame.image);motionTimer=window.setTimeout(tick,frame.ms);};tick();}
function sceneStatus(value:string){if(root)root.dataset.mascotScene=value;const status=$('[data-mascot-scene-status]');if(status)status.textContent=value==='static-verified'?'已核验：同记录静态相机快照（非动画）':value==='playing'?'正在播放已核验数值片段（非完整演出）':value==='complete'?'已核验数值片段已结束（非完整演出）':value==='stopped'?'数值演出已停止':value==='invalid'?'数值演出尚不受支持，保留静态立绘':'此句无已核验演出绑定；仅显示静态立绘';}
function stopScene(clear=true){scene?.cancel();sceneFrame=scene?.frame()??null;commandIndex=sceneBinding?.actions.length??0;hostTimestamp=null;if(clear){scene=null;sceneBinding=null;sceneFrame=null;}sceneStatus(clear?'unavailable':'stopped');}
function pumpScene(){
 if(!scene||!sceneBinding)return;
 while(commandIndex<sceneBinding.actions.length&&!scene.frame().waiting){const result=scene.dispatch(sceneBinding.actions[commandIndex++]);if(!result.ok)throw Error('Unsupported numeric scene');}
 sceneFrame=scene.frame();sceneStatus(!sceneBinding.actions.length?'static-verified':sceneFrame.active||commandIndex<sceneBinding.actions.length?'playing':'complete');
}
function startScene(line:Line){
 stopScene();positionMedia();if(!line.sceneAction)return;
 try{sceneBinding=line.sceneAction;commandIndex=0;scene=new SceneActionScheduler(sceneBinding.initial,{reducedMotion:reduce()});pumpScene();positionMedia();startHost();}
 catch{stopScene();sceneStatus('invalid');feedback('此句演出投影尚不受支持；保留已验证静态立绘');positionMedia();}
}
// One RAF owns both text reveal and the bounded numeric action host.
function startHost(){if(reveal||!open||document.hidden||!revealTarget&&!sceneFrame?.active)return;hostTimestamp=null;reveal=requestAnimationFrame(hostTick);}
function hostTick(now:number){
 reveal=0;if(!open||document.hidden){hostTimestamp=null;return;}
 const delta=hostTimestamp===null?0:Math.max(0,now-hostTimestamp);hostTimestamp=now;
 if(scene&&sceneFrame?.active){try{scene.advance(delta*playback.effectSpeed);pumpScene();positionMedia();}catch{stopScene();sceneStatus('invalid');feedback('演出投影未能继续，已停止');}}
 if(revealTarget&&current){revealElapsed+=delta;const chars=Array.from(current.text),count=playback.textRevealMs===0?chars.length:Math.min(chars.length,Math.floor(revealElapsed/playback.textRevealMs)+1);revealTarget.textContent=chars.slice(0,count).join('');if(count===chars.length){revealTarget=null;scheduleAuto();}}
 if(revealTarget||sceneFrame?.active)reveal=requestAnimationFrame(hostTick);else hostTimestamp=null;
}
function stopReveal(){revealTarget=null;revealElapsed=0;if(!sceneFrame?.active){cancelAnimationFrame(reveal);reveal=0;hostTimestamp=null;}}
function finishReveal(){if(!revealTarget||!current)return false;revealTarget.textContent=current.text;stopReveal();scheduleAuto();return true;}
function clearDialogue(){document.documentElement.removeAttribute('data-vn-mascot-dialogue');stopReveal();const name=document.querySelector<HTMLElement>('[data-vn-dialogue-speaker]'),text=document.querySelector<HTMLElement>('[data-vn-dialogue-text]');if(name)name.hidden=true;if(text)text.hidden=true;document.querySelectorAll<HTMLElement>('[data-vn-current-heading],[data-vn-game-description]:not([data-vn-dialogue-text])').forEach(e=>e.hidden=false);const w=$('[data-mascot-window]');if(w)w.hidden=true;}
function messageTargets(){
 dialogueView=document.documentElement.dataset.vnMode;clearDialogue();
 const article=document.querySelector<HTMLElement>('[data-vn-game-window]'),dock=document.querySelector<HTMLElement>('[data-vn-game-reader]'),inGame=document.documentElement.dataset.vnMode!=='reader'&&!!article&&!article.hidden&&!!dock&&!dock.hidden;
 if(inGame){document.documentElement.setAttribute('data-vn-mascot-dialogue','');article.querySelectorAll<HTMLElement>('[data-vn-current-heading],[data-vn-game-description]:not([data-vn-dialogue-text])').forEach(e=>e.hidden=true);}
 else{const w=$('[data-mascot-window]');if(w)w.hidden=false;}
 const speaker=inGame?article.querySelector<HTMLElement>('[data-vn-dialogue-speaker]'):$('[data-mascot-speaker]'),text=inGame?article.querySelector<HTMLElement>('[data-vn-dialogue-text]'):$('[data-mascot-text]');if(speaker)speaker.hidden=false;if(text)text.hidden=false;return {speaker,text};
}
function renderLine(line:Line,animate:boolean){
 const {speaker,text}=messageTargets();pose(line.pose);if(speaker)speaker.textContent=line.speaker;
 if(!text)return;if(!animate||reduce()||playback.textRevealMs===0){text.textContent=line.text;scheduleAuto();return;}
 text.textContent='';revealTarget=text;revealElapsed=0;startHost();
}
function openPortrait(){open=true;const c=$('[data-mascot-character]');if(c)c.hidden=false;$('[data-mascot-action=open]')?.setAttribute('aria-expanded','true');document.dispatchEvent(new Event('vn:mascot-open'));}
function previewSelection(){
 stopVoice();stopScene();current=null;const selected=availablePoses().find(([,p])=>matchingPose(p));if(!selected){syncSettings();feedback('当前选择没有已验证差分');return;}
 openPortrait();const {speaker,text}=messageTargets();pose(selected[0]);if(speaker)speaker.textContent='已验证差分预览';if(text)text.textContent='此处仅预览所选服装、表情和姿势；VOICE 仅播放同记录绑定的已验证对白。';feedback('');syncSettings();startMotion();
}
function cancelAutoTimer(){clearTimeout(autoTimer);autoTimer=0;}
function setAuto(value:boolean){dialogueAuto=value;cancelAutoTimer();document.documentElement.toggleAttribute('data-vn-mascot-auto',value);document.querySelectorAll<HTMLButtonElement>('[data-mascot-action=auto]').forEach(e=>e.setAttribute('aria-pressed',String(value)));document.dispatchEvent(new Event('vn:voice-state'));if(value)scheduleAuto();}
function scheduleAuto(){
 if(!dialogueAuto||autoTimer||!open||!current||document.hidden||revealTarget||current.voice&&!audio?.ended)return;
 const line=current,pool=choices(),index=pool.findIndex(l=>l.id===line.id);if(index<0||index===pool.length-1){setAuto(false);return;}
 // Blog-only navigation pause, not original scripted timing. Never auto-loop the curated pool.
 autoTimer=window.setTimeout(()=>{autoTimer=0;if(dialogueAuto&&open&&current===line&&allowed(pool[index+1]))void play(pool[index+1]);},playback.autoGapMs);
}
async function play(line:Line,animate=true,presentation=true,record=true){
 if(!audio||document.hidden||!allowed(line))return;
 if(!presentation)close();
 cancelAutoTimer();const token=++generation,element=audio;element.pause();playingId=null;stopMotion();current=line;feedback('');
 if(presentation){openPortrait();renderLine(line,animate);startScene(line);warmNext();}
 syncSettings();
 if(!line.voice){element.removeAttribute('src');element.load();feedback('此句原作录音尚未匹配');startMotion();scheduleAuto();return;}
 element.src=line.voice;applyVolume();
 try{await element.play();if(token!==generation||audio!==element||element.paused||document.hidden)return;playingId=line.id;if(record)recordHistory(line);voiceStatus();}
 catch{if(token===generation){feedback('语音未能播放，请点击 VOICE 重试');setAuto(false);startMotion();voiceStatus();}}
}
function next(){setAuto(false);if(open&&$('.ginka-mascot-portrait')?.dataset.mascotRender==='error'&&lastPose){pose(lastPose);return;}if(finishReveal())return;const lines=choices();if(!lines.length){previewSelection();feedback('当前差分没有同记录绑定的已验证对白');return;}const index=lines.findIndex(x=>x.id===current?.id);void play(lines[(index+1)%lines.length]);}
function close(restoreFocus=false){
 const focused=root?.contains(document.activeElement);setAuto(false);open=false;generation++;stopMotion();stopScene();cancelAnimationFrame(reveal);reveal=0;hostTimestamp=null;audio?.pause();playingId=null;clearDialogue();layerToken++;frameGeneration++;layerPending=false;layerPose=null;layerImages.clear();lastPose='';
 const c=$('[data-mascot-character]');if(c)c.hidden=true;const launcher=$('[data-mascot-action=open]');launcher?.setAttribute('aria-expanded','false');if(restoreFocus&&focused){const target=openTrigger?.isConnected?openTrigger:launcher;target?.focus({preventScroll:true});}openTrigger=null;voiceStatus();
}
function saveVoice(line:Line|null=current,remove=false){if(!line?.voice||!allowed(line))return;try{const existing=saved(),remaining=existing.filter(x=>x!==line.id),deleting=remove||existing.includes(line.id);localStorage.setItem(SAVED,JSON.stringify(deleting?remaining:[line.id,...remaining].slice(0,100)));feedback(deleting?'已移除语音收藏':'语音已收藏');syncSettings();}catch{feedback('无法更新语音收藏');}}
function action(a:string){
 if(a==='open'||a==='preview'){if(open){close(true);return;}if(!pack){unavailable=false;mount();return;}if(current&&choices().includes(current))void play(current,false,true,false);else next();}
 else if(a==='next')next();
 else if(a==='previous'){setAuto(false);const pool=choices(),index=pool.findIndex(l=>l.id===current?.id);if(open&&index>0)void play(pool[index-1]);}
 else if(a==='auto'){if(open&&current)setAuto(!dialogueAuto);}
 else if(a==='skip'){if(open){if(playback.skipSeenOnly&&current&&!readHistory().some(e=>e.id===current!.id)){feedback('仅跳过已实际播放的对白；当前句尚未播放');return;}finishReveal();stopScene(false);stopVoice();}}
 else if(a==='close')close(true);
 else if(a==='replay'&&current?.voice&&allowed(current)){setAuto(false);void play(current,false,true,false);}
 else if(a==='save')saveVoice();
}
function validURL(value:unknown):value is string{return typeof value==='string'&&/^\/__ginka_local_mascot__\/asset-\d+\.(png|webp|ogg|wav|mp3|m4a)$/.test(value);}
function validPack(p:Pack){
 const part=(v:Part)=>v&&validURL(v.image)&&Number.isInteger(v.x)&&Number.isInteger(v.y)&&['over','replace'].includes(v.blend);
 return p&&[1,2].includes(p.version)&&Array.isArray(p.lines)&&p.poses&&Object.hasOwn(p.poses,p.defaultPose)&&p.poses[p.defaultPose].phase==='main'&&Object.values(p.poses).every(v=>v&&['child','adult'].includes(v.character)&&['main','afterstory'].includes(v.phase)&&[v.outfit,v.expression,v.gesture].every(x=>typeof x==='string'&&!!x)&&v.canvas&&Number.isInteger(v.canvas.width)&&Number.isInteger(v.canvas.height)&&v.canvas.width>0&&v.canvas.height>0&&v.canvas.width*v.canvas.height<=32_000_000&&validURL(v.base)&&(!v.layers||(Array.isArray(v.layers)&&v.layers.every(part)))&&Array.isArray(v.motion)&&v.motion.every(f=>validURL(f.image)&&Number.isInteger(f.ms)&&f.ms>=40&&f.ms<=10000))&&p.lines.every(l=>l&&typeof l.id==='string'&&typeof l.speaker==='string'&&typeof l.text==='string'&&['main','afterstory'].includes(l.phase)&&(validURL(l.voice)||(p.version===2&&l.voice===null))&&Object.hasOwn(p.poses,l.pose)&&!(l.phase==='main'&&p.poses[l.pose].phase==='afterstory'));
}
function mount(){
 root=document.querySelector<HTMLElement>('[data-ginka-mascot]');if(!root)return;observePortrait();
 const nextAudio=root.querySelector<HTMLAudioElement>('[data-mascot-audio]');
 if(audio!==nextAudio){close();audio=nextAudio;if(audio){const element=audio;element.addEventListener('ended',()=>{if(audio!==element||!element.ended)return;playingId=null;startMotion();voiceStatus();scheduleAuto();});element.addEventListener('pause',()=>{if(audio===element&&element.paused)voiceStatus();});element.addEventListener('playing',()=>{if(audio===element)voiceStatus();});element.addEventListener('error',()=>{if(audio!==element||!element.error)return;generation++;setAuto(false);playingId=null;feedback('语音未能解码，请点击 VOICE 重试');startMotion();voiceStatus();});}}
 if(pack){root.hidden=false;if(open&&current&&allowed(current))renderLine(current,false);syncSettings();return;}
 const source=root.dataset.mascotSource;if(!source||loading||unavailable){syncSettings();return;}
 loading=fetch(source,{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Pack unavailable');const raw=await r.json();if(raw.available===false){unavailable=true;syncSettings();return;}if(!validPack(raw))throw Error('Invalid pack');pack=raw;if(root)root.hidden=false;syncSettings();}).catch(()=>{unavailable=true;if(root)root.hidden=false;feedback('本地看板娘素材包未就绪，点击银花重试');syncSettings();}).finally(()=>{loading=null;});
}
function refreshEligibility(){syncSelection();if(current&&(!allowed(current)||!choices().includes(current))||lastPose&&pack?.poses[lastPose]&&!poseAllowed(pack.poses[lastPose])){close();current=null;}syncSettings();}
document.addEventListener('click',event=>{
 const e=(event.target as Element|null)?.closest<HTMLElement>('[data-mascot-action],[data-vn-voice-mute],[data-vn-voice-replay],[data-vn-voice-saved],[data-vn-voice-remove],[data-vn-voice-stop],[data-vn-voice-history-replay],[data-vn-voice-history-save]');if(!e)return;
 if(e.dataset.vnVoiceHistoryReplay||e.dataset.vnVoiceHistorySave){const line=pack?.lines.find(l=>l.id===(e.dataset.vnVoiceHistoryReplay??e.dataset.vnVoiceHistorySave)&&!!l.voice&&allowed(l));if(line){if(e.dataset.vnVoiceHistorySave)saveVoice(line);else void play(line,false,false,false);}return;}
 if(e.dataset.mascotAction){if(!open&&['open','preview'].includes(e.dataset.mascotAction))openTrigger=e;action(e.dataset.mascotAction);return;}
 if(e.hasAttribute('data-vn-voice-mute')){muted=!muted;try{localStorage.setItem(MUTE,muted?'1':'0');}catch{}syncSettings();return;}
 if(e.hasAttribute('data-vn-voice-stop')){stopVoice();return;}
 if(e.hasAttribute('data-vn-voice-replay')&&current?.voice&&allowed(current)){void play(current,false,false,false);return;}
 if(e.dataset.vnVoiceSaved||e.dataset.vnVoiceRemove){const line=pack?.lines.find(l=>l.id===(e.dataset.vnVoiceSaved??e.dataset.vnVoiceRemove)&&!!l.voice&&allowed(l));if(line){if(e.dataset.vnVoiceRemove){saveVoice(line,true);document.querySelector<HTMLElement>('[data-vn-voice-replay]')?.focus({preventScroll:true});}else void play(line,false,false,false);}}
});
document.addEventListener('change',event=>{
 const e=event.target;if(!(e instanceof HTMLSelectElement))return;
 if(e.matches('[data-vn-mascot-character]')){character=e.value;outfit=expression=gesture='all';}else if(e.matches('[data-vn-mascot-outfit]')){outfit=e.value;expression=gesture='all';}else if(e.matches('[data-vn-mascot-expression]')){expression=e.value;gesture='all';}else if(e.matches('[data-vn-mascot-gesture]'))gesture=e.value;else return;
 syncSelection();persistSelection();previewSelection();
});
document.addEventListener('input',event=>{const e=event.target;if(!(e instanceof HTMLInputElement)||!e.matches('[data-vn-voice-volume]'))return;volume=Math.max(0,Math.min(100,Number(e.value)||0));try{localStorage.setItem(VOL,String(volume));}catch{}syncSettings();});
document.addEventListener('vn:voice-action',event=>action(String((event as CustomEvent).detail)));
document.addEventListener('vn:playback-change',event=>{const detail=(event as CustomEvent).detail;if(!detail||typeof detail!=='object'||Array.isArray(detail))return;try{playback=parsePlayback(JSON.stringify({...detail,version:1}));}catch{return;}cancelAutoTimer();if(playback.textRevealMs===0)finishReveal();scheduleAuto();});
document.addEventListener('vn:voice-defaults',()=>{volume=80;muted=false;try{localStorage.setItem(VOL,'80');localStorage.setItem(MUTE,'0');}catch{}syncSettings();});
document.addEventListener('vn:backlog-open',()=>{if(open)close();else stopVoice();});
document.addEventListener('vn:backlog-opened',()=>{if(open)close();else stopVoice();});
document.addEventListener('vn:backlog-close',stopVoice);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&open&&!event.defaultPrevented&&!document.querySelector('[data-vn-log-open=true],[data-vn-confirm][open]'))close(true);});
window.addEventListener('pagehide',()=>close());
document.addEventListener('astro:before-preparation',()=>close());
document.addEventListener('astro:page-load',mount);
document.addEventListener('vn:view-change',()=>{if(open&&dialogueView!==document.documentElement.dataset.vnMode){if(current&&allowed(current))renderLine(current,false);else previewSelection();}resyncMotion();});
document.addEventListener('vn:progress-reset',()=>{try{localStorage.removeItem(HISTORY_KEY);}catch{}refreshEligibility();});
document.addEventListener('vn:progress-change',refreshEligibility);
window.addEventListener('storage',()=>{readSettings();refreshEligibility();});
document.addEventListener('visibilitychange',()=>{document.documentElement.toggleAttribute('data-mascot-page-hidden',document.hidden);if(document.hidden){setAuto(false);generation++;finishReveal();audio?.pause();playingId=null;stopMotion();stopScene(false);cancelAnimationFrame(reveal);reveal=0;hostTimestamp=null;voiceStatus();}else if(open)startMotion();});
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
function resyncMotion(){if(!open)return;try{scene?.setReducedMotion(reduce());if(scene){pumpScene();positionMedia();startHost();}}catch{stopScene();sceneStatus('invalid');feedback('演出投影未能继续，已停止');positionMedia();}if(reduce()){stopMotion();finishReveal();}else if(audio?.paused)startMotion();}
motionPreference.addEventListener('change',resyncMotion);
document.documentElement.toggleAttribute('data-mascot-page-hidden',document.hidden);
readSettings();mount();
