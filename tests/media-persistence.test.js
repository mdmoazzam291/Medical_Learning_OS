import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20260927222051_m10a_media_persistence_review_binding.sql', import.meta.url),
  'utf8'
);
const studyApi = await readFile(
  new URL('../supabase/functions/study-api/index.ts', import.meta.url),
  'utf8'
);

test('M10a media persistence is service-only, RLS-enabled and immutable', () => {
  for (const table of [
    'content_media_assets',
    'content_media_annotations',
    'content_question_media_links'
  ]) {
    assert.match(migration, new RegExp(`create table public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated, service_role`));
  }
  assert.match(migration, /content_media_immutable/);
  assert.match(migration, /before update or delete on public\.content_media_assets/);
  assert.match(migration, /before update or delete on public\.content_media_annotations/);
  assert.match(migration, /before update or delete on public\.content_question_media_links/);
});

test('media registration is a trusted v1 boundary with normalized image rights', () => {
  assert.match(migration, /content_register_media_bundle_v1/);
  assert.match(migration, /rightsStatus/);
  assert.match(migration, /unknown','owned','licensed','public_domain/);
  assert.match(migration, /v_review->>'status' <> 'unverified'/);
  assert.match(migration, /grant execute on function public\.content_register_media_bundle_v1\(jsonb\) to service_role/);
  assert.match(migration, /revoke all on function public\.content_register_media_bundle_v1\(jsonb\) from public, anon, authenticated/);
});

test('media changes review fingerprints only when a question has media links', () => {
  assert.match(migration, /content_media_review_target/);
  assert.match(migration, /v_media := public\.content_media_review_target/);
  assert.match(migration, /if jsonb_array_length\(v_media\)>0 then/);
  assert.match(migration, /v_target := v_target \|\| jsonb_build_object\('media',v_media\)/);
});

test('rights approval fails closed for unresolved image rights in both human and AI lanes', () => {
  assert.match(migration, /media_rights_not_resolved/);
  assert.match(migration, /content_review_media_rights_guard/);
  assert.match(migration, /content_ai_test_review_media_rights_guard/);
  assert.match(migration, /not in \('owned','licensed','public_domain'\)/);
});

test('learner media prompt omits diagnosis, provenance, rights and annotations', () => {
  const promptStart = migration.indexOf('create or replace function public.content_media_prompt');
  assert.ok(promptStart >= 0);
  const promptSql = migration.slice(promptStart);
  assert.match(promptSql, /mediaAssetVersionId/);
  assert.match(promptSql, /blindFirstLook/);
  assert.doesNotMatch(promptSql, /diagnosisEvidence/);
  assert.doesNotMatch(promptSql, /rightsStatus/);
  assert.doesNotMatch(promptSql, /annotationVersionId/);
});

test('study API exposes media only for currently published questions via trusted RPC', () => {
  assert.match(studyApi, /path === "\/media"/);
  assert.match(studyApi, /publishedQuestions\(catalog\.body\)\.some/);
  assert.match(studyApi, /admin\.rpc\("content_media_prompt"/);
  assert.match(studyApi, /question_not_available/);
  assert.match(studyApi, /media_prompt_failed/);
});
