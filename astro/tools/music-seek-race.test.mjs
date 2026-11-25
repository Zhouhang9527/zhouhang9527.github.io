import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const runtime=readFileSync(new URL('../../source/js/ginka-music.js',import.meta.url),'utf8');
const loadStart=runtime.indexOf('    function loadMusic(index, options) {');
const loadEnd=runtime.indexOf('    function renderPlaylist() {',loadStart);
assert.notEqual(loadStart,-1,'expected production loadMusic implementation');
assert.notEqual(loadEnd,-1,'expected end of loadMusic');
const loadMusicSource=runtime.slice(loadStart,loadEnd);

class FakeAudio {
 src=''; currentTime=0; duration=180; volume=1; listeners=new Map();
 removeAttribute() {}
 load() {}
 addEventListener(type,listener) {
  const listeners=this.listeners.get(type)||new Set();
  listeners.add(listener);this.listeners.set(type,listeners);
 }
 removeEventListener(type,listener) {this.listeners.get(type)?.delete(listener);}
 dispatch(type) {
  for(const listener of [...(this.listeners.get(type)||[])]){
   if(this.listeners.get(type)?.has(listener))listener({type,target:this});
  }
 }
 listenersFor(type) {return [...(this.listeners.get(type)||[])];}
}

function createHarness(){
 const audio=new FakeAudio(),storage=new Map([['music_currentTime','47']]);
 const tracks=[
  {id:'a',title:'Track A',artist:'Artist',album:'',cover:'',src:'/track-a.mp3',source:'online'},
  {id:'b',title:'Track B',artist:'Artist',album:'',cover:'',src:'/track-b.mp3',source:'online'}
 ];
 const context=vm.createContext({
  audio,musicList:tracks,musicTitle:{textContent:''},musicArtist:null,musicCover:null,
  currentSource:'online',suppressMediaError:0,
  STORAGE:{currentTime:'music_currentTime',index:'music_current_index',source:'music_current_source',trackId:'music_current_track_id'},
  normalizeIndex:index=>Number.isFinite(index)&&index>=0&&index<tracks.length?Math.floor(index):0,
  getStoredNumber:(key,fallback)=>{const value=Number(storage.get(key));return Number.isFinite(value)?value:fallback;},
  storageSet:(key,value)=>storage.set(key,String(value)),
  resetLyrics(){},prepareLyricsForTrack(){},stopAutoGainSampler(){},autoGainFactor:1,
  applyEffectiveVolume(){},updateProgressUI(){},updatePlaylistActive(){}
 });
 vm.runInContext(`let currentMusicIndex=0; let musicLoadSequence=0; let pendingSeekRestore=null;\n${loadMusicSource}`,context);
 return {audio,context,storage,tracks};
}

test('superseded track metadata cannot seek a newly selected track',()=>{
 const {audio,context,storage}=createHarness();context.loadMusic(0,{keepTime:true});
 const stale=audio.listenersFor('loadedmetadata')[0];
 assert.equal(audio.src,'/track-a.mp3');assert.equal(audio.listenersFor('loadedmetadata').length,1);
 audio.currentTime=9;context.loadMusic(1,{keepTime:false});
 assert.equal(audio.src,'/track-b.mp3');assert.equal(audio.listenersFor('loadedmetadata').length,0);
 stale();audio.dispatch('loadedmetadata');
 assert.equal(audio.currentTime,9);assert.equal(storage.get('music_currentTime'),'0');
});

test('URL retry invalidates the previous source seek',()=>{
 const {audio,context,tracks}=createHarness();context.loadMusic(0,{keepTime:true});
 const stale=audio.listenersFor('loadedmetadata')[0];audio.currentTime=6;
 tracks[0].src='https://media.example.test/retry-a.mp3';context.loadMusic(0,{keepTime:false});
 stale();audio.dispatch('loadedmetadata');
 assert.equal(audio.currentTime,6);assert.equal(audio.listenersFor('loadedmetadata').length,0);
});

test('current keep-time restore runs once and cleans its listener',()=>{
 const {audio,context,storage}=createHarness();storage.set('music_currentTime','52');
 context.loadMusic(0,{keepTime:true});assert.equal(audio.listenersFor('loadedmetadata').length,1);
 audio.dispatch('loadedmetadata');assert.equal(audio.currentTime,52);
 assert.equal(audio.listenersFor('loadedmetadata').length,0);
 audio.currentTime=8;audio.dispatch('loadedmetadata');assert.equal(audio.currentTime,8);
});

test('direct source replacement rejects and cleans an obsolete seek callback',()=>{
 const {audio,context}=createHarness();context.loadMusic(0,{keepTime:true});
 audio.src='/replacement.mp3';audio.currentTime=4;audio.dispatch('loadedmetadata');
 assert.equal(audio.currentTime,4);assert.equal(audio.listenersFor('loadedmetadata').length,0);
});
