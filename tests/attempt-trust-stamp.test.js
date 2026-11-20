import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COLLECTIONS} from '../src/domain/content-library.js';
const sql=readFileSync(new URL('../supabase/migrations/20261120150000_attempt_trust_stamp.sql',import.meta.url),'utf8');

test('the database list of unverified collections matches the app collection map',()=>{
 const app=Object.entries(COLLECTIONS).filter(([,c])=>c.answerKeys==='unverified').map(([id])=>id).sort();
 const db=[...sql.match(/o->>'platformId' in \(([^)]*)\)/)[1].matchAll(/'([a-z0-9-]+)'/g)].map(m=>m[1]).sort();
 assert.deepEqual(db,app);
});

test('stamp is written by the database in the same transaction and never blocks an answer',()=>{
 assert.match(sql,/create trigger study_attempt_trust_stamp after insert on public\.study_attempts/);
 assert.match(sql,/exception when others then[\s\S]*v_level := 'unknown'/);
 assert.match(sql,/on conflict \(attempt_id\) do nothing/);
});

test('trust records are private, erased with the attempt, and append-only for key decisions',()=>{
 assert.match(sql,/attempt_id uuid primary key references public\.study_attempts\(id\) on delete cascade/);
 for(const t of ['question_key_verification_events','study_attempt_trust'])assert.match(sql,new RegExp('revoke all on table public\\.'+t+' from public, anon, authenticated'));
 assert.doesNotMatch(sql,/grant[^;]*(update|delete)[^;]*study_attempt_trust/i);
 assert.doesNotMatch(sql,/to (anon|authenticated)\b/);
 assert.match(sql,/latest[\s\S]*order by e\.recorded_at desc, e\.id desc limit 1/);
});

test('no invented history: no backfill of earlier attempts',()=>{
 assert.doesNotMatch(sql,/insert into public\.study_attempt_trust[^;]*select/);
});
