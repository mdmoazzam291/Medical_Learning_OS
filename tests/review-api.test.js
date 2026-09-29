import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('review-api derives reviewer identity server-side and never trusts browser reviewer ids', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');

  assert.match(source, /auth\.getUser\(token\)/);
  assert.match(source, /const reviewerId = authData\.user\.id/);
  assert.match(source, /content_admin_status_v1/);
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


test('review-api resolves singleton admin authority through the database policy', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');

  assert.match(source, /admin\.rpc\("content_admin_status_v1", \{ p_user: reviewerId \}\)/);
  assert.match(source, /if \(!access\.isAdmin\) fail\(403, "content_admin_required"\)/);
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


test('NeuralVault review queue exposes canonical note provenance for reviewer inspection', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /source_ids,provenance,status/);
  assert.match(source, /provenance: note\.provenance/);
});


test('review-api exposes read-only pipeline status only to authenticated reviewers', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/pipeline-status"/);
  assert.match(source, /const grants = await getGrants\(\)/);
  assert.match(source, /if \(!grants\.length\) fail\(403, "reviewer_not_authorized"\)/);
  assert.match(source, /admin\.rpc\("content_intake_pipeline_status"\)/);
  assert.match(source, /content_pipeline_status_unavailable/);
  assert.doesNotMatch(source, /path === "\/pipeline-status"[\s\S]{0,900}content_stage_intake_batch/);
});


test('review-api exposes media-bound review targets only through authorized reviewer queue', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /content_media_review_target/);
  assert.match(source, /current_review_target_sha256/);
  assert.match(source, /review_media_assets/);
  assert.match(source, /createSignedUrl\(objectPath, 900\)/);
  assert.match(source, /mediaReview: await signedReviewMedia/);
  assert.match(source, /await requireGrant\(kind\)/);
  assert.doesNotMatch(source, /p_review_kind:\s*input\./);
});

test('media review surface returns gate hash and exact target rather than a browser-derived summary', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /contractId: "content-media-review-surface-v1"/);
  assert.match(source, /targetSha256: String\(targetSha256/);
  assert.match(source, /target: reviewTarget/);
  assert.match(source, /mediaAssetVersionId/);
});


test('review-api structured review batches are JWT-derived, bounded and note-free', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/structured-review-batch"/);
  assert.match(source, /record_structured_review_batch/);
  assert.match(source, /p_reviewer: reviewerId/);
  assert.match(source, /targetIds\.length < 1 \|\| input\.targetIds\.length > 500/);
  const start = source.indexOf('path === "/structured-review-batch"');
  const end = source.indexOf('path === "/full-question-review"', start);
  const route = source.slice(start, end);
  assert.doesNotMatch(route, /reviewerId\s*=\s*input|p_reviewer:\s*input/);
  assert.doesNotMatch(route, /notes/);
  assert.match(route, /publicationAuthority !== false/);
});


test('review-api exposes learner report triage without learner identity', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/learner-reports"/);
  assert.match(source, /learner_content_issue_reports/);
  assert.match(source, /learner_content_issue_triage_events/);
  assert.match(source, /String\(row\.learner_id\) !== reviewerId/);
  assert.match(source, /learnerIdentityExposed: false/);
  assert.match(source, /canonicalMutationAuthority: false/);

  const start = source.indexOf('path === "/learner-reports"');
  const end = source.indexOf('path === "/learner-reports/triage"', start);
  const route = source.slice(start, end);
  assert.doesNotMatch(route, /learnerId:/);
  assert.doesNotMatch(route, /learner_id:/);
});

test('review-api triage mutation derives reviewer identity from JWT and is non-authoritative', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');
  const start = source.indexOf('path === "/learner-reports/triage"');
  const end = source.indexOf('path === "/queue"', start);
  const route = source.slice(start, end);
  assert.match(route, /triage_learner_content_issue_reports/);
  assert.match(route, /p_reviewer: reviewerId/);
  assert.doesNotMatch(route, /p_reviewer:\s*input/);
  assert.match(route, /await requireGrant\(kind\)/);
  assert.match(route, /canonicalMutation !== false/);
  assert.match(route, /publicationAuthority !== false/);
  assert.match(route, /learnerModelAuthority !== false/);
});

test('learner report inbox groups exact target snapshot rather than popularity-deciding truth', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /\[row\.target_type, row\.target_id, row\.target_sha256\]\.join/);
  assert.match(source, /reportCount: group\.reports\.length/);
  assert.match(source, /targetState = question\.status === "published" \? "current" : "superseded"/);
});


test('review-api exposes admin search only through singleton admin authority', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');
  const start = source.indexOf('path === "/admin-search"');
  const end = source.indexOf('path === "/note-drafts"', start);
  const route = source.slice(start, end);
  assert.match(route, /await requireAdmin\(\)/);
  assert.match(route, /content-admin-search-v1/);
  assert.match(route, /study_catalog/);
  assert.doesNotMatch(route, /service_role|secretKey/);
});

test('review-api note draft creation derives author identity from authenticated admin', async () => {
  const source = await readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8');
  const start = source.indexOf('path === "/note-drafts"');
  const end = source.indexOf('path === "/pipeline-status"', start);
  const route = source.slice(start, end);
  assert.match(route, /await requireAdmin\(\)/);
  assert.match(route, /neural_create_canonical_note_draft/);
  assert.match(route, /p_author:\s*reviewerId/);
  assert.doesNotMatch(route, /authorId/);
  assert.match(route, /learnerVisible:\s*false/);
  assert.match(route, /publicationAuthority:\s*false/);
  assert.match(route, /reviewAuthority:\s*false/);
  assert.match(route, /independentReviewRequired:\s*true/);
});
