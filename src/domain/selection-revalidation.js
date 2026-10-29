import {selectionItems} from './frozen-content-selections.js';
function bindings(value){
 if(!value||!Number.isSafeInteger(value.catalogVersion)||value.catalogVersion<1||typeof value.digest!=='string'||!/^[a-f0-9]{64}$/.test(value.digest))throw Error('selection_revalidation_invalid');
 const ids=selectionItems(value.items?.map(x=>({kind:x.kind,versionId:x.versionId})));
 const rows=new Map(value.items.map(x=>{if(typeof x.canonicalId!=='string'||!x.canonicalId||!Number.isSafeInteger(x.version)||x.version<1||!x.reviewFingerprints||['medical','references','rights'].some(k=>typeof x.reviewFingerprints[k]!=='string'||!/^[a-f0-9]{64}$/.test(x.reviewFingerprints[k])))throw Error('selection_revalidation_invalid');return [x.kind+':'+x.versionId,x];}));
 return ids.map(x=>rows.get(x.kind+':'+x.versionId));
}
export function selectionRevalidation(frozen,current,{blocked=false,checkedAt=current?.observedAt}={}){
 const old=bindings(frozen);if(typeof frozen.selectionId!=='string'||!Number.isFinite(Date.parse(checkedAt)))throw Error('selection_revalidation_invalid');
 const reasons=[];
 if(blocked)reasons.push('current_evidence_blocked');
 else{
  const now=bindings(current);
  if(frozen.catalogVersion!==current.catalogVersion)reasons.push('catalog_changed');
  if(frozen.digest!==current.digest)reasons.push('binding_digest_changed');
  const identity=x=>JSON.stringify([x.kind,x.canonicalId,x.versionId,x.version]);
  if(JSON.stringify(old.map(identity))!==JSON.stringify(now.map(identity)))reasons.push('exact_versions_changed');
  else if(old.some((x,i)=>['medical','references','rights'].some(k=>x.reviewFingerprints[k]!==now[i].reviewFingerprints[k])))reasons.push('review_fingerprints_changed');
 }
 return {contractId:'content-selection-revalidation-v1',selectionId:frozen.selectionId,frozenDigest:frozen.digest,frozenCatalogVersion:frozen.catalogVersion,currentDigest:blocked?null:current.digest,currentCatalogVersion:blocked?null:current.catalogVersion,checkedAt,state:blocked?'blocked':reasons.length?'stale':'current',reasons,publicationAuthority:false,releaseReadiness:'not-assessed'};
}
