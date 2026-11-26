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
const clearRefreshSource=implementation('    function clearTrackRefresh()', '    const setActiveList =');
const spinnerSource=implementation('    const setRefreshLoading =', '    function clearTrackRefresh()');
const loadSource=implementation('    function loadMusic(', '    function renderPlaylist(');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function harness(){
 const storage=new Map(),pending=[],states=[],refreshLoading=[];
 const audio={src:'https://media.example.test/a.mp3',paused:true,currentTime:0,duration:180,removeAttribute(){},load(){},play(){const call=deferred();pending.push(call);return call.promise;},pause(){this.paused=true;}};
 const context=vm.createContext({audio,STORAGE:{playing:'playing',currentTime:'time'},musicList:[{id:'a',title:'Track A',src:audio.src},{id:'b',title:'Track B',src:'https://media.example.test/b.mp3'}],currentMusicIndex:0,musicTitle:{textContent:'Track'},musicArtist:null,musicCover:null,
  storageGet:key=>storage.has(key)?storage.get(key):null,storageSet:(key,value)=>storage.set(key,String(value)),
  normalizeIndex:index=>index,resetLyrics(){},prepareLyricsForTrack(){},stopAutoGainSampler(){},applyEffectiveVolume(){},updateProgressUI(){},updatePlaylistActive(){},
  updatePlayIcon(){},ensureLyricLinesRendered(){},setPlaybackState:(state,message)=>states.push({state,message}),setRefreshLoading:value=>refreshLoading.push(value),log(){},
 });
 vm.runInContext(`let musicLoadSequence=0,playbackRequestSequence=0,playbackWanted=false,hasStartedPlayback=false,pendingSeekRestore=null,autoGainFactor=1,suppressMediaError=0,currentSource='online',trackRefreshRequest=0,playlistRequest=null;\n${clearRefreshSource}\n${numberSource}\n${playbackSource}\n${loadSource}`,context);
 return {context,audio,pending,states,storage,refreshLoading,selectTrack:context.loadMusic};
}

test('a shared refresh control stays busy while either real request owner is pending',()=>{
 const control={busy:false,aria:'false'},sourceRetryBtn={classList:{toggle:(_name,busy)=>{control.busy=busy;}},setAttribute:(_name,value)=>{control.aria=value;}};
 const context=vm.createContext({sourceRetryBtn});
 vm.runInContext(`let playlistRequest=null,trackRefreshRequest=0;\n${spinnerSource}`,context);
 for(const owners of ['playlistRequest=Promise.resolve([]);trackRefreshRequest=0','playlistRequest=null;trackRefreshRequest=7']){
  vm.runInContext(owners+';setRefreshLoading(false)',context);
  assert.equal(control.busy,true);assert.equal(control.aria,'true','an unrelated completion cannot clear the active owner');
 }
 vm.runInContext('playlistRequest=null;trackRefreshRequest=0;setRefreshLoading(false)',context);
 assert.equal(control.busy,false);assert.equal(control.aria,'false');
});

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
 Object.assign(h.context,{getCurrentTrack:()=>h.context.musicList[h.context.currentMusicIndex],
  refreshOnlineTrackUrl:()=>refresh.promise,loadMusic:()=>assert.fail('obsolete audio reloaded'),nextMusic:()=>assert.fail('obsolete audio skipped'),
 });
 h.context.musicList[0]={id:'a',source:'online',title:'Track A'};
 vm.runInContext(`playbackWanted=true;let onlineRetryForTrack='',onlineFailureCount=0,onlineFailedTrackIds=new Set();\n${errorSource}`,h.context);
 return {...h,refresh};
}

test('pausing during URL recovery cannot restart or skip the persistent audio',async()=>{
 const {context,refresh,states,refreshLoading}=errorHarness();const recovery=context.handleAudioError();
 assert.equal(refreshLoading.at(-1),true);
 context.pausePlayback('user pause');assert.equal(refreshLoading.at(-1),false,'pause clears its pending retry spinner synchronously');
 refresh.resolve('https://media.example.test/retry.mp3');await recovery;
 assert.equal(refreshLoading.at(-1),false);assert.equal(states.at(-1).state,'paused');assert.equal(vm.runInContext('onlineFailureCount',context),0);
});

test('a failed old URL recovery cannot mark or skip the newly selected track',async()=>{
 const {context,refresh,audio}=errorHarness();const recovery=context.handleAudioError();
 context.musicList[0]={id:'b',source:'online',title:'Track B'};audio.src='https://media.example.test/b.mp3';
 vm.runInContext('musicLoadSequence++',context);refresh.resolve('');await recovery;
 assert.equal(vm.runInContext('onlineFailureCount',context),0);
 assert.equal(vm.runInContext('onlineFailedTrackIds.size',context),0);
});

test('exhausted current URL recovery clears persisted playing and shows the real error',async()=>{
 const {context,refresh,storage,states}=errorHarness();vm.runInContext('onlineFailureCount=2',context);
 const recovery=context.handleAudioError();refresh.resolve('');await recovery;
 assert.equal(storage.get('playing'),'false');assert.equal(states.at(-1).state,'error');assert.match(states.at(-1).message,/在线音频/);
});

for(const outcome of ['success','empty'])test('track replacement clears pending retry loading before obsolete '+outcome,async()=>{
 const {context,selectTrack,refresh,states,refreshLoading}=errorHarness();const recovery=context.handleAudioError();
 assert.equal(refreshLoading.at(-1),true);selectTrack(1,{keepTime:false});
 assert.equal(refreshLoading.at(-1),false,'production loadMusic clears the old owner');
 assert.equal(context.currentMusicIndex,1);const changes=states.length;
 refresh.resolve(outcome==='success'?'https://media.example.test/retry.mp3':'');await recovery;
 assert.equal(refreshLoading.at(-1),false);assert.equal(states.length,changes,'late retry cannot change new track status');
 assert.equal(vm.runInContext('onlineFailureCount',context),0);
});

test('an obsolete retry completion cannot clear the new track retry spinner',async()=>{
 const {context,selectTrack,refresh,refreshLoading}=errorHarness();const first=context.handleAudioError();
 selectTrack(1,{keepTime:false});vm.runInContext('suppressMediaError=0',context); // media loadstart has completed
 const secondRefresh=deferred();context.refreshOnlineTrackUrl=()=>secondRefresh.promise;
 const second=context.handleAudioError();assert.equal(refreshLoading.at(-1),true);
 refresh.resolve('https://media.example.test/old.mp3');await first;
 assert.equal(refreshLoading.at(-1),true,'new owner remains loading');
 context.pausePlayback('pause current');assert.equal(refreshLoading.at(-1),false);
 secondRefresh.resolve('');await second;assert.equal(refreshLoading.at(-1),false);
});

test('canceling a track retry preserves a genuinely pending playlist spinner',async()=>{
 const {context,refresh,refreshLoading}=errorHarness();const retry=context.handleAudioError();
 vm.runInContext('playlistRequest=Promise.resolve([])',context);context.pausePlayback('pause');
 assert.equal(refreshLoading.at(-1),true,'unrelated playlist fetch remains loading');
 refresh.resolve('');await retry;assert.equal(refreshLoading.at(-1),true);
});
