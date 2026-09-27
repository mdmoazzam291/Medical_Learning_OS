import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCatalog, selectPublishedQuestions } from '../src/domain/content.js';

const pilot = () => JSON.parse(readFileSync(
  new URL('../data/content-intake-pilot-rabies-01.json', import.meta.url),
  'utf8'
));

test('rabies pilot contains five distinct source-grounded review-only questions', () => {
  const catalog = validateCatalog(pilot());
  assert.equal(catalog.questions.length, 5);
  assert.equal(new Set(catalog.questions.map(q => q.questionId)).size, 5);
  assert.equal(new Set(catalog.questions.map(q => q.questionVersionId)).size, 5);
  assert.equal(selectPublishedQuestions(catalog).length, 0);

  for (const q of catalog.questions) {
    assert.equal(q.status, 'in_review');
    assert.equal(q.version, 1);
    assert.equal(q.supersedes, null);
    assert.equal(q.reviews.length, 0);
    assert.equal(q.publishedAt, null);
    assert.equal(q.provenance.kind, 'ai_generated');
    assert.equal(q.provenance.exam, null);
    assert.equal(q.provenance.year, null);
    assert.match(q.provenance.evidence, /not a recalled or licensed PYQ/i);
    assert.equal(q.conceptLinks.filter(link => link.role === 'primary').length, 1);
    assert.ok(q.sourceIds.length >= 1);
  }
});

test('rabies pilot leaves source rights unresolved for independent rights review', () => {
  const catalog = validateCatalog(pilot());
  assert.equal(catalog.sources.length, 2);
  for (const source of catalog.sources) {
    assert.equal(source.rights.status, 'unknown');
    assert.match(source.rights.evidence, /rights review remains required/i);
    assert.match(source.url, /^https:\/\/rabiesfreeindia\.mohfw\.gov\.in\//);
  }
});

test('rabies pilot stays geographically explicit where schedule details are India-specific', () => {
  const catalog = validateCatalog(pilot());
  const scheduleQuestions = catalog.questions.filter(q =>
    q.questionId.includes('pep-days-india')
  );
  assert.equal(scheduleQuestions.length, 2);
  for (const q of scheduleQuestions) {
    assert.match(q.stem, /Indian National Rabies Control Programme/i);
  }
});
