import {createHash} from 'node:crypto';
import {validateImport,questionSignature,questionAnswer} from '../content-library.js';
import {validateCatalog} from '../content.js';
import {taskAxes,validateIntelligence} from '../question-intelligence.js';
import {validateRelease,canonicalJson,QUESTION_GATES,fail,identifier} from './contract.js';

const order=(a,b)=>a.recordId<b.recordId?-1:a.recordId>b.recordId?1:0;
const same=(a,b)=>canonicalJson(a)===canonicalJson(b);
const digest=value=>createHash('sha256').update(canonicalJson(value)).digest('hex');
const content=q=>Object.fromEntries(['questionId','stem','options','answerOptionId','explanation','conceptLinks'].map(k=>[k,q[k]]));
const latest=(target,id)=>target?.catalog.questions.filter(q=>q.questionId===id).sort((a,b)=>b.version-a.version)[0];
function validateQuestion(q,{target,concepts,sources}){
  const old=latest(target,q.questionId);
  let check=q;if(old&&q.intelligence){validateIntelligence(old,q.intelligence);const {intelligence,...original}=q;check=original;}
  validateImport({schemaVersion:check.intelligence?2:1,importId:'validation',concepts,sources,questions:[check],notes:[],noteQuestionLinks:[]});
}
const mediaPresent=q=>taskAxes(q).presentation.some(p=>['image','ecg-tracing','histology','audio','video','sequential-case'].includes(p));
function eligible(r,release){
  if(release.manifest.eligibility.intendedUse!=='app_publication')return 'private_study_scope';
  if(!release.manifest.eligibility.includedIds.includes(r.recordId))return release.manifest.eligibility.excluded.find(x=>x.recordId===r.recordId)?.reason??'not_in_release_scope';
  const gates=r.archive.gates??[];
  const applicable=r.app.questionId?QUESTION_GATES:['extraction','medical','provenance','rights','learning-utility'];
  for(const gate of applicable){const g=gates.find(x=>x.gate===gate);if(!g||['failed','pending'].includes(g.status)||g.status==='passed'&&!g.evidenceRefs.length||g.status==='not_applicable'&&!r.archive.notApplicableReasons?.[gate])return 'critical_gate_unresolved';}
  return null;
}
export function mapRelease(input,{target=null,adapterVersion='1'}={}){
  const release=validateRelease(input);identifier(String(adapterVersion));
  if(target){if(target.contractId!=='content-library-inbox-v1'||typeof target.environment!=='string'||!target.environment||!Number.isFinite(Date.parse(target.capturedAt))||!Array.isArray(target.questionMetadata)||!Array.isArray(target.conceptMetadata))fail('target_snapshot_invalid');validateCatalog(target.catalog);}
  const out={releaseId:release.manifest.releaseId,releaseDigest:digest({manifest:release.manifest,records:Object.fromEntries(Object.entries(release.records).map(([k,rows])=>[k,[...rows].sort((a,b)=>String(a.recordId??a.occurrenceId??a.relationId)<String(b.recordId??b.occurrenceId??b.relationId)?-1:1)]))}),adapterVersion:String(adapterVersion),concepts:[],sources:[],questions:[],notes:[],noteQuestionLinks:[],routes:[],excluded:[],diagnostics:[],compatibility:'compatibility_pending',recordMap:[]};
  const concepts=release.records.concepts.map(r=>structuredClone(r.app)).sort((a,b)=>a.conceptId<b.conceptId?-1:1),sources=release.records.sources.map(r=>structuredClone(r.app)).sort((a,b)=>a.sourceId<b.sourceId?-1:1);
  // Validate support records even when no eligible question happens to reference them.
  for(const c of concepts){const q=release.records.questions.find(q=>q.app.conceptLinks.some(l=>l.conceptId===c.conceptId))?.app;if(q){try{validateQuestion(q,{target,concepts:[c],sources:[]});}catch(e){if(e.message!=='media_import_requires_asset_contract')throw e;}}}
  for(const s of sources){const q=release.records.questions.find(q=>q.app.sourceIds.includes(s.sourceId))?.app;if(q){try{validateQuestion(q,{target,concepts:[],sources:[s]});}catch(e){if(e.message!=='media_import_requires_asset_contract')throw e;}}}
  for(const c of concepts){const old=target?.catalog.concepts.find(x=>x.conceptId===c.conceptId);if(old){const {classification,...base}=c;if(!same(base,old))fail('concept_identity_conflict');const meta=target.conceptMetadata.find(x=>x.concept_id===c.conceptId);if(meta?.classification&&!same(meta.classification,c.classification))fail('concept_identity_conflict');}}
  for(const s of sources){const old=target?.catalog.sources.find(x=>x.sourceId===s.sourceId);if(old&&['title','url','version'].some(k=>!same(s[k],old[k])))fail('source_identity_conflict');}
  // Analyze the whole corpus before any eligibility or route can hide a conflict.
  const corpus=new Map(),contentConflicts=new Set();
  for(const r of release.records.questions){const q=r.app,signature=questionSignature(q),answer=questionAnswer(q),prior=corpus.get(signature);if(prior&&prior.answer!==answer)fail('answer_conflict');if(prior&&prior.q.explanation!==q.explanation){contentConflicts.add(prior.id);contentConflicts.add(r.recordId);}if(!prior)corpus.set(signature,{id:r.recordId,q,answer});}
  // All members of a conflicting explanation family require review, including a third repeat.
  for(const r of release.records.questions)if(contentConflicts.has(corpus.get(questionSignature(r.app)).id))contentConflicts.add(r.recordId);
  const representatives=new Map(),redirects=new Map();
  for(const r of [...release.records.questions].sort(order)){
    const q=structuredClone(r.app),occurrences=release.records.occurrences.filter(o=>o.questionId===r.recordId);
    let validationMedia=false;
    try{validateQuestion(q,{target,concepts:concepts.filter(c=>q.conceptLinks.some(l=>l.conceptId===c.conceptId)),sources:sources.filter(s=>q.sourceIds.includes(s.sourceId))});}catch(e){if(e.message==='media_import_requires_asset_contract')validationMedia=true;else throw e;}
    const signature=questionSignature(q),answer=questionAnswer(q),prior=representatives.get(signature);
    if(prior&&prior.answer!==answer)fail('answer_conflict');
    if(contentConflicts.has(r.recordId)){out.excluded.push({recordId:r.recordId,reason:'duplicate_content_conflict'});continue;}
    for(const o of occurrences)if(o.historicalKey!==null&&!q.options.some(x=>x.optionId===o.historicalKey))fail('occurrence_historical_key_invalid');
    if(occurrences.some(o=>o.historicalKey!==null&&o.historicalKey!==q.answerOptionId)){out.excluded.push({recordId:r.recordId,reason:'historical_key_conflict'});continue;}
    if(occurrences.some(o=>o.origin?.kind==='pyq'&&o.historicalKey===null)){out.excluded.push({recordId:r.recordId,reason:'historical_key_unverified'});continue;}
    if(occurrences.some(o=>o.verification!=='verified'||o.origin===null)){out.excluded.push({recordId:r.recordId,reason:'occurrence_unverified'});continue;}
    const origins=[];for(const o of occurrences){if(!q.origins.some(x=>same(x,o.origin)))fail('occurrence_origin_mismatch');if(!origins.some(x=>same(x,o.origin)))origins.push(o.origin);}
    if(q.origins.some(o=>!origins.some(x=>same(x,o))))fail('occurrence_origin_mismatch');
    q.origins.sort((a,b)=>canonicalJson(a)<canonicalJson(b)?-1:1);
    const reason=eligible(r,release);if(reason){out.excluded.push({recordId:r.recordId,reason});continue;}
    const old=latest(target,r.recordId);
    if(validationMedia||mediaPresent(q)||r.archive.mediaRequired===true){out.routes.push({recordId:r.recordId,kind:'media',reason:'media_import_requires_asset_contract',expectedVersionId:old?.questionVersionId??null});continue;}
    if(old){
      if(!same(content(old),content(q))){out.routes.push({recordId:r.recordId,kind:'correction',reason:'existing_question_changed',expectedVersionId:old.questionVersionId});continue;}
      const addedSources=q.sourceIds.filter(id=>!old.sourceIds.includes(id));
      if(old.sourceIds.some(id=>!q.sourceIds.includes(id))||addedSources.some(id=>!occurrences.some(o=>o.sourceId===id))){out.routes.push({recordId:r.recordId,kind:'correction',reason:'existing_source_relationship_changed',expectedVersionId:old.questionVersionId});continue;}
      const meta=target.questionMetadata.find(x=>x.question_id===r.recordId);
      if(!same(meta?.classification,q.classification)||!same(meta?.intelligence??null,q.intelligence??null)){out.routes.push({recordId:r.recordId,kind:'correction',reason:'existing_question_metadata_changed',expectedVersionId:old.questionVersionId});continue;}
      if(addedSources.length||!same(meta?.origins??[],q.origins)){out.routes.push({recordId:r.recordId,kind:'provenance',reason:'existing_provenance_changed',expectedVersionId:old.questionVersionId});continue;}
      out.recordMap.push({recordId:r.recordId,canonicalId:r.recordId,action:'unchanged',questionVersionId:old.questionVersionId});continue;
    }
    const other=target?.catalog.questions.find(x=>questionSignature(x)===signature);
    if(other){if(questionAnswer(other)!==answer)fail('answer_conflict');out.excluded.push({recordId:r.recordId,reason:'existing_duplicate_requires_identity_review',canonicalId:other.questionId});continue;}
    if(prior){
      if(!same(prior.q.conceptLinks,q.conceptLinks)||!same(prior.q.classification,q.classification)||!same(prior.q.intelligence??null,q.intelligence??null)){out.excluded.push({recordId:r.recordId,reason:'duplicate_metadata_conflict'});continue;}
      prior.q.origins=[...new Map([...prior.q.origins,...q.origins].map(o=>[canonicalJson(o),o])).values()].sort((a,b)=>canonicalJson(a)<canonicalJson(b)?-1:1);
      prior.q.sourceIds=[...new Set([...prior.q.sourceIds,...q.sourceIds])].sort();redirects.set(r.recordId,prior.q.questionId);out.excluded.push({recordId:r.recordId,reason:'duplicate_to_canonical',canonicalId:prior.q.questionId});out.recordMap.push({recordId:r.recordId,canonicalId:prior.q.questionId,action:'duplicate'});continue;
    }
    representatives.set(signature,{q,answer});out.questions.push(q);out.recordMap.push({recordId:r.recordId,canonicalId:r.recordId,action:'new'});
  }
  const usable=new Set(out.questions.map(q=>q.questionId));
  for(const x of out.recordMap)if(x.action==='unchanged')usable.add(x.canonicalId);
  for(const r of [...release.records.notes].sort(order)){
    const n=structuredClone(r.app),links=release.records.relations.filter(l=>l.fromId===r.recordId&&['explains','contrasts','prerequisite'].includes(l.kind)).map(l=>({noteId:n.noteId,questionId:redirects.get(l.toId)??l.toId,relation:l.kind,section:l.section}));
    validateImport({schemaVersion:1,importId:'validation',concepts:concepts.filter(c=>c.conceptId===n.conceptId),sources:sources.filter(s=>n.sourceIds.includes(s.sourceId)),questions:[],notes:[n],noteQuestionLinks:links.slice(0,1)});
    const reason=eligible(r,release);if(reason){out.excluded.push({recordId:r.recordId,reason});continue;}
    if(target&&!Array.isArray(target.notes)){out.excluded.push({recordId:r.recordId,reason:'target_note_snapshot_missing'});continue;}
    const old=target?.notes.find(x=>x.noteId===r.recordId);if(old){out.excluded.push({recordId:r.recordId,reason:same(old,n)?'unchanged_note':'note_correction_route_unavailable'});continue;}
    if(links.some(l=>!usable.has(l.questionId))){out.excluded.push({recordId:r.recordId,reason:'linked_question_not_eligible'});continue;}
    if(links.some(l=>!out.questions.some(q=>q.questionId===l.questionId))){out.excluded.push({recordId:r.recordId,reason:'existing_question_dependency_requires_integration'});continue;}
    out.notes.push(n);out.noteQuestionLinks.push(...links);
  }
  const usedConcepts=new Set([...out.questions.flatMap(q=>q.conceptLinks.map(l=>l.conceptId)),...out.notes.map(n=>n.conceptId)]),usedSources=new Set([...out.questions,...out.notes].flatMap(q=>q.sourceIds));
  out.concepts=concepts.filter(c=>usedConcepts.has(c.conceptId));out.sources=sources.filter(s=>usedSources.has(s.sourceId));
  out.knownQuestionIds=target?target.catalog.questions.map(q=>q.questionId):[];
  return out;
}
