import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('publication requires current matching approvals and resolved source rights', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260926130000_verified_publication_gate.sql', import.meta.url), 'utf8');

  assert.match(sql, /question_not_verified/);
  assert.match(sql, /publication_sources_missing/);
  assert.match(sql, /publication_rights_unresolved/);
  assert.match(sql, /v_review_count <> 3/);
  assert.match(sql, /v_approved_count <> 3/);
  assert.match(sql, /v_distinct_hashes <> 1/);
  assert.match(sql, /v_matching_hashes <> 3/);
  assert.match(sql, /publication_review_evidence_invalid/);
});

test('publication uses the same substantive target fingerprint and never trusts workflow metadata', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260926130000_verified_publication_gate.sql', import.meta.url), 'utf8');

  assert.match(sql, /v_question_target := v_question - 'status' - 'reviews' - 'publishedAt'/);
  assert.match(sql, /extensions\.digest/);
  assert.match(sql, /e\.target_sha256 = v_hash/);
});

test('publication retires the prior published version and stays server-only', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260926130000_verified_publication_gate.sql', import.meta.url), 'utf8');

  assert.match(sql, /q->>'status' = 'published'/);
  assert.match(sql, /jsonb_build_object\('status', 'retired'\)/);
  assert.match(sql, /newer_version_already_published/);
  assert.match(sql, /grant execute on function public\.publish_verified_content\(text\)[\s\S]*to service_role/i);
  assert.match(sql, /revoke all on function public\.publish_verified_content\(text\)[\s\S]*from public, anon, authenticated/i);
});
