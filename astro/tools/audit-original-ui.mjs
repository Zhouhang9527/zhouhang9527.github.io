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
const report={checks,failures};console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;
