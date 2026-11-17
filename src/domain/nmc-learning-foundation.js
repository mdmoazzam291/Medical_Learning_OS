// Draft-only bridge: source references -> original learning objectives -> existing
// canonical IDs. Uses the established objective model; no active exam mappings.
import {validatePreparationCurriculum} from './preparation-pathways.js';
import {validateReferenceCatalogue} from './nmc-reference-catalogue.js';
const bad=()=>{throw new TypeError('foundation_draft_invalid');};
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===keys.sort().join('|');
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const text=(s,a,b)=>typeof s==='string'&&s.trim().length>=a&&s.length<=b&&!/[\u0000-\u001f]/.test(s);
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
export async function canonicalIdentityDigest(c){
 if(!c||!text(c.conceptId,1,160)||!text(c.label,1,240)||!Array.isArray(c.aliases)||!c.aliases.every(x=>text(x,1,240))||!Array.isArray(c.subjectTags)||!c.subjectTags.every(x=>text(x,1,160)))bad();
 const identity={conceptId:c.conceptId,label:c.label,aliases:[...c.aliases].sort(),subjectTags:[...c.subjectTags].sort()};
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stable(identity))))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
// Standard rows bind directly. Source exceptions bind only through their own basis: misprinted codes and
// unheaded rows ('source-exception-resolved', resolved by the reference overlay) and official amendment
// replacements ('official-replacement'; the replaced row may lack a row box). Deleted rows never bind.
const basisFits=(ref,basis)=>ref.amendmentNotice?basis==='official-replacement'&&ref.searchCode!=='PS9.2':
 ref.identifierState!=='standard'||ref.topicId===null?basis==='source-exception-resolved':['literal-name-in-source-row','scoped-task-in-source-row'].includes(basis);
export function validateFoundationDrafts(input,catalogue){
 const c=validateReferenceCatalogue(catalogue);
 if(!exact(input,['schemaVersion','draftVersion','authoredCatalogVersion','sourceEdition','sourceSha256','clinicalApproval','sourceAlignmentApproved','learnerActivation','objectives','sourceBindings'])||
 input.schemaVersion!==1||!['mbbs-foundation:original-objectives@1','mbbs-foundation:original-objectives@2','mbbs-foundation:original-objectives@3','mbbs-foundation:original-objectives@4','mbbs-foundation:original-objectives@5','mbbs-foundation:original-objectives@6','mbbs-foundation:original-objectives@7','mbbs-foundation:original-objectives@8','mbbs-foundation:original-objectives@9','mbbs-foundation:original-objectives@10','mbbs-foundation:original-objectives@11','mbbs-foundation:original-objectives@12','mbbs-foundation:original-objectives@13','mbbs-foundation:original-objectives@14','mbbs-foundation:original-objectives@15','mbbs-foundation:original-objectives@16','mbbs-foundation:original-objectives@17','mbbs-foundation:original-objectives@18','mbbs-foundation:original-objectives@19','mbbs-foundation:original-objectives@20','mbbs-foundation:original-objectives@21','mbbs-foundation:original-objectives@22','mbbs-foundation:original-objectives@23','mbbs-foundation:original-objectives@24'].includes(input.draftVersion)||!Number.isSafeInteger(input.authoredCatalogVersion)||input.authoredCatalogVersion<0||
 input.sourceEdition!==c.edition||input.sourceSha256!==c.sourceSha256||input.clinicalApproval!==false||input.sourceAlignmentApproved!==false||input.learnerActivation!==false||
 !Array.isArray(input.objectives)||input.objectives.length>10000||!Array.isArray(input.sourceBindings)||input.sourceBindings.length>10000)bad();
 const objectives=new Map();
 for(const row of input.objectives){
  if(!exact(row,['objective','wording','authorship','status','canonicalIdentitySha256'])||!text(row.wording,12,500)||row.authorship!=='ai_generated_original'||row.status!=='draft'||!sha(row.canonicalIdentitySha256))bad();
  if(!row.objective||objectives.has(row.objective.objectiveVersionId))bad();
  objectives.set(row.objective.objectiveVersionId,row);
 }
 validatePreparationCurriculum({schemaVersion:1,registryVersion:input.draftVersion,pathways:[],objectives:input.objectives.map(x=>x.objective),mappings:[],artifacts:[]});
 const refs=new Map(c.references.map(r=>[r.referenceId,r])),seen=new Set();
 for(const link of input.sourceBindings){
  const ref=refs.get(link.referenceId),key=link.referenceId+'|'+link.objectiveVersionId;
  if(!exact(link,['referenceId','objectiveVersionId','status','basis','sourcePage','rowBBox','sourceBodySha256','namedConcept'])||
   !ref||!objectives.has(link.objectiveVersionId)||seen.has(key)||!basisFits(ref,link.basis)||
   link.status!=='proposed'||link.sourcePage!==ref.pdfPage||!sha(link.sourceBodySha256)||!text(link.namedConcept,2,240)||
   !(link.basis==='official-replacement'&&link.rowBBox===null||Array.isArray(link.rowBBox)&&link.rowBBox.length===4&&link.rowBBox.every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=10000)&&
   link.rowBBox[0]<link.rowBBox[2]&&link.rowBBox[1]<link.rowBBox[3]))bad();
  seen.add(key);
 }
 return structuredClone(input);
}
export function parseFoundationFilters(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['subject','search','offset'].includes(k)))bad();
 const offset=input.offset??0;
 if(!['string','number'].includes(typeof offset)||!/^(0|[1-9]\d{0,3})$/.test(String(offset))||Number(offset)>5000||typeof offset==='boolean'||
 (input.subject!==undefined&&typeof input.subject!=='string')||(input.search!==undefined&&!text(input.search,0,200)))bad();
 return {subject:input.subject||'',search:input.search||'',offset:Number(offset)};
}
export async function foundationDraftPage(input,catalogue,catalog,filters={}){
 const p=validateFoundationDrafts(input,catalogue),f=parseFoundationFilters(filters);
 if(!catalog||!Number.isSafeInteger(catalog.version)||catalog.version<0||!Array.isArray(catalog.concepts)||catalog.concepts.length>5000)bad();
 const known=new Map();
 for(const c of catalog.concepts){if(!c||known.has(c.conceptId))bad();known.set(c.conceptId,c);}
 const refs=new Map(catalogue.references.map(r=>[r.referenceId,r])),topics=new Map(catalogue.topics.map(t=>[t.topicId,t]));
 const subjects=new Set(catalogue.references.map(r=>r.subjectId));if(f.subject&&!subjects.has(f.subject))bad();
 // Index bindings once: per-row scans were O(objectives x bindings) and exceeded the Edge CPU limit.
 const byObjective=new Map(),byReference=new Map();
 for(const b of p.sourceBindings){
  if(!byObjective.has(b.objectiveVersionId))byObjective.set(b.objectiveVersionId,[]);byObjective.get(b.objectiveVersionId).push(b);
  if(!byReference.has(b.referenceId))byReference.set(b.referenceId,[]);byReference.get(b.referenceId).push(b.objectiveVersionId);
 }
 const digests=new Map();
 const digestOf=async c=>{if(!digests.has(c.conceptId))digests.set(c.conceptId,await canonicalIdentityDigest(c));return digests.get(c.conceptId);};
 const objectives=[];
 for(const row of p.objectives){
  const live=known.get(row.objective.conceptId);
  const identityState=!live?'missing':await digestOf(live)===row.canonicalIdentitySha256?'current':'changed';
  const sourceReferences=(byObjective.get(row.objective.objectiveVersionId)||[]).map(b=>({...b,code:refs.get(b.referenceId).observedCode,subjectId:refs.get(b.referenceId).subjectId}));
  objectives.push({...row,canonicalLabel:live?.label||'Canonical identity unavailable',identityState,identityKind:!live?'missing':live.identityKind==='accepted-private'?'accepted-private':'catalogue',sourceReferences});
 }
 const q=f.search.toLowerCase().trim(),codeQuery=q.replace(/\s+/g,'');
 const requirements=catalogue.references.map(r=>({referenceId:r.referenceId,sourceEdition:p.sourceEdition,sourceSha256:p.sourceSha256,code:r.observedCode,pdfPage:r.pdfPage,subjectId:r.subjectId,topicLabel:topics.get(r.topicId)?.label||'Unresolved topic heading',identifierState:r.identifierState,amendmentNotice:r.amendmentNotice,
  objectiveVersionIds:byReference.get(r.referenceId)||[]}))
  .filter(r=>(!f.subject||r.subjectId===f.subject)&&(!q||r.code.toLowerCase().replace(/\s+/g,'').includes(codeQuery)||r.topicLabel.toLowerCase().includes(q)));
 return {contractId:'admin-foundation-objective-drafts-v1',draftVersion:p.draftVersion,sourceEdition:p.sourceEdition,status:'draft-review-required',authoredCatalogVersion:p.authoredCatalogVersion,currentCatalogVersion:catalog.version,
  catalogVersionMatches:p.authoredCatalogVersion===catalog.version,identityBindingsCurrent:objectives.every(o=>o.identityState==='current'),
  acceptedMappings:0,clinicalApproval:false,learnerActivation:false,coverageFraction:null,
  totals:{sourceReferences:catalogue.references.length,objectiveDrafts:objectives.length,sourceLinkedReferences:new Set(p.sourceBindings.map(b=>b.referenceId)).size,unboundObjectiveDrafts:objectives.filter(o=>!o.sourceReferences.length).length},
  subjects:[...subjects].sort(),objectives,filteredReferences:requirements.length,offset:f.offset,nextOffset:f.offset+50<requirements.length?f.offset+50:null,requirements:requirements.slice(f.offset,f.offset+50)};
}
