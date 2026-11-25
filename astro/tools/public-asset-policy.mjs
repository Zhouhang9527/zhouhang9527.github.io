import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import approved from '../config/public-assets.json' with {type:'json'};

const scripts=['theme-init','reading','ui-shell','theme','comments','controls','motion','music'];
const styles=['editorial','pages','reading','runtime','motion','theme','comments'];
const publicCode=new Set([
 ...scripts.map(name=>`source/js/ginka-${name}.js`),
 ...styles.map(name=>`source/css/ginka-${name}.css`),
 'source/css/giscus-day.css','source/css/giscus-moonlit.css',
 'source/CNAME','source/sw.js','source/manifest.webmanifest'
]);
const normalize=file=>file.replaceAll('\\','/').replace(/^\.\//,'');
export function isPublicAsset(file){return publicCode.has(file)||Object.hasOwn(approved.files,file);}

/** Explicit code paths + individually reviewed media hashes; Git tracking alone is not approval. */
export function assertPublicStagingApproved(tracked,root){
 if(!Array.isArray(tracked))throw new TypeError('Expected tracked public candidate paths');
 const normalized=tracked.map(file=>normalize(file));
 const pendingScenePrefix='source/images/ginka/scenes/';
 const scenes=normalized.filter(file=>file.toLowerCase().startsWith(pendingScenePrefix));
 if(scenes.length){
  const sample=scenes.slice(0,5).join('\n  '),remainder=scenes.length>5?`\n  ... and ${scenes.length-5} more`:'';
  throw Error(`Public asset staging blocked: ${scenes.length} tracked path(s) under ${pendingScenePrefix}. No staging writes were made. Original artwork is private-preview only; see docs/DECISIONS.md.\n  ${sample}${remainder}`);
 }
 for(const file of normalized){
  if(file.includes('..')||file.startsWith('/')||file.includes(':'))throw Error('Unsafe staging path: '+file);
  const content=/^source\/(?:_posts\/.*\.md|(?:about|links)\/index\.md)$/.test(file);
  if(!content&&!isPublicAsset(file)&&file!=='source/music/.gitkeep')throw Error('Unapproved public candidate: '+file);
  if(!root)continue;
  const absolute=path.resolve(root,file),realRoot=fs.realpathSync(root);
  let current=root;
  for(const part of file.split('/')){
   current=path.join(current,part);
   if(fs.lstatSync(current).isSymbolicLink())throw Error('Symlink/junction cannot enter staging: '+file);
  }
  const relative=path.relative(realRoot,fs.realpathSync(absolute));
  if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Staging path escapes repository: '+file);
  const hash=approved.files[file]?.sha256;
  if(hash&&createHash('sha256').update(fs.readFileSync(absolute)).digest('hex')!==hash)throw Error('Reviewed media hash changed: '+file);
 }
}
