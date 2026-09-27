import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(
  new URL('../data/content-intake-pilot-acute-medicine-03.json', import.meta.url),
  'utf8'
));
const preflight = JSON.parse(await readFile(
  new URL('../data/content-intake-pilot-acute-medicine-03-preflight.json', import.meta.url),
  'utf8'
));
const assist = JSON.parse(await readFile(
  new URL('../data/content-review-assist.json', import.meta.url),
  'utf8'
));

test('acute medicine pilot 03 has 25 concepts, 5 sources and 25 questions', () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.concepts.length, 25);
  assert.equal(manifest.sources.length, 5);
  assert.equal(manifest.questions.length, 25);
});

test('each source package contributes exactly five questions', () => {
  const counts = new Map();
  for (const q of manifest.questions) {
    assert.equal(q.sourceIds.length, 1);
    counts.set(q.sourceIds[0], (counts.get(q.sourceIds[0]) || 0) + 1);
  }
  assert.deepEqual([...counts.values()].sort((a,b)=>a-b), [5,5,5,5,5]);
});

test('all questions enter review with no fabricated publication or exam authority', () => {
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

test('sources remain unresolved at intake and questions preserve guideline jurisdiction', () => {
  for (const source of manifest.sources) {
    assert.equal(source.rights.status, 'unknown');
    assert.match(source.rights.evidence, /factual grounding/i);
    assert.match(source.rights.evidence, /rights review/i);
  }
  const tags = new Set(manifest.concepts.flatMap(c => c.subjectTags));
  for (const tag of [
    'guideline-us-aha','guideline-global-sccm','guideline-global-gina',
    'guideline-global-gold','guideline-us-ada'
  ]) assert.ok(tags.has(tag));
});

test('stable identities and normalized stems are unique within batch', () => {
  assert.equal(new Set(manifest.questions.map(q=>q.questionId)).size,25);
  assert.equal(new Set(manifest.questions.map(q=>q.questionVersionId)).size,25);
  assert.equal(new Set(manifest.questions.map(q=>q.stem.trim().toLowerCase())).size,25);
  assert.equal(new Set(manifest.concepts.map(c=>c.conceptId)).size,25);
});

test('live preflight was valid and its only overlap flag is explicitly dispositioned', () => {
  assert.equal(preflight.validation.valid, true);
  assert.equal(preflight.validation.publicationAuthority, false);
  assert.equal(preflight.overlap.blocking, false);
  assert.equal(preflight.overlap.semanticDuplicateDetection, false);
  assert.equal(preflight.overlap.medicalQualityInference, false);
  assert.equal(preflight.overlap.flagCount, 1);
  assert.equal(preflight.overlap.flags[0].disposition, 'retain_distinct');
});

test('review assist covers every acute medicine pilot question without authority', () => {
  const covered=new Map(assist.questions.map(item=>[item.questionVersionId,item]));
  for(const q of manifest.questions){
    const item=covered.get(q.questionVersionId);
    assert.ok(item, 'missing assist for '+q.questionVersionId);
    for(const kind of ['medical','references','rights']){
      assert.ok(item[kind]?.result);
      assert.ok(item[kind]?.summary);
      assert.ok(item[kind]?.draftNote);
    }
    assert.equal('decision' in item,false);
    assert.equal('approved' in item,false);
    assert.equal('reviewerId' in item,false);
  }
  assert.ok(assist.scope.batchKeys.includes('pilot:acute-medicine:20260928:03'));
  assert.ok(assist.scope.questionCount >= 55);
  assert.equal(assist.authority,'none');
  assert.equal(assist.policy.mayPublishContent,false);
});
