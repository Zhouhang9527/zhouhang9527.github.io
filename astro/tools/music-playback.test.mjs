import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const runtime=readFileSync(new URL('../../source/js/ginka-music.js',import.meta.url),'utf8');
function implementation(start,end){
 const from=runtime.indexOf(start),to=runtime.indexOf(end,from);
 assert.ok(from>=0&&to>from,'production implementation boundary');
 return runtime.slice(from,to);
}
const numberSource=implementation('    function getStoredNumber(', '    function formatTime(');
const playbackSource=implementation('    async function attemptPlay(', '    function togglePlay(');
const errorSource=implementation('    let errorSkipCount = 0;', '    toggleBtn.addEventListener(');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function harness(){
 const storage=new Map(),pending=[],states=[];
 const audio={src:'https://media.example.test/a.mp3',paused:true,play(){const call=deferred();pending.push(call);return call.promise;},pause(){this.paused=true;}};
 const context=vm.createContext({audio,STORAGE:{playing:'playing'},musicList:[{title:'Track'}],currentMusicIndex:0,musicTitle:{textContent:'Track'},
  storageGet:key=>storage.has(key)?storage.get(key):null,storageSet:(key,value)=>storage.set(key,String(value)),
  updatePlayIcon(){},ensureLyricLinesRendered(){},setPlaybackState:(state,message)=>states.push({state,message}),log(){},
 });
 vm.runInContext(`let musicLoadSequence=0,playbackRequestSequence=0,playbackWanted=false,hasStartedPlayback=false;\n${numberSource}\n${playbackSource}`,context);
 return {context,audio,pending,states,storage};
}

test('absent or invalid volume uses its default without losing an explicit mute',()=>{
 const {context,storage}=harness();
 assert.ok(Number.isNaN(context.getStoredNumber('volume',NaN)),'fresh browser keeps default-volume sentinel');
 assert.equal(context.getStoredNumber('volume',0.88),0.88);
 for(const value of ['', '  ', 'invalid', 'Infinity']){storage.set('volume',value);assert.equal(context.getStoredNumber('volume',0.88),0.88);}
 storage.set('volume','0');assert.equal(context.getStoredNumber('volume',0.88),0,'explicit mute persists');
 storage.set('volume','0.42');assert.equal(context.getStoredNumber('volume',0.88),0.42);
});

test('pause invalidates a pending play promise instead of reviving playback state',async()=>{
 const {context,pending,storage,states}=harness();const play=context.attemptPlay('test');
 context.pausePlayback('test');pending[0].resolve();assert.equal(await play,false);
 assert.equal(storage.get('playing'),'false');assert.equal(states.at(-1).state,'paused');
});

test('a stale play rejection cannot overwrite a newer track playing successfully',async()=>{
 const {context,audio,pending,storage,states}=harness();const first=context.attemptPlay('old');
 vm.runInContext('musicLoadSequence++',context);audio.src='https://media.example.test/b.mp3';
 const second=context.attemptPlay('new');audio.paused=false;pending[1].resolve();assert.equal(await second,true);
 pending[0].reject(new Error('old track failed'));assert.equal(await first,false);
 assert.equal(storage.get('playing'),'true');assert.equal(states.at(-1).state,'playing');
});

test('a direct source replacement rejects a stale successful play completion',async()=>{
 const {context,audio,pending,storage}=harness();const play=context.attemptPlay('old');
 audio.src='https://media.example.test/replaced.mp3';audio.paused=false;pending[0].resolve();
 assert.equal(await play,false);assert.notEqual(storage.get('playing'),'true');
});

test('autoplay policy failures are visible and a genuine user retry clears them',async()=>{
 const {context,audio,pending,states,storage}=harness();const play=context.attemptPlay('restore');
 const error=new Error('gesture required');error.name='NotAllowedError';pending[0].reject(error);
 assert.equal(await play,false);assert.equal(states.at(-1).state,'blocked');assert.match(states.at(-1).message,/点击播放/);
 const retry=context.attemptPlay('toggle');audio.paused=false;pending[1].resolve();assert.equal(await retry,true);
 assert.equal(states.at(-1).state,'playing');assert.equal(storage.get('playing'),'true');
});

test('a genuine media playback failure stays distinct from a playlist failure',async()=>{
 const {context,pending,states,storage}=harness();const play=context.attemptPlay('toggle');
 pending[0].reject(new Error('source unavailable'));assert.equal(await play,false);
 assert.equal(states.at(-1).state,'error');assert.match(states.at(-1).message,/音频/);assert.equal(storage.get('playing'),'false');
});

function errorHarness(){
 const h=harness(),refresh=deferred();
 Object.assign(h.context,{currentSource:'online',suppressMediaError:0,getCurrentTrack:()=>h.context.musicList[0],stopAutoGainSampler(){},setRefreshLoading(){},
  refreshOnlineTrackUrl:()=>refresh.promise,loadMusic:()=>assert.fail('obsolete audio reloaded'),nextMusic:()=>assert.fail('obsolete audio skipped'),
 });
 h.context.musicList[0]={id:'a',source:'online',title:'Track A'};
 vm.runInContext(`playbackWanted=true;let onlineRetryForTrack='',onlineFailureCount=0,onlineFailedTrackIds=new Set();\n${errorSource}`,h.context);
 return {...h,refresh};
}

test('pausing during URL recovery cannot restart or skip the persistent audio',async()=>{
 const {context,refresh,states}=errorHarness();const recovery=context.handleAudioError();
 context.pausePlayback('user pause');refresh.resolve('https://media.example.test/retry.mp3');await recovery;
 assert.equal(states.at(-1).state,'paused');assert.equal(vm.runInContext('onlineFailureCount',context),0);
});

test('a failed old URL recovery cannot mark or skip the newly selected track',async()=>{
 const {context,refresh,audio}=errorHarness();const recovery=context.handleAudioError();
 context.musicList[0]={id:'b',source:'online',title:'Track B'};audio.src='https://media.example.test/b.mp3';
 vm.runInContext('musicLoadSequence++',context);refresh.resolve('');await recovery;
 assert.equal(vm.runInContext('onlineFailureCount',context),0);
 assert.equal(vm.runInContext('onlineFailedTrackIds.size',context),0);
});

test('exhausted current URL recovery clears persisted playing and shows the real error',async()=>{
 const {context,refresh,storage,states}=errorHarness();const recovery=context.handleAudioError();refresh.resolve('');await recovery;
 assert.equal(storage.get('playing'),'false');assert.equal(states.at(-1).state,'error');assert.match(states.at(-1).message,/在线音频/);
});
