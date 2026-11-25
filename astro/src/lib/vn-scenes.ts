import manifest from '../../config/vn-scenes.json';
export {resolveTitleState,resolveMapState} from './vn-scenes-runtime';
export type {TitleState} from './vn-scenes-runtime';
export type TitleFrameId=keyof typeof manifest.title.frames;
export type MapFrameId=keyof typeof manifest.map.frames;
// This full manifest is server-only. Browser runtimes must import the reduced
// progression projection from vn-scenes-runtime instead.
export const vnScenes=manifest;
export function localTitleFrame(frame:TitleFrameId):string { return '/__ginka_local_title__/'+frame+'.png'; }
export function localMapFrame(frame:MapFrameId):string { return '/__ginka_local_ui__/map-'+frame+'.png'; }
