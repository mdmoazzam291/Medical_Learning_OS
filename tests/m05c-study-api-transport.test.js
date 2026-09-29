import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../supabase/functions/study-api/index.ts', import.meta.url),
  'utf8'
);

test('Study Now transport class is derived server-side from allowed browser CORS metadata', () => {
  assert.match(source, /function studyNowTransportKind\(req: Request\)/);
  assert.match(source, /req\.headers\.get\("origin"\)/);
  assert.match(source, /req\.headers\.get\("sec-fetch-mode"\)/);
  assert.match(source, /allowedOrigins\.has\(origin\)/);
  assert.match(source, /hosted-browser-cors/);
  assert.match(source, /local-browser-cors/);
  assert.match(source, /authenticated-api/);
});

test('Study Now transport evidence stores no user agent, IP or exact origin field', () => {
  const start = source.indexOf('function studyNowTransportKind');
  const end = source.indexOf('function response', start);
  const classifier = source.slice(start, end);
  assert.doesNotMatch(classifier, /user-agent|x-forwarded-for|cf-connecting-ip/i);
  assert.doesNotMatch(classifier, /return origin/);
});

test('transport receipt is recorded only when the attempt was newly persisted', () => {
  assert.match(source, /const newlyRecordedAttempt = receipt\?\.event\?\.eventId === attemptEvent\.eventId/);
  assert.match(source, /const newlyRecordedAttempt = storedReceipt\?\.event\?\.eventId === event\.eventId/);
  assert.match(source, /if \(newlyRecordedAttempt\) \{[\s\S]*recordRecommendationTransport/);
});

test('Study Now integrity route derives learner identity from authenticated request context', () => {
  assert.match(source, /path === "\/study-now\/integrity"/);
  assert.match(source, /study_now_completion_integrity_v1/);
  assert.match(source, /p_learner: learnerId/);
  const start = source.indexOf('path === "/study-now/integrity"');
  const end = source.indexOf('path === "/study-now/start"', start);
  const route = source.slice(start, end);
  assert.doesNotMatch(route, /input\.learner|learnerId\s*:/);
});
