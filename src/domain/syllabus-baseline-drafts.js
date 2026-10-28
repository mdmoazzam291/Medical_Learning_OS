// Draft checklist only. Canonical concept IDs are references; no exam approval follows.
const bad=()=>{throw new TypeError('syllabus_baseline_invalid');};
const keys=(o,allowed)=>{if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).sort().join('|')!==[...allowed].sort().join('|'))bad();};
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9:_.@-]{1,160}$/.test(x);
const txt=(x,min,max)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max&&!/[\u0000-\u001f]/.test(x);
export const BASELINE_SCOPE=['partial','complete-proposed'];
export const BASELINE_SOURCES=['official','expert','historical'];
export function validateBaselineDraft(input,registry){
 keys(input,['schemaVersion','requestId','baselineId','expectedDigest','document']);
 if(input.schemaVersion!==1||!uuid(input.requestId)||
  (input.baselineId!==null&&!uuid(input.baselineId))||
  (input.expectedDigest!==null&&!hex(input.expectedDigest))||
  (input.baselineId===null)!==(input.expectedDigest===null))bad();
 const d=input.document;
 keys(d,['label','pathwayVersionId','sourceKind','sourceLocator','sourceVersion','scopeDeclaration','conceptIds','changeReason']);
 if(!txt(d.label,1,240)||!id(d.pathwayVersionId)||!registry?.pathways?.some(p=>p.pathwayVersionId===d.pathwayVersionId&&p.status==='active')||
  !BASELINE_SOURCES.includes(d.sourceKind)||!txt(d.sourceLocator,8,2000)||!txt(d.sourceVersion,1,240)||
  !BASELINE_SCOPE.includes(d.scopeDeclaration)||!txt(d.changeReason,8,2000)||
  !Array.isArray(d.conceptIds)||d.conceptIds.length>2000||new Set(d.conceptIds).size!==d.conceptIds.length||
  d.conceptIds.some(v=>!id(v)))bad();
 return structuredClone(input);
}
// Preview has no approved denominator. Compare only a complete, matching canonical snapshot.
export function previewBaselineDraft(version,snapshot,registryVersion){
 const d=version?.document;
 if(!version||!d||!Array.isArray(d.conceptIds)||!snapshot||snapshot.registryVersion!==registryVersion||
   snapshot.catalogVersion!==version.catalogVersion||!Array.isArray(snapshot.concepts)||
   !Array.isArray(snapshot.questions)||!Array.isArray(snapshot.notes))return {status:'unavailable',reason:'snapshot_or_version_mismatch',coverageFraction:null};
 const known=new Set(snapshot.concepts.map(c=>c.conceptId));
 if(d.conceptIds.some(x=>!known.has(x)))return {status:'unavailable',reason:'missing_canonical_concept',coverageFraction:null};
 const ids=new Set(d.conceptIds);
 const assessed=new Set(snapshot.questions.filter(q=>q.status==='published').flatMap(q=>
  (q.conceptLinks||[]).filter(l=>l.role==='primary').map(l=>l.conceptId)).filter(x=>ids.has(x)));
 const teaching=new Set(snapshot.notes.filter(n=>n.status==='published').map(n=>n.conceptId).filter(x=>ids.has(x)));
 return {status:'proposed-checklist-only',baselineId:version.baselineId,revision:version.revision,
   catalogVersion:version.catalogVersion,totalProposed:d.conceptIds.length,withStoredPublishedAssessment:assessed.size,
   withStoredPublishedNotes:teaching.size,noDirectPublishedAssessment:d.conceptIds.filter(x=>!assessed.has(x)),
   noStoredPublishedNotes:d.conceptIds.filter(x=>!teaching.has(x)),
   coverageFraction:null,officialCompleteness:null,readinessInferred:false};
}
