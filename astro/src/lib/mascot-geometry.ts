import type {Rect} from './sprite.ts';

export type Point = Readonly<{x:number;y:number}>;
export type Size = Readonly<{width:number;height:number}>;
/** Canvas/CSS matrix(a,b,c,d,e,f), with column-vector points. */
export type Matrix = readonly [number,number,number,number,number,number];
export type DrawRect = Readonly<{x:number;y:number;width:number;height:number}>;
const poseKeys=['xpos','ypos','zpos','offsetx','offsety','offsetz','originx','originy','centerx','centery','rcenterx','rcentery','zcenterx','zcentery','zoomx','zoomy','rotate','slantx','slanty','flipx','flipy','order','opacity','visvalue'] as const;
const cameraKeys=['cameraoffsetx','cameraoffsety','cameraoffsetz','cameraoffsetzmax','cameraox','cameraoy','camerax','cameray','cameraz','camerazoom','camerarotate','camerarh','basezoom','scalex','scaley','shiftx','shifty','zoomx','zoomy','zcenterx','zcentery'] as const;
export type MascotPoseProperties=Partial<Record<typeof poseKeys[number],number>>;
export type MascotCameraProperties=Partial<Record<typeof cameraKeys[number],number>>&{cameraoffsetz:number;cameraoffsetzmax:number;camerarh:0|1};
export type MascotProjectionInput=Readonly<{
 canvas:Size;resolution:number;stage:Size;camera:MascotCameraProperties;properties:MascotPoseProperties;
 /** Projection calibration, supplied by a verified local adapter, not an inferred class. */
 rightHanded:boolean;
 levelOffsets?:Readonly<{levels:readonly number[];offsets:readonly Point[]}>;
 placementOffset?:Point;
}>;
export type Depth = Readonly<{offsetZ:number;cameraZ?:number;z?:number}>;
export type MascotCamera = Readonly<{
 x?:number;y?:number;zoom?:number;rotate?:number;flipX?:boolean;flipY?:boolean;depth?:Depth;
}>;
export type MascotGeometryInput = Readonly<{
 canvas:Size&{baseOffset?:Point};
 viewport:Size;
 /** Both points are pixels, not fractions. Source belongs to the full canvas. */
 anchor?:Readonly<{source:Point;target:Point}>;
 camera?:MascotCamera;
}>;

const finite=(value:number,label:string)=>{
 if(!Number.isFinite(value))throw new RangeError('Invalid '+label);
 return value;
};
function size(value:Size,label:string){
 if(!value||finite(value.width,label+' width')<=0||finite(value.height,label+' height')<=0)throw new RangeError('Invalid '+label+' size');
}
function point(value:Point,label:string){finite(value.x,label+' x');finite(value.y,label+' y');}
const zero=(value:number)=>Object.is(value,-0)?0:value;
const normalized=([a,b,c,d,e,f]:Matrix):Matrix=>[zero(a),zero(b),zero(c),zero(d),zero(e),zero(f)];

/** Signed depth ratio. A zero plane/denominator has no finite projection. */
export function cameraDepthScale({offsetZ,cameraZ=0,z=0}:Depth):number|null{
 finite(offsetZ,'depth offset');finite(cameraZ,'camera depth');finite(z,'object depth');
 const denominator=offsetZ+cameraZ-z;
 if(!offsetZ||!denominator||!Number.isFinite(denominator))return null;
 const result=offsetZ/denominator;
 return Number.isFinite(result)?result:null;
}

export function transformPoint(matrix:Matrix,value:Point):Point{
 if(matrix.length!==6||!matrix.every(Number.isFinite))throw new RangeError('Invalid affine matrix');
 point(value,'point');
 const [a,b,c,d,e,f]=matrix;
 return {x:zero(finite(a*value.x+c*value.y+e,'projected x')),y:zero(finite(b*value.x+d*value.y+f,'projected y'))};
}

/** The axis-aligned bound is for layout/hit testing, not a replacement for rotation. */
export function transformRect(matrix:Matrix,rect:Rect):DrawRect{
 const [x,y,width,height]=rect;
 if(!rect.every(Number.isFinite)||width<0||height<0)throw new RangeError('Invalid source rectangle');
 const corners=[{x,y},{x:x+width,y},{x,y:y+height},{x:x+width,y:y+height}].map(p=>transformPoint(matrix,p));
 const left=Math.min(...corners.map(p=>p.x)),top=Math.min(...corners.map(p=>p.y));
 return {x:left,y:top,width:finite(Math.max(...corners.map(p=>p.x))-left,'projected width'),height:finite(Math.max(...corners.map(p=>p.y))-top,'projected height')};
}

/**
 * One geometry path for the existing full-frame and layered canvas renderer.
 * Defaults exactly match object-fit:contain; object-position:bottom center.
 * baseOffset locates a sparse bitmap INSIDE its full canvas; it never changes
 * that canvas's anchor, scale, or fit. No alpha crop or facial anchor is inferred.
 * Camera x/y are viewport deltas, zoom is a percentage, rotate is canvas degrees.
 * A non-projectable/behind-camera plane is explicitly invisible, with zero area.
 */
export function computeMascotGeometry({canvas,viewport,anchor,camera={}}:MascotGeometryInput){
 size(canvas,'canvas');size(viewport,'viewport');
 const base=canvas.baseOffset??{x:0,y:0};point(base,'base offset');
 if(base.x<0||base.y<0||base.x>canvas.width||base.y>canvas.height)throw new RangeError('Base origin outside canvas');
 const source=anchor?.source??{x:canvas.width/2,y:canvas.height};
 const target=anchor?.target??{x:viewport.width/2,y:viewport.height};
 point(source,'source anchor');point(target,'target anchor');
 const x=finite(camera.x??0,'camera x'),y=finite(camera.y??0,'camera y');
 const zoom=finite(camera.zoom??100,'camera zoom'),rotate=finite(camera.rotate??0,'camera rotation');
 if(zoom<0)throw new RangeError('Camera zoom must be nonnegative');
 const depth=camera.depth?cameraDepthScale(camera.depth):1;
 const visible=depth!==null&&depth>0&&zoom>0;
 const scale=visible?finite(Math.min(viewport.width/canvas.width,viewport.height/canvas.height)*zoom/100*depth,'geometry scale'):0;
 const radians=rotate*Math.PI/180,cos=Math.cos(radians),sin=Math.sin(radians);
 const sx=camera.flipX?-scale:scale,sy=camera.flipY?-scale:scale;
 const a=cos*sx,b=sin*sx,c=-sin*sy,d=cos*sy;
 const matrix=normalized([a,b,c,d,target.x+x-a*source.x-c*source.y,target.y+y-b*source.x-d*source.y]);
 const drawRect=transformRect(matrix,[0,0,canvas.width,canvas.height]);
 return {drawRect,matrix,scale,visible,baseOrigin:transformPoint(matrix,base)};
}

/**
 * Convert a logical layer transform to full-page raster coordinates. The caller
 * supplies the verified source resolution (%), never a guessed filename tier.
 * Truncation of odd page centers is intentional; sparse base rects do not enter.
 */
export function fullPageRasterMatrix(matrix:Matrix,canvas:Size,resolution:number):Matrix{
 size(canvas,'canvas');finite(resolution,'source resolution');
 if(resolution<=0)throw new RangeError('Invalid source resolution');
 const factor=100/resolution;
 const [a,b,c,d,e,f]=matrix;
 const result:Matrix=[a*factor,b*factor,c*factor,d*factor,
  e-factor*(a*Math.trunc(canvas.width/2)+c*Math.trunc(canvas.height/2)),
  f-factor*(b*Math.trunc(canvas.width/2)+d*Math.trunc(canvas.height/2))];
 if(!result.every(Number.isFinite))throw new RangeError('Invalid raster projection');
 return normalized(result);
}

/** Interpolate verified level offsets, then truncate toward zero after depth. */
export function interpolateLevelOffset(offsets:readonly Point[],levels:readonly number[],order:number):Point{
 if(!offsets.length||offsets.length!==levels.length||!Number.isFinite(order)||order<=0)throw new RangeError('Invalid level table');
 levels.forEach((level,i)=>{
  if(!Number.isFinite(level)||level<=0||i>0&&level<=levels[i-1])throw new RangeError('Invalid level order');
  point(offsets[i],'level offset');
 });
 let i=levels.findIndex(level=>order<=level);
 if(i<0)i=levels.length-1;
 const weight=i>0&&order<=levels[i]?(order-levels[i-1])/(levels[i]-levels[i-1]):1;
 const before=offsets[i>0?i-1:0],after=offsets[i];
 return {x:zero(finite(Math.trunc((before.x+(after.x-before.x)*weight)*100/order),'projected level x')),y:zero(finite(Math.trunc((before.y+(after.y-before.y)*weight)*100/order),'projected level y'))};
}

/** Right multiplication, matching Canvas column-vector point transforms. */
function multiply([a,b,c,d,e,f]:Matrix,[g,h,i,j,k,l]:Matrix):Matrix{
 return [a*g+c*h,b*g+d*h,a*i+c*j,b*i+d*j,a*k+c*l+e,b*k+d*l+f];
}
const translation=(x:number,y:number):Matrix=>[1,0,0,1,x,y];
const scaling=(x:number,y=x):Matrix=>[x,0,0,y,0,0];
function rotation(degrees:number):Matrix{
 const radians=degrees*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians);return [c,s,-s,c,0,0];
}
function pivot(matrix:Matrix,x:number,y:number,operation:Matrix):Matrix{
 return multiply(multiply(multiply(matrix,translation(x,y)),operation),translation(-x,-y));
}
function numericProperties(record:object,keys:readonly string[],label:string){
 for(const [key,value] of Object.entries(record)){
  if(!keys.includes(key)||typeof value!=='number'||!Number.isFinite(value))throw new RangeError('Unsupported '+label+' property: '+key);
 }
}

/**
 * Bounded independent portrait projection for a numeric action snapshot. This
 * is the camera+shift+depth-move/depth-zoom branch, NOT a scene interpreter.
 * Camera calibration is mandatory; resource names, class tables, links, masks,
 * source tier selection and original default values do not belong here.
 * Source x/y are stage coordinates; camera right-handedness and portrait
 * handedness are separate. Never pass these raw properties as viewport deltas.
 * The result transforms an already-composited full-page canvas. No DOM, draw,
 * timeline, loading, crop or alternate rendering path is introduced.
 */
export function projectMascotCamera(input:MascotProjectionInput){
 const allowed=['canvas','resolution','stage','camera','properties','rightHanded','levelOffsets','placementOffset'];
 if(Object.keys(input).some(key=>!allowed.includes(key)))throw new RangeError('Unsupported portrait projection branch');
 const {canvas,resolution,stage,camera:c,properties:p,rightHanded,levelOffsets}=input;
 size(canvas,'canvas');size(stage,'stage');finite(resolution,'source resolution');
 if(resolution<=0)throw new RangeError('Invalid source resolution');
 numericProperties(c,cameraKeys,'camera');numericProperties(p,poseKeys,'portrait');
 if(typeof rightHanded!=='boolean'||![0,1].includes(c.camerarh)||!Number.isFinite(c.cameraoffsetz)||c.cameraoffsetz>=0||!Number.isFinite(c.cameraoffsetzmax)||c.cameraoffsetzmax<=c.cameraoffsetz)throw new RangeError('Explicit negative perspective calibration required');
 const pose=(key:typeof poseKeys[number],fallback=0)=>p[key]??fallback;
 const cam=(key:typeof cameraKeys[number],fallback=0)=>c[key]??fallback;
 const placement=input.placementOffset??{x:0,y:0};point(placement,'placement');
 const z=pose('zpos')+pose('offsetz'),depth=cameraDepthScale({offsetZ:c.cameraoffsetz,cameraZ:cam('cameraz'),z});
 const near=c.cameraoffsetz+cam('cameraz'),far=c.cameraoffsetzmax+cam('cameraz');
 const opacity=Math.max(0,Math.min(1,pose('opacity',255)*pose('visvalue',100)/25500));
 const visible=z>near&&z<far&&depth!==null&&cam('camerazoom',100)!==0;
 const offset=visible&&levelOffsets?interpolateLevelOffset(levelOffsets.offsets,levelOffsets.levels,depth*100):{x:0,y:0};
 let m:Matrix=[0,0,0,0,stage.width/2,stage.height/2];
 if(visible){
  m=translation(stage.width/2,stage.height/2);
  m=multiply(m,scaling(cam('basezoom',100)/100));
  m=multiply(m,translation(pose('originx'),pose('originy')));
  m=multiply(m,scaling(cam('scalex',1),cam('scaley',1)));
  m=multiply(m,translation(cam('cameraox')+cam('shiftx'),cam('cameraoy')+cam('shifty')));
  m=pivot(m,cam('zcenterx'),cam('zcentery'),scaling(cam('zoomx',100)/100,cam('zoomy',100)/100));
  // Constant-z homogeneous division is a uniform factor on this plane.
  m=multiply(m,scaling(depth*cam('camerazoom',100)/100));
  if(c.camerarh)m=multiply(m,scaling(1,-1));
  m=multiply(m,rotation(-cam('camerarotate')));
  m=multiply(m,translation(-(cam('cameraoffsetx')+cam('camerax')),-(cam('cameraoffsety')+cam('cameray'))));
  if(c.camerarh)m=multiply(m,scaling(1,-1));
  m=multiply(m,translation(-cam('cameraox'),-cam('cameraoy')));
  if(rightHanded)m=multiply(m,scaling(1,-1));
  m=multiply(m,translation(pose('xpos'),pose('ypos')));
  m=pivot(m,pose('rcenterx',pose('centerx')),pose('rcentery',pose('centery')),rotation(pose('rotate')));
  m=pivot(m,pose('zcenterx',pose('centerx')),pose('zcentery',pose('centery')),scaling(pose('zoomx',100)/100,pose('zoomy',100)/100));
  m=multiply(m,[1,pose('slanty'),pose('slantx'),1,0,0]);
  if(pose('flipy'))m=multiply(m,scaling(1,-1));
  if(pose('flipx'))m=multiply(m,scaling(-1,1));
  m=multiply(m,translation(pose('offsetx'),pose('offsety')));
  m=multiply(m,translation(offset.x,offset.y));
  if(rightHanded)m=multiply(m,scaling(1,-1));
  m=multiply(m,translation(placement.x,placement.y));
 }
 const matrix=fullPageRasterMatrix(m,canvas,resolution);
 return {matrix,drawRect:transformRect(matrix,[0,0,canvas.width,canvas.height]),visible,opacity,depthScale:depth,levelOffset:offset};
}
