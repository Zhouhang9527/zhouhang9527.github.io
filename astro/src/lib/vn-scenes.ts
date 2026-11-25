import manifest from '../../config/vn-scenes.json';
export type TitleFrameId=keyof typeof manifest.title.frames;
export interface TitleState {
  id:string;
  minCompleted:number;
  present:boolean;
  expression:string|null;
  frame:TitleFrameId;
}
export const vnScenes=manifest;
export const titleStates:readonly TitleState[]=manifest.title.states.map(state=>{
 if(!Object.hasOwn(manifest.title.frames,state.frame))throw Error('Unknown title frame '+state.frame);
 return {...state,frame:state.frame as TitleFrameId};
});
export function resolveTitleState(completed:number):TitleState {
 return [...titleStates].reverse().find(state=>completed>=state.minCompleted)??titleStates[0];
}
export function localTitleFrame(frame:TitleFrameId):string {
 return '/__ginka_local_title__/'+frame+'.png';
}

export type MapFrameId=keyof typeof manifest.map.frames;
export function resolveMapState(completed:number){
 const state=[...manifest.map.states].reverse().find(state=>completed>=state.minCompleted)??manifest.map.states[0];
 if(!Object.hasOwn(manifest.map.frames,state.frame))throw Error('Unknown map frame '+state.frame);
 return {...state,frame:state.frame as MapFrameId};
}
export function localMapFrame(frame:MapFrameId){return '/__ginka_local_ui__/map-'+frame+'.png';}
