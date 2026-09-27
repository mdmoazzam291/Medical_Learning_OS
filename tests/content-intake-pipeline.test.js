import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260927173000_content_intake_pipeline.sql', import.meta.url),
  'utf8'
);

test('content intake is server-only staging with immutable payload evidence', () => {
  assert.match(sql, /create table public\.content_intake_batches/);
  assert.match(sql, /create table public\.content_intake_events/);
  assert.match(sql, /manifest_sha256/);
  assert.match(sql, /content_intake_batch_payload_immutable/);
  assert.match(sql, /content_intake_event_immutable/);
  assert.match(sql, /revoke all on table public\.content_intake_batches[\s\S]*authenticated/);
  assert.match(sql, /grant select on table public\.content_intake_batches to service_role/);
});

test('intake v1 cannot manufacture PYQ provenance or skip review', () => {
  assert.match(sql, /q->'provenance'->>'kind' not in \('original','ai_generated'\)/);
  assert.match(sql, /q->>'status' <> 'in_review'/);
  assert.match(sql, /jsonb_array_length\(q->'reviews'\) <> 0/);
  assert.match(sql, /q->'publishedAt' <> 'null'::jsonb/);
  assert.match(sql, /publicationAuthority', false/);
  assert.doesNotMatch(sql, /publish_verified_content\(/);
});

test('new source rights always enter unresolved and use the existing rights workflow later', () => {
  assert.match(sql, /s->'rights'->>'status' <> 'unknown'/);
  assert.match(sql, /intake_source_invalid/);
  assert.doesNotMatch(sql, /source_rights_events[\s\S]*insert into public\.source_rights_events/i);
});

test('intake validates exact v1 question identity, answers, concepts, sources and duplicate stems', () => {
  assert.match(sql, /q->>'questionVersionId' <> \(q->>'questionId'\) \|\| '@1'/);
  assert.match(sql, /coalesce\(q->>'version',''\) <> '1'/);
  assert.match(sql, /intake_answer_invalid/);
  assert.match(sql, /intake_concept_reference_invalid/);
  assert.match(sql, /intake_source_reference_invalid/);
  assert.match(sql, /content_intake_normalize_text/);
  assert.match(sql, /intake_stem_duplicate/);
  assert.match(sql, /intake_stem_exists/);
});

test('promotion revalidates after taking the live catalog lock and increments catalog once', () => {
  const promote = sql.indexOf('create or replace function public.content_promote_intake_batch');
  const lock = sql.indexOf('from public.study_catalog c', promote);
  const revalidate = sql.indexOf('content_validate_intake_manifest(v_batch.manifest, v_batch.id)', promote);
  const write = sql.indexOf('update public.study_catalog', promote);
  assert.ok(promote >= 0 && lock > promote && revalidate > lock && write > revalidate);
  assert.match(sql, /version = v_catalog_version \+ 1/);
  assert.match(sql, /catalogVersionBefore/);
  assert.match(sql, /catalogVersionAfter/);
});

test('pipeline status makes the human-review bottleneck observable without inventing quality scores', () => {
  assert.match(sql, /create or replace function public\.content_intake_pipeline_status/);
  assert.match(sql, /reviewOutstanding/);
  assert.match(sql, /'medical'/);
  assert.match(sql, /'references'/);
  assert.match(sql, /'rights'/);
  assert.match(sql, /semanticDuplicateDetection', false/);
  assert.doesNotMatch(sql, /qualityScore|masteryScore|aiConfidence/);
});

test('service role owns intake mutations; browser roles receive no intake RPC authority', () => {
  for (const signature of [
    'content_stage_intake_batch\\(text, text, jsonb\\)',
    'content_promote_intake_batch\\(uuid\\)',
    'content_abandon_intake_batch\\(uuid, text\\)'
  ]) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${signature}[\\s\\S]*authenticated`));
    assert.match(sql, new RegExp(`grant execute on function public\\.${signature}[\\s\\S]*service_role`));
  }
});
