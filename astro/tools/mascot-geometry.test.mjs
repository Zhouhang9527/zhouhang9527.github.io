import test from 'node:test';
import assert from 'node:assert/strict';
import {computeMascotGeometry,projectMascotCamera,projectLinkedMascotOverlay,measureMascotSourceZoom,selectMascotSourceResolution,cameraDepthScale,transformPoint,transformRect,fullPageRasterMatrix,interpolateLevelOffset} from '../src/lib/mascot-geometry.ts';

const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
const matrixClose=(actual,expected)=>actual.forEach((n,i)=>close(n,expected[i]));
const input={canvas:{width:400,height:800},viewport:{width:300,height:300}};

test('default is the existing contain/bottom-center geometry, not a stretched portrait',()=>{
 const g=computeMascotGeometry(input);
 assert.deepEqual(g.drawRect,{x:75,y:0,width:150,height:300});
 assert.deepEqual(g.matrix,[.375,0,0,.375,75,0]);
 assert.deepEqual(g.baseOrigin,{x:75,y:0});
 assert.equal(g.scale,.375);assert.equal(g.visible,true);
 assert.deepEqual(computeMascotGeometry({canvas:{width:800,height:400},viewport:{width:300,height:300}}).drawRect,{x:0,y:150,width:300,height:150});
});

test('identity camera and explicit default anchor preserve legacy geometry',()=>{
 const defaults=computeMascotGeometry(input);
 const explicit=computeMascotGeometry({...input,anchor:{source:{x:200,y:800},target:{x:150,y:300}},camera:{x:0,y:0,zoom:100,rotate:0,flipX:false,flipY:false}});
 assert.deepEqual(explicit,defaults);
});

test('sparse base offset moves only the bitmap origin, never the full-page anchor',()=>{
 const full=computeMascotGeometry(input);
 const sparse=computeMascotGeometry({...input,canvas:{...input.canvas,baseOffset:{x:80,y:120}}});
 assert.deepEqual(sparse.drawRect,full.drawRect);assert.deepEqual(sparse.matrix,full.matrix);
 assert.deepEqual(sparse.baseOrigin,{x:105,y:45});
 assert.deepEqual(transformPoint(sparse.matrix,{x:200,y:800}),{x:150,y:300});
});

test('explicit source/target anchors remain aligned through rotation, zoom and flips',()=>{
 const source={x:120,y:240},target={x:80,y:90};
 const g=computeMascotGeometry({...input,anchor:{source,target},camera:{x:7,y:-9,zoom:150,rotate:90,flipX:true}});
 const projected=transformPoint(g.matrix,source);close(projected.x,87);close(projected.y,81);
 close(g.scale,.5625);assert.equal(g.visible,true);
 const widthVector=transformPoint(g.matrix,{x:source.x+10,y:source.y});
 close(widthVector.x,87);close(widthVector.y,81-5.625);
});

test('bounds cover every rotated corner; drawRect is not substituted for the affine matrix',()=>{
 const g=computeMascotGeometry({...input,camera:{rotate:45}});
 for(const x of [0,400])for(const y of [0,800]){
  const p=transformPoint(g.matrix,{x,y});
  assert.ok(p.x>=g.drawRect.x-1e-9&&p.x<=g.drawRect.x+g.drawRect.width+1e-9);
  assert.ok(p.y>=g.drawRect.y-1e-9&&p.y<=g.drawRect.y+g.drawRect.height+1e-9);
 }
 close(g.drawRect.width,450/Math.sqrt(2));close(g.drawRect.height,450/Math.sqrt(2));
});

test('signed camera depth uses the denominator, not abs(z) or a positive focal assumption',()=>{
 assert.equal(cameraDepthScale({offsetZ:-80}),1);
 assert.equal(cameraDepthScale({offsetZ:-80,z:80}),.5);
 assert.equal(cameraDepthScale({offsetZ:-80,z:-40}),2);
 assert.equal(cameraDepthScale({offsetZ:-80,cameraZ:10,z:-30}),2);
 assert.equal(cameraDepthScale({offsetZ:-80,z:-80}),null);
 assert.equal(cameraDepthScale({offsetZ:0}),null);
 const g=computeMascotGeometry({...input,camera:{zoom:125,depth:{offsetZ:-80,z:-40}}});
 assert.equal(g.scale,.9375);assert.equal(g.visible,true);
});

test('singular, behind-plane and zero zoom projections are explicitly invisible and finite',()=>{
 for(const camera of [{depth:{offsetZ:-80,z:-80}},{depth:{offsetZ:-80,z:-100}},{zoom:0}]){
  const g=computeMascotGeometry({...input,camera});
  assert.equal(g.visible,false);assert.equal(g.scale,0);
  assert.equal(g.drawRect.width,0);assert.equal(g.drawRect.height,0);
  assert.ok(g.matrix.every(Number.isFinite));
 }
});

test('full-page raster uses truncated page center and numeric resolution, not alpha or sparse offset',()=>{
 const logical=[2,0,0,2,100,200],canvas={width:101,height:203};
 assert.deepEqual(fullPageRasterMatrix(logical,canvas,50),[4,0,0,4,-100,-204]);
 assert.deepEqual(fullPageRasterMatrix(logical,canvas,200),[1,0,0,1,50,99]);
 assert.deepEqual(fullPageRasterMatrix(logical,canvas,250),[.8,0,0,.8,60,119.19999999999999]);
 const rotated=fullPageRasterMatrix([0,2,-2,0,100,200],canvas,100);
 matrixClose(rotated,[0,2,-2,0,302,100]);
 assert.deepEqual(transformPoint(rotated,{x:50,y:101}),{x:100,y:200});
});

test('verified level tables interpolate before truncation, including negative coordinates',()=>{
 const offsets=[{x:3,y:-21},{x:8,y:-52},{x:15,y:-129},{x:23,y:-204}],levels=[50,100,200,250];
 assert.deepEqual(interpolateLevelOffset(offsets,levels,50),{x:6,y:-42});
 assert.deepEqual(interpolateLevelOffset(offsets,levels,75),{x:7,y:-48});
 assert.deepEqual(interpolateLevelOffset(offsets,levels,150),{x:7,y:-60});
 assert.deepEqual(interpolateLevelOffset(offsets,levels,300),{x:7,y:-68});
 assert.deepEqual(interpolateLevelOffset([{x:-1,y:-1}],[100],200),{x:0,y:0});
});

test('geometry rejects nonfinite dimensions, anchors, transforms and unresolved resolutions',()=>{
 for(const canvas of [{width:0,height:800},{width:Infinity,height:800},{width:400,height:NaN}])assert.throws(()=>computeMascotGeometry({...input,canvas}),RangeError);
 assert.throws(()=>computeMascotGeometry({...input,viewport:{width:0,height:1}}),RangeError);
 assert.throws(()=>computeMascotGeometry({...input,anchor:{source:{x:NaN,y:0},target:{x:0,y:0}}}),RangeError);
 assert.throws(()=>computeMascotGeometry({...input,camera:{zoom:-1}}),RangeError);
 assert.throws(()=>computeMascotGeometry({...input,camera:{x:Infinity}}),RangeError);
 assert.throws(()=>computeMascotGeometry({...input,canvas:{...input.canvas,baseOffset:{x:-1,y:0}}}),RangeError);
 assert.throws(()=>cameraDepthScale({offsetZ:NaN}),RangeError);
 assert.throws(()=>fullPageRasterMatrix([1,0,0,1,0,0],input.canvas,0),RangeError);
 assert.throws(()=>fullPageRasterMatrix([1,0,0,1,0,0],input.canvas,NaN),RangeError);
 assert.throws(()=>transformRect([1,0,0,1,0,0],[0,0,-1,1]),RangeError);
 assert.throws(()=>transformPoint([NaN,0,0,1,0,0],{x:0,y:0}),RangeError);
 assert.throws(()=>interpolateLevelOffset([{x:0,y:0}],[0],100),RangeError);
 assert.throws(()=>interpolateLevelOffset([{x:0,y:0},{x:1,y:1}],[100,50],100),RangeError);
});

test('finite but overflowing inputs never escape as Infinity or NaN geometry',()=>{
 assert.throws(()=>interpolateLevelOffset([{x:Number.MAX_VALUE,y:0}],[1],1),RangeError);
 assert.throws(()=>transformRect([2,0,0,1,-Number.MAX_VALUE,0],[0,0,Number.MAX_VALUE,1]),RangeError);
 assert.equal(cameraDepthScale({offsetZ:Number.MAX_VALUE,cameraZ:Number.MAX_VALUE}),null);
});

test('fractional viewports and many aspect ratios remain finite and inside default contain bounds',()=>{
 for(const width of [1,127,390,1440,1920])for(const height of [1,333,720,1080])for(const page of [{width:125,height:379},{width:401,height:203}]){
  const g=computeMascotGeometry({canvas:page,viewport:{width:width+.25,height:height+.5}});
  assert.ok(g.drawRect.x>=-1e-9&&g.drawRect.y>=-1e-9);
  assert.ok(g.drawRect.x+g.drawRect.width<=width+.25+1e-9);
  close(g.drawRect.y+g.drawRect.height,height+.5);
  close(g.drawRect.width/g.drawRect.height,page.width/page.height);
 }
});

const projection={canvas:{width:10,height:20},resolution:100,stage:{width:200,height:100},camera:{cameraoffsetz:-80,cameraoffsetzmax:800,camerarh:1},properties:{},rightHanded:true};
test('raw numeric projection requires explicit calibration and uses the full-page center',()=>{
 const g=projectMascotCamera(projection);
 assert.deepEqual(g.matrix,[1,0,0,1,95,40]);
 assert.equal(g.visible,true);assert.equal(g.opacity,1);assert.equal(g.depthScale,1);
 assert.deepEqual(g.drawRect,{x:95,y:40,width:10,height:20});
});
test('raw camera and portrait y directions are distinct, not viewport delta aliases',()=>{
 assert.deepEqual(projectMascotCamera({...projection,properties:{xpos:10,ypos:20}}).matrix,[1,0,0,1,105,20]);
 assert.deepEqual(projectMascotCamera({...projection,camera:{...projection.camera,camerax:10,cameray:20}}).matrix,[1,0,0,1,85,60]);
 assert.deepEqual(projectMascotCamera({...projection,rightHanded:false,properties:{ypos:20}}).matrix,[1,0,0,1,95,60]);
});
test('raw projection separates source resolution from camera depth and opacity',()=>{
 const g=projectMascotCamera({...projection,resolution:200,properties:{zpos:-40,opacity:128,visvalue:50}});
 assert.deepEqual(g.matrix,[1,0,0,1,95,40]);assert.equal(g.depthScale,2);
 close(g.opacity,128*50/25500);
 assert.deepEqual(projectMascotCamera({...projection,properties:{flipx:1}}).matrix,[-1,0,0,1,105,40]);
});
test('raw layer pivots and original level calibration do not become alpha crop anchors',()=>{
 const input={...projection,properties:{xpos:10,ypos:20},levelOffsets:{levels:[50,100],offsets:[{x:2,y:-20},{x:8,y:-50}]}};
 const g=projectMascotCamera(input);assert.deepEqual(g.levelOffset,{x:8,y:-50});
 assert.deepEqual(g.matrix,[1,0,0,1,113,70]);
 const rotated=projectMascotCamera({...projection,properties:{centerx:7,centery:9,rotate:90,zoomx:150,zoomy:75}});
 // Rotation/scaling pivots share the logical property origin, not the page center.
 const p=transformPoint(rotated.matrix,{x:7+5,y:10-9});close(p.x,107);close(p.y,41);
});
test('raw depth bounds and zero camera zoom are invisible without NaN matrices',()=>{
 for(const properties of [{zpos:-80},{zpos:800},{zpos:-100}]){
  const g=projectMascotCamera({...projection,properties});assert.equal(g.visible,false);assert.ok(g.matrix.every(Number.isFinite));
  assert.equal(g.drawRect.width,0);assert.equal(g.drawRect.height,0);
 }
 assert.equal(projectMascotCamera({...projection,camera:{...projection.camera,camerazoom:0}}).visible,false);
});
test('raw projection refuses absent calibration, link/mask/class and nonnumeric properties',()=>{
 for(const camera of [{},{...projection.camera,cameraoffsetz:80},{...projection.camera,camerarh:2},{...projection.camera,camerax:NaN},{...projection.camera,link:1}]){
  assert.throws(()=>projectMascotCamera({...projection,camera}),RangeError);
 }
 for(const properties of [{link:1},{class:79},{leveloffset:'#1,2'},{xpos:'@+1'},{linkmask:1}])assert.throws(()=>projectMascotCamera({...projection,properties}),RangeError);
 assert.throws(()=>projectMascotCamera({...projection,link:'parent'}),RangeError);
 assert.throws(()=>projectMascotCamera({...projection,linkmask:1}),RangeError);
});

const overlay={canvas:{width:101,height:203},origin:{x:50,y:101},resolution:100,stage:projection.stage,camera:projection.camera,properties:{xpos:-10,ypos:15,order:3},parentProperties:{xpos:20,ypos:5},rightHanded:true,linkmode:0,linkmask:0};
test('linked bitmap follows only the parent position and its explicit original center',()=>{
 const g=projectLinkedMascotOverlay(overlay);
 assert.deepEqual(g.matrix,[1,0,0,1,60,-71]);
 assert.deepEqual(transformPoint(g.matrix,overlay.origin),{x:110,y:30});
 assert.equal(g.visible,true);assert.equal(g.opacity,1);
 const changed=projectLinkedMascotOverlay({...overlay,parentProperties:{...overlay.parentProperties,zpos:-40,zoomx:900,zoomy:80,rotate:75,opacity:0,visvalue:0}});
 assert.deepEqual(changed,g);
 const shifted=projectLinkedMascotOverlay({...overlay,parentProperties:{xpos:30,ypos:15}});
 assert.deepEqual(shifted.matrix,[1,0,0,1,70,-81]);
});
test('linked bitmap own flip, scale and opacity remain independent of actor geometry',()=>{
 const g=projectLinkedMascotOverlay({...overlay,resolution:200,properties:{...overlay.properties,flipx:1,opacity:128,visvalue:50}});
 matrixClose(g.matrix,[-.5,0,0,.5,135,-20.5]);
 close(g.opacity,128*50/25500);
 const c=projectLinkedMascotOverlay({...overlay,camera:{...overlay.camera,camerax:30,cameray:40,camerazoom:150}});
 close(c.matrix[0],1.5);close(c.matrix[3],1.5);
});
test('linked bitmap never silently supports inherited matrices, clipping, unknown flags or unresolved origins',()=>{
 for(const extra of [{linkmode:1},{linkmask:1},{mode:79},{image:'not geometry'},{rightHanded:1}])assert.throws(()=>projectLinkedMascotOverlay({...overlay,...extra}),RangeError);
 assert.throws(()=>projectLinkedMascotOverlay({...overlay,origin:{x:NaN,y:0}}),RangeError);
 assert.throws(()=>projectLinkedMascotOverlay({...overlay,resolution:0}),RangeError);
 assert.throws(()=>projectLinkedMascotOverlay({...overlay,properties:{xpos:Infinity}}),RangeError);
 assert.equal(projectLinkedMascotOverlay({...overlay,camera:{...overlay.camera,camerazoom:0}}).visible,false);
});

test('source tier selection follows descending next-scale thresholds with exact boundaries',()=>{
 const available=[100,50,250,200];
 for(const [zoom,resolution] of [[0,50],[.25,50],[.5,50],[.51,100],[.99,100],[1,100],[1.01,200],[2,200],[2.01,250],[2.5,250],[7,250]])assert.equal(selectMascotSourceResolution(zoom,available),resolution);
 assert.deepEqual(available,[100,50,250,200]);
 assert.equal(selectMascotSourceResolution(3,[50,100,200]),200);
 assert.equal(selectMascotSourceResolution(.1,[100]),100);
});
test('source zoom measures projected basis rows and truncates hundredths before tier selection',()=>{
 assert.equal(measureMascotSourceZoom([.509,0,0,.509,0,0]),.5);
 assert.equal(selectMascotSourceResolution(measureMascotSourceZoom([.509,0,0,.509,0,0]),[50,100]),50);
 const skewed=[1,2,3,4,0,0];
 assert.equal(measureMascotSourceZoom(skewed),Math.trunc(Math.sqrt(20)*100)/100);
 assert.notEqual(measureMascotSourceZoom(skewed),Math.trunc(Math.sqrt(25)*100)/100);
});
test('normalized source zoom is translation-independent, including beyond point-subtraction precision',()=>{
 for(const matrix of [[1,0,0,1,0,0],[.9,0,0,.9,0,0],[2,0,0,2,0,0],[1,2,3,4,0,0]]){
  const baseline=measureMascotSourceZoom(matrix),tier=selectMascotSourceResolution(baseline,[50,100,200,250]);
  for(const position of [360,1920,1e20,-1e20,Number.MAX_VALUE]){
   const translated=[...matrix.slice(0,4),position,-position];
   assert.equal(measureMascotSourceZoom(translated),baseline);
   assert.equal(selectMascotSourceResolution(measureMascotSourceZoom(translated),[50,100,200,250]),tier);
  }
 }
 assert.equal(measureMascotSourceZoom([1,0,0,1,1e20,1e20]),1);
 assert.throws(()=>measureMascotSourceZoom([1,0,0,1,NaN,0]),RangeError);
});
test('camera exposes pre-raster matrix so depth two selects the original double-resolution tier, not raster four',()=>{
 const g=projectMascotCamera({...projection,resolution:50,properties:{zpos:-40}});
 assert.equal(g.matrix[0],4);assert.equal(g.logicalMatrix[0],2);
 assert.equal(measureMascotSourceZoom(g.logicalMatrix),2);
 assert.equal(selectMascotSourceResolution(measureMascotSourceZoom(g.logicalMatrix),[50,100,200,250]),200);
});
test('source tier selection never fabricates missing tiers or accepts unresolved numeric inputs',()=>{
 for(const resolutions of [[],[0],[NaN],[50,50],[Infinity]])assert.throws(()=>selectMascotSourceResolution(1,resolutions),RangeError);
 for(const zoom of [NaN,Infinity,-1])assert.throws(()=>selectMascotSourceResolution(zoom,[50,100]),RangeError);
 assert.throws(()=>measureMascotSourceZoom([Number.MAX_VALUE,0,0,1,0,0]),RangeError);
});
