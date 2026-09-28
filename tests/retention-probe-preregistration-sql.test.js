import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260928224239_m11b1_retention_probe_preregistration.sql', import.meta.url),
  'utf8'
);

test('M11b1 preregisters an immutable service-only retention probe protocol', () => {
  assert.match(sql, /create table if not exists public\.study_retention_probe_protocols/);
  assert.match(sql, /retention-probe-feasibility-v1/);
  assert.match(sql, /study_retention_probe_protocols_immutable/);
  assert.match(sql, /retention_probe_protocol_is_immutable/);
  assert.match(sql, /revoke all on table public\.study_retention_probe_protocols[\s\S]*authenticated/);
  assert.match(sql, /grant select on table public\.study_retention_probe_protocols to service_role/);
});

test('protocol fixes the 7-day feasibility horizon before any assignment exists', () => {
  assert.match(sql, /'targetDays',7/);
  assert.match(sql, /'windowStartDays',6/);
  assert.match(sql, /'windowEndDays',8/);
  assert.match(sql, /'enabled',false/);
  assert.match(sql, /'requiresExplicitLearnerOptIn',true/);
  assert.match(sql, /'maxProbeAssignmentsPerLearnerPer7Days',1/);
  assert.match(sql, /'maxTotalAssignments',20/);
  assert.match(sql, /'maxStudyWindowDaysFromFirstAssignment',56/);
});

test('probe pair must be a distinct published question identity with future validated pair metadata', () => {
  assert.match(sql, /'samePrimaryConceptRequired',true/);
  assert.match(sql, /'distinctQuestionIdentityRequired',true/);
  assert.match(sql, /'bothQuestionVersionsPublished',true/);
  assert.match(sql, /'validatedPairMetadataRequired',true/);
  assert.match(sql, /'questionRevisionDoesNotCountAsAlternate',true/);
});

test('protocol preserves contamination and inference boundaries', () => {
  assert.match(sql, /excludeFromCleanAnalysisIfObservedSameConceptQuestionAttemptOccursBetweenOriginAndProbe/);
  assert.match(sql, /excludeFromCleanAnalysisIfTargetAlternateIsSeenBeforeProbe/);
  assert.match(sql, /'sameItemEarlyProbeForbidden',true/);
  assert.match(sql, /'outsidePlatformExposureMayBeUnobserved',true/);
  assert.match(sql, /'descriptiveOnly',true/);
  assert.match(sql, /'noCausalInference',true/);
  assert.match(sql, /'noMasteryOrForgettingModelFitting',true/);
  assert.match(sql, /'noHypothesisTestingClaim',true/);
});

test('activation readiness remains false after preregistration', () => {
  assert.match(sql, /study_retention_probe_activation_readiness_v1/);
  assert.match(sql, /'protocolPreregistered',v_has_protocol/);
  assert.match(sql, /'validatedPairMetadataAvailable',false/);
  assert.match(sql, /'learnerOptInPathAvailable',false/);
  assert.match(sql, /'canActivate',false/);
  assert.match(sql, /validated-alternate-pair-metadata-not-yet-available/);
  assert.match(sql, /learner-opt-in-path-not-yet-implemented/);
  assert.match(sql, /separate-activation-authorization-required/);
  assert.match(sql, /'activationAuthority',false/);
  assert.match(sql, /'probeSchedulingEnabled',false/);
});

test('protocol reader and activation readiness are unavailable to browser roles', () => {
  assert.match(sql, /revoke all on function public\.study_retention_probe_protocol_v1\(\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.study_retention_probe_protocol_v1\(\)[\s\S]*service_role/);
  assert.match(sql, /revoke all on function public\.study_retention_probe_activation_readiness_v1\(\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.study_retention_probe_activation_readiness_v1\(\)[\s\S]*service_role/);
});
