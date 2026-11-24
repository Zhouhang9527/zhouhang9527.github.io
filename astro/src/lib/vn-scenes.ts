import manifest from '../../config/vn-scenes.json';
export const vnScenes=manifest;
export function sceneVars(slug:string,focal:string):string {
 const prefix='/images/ginka/scenes/'+slug;
 return `--vn-day:url('${prefix}-day-1280.webp');--vn-night:url('${prefix}-night-1280.webp');--vn-day-small:url('${prefix}-day-640.webp');--vn-night-small:url('${prefix}-night-640.webp');--vn-focal:${focal}`;
}
