import {selectionRevalidation} from '../../../../src/domain/selection-revalidation.js';
import {selectionItems,selectionSaveInput} from '../../../../src/domain/frozen-content-selections.js';
const fail=(status,code)=>{const e=Error(code);e.status=status;e.code=code;throw e;};
function project(value,receipt=false){
 if(!value||value.contractId!==(receipt?'frozen-content-selection-v1':'content-selection-binding-v1')||value.publicationAuthority!==false||value.releaseReadiness!=='not-assessed'||!Number.isSafeInteger(value.catalogVersion)||value.catalogVersion<1||!/^[a-f0-9]{64}$/.test(value.digest)||!Number.isFinite(Date.parse(value.observedAt))||!Array.isArray(value.items)||!value.items.length||value.items.length>100)throw Error('invalid');
 selectionItems(value.items.map(r=>({kind:r.kind,versionId:r.versionId})));
 const items=value.items.map(r=>{if(typeof r.canonicalId!=='string'||!r.canonicalId||r.canonicalId.length>200||!Number.isSafeInteger(r.version)||r.version<1||!r.reviewFingerprints||['medical','references','rights'].some(k=>!/^[a-f0-9]{64}$/.test(r.reviewFingerprints[k])))throw Error('invalid');return {kind:r.kind,canonicalId:r.canonicalId,versionId:r.versionId,version:r.version,reviewFingerprints:Object.fromEntries(['medical','references','rights'].map(k=>[k,r.reviewFingerprints[k]]))};});
 const result={contractId:value.contractId,catalogVersion:value.catalogVersion,digest:value.digest,items,observedAt:value.observedAt,publicationAuthority:false,releaseReadiness:'not-assessed'};
 if(receipt){if(!/^[0-9a-f-]{36}$/.test(value.selectionId)||!/^[0-9a-f-]{36}$/.test(value.requestId)||!Number.isFinite(Date.parse(value.createdAt)))throw Error('invalid');Object.assign(result,{selectionId:value.selectionId,requestId:value.requestId,createdAt:value.createdAt});}
 return result;
}
export async function contentSelectionRequest({admin,actor,action,input}){
 let args;
 try{if(action==='preview'){if(!input||Object.keys(input).length!==1)throw Error();args={items:selectionItems(input.items)};}
 else if(action==='save')args=selectionSaveInput(input);else if(['read','revalidate'].includes(action)){if(!input||Object.keys(input).length!==1||typeof input.selectionId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.selectionId))throw Error();args=input;}else throw Error();}catch{fail(400,'content_selection_invalid');}
 async function rpc(name,params){const {data,error}=await admin.rpc(name,{p_actor:actor,...params});if(error){const message=String(error.message||'');if(message.includes('content_admin_required'))fail(403,'content_admin_required');for(const code of ['content_selection_stale','content_selection_request_conflict','content_selection_item_blocked','content_selection_item_unavailable'])if(message.includes(code))fail(409,code);fail(503,'content_selection_unavailable');}return data;}
 try{
  if(action==='revalidate'){
   const frozen=project(await rpc('owner_content_selection_read_v1',{p_selection_id:args.selectionId}),true);
   if(frozen.selectionId!==args.selectionId)throw Error('readback');
   try{const current=project(await rpc('owner_content_selection_preview_v1',{p_items:selectionItems(frozen.items.map(x=>({kind:x.kind,versionId:x.versionId})))}));return selectionRevalidation(frozen,current);}
   catch(error){if(error?.status===409&&['content_selection_item_blocked','content_selection_item_unavailable'].includes(error.code))return selectionRevalidation(frozen,null,{blocked:true,checkedAt:new Date().toISOString()});throw error;}
  }
  if(action==='read'){const value=project(await rpc('owner_content_selection_read_v1',{p_selection_id:args.selectionId}),true);if(value.selectionId!==args.selectionId)throw Error('readback');return value;}
  if(action==='preview')return project(await rpc('owner_content_selection_preview_v1',{p_items:args.items}));
  const receipt=project(await rpc('owner_content_selection_save_v1',{p_items:args.items,p_request_id:args.requestId,p_expected_digest:args.expectedDigest,p_expected_catalog_version:args.expectedCatalogVersion}),true);
  if(receipt.requestId!==args.requestId||receipt.digest!==args.expectedDigest||receipt.catalogVersion!==args.expectedCatalogVersion||JSON.stringify(selectionItems(receipt.items.map(r=>({kind:r.kind,versionId:r.versionId}))))!==JSON.stringify(args.items))throw Error('invalid_receipt');
  const read=project(await rpc('owner_content_selection_read_v1',{p_selection_id:receipt.selectionId}),true);
  if(JSON.stringify(read)!==JSON.stringify(receipt))throw Error('readback');return read;
 }catch(error){if(error?.status)throw error;fail(503,'content_selection_unavailable');}
}
