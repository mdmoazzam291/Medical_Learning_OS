import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260929083000_m11c_retention_probe_pair_metadata.sql', import.meta.url),
  'utf8'
);

test('M11c stores append-only pair assessments bound to exact question versions', () => {
  assert.match(sql, /create table if not exists public\.study_retention_probe_pair_assessments/);
  assert.match(sql, /origin_question_version_id text not null/);
  assert.match(sql, /alternate_question_version_id text not null/);
  assert.match(sql, /study_retention_probe_pair_assessments_immutable/);
  assert.match(sql, /retention_probe_pair_assessment_is_immutable/);
});

test('human authority is required for feasibility validation', () => {
  assert.match(sql, /assessor_type in \('ai_research_assist','human_research_reviewer'\)/);
  assert.match(sql, /decision in \('needs_human_validation','validated_for_feasibility','rejected_for_feasibility'\)/);
  assert.match(sql, /decision <> 'validated_for_feasibility'[\s\S]*assessor_type = 'human_research_reviewer'/);
});

test('anaphylaxis pair is seeded only as AI research assist and remains unvalidated', () => {
  assert.match(sql, /anaphylaxis-first-line-treatment-pair-v1/);
  assert.match(sql, /emergency:anaphylaxis:first-line-drug@1/);
  assert.match(sql, /emergency:anaphylaxis:no-rash-first-action@1/);
  assert.match(sql, /'constructMatch','high'/);
  assert.match(sql, /'surfaceNovelty','moderate'/);
  assert.match(sql, /'difficultyComparability','unknown'/);
  assert.match(sql, /'ai_research_assist'/);
  assert.match(sql, /'needs_human_validation'/);
  assert.match(sql, /semantic review cannot prove psychometric equivalence/);
});

test('pair readiness validates current published structural binding before counting a human validation', () => {
  assert.match(sql, /study_retention_probe_pair_readiness_v1/);
  assert.match(sql, /oq\.status='published'/);
  assert.match(sql, /aq\.status='published'/);
  assert.match(sql, /oq\.concept_id=a\.concept_id/);
  assert.match(sql, /aq\.concept_id=a\.concept_id/);
  assert.match(sql, /humanValidatedCurrentPairs/);
  assert.match(sql, /currentPairsAwaitingHumanValidation/);
});

test('activation readiness consumes pair metadata readiness but stays blocked', () => {
  assert.match(sql, /v_pair := public\.study_retention_probe_pair_readiness_v1\(\)/);
  assert.match(sql, /validatedPairMetadataAvailable/);
  assert.match(sql, /learnerOptInPathAvailable',false/);
  assert.match(sql, /'canActivate',false/);
  assert.match(sql, /learner-opt-in-path-not-yet-implemented/);
  assert.match(sql, /separate-activation-authorization-required/);
});

test('pair metadata is service-only', () => {
  assert.match(sql, /revoke all on table public\.study_retention_probe_pair_assessments[\s\S]*authenticated/);
  assert.match(sql, /grant select, insert on table public\.study_retention_probe_pair_assessments[\s\S]*service_role/);
  assert.match(sql, /revoke all on function public\.study_retention_probe_pair_readiness_v1\(\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.study_retention_probe_pair_readiness_v1\(\)[\s\S]*service_role/);
});
