import test from 'node:test';
import assert from 'node:assert/strict';
import scenes from '../config/vn-scenes.json' with {type:'json'};
import {runtimeScenes, resolveTitleState, resolveMapState} from '../src/lib/vn-scenes-runtime.ts';

test('browser scene projection preserves progress thresholds without private source metadata', () => {
  const title = scenes.title.states.map(({id,minCompleted,present,expression}) => ({id,minCompleted,present,expression}));
  const map = scenes.map.states.map(({id,minCompleted}) => ({id,minCompleted}));
  assert.deepEqual(runtimeScenes.title.states, title);
  assert.deepEqual(runtimeScenes.map.states, map);
  assert.deepEqual([0,1,2,3,15].map(resolveTitleState).map(s=>s.id), ['arrival','first-encounter','first-encounter','familiar','familiar']);
  assert.deepEqual([0,1,2,3,15].map(resolveMapState).map(s=>s.id), ['arrival','first-encounter','first-encounter','familiar','familiar']);
  assert.doesNotMatch(JSON.stringify(runtimeScenes), /_hxv4_hash|nativeStorage|sourceBlob|title_base|manpu_aserim|geometry|frame/i);
});
