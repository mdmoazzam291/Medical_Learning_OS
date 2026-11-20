import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectLibrary} from '../src/domain/content-library.js';
import {readLearnerAttemptReview} from '../supabase/functions/study-api/_shared/attempt-review.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261120140000_question_admin_preview_audience.sql');
const studyApi=read('supabase/functions/study-api/index.ts');
const handler=read('supabase/functions/content-library-api/_shared/handler.js');

const question=(id,status)=>({questionId:id,questionVersionId:id+'@1',version:1,status,publishedAt:'2026-11-20T00:00:00.000Z',stem:'Synthetic '+id,options:[{optionId:'a',text:'A'},{optionId:'b',text:'B'}],answerOptionId:'a',sourceIds:['SRC-1'],conceptLinks:[{conceptId:'C-1',role:'primary'}]});
const snapshot=()=>({catalog:{concepts:[{conceptId:'C-1',label:'Concept',aliases:[],subjectTags:['anatomy']}],questions:[question('pub','published'),question('pre','admin_preview'),question('rev','in_review')],sources:[{sourceId:'SRC-1',title:'S',url:null,version:'1',rights:{status:'owner_waived',evidence:'x'}}]}});

test('learners never see admin_preview questions; the Admin view labels them',()=>{
 const learner=projectLibrary(snapshot());
 assert.deepEqual(learner.questions.map(q=>q.questionId),['pub']);
 const adminView=projectLibrary(snapshot(),{includeAdminPreview:true});
 assert.deepEqual(adminView.questions.map(q=>[q.questionId,q.audience]),[['pub','all-learners'],['pre','admin-preview']]);
 assert.ok(!adminView.questions.some(q=>q.questionId==='rev'));
 assert.deepEqual(projectLibrary(snapshot(),{includeAdminPreview:'yes'}).questions.map(q=>q.questionId),['pub']);
});

test('attempt review on an admin_preview question is restricted unless the reader is Admin',async()=>{
 const attempt={id:'att-1',learner_id:'L',recorded_at:'2026-11-20T00:00:00Z',presentation:null,
  event:{eventId:'att-1',learnerId:'L',questionVersionId:'pre@1',conceptId:'C-1',correct:true,occurredAt:'2026-11-20T00:00:00Z',durationMs:1000}};
 attempt.receipt={event:{...attempt.event},explanation:'Because.',answerOptionId:'a',selectedOptionId:'a'};
 const admin={from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:attempt,error:null})};return q;}};
 const catalog={schemaVersion:1,...snapshot().catalog};
 const base={admin,learnerId:'L',attemptId:'att-1',getCatalog:async()=>({body:catalog})};
 assert.equal((await readLearnerAttemptReview(base)).availability,'restricted');
 const asAdmin=await readLearnerAttemptReview({...base,isContentAdmin:async()=>true});
 assert.equal(asAdmin.availability,'available');assert.equal(asAdmin.question.questionVersionId,'pre@1');
});

test('study-api: Admin check only after a published lookup misses; lists, Study Now and revision stay published-only',()=>{
 assert.match(studyApi,/publishedQuestions\(catalogBody\)\.find\([^)]*\)[^?]*\?\?\s*\(await isContentAdmin\(\)/);
 for(const call of ['let list = publishedQuestions(body);','publishedQuestions(catalog.body).map((question: any) => [question.questionVersionId, question])'])assert.ok(studyApi.includes(call),call);
 assert.equal((studyApi.match(/adminPreviewQuestions\(/g)||[]).length,2);
});

test('content-library-api: narrowest default, Admin check only when preview exists, typed confirmation to widen',()=>{
 assert.match(handler,/const audience=input\.audience\?\?'admin-preview'/);
 assert.match(handler,/includeAdminPreview=hasAdminPreview\(snapshot\)&&await isContentAdmin\(\)/);
 assert.match(handler,/input\.confirm!=='all-learners'/);
 assert.match(handler,/content_library_review_publish_v2/);assert.doesNotMatch(handler,/content_library_review_publish_v1/);
});

test('migration: same-transaction status flip, audited, guarded patch, no browser access',()=>{
 assert.match(sql,/content_library_set_question_status_v1\(v_ids, 'published', 'admin_preview'\)/);
 assert.match(sql,/insert into public\.content_library_audience_events/);
 assert.match(sql,/admin_preview_patch_mismatch/);
 assert.match(sql,/item->>'status'='admin_preview' and public\.is_content_admin\(p_learner\)/);
 assert.match(sql,/revoke all on table public\.content_library_audience_events from public, anon, authenticated/);
 for(const fn of ['content_library_review_publish_v2','content_library_widen_audience_v1','content_library_set_question_status_v1','content_library_import_question_versions_v1'])
  assert.match(sql,new RegExp('revoke all on function public\\.'+fn+'\\([^)]*\\) from public, anon, authenticated'));
 assert.doesNotMatch(sql,/to authenticated|to anon/);
});
