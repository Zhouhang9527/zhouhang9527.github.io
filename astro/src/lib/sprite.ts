export type Rect=readonly [number,number,number,number];
/** Crop a packed atlas without stretching neighboring sprites into the frame. */
export function spriteVars(rect:Rect,width:number,height:number){
 const [x,y,w,h]=rect;
 if(w<=0||h<=0||x<0||y<0||x+w>width||y+h>height)throw Error('Atlas rect out of bounds');
 return `--sprite-w:${w};--sprite-h:${h};--sprite-size:${100*width/w}% ${100*height/h}%;--sprite-pos:${width===w?0:100*x/(width-w)}% ${height===h?0:100*y/(height-h)}%;`;
}
