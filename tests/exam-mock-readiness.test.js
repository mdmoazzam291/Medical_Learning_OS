import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260927162000_exam_mock_readiness.sql', import.meta.url),
  'utf8'
);
const registry = JSON.parse(
  await readFile(new URL('../data/exam-rules.json', import.meta.url), 'utf8')
);
const neet = registry.ruleSets.find(rule => rule.ruleSetId === 'neet-pg:2026@1');

test('runtime rules mirror stays pinned to the verified NEET-PG 2026 registry entry', () => {
  assert.ok(neet);
  assert.equal(neet.verification.status, 'verified');
  assert.equal(neet.rules.totalQuestions, 180);
  assert.equal(neet.rules.totalDurationSeconds, 12600);
  assert.match(sql, /'neet-pg:2026@1'/);
  assert.match(sql, /'neet-pg'/);
  assert.match(sql, /\n  180,\n  12600,/);
  assert.match(sql, /'data\/exam-rules\.json'/);
  assert.match(sql, /rule_set_sha256/);
});

test('runtime exam rules are immutable and inaccessible to browser roles', () => {
  assert.match(sql, /exam_rule_set_is_immutable/);
  assert.match(sql, /before update or delete on public\.exam_rule_sets/);
  assert.match(sql, /revoke all on table public\.exam_rule_sets[\s\S]*authenticated/);
  assert.match(sql, /grant select, insert on table public\.exam_rule_sets to service_role/);
});

test('mock readiness counts unique stable questions rather than published versions', () => {
  assert.match(sql, /create or replace function public\.exam_mock_readiness/);
  assert.match(sql, /partition by q->>'questionId'/);
  assert.match(sql, /where rn = 1/);
  assert.match(sql, /requiredUniqueQuestions/);
  assert.match(sql, /eligibleUniqueQuestions/);
  assert.match(sql, /insufficient-unique-published-questions/);
});

test('eligibility requires the existing publication gate and a primary concept', () => {
  assert.match(sql, /q->>'status' = 'published'/);
  assert.match(sql, /q->>'publishedAt'/);
  assert.match(sql, /q->>'answerOptionId'/);
  assert.match(sql, /link->>'role' = 'primary'/);
  assert.match(sql, /publicationGateCarriesReviewAssurance/);
});

test('assembly uses deterministic seeded randomization, exact count and no answer keys', () => {
  assert.match(sql, /create or replace function public\.exam_assemble_mock/);
  assert.match(sql, /btrim\(p_seed\) \|\| ':' \|\| question_version_id/);
  assert.match(sql, /limit v_required/);
  assert.match(sql, /questionVersionIds/);
  assert.match(sql, /examBlueprintFidelity', false/);
  assert.doesNotMatch(sql, /jsonb_agg\([^\n]*answerOptionId/);
});

test('readiness and assembly RPCs are service-only', () => {
  assert.match(sql, /revoke all on function public\.exam_mock_readiness\(text\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.exam_mock_readiness\(text\)[\s\S]*service_role/);
  assert.match(sql, /revoke all on function public\.exam_assemble_mock\(text, text\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.exam_assemble_mock\(text, text\)[\s\S]*service_role/);
});
