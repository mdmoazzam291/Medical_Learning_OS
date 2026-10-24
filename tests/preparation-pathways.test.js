import test from 'node:test';
import assert from 'node:assert/strict';
import initialCurriculum from '../data/preparation-curriculum.js';
const domain = await import('../src/domain/preparation-pathways.js').catch(() => ({}));
import { profile, curriculum, library } from './fixtures/preparation-fixture.js';
test('only active pathways can be selected; preference fields cannot carry authority',()=>{
  assert.equal(typeof domain.validatePreparationProfile,'function');
  const r=curriculum();
  assert.deepEqual(domain.validatePreparationProfile(profile,r),profile);
  for(const bad of [{...profile,pathwayIds:['future']},{...profile,pathwayIds:['neet-pg','neet-pg']},{...profile,primaryPathwayId:'future'},{...profile,isAdmin:true},{...profile,schemaVersion:2}])assert.throws(()=>domain.validatePreparationProfile(bad,r));
});
test('combined objectives and prerequisite closure share identities while keeping each exam coverage separate',()=>{
  assert.equal(typeof domain.resolvePreparation,'function');
  const result=domain.resolvePreparation(curriculum(),profile);
  assert.deepEqual(result.objectiveVersionIds.sort(),['foundation@1','ini-only@1','neet-only@1','shared@1']);
  assert.deepEqual(result.foundationObjectiveVersionIds,['foundation@1']);
  assert.deepEqual(result.pathways.map(p=>p.requiredObjectiveVersionIds.length),[2,2]);
});
test('scope uses reviewed exact artifact bindings, never historical exam origin or topic alone',()=>{
  assert.equal(typeof domain.preparationLibrary,'function');
  const lib={...library(),preparation:{profile,curriculum:curriculum()}};
  const both=domain.preparationLibrary(lib,'goals');
  assert.deepEqual(both.questions.map(q=>q.questionId),['shared-q','n-q','i-q','f-q']);
  assert.deepEqual(both.notes.map(n=>n.noteVersionId),['shared-note@1']);
  assert.equal(both.questions.filter(q=>q.questionId==='shared-q').length,1);
  assert.deepEqual(domain.preparationLibrary(lib,'foundations').questions.map(q=>q.questionId),['f-q']);
  assert.equal(domain.preparationLibrary(lib,'all').questions.length,5);
  assert.equal(lib.questions.length,5);
  const neet={...lib,preparation:{...lib.preparation,profile:{...profile,pathwayIds:['neet-pg']}}};
  assert.deepEqual(domain.preparationLibrary(neet,'goals').questions.map(q=>q.questionId),['shared-q','n-q','f-q']);
  lib.questions[0].questionVersionId='shared-q@2';
  assert.equal(domain.preparationLibrary(lib,'goals').questions.some(q=>q.questionId==='shared-q'),false);
});
test('zero approved requirements preserve published general practice without claiming exam relevance',()=>{
  const c=curriculum();c.mappings=[];
  const all=library(), scoped=domain.preparationLibrary({...all,preparation:{profile,curriculum:c}},'goals');
  assert.deepEqual(scoped.questions.map(q=>q.questionId),all.questions.map(q=>q.questionId));
  assert.deepEqual(scoped.notes.map(n=>n.noteVersionId),all.notes.map(n=>n.noteVersionId));
  assert.equal(scoped.preparation.fallbackReason,'unmapped-goal-requirements');
  assert.deepEqual(scoped.preparation.coverage.pathways.map(p=>p.status),['unmapped','unmapped']);
  assert.equal(domain.preparationLibrary({...all,preparation:{profile,curriculum:c}},'foundations').questions.length,0);
  const cPartial=curriculum();cPartial.mappings=cPartial.mappings.filter(m=>m.objectiveVersionId==='shared@1');
  const partly=domain.preparationLibrary({...all,preparation:{profile,curriculum:cPartial}},'goals');
  assert.deepEqual(partly.questions.map(q=>q.questionId),['shared-q','f-q']);
  assert.equal(partly.preparation.fallbackReason,undefined);
});
test('shipped registry falls back to general content only for a valid configured profile',()=>{
  const scoped=domain.preparationLibrary({...library(),preparation:{profile,curriculum:initialCurriculum}},'goals');
  assert.equal(scoped.questions.length,5);
  assert.equal(scoped.preparation.fallbackReason,'unmapped-goal-requirements');
});
test('coverage distinguishes teaching, independent assessments and unmapped pathway requirements',()=>{
  assert.equal(typeof domain.preparationCoverage,'function');
  const report=domain.preparationCoverage(library(),curriculum(),profile);
  assert.equal(report.pathways[0].required,2);assert.equal(report.pathways[0].withTeaching,1);assert.equal(report.pathways[0].withAssessment,2);
  assert.deepEqual(report.pathways[1].missingTeaching,['ini-only@1']);
  const empty=curriculum();empty.mappings=[];
  assert.equal(domain.preparationCoverage(library(),empty,profile).pathways[0].status,'unmapped');
  assert.equal(domain.preparationCoverage(library(),empty,profile).pathways[0].coverageFraction,null);
});
test('draft and retired requirement/binding records never qualify content',()=>{
  assert.equal(typeof domain.preparationLibrary,'function');
  const c=curriculum();c.mappings[0].status='draft';c.mappings[0].reviewedBy=null;c.mappings[1].status='retired';c.artifacts[1].status='draft';c.artifacts[1].reviewedBy=null;
  assert.deepEqual(domain.preparationLibrary({...library(),preparation:{profile,curriculum:c}},'goals').questions.map(q=>q.questionId),['i-q']);
});
test('registry rejects ID collisions, unresolved references, cycles and incomplete approved evidence',()=>{
  assert.equal(typeof domain.validatePreparationCurriculum,'function');
  domain.validatePreparationCurriculum(curriculum());
  for(const mutate of [c=>c.objectives.push(c.objectives[0]),c=>c.objectives[1].prerequisites.push('shared@1'),c=>c.mappings[0].objectiveVersionId='unknown@1',c=>c.mappings[0].reviewedBy=null,c=>c.artifacts[0].objectiveVersionIds=['missing@1'],c=>c.artifacts[0].artifactKind='unknown',c=>c.pathways.push({...c.pathways[0],pathwayVersionId:'other@1'})]){
    const c=curriculum();mutate(c);assert.throws(()=>domain.validatePreparationCurriculum(c));
  }
});
test('unconfigured or older APIs preserve the catalog; invalid saved profiles never select goals',()=>{
  assert.equal(typeof domain.preparationLibrary,'function');
  assert.equal(domain.preparationLibrary(library(),'goals').questions.length,5);
  const bad={...library(),preparation:{profile:{...profile,pathwayIds:['future']},curriculum:curriculum()}};
  assert.equal(domain.preparationLibrary(bad,'goals').preparation.status,'invalid-profile');
  assert.equal(domain.preparationLibrary(bad,'goals').questions.length,0);
});
test('shipped registry contains only the two initial active identities and no clinical requirements',()=>{
  assert.equal(typeof domain.validatePreparationCurriculum,'function');
  const c=domain.validatePreparationCurriculum(initialCurriculum);
  assert.deepEqual(c.pathways.filter(p=>p.status==='active').map(p=>p.pathwayId),['neet-pg','ini-cet']);
  assert.equal(c.objectives.length+c.mappings.length+c.artifacts.length,0);
});
