import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260927124500_neural_note_review_lifecycle.sql', import.meta.url),
  'utf8'
);

test('existing review ledger becomes asset-aware without discarding question identity', () => {
  assert.match(sql, /add column if not exists target_type text/);
  assert.match(sql, /add column if not exists target_id text/);
  assert.match(sql, /set target_type='question_version'/);
  assert.match(sql, /content_review_events_target_kind_key/);
  assert.match(sql, /content_review_fill_target_identity/);
  assert.match(sql, /target_type='neural_note_version'/);
});

test('canonical note lifecycle adds author, in-review, verified and rejected states', () => {
  assert.match(sql, /add column if not exists author_id uuid/);
  assert.match(sql, /'in_review'/);
  assert.match(sql, /'verified'/);
  assert.match(sql, /'rejected'/);
  assert.match(sql, /neural_submit_canonical_note_for_review/);
  assert.match(sql, /neural_note_author_mismatch/);
});

test('NeuralVault review fingerprints are gate specific', () => {
  assert.match(sql, /current_neural_note_review_target_sha256/);
  assert.match(sql, /p_review_kind='medical'/);
  assert.match(sql, /p_review_kind='references'/);
  assert.match(sql, /'sources',v_sources/);
  assert.match(sql, /value-'rights'/);
});

test('NeuralVault review reuses active grants and source-rights evidence', () => {
  assert.match(sql, /has_active_reviewer_grant/);
  assert.match(sql, /author_cannot_self_review/);
  assert.match(sql, /source_rights_events/);
  assert.match(sql, /citation_only/);
  assert.match(sql, /rights_not_resolved/);
});

test('canonical publication is server-only and requires current matching approval for all gates', () => {
  assert.match(sql, /publish_verified_neural_note/);
  assert.match(sql, /foreach v_kind in array array\['medical','references','rights'\]/);
  assert.match(sql, /current_neural_note_review_target_sha256/);
  assert.match(sql, /publication_review_evidence_invalid/);
  assert.match(sql, /publication_rights_unresolved/);
  assert.match(sql, /grant execute on function public\.publish_verified_neural_note\(uuid\)[\s\S]*service_role/);
});

test('no learner-visible canonical note is created by this migration', () => {
  assert.doesNotMatch(sql, /insert into public\.neural_canonical_note_versions[\s\S]*status='published'/);
});
