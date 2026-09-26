import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase/migrations/20260926133000_gate_specific_review_and_rights.sql', import.meta.url), 'utf8');

test('review gates fingerprint different concern-specific targets', () => {
  assert.match(sql, /p_review_kind = 'medical'/);
  assert.match(sql, /p_review_kind = 'references'/);
  assert.match(sql, /jsonb_build_object\(\s*'questionId'.*'provenance'/s);
  assert.match(sql, /source_without_rights/);
  assert.match(sql, /current_review_target_sha256/);
});

test('source rights evidence is immutable, server-only, and reviewer-authorized', () => {
  assert.match(sql, /create table public\.source_rights_events/i);
  assert.match(sql, /unique \(source_id\)/i);
  assert.match(sql, /alter table public\.source_rights_events enable row level security/i);
  assert.match(sql, /revoke all on table public\.source_rights_events from public, anon, authenticated, service_role/i);
  assert.match(sql, /grant select on table public\.source_rights_events to service_role/i);
  assert.match(sql, /content_reviewer_grants[\s\S]*review_kind = 'rights'/i);
  assert.match(sql, /resolve_source_rights/);
});

test('rights approval fails closed until every referenced source permits publication', () => {
  assert.match(sql, /p_review_kind = 'rights' and p_decision = 'approved'/);
  assert.match(sql, /not in \('owned', 'licensed', 'public_domain'\)/);
  assert.match(sql, /rights_not_resolved/);
});

test('publication validates each gate against its own current fingerprint', () => {
  assert.match(sql, /e\.target_sha256 = public\.current_review_target_sha256\(\s*p_question_version_id,\s*e\.review_kind/s);
  assert.match(sql, /v_matching_count <> 3/);
  assert.doesNotMatch(sql, /count\(distinct e\.target_sha256\)/);
});
