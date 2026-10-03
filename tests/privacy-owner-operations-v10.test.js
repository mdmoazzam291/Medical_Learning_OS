import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const migrationsUrl = new URL('../supabase/migrations/', import.meta.url);
const names = await readdir(migrationsUrl);
const name = names.find(value => /privacy_scope_v10_owner_operations\.sql$/.test(value));
const sql = name ? await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8') : '';

test('privacy scope v10 explicitly maps owner learner administration data', () => {
  assert.ok(name, 'privacy scope v10 migration must exist');
  assert.match(sql, /learner-privacy-scope-v10/);
  assert.match(sql, /owner_admin_audit_events/);
  assert.match(sql, /owner_learner_access_state/);
  assert.match(sql, /study_answer_confidence_events/);
});

test('privacy preview counts owner learner administration rows', () => {
  assert.match(sql, /'owner_admin_audit_events'.*count\(\*\).*owner_admin_audit_events.*learner_id=p_learner/is);
  assert.match(sql, /'owner_learner_access_state'.*count\(\*\).*owner_learner_access_state.*learner_id=p_learner/is);
});

test('learner erasure deletes owner learner administration identifiers and verifies zero residue', () => {
  assert.match(sql, /delete from public\.owner_admin_audit_events where learner_id=p_learner/i);
  assert.match(sql, /delete from public\.owner_learner_access_state where learner_id=p_learner/i);
  assert.match(sql, /union all select 1 from public\.owner_admin_audit_events where learner_id=p_learner/i);
  assert.match(sql, /union all select 1 from public\.owner_learner_access_state where learner_id=p_learner/i);
});

test('privacy scope remains service-only and fail-closed', () => {
  assert.match(sql, /privacy_scope_requires_update/);
  assert.match(sql, /revoke all on function public\.privacy_learner_scope_status\(\)[\s\S]*from public,anon,authenticated/i);
  assert.match(sql, /grant execute on function public\.privacy_learner_scope_status\(\)[\s\S]*to service_role/i);
});
