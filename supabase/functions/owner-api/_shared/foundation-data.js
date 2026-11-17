// Foundation registry inputs (~4.4 MB) are not bundled into owner-api. In the Edge runtime they are
// fetched from GitHub at a pinned commit and checked against pinned SHA-256 digests (fail closed);
// in Node tests they are read from the working tree, and tests assert the pins match those files.
export const FOUNDATION_DATA_COMMIT='fbacfa7abb57c489959bc35c03080ed267dc04f5';
export const FOUNDATION_DATA_FILES={
 supplement:{path:'docs/evidence/2026-11-12-nmc-unified-queue-reuse-supplement.json',sha256:'12977d6351427e8959804d0c3f242ec168c2abd83e977a30272868036d9add67'},
 relationships:{path:'docs/evidence/2026-11-12-nmc-shared-name-relationships.json',sha256:'27faee0dc36072540323df8d36c18c052aa091a7a3c0ccdf77d7ebc2c4ad041a'},
 unified:{path:'docs/evidence/2026-11-09-nmc-unified-subject-reference-audit.json',sha256:'8f6938ee686f2bb0226f8129ea7828c8f74ee6929421fa523927de84915e38dc'},
 names:{path:'docs/evidence/2026-11-09-nmc-names-only-source-linked-draft-projection.json',sha256:'ccfe6304f0ba8d793479c59f09eb1f322a2e123260477d2dbaa93ca86373d33b'},
 pack:{path:'data/nmc-learning-foundation-drafts.json',sha256:'1898a21fc6301146379b0cf3b3e3f989c73ee567cee27904c9765f125eaa8183'},
 catalogue:{path:'data/nmc-reference-catalogue.json',sha256:'8656e6e9ce902056ed60fe12a92baa1db2852ae69f76bf5f726196807ef2903f'}
};
let cached=null;
async function sha256Hex(bytes){
 const d=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 return Array.from(d).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function readBytes(path){
 if(typeof Deno!=='undefined'){
  const res=await fetch('https://raw.githubusercontent.com/mdmoazzam291/Medical_Learning_OS/'+FOUNDATION_DATA_COMMIT+'/'+path,{headers:{'User-Agent':'medical-learning-os-owner-api'}});
  if(!res.ok)throw new Error('foundation_data_unavailable');
  return new Uint8Array(await res.arrayBuffer());
 }
 const {readFile}=await import('node:fs/promises');
 const {fileURLToPath}=await import('node:url');
 return new Uint8Array(await readFile(fileURLToPath(new URL('../../../../'+path,import.meta.url))));
}
export async function loadFoundationData(){
 if(cached)return cached;
 const out={};
 for(const [key,{path,sha256}] of Object.entries(FOUNDATION_DATA_FILES)){
  const bytes=await readBytes(path);
  if(await sha256Hex(bytes)!==sha256)throw new Error('foundation_data_checksum_mismatch');
  out[key]=JSON.parse(new TextDecoder().decode(bytes));
 }
 cached=out;
 return out;
}
