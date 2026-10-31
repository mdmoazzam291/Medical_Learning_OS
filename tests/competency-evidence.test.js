import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../data/competency-evidence-proposals.json' with {type:'json'};
import foundation from '../data/dual-exam-syllabus-foundation.js';
import {validateCompetencyEvidenceProposals,competencyEvidencePreflight}
 from '../src/domain/competency-evidence.js';
const clone=()=>structuredClone(data);
const example=()=>({
 sourceId:'nmc-cbme-2024',sourceVersion:'2024-09-12',
 sourceLocator:'Synthetic NMC-style document, Volume II, PDF p. 9, code GM98.1',
 documentPage:9,competencyCode:'GM98.1',subjectId:'medicine',
 moduleId:foundation.subjects.find(s=>s.subjectId==='medicine').domains[0].domainId,
 analystSummary:'Synthetic demonstration of identifying a competency code; not a medical fact.',
 sourceRights:'unreviewed',sourceVerification:'unverified',
 canonicalConceptId:null,canonicalIdentityDigest:null,authoredCatalogVersion:null,
 examHypotheses:[
  {pathwayVersionId:'neet-pg:preparation@1',basis:'editorial-hypothesis',status:'unverified',
   rationale:'Synthetic unverified proposal for testing only.'},
  {pathwayVersionId:'ini-cet:preparation@1',basis:'editorial-hypothesis',status:'unverified',
   rationale:'Synthetic unverified proposal for testing only.'}
 ]
});
test('restricted pilot ledger is honest: zero verified rows or exam denominator',()=>{
 const x=competencyEvidencePreflight();
 assert.equal(data.competencyProposals.length,8);
 assert.equal(x.candidateRecords,8);
 assert.ok(data.competencyProposals.every(x=>x.sourceVerification==='unverified'&&
  x.sourceRights==='unreviewed'&&x.canonicalConceptId===null&&x.examHypotheses.length===0));
 assert.equal(x.sourceVerified,0);assert.equal(x.approvedObjectives,0);
 assert.equal(x.approvedExamMappings,0);assert.equal(x.officialSyllabusCertified,false);
 assert.equal(x.learnerRelease,false);assert.equal(x.coverageFraction,null);
 assert.equal(x.examHypotheses['neet-pg:preparation@1'],0);
 assert.equal(x.examHypotheses['ini-cet:preparation@1'],0);
});
test('one *synthetic* undergraduate competency reference supports two unverified exam hypotheses',()=>{
 const d=clone();d.competencyProposals.push(example());
 assert.equal(validateCompetencyEvidenceProposals(d).competencyProposals.length,9);
 const report=competencyEvidencePreflight(d);
 assert.equal(report.candidateRecords,9);assert.equal(report.unresolvedCanonicalIdentities,9);
 assert.equal(report.examHypotheses['neet-pg:preparation@1'],1);
 assert.equal(report.examHypotheses['ini-cet:preparation@1'],1);
 assert.equal(report.approvedExamMappings,0);
});
test('rejects fabricated source approval, copied fields, duplicate codes and unknown subject/module',()=>{
 const mutations=[
  r=>r.sourceRights='approved',r=>r.sourceVerification='verified',
  r=>r.officialSyllabusCertified=true,r=>r.competencyCode='UNKNOWN',
  r=>r.documentPage=null,r=>r.sourceLocator='',r=>r.moduleId='invented',
  r=>r.subjectId='orthopedic',
  r=>{r.subjectId='anatomy';r.moduleId='anatomy:gross-regional-anatomy';},r=>r.sourceId='aiims-inicet-2027',
  r=>r.examHypotheses[0].status='approved',
  r=>r.examHypotheses[0].basis='official',
  r=>r.examHypotheses[0].rationale='no',
  r=>r.examHypotheses[1].pathwayVersionId='neet-pg:preparation@1',
  r=>r.authoredCatalogVersion=446,
  r=>r.canonicalConceptId='invented-identity',
  r=>r.canonicalIdentityDigest='a'.repeat(64)
 ];
 for(const mutate of mutations){
  const d=clone(),row=example();mutate(row);d.competencyProposals.push(row);
  assert.throws(()=>validateCompetencyEvidenceProposals(d),/competency_evidence_invalid/);
 }
 const d=clone();d.competencyProposals=[example(),example()];
 assert.throws(()=>validateCompetencyEvidenceProposals(d),/competency_evidence_invalid/);
});
test('a proposed canonical binding requires an exact current, externally supplied identity snapshot',()=>{
 const d=clone(),row=example();
 row.canonicalConceptId='concept-real';row.canonicalIdentityDigest='c'.repeat(64);row.authoredCatalogVersion=446;
 d.competencyProposals=[row];
 for(const opts of [{}, {canonicalIdentityDigests:{'concept-real':'c'.repeat(64)},catalogVersion:447},
  {canonicalIdentityDigests:{different:'c'.repeat(64)},catalogVersion:446}])
  assert.throws(()=>validateCompetencyEvidenceProposals(d,opts),/competency_evidence_invalid/);
 assert.throws(()=>validateCompetencyEvidenceProposals(d,{
  canonicalIdentityDigests:{'concept-real':'d'.repeat(64)},catalogVersion:446
 }),/competency_evidence_invalid/);
 assert.equal(validateCompetencyEvidenceProposals(d,{
  canonicalIdentityDigests:{'concept-real':'c'.repeat(64)},catalogVersion:446
 }).competencyProposals[0].canonicalConceptId,'concept-real');
});
test('source JSON contains no clinical prose, personal learner data or learner-release permissions',()=>{
 const source=JSON.stringify(data);
 assert.doesNotMatch(source,/"stem"|"answerOptionId"|"mastery"|"learnerId"|"rawText"/);
 assert.equal(data.status,'unreviewed-candidate-ledger');
});
