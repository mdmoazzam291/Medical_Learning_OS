import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260928120011_m10b_canonical_visual_interaction_profile.sql', import.meta.url),
  'utf8'
);

test('visual interaction task profile is immutable, RLS protected and service-only', () => {
  assert.match(sql, /create table public\.content_visual_interaction_profiles/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public\.content_visual_interaction_profiles[\s\S]*from public, anon, authenticated, service_role/);
  assert.match(sql, /grant select on table public\.content_visual_interaction_profiles[\s\S]*to service_role/);
  assert.match(sql, /content_visual_interaction_profiles_immutable/);
  assert.match(sql, /block_content_media_mutation/);
});

test('visual task profile can only be declared while question is in review and on exact prompt media', () => {
  assert.match(sql, /content_register_visual_interaction_v1/);
  assert.match(sql, /visual_interaction_requires_in_review/);
  assert.match(sql, /l\.role='prompt'/);
  assert.match(sql, /visual_interaction_prompt_media_mismatch/);
  assert.match(sql, /grant execute on function public\.content_register_visual_interaction_v1\(text,text,text\)[\s\S]*to service_role/);
});

test('learner prompt receives explicit task descriptor from canonical profile', () => {
  const start = sql.indexOf('create or replace function public.content_media_prompt');
  assert.ok(start >= 0);
  const section = sql.slice(start);
  assert.match(section, /'visualInteraction'/);
  assert.match(section, /'schemaVersion',v\.schema_version/);
  assert.match(section, /'taskType',v\.task_type/);
  assert.match(section, /'mediaAssetVersionId',v\.media_asset_version_id/);
});

test('human review fingerprint binds the visual interaction task itself', () => {
  const start = sql.indexOf('create or replace function public.content_media_review_target');
  assert.ok(start >= 0);
  const section = sql.slice(start);
  assert.match(section, /'visualInteraction'/);
  assert.match(section, /left join public\.content_visual_interaction_profiles/);
  assert.match(section, /when 'medical'/);
  assert.match(section, /when 'references'/);
  assert.match(section, /else jsonb_build_object/);
});

test('bootstrap pathology visual item is explicitly classified as detection', () => {
  assert.match(sql, /visual:pathology:clear-cell-rcc@1/);
  assert.match(sql, /media:pathology:clear-cell-rcc-grade1@1/);
  assert.match(sql, /'detection'/);
});
