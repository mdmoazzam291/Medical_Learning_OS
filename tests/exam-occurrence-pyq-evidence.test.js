import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260927140500_exam_occurrence_pyq_evidence.sql', import.meta.url),
  'utf8'
);

test('exam occurrence identity is separate from detailed simulator rules', () => {
  assert.match(sql, /create table if not exists public\.exam_occurrences/);
  assert.match(sql, /'neet-pg:2026'/);
  assert.match(sql, /Official NBEMS NEET-PG page lists the 2026 Information Bulletin/);
  assert.match(sql, /verifies the exam occurrence identity only; it does not verify detailed simulator rule values/);
});

test('PYQ evidence is immutable and retractable by a new event', () => {
  assert.match(sql, /create table if not exists public\.question_exam_evidence_events/);
  assert.match(sql, /action in \('asserted', 'retracted'\)/);
  assert.match(sql, /question_exam_evidence_is_immutable/);
  assert.match(sql, /before update or delete/);
  assert.match(sql, /retract_question_exam_evidence/);
  assert.match(sql, /target_event_id/);
});

test('recalled and licensed PYQ claims cannot collapse into one provenance class', () => {
  assert.match(sql, /recalled_pyq/);
  assert.match(sql, /licensed_pyq/);
  assert.match(sql, /reconstructed_item/);
  assert.match(sql, /exact_item/);
  assert.match(sql, /single_recall/);
  assert.match(sql, /corroborated_recall/);
  assert.match(sql, /licensed_primary_source/);
  assert.match(sql, /invalid_recalled_pyq_evidence/);
  assert.match(sql, /invalid_licensed_pyq_evidence/);
});

test('question exam evidence validates stable catalog and occurrence identities', () => {
  assert.match(sql, /exam_occurrence_not_verified/);
  assert.match(sql, /unknown_question_version/);
  assert.match(sql, /jsonb_array_elements\(c\.body->'questions'\)/);
});

test('active evidence projection excludes retracted assertions', () => {
  assert.match(sql, /current_question_exam_evidence/);
  assert.match(sql, /a\.action = 'asserted'/);
  assert.match(sql, /r\.action = 'retracted'/);
  assert.match(sql, /r\.target_event_id = a\.id/);
});

test('browser roles cannot write or directly read the PYQ evidence ledger', () => {
  assert.match(sql, /revoke all on table public\.question_exam_evidence_events[\s\S]*authenticated/);
  assert.match(sql, /grant select on table public\.question_exam_evidence_events to service_role/);
  assert.match(sql, /grant execute on function public\.record_question_exam_evidence[\s\S]*service_role/);
  assert.match(sql, /grant execute on function public\.retract_question_exam_evidence[\s\S]*service_role/);
  assert.doesNotMatch(sql, /confidence_score|probability|likelihood/i);
});
