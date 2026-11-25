import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import manifest from '../config/vn-scenes.json' with {type:'json'};
test('resolved HXV4 native storage identities match extracted filenames',()=>{
 const assets=[...Object.values(manifest.privateUI.assets),...Object.values(manifest.title.frames)];
 const named=assets.filter(a=>a.nativeStorage);assert.ok(named.length>=30);
 for(const a of named){
  const actual=createHash('blake2s256').update((a.nativeStorage.toLowerCase()+'xp3hnp'),'utf16le').digest('hex').toUpperCase();
  assert.ok(a.source.includes('_'+actual+'.png'),a.nativeStorage+' != '+a.source);
 }
});
