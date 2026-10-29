// Read-only evidence inventory. No approval, publication or learner authority.
const kinds=['question','note'],states=['draft','in_review','verified','published','retired','rejected'];
const gateStates=['current','missing','rejected','stale','unavailable'];
const invalid=()=>{throw new Error('approved_collection_invalid');};
export function parseApprovedCollectionFilters(params=new URLSearchParams()) {
 const out={search:'',kind:'',state:'',limit:50,offset:0};
 for(const [key,value] of params){
  if(!Object.hasOwn(out,key)||params.getAll(key).length!==1)invalid();
  if(key==='search'){if(value.length>160)invalid();out.search=value.trim();}
  else if(key==='kind'){if(value&&!kinds.includes(value))invalid();out.kind=value;}
  else if(key==='state'){if(value&&!['current','blocked','stored-published'].includes(value))invalid();out.state=value;}
  else{if(!/^\d+$/.test(value))invalid();out[key]=Number(value);if(!Number.isSafeInteger(out[key])||out[key]>(key==='limit'?100:2000)||out[key]<(key==='limit'?1:0))invalid();}
 }
 return out;
}
export function approvedCollectionPage(snapshot,filters={}) {
 const f=parseApprovedCollectionFilters(new URLSearchParams(Object.entries(filters).map(([k,v])=>[k,String(v)])));
 if(snapshot?.contractId!=='approved-collection-snapshot-v1'||!Number.isSafeInteger(snapshot.catalogVersion)||snapshot.catalogVersion<1||!Number.isFinite(Date.parse(snapshot.asOf))||!Array.isArray(snapshot.rows)||snapshot.rows.length>2000)invalid();
 const seen=new Set();
 const rows=snapshot.rows.map(r=>{
  if(!kinds.includes(r.kind)||!states.includes(r.status)||typeof r.canonicalId!=='string'||!r.canonicalId||typeof r.versionId!=='string'||!r.versionId||r.canonicalId.length>200||r.versionId.length>200||!Number.isSafeInteger(r.version)||r.version<1||!Number.isSafeInteger(r.sourceCount)||r.sourceCount<0||typeof r.rightsCurrent!=='boolean'||!Number.isSafeInteger(r.openIssues)||r.openIssues<0||!r.gates||Object.keys(r.gates).length!==3||['medical','references','rights'].some(k=>!gateStates.includes(r.gates[k])))invalid();
  const key=r.kind+':'+r.versionId;if(seen.has(key))invalid();seen.add(key);
  const blockers=[];
  if(!['verified','published'].includes(r.status))blockers.push('lifecycle_not_accepted');
  for(const gate of ['medical','references','rights'])if(r.gates[gate]!=='current')blockers.push(gate+'_'+r.gates[gate]);
  if(!r.sourceCount)blockers.push('sources_missing');
  if(!r.rightsCurrent)blockers.push('source_rights_unresolved');
  if(r.openIssues)blockers.push('open_content_issue');
  return {kind:r.kind,canonicalId:r.canonicalId,versionId:r.versionId,version:r.version,status:r.status,gates:{...r.gates},sourceCount:r.sourceCount,rightsCurrent:r.rightsCurrent,openIssues:r.openIssues,evidenceState:blockers.length?'blocked':'current',storedPublished:r.status==='published',blockers};
 }).sort((a,b)=>(a.kind+':'+a.canonicalId).localeCompare(b.kind+':'+b.canonicalId)||a.version-b.version||a.versionId.localeCompare(b.versionId));
 const selected=rows.filter(r=>(!f.kind||r.kind===f.kind)&&(!f.search||(r.canonicalId+' '+r.versionId).toLowerCase().includes(f.search.toLowerCase()))&&(!f.state||(f.state==='stored-published'?r.storedPublished:r.evidenceState===f.state)));
 return {contractId:'admin-approved-collection-v1',catalogVersion:snapshot.catalogVersion,asOf:snapshot.asOf,publicationAuthority:false,releaseReadiness:'not-assessed',summary:{versions:rows.length,canonicalItems:new Set(rows.map(r=>r.kind+':'+r.canonicalId)).size,evidenceCurrent:rows.filter(r=>r.evidenceState==='current').length,blocked:rows.filter(r=>r.evidenceState==='blocked').length,storedPublished:rows.filter(r=>r.storedPublished).length},total:selected.length,rows:selected.slice(f.offset,f.offset+f.limit),nextOffset:f.offset+f.limit<selected.length?f.offset+f.limit:null};
}
