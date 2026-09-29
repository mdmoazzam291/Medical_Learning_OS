import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20260929030036_m11c_transfer_pair_validation.sql', import.meta.url),
  'utf8'
);
const indexMigration = await readFile(
  new URL('../supabase/migrations/20260929030109_m11c_transfer_pair_validator_index.sql', import.meta.url),
  'utf8'
);

test('M11c stores immutable exact-version pair validation evidence', () => {
  assert.match(migration, /create table if not exists public\.study_transfer_pair_validations/);
  assert.match(migration, /question_a_version_id text not null/);
  assert.match(migration, /question_b_version_id text not null/);
  assert.match(migration, /question_a_medical_sha256 text not null/);
  assert.match(migration, /question_b_medical_sha256 text not null/);
  assert.match(migration, /study_transfer_pair_validations_immutable/);
  assert.match(migration, /transfer_pair_validation_is_immutable/);
});

test('pair validation requires distinct published questions on one primary concept', () => {
  assert.match(migration, /distinct_question_versions_required/);
  assert.match(migration, /question_revision_is_not_transfer_item/);
  assert.match(migration, /transfer_pair_requires_published_questions/);
  assert.match(migration, /transfer_pair_requires_same_primary_concept/);
  assert.match(migration, /author_cannot_validate_transfer_pair/);
});

test('pair validator is a conservative human-authority bootstrap', () => {
  assert.match(migration, /content_reviewer_grants/);
  assert.match(migration, /review_kind in \('medical','references','rights'\)/);
  assert.match(migration, /<> 3/);
  assert.match(migration, /transfer_pair_validator_not_authorized/);
});

test('validated transfer requires novelty, construct alignment and bounded cue overlap', () => {
  assert.match(migration, /surface_novelty in \('moderate','high'\)/);
  assert.match(migration, /construct_alignment = 'same_primary_construct'/);
  assert.match(migration, /reasoning_alignment in \('comparable','bounded_difference'\)/);
  assert.match(migration, /cue_overlap_risk in \('low','moderate'\)/);
  assert.match(migration, /validated_pair_fails_transfer_semantic_gate/);
});

test('retention-probe comparability is stricter than generic transfer validity', () => {
  assert.match(migration, /difficulty_comparability in \('comparable','bounded_difference'\)/);
  assert.match(migration, /retention_comparability_gate_failed/);
  assert.match(migration, /retention_probe_comparable/);
});

test('pair evidence is bound to current medical target hashes', () => {
  assert.match(migration, /current_review_target_sha256\(v_a_version,'medical'\)/);
  assert.match(migration, /current_review_target_sha256\(v_b_version,'medical'\)/);
  assert.match(migration, /hashes_current/);
  assert.match(migration, /staleValidatedPairs/);
});

test('validated transfer endpoint filters to validated current pairs', () => {
  assert.match(migration, /study_validated_transfer_observations_v1/);
  assert.match(migration, /v\.decision='validated'/);
  assert.match(migration, /v\.transfer_evidence_valid/);
  assert.match(migration, /priorTargetAttempts/);
  assert.match(migration, /interveningSameConceptAttempts/);
  assert.match(migration, /cleanObservedTransfer/);
  assert.match(migration, /validated-item-pair-does-not-prove-general-transfer-beyond-the-pair/);
  assert.match(migration, /descriptive-transfer-evidence-does-not-estimate-mastery-or-causal-effect/);
});

test('M11c cannot activate probes, Study Now or mastery inference', () => {
  assert.match(migration, /'probeSchedulingEnabled',false/);
  assert.match(migration, /'studyNowAuthority',false/);
  assert.match(migration, /'masteryInferenceAuthority',false/);
  assert.match(migration, /'canActivate',false/);
  assert.match(migration, /learner-opt-in-path-not-yet-implemented/);
  assert.match(migration, /separate-activation-authorization-required/);
});

test('M11c tables and RPCs are unavailable to browser roles', () => {
  assert.match(
    migration,
    /revoke all on table public\.study_transfer_pair_validations from public, anon, authenticated, service_role/
  );
  assert.match(
    migration,
    /revoke all on function public\.record_transfer_pair_validation_v1\([\s\S]*?from public, anon, authenticated/
  );
  assert.match(
    migration,
    /revoke all on function public\.study_transfer_pair_validation_readiness_v1\(\)[\s\S]*?from public, anon, authenticated/
  );
  assert.match(
    migration,
    /revoke all on function public\.study_validated_transfer_observations_v1\(uuid\)[\s\S]*?from public, anon, authenticated/
  );
});

test('validator foreign key has a covering index', () => {
  assert.match(indexMigration, /study_transfer_pair_validations_validator/);
  assert.match(indexMigration, /\(validator_id, validated_at desc\)/);
});
