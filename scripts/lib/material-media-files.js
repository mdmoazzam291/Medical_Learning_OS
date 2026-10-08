import {open,lstat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {measuredImageFacts} from '../../src/domain/material-release/media-facts.js';
const invalid=()=>{throw new TypeError('invalid_image_bytes');};
function dimensions(h,tail,size){
  if(h.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){
    if(size<57||h.length<33||h.readUInt32BE(8)!==13||h.toString('ascii',12,16)!=='IHDR'||h[26]!==0||h[27]!==0||![0,1].includes(h[28])||!tail.subarray(-12).equals(Buffer.from('0000000049454e44ae426082','hex')))invalid();
    return {mimeType:'image/png',width:h.readUInt32BE(16),height:h.readUInt32BE(20)};
  }
  if(h[0]===255&&h[1]===216){
    if(tail[tail.length-2]!==255||tail[tail.length-1]!==217)invalid();let i=2;
    while(i+4<=h.length){if(h[i++]!==255)invalid();while(h[i]===255)i++;const marker=h[i++];if(marker===218||marker===217)break;if(marker===1||marker>=208&&marker<=215)continue;const length=h.readUInt16BE(i);if(length<2||i+length>h.length)invalid();if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){if(length<8||h[i+2]!==8)invalid();return {mimeType:'image/jpeg',width:h.readUInt16BE(i+5),height:h.readUInt16BE(i+3)};}i+=length;}
    invalid();
  }
  if(h.toString('ascii',0,4)==='RIFF'&&h.toString('ascii',8,12)==='WEBP'){
    if(size<26||h.readUInt32LE(4)+8!==size)invalid();const type=h.toString('ascii',12,16),chunk=h.readUInt32LE(16);if(chunk+20>size)invalid();
    if(type==='VP8L'&&h[20]===47&&chunk>=5){const v=h.readUInt32LE(21);return {mimeType:'image/webp',width:(v&16383)+1,height:((v>>>14)&16383)+1};}
    if(type==='VP8 '&&chunk>=10&&h[23]===157&&h[24]===1&&h[25]===42)return {mimeType:'image/webp',width:h.readUInt16LE(26)&16383,height:h.readUInt16LE(28)&16383};
    if(type==='VP8X'&&chunk===10&&h.length>=30)return {mimeType:'image/webp',width:h.readUIntLE(24,3)+1,height:h.readUIntLE(27,3)+1};invalid();
  }
  invalid();
}
export async function inspectImageFile(path){
  const stat=await lstat(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>128*1024*1024)invalid();
  const file=await open(path,'r');let h,tail;try{h=Buffer.alloc(Math.min(65536,stat.size));await file.read(h,0,h.length,0);tail=Buffer.alloc(Math.min(12,stat.size));await file.read(tail,0,tail.length,stat.size-tail.length);}finally{await file.close();}
  const facts=dimensions(h,tail,stat.size);if(!facts.width||!facts.height)invalid();
  const hash=createHash('sha256');let bytes=0;for await(const part of createReadStream(path)){hash.update(part);bytes+=part.length;}
  const after=await lstat(path);if(bytes!==stat.size||after.size!==stat.size||after.mtimeMs!==stat.mtimeMs||after.ino!==stat.ino)invalid();
  return measuredImageFacts({...facts,sha256:hash.digest('hex'),bytes});
}
