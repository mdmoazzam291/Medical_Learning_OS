import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260927130000_neural_note_provenance.sql', import.meta.url),
  'utf8'
);

test('canonical NeuralVault notes require explicit production provenance', () => {
  assert.match(sql, /add column if not exists provenance jsonb/);
  assert.match(sql, /ai_generated_original/);
  assert.match(sql, /human_authored_original/);
  assert.match(sql, /licensed_adaptation/);
  assert.match(sql, /provenance set not null/);
});

test('canonical note fingerprint includes provenance and sources', () => {
  assert.match(sql, /'provenance',p_provenance/);
  assert.match(sql, /'provenance',v_note\.provenance/);
  assert.match(sql, /current_neural_note_review_target_sha256/);
  assert.match(sql, /sourceIds/);
});

test('browser roles still cannot create canonical drafts directly', () => {
  assert.match(sql, /revoke all on function public\.neural_create_canonical_note_draft\(text,text,text,jsonb,jsonb,uuid\)/);
  assert.match(sql, /grant execute on function public\.neural_create_canonical_note_draft[\s\S]*service_role/);
});
