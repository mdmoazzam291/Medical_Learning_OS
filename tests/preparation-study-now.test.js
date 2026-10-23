import test from 'node:test';
import assert from 'node:assert/strict';
import { preparationQuestionScope } from '../src/domain/preparation-pathways.js';
import { buildStudyNowPlan } from '../src/domain/study-now.js';
import { profile, curriculum, library } from './fixtures/preparation-fixture.js';
import { readFileSync } from 'node:fs';
const now='2026-10-22T20:00:00.000Z';
test('one combined plan revises a shared question once and excludes unrelated new work',()=>{
  const selected=preparationQuestionScope(library().questions,curriculum(),profile);
  assert.equal(selected.status,'configured');
  const versions=new Set(selected.questions.map(q=>q.questionVersionId));
  const revisionItems=[{questionVersionId:'shared-q@1',dueAt:now,latestCorrect:false,lastDurationMs:60000}].filter(x=>versions.has(x.questionVersionId));
  const plan=buildStudyNowPlan({revisionItems,newItems:selected.questions.filter(q=>q.questionVersionId!=='shared-q@1'),availableMinutes:30,now});
  assert.equal(plan.selected.filter(q=>q.questionVersionId==='shared-q@1').length,1);
  assert.equal(plan.selected.some(q=>q.questionVersionId==='other-q@1'),false);
});
test('missing or invalid goals never silently produce a different goal recommendation',()=>{
  const c=curriculum();c.mappings=[];
  assert.equal(preparationQuestionScope(library().questions,c,profile).questions.length,0);
  assert.equal(preparationQuestionScope(library().questions,c,null).questions.length,5);
  assert.equal(preparationQuestionScope(library().questions,c,{...profile,primaryPathwayId:'unknown'}).questions.length,0);
});
test('deployed Study Now source scopes only new plan creation after existing-session resume',()=>{
  const source=readFileSync(new URL('../supabase/functions/study-api/index.ts',import.meta.url),'utf8');
  const route=source.slice(source.indexOf('path === "/study-now/start"'));
  assert.ok(route.indexOf('const existingSessionId')<route.indexOf('preparationQuestionScope('));
  assert.match(route,/preparationQuestionScope\([\s\S]*?authData\.user\.user_metadata\?\.mlos_preparation_profile/);
  assert.match(route,/preparation:.*preparation\.status/);
});
