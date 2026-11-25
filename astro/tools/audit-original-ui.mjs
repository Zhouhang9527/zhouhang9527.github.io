// Read private source files in place. Report only counts/mismatches; never export original scripts or assets.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import manifest from '../config/vn-scenes.json' with {type:'json'};
import {normalizePbd} from './pbd-ui.mjs';
import {resolveOriginalAction} from '../src/domain/vn-actions.ts';
const arg=process.argv[2];if(!arg)throw Error('Usage: npm run audit:original -- <private repo>');
const root=fs.realpathSync(arg),dir='assets/data/_hxv4_hash/AF5FB0494CCF915F/';
const ui=manifest.privateUI;
function load(relative){const file=fs.realpathSync(path.join(root,relative));if(!file.startsWith(root+path.sep))throw Error('PBD outside private repo');return normalizePbd(JSON.parse(fs.readFileSync(file,'utf8')),relative);}
const title=load(ui.titleMenu.pbdSource);
const [bottom,quick,dialog]=ui.gameControls.sources.map(p=>load(dir+p));
let checks=0;const failures=[];
function eq(label,actual,expected){checks++;try{assert.deepEqual(actual,expected);}catch{failures.push(label);}}
const aliases={CONTINUE:'cont',NEXT:'next',START:'start',LOAD:'load',SYSTEM:'option',EXTRA:'extra',INFORMATION:'info',EXIT:'exit'};
const sprite=s=>({rect:s.crop,rotate:s.rotation,offset:s.offset});
for(const [key,control] of Object.entries(ui.titleMenu.states)){
 const p=title.controls[aliases[key]];
 eq(key+' bounds',control.bounds,p.bounds);
 for(const [state,original] of Object.entries({normal:'off',hover:'over',pressed:'on'}))eq(key+' '+state,control[state],sprite(p.states[original]));
}
for(const [key,source,atlas] of [['bottom',bottom,'gameParts'],['quick',quick,'readerControls'],['dialog',dialog,'confirmButtons']]){
 for(const [id,bounds] of Object.entries(ui.gameControls[key]))eq(key+' '+id+' bounds',bounds,source.controls[id]?.bounds);
 for(const [name,s] of Object.entries(ui.logicalSprites[atlas])){
  const id=name.slice(0,name.lastIndexOf('-')),control=source.controls[id];
  const matches=Object.values(control?.states??{}).some(state=>state.crop&&JSON.stringify(sprite(state))===JSON.stringify({rect:s.rect,rotate:s.rotate,offset:s.offset}));
  eq(atlas+' '+name+' crop/rotation/offset',matches,true);
  eq(atlas+' '+name+' canvas',s.size,control?.bounds?.slice(2));
 }
 if(key!=='dialog')for(const id of Object.keys(ui.gameControls[key]))eq(key+' '+id+' action',resolveOriginalAction(source.controls[id]?.actions.exp),id);
}
eq('new badge bounds',ui.titleMenu.newBadge.bounds,title.controls.new.bounds);
eq('new badge crop',ui.titleMenu.newBadge.rect,title.controls.new.states['(~null~)'].crop);
const loadUI=load(ui.loadGeometry.englishSource);
for(const [atlas,sprites] of [['loadLabels',ui.logicalSprites.loadLabels],['loadRows',ui.logicalSprites.loadRows]])for(const [name,s] of Object.entries(sprites)){
 const key=name.slice(0,name.lastIndexOf('-')),state=name.slice(name.lastIndexOf('-')+1),id=['save','load','quick','voice'].includes(key)?'to_'+key:key,control=loadUI.controls[id];
 const original=key==='caption'?(state==='quick'?'qload':state):({normal:'off',pressed:'on',selected:'on',hover:'over'})[state],p=control?.states[original];
 eq(atlas+' '+name+' bounds',ui.loadGeometry.controls[key],control?.bounds);
 eq(atlas+' '+name+' crop/rotation/offset',{rect:s.rect,rotate:s.rotate,offset:s.offset},p?sprite(p):null);
 eq(atlas+' '+name+' canvas',s.size,control?.bounds?.slice(2));
}
// All seven original settings wordmarks, common tab/footer states, DISPLAY overlays,
// and the native rail/thumb shapes. Moving range thumbs deliberately discard the source center offset.
const option=ui.optionGeometry,optionSources=Object.fromEntries(Object.entries(option.languageSources).map(([key,source])=>[key,load(source)]));
const compare=(label,configured,control,state,range=false)=>{
 const p=control?.states[state];eq(label+' crop',configured.rect,p?.crop);eq(label+' rotation',configured.rotate,p?.rotation);
 eq(label+' offset',configured.offset,range?[0,0]:p?.offset);eq(label+' canvas',configured.size,range?p?.size:control?.bounds?.slice(2));
};
for(const [index,key] of ['display','program','text','sound','dialog','touch','shortcut'].entries()){
 const control=optionSources.base.controls['page'+index];eq(key+' tab bounds',option.controls[key],control.bounds);
 for(const [label,state] of Object.entries({normal:'off',selected:'on',hover:'over'}))compare(key+' tab '+label,ui.logicalSprites.optionTabs['nav-'+key+'-'+label],control,state);
 const heading=optionSources[key].controls[key==='shortcut'?'caption':'header'];eq(key+' wordmark bounds',option.headings[key],heading.bounds);
 compare(key+' wordmark',ui.logicalSprites[key+'Labels'].wordmark,heading,'(~null~)');
}
for(const [key,id] of Object.entries({back:'back',title:'title',defaults:'init',exit:'exit'})){
 const control=optionSources.base.controls[id];eq(key+' footer bounds',option.controls[key],control.bounds);
 for(const [label,state] of Object.entries({normal:'off',pressed:'on',hover:'over'}))compare(key+' footer '+label,ui.logicalSprites.optionTabs['footer-'+key+'-'+label],control,state);
}
for(const [key,id] of Object.entries({window:'window',fullscreen:'fullscreen',effectOn:'effect_on',effectOff:'effect_off'})){
 const control=optionSources.display.controls[id];eq(key+' display bounds',option.display[key],control.bounds);
 for(const [label,state] of Object.entries({normal:'t_off',selected:'t_on',hover:'t_over'}))compare(key+' display '+label,ui.logicalSprites.displayLabels['control-'+key+'-'+label],control,state);
}
for(const [label,state] of Object.entries({normal:'off',selected:'on',hover:'over'}))compare('common button '+label,ui.logicalSprites.optionAtlas['button-'+label],optionSources.display.controls.window,state);
compare('common caption',ui.logicalSprites.optionAtlas.caption,optionSources.display.controls.label0,'base');
for(const [name,state] of Object.entries({rail:'rail',railDisabled:'dsrail',thumb:'normal',thumbHover:'over',thumbPressed:'on'}))compare('common range '+name,ui.logicalSprites.optionAtlas['range-'+name],optionSources.text.controls.textspeed,state,true);
for(const [key,bounds] of Object.entries({...option.sound.channels,...option.sound.characterChannels}))eq(key+' sound bounds',bounds,optionSources.sound.controls[key].bounds);
for(const [key,bounds] of Object.entries(option.sound.labels)){const c=optionSources.sound.controls[key];eq(key+' sound label bounds',bounds,c.bounds);compare(key+' sound label',ui.logicalSprites.soundLabels[key],c,'text');}
compare('sound caption',ui.logicalSprites.optionAtlas['sound-caption'],optionSources.sound.controls.label3,'base');
for(const [name,state] of Object.entries({rail:'rail',railDisabled:'dsrail'}))compare('sound range '+name,ui.logicalSprites.optionAtlas['sound-range-'+name],optionSources.sound.controls.bgmvolume,state,true);
// EXTRA: one original item template, nine slot placements, six native pages.
const gallery=ui.galleryGeometry,g=load(gallery.source).controls;
eq('EXTRA heading bounds',gallery.heading,g.caption_gallery.bounds);
compare('EXTRA heading',ui.logicalSprites.galleryLabels.heading,g.caption_gallery,'(~null~)');
eq('EXTRA back bounds',gallery.back,g.back.bounds);
for(const [label,state] of Object.entries({normal:'off',pressed:'on',hover:'over'}))compare('EXTRA back '+label,ui.logicalSprites.galleryLabels['back-'+label],g.back,state);
for(const [i,bounds] of gallery.items.entries())eq('EXTRA item '+i,bounds,g['item'+i].bounds);
for(const [label,state] of Object.entries({disabled:'disable',hover:'ovl',thumb:'thumb'}))compare('EXTRA item '+label,(label==='disabled'?ui.logicalSprites.galleryLabels:ui.logicalSprites.galleryControls)['item-'+label],g.item,state);
for(const [i,bounds] of gallery.pages.entries()){
 const control=g['page'+i];eq('EXTRA page '+i,bounds,control.bounds);
 for(const [label,state] of Object.entries({normal:'normal',selected:'on',hover:'over'}))compare('EXTRA page '+i+' '+label,ui.logicalSprites.galleryControls['page'+i+'-'+label],control,state);
}
const report={checks,failures};console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;
