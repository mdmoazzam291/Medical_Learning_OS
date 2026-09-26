import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('review target hash excludes mutable workflow metadata', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260926123000_atomic_review_projection.sql', import.meta.url), 'utf8');

  assert.match(sql, /v_question_target := v_question - 'status' - 'reviews' - 'publishedAt'/);
  assert.match(sql, /extensions\.digest/);
  assert.match(sql, /target_sha256 <> v_hash/);
  assert.match(sql, /review_target_changed/);
});

test('record_content_review atomically projects immutable events into catalog review state', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260926123000_atomic_review_projection.sql', import.meta.url), 'utf8');

  assert.match(sql, /insert into public\.content_review_events/);
  assert.match(sql, /update public\.study_catalog/);
  assert.match(sql, /jsonb_build_object\('reviews', v_reviews, 'status', v_next_status\)/);
  assert.match(sql, /v_review_count = 3 and v_approved_count = 3/);
  assert.match(sql, /v_next_status := 'verified'/);
  assert.match(sql, /question_review_rejected/);
  assert.match(sql, /to_char\(e\.reviewed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS\.MS"Z"'\)/);
});

test('review-api maps target drift and rejected-version conflicts without leaking database errors', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');

  assert.match(source, /review_target_changed/);
  assert.match(source, /question_review_rejected/);
  assert.match(source, /review_write_failed/);
  assert.doesNotMatch(source, /return response\([^\n]+error\.message/);
});


test('latest review function qualifies target hash columns against PL/pgSQL output names', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260926124000_fix_review_hash_ambiguity.sql', import.meta.url), 'utf8');

  assert.match(sql, /from public\.content_review_events e/);
  assert.match(sql, /e\.target_sha256 <> v_hash/);
  assert.doesNotMatch(sql, /\nand target_sha256 <> v_hash/);
});
