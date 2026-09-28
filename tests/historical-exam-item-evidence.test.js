import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260928180541_m08b_historical_exam_item_evidence.sql', import.meta.url),
  'utf8'
);
const pilot = JSON.parse(await readFile(
  new URL('../data/historical-exam-evidence-ini-cet-2023-07-cpr.json', import.meta.url),
  'utf8'
));

test('historical reconstructed items are separate from learner question versions', () => {
  assert.match(sql, /create table if not exists public\.historical_exam_item_events/);
  assert.match(sql, /reconstruction_summary/);
  assert.match(sql, /concept_ids text\[\]/);
  assert.doesNotMatch(sql, /historical_exam_item_events[\s\S]{0,900}\bstem\b/);
  assert.doesNotMatch(sql, /historical_exam_item_events[\s\S]{0,900}\banswer_option/i);
  assert.equal(pilot.reconstruction.wordingMode, 'nonverbatim_summary_only');
  assert.equal(pilot.reconstruction.officialItemWordingStored, false);
});

test('verified INI-CET July 2023 occurrence is grounded only as occurrence identity', () => {
  assert.equal(pilot.examOccurrence.examOccurrenceId, 'ini-cet:2023-07');
  assert.equal(pilot.examOccurrence.examDate, '2023-05-07');
  assert.match(pilot.examOccurrence.officialOccurrenceSource, /aiimsexams\.ac\.in/);
  assert.match(sql, /written CBT was held on 07 May 2023/);
  assert.match(sql, /not recalled item wording or answer keys/);
});

test('multiple web copies cannot silently become corroborated recall', () => {
  assert.equal(pilot.evidence.recallSources.length, 3);
  assert.equal(pilot.evidence.basis, 'single_recall');
  assert.equal(pilot.evidence.sourceLineageStatus, 'unknown');
  assert.match(sql, /historical_corroboration_not_established/);
  assert.match(sql, /p_source_lineage_status <> 'independent'/);
  assert.match(sql, /v_source_count < 2/);
});

test('historical evidence resolves only to existing canonical concepts', () => {
  assert.equal(pilot.reconstruction.conceptIds.length, 3);
  assert.match(sql, /unknown_canonical_concept/);
  assert.match(sql, /jsonb_array_elements\(c\.body->'concepts'\)/);
});

test('historical evidence is immutable, retractable and service-only', () => {
  assert.match(sql, /historical_exam_item_evidence_is_immutable/);
  assert.match(sql, /retract_historical_exam_item_evidence/);
  assert.match(sql, /target_event_id/);
  assert.match(sql, /alter table public\.historical_exam_item_events enable row level security/);
  assert.match(sql, /revoke all on table public\.historical_exam_item_events[\s\S]*authenticated/);
  assert.match(sql, /grant select on table public\.historical_exam_item_events to service_role/);
  assert.match(sql, /record_historical_exam_item_evidence\([\s\S]*to service_role/);
});

test('Exam DNA v2 counts historical items without inventing prediction', () => {
  assert.match(sql, /'exam-dna-observation-v2'/);
  assert.match(sql, /distinctHistoricalItems/);
  assert.match(sql, /distinctEvidenceItems/);
  assert.match(sql, /recall-source-lineage-unverified/);
  assert.match(sql, /recall-source-count-does-not-prove-independent-corroboration/);
  assert.match(sql, /historical-reconstructions-do-not-store-or-claim-official-item-wording/);
  assert.match(sql, /predictiveInferenceEnabled', false/);
  assert.doesNotMatch(sql, /forecastScore|predictedChance|likelihoodScore|highYieldScore|confidenceScore/);
});

test('pilot keeps recall evidence separate from historical medical verification', () => {
  assert.ok(pilot.evidence.medicalVerificationSources.some(source =>
    source.authority === 'American Heart Association' && source.version === '2020'
  ));
  assert.ok(pilot.evidence.limitations.some(value => /single_recall/.test(value)));
  assert.ok(pilot.evidence.limitations.some(value => /future exam probability/.test(value)));
});
