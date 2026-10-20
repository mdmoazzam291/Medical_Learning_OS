import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const { PGlite } = await import(process.env.PGLITE_MODULE_URL || '@electric-sql/pglite');
const db = new PGlite();
const migrationRoot = new URL('../supabase/migrations/', import.meta.url);
const readMigration = name => readFile(new URL(name, migrationRoot), 'utf8');
// Minimal, data-free table shapes for the real scope/preview/erasure SQL. This
// exercises discovery and deletion semantics, not the full production FK graph.
const tables = [
  'exam_run_events', 'exam_run_receipts', 'exam_runs',
  'learner_content_issue_reports', 'neural_personal_annotations',
  'owner_admin_audit_events', 'owner_learner_access_state',
  'study_answer_confidence_events', 'study_attempts', 'study_bookmarks',
  'study_memory_judgments', 'study_policy_experiment_assignments',
  'study_recommendation_events', 'study_recommendation_transport_events',
  'study_retention_probe_assignments', 'study_retention_probe_client_events',
  'study_retention_probe_consent_events', 'study_retention_probe_response_bindings',
  'study_retention_probe_served_events', 'study_revision_state',
  'study_schedule_decision_events', 'study_sessions', 'study_visual_interaction_events'
];
const target = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const scope = async () => (await db.query('select public.privacy_learner_scope_status() as result')).rows[0].result;
const preview = id => db.query('select public.privacy_learner_erasure_preview($1) as result', [id]);
const erase = id => db.query("select public.privacy_erase_learner_data($1::uuid,$2::text,'test_cleanup') as result", [id, id]);

try {
  await db.exec('create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key);');
  for (const table of tables) await db.exec(`create table public.${table}(learner_id uuid not null);`);
  await db.exec('alter table public.study_attempts add column presentation jsonb;');
  await db.exec(await readMigration('20260928003000_privacy_safe_evidence_immutability.sql'));
  await db.exec(await readMigration('20261003173000_privacy_scope_v10_owner_operations.sql'));
  assert.equal((await scope()).complete, true, 'data-free base schema must be covered');
  // Use the genuine original-only projection, including its grants.
  const original = await readMigration('20261004141627_original_question_evidence.sql');
  await db.exec(original.slice(0, original.indexOf('-- Updated from')));
  assert.deepEqual((await scope()).unmappedLearnerTables, ['study_original_attempt_evidence_v1']);
  await assert.rejects(preview(target), /privacy_scope_requires_update/);
  await assert.rejects(erase(target), /privacy_scope_requires_update/);

  const repair = (await readdir(migrationRoot)).find(name => name.endsWith('_privacy_scope_stored_relations.sql'));
  if (repair) {
    await db.exec(await readMigration(repair));
    await db.exec(await readMigration(repair)); // Safe to reapply the definition.
  }
  assert.equal((await scope()).complete, true, 'ordinary projections must not block covered base-table erasure');
  assert.equal((await scope()).scopeVersion, 10);
  assert.deepEqual((await scope()).missingTables, []);
  assert.deepEqual((await scope()).unmappedLearnerTables, []);

  // New stored data still blocks both preview and erasure, even when empty.
  await db.exec('create foreign data wrapper privacy_test_fdw; create server privacy_test_server foreign data wrapper privacy_test_fdw;');
  for (const [ddl, name, drop] of [
    ['create table public.unmapped_study_data(learner_id uuid)', 'unmapped_study_data', 'drop table public.unmapped_study_data'],
    ['create materialized view public.unmapped_attempt_copy as select * from public.study_attempts', 'unmapped_attempt_copy', 'drop materialized view public.unmapped_attempt_copy'],
    ['create table public.unmapped_partitioned_data(learner_id uuid) partition by hash(learner_id)', 'unmapped_partitioned_data', 'drop table public.unmapped_partitioned_data'],
    ['create foreign table public.unmapped_foreign_data(learner_id uuid) server privacy_test_server', 'unmapped_foreign_data', 'drop foreign table public.unmapped_foreign_data']
  ]) {
    await db.exec(ddl);
    assert.equal((await scope()).complete, false);
    assert.deepEqual((await scope()).unmappedLearnerTables, [name]);
    await assert.rejects(preview(target), /privacy_scope_requires_update/);
    await assert.rejects(erase(target), /privacy_scope_requires_update/);
    await db.exec(drop);
    assert.equal((await scope()).complete, true);
  }

  // A same-named ordinary view cannot substitute for a missing expected table.
  await db.exec('alter table public.study_bookmarks rename to bookmarks_temporarily_missing; create view public.study_bookmarks as select * from public.bookmarks_temporarily_missing;');
  assert.equal((await scope()).complete, false);
  assert.deepEqual((await scope()).missingTables, ['study_bookmarks']);
  await assert.rejects(preview(target), /privacy_scope_requires_update/);
  await db.exec('drop view public.study_bookmarks; alter table public.bookmarks_temporarily_missing rename to study_bookmarks;');

  // Dropped attributes and unrelated/private relations are not learner storage
  // in this public-schema contract. A real new learner column must still block.
  await db.exec('create table public.unrelated_data(id int, learner_id uuid); alter table public.unrelated_data drop column learner_id; create table auth.private_test_data(learner_id uuid);');
  assert.equal((await scope()).complete, true);
  await db.exec('alter table public.unrelated_data add column learner_id uuid;');
  assert.deepEqual((await scope()).unmappedLearnerTables, ['unrelated_data']);
  await db.exec('drop table public.unrelated_data; drop table auth.private_test_data;');

  await db.query('insert into auth.users values ($1),($2)', [target, other]);
  for (const table of tables) {
    if (table === 'study_attempts') {
      await db.query('insert into public.study_attempts(learner_id,presentation) values ($1,$3),($2,$3)', [target, other, { representation: 'original' }]);
    } else {
      await db.query(`insert into public.${table}(learner_id) values ($1),($2)`, [target, other]);
    }
  }
  await assert.rejects(db.query('delete from public.study_attempts where learner_id=$1', [target]), /learner_evidence_is_append_only/);
  const before = (await preview(target)).rows[0].result;
  assert.equal(before.rowsInScope, 23);
  assert.equal(before.authUserPresent, true);
  await db.exec('create table public.unmapped_new_evidence(learner_id uuid);');
  await assert.rejects(erase(target), /privacy_scope_requires_update/);
  await db.exec('drop table public.unmapped_new_evidence;');
  assert.equal((await preview(target)).rows[0].result.rowsInScope, 23, 'failed closed erasure must preserve the learner data');
  await db.exec('set role service_role');
  const receipt = (await erase(target)).rows[0].result;
  await db.exec('reset role');
  assert.equal(receipt.rowsDeleted, 23);
  assert.equal(receipt.scopeVersion, 10);
  assert.equal(receipt.authUserDeletionIncluded, false);
  assert.equal((await preview(target)).rows[0].result.rowsInScope, 0);
  assert.equal((await preview(other)).rows[0].result.rowsInScope, 23);
  assert.deepEqual((await db.query('select learner_id from public.study_original_attempt_evidence_v1')).rows, [{ learner_id: other }]);
  assert.equal((await db.query('select count(*)::int as n from auth.users')).rows[0].n, 2);
  await assert.rejects(db.query('delete from public.study_attempts where learner_id=$1', [other]), /learner_evidence_is_append_only/);
  await assert.rejects(db.exec('delete from public.learner_privacy_erasure_receipts'), /privacy_erasure_receipt_is_immutable/);

  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(scope(), /permission denied/);
    await assert.rejects(preview(other), /permission denied/);
    await assert.rejects(erase(other), /permission denied/);
    await db.exec('reset role');
  }
  await db.exec('set role service_role');
  assert.equal((await scope()).complete, true);
  assert.equal((await preview(other)).rows[0].result.rowsInScope, 23);
  await db.exec('reset role');
  console.log('Privacy scope PostgreSQL checks passed: view regression, table/partitioned/materialized/foreign fail-closed cases, missing tables, dropped columns, two-learner erasure, append-only guards and role permissions.');
} finally {
  await db.close();
}
