import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourcePath = new URL('../supabase/functions/study-api/index.ts', import.meta.url);

test('visual detection route accepts response intent but never client correctness', async () => {
  const source = await readFile(sourcePath, 'utf8');
  const start = source.indexOf('const visualDetectionMatch =');
  const end = source.indexOf('const actionMatch =', start);
  assert.ok(start >= 0 && end > start);
  const route = source.slice(start, end);
  assert.match(route, /\["requestId", "position", "optionId", "mediaAssetVersionId", "helpUsed"\]/);
  assert.doesNotMatch(route, /input\.correct/);
  assert.doesNotMatch(route, /input\.targetConceptId/);
  assert.doesNotMatch(route, /input\.outcome/);
  assert.match(route, /question\.answerOptionId === optionId/);
  assert.match(route, /buildServerScoredVisualDetectionEvent/);
});

test('visual detection route binds retry intent to the stored attempt receipt', async () => {
  const source = await readFile(sourcePath, 'utf8');
  const start = source.indexOf('const visualDetectionMatch =');
  const end = source.indexOf('const actionMatch =', start);
  const route = source.slice(start, end);
  assert.match(route, /receipt\?\.visualDetection/);
  assert.match(route, /visual_request_key_collision/);
  assert.match(route, /study_record_visual_interaction/);
});

test('unpublished visual content is restricted to current AI-test-reviewed internal testing', async () => {
  const source = await readFile(sourcePath, 'utf8');
  assert.match(source, /const internalVisualQuestionReady = async/);
  assert.match(source, /ai-test-review-v1/);
  assert.match(source, /review\.decision !== "approved"/);
  assert.match(source, /review\.target_sha256 !== targetSha/);
  assert.match(source, /question\.status === "in_review"/);
});
