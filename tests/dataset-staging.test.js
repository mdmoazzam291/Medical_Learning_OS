import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261120120000_dataset_question_staging.sql');
const wf=read('.github/workflows/load-dataset-staging.yml');
const py=read('scripts/load-dataset-staging.py');

test('staging table is private: RLS on, no browser grants, service role only',()=>{
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on table public\.dataset_question_staging from public, anon, authenticated/);
 assert.doesNotMatch(sql,/grant [^;]* to (anon|authenticated)/i);
 assert.doesNotMatch(sql,/create policy/i);
});

test('loader is manual, main-only, confirmed, and never prints question text',()=>{
 assert.match(wf,/workflow_dispatch:/);assert.doesNotMatch(wf,/\n  push:|\n  schedule:|pull_request/);
 assert.match(wf,/test "\$\{\{ inputs\.confirm \}\}" = "medmcqa"/);
 assert.match(wf,/refs\/heads\/main/);
 assert.match(wf,/environment: production/);
 // Public logs: no cat/head of downloaded data, no echo of payload columns.
 assert.doesNotMatch(wf,/\b(cat|head|tail|less)\b[^\n]*(rows\.csv|parquet)/);
 // Only the final count query prints rows to the log, and it never selects the payload or text columns.
 const printed=wf.split('\n').filter(l=>/psql[^\n]*-c /.test(l));
 assert.equal(printed.length,1);assert.doesNotMatch(printed[0],/payload|topic_label|subject_label/);
 assert.match(py,/print\(json\.dumps\(\{'rows'/);
 assert.equal((py.match(/print\(/g)||[]).length,1);
});
