/** Decode recovered PBD UI data only. Original scripts are inert strings, never executed. */
export function decodePbd(node, depth=0){
 if(depth>128||!node||typeof node!=='object')throw Error('Invalid PBD node');
 switch(node.$type){
 case 'dictionary':{
  if(!Array.isArray(node.entries))throw Error('Invalid dictionary');
  const out=Object.create(null);
  for(const e of node.entries){if(typeof e.key!=='string'||Object.hasOwn(out,e.key))throw Error('Invalid or duplicate PBD key');out[e.key]=decodePbd(e.value,depth+1);}
  return out;
 }
 case 'array':if(!Array.isArray(node.items))throw Error('Invalid array');return node.items.map(x=>decodePbd(x,depth+1));
 case 'void':return null;
 case 'string':if(typeof node.value!=='string')throw Error('Invalid string');return node.value;
 case 'integer':case 'real':case 'double':if(!Number.isFinite(node.value))throw Error('Invalid numeric value');return node.value;
 default:throw Error('Unsupported PBD node: '+node.$type);
 }
}
export function normalizePbd(raw,source){
 if(raw.schema!=='krkr-xp3-brute/pbd-v1')throw Error('Unsupported PBD schema');
 const root=decodePbd(raw.root);
 if(!root.result||typeof root.result!=='object'||Array.isArray(root.result))throw Error('Missing UI result');
 const tuple=(obj,keys)=>keys.every(k=>Number.isFinite(obj[k]))?keys.map(k=>obj[k]):null;
 const controls=Object.create(null);
 for(const [id,control] of Object.entries(root.result)){
  if(!control||typeof control!=='object'||Array.isArray(control))throw Error('Invalid UI control '+id);
  const states=Object.create(null);
  for(const [name,s] of Object.entries(control.uistates??{})){
   if(!s||typeof s!=='object')throw Error('Invalid UI state '+id+'/'+name);
   states[name]={storage:s.storage??null,crop:tuple(s,['cx','cy','cw','ch']),rotation:s.cr===1?90:s.cr==null||s.cr===0?0:null,offset:tuple(s,['ox','oy']),size:tuple(s,['w','h']),opacity:s.opacity??null};
  }
  controls[id]={kind:control.class??null,bounds:tuple(control,['x','y','width','height']),states,parts:control.part??null,visible:control.visible??null,storage:control.storage??null,storageOffset:tuple(control,['storagex','storagey']),actions:Object.fromEntries(['exp','target','onenter','onleave'].filter(k=>Object.hasOwn(control,k)).map(k=>[k,control[k]]))};
 }
 return {version:1,source,controls,names:root.names??[],order:root.order??null,packbase:root.packbase??[],packlist:root.packlist??[],evals:root.evals??null};
}
