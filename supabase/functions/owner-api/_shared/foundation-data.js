// Foundation registry inputs (~4.4 MB) are not bundled into owner-api. In the Edge runtime they are
// fetched from GitHub at a pinned commit and checked against pinned SHA-256 digests (fail closed);
// in Node tests they are read from the working tree, and tests assert the pins match those files.
export const FOUNDATION_DATA_COMMIT='11ba70fbf537394dcb641294645bd38c4d612927';
export const FOUNDATION_DATA_FILES={
 supplement:{path:'docs/evidence/2026-11-12-nmc-unified-queue-reuse-supplement.json',sha256:'12977d6351427e8959804d0c3f242ec168c2abd83e977a30272868036d9add67'},
 relationships:{path:'docs/evidence/2026-11-12-nmc-shared-name-relationships.json',sha256:'27faee0dc36072540323df8d36c18c052aa091a7a3c0ccdf77d7ebc2c4ad041a'},
 unified:{path:'docs/evidence/2026-11-09-nmc-unified-subject-reference-audit.json',sha256:'8f6938ee686f2bb0226f8129ea7828c8f74ee6929421fa523927de84915e38dc'},
 names:{path:'docs/evidence/2026-11-09-nmc-names-only-source-linked-draft-projection.json',sha256:'ccfe6304f0ba8d793479c59f09eb1f322a2e123260477d2dbaa93ca86373d33b'},
 pack:{path:'data/nmc-learning-foundation-drafts.json',sha256:'49f4cd44f5b29bde67c922ef28e32ec0449184a4274b7a3676a193d8b598ffe8'},
 overlay:{path:'data/nmc-reference-overlay.json',sha256:'2c652273d57b2886447df1d1683dc4ef765288768c10397454935717eb8935ff'},
 catalogue:{path:'data/nmc-reference-catalogue.json',sha256:'8656e6e9ce902056ed60fe12a92baa1db2852ae69f76bf5f726196807ef2903f'}
};
let cached=null;
async function sha256Hex(bytes){
 const d=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 return Array.from(d).map(b=>b.toString(16).padStart(2,'0')).join('');
}
// Pinned commit + SHA-256 make the mirror choice irrelevant to integrity; each attempt is time-boxed.
const MIRRORS=[
 path=>'https://raw.githubusercontent.com/mdmoazzam291/Medical_Learning_OS/'+FOUNDATION_DATA_COMMIT+'/'+path,
 path=>'https://cdn.jsdelivr.net/gh/mdmoazzam291/Medical_Learning_OS@'+FOUNDATION_DATA_COMMIT+'/'+path
];
async function readBytes(path){
 if(typeof Deno!=='undefined'){
  for(const url of MIRRORS.map(m=>m(path))){
   try{
    const res=await fetch(url,{headers:{'User-Agent':'medical-learning-os-owner-api'},signal:AbortSignal.timeout(12000)});
    if(res.ok)return new Uint8Array(await res.arrayBuffer());
    console.error(JSON.stringify({event:'foundation_data_fetch',status:res.status,host:new URL(url).host}));
   }catch(error){console.error(JSON.stringify({event:'foundation_data_fetch',error:String(error?.name||error),host:new URL(url).host}));}
  }
  throw new Error('foundation_data_unavailable');
 }
 const {readFile}=await import('node:fs/promises');
 const {fileURLToPath}=await import('node:url');
 return new Uint8Array(await readFile(fileURLToPath(new URL('../../../../'+path,import.meta.url))));
}
export async function loadFoundationData(){
 if(cached)return cached;
 const entries=await Promise.all(Object.entries(FOUNDATION_DATA_FILES).map(async([key,{path,sha256}])=>{
  const bytes=await readBytes(path);
  if(await sha256Hex(bytes)!==sha256)throw new Error('foundation_data_checksum_mismatch');
  return [key,JSON.parse(new TextDecoder().decode(bytes))];
 }));
 const out=Object.fromEntries(entries);
 cached=out;
 return out;
}
