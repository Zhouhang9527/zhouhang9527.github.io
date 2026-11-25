// Shared logical PBD rectangle / CSS-state adapter. Only registered local sprites are accepted.
export const spriteStates=['normal','hover','pressed','selected','selectedHover','selectedPressed'] as const;
export type SpriteState=typeof spriteStates[number];
export function rectStyle(rect:readonly number[],parent:readonly number[]):string{
 if(rect.length!==4||parent.length!==4||![...rect,...parent].every(Number.isFinite)||parent[2]<=0||parent[3]<=0||rect[2]<0||rect[3]<0)throw Error('Invalid VN logical rectangle');
 const [x,y,w,h]=rect,[px,py,pw,ph]=parent;
 return [['x',(x-px)/pw],['y',(y-py)/ph],['w',w/pw],['h',h/ph]].map(([key,value])=>'--vn-'+key+':'+Number(value)*100+'%').join(';');
}
export function stateStyle(enabled:boolean,asset:(state:SpriteState)=>string|null,suffix=''):string{
 if(!enabled)return '';
 return spriteStates.flatMap(state=>{
  const name=asset(state);if(!name)return [];
  if(!/^[A-Za-z0-9_-]+$/.test(name))throw Error('Invalid VN sprite name');
  return ['--vn-'+state+suffix+':url(/__ginka_local_ui__/'+name+'.png)'];
 }).join(';');
}
