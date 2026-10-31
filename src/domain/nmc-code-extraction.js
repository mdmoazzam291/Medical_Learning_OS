// Pure, conservative metadata-only code indexer. No NMC descriptive content
// ever leaves this function. Source PDFs stay in the caller's local environment.
const pattern=/(?<![a-zA-Z0-9])([A-Z]{2,4})\s*(\d{1,3})\s*\.\s*(\d{1,3})(?![0-9.])/g;
const valid=x=>typeof x==='string'&&/^[A-Z]{2,4}\d{1,3}\.\d{1,3}$/.test(x);
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===[...keys].sort().join('|');
export function extractNmcCodeIndex(pages,documentSha256){
 if(!Array.isArray(pages)||pages.length<1||pages.length>2000||
  typeof documentSha256!=='string'||!/^[0-9a-f]{64}$/.test(documentSha256))
  throw new TypeError('nmc_code_index_invalid');
 const matched=new Map();
 for(let i=0;i<pages.length;i++){
  const page=pages[i];
  if(typeof page!=='string'||page.length>1000000)throw new TypeError('nmc_code_index_invalid');
  for(const m of page.matchAll(pattern)){
   const code=m[1]+Number(m[2])+'.'+Number(m[3]);
   if(!matched.has(code))matched.set(code,new Set());
   matched.get(code).add(i+1);
  }
 }
 return {schemaVersion:1,documentSha256,extractionMethod:'pdftotext-local-unreviewed',
  pagesParsed:pages.length,rightsMode:'citation_only',sourceContentStored:false,
  codes:[...matched].sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true}))
    .map(([code,pg])=>({code,pages:[...pg].sort((a,b)=>a-b)}))};
}
export function validateNmcCodeIndex(v){
 if(!exact(v,['schemaVersion','documentSha256','extractionMethod','pagesParsed','rightsMode','sourceContentStored','codes'])||
 v.schemaVersion!==1||!/^[0-9a-f]{64}$/.test(v.documentSha256)||
 v.extractionMethod!=='pdftotext-local-unreviewed'||v.rightsMode!=='citation_only'||
 v.sourceContentStored!==false||!Number.isInteger(v.pagesParsed)||v.pagesParsed<1||
 !Array.isArray(v.codes)||v.codes.length>10000)throw new TypeError('nmc_code_index_invalid');
 const seen=new Set();
 for(const row of v.codes){
  if(!exact(row,['code','pages'])||!valid(row.code)||seen.has(row.code)||
     !Array.isArray(row.pages)||!row.pages.length||
     row.pages.some(p=>!Number.isInteger(p)||p<1||p>v.pagesParsed))
   throw new TypeError('nmc_code_index_invalid');
  seen.add(row.code);
 }
 return structuredClone(v);
}
