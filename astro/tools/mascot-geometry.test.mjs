import test from 'node:test';
import assert from 'node:assert/strict';
import {computeMascotGeometry,cameraDepthScale,transformPoint,transformRect,fullPageRasterMatrix,interpolateLevelOffset} from '../src/lib/mascot-geometry.ts';

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

test('fractional viewports and many aspect ratios remain finite and inside default contain bounds',()=>{
 for(const width of [1,127,390,1440,1920])for(const height of [1,333,720,1080])for(const page of [{width:125,height:379},{width:401,height:203}]){
  const g=computeMascotGeometry({canvas:page,viewport:{width:width+.25,height:height+.5}});
  assert.ok(g.drawRect.x>=-1e-9&&g.drawRect.y>=-1e-9);
  assert.ok(g.drawRect.x+g.drawRect.width<=width+.25+1e-9);
  close(g.drawRect.y+g.drawRect.height,height+.5);
  close(g.drawRect.width/g.drawRect.height,page.width/page.height);
 }
});
