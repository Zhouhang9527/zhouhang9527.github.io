// Optional original grayscale rule texture. The blend is a threshold wipe,
// not a crossfade. Duration/softness are a provisional blog adaptation.
const W=320,H=180,DURATION=320,SOFTNESS=.13;
let rule:Uint8Array|null=null,source='',pending=0,frame=0,canvas:HTMLCanvasElement|null=null;
function clear(){cancelAnimationFrame(frame);frame=0;canvas?.remove();canvas=null;}
function reduced(){return matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.vnMotion==='reduced';}
async function prepare(){
 const url=document.body.dataset.vnMask||'';
 if(url===source)return;
 source=url;rule=null;const token=++pending;
 if(!url)return;
 try{
  const image=new Image();image.src=url;await image.decode();
  if(token!==pending)return;
  const buffer=document.createElement('canvas');buffer.width=W;buffer.height=H;
  const ctx=buffer.getContext('2d',{willReadFrequently:true});if(!ctx)return;
  ctx.drawImage(image,0,0,W,H);
  const rgba=ctx.getImageData(0,0,W,H).data;
  rule=Uint8Array.from({length:W*H},(_,i)=>rgba[i*4]);
 }catch{if(token===pending)rule=null;}
}
function play(){
 clear();
 if(!rule||reduced()||!document.body.dataset.vnMask)return;
 const stage=document.querySelector<HTMLElement>('.vn-stage');if(!stage)return;
 const mask=rule,layer=document.createElement('canvas');
 layer.className='vn-rule-transition';layer.setAttribute('aria-hidden','true');layer.width=W;layer.height=H;
 const ctx=layer.getContext('2d');if(!ctx)return;
 const output=ctx.createImageData(W,H);canvas=layer;stage.append(layer);
 const start=performance.now();
 function draw(now:number){
  if(!layer.isConnected||reduced()){clear();return;}
  const t=Math.min(1,(now-start)/DURATION);
  for(let i=0;i<mask.length;i++){
   const threshold=t*(1+SOFTNESS)-SOFTNESS;
   const alpha=Math.max(0,Math.min(1,(mask[i]/255-threshold)/SOFTNESS));
   output.data[i*4+3]=Math.round(alpha*255);
  }
  ctx!.putImageData(output,0,0);
  if(t<1)frame=requestAnimationFrame(draw);else clear();
 }
 draw(start);
}
document.addEventListener('astro:before-preparation',clear);
document.addEventListener('astro:after-swap',()=>{if(source===document.body.dataset.vnMask)play();else void prepare();});
document.addEventListener('astro:page-load',()=>{void prepare();});
window.addEventListener('pagehide',clear);
void prepare();

export {};
