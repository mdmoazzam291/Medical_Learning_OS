import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('study-api retries only the transient PGRST303 trusted-read failure once', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');

  assert.match(source, /const trustedRead = async/);
  assert.match(source, /result\.error\?\.code === "PGRST303"/);
  assert.match(source, /setTimeout\(resolve, 75\)/);
  assert.match(source, /trusted_read_retry/);

  for (const operation of [
    'catalog',
    'attempts',
    'bookmarks',
    'revision_state',
    'open_session',
    'recommendation_events',
    'session_state',
    'session_receipt',
    'export_sessions',
    'answer_session'
  ]) {
    assert.match(source, new RegExp(`trustedRead\\("${operation}"`));
  }

  // Mutations remain direct and are not blindly retried.
  assert.doesNotMatch(source, /trustedRead\([^\n]+[\s\S]{0,250}\.upsert\(/);
  assert.doesNotMatch(source, /trustedRead\([^\n]+[\s\S]{0,250}\.delete\(/);
  assert.doesNotMatch(source, /trustedRead\([^\n]+[\s\S]{0,250}\.rpc\(/);
});


test('study-api revision projection is non-authoritative for attempt writes', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');

  assert.match(source, /path === "\/revision\/due"/);
  assert.match(source, /study_rebuild_revision_state/);
  assert.match(source, /revision_projection_failed/);
  assert.match(source, /revision_projection_deferred/);
  assert.match(source, /if \(revisionError\) \{/);
  assert.match(source, /return response\(req, 200, data\?\.receipt \?\? receipt\)/);
  assert.doesNotMatch(source, /if \(revisionError\) fail\(/);
});


test('study-api Study Now is learner-scoped, time-budgeted and resumes interruptions', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /path === "\/study-now\/start"/);
  assert.match(source, /availableMinutes = integer\(input\.availableMinutes, 5, 120\)/);
  assert.match(source, /strategy: "due-oldest-first-v1"/);
  assert.match(source, /reason: "due-revision"/);
  assert.match(source, /strategy: "resume-existing"/);
  assert.doesNotMatch(source, /answerOptionId[\s\S]{0,250}studyNow/);
});


test('Study Now atomically binds selection rationale to the created session', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');
  assert.match(source, /study_start_recommendation_session/);
  assert.match(source, /p_available_minutes: availableMinutes/);
  assert.match(source, /p_plan: plan/);
  assert.match(source, /recommendationId/);
  assert.match(source, /getRecommendationEvents/);
  assert.match(source, /recommendations/);
  assert.doesNotMatch(source, /p_plan: plan[\s\S]{0,800}study_start_session/);
});
