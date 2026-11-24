import fs from 'node:fs';
import path from 'node:path';

// Temporary compatibility boundary. Project-owned legacy scripts are ported here,
// never inside components. Remove an adapter when its feature has native ownership.
export function stageRuntimeCompatibility(out) {
  // Port only lifecycle hooks in the reused project-owned runtime. No NexT code is loaded.
  for(const name of ['reading','atri-loader','ui-shell','theme','comments','controls','motion']){
   const file=path.join(out,'js/ginka-'+name+'.js');let code=fs.readFileSync(file,'utf8');
   code=code.replaceAll('pjax:send','astro:before-preparation').replaceAll('pjax:success','astro:after-swap').replaceAll('pjax:complete','astro:page-load').replaceAll('pjax:error','astro:page-load');
   if(name==='motion'){
    code=code.replace('const body = document.body;','let body = document.body;').replace("  document.addEventListener('astro:page-load', arrive);","  document.addEventListener('astro:after-swap', () => { body=document.body; body.append(meter); });\n  document.addEventListener('astro:page-load', () => { discardTrip(); mount(false); });").replace("  document.addEventListener('astro:page-load', arrive);","");
   }
   if(name==='reading')code=code.replace("const language = classes.match", "const language = block.dataset.language || classes.match");
   fs.writeFileSync(file,code);
  }
  
}
