import test from 'node:test';
import assert from 'node:assert/strict';
import {optionPage,textSize,resetPages,optionReturn} from '../src/domain/vn-options.ts';
test('page reset does not touch other pages or reading/voice state',()=>{assert.deepEqual(resetPages('text',false),['text']);assert.deepEqual(resetPages('program',false),[]);assert.deepEqual(resetPages('dialog',true),['display','text','sound']);assert.equal(optionPage('invalid'),'display');});
test('invalid persisted sizes fall back; integer limits retained',()=>{for(const v of [null,'',NaN,14.5,13,23,{},'abc'])assert.equal(textSize(v),16);assert.equal(textSize('22'),22);assert.equal(textSize(14),14);});
test('back route is same origin and content-only',()=>{const o='https://example.test';assert.equal(optionReturn('/archives/',o),'/archives/');assert.equal(optionReturn(o+'/2026/01/02/demo/#section',o),'/2026/01/02/demo/#section');for(const v of ['https://outside.test/','//outside.test/','/settings/','/images/abc.webp','/__ginka_local_ui__/','https://example.test//outside.test/',null])assert.equal(optionReturn(v,o),'/');});
