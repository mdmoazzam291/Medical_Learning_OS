import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(
  new URL('../data/content-intake-pilot-multimodal-breadth-06.json', import.meta.url), 'utf8'
));
const preflight = JSON.parse(await readFile(
  new URL('../data/content-intake-pilot-multimodal-breadth-06-preflight.json', import.meta.url), 'utf8'
));
const mediaLinks = JSON.parse(await readFile(
  new URL('../data/content-media-links-pilot-multimodal-breadth-06.json', import.meta.url), 'utf8'
));
const assist = JSON.parse(await readFile(
  new URL('../data/content-review-assist.json', import.meta.url), 'utf8'
));
const policy = JSON.parse(await readFile(
  new URL('../data/autonomous-content-policy.json', import.meta.url), 'utf8'
));

const imageQuestionIds = new Set([
  'visual:pneumothorax:cxr-recognition@1',
  'visual:urolithiasis:ct-window-recognition@1',
  'visual:pneumonia:right-middle-lobe-cxr@1',
  'visual:pathology:clear-cell-rcc@1',
  'visual:pathology:seminoma@1'
]);

test('pilot 06 is a 25-question breadth-first batch with five multimodal items', () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.concepts.length, 25);
  assert.equal(manifest.sources.length, 9);
  assert.equal(manifest.questions.length, 25);
  assert.equal(mediaLinks.links.length, 5);
  assert.deepEqual(new Set(mediaLinks.links.map(link => link.questionVersionId)), imageQuestionIds);
  assert.equal(mediaLinks.links.filter(link => link.mediaAssetVersionId.startsWith('media:radiology:')).length, 3);
  assert.equal(mediaLinks.links.filter(link => link.mediaAssetVersionId.startsWith('media:pathology:')).length, 2);
  assert.ok(mediaLinks.links.every(link => link.role === 'prompt' && link.blindFirstLook === true));
});

test('pilot 06 preserves original generated provenance and production review boundaries', () => {
  for (const source of manifest.sources) assert.equal(source.rights.status, 'unknown');
  for (const q of manifest.questions) {
    assert.equal(q.questionVersionId, q.questionId + '@1');
    assert.equal(q.version, 1);
    assert.equal(q.status, 'in_review');
    assert.deepEqual(q.reviews, []);
    assert.equal(q.publishedAt, null);
    assert.equal(q.provenance.kind, 'ai_generated');
    assert.equal(q.provenance.exam, null);
    assert.equal(q.provenance.year, null);
    assert.match(q.provenance.evidence, /heuristic/i);
    assert.equal(q.options.length, 4);
    assert.ok(q.options.some(option => option.optionId === q.answerOptionId));
    assert.equal(q.conceptLinks.filter(link => link.role === 'primary').length, 1);
  }
});

test('pilot 06 identities and normalized stems are unique', () => {
  assert.equal(new Set(manifest.questions.map(q => q.questionId)).size, 25);
  assert.equal(new Set(manifest.questions.map(q => q.questionVersionId)).size, 25);
  assert.equal(new Set(manifest.questions.map(q => q.stem.trim().toLowerCase())).size, 25);
  assert.equal(new Set(manifest.concepts.map(c => c.conceptId)).size, 25);
  assert.equal(new Set(mediaLinks.links.map(link => link.mediaAssetVersionId)).size, 5);
});

test('live preflight passed with no lexical overlap flags', () => {
  assert.equal(preflight.validation.valid, true);
  assert.equal(preflight.validation.questionCount, 25);
  assert.equal(preflight.overlap.blocking, false);
  assert.equal(preflight.overlap.flagCount, 0);
  assert.equal(preflight.contentMix.breadthFirst, true);
  assert.equal(preflight.contentMix.examBlueprintFidelity, false);
  assert.equal(preflight.contentMix.multimodal.imageQuestionCount, 5);
  assert.equal(preflight.contentMix.multimodal.mediaRights, 'CC0/public_domain');
});

test('image questions explicitly require media-linked review fingerprints', () => {
  const covered = new Map(assist.questions.map(item => [item.questionVersionId, item]));
  for (const id of imageQuestionIds) {
    const item = covered.get(id);
    assert.ok(item);
    assert.match(item.references.draftNote, /media-linked before review/i);
    assert.match(item.rights.draftNote, /linked media asset/i);
    assert.match(item.rights.summary, /CC0\/public-domain/i);
  }
});

test('NIH replacement removes NICE AI-rights ambiguity from pilot 06', () => {
  assert.equal(manifest.sources.some(source => source.sourceId.startsWith('nice:')), false);
  assert.ok(manifest.sources.some(source => source.sourceId === 'ninds:epilepsy-seizures:2024'));
  assert.ok(manifest.sources.some(source => source.sourceId === 'nimh:depression:2026'));
});

test('autonomous policy still requires 25-question floor and internal-test-only AI review', () => {
  assert.equal(policy.batchSizing.minimumQuestions, 25);
  assert.equal(policy.aiReviewAuthority.scope, 'internal_testing_only');
  assert.equal(policy.aiReviewAuthority.productionPublicationAuthority, false);
});
