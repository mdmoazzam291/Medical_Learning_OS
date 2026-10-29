import {selectionItems} from './frozen-content-selections.js';
const invalid=()=>{throw Error('selection_inventory_export_invalid');};
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const canonical=value=>value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(canonical).join(',')+']':'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
const md=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replace(/[\r\n\t]/g,' ').replace(/[\\`*_{}\[\]()#+.!|~]/g,'\\$&');
export async function selectionInventoryExport(receipt){
 if(receipt?.contractId!=='frozen-content-selection-v1'||receipt.publicationAuthority!==false||receipt.releaseReadiness!=='not-assessed'||typeof receipt.selectionId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(receipt.selectionId)||!sha(receipt.digest)||!Number.isSafeInteger(receipt.catalogVersion)||receipt.catalogVersion<1||!Number.isFinite(Date.parse(receipt.createdAt))||!Number.isFinite(Date.parse(receipt.observedAt)))invalid();
 selectionItems(receipt.items?.map(x=>({kind:x.kind,versionId:x.versionId})));
 const items=receipt.items.map(x=>{
  if(typeof x.canonicalId!=='string'||!x.canonicalId||x.canonicalId.length>200||!Number.isSafeInteger(x.version)||x.version<1||!x.reviewFingerprints||['medical','references','rights'].some(k=>!sha(x.reviewFingerprints[k])))invalid();
  return {kind:x.kind,canonicalId:x.canonicalId,versionId:x.versionId,version:x.version,reviewFingerprints:Object.fromEntries(['medical','references','rights'].map(k=>[k,x.reviewFingerprints[k]]))};
 }).sort((a,b)=>{const x=a.kind+':'+a.versionId,y=b.kind+':'+b.versionId;return x<y?-1:x>y?1:0;});
 const manifest={schemaVersion:1,artifactType:'frozen-selection-metadata-inventory',inventoryOnly:true,ingestionReady:false,publicationAuthority:false,releaseReadiness:'not-assessed',selectionId:receipt.selectionId,frozenAt:receipt.createdAt,observedAt:receipt.observedAt,catalogVersion:receipt.catalogVersion,bindingDigest:receipt.digest,items};
 const json=canonical(manifest)+'\n';
 const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(json))),b=>b.toString(16).padStart(2,'0')).join('');
 const markdown='# Frozen selection — METADATA INVENTORY ONLY\n\nNot a clinical content export, import package, review approval or learner release.\nRelease readiness is not assessed. No current revalidation is asserted.\n\nSelection: '+receipt.selectionId+'\nFrozen: '+receipt.createdAt+'\nObserved: '+receipt.observedAt+'\nCatalog version: '+receipt.catalogVersion+'\nBinding digest: '+receipt.digest+'\nJSON SHA-256: '+sha256+'\n\n'+items.map(x=>'## '+md(x.kind)+' — '+md(x.versionId)+'\n\nCanonical ID: '+md(x.canonicalId)+'\nVersion: '+x.version+'\n\n'+['medical','references','rights'].map(k=>'- '+k+': '+x.reviewFingerprints[k]).join('\n')+'\n').join('\n');
 return {contractId:'selection-inventory-export-v1',selectionId:receipt.selectionId,manifest,json,markdown,sha256,inventoryOnly:true,ingestionReady:false,publicationAuthority:false};
}
