// Validate an editorial navigation scaffold against the existing Preparation Curriculum.
// No scaffold entry may become an approved objective, a syllabus denominator, or a
// learner recommendation through this module.
import curriculum from '../../data/preparation-curriculum.js';
import foundation from '../../data/dual-exam-syllabus-foundation.js';
import {SUBJECT_INDEX} from './subject-index.js';
const deny=()=>{throw new TypeError('dual_exam_syllabus_foundation_invalid');};
const unique=xs=>new Set(xs).size===xs.length;
const shape=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join('|')===[...keys].sort().join('|');
const id=x=>typeof x==='string'&&/^[a-z0-9][a-z0-9:.@-]*$/.test(x);
const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=240;
const array=x=>Array.isArray(x);
export function validateDualExamSyllabusFoundation(input,registry=curriculum){
 if(!shape(input,['schemaVersion','foundationVersion','status','subjects','sources','scopes','conceptBindings','proposedExamObjectives','reviewedExamMappings'])||
    input.schemaVersion!==1||input.status!=='editorial-scaffold'||
    !id(input.foundationVersion)||!array(input.subjects)||input.subjects.length!==19||
    !array(input.sources)||!array(input.scopes)||input.scopes.length!==2||
    !array(input.conceptBindings)||input.conceptBindings.length||
    !array(input.proposedExamObjectives)||input.proposedExamObjectives.length||
    !array(input.reviewedExamMappings)||input.reviewedExamMappings.length)deny();
 const subjectIds=input.subjects.map(s=>s.subjectId);
 if(!unique(subjectIds))deny();
 let domainCount=0;const domainIds=[];
 for(const subject of input.subjects){
  if(!shape(subject,['subjectId','label','phase','domains'])||
     !id(subject.subjectId)||!text(subject.label)||
     !['preclinical','paraclinical','clinical'].includes(subject.phase)||
     !array(subject.domains)||subject.domains.length<2)deny();
  for(const domain of subject.domains){
   if(!shape(domain,['domainId','label'])||
      !id(domain.domainId)||!domain.domainId.startsWith(subject.subjectId+':')||
      !text(domain.label))deny();
   domainIds.push(domain.domainId);domainCount++;
  }
 }
 if(!unique(domainIds))deny();
 // The owner-approved subject/module index is the only canonical navigation
 // taxonomy. Any duplicate or drifted parallel syllabus tree fails closed.
 if(input.subjects.length!==SUBJECT_INDEX.length)deny();
 for(let i=0;i<SUBJECT_INDEX.length;i++){
  const subject=input.subjects[i],canonical=SUBJECT_INDEX[i];
  if(subject.subjectId!==canonical.id||subject.label!==canonical.label||
     subject.domains.length!==canonical.modules.length)deny();
  for(let j=0;j<canonical.modules.length;j++){
   const module=canonical.modules[j],domain=subject.domains[j];
   if(domain.domainId!==canonical.id+':'+module.id||domain.label!==module.label)deny();
  }
 }

 const sourceIds=input.sources.map(s=>s.sourceId);
 if(!unique(sourceIds)||!input.sources.length)deny();
 for(const source of input.sources)if(!shape(source,['sourceId','issuer','sourceVersion','sourceRole','url'])||
   !id(source.sourceId)||!text(source.issuer)||
   !text(source.sourceVersion)||!text(source.sourceRole)||
   typeof source.url!=='string'||!/^https:\/\/[^\s]+$/.test(source.url))deny();
 const exams=input.scopes.map(x=>x.examId);
 if(!unique(exams)||!exams.includes('neet-pg')||!exams.includes('ini-cet'))deny();
 for(const scope of input.scopes){
  const pathway=registry?.pathways?.find(p=>p.pathwayId===scope.examId&&p.status==='active');
  if(!shape(scope,['examId','pathwayVersionId','status','sourceIds','subjectIds','officialTopicListCertified','scopeApproved','priorityEvidenceStatus'])||
    !pathway||scope.pathwayVersionId!==pathway.pathwayVersionId||
    scope.status!=='editorial-scaffold'||scope.officialTopicListCertified!==false||
    scope.scopeApproved!==false||scope.priorityEvidenceStatus!=='not-evaluated'||
    !array(scope.subjectIds)||scope.subjectIds.length!==subjectIds.length||
    !unique(scope.subjectIds)||subjectIds.some(x=>!scope.subjectIds.includes(x))||
    !array(scope.sourceIds)||!scope.sourceIds.length||!unique(scope.sourceIds)||
    scope.sourceIds.some(x=>!sourceIds.includes(x)))deny();
 }
 const neet=input.scopes.find(x=>x.examId==='neet-pg');
 const ini=input.scopes.find(x=>x.examId==='ini-cet');
 if(!neet.sourceIds.includes('nbems-neetpg-2026')||!neet.sourceIds.includes('nmc-cbme-2024')||
    !ini.sourceIds.includes('aiims-inicet-2027')||!ini.sourceIds.includes('nmc-cbme-2024'))deny();
 return structuredClone(input);
}
export function dualExamSyllabusOverview(input=foundation,registry=curriculum){
 const checked=validateDualExamSyllabusFoundation(input,registry);
 return {
  foundationVersion:checked.foundationVersion,
  status:checked.status,
  sharedSubjects:checked.subjects,
  domainCount:checked.subjects.reduce((sum,s)=>sum+s.domains.length,0),
  scopes:checked.scopes.map(s=>({
   examId:s.examId,label:registry.pathways.find(p=>p.pathwayId===s.examId).label,
   pathwayVersionId:s.pathwayVersionId,subjectCount:s.subjectIds.length,
   sourceIds:s.sourceIds,officialTopicListCertified:false,scopeApproved:false,
   priorityEvidenceStatus:'not-evaluated',coverageFraction:null,readinessInferred:false
  })),
  sources:checked.sources,
  canonicalConceptBindings:0,approvedObjectivesAdded:0,
  officialSyllabusCertified:false,learnerRelease:false
 };
}
