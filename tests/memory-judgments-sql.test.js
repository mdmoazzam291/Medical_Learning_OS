import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260926194000_memory_judgments.sql', import.meta.url),
  'utf8'
);

test('memory judgments are immutable one-per-attempt learner evidence', () => {
  assert.match(sql, /create table if not exists public\.study_memory_judgments/);
  assert.match(sql, /attempt_id uuid not null unique/);
  assert.match(sql, /foreign key \(attempt_id\) references public\.study_attempts\(id\)/);
  assert.match(sql, /rating smallint not null check \(rating between 1 and 4\)/);
  assert.match(sql, /scale_id text not null default 'fsrs-4-v1'/);
  assert.match(sql, /prompt_id text not null default 'post-answer-recall-v1'/);
});

test('service-only recorder verifies exact learner attempt and is idempotent', () => {
  assert.match(sql, /study_record_memory_judgment/);
  assert.match(sql, /where id = p_attempt[\s\S]*learner_id = p_learner/);
  assert.match(sql, /conflicting_memory_judgment/);
  assert.match(sql, /attempt_not_found/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /grant execute on function public\.study_record_memory_judgment\(uuid, uuid, integer\)[\s\S]*service_role/);
});

test('browser can read own memory evidence but cannot write it directly', () => {
  assert.match(sql, /enable row level security/);
  assert.match(sql, /study_memory_judgments_read_own/);
  assert.match(sql, /grant select on table public\.study_memory_judgments[\s\S]*authenticated/);
  assert.match(sql, /revoke all on function public\.study_record_memory_judgment[\s\S]*authenticated/);
});
