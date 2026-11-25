import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {rehypeHeadingIds} from '@astrojs/markdown-remark';
import rehypeRaw from 'rehype-raw';
import legacy from '../../config/legacy-headings.json' with {type:'json'};

const root=fileURLToPath(new URL('../../../',import.meta.url));
const pathKey=value=>{
 const absolute=path.resolve(value).replaceAll('\\','/');
 return process.platform==='win32'?absolute.toLowerCase():absolute;
};
const routeKey=value=>typeof value==='string'?value.replace(/^\//,''):undefined;
const isHeading=node=>node.type==='element'&&/^h[1-6]$/.test(node.tagName);
function walk(node,callback){callback(node);for(const child of node.children??[])walk(child,callback);}
const fail=message=>{throw new Error('[legacy-headings] '+message);};

/**
 * Keep the frozen published fragments without replacing Astro's heading IDs.
 * Register after other custom rehype heading transforms. Astro 5.16 runs its
 * built-in heading collector AFTER custom plugins, so call that exported
 * collector here first; its later pass keeps these IDs and the same TOC text.
 * No slug algorithm is duplicated in this plugin.
 */
export default function rehypeLegacyHeadings({manifest=legacy}={}){
 if(manifest.version!==1||!Array.isArray(manifest.articles))fail('Unsupported manifest');
 const byPath=new Map(),byRoute=new Map();
 for(const article of manifest.articles){
  if(typeof article.file!=='string'||path.basename(article.file)!==article.file||!article.file.endsWith('.md'))fail('Invalid article filename');
  if(typeof article.route!=='string'||!/^20\d\d\/.+\/$/.test(article.route)||byRoute.has(article.route))fail('Invalid or duplicate article route');
  if(!Array.isArray(article.headings))fail('Missing published headings: '+article.file);
  const oldIds=new Set();
  for(const heading of article.headings){
   if(!Number.isInteger(heading.depth)||heading.depth<1||heading.depth>6||typeof heading.text!=='string'||typeof heading.id!=='string'||!heading.id||/\s/.test(heading.id)||oldIds.has(heading.id))fail('Invalid or duplicate published heading: '+article.file);
   oldIds.add(heading.id);
  }
  byRoute.set(article.route,article);
  for(const directory of ['source/_posts','astro/.generated/posts']){
   const key=pathKey(path.join(root,directory,article.file));
   if(byPath.has(key))fail('Duplicate article filename: '+article.file);
   byPath.set(key,article);
  }
 }
 const assignHeadingIds=rehypeHeadingIds();
 const parseRaw=rehypeRaw();
 return (tree,file)=>{
  const route=routeKey(file.data?.astro?.frontmatter?.route);
  // A basename alone is insufficient: pages/about.md or another project may
  // have the same filename. With no file path, an explicit frozen route is OK.
  const article=file.path?byPath.get(pathKey(file.path)):byRoute.get(route);
  if(!article)return;
  if(route!==undefined&&route!==article.route)fail('File/route disagreement: '+article.file+' -> '+route);

  assignHeadingIds(tree,file);
  const nodes=[];
  walk(tree,node=>{if(isHeading(node))nodes.push(node);});
  const current=file.data.astro.headings;
  if(nodes.length!==article.headings.length)fail('Heading count changed for '+article.file+': expected '+article.headings.length+', got '+nodes.length+'; review the frozen manifest, do not map by position alone');
  for(let index=0;index<current.length;index++){
   const old=article.headings[index],now=current[index];
   if(old.depth!==now.depth||old.text!==now.text)fail('Heading '+(index+1)+' changed for '+article.file+': expected h'+old.depth+' '+JSON.stringify(old.text)+', got h'+now.depth+' '+JSON.stringify(now.text)+'; explicit review required');
  }

  // Include author-supplied raw HTML IDs, which Astro normally parses only
  // after its collector. This is an observation copy, not a rewrite of content.
  const parsed=parseRaw(structuredClone(tree),file);
  const used=new Set();
  walk(parsed,node=>{
   if(node.type!=='element'||node.properties?.id===undefined)return;
   const id=String(node.properties.id);
   if(used.has(id))fail('Duplicate current HTML id '+JSON.stringify(id)+' in '+article.file);
   used.add(id);
  });
  const pending=[];
  for(let index=0;index<nodes.length;index++){
   const oldId=article.headings[index].id,currentId=current[index].slug;
   if(oldId===currentId)continue; // Already resolves: never duplicate the ID.
   const heading=nodes[index];
   const existing=heading.children.find(node=>node.type==='element'&&node.tagName==='span'&&node.properties?.id===oldId&&node.properties?.dataLegacyHeadingAlias===currentId&&node.children.length===0);
   if(used.has(oldId)){
    if(existing)continue; // Safe if the transformer is deliberately run twice.
    fail('Legacy id '+JSON.stringify(oldId)+' collides with existing HTML in '+article.file);
   }
   used.add(oldId);
   pending.push({heading,oldId,currentId});
  }
  // Mutate only after the complete article has passed all matching/collision
  // checks. Empty, non-focusable spans do not change heading text or TOC.
  for(const {heading,oldId,currentId} of pending){
   heading.children.unshift({type:'element',tagName:'span',properties:{id:oldId,ariaHidden:'true',dataLegacyHeadingAlias:currentId},children:[]});
  }
 };
}
