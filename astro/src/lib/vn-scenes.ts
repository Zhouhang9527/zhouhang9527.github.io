import manifest from '../../config/vn-scenes.json';
export interface TitleCharacterAsset {
  /** A verified transparent, title-aligned character difference, not a different CG. */
  src: string;
}
export interface TitleState {
  id: string;
  minCompleted: number;
  present: boolean;
  expression: string | null;
  asset: TitleCharacterAsset | null;
}
export const vnScenes = manifest;
export const titleStates: readonly TitleState[] = manifest.title.states;
export function resolveTitleState(completed: number): TitleState {
  return [...titleStates].reverse().find(state => completed >= state.minCompleted) ?? titleStates[0];
}
export function sceneVars(slug: string, focal: string): string {
  const prefix='/images/ginka/scenes/'+slug;
  return `--vn-day:url('${prefix}-day-1280.webp');--vn-night:url('${prefix}-night-1280.webp');--vn-day-small:url('${prefix}-day-640.webp');--vn-night-small:url('${prefix}-night-640.webp');--vn-focal:${focal}`;
}
