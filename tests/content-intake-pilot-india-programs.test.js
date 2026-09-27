import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../data/content-intake-pilot-india-programs-05.json', import.meta.url), 'utf8'));
const preflight = JSON.parse(await readFile(new URL('../data/content-intake-pilot-india-programs-05-preflight.json', import.meta.url), 'utf8'));
const assist = JSON.parse(await readFile(new URL('../data/content-review-assist.json', import.meta.url), 'utf8'));
const policy = JSON.parse(await readFile(new URL('../data/autonomous-content-policy.json', import.meta.url), 'utf8'));

test('India national-program pilot 05 has 25 concepts, 5 sources and 25 questions', () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.concepts.length, 25);
  assert.equal(manifest.sources.length, 5);
  assert.equal(manifest.questions.length, 25);
  const counts = new Map();
  for (const q of manifest.questions) {
    assert.equal(q.sourceIds.length, 1);
    counts.set(q.sourceIds[0], (counts.get(q.sourceIds[0]) || 0) + 1);
  }
  assert.deepEqual([...counts.values()].sort((a,b)=>a-b), [5,5,5,5,5]);
});

test('pilot 05 enters review without fabricated production or exam authority', () => {
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
    assert.ok(q.options.some(o=>o.optionId===q.answerOptionId));
    assert.equal(q.conceptLinks.filter(link=>link.role==='primary').length,1);
  }
});

test('pilot 05 IDs, concept IDs and normalized stems are unique', () => {
  assert.equal(new Set(manifest.questions.map(q=>q.questionId)).size,25);
  assert.equal(new Set(manifest.questions.map(q=>q.questionVersionId)).size,25);
  assert.equal(new Set(manifest.questions.map(q=>q.stem.trim().toLowerCase())).size,25);
  assert.equal(new Set(manifest.concepts.map(c=>c.conceptId)).size,25);
});

test('live preflight passes and both lexical-overlap contrasts are explicitly retained', () => {
  assert.equal(preflight.validation.valid,true);
  assert.equal(preflight.validation.questionCount,25);
  assert.equal(preflight.overlap.blocking,false);
  assert.equal(preflight.overlap.flagCount,2);
  assert.ok(preflight.overlap.flags.every(flag=>flag.disposition==='retain_distinct'));
  assert.equal(preflight.contentMix.examBlueprintFidelity,false);
  assert.match(preflight.contentMix.prioritizationEvidence,/heuristic/i);
});

test('review assist covers pilot 05 while remaining non-authoritative', () => {
  const covered=new Map(assist.questions.map(item=>[item.questionVersionId,item]));
  for(const q of manifest.questions){
    const item=covered.get(q.questionVersionId);
    assert.ok(item,'missing assist for '+q.questionVersionId);
    assert.equal(item.medical.result,'supported');
    assert.equal(item.medical.uncertainty,'low');
    assert.equal(item.references.result,'direct_support');
    assert.equal(item.rights.result,'citation_only_recommended');
    assert.equal('decision' in item,false);
    assert.equal('approved' in item,false);
    assert.equal('reviewerId' in item,false);
  }
  assert.ok(assist.scope.batchKeys.includes('pilot:india-national-programs:20260928:05'));
  assert.equal(assist.scope.questionCount,80);
  assert.equal(assist.authority,'none');
  assert.equal(assist.policy.mayPublishContent,false);
});

test('autonomous policy keeps the 25-question floor and internal-test-only AI review', () => {
  assert.equal(policy.batchSizing.minimumQuestions,25);
  assert.ok(policy.targetExams.includes('neet-pg'));
  assert.ok(policy.targetExams.includes('ini-cet'));
  assert.match(policy.examValueUncertainty.rule,/heuristic/i);
  assert.equal(policy.aiReviewAuthority.scope,'internal_testing_only');
  assert.equal(policy.aiReviewAuthority.productionPublicationAuthority,false);
});
