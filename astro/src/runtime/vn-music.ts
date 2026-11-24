// A read-only view over the existing, persistent audio controller.
// No new audio instance or playlist request is introduced here.
let observer:MutationObserver|null=null;
let abort:AbortController|null=null;
function dispose(){observer?.disconnect();observer=null;abort?.abort();abort=null;}
function mount(){
 dispose();
 const room=document.querySelector<HTMLElement>('[data-vn-music]');
 if(!room)return;
 const audio=document.querySelector<HTMLAudioElement>('#bg-music');
 const player=document.getElementById('music-player');
 if(!audio||!player)return;
 room.hidden=false;
 function sync(){
  if(!room?.isConnected||!audio)return;
  for(const [from,to] of [['#music-title','[data-vn-music-title]'],['.music-artist','[data-vn-music-artist]'],['#music-time','[data-vn-music-time]']]){
   const el=room.querySelector<HTMLElement>(to),value=player?.querySelector(from)?.textContent||'';
   if(el&&el.textContent!==value)el.textContent=value;
  }
  const cover=room.querySelector<HTMLImageElement>('[data-vn-music-cover]');
  const src=player?.querySelector<HTMLImageElement>('#music-cover img')?.getAttribute('src');
  if(cover){cover.hidden=!src;if(src&&cover.getAttribute('src')!==src)cover.src=src;}
  const progress=room.querySelector<HTMLProgressElement>('[data-vn-music-progress]');
  if(progress)progress.value=Number.isFinite(audio.duration)&&audio.duration>0?audio.currentTime/audio.duration:0;
  const toggle=room.querySelector<HTMLButtonElement>('[data-vn-music-action="music-toggle"]');
  if(toggle){toggle.textContent=audio.paused?'播放':'暂停';toggle.setAttribute('aria-pressed',String(!audio.paused));}
 }
 abort=new AbortController();
 const signal=abort.signal;
 for(const event of ['play','pause','timeupdate','loadedmetadata','volumechange','ended'])audio.addEventListener(event,sync,{signal});
 observer=new MutationObserver(sync);
 observer.observe(player,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['src']});
 sync();
}
document.addEventListener('click',event=>{
 const button=(event.target as Element|null)?.closest<HTMLButtonElement>('[data-vn-music-action]');
 if(!button)return;
 const id=button.dataset.vnMusicAction||'';
 if(['music-toggle','music-next','music-volume-toggle'].includes(id))document.getElementById(id)?.click();
});
document.addEventListener('astro:before-preparation',dispose);
document.addEventListener('astro:page-load',mount);
mount();
