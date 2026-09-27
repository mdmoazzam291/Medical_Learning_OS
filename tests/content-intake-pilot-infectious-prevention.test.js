import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(
  new URL('../data/content-intake-pilot-infectious-prevention-02.json', import.meta.url),
  'utf8'
));

test('second controlled intake pilot has 25 new concepts, 5 sources and 25 questions', () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.concepts.length, 25);
  assert.equal(manifest.sources.length, 5);
  assert.equal(manifest.questions.length, 25);
});

test('every source is unresolved official CDC factual grounding', () => {
  for (const source of manifest.sources) {
    assert.match(source.sourceId, /^cdc:/);
    assert.match(source.url, /^https:\/\/www\.cdc\.gov\//);
    assert.equal(source.rights.status, 'unknown');
    assert.match(source.rights.evidence, /factual grounding/i);
    assert.match(source.rights.evidence, /rights review/i);
  }
});

test('each source package contributes exactly five questions', () => {
  const counts = new Map();
  for (const q of manifest.questions) {
    assert.equal(q.sourceIds.length, 1);
    counts.set(q.sourceIds[0], (counts.get(q.sourceIds[0]) || 0) + 1);
  }
  assert.deepEqual([...counts.values()].sort((a,b)=>a-b), [5,5,5,5,5]);
});

test('pilot questions enter review with no fabricated authority or exam provenance', () => {
  for (const q of manifest.questions) {
    assert.equal(q.version, 1);
    assert.equal(q.questionVersionId, q.questionId + '@1');
    assert.equal(q.supersedes, null);
    assert.equal(q.status, 'in_review');
    assert.deepEqual(q.reviews, []);
    assert.equal(q.publishedAt, null);
    assert.equal(q.provenance.kind, 'ai_generated');
    assert.equal(q.provenance.exam, null);
    assert.equal(q.provenance.year, null);
    assert.equal(q.options.length, 4);
    assert.ok(q.options.some(o => o.optionId === q.answerOptionId));
    assert.equal(q.conceptLinks.filter(link => link.role === 'primary').length, 1);
  }
});

test('concepts preserve guideline jurisdiction instead of presenting CDC rules as universal exam truth', () => {
  for (const concept of manifest.concepts) {
    assert.ok(concept.subjectTags.includes('guideline-us-cdc'));
  }
});

test('stable question and concept identities are unique', () => {
  assert.equal(new Set(manifest.questions.map(q => q.questionId)).size, 25);
  assert.equal(new Set(manifest.questions.map(q => q.questionVersionId)).size, 25);
  assert.equal(new Set(manifest.questions.map(q => q.stem.trim().toLowerCase())).size, 25);
  assert.equal(new Set(manifest.concepts.map(c => c.conceptId)).size, 25);
});

test('batch intentionally spans five prevention/management families', () => {
  const ids = manifest.questions.map(q => q.questionId);
  for (const prefix of [
    'infectious:tetanus:',
    'infectious:gas-pharyngitis:',
    'infectious:pertussis:',
    'infectious:meningococcal:',
    'infectious:hbv-exposure:'
  ]) {
    assert.equal(ids.filter(id => id.startsWith(prefix)).length, 5);
  }
});
