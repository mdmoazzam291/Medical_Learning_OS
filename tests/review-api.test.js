import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('review-api derives reviewer identity server-side and never trusts browser reviewer ids', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');

  assert.match(source, /auth\.getUser\(token\)/);
  assert.match(source, /const reviewerId = authData\.user\.id/);
  assert.match(source, /get_active_reviewer_grants/);
  assert.match(source, /record_content_review/);
  assert.match(source, /reviewer_not_authorized/);

  assert.doesNotMatch(source, /exactFields\(input, \[[^\]]*reviewerId/);
  assert.doesNotMatch(source, /p_reviewer:\s*input\./);
  assert.match(source, /p_reviewer:\s*reviewerId/);
});

test('review-api exposes only review-stage content to authorized review kinds', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');

  assert.match(source, /reviewKinds = new Set\(\["medical", "references", "rights"\]\)/);
  assert.match(source, /q\?\.status === "in_review"/);
  assert.match(source, /reviewed\.has\(q\.questionVersionId\)/);
  assert.match(source, /review_catalog_unavailable/);
  assert.match(source, /review_evidence_unavailable/);
});

test('review-api retries only transient trusted reads and does not retry the review mutation', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');

  assert.match(source, /result\.error\?\.code === "PGRST303"/);
  assert.match(source, /setTimeout\(resolve, 75\)/);
  assert.match(source, /admin\.rpc\("record_content_review"/);
  assert.doesNotMatch(source, /trustedRead\([^\n]+[\s\S]{0,220}admin\.rpc\("record_content_review"/);
});


test('review-api resolves source rights only through server-derived reviewer identity', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');

  assert.match(source, /path === "\/source-rights"/);
  assert.match(source, /exactFields\(input, \["sourceId", "rightsStatus", "evidence"\]\)/);
  assert.match(source, /requireGrant\("rights"\)/);
  assert.match(source, /admin\.rpc\("resolve_source_rights"/);
  assert.match(source, /p_reviewer:\s*reviewerId/);
  assert.doesNotMatch(source, /p_reviewer:\s*input\./);
  assert.match(source, /source_rights_already_resolved/);
  assert.match(source, /rights_not_resolved/);
});


test('review-api reads only active reviewer grants through the database policy', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');

  assert.match(source, /admin\.rpc\("get_active_reviewer_grants", \{ p_reviewer: reviewerId \}\)/);
  assert.doesNotMatch(source, /admin\.from\("content_reviewer_grants"\).*select\("review_kind"\)/s);
});


test('review-api exposes NeuralVault note queues through the same active reviewer grants', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/note-queue"/);
  assert.match(source, /neural_canonical_note_versions/);
  assert.match(source, /target_type", "neural_note_version"/);
  assert.match(source, /note\?\.author_id !== reviewerId/);
  assert.match(source, /requireGrant\(kind\)/);
});

test('review-api records NeuralVault gate decisions with server-derived reviewer identity', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/note-reviews"/);
  assert.match(source, /record_neural_note_review/);
  assert.match(source, /p_reviewer: reviewerId/);
  assert.doesNotMatch(source, /p_reviewer:\s*input\./);
  assert.match(source, /neural_note_not_in_review/);
});
