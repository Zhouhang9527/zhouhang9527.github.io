import fs from 'node:fs';
import path from 'node:path';
import manifest from '../config/vn-scenes.json' with {type:'json'};
import {encodePNG} from './png-atlas.mjs';

// Original dimensions only. No original pixels, scripts, fonts or voices.
export function createSyntheticUI(root){
 const data=path.join(root,'data'),bg=path.join(root,'bgimage');
 function write(dir,spec){
  const file=path.join(dir,spec.source);
  if(fs.existsSync(file))return;
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const {width,height}=spec;
  fs.writeFileSync(file,encodePNG({width,height,pixels:Buffer.alloc(width*height*4,Buffer.from([41,83,127,255]))}));
 }
 for(const spec of [...Object.values(manifest.privateUI.assets),...Object.values(manifest.title.frames),manifest.title.logo])write(data,spec);
 for(const spec of Object.values(manifest.map.frames))write(bg,spec);
 return {GINKA_TITLE_DATA:data,GINKA_VN_UI_DATA:data,GINKA_MAP_DATA:bg};
}
