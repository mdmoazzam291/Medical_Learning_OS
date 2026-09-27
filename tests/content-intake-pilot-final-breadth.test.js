import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(
  new URL('../data/content-intake-pilot-final-breadth-07.json', import.meta.url), 'utf8'
));
const preflight = JSON.parse(await readFile(
  new URL('../data/content-intake-pilot-final-breadth-07-preflight.json', import.meta.url), 'utf8'
));
const assist = JSON.parse(await readFile(
  new URL('../data/content-review-assist.json', import.meta.url), 'utf8'
));
const policy = JSON.parse(await readFile(
  new URL('../data/autonomous-content-policy.json', import.meta.url), 'utf8'
));

test('final breadth pilot 07 contains exactly the 49-question remaining simulator gap', () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.questions.length, 49);
  assert.equal(manifest.concepts.length, 49);
  assert.equal(manifest.sources.length, 8);
});

test('pilot 07 spans seven breadth-first domains without fabricated exam provenance', () => {
  const domains = new Set(manifest.concepts.flatMap(c => c.subjectTags));
  for (const tag of ['obstetrics','ophthalmology','ent','orthopedics','anesthesia','toxicology','dermatology']) {
    assert.ok(domains.has(tag), 'missing breadth tag ' + tag);
  }
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
    assert.ok(q.options.some(o => o.optionId === q.answerOptionId));
    assert.equal(q.conceptLinks.filter(link => link.role === 'primary').length, 1);
  }
});

test('pilot 07 canonical identities and normalized stems are unique', () => {
  assert.equal(new Set(manifest.questions.map(q => q.questionId)).size, 49);
  assert.equal(new Set(manifest.questions.map(q => q.questionVersionId)).size, 49);
  assert.equal(new Set(manifest.questions.map(q => q.stem.trim().toLowerCase())).size, 49);
  assert.equal(new Set(manifest.concepts.map(c => c.conceptId)).size, 49);
});

test('all sources enter with unresolved production rights', () => {
  for (const source of manifest.sources) {
    assert.equal(source.rights.status, 'unknown');
    assert.match(source.rights.evidence, /Production rights review remains separate|independently confirmed for production/);
  }
});

test('live preflight validates 49 questions with zero lexical overlap flags', () => {
  assert.equal(preflight.validation.valid, true);
  assert.equal(preflight.validation.questionCount, 49);
  assert.equal(preflight.validation.conceptCount, 49);
  assert.equal(preflight.validation.sourceCount, 8);
  assert.equal(preflight.overlap.blocking, false);
  assert.equal(preflight.overlap.flagCount, 0);
  assert.equal(preflight.contentMix.breadthFirst, true);
  assert.equal(preflight.contentMix.examBlueprintFidelity, false);
});

test('review assist covers every final-breadth question but remains non-authoritative', () => {
  const covered = new Map(assist.questions.map(item => [item.questionVersionId, item]));
  for (const q of manifest.questions) {
    const item = covered.get(q.questionVersionId);
    assert.ok(item, 'missing assist for ' + q.questionVersionId);
    assert.equal(item.medical.result, 'supported');
    assert.equal(item.medical.uncertainty, 'low');
    assert.equal(item.references.result, 'direct_support');
    assert.match(item.rights.result, /^(citation_only|public_domain)_recommended$/);
    assert.equal('decision' in item, false);
    assert.equal('approved' in item, false);
    assert.equal('reviewerId' in item, false);
  }
  assert.ok(assist.scope.batchKeys.includes('pilot:final-breadth:20260928:07'));
  assert.equal(assist.scope.questionCount, 154);
  assert.equal(assist.authority, 'none');
  assert.equal(assist.policy.mayApproveReviewGate, false);
  assert.equal(assist.policy.mayPublishContent, false);
});

test('autonomous policy allows this final 49-question breadth batch and preserves AI-test-only review', () => {
  assert.ok(manifest.questions.length >= policy.batchSizing.minimumQuestions);
  assert.equal(policy.batchSizing.minimumQuestions, 25);
  assert.equal(policy.aiReviewAuthority.scope, 'internal_testing_only');
  assert.equal(policy.aiReviewAuthority.productionPublicationAuthority, false);
});
