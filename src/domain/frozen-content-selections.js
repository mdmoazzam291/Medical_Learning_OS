const bad=()=>{throw Error('content_selection_invalid');};
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
export function selectionItems(value){
 if(!Array.isArray(value)||!value.length||value.length>100)bad();const seen=new Set();
 return value.map(x=>{if(!x||Object.keys(x).length!==2||!['question','note'].includes(x.kind)||typeof x.versionId!=='string'||!/^[a-zA-Z0-9:_@.\-]{1,180}$/.test(x.versionId)||x.kind==='note'&&!uuid(x.versionId))bad();const key=x.kind+':'+x.versionId;if(seen.has(key))bad();seen.add(key);return {kind:x.kind,versionId:x.versionId};}).sort((a,b)=>(a.kind+':'+a.versionId).localeCompare(b.kind+':'+b.versionId));
}
export function selectionSaveInput(input){
 if(!input||Object.keys(input).length!==4||!uuid(input.requestId)||!Number.isSafeInteger(input.expectedCatalogVersion)||input.expectedCatalogVersion<1||typeof input.expectedDigest!=='string'||!/^[a-f0-9]{64}$/.test(input.expectedDigest))bad();
 return {items:selectionItems(input.items),requestId:input.requestId,expectedDigest:input.expectedDigest,expectedCatalogVersion:input.expectedCatalogVersion};
}
