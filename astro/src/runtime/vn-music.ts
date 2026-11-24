// CONFIG/SOUND is a view over the persistent player; it never creates audio.
let observer:MutationObserver|null=null,abort:AbortController|null=null;
function dispose(){observer?.disconnect();observer=null;abort?.abort();abort=null;}
function mount(){
 dispose();
 const room=document.querySelector<HTMLElement>('[data-vn-music]');
 const audio=document.querySelector<HTMLAudioElement>('#bg-music');
 const player=document.getElementById('music-player');
 if(!room||!audio||!player)return;
 let signature='';
 function sync(){
  if(!room?.isConnected||!audio||!player)return;
  for(const [from,to] of [['#music-title','[data-vn-music-title]'],['.music-artist','[data-vn-music-artist]'],['#music-time','[data-vn-music-time]']]){
   const el=room.querySelector<HTMLElement>(to),value=player.querySelector(from)?.textContent||'';
   if(el&&el.textContent!==value)el.textContent=value;
  }
  const slider=player.querySelector<HTMLInputElement>('#music-volume-slider');
  const volume=room.querySelector<HTMLInputElement>('[data-vn-volume]');
  const output=room.querySelector<HTMLOutputElement>('[data-vn-volume-value]');
  if(slider&&volume){volume.value=slider.value;if(output)output.value=slider.value;}
  const progress=room.querySelector<HTMLProgressElement>('[data-vn-music-progress]');
  if(progress)progress.value=Number.isFinite(audio.duration)&&audio.duration>0?audio.currentTime/audio.duration:0;
  const toggle=room.querySelector<HTMLButtonElement>('[data-vn-music-action="music-toggle"]');
  if(toggle){toggle.textContent=audio.paused?'播放':'暂停';toggle.setAttribute('aria-pressed',String(!audio.paused));}
  const mute=room.querySelector<HTMLButtonElement>('[data-vn-music-action="music-volume-toggle"]');
  if(mute){const muted=Number(slider?.value??100)===0;mute.textContent=muted?'取消静音':'静音';mute.setAttribute('aria-pressed',String(muted));}
  const list=room.querySelector<HTMLElement>('[data-vn-track-list]');
  const tracks=Array.from(player.querySelectorAll<HTMLButtonElement>('.music-playlist-item[data-index]'));
  const state=player.dataset.ginkaMusicState;
  const next=JSON.stringify(tracks.map(t=>[t.dataset.index,t.textContent,t.className]));
  if(list&&next!==signature){
   signature=next;
   const fragment=document.createDocumentFragment();
   for(const track of tracks){
    const button=document.createElement('button');button.type='button';button.dataset.vnTrack=track.dataset.index;
    button.textContent=track.querySelector('.music-playlist-title')?.textContent||track.textContent;
    button.setAttribute('aria-pressed',String(track.classList.contains('is-active')));
    fragment.append(button);
   }
   list.replaceChildren(fragment);
  }
  const status=room.querySelector<HTMLElement>('[data-vn-track-status]');
  if(status){status.hidden=tracks.length>0;status.textContent=state==='error'?'歌单暂时无法加载，可刷新重试':state==='ready'?'暂无曲目':'正在读取歌单';}
 }
 abort=new AbortController();
 const signal=abort.signal;
 for(const event of ['play','pause','timeupdate','loadedmetadata','volumechange','ended'])audio.addEventListener(event,sync,{signal});
 observer=new MutationObserver(sync);
 observer.observe(player,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','data-ginka-music-state']});
 sync();
}
document.addEventListener('click',event=>{
 const button=(event.target as Element|null)?.closest<HTMLButtonElement>('[data-vn-music-action],[data-vn-track]');
 if(!button)return;
 if(button.hasAttribute('data-vn-track')){
  Array.from(document.querySelectorAll<HTMLButtonElement>('#music-playlist-items [data-index]')).find(el=>el.dataset.index===button.dataset.vnTrack)?.click();return;
 }
 const id=button.dataset.vnMusicAction||'';
 if(['music-toggle','music-next','music-volume-toggle','music-source-retry'].includes(id))document.getElementById(id)?.click();
});
document.addEventListener('input',event=>{
 const input=event.target;if(!(input instanceof HTMLInputElement)||!input.matches('[data-vn-volume]'))return;
 const source=document.querySelector<HTMLInputElement>('#music-volume-slider');
 if(source){source.value=input.value;source.dispatchEvent(new Event('input',{bubbles:true}));}
 const output=document.querySelector<HTMLOutputElement>('[data-vn-volume-value]');if(output)output.value=input.value;
});
document.addEventListener('astro:before-preparation',dispose);
document.addEventListener('astro:page-load',mount);
mount();
export {};
