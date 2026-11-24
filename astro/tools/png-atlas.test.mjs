import test from 'node:test';
import assert from 'node:assert/strict';
import {decodePNG,encodePNG,removeMagenta,cropAtlas,composeLogicalSprite} from './png-atlas.mjs';
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

test('logical sprite rotation and offset preserve transparent canvas',()=>{
 const sprite=composeLogicalSprite(image,{rect:[0,0,2,1],rotate:90,offset:[1,1],size:[3,4]});
 assert.equal(sprite.width,3);assert.equal(sprite.height,4);
 assert.deepEqual([...sprite.pixels.subarray(16,20)],[255,0,255,255]);
 assert.deepEqual([...sprite.pixels.subarray(28,32)],[10,20,30,255]);
 assert.deepEqual([...sprite.pixels.subarray(0,4)],[0,0,0,0]);
 assert.throws(()=>composeLogicalSprite(image,{rect:[0,0,2,1],offset:[2,0],size:[3,4]}));
});
