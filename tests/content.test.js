import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCatalog, appendQuestionVersion, submitForReview, recordReview,
  publishQuestion, retireQuestion, selectPublishedQuestions, toLearnerQuestion } from '../src/domain/content.js';

const id = 'demo:concept-identity@1';
const fixture = () => JSON.parse(readFileSync(new URL('../data/content-draft.json', import.meta.url), 'utf8'));
// Test actors are synthetic. These reviews never modify or publish the checked-in fixture.
const review = kind => ({ kind, reviewerId: `test-only-${kind}`, reviewedAt: '2026-09-25T00:00:00.000Z', decision: 'approved', notes: 'Synthetic test evidence, not medical review' });
const verify = (catalog = fixture(), target = id) => ['medical', 'references', 'rights'].reduce(
  (c, kind) => recordReview(c, target, review(kind)), submitForReview(catalog, target));
const publish = () => publishQuestion(verify(), id, '2026-09-25T01:00:00.000Z');
const revised = () => ({ ...fixture().questions[0], questionVersionId: 'demo:concept-identity@2', version: 2, supersedes: id, changeReason: 'Improve wording', stem: 'Revised demonstration question' });

test('checked-in fixture is draft, original, and deeply immutable after validation', () => {
  const input = fixture();
  const result = validateCatalog(input);
  assert.equal(selectPublishedQuestions(result).length, 0);
  assert.equal(result.questions[0].provenance.kind, 'original');
  input.questions[0].options[0].text = 'changed';
  assert.notEqual(result.questions[0].options[0].text, 'changed');
  assert.throws(() => { result.questions[0].options[0].text = 'changed'; }, TypeError);
});
test('unknown concepts, sources, duplicate options and invalid answers are rejected', () => {
  for (const change of [
    c => { c.questions[0].conceptLinks[0].conceptId = 'missing'; },
    c => { c.questions[0].sourceIds = ['missing']; },
    c => { c.questions[0].sourceIds = []; },
    c => { c.questions[0].options[1].optionId = 'same-id'; },
    c => { c.questions[0].answerOptionId = 'missing'; },
    c => { c.questions[0].conceptLinks = []; },
    c => { c.questions[0].conceptLinks.push({ ...c.questions[0].conceptLinks[0] }); },
    c => { c.concepts.push({ ...c.concepts[0] }); },
    c => { c.sources[0].url = 'javascript:bad'; },
  ]) {
    const c = fixture(); change(c); assert.throws(() => validateCatalog(c), TypeError);
  }
});
test('original and generated questions cannot masquerade as PYQs', () => {
  const c = fixture(); c.questions[0].provenance.exam = 'NEET-PG';
  assert.throws(() => validateCatalog(c), /PYQ/);
  c.questions[0].provenance.kind = 'recalled_pyq';
  assert.throws(() => validateCatalog(c), /year/);
  c.questions[0].provenance.year = 2025;
  assert.equal(validateCatalog(c).questions[0].provenance.kind, 'recalled_pyq');
});
test('drafts and partially reviewed content cannot publish', () => {
  assert.throws(() => publishQuestion(fixture(), id, '2026-09-25T01:00:00.000Z'), /verified/);
  const c = recordReview(submitForReview(fixture(), id), id, review('medical'));
  assert.equal(selectPublishedQuestions(c).length, 0);
  assert.throws(() => publishQuestion(c, id, '2026-09-25T01:00:00.000Z'), /verified/);
});
test('self-review, duplicate decisions and rejection cannot pass the gates', () => {
  const c = submitForReview(fixture(), id);
  assert.throws(() => recordReview(c, id, { ...review('medical'), reviewerId: 'fixture-author' }), /own content/);
  const rejected = recordReview(c, id, { ...review('medical'), decision: 'rejected' });
  assert.throws(() => recordReview(rejected, id, review('medical')), /Duplicate/);
  assert.throws(() => publishQuestion(rejected, id, '2026-09-25T01:00:00.000Z'), /verified/);
});
test('publication requires cleared source rights and valid chronology', () => {
  const c = fixture(); c.sources[0].rights.status = 'unknown';
  assert.throws(() => publishQuestion(verify(c), id, '2026-09-25T01:00:00.000Z'), /rights/);
  assert.throws(() => publishQuestion(verify(), id, '2026-09-24T01:00:00.000Z'), /chronology/);
  assert.throws(() => publishQuestion(verify(), id, null), /timestamp/);
});
test('published learner payload excludes solutions and provenance', () => {
  const q = selectPublishedQuestions(publish())[0];
  assert.deepEqual(Object.keys(toLearnerQuestion(q)).sort(), ['options', 'questionVersionId', 'stem']);
  assert.throws(() => toLearnerQuestion(fixture().questions[0]), /published/);
});
test('revisions retain previous content and require fresh review before replacement', () => {
  const original = publish();
  const withDraft = appendQuestionVersion(original, revised());
  assert.equal(selectPublishedQuestions(withDraft)[0].questionVersionId, id);
  assert.equal(withDraft.questions[1].reviews.length, 0);
  const next = publishQuestion(verify(withDraft, revised().questionVersionId), revised().questionVersionId, '2026-09-25T02:00:00.000Z');
  assert.equal(selectPublishedQuestions(next).length, 1);
  assert.equal(selectPublishedQuestions(next)[0].version, 2);
  assert.equal(next.questions[0].status, 'retired');
  assert.equal(next.questions[0].stem, original.questions[0].stem);
  assert.equal(original.questions[0].status, 'published');
});
test('version gaps, reused IDs and imported missing history are rejected', () => {
  const c = fixture();
  assert.throws(() => appendQuestionVersion(c, c.questions[0]), /sequential/);
  assert.throws(() => appendQuestionVersion(c, { ...revised(), version: 3 }), /sequential/);
  assert.throws(() => validateCatalog({ ...c, questions: [revised()] }), /earlier/);
});
test('retirement removes eligibility without losing history or resurfacing old content', () => {
  const c = retireQuestion(publish(), id);
  assert.equal(selectPublishedQuestions(c).length, 0);
  assert.equal(c.questions.length, 1);
  assert.throws(() => publishQuestion(c, id, '2026-09-25T03:00:00.000Z'), /verified/);
  assert.throws(() => submitForReview(c, id), /drafts/);
});
