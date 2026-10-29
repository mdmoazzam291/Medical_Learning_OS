import test from 'node:test';
import assert from 'node:assert/strict';
import foundation from '../data/dual-exam-syllabus-foundation.js';
import curriculum from '../data/preparation-curriculum.js';
import {validateDualExamSyllabusFoundation,dualExamSyllabusOverview} from '../src/domain/dual-exam-syllabus-foundation.js';
import {syllabusBaselineForm} from '../web/syllabus-baseline-editor.js';
const clone=()=>structuredClone(foundation);
test('both exam overlays reuse exactly one unique subject and domain scaffold',()=>{
 const d=validateDualExamSyllabusFoundation(clone(),curriculum),o=dualExamSyllabusOverview(d,curriculum);
 assert.equal(o.sharedSubjects.length,19);
 assert.ok(o.domainCount>80,'Broad editorial domains should be visible, not fabricated competencies');
 assert.deepEqual(o.scopes.map(x=>x.examId),['neet-pg','ini-cet']);
 assert.deepEqual(d.scopes.map(x=>x.pathwayVersionId),curriculum.pathways.map(x=>x.pathwayVersionId));
 assert.ok(d.scopes.every(s=>s.subjectIds.length===19));
 assert.equal(new Set(d.subjects.flatMap(s=>s.domains.map(x=>x.domainId))).size,o.domainCount);
 assert.deepEqual(d.conceptBindings,[]);assert.deepEqual(d.proposedExamObjectives,[]);
 assert.deepEqual(d.reviewedExamMappings,[]);
});
test('source register declares distinct authorities, never official topic confirmation',()=>{
 const o=dualExamSyllabusOverview();
 assert.equal(o.status,'editorial-scaffold');assert.equal(o.officialSyllabusCertified,false);
 assert.equal(o.learnerRelease,false);assert.equal(o.approvedObjectivesAdded,0);
 assert.ok(o.scopes.every(s=>s.coverageFraction===null&&s.readinessInferred===false&&
   s.scopeApproved===false&&s.officialTopicListCertified===false&&s.priorityEvidenceStatus==='not-evaluated'));
 assert.ok(o.scopes[0].sourceIds.includes('nbems-neetpg-2026'));
 assert.ok(o.scopes[1].sourceIds.includes('aiims-inicet-2027'));
 assert.ok(o.sources.every(s=>s.url.startsWith('https://')));
});
test('invalid scope, duplicate domains, fake approvals and poisoned source are rejected',()=>{
 for(const mutation of [
   f=>{f.scopes[0].scopeApproved=true;},
   f=>{f.scopes[1].officialTopicListCertified=true;},
   f=>{f.scopes[0].subjectIds.pop();},
   f=>{f.scopes[1].pathwayVersionId='other:preparation@1';},
   f=>{f.scopes[0].priorityEvidenceStatus='known';},
   f=>{f.subjects[1].domains[0].domainId=f.subjects[0].domains[0].domainId;},
   f=>{f.conceptBindings.push({conceptId:'invented'});},
   f=>{f.reviewedExamMappings.push({status:'approved'});},
   f=>{f.sources[0].url='javascript:alert(1)';}
 ]){const d=clone();mutation(d);assert.throws(()=>validateDualExamSyllabusFoundation(d,curriculum),/dual_exam_syllabus_foundation_invalid/);}
});
test('Admin syllabus editor shows both exam foundations as reference, not approval',()=>{
 const html=syllabusBaselineForm({loaded:true});
 assert.match(html,/Shared MBBS syllabus foundation/);
 assert.match(html,/NEET-PG/);assert.match(html,/INI-CET/);
 assert.match(html,/19 editorial subject buckets/);
 assert.match(html,/not an official topic list/i);
 assert.doesNotMatch(html,/Official syllabus certified|Overall readiness: \d+%|Publish syllabus/);
});
