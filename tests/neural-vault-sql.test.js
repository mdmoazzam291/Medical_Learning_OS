import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260927123000_neural_vault_foundation.sql', import.meta.url),
  'utf8'
);

test('NeuralVault canonical notes are versioned immutable concept-linked content', () => {
  assert.match(sql, /neural_canonical_note_versions/);
  assert.match(sql, /concept_id text not null/);
  assert.match(sql, /unique \(concept_id, version\)/);
  assert.match(sql, /supersedes_id uuid null/);
  assert.match(sql, /source_ids jsonb not null/);
  assert.match(sql, /content_sha256/);
  assert.match(sql, /neural_one_published_note_per_concept/);
});

test('canonical note drafts validate existing catalog concepts and sources', () => {
  assert.match(sql, /neural_create_canonical_note_draft/);
  assert.match(sql, /v_catalog\.body->'concepts'/);
  assert.match(sql, /v_catalog\.body->'sources'/);
  assert.match(sql, /neural_concept_unknown/);
  assert.match(sql, /neural_source_unknown/);
  assert.match(sql, /'draft'/);
});

test('personal annotations survive canonical updates through stable concept identity', () => {
  assert.match(sql, /neural_personal_annotations/);
  assert.match(sql, /concept_id text not null/);
  assert.match(sql, /anchor_note_version_id uuid null/);
  assert.match(sql, /revision integer not null default 1/);
});

test('personal annotation updates use optimistic concurrency and support real deletion', () => {
  assert.match(sql, /p_expected_revision/);
  assert.match(sql, /revision=p_expected_revision/);
  assert.match(sql, /neural_annotation_revision_conflict/);
  assert.match(sql, /delete from public\.neural_personal_annotations/);
});

test('browser roles cannot mutate NeuralVault tables or trusted functions directly', () => {
  assert.match(sql, /revoke all on table public\.neural_canonical_note_versions from public, anon, authenticated/);
  assert.match(sql, /revoke all on table public\.neural_personal_annotations from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.neural_create_annotation[\s\S]*service_role/);
  assert.match(sql, /grant execute on function public\.neural_update_annotation[\s\S]*service_role/);
});
