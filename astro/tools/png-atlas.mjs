import {inflateSync,deflateSync} from 'node:zlib';
const SIGNATURE=Buffer.from('89504e470d0a1a0a','hex');
const crcTable=Uint32Array.from({length:256},(_,i)=>{let c=i;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let c=0xffffffff;for(const byte of bytes)c=crcTable[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type,body){const b=Buffer.alloc(12+body.length);b.writeUInt32BE(body.length,0);b.write(type,4,'ascii');body.copy(b,8);b.writeUInt32BE(crc32(b.subarray(4,8+body.length)),8+body.length);return b;}
function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
export function decodePNG(bytes){
 if(!bytes.subarray(0,8).equals(SIGNATURE)||bytes.length<33)throw Error('Invalid PNG');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),depth=bytes[24],color=bytes[25],channels=color===6?4:color===2?3:0;
 if(!width||!height||width*height>16000000||depth!==8||!channels||bytes[26]||bytes[27]||bytes[28])throw Error('Atlas must be non-interlaced RGB/RGBA8 PNG');
 const parts=[];
 for(let p=8;p+12<=bytes.length;){
  const len=bytes.readUInt32BE(p),type=bytes.toString('ascii',p+4,p+8);
  if(len>bytes.length-p-12)throw Error('Truncated PNG chunk');
  if(type==='IDAT')parts.push(bytes.subarray(p+8,p+8+len));
  p+=12+len;if(type==='IEND')break;
 }
 const stride=width*channels,expected=(stride+1)*height,raw=inflateSync(Buffer.concat(parts),{maxOutputLength:expected});
 if(raw.length!==expected)throw Error('Unexpected PNG scanline length');
 const unfiltered=Buffer.alloc(stride*height);
 for(let y=0,p=0;y<height;y++){
  const filter=raw[p++];if(filter>4)throw Error('Unknown PNG filter');
  for(let x=0;x<stride;x++){
   const i=y*stride+x,a=x>=channels?unfiltered[i-channels]:0,b=y?unfiltered[i-stride]:0,c=y&&x>=channels?unfiltered[i-stride-channels]:0;
   const add=filter===0?0:filter===1?a:filter===2?b:filter===3?((a+b)>>1):paeth(a,b,c);
   unfiltered[i]=(raw[p++]+add)&255;
  }
 }
 if(channels===4)return {width,height,pixels:unfiltered};
 const pixels=Buffer.alloc(width*height*4);
 for(let i=0,j=0;i<unfiltered.length;i+=3,j+=4){pixels[j]=unfiltered[i];pixels[j+1]=unfiltered[i+1];pixels[j+2]=unfiltered[i+2];pixels[j+3]=255;}
 return {width,height,pixels};
}
export function encodePNG({width,height,pixels}){
 if(!width||!height||pixels.length!==width*height*4)throw Error('Invalid RGBA raster');
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
 const stride=width*4,raw=Buffer.alloc((stride+1)*height);
 for(let y=0;y<height;y++)pixels.copy(raw,y*(stride+1)+1,y*stride,(y+1)*stride);
 return Buffer.concat([SIGNATURE,chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
// The extracted game sheets use opaque exact magenta as the packing key.
// Do not remove near-magenta, semi-transparent colored text, or opaque white.
export function removeMagenta(image){
 const pixels=Buffer.from(image.pixels);
 for(let i=0;i<pixels.length;i+=4)if(pixels[i]===255&&pixels[i+1]===0&&pixels[i+2]===255&&pixels[i+3]===255){pixels[i]=0;pixels[i+1]=0;pixels[i+2]=0;pixels[i+3]=0;}
 return {...image,pixels};
}
export function cropAtlas(image,rect,rotate=0){
 const [x,y,w,h]=rect;
 if(![x,y,w,h].every(Number.isInteger)||x<0||y<0||w<1||h<1||x+w>image.width||y+h>image.height||![0,90].includes(rotate))throw Error('Invalid atlas crop');
 const width=rotate===90?h:w,height=rotate===90?w:h,pixels=Buffer.alloc(width*height*4);
 for(let dy=0;dy<height;dy++)for(let dx=0;dx<width;dx++){
  const sx=x+(rotate===90?dy:dx),sy=y+(rotate===90?h-1-dx:dy),from=(sy*image.width+sx)*4,to=(dy*width+dx)*4;
  image.pixels.copy(pixels,to,from,from+4);
 }
 return {width,height,pixels};
}
