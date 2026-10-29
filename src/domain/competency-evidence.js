// A private, source-traceable *proposal* ledger. This does not extract/copy NMC
// text, grant rights, create exam requirements or change Study Now.
import foundation from '../../data/dual-exam-syllabus-foundation.js';
import ledger from '../../data/competency-evidence-proposals.json' with {type:'json'};
import curriculum from '../../data/preparation-curriculum.js';
import {validateDualExamSyllabusFoundation} from './dual-exam-syllabus-foundation.js';
const fail=()=>{throw new TypeError('competency_evidence_invalid');};
const shape=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).sort().join('|')===[...keys].sort().join('|');
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9:_.@-]{1,160}$/.test(x);
const sha=x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x);
const text=(x,a,b)=>typeof x==='string'&&x.trim().length>=a&&x.length<=b&&!/[\u0000-\u001f]/.test(x);
const code=x=>typeof x==='string'&&/^[A-Z]{2,5}[0-9]{1,3}(?:\.[0-9]{1,3}){1,3}$/.test(x);
const examIds=new Set(['neet-pg','ini-cet']);
const unique=xs=>new Set(xs).size===xs.length;
export function validateCompetencyEvidenceProposals(input,{
 foundationRegistry=foundation,preparationRegistry=curriculum,
 canonicalConceptIds=null,catalogVersion=null
}={}){
 const base=validateDualExamSyllabusFoundation(foundationRegistry,preparationRegistry);
 if(!shape(input,['schemaVersion','ledgerVersion','foundationVersion','status','scope','competencyProposals'])||
    input.schemaVersion!==1||input.ledgerVersion!=='mbbs-competency-evidence:draft@1'||
    input.foundationVersion!==base.foundationVersion||input.status!=='unreviewed-candidate-ledger'||
    input.scope!=='NEET-PG and INI-CET proposals, NOT approved syllabus'||
    !Array.isArray(input.competencyProposals)||input.competencyProposals.length>2000)fail();
 const bySubject=new Map(base.subjects.map(s=>[s.subjectId,s]));
 const registeredSources=new Set(base.sources.map(s=>s.sourceId));
 const registeredPaths=new Set(preparationRegistry.pathways.filter(p=>p.status==='active')
  .map(p=>p.pathwayVersionId));
 const known=canonicalConceptIds==null?null:new Set(canonicalConceptIds);
 const keys=[];
 for(const row of input.competencyProposals){
  if(!shape(row,['sourceId','sourceVersion','sourceLocator','documentPage','competencyCode',
     'subjectId','moduleId','analystSummary','sourceRights','sourceVerification',
     'canonicalConceptId','authoredCatalogVersion','examHypotheses']))fail();
  if(!registeredSources.has(row.sourceId)||row.sourceId!=='nmc-cbme-2024'||
     row.sourceVersion!=='2024-09-12'||!text(row.sourceLocator,12,500)||
     !Number.isSafeInteger(row.documentPage)||row.documentPage<1||row.documentPage>10000||
     !code(row.competencyCode)||!bySubject.has(row.subjectId)||
     !bySubject.get(row.subjectId).domains.some(d=>d.domainId===row.moduleId)||
     !text(row.analystSummary,12,320)||
     row.sourceRights!=='unreviewed'||row.sourceVerification!=='unverified'||
     !Array.isArray(row.examHypotheses)||row.examHypotheses.length>2)fail();
  if(row.canonicalConceptId===null){
   if(row.authoredCatalogVersion!==null)fail();
  }else if(!id(row.canonicalConceptId)||!known||!known.has(row.canonicalConceptId)||
      !Number.isSafeInteger(catalogVersion)||catalogVersion<0||
      row.authoredCatalogVersion!==catalogVersion)fail();
  const exams=[];
  for(const scope of row.examHypotheses){
   if(!shape(scope,['pathwayVersionId','basis','status','rationale'])||
      !registeredPaths.has(scope.pathwayVersionId)||
      !base.scopes.some(e=>e.pathwayVersionId===scope.pathwayVersionId&&
                               examIds.has(e.examId))||
      scope.basis!=='editorial-hypothesis'||scope.status!=='unverified'||
      !text(scope.rationale,12,500))fail();
   exams.push(scope.pathwayVersionId);
  }
  if(!unique(exams))fail();
  keys.push(row.sourceId+'|'+row.sourceVersion+'|'+row.competencyCode);
 }
 if(!unique(keys))fail();
 return structuredClone(input);
}
export function competencyEvidencePreflight(input=ledger,options={}){
 const d=validateCompetencyEvidenceProposals(input,options);
 const total=d.competencyProposals.length;
 const unresolved=d.competencyProposals.filter(r=>r.canonicalConceptId===null).length;
 const examHypotheses=Object.fromEntries(['neet-pg:preparation@1','ini-cet:preparation@1'].map(p=>
  [p,d.competencyProposals.filter(r=>r.examHypotheses.some(s=>s.pathwayVersionId===p)).length]));
 return {
  contractId:'dual-exam-competency-evidence-preflight-v1',
  ledgerVersion:d.ledgerVersion,foundationVersion:d.foundationVersion,
  candidateRecords:total,unresolvedCanonicalIdentities:unresolved,
  examHypotheses,sourceVerified:0,sourceRightsApproved:0,
  approvedObjectives:0,approvedExamMappings:0,
  officialSyllabusCertified:false,coverageFraction:null,
  readinessInferred:false,learnerRelease:false,
  blockers:[
   'source-pages-and-competency-codes-require-human-verification',
   'source-rights-review-required',
   'canonical-concept-identity-acceptance-separate',
   'independent-exam-scope-review-required',
   'no-approved-objective-mapping',
   'no-syllabus-completeness-attestation'
  ]
 };
}
