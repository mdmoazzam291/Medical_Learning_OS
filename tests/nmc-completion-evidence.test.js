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
 assert.equal(copd.proposedObjectives.length,3);
 assert.equal(new Set(copd.proposedObjectives.map(o=>o.conceptId)).size,1);
 assert.equal(copd.draftTeachingArtifactVersionIds.length,3);
 assert.equal(copd.draftAssessmentArtifactVersionIds.length,9);
 assert.equal(copd.componentRequirements.completeRequirementSetKnown,false);
});
test('draft teaching and case files resolve to exact component and objective versions',()=>{
 assert.doesNotThrow(()=>execFileSync(process.execPath,['ops/nmc/verify-respiratory-bindings.js'],{cwd,encoding:'utf8'}));
});
