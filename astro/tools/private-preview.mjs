import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {parseArgs} from 'node:util';
import {listFonts} from './local-font.mjs';
import manifest from '../config/vn-scenes.json' with {type:'json'};
const {values,positionals}=parseArgs({options:{port:{type:'string'}},allowPositionals:true});
const input=positionals[0]||process.env.GINKA_ASSETS_ROOT;
if(!input||positionals.length>1)throw Error('Usage: npm run dev:original -- <private asset repository or assets directory> [--port PORT]');
if(values.port!==undefined&&(!/^[1-9]\d{0,4}$/.test(values.port)||Number(values.port)>65535))throw Error('Private preview port must be 1..65535');
let root=path.resolve(input);
if(fs.existsSync(path.join(root,'assets','data')))root=path.join(root,'assets');
const data=path.join(root,'data'),bgimage=path.join(root,'bgimage');
const mascot=process.env.GINKA_MASCOT_MANIFEST||path.join(path.dirname(data),'..','reference','mascot','manifest.json');
for(const [dir,items] of [[data,[...Object.values(manifest.title.frames),manifest.title.logo,...Object.values(manifest.privateUI.assets)]],[bgimage,Object.values(manifest.map.frames)]]){
 for(const spec of items)if(!fs.existsSync(path.join(dir,spec.source)))throw Error('Missing private preview asset: '+path.join(dir,spec.source));
}
const env={...process.env,GINKA_ASSETS_ROOT:root,GINKA_TITLE_DATA:data,GINKA_VN_UI_DATA:data,GINKA_MAP_DATA:bgimage};
if(fs.existsSync(mascot)){env.GINKA_MASCOT_MANIFEST=path.resolve(mascot);console.log('Private GINKA dialogue pack:',env.GINKA_MASCOT_MANIFEST);}else console.log('Mascot dialogue pack not found; mascot remains unavailable until extracted.');
if(!env.GINKA_UI_FONT){
 const candidates=listFonts(data).filter(f=>!f.error);
 if(candidates.length===1){
  env.GINKA_UI_FONT=path.join(data,candidates[0].file);
  console.log('Using single extracted font candidate:',candidates[0].names);
 }else console.log('Original font not automatically selected; use GINKA_UI_FONT explicitly. Candidates:',candidates.map(f=>({file:f.file,names:f.names})));
}
const npm=process.env.npm_execpath;
if(!npm)throw Error('Run through npm run dev:original');
const child=spawn(process.execPath,[npm,'run','dev','--','--host','127.0.0.1',...(values.port?['--port',values.port]:[])],{env,stdio:'inherit'});
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
