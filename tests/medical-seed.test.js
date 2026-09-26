import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCatalog, selectPublishedQuestions } from '../src/domain/content.js';

const seed = () => JSON.parse(readFileSync(new URL('../data/medical-seed-anaphylaxis-review.json', import.meta.url), 'utf8'));

test('first medical seed is source-grounded, AI-provenanced and review-only', () => {
  const catalog = validateCatalog(seed());
  const q = catalog.questions[0];

  assert.equal(catalog.questions.length, 1);
  assert.equal(q.status, 'in_review');
  assert.equal(q.provenance.kind, 'ai_generated');
  assert.equal(q.provenance.exam, null);
  assert.equal(q.provenance.year, null);
  assert.equal(selectPublishedQuestions(catalog).length, 0);
  assert.equal(q.reviews.length, 0);
  assert.equal(q.publishedAt, null);
});

test('medical seed preserves rights uncertainty instead of pretending source clearance', () => {
  const catalog = validateCatalog(seed());
  const source = catalog.sources[0];

  assert.equal(source.rights.status, 'unknown');
  assert.match(source.rights.evidence, /third-party material/i);
  assert.match(source.rights.evidence, /rights reviewer/i);
});

test('medical seed does not masquerade as PYQ content', () => {
  const q = validateCatalog(seed()).questions[0];
  assert.match(q.provenance.evidence, /not a recalled or licensed PYQ/i);
  assert.match(q.questionVersionId, /@1$/);
});
