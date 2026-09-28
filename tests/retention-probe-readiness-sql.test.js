import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260928193141_m11b_retention_probe_readiness.sql', import.meta.url),
  'utf8'
);

test('retention-probe readiness requires distinct published questions, not versions of one item', () => {
  assert.match(sql, /count\(distinct question_id\)/);
  assert.match(sql, /conceptsWithPublishedAlternateItems/);
  assert.match(sql, /publishedAlternateItemPairs/);
  assert.match(sql, /distinct_published_questions >= 2/);
});

test('readiness audits pending alternate candidates on already-published concepts', () => {
  assert.match(sql, /where status = 'in_review'/);
  assert.match(sql, /has_pending_alternate_candidate/);
  assert.match(sql, /conceptsWithInReviewAlternateCandidates/);
  assert.match(sql, /inReviewAlternateCandidatesOnPublishedConcepts/);
});

test('readiness does not authorize same-item early probing or protocol activation', () => {
  assert.match(sql, /'sameItemEarlyProbeAllowed', false/);
  assert.match(sql, /'canActivateAlternateItemProbe', false/);
  assert.match(sql, /retention-probe-protocol-not-yet-preregistered/);
  assert.match(sql, /no-published-alternate-item-pair/);
});

test('readiness preserves normal content-review and preregistration requirements', () => {
  assert.match(sql, /normal-medical-references-rights-review-for-any-new-probe-item/);
  assert.match(sql, /preregistered-probe-horizons-and-analysis-before-first-probe-assignment/);
  assert.match(sql, /shared-primary-concept-does-not-by-itself-prove-item-equivalence-or-novelty/);
});

test('readiness is service-only and read-only', () => {
  assert.match(sql, /security invoker/);
  assert.match(sql, /revoke all on function public\.study_retention_probe_readiness_v1\(\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.study_retention_probe_readiness_v1\(\)[\s\S]*service_role/);
  assert.doesNotMatch(sql, /insert into|update public|delete from/);
});
