import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path,root),'utf8'));
const scope=read('docs/evidence/2026-11-08-nmc-endocarditis-cross-subject-components.json');
const packet=read('docs/evidence/2026-11-08-nmc-endocarditis-assessment-blueprints.json');
const components=new Map(scope.rows.flatMap(r=>r.components.map(c=>[c.componentId,{...c,referenceId:r.referenceId,subjectId:r.subjectId}])));
assert.equal(packet.status,'draft-assessment-blueprints');assert.equal(packet.clinicalApproval,false);assert.equal(packet.learnerActivation,false);assert.equal(packet.coverageFraction,null);
assert.equal(packet.rows.length,components.size);
assert.equal(new Set(packet.rows.map(r=>r.blueprintVersionId)).size,packet.rows.length);
assert.equal(new Set(packet.rows.map(r=>r.componentId)).size,packet.rows.length);
for(const r of packet.rows){
 const c=components.get(r.componentId);assert(c);assert.equal(r.referenceId,c.referenceId);assert.equal(r.subjectId,c.subjectId);assert.equal(r.objectiveWording,c.wording);
 assert.equal(r.status,'draft-blueprint');assert.equal(r.clinicalAnswerKey,null);assert.equal(r.passThreshold,null);assert.equal(r.canonicalObjectiveVersionId,null);assert.equal(r.learnerActivation,false);
 for(const k of ['inputsRequired','baselinePrompt','transferPrompt','scoreRecording'])assert(typeof r[k]==='string'&&r[k].length>20);
 assert.equal(r.scoringDimensions.length,4);
}
console.log('Verified '+packet.rows.length+' draft blueprints with exact source/component associations; no clinical keys or publication claims');
