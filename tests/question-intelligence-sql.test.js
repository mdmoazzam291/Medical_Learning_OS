import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
const file=readdirSync('supabase/migrations').find(p=>p.endsWith('_question_intelligence.sql'));
const sql=file?readFileSync('supabase/migrations/'+file,'utf8'):'';
test('transactional persistence binds variants to immutable source versions and administrator publication',()=>{assert.ok(file,'migration required');assert.match(sql,/intelligence_version_conflict/);assert.match(sql,/content_library_review_publish_legacy_v1/);assert.match(sql,/sourceQuestionVersionId/);assert.match(sql,/revoke all on function/);});
test('concise attempt representation comes from locked session and scheduling excludes it',()=>{assert.ok(file,'migration required');assert.match(sql,/before insert on public.study_attempts/);assert.match(sql,/question_presentations/);assert.match(sql,/a.presentation->>'representation' = 'original'/);assert.match(sql,/for update/);});
