import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260927181000_content_intake_overlap_preflight.sql', import.meta.url),
  'utf8'
);

test('overlap preflight is advisory and explicitly not semantic truth', () => {
  assert.match(sql, /content_intake_overlap_report/);
  assert.match(sql, /'blocking', false/);
  assert.match(sql, /'semanticDuplicateDetection', false/);
  assert.match(sql, /'medicalQualityInference', false/);
  assert.match(sql, /token-set-jaccard-v1/);
  assert.match(sql, /review prompts, not proof of semantic duplication/i);
});

test('overlap report compares candidate stems against batch, live catalog and staged batches', () => {
  assert.match(sql, /'candidate_batch'::text as comparison_scope/);
  assert.match(sql, /'live_catalog'::text as comparison_scope/);
  assert.match(sql, /'staged_batch'::text as comparison_scope/);
  assert.match(sql, /public\.study_catalog/);
  assert.match(sql, /public\.content_intake_batches/);
});

test('overlap report remains service-only', () => {
  assert.match(
    sql,
    /revoke all on function public\.content_intake_overlap_report\(jsonb, numeric\)[\s\S]*from public, anon, authenticated/
  );
  assert.match(
    sql,
    /grant execute on function public\.content_intake_overlap_report\(jsonb, numeric\)[\s\S]*to service_role/
  );
  assert.doesNotMatch(
    sql,
    /grant execute on function public\.content_intake_overlap_report\(jsonb, numeric\)[\s\S]*to (anon|authenticated)/
  );
});

test('lexical helper functions are not directly exposed', () => {
  assert.match(sql, /revoke all on function public\.content_intake_token_set\(text\)[\s\S]*service_role/);
  assert.match(sql, /revoke all on function public\.content_intake_lexical_overlap\(text, text\)[\s\S]*service_role/);
});

test('overlap report validates manifests before advisory comparison', () => {
  assert.match(sql, /content_validate_intake_manifest\(p_manifest, null\)/);
  assert.match(sql, /content_overlap_threshold_invalid/);
  assert.match(sql, /limit 100/);
});
