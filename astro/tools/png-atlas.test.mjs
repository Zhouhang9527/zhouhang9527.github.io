import test from 'node:test';
import assert from 'node:assert/strict';
import {decodePNG,encodePNG,removeMagenta,cropAtlas} from './png-atlas.mjs';
const image={width:3,height:2,pixels:Buffer.from([255,0,255,255, 10,20,30,255, 255,0,255,128, 0,0,0,255, 255,255,255,0, 0,255,0,255])};
test('RGBA PNG round trip and exact opaque packing key',()=>{
 assert.deepEqual(decodePNG(encodePNG(image)),image);
 const decoded=removeMagenta(image);
 assert.deepEqual([...decoded.pixels.subarray(0,4)],[0,0,0,0]);
 assert.deepEqual([...decoded.pixels.subarray(8,12)],[255,0,255,128]);
 assert.deepEqual([...decoded.pixels.subarray(20,24)],[0,255,0,255]);
 assert.deepEqual([...image.pixels.subarray(0,4)],[255,0,255,255]);
});
test('90-degree clockwise atlas unpack',()=>{
 const cropped=cropAtlas(image,[0,0,2,2],90);
 assert.equal(cropped.width,2);assert.equal(cropped.height,2);
 assert.deepEqual([...cropped.pixels],[0,0,0,255,255,0,255,255,255,255,255,0,10,20,30,255]);
 assert.throws(()=>cropAtlas(image,[1,1,3,2]));
 assert.throws(()=>cropAtlas(image,[0,0,2,2],180));
});
