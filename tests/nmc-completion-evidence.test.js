import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../',import.meta.url));
test('full NMC completion queue preserves unknown coverage and canonical reuse',()=>{
 const report=JSON.parse(execFileSync(process.execPath,['ops/nmc/report-completion-gaps.js'],{cwd,encoding:'utf8',maxBuffer:16*1024*1024}));
 assert.equal(report.sourceAccountingComplete,true);
 assert.equal(report.foundationComplete,false);
 assert.equal(report.productionStateVerified,false);
 assert.equal(report.adminApprovalRequired,false);
 assert.equal(report.rows.length,2634);
 assert.equal(new Set(report.rows.map(r=>r.referenceId)).size,report.rows.length);
 assert.equal(Object.keys(report.subjects).length,19);
 assert(report.rows.every(r=>r.coverageFraction===null&&r.teachingArtifactVersionIds===null&&r.assessmentArtifactVersionIds===null));
 const copd=report.rows.find(r=>r.code.replace(/\s/g,'')==='GM28.18');
 // Three earlier draft objectives on the draft-registry concept 'COPD exacerbation management', plus the
 // accepted canonical 'Obstructive airway disease' objective from Medicine part B (registry @22).
 assert.equal(copd.proposedObjectives.length,4);
 assert.equal(copd.proposedObjectives.filter(o=>o.conceptId==='C-f2c27acd-d39a-4558-9f04-83aa591d72fd').length,3);
 assert.equal(copd.proposedObjectives.filter(o=>o.conceptId==='C-e8c03208-4e55-4653-9cbc-e95ef07ebd79').length,1);
 assert.equal(copd.draftTeachingArtifactVersionIds.length,3);
 assert.equal(copd.draftAssessmentArtifactVersionIds.length,9);
 assert.equal(copd.componentRequirements.completeRequirementSetKnown,false);
});
test('draft teaching and case files resolve to exact component and objective versions',()=>{
 assert.doesNotThrow(()=>execFileSync(process.execPath,['ops/nmc/verify-respiratory-bindings.js'],{cwd,encoding:'utf8'}));
});
test('cross-subject candidates retain distinct source tasks and never infer a canonical merge',()=>{
 const report=JSON.parse(execFileSync(process.execPath,['ops/nmc/report-cross-subject-candidates.js'],{cwd,encoding:'utf8',maxBuffer:16*1024*1024}));
 assert.equal(report.automaticMerging,false);assert.equal(report.productionRegistryChecked,false);
 const appearances=report.candidates.flatMap(g=>g.appearances);
 assert.equal(new Set(appearances.map(a=>a.referenceId)).size,appearances.length);
 assert(report.candidates.every(g=>g.subjectIds.length>1&&g.canonicalConceptId===null&&g.identityEquivalence==='unverified'));
 const group=report.candidates.find(g=>g.label==='Infective endocarditis');
 assert.deepEqual(group.subjectIds,['medicine','microbiology','pathology','pediatrics']);
 assert.equal(group.appearances.length,4);
 assert.equal(new Set(group.appearances.map(a=>a.draftLearningTask)).size,4);
});
