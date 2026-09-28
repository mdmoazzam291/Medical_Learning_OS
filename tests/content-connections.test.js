import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectContentConnections } from '../src/domain/content-connections.js';
import { appendQuestionVersion, selectPublishedQuestions } from '../src/domain/content.js';

const read = name => JSON.parse(readFileSync(new URL('../data/' + name, import.meta.url), 'utf8'));
const notes = () => read('canonical-note-connected-learning-08.json').notes;
const pilot = () => read('content-intake-connected-learning-08.json');
const base = () => {
  const seed = read('medical-seed-anaphylaxis-review.json');
  const rabies = read('content-intake-pilot-rabies-01.json');
  return { schemaVersion: 1, ...Object.fromEntries(['concepts', 'sources', 'questions']
    .map(key => [key, [...seed[key], ...rabies[key], ...pilot()[key]]])) };
};
const row = (report, suffix) => report.concepts.find(c => c.conceptId.endsWith(suffix));

test('connected pilot reuses canonical concepts and keeps alternate identities distinct', () => {
  assert.equal(pilot().concepts.length, 0);
  const catalog = base();
  const report = projectContentConnections(catalog, notes());
  assert.equal(catalog.concepts.length, 6);
  assert.equal(catalog.questions.length, 8);
  assert.equal(row(report, 'first-line-treatment').primaryQuestionIds.length, 2);
  assert.equal(row(report, 'pep-wound-washing').primaryQuestionIds.length, 2);
  assert.equal(row(report, 'category-iii-rig').primaryQuestionIds.length, 1);
  assert.equal(selectPublishedQuestions(catalog).length, 0);
  for (const q of pilot().questions) {
    assert.equal(q.status, 'in_review');
    assert.deepEqual(q.reviews, []);
    assert.equal(q.publishedAt, null);
    assert.equal(q.provenance.kind, 'ai_generated');
    assert.equal(q.provenance.exam, null);
    assert.equal(q.provenance.year, null);
  }
});

test('one note supports multiple assessed questions; secondary connections do not inflate assessment', () => {
  const report = projectContentConnections(base(), notes());
  const washing = row(report, 'pep-wound-washing');
  const rig = row(report, 'category-iii-rig');
  assert.equal(washing.noteKeys.length, 1);
  assert.equal(washing.primaryQuestionIds.length, 2);
  assert.equal(rig.noteKeys.length, 1);
  assert.equal(rig.primaryQuestionIds.length, 1);
  assert.equal(rig.questionLinks.length, 2);
  assert.deepEqual(rig.questionLinks.find(q => q.questionVersionId.includes('washing-before-referral')).roles, ['secondary']);
  assert.ok(report.concepts.every(c => c.publishedAlternatePairs === 0));
  assert.equal(report.publicationAuthority, false);
  assert.equal(report.transferValidityEstablished, false);
  assert.equal(report.learnerEvidenceCreated, false);
});

test('subject views support all 19 subjects without copying concepts or forcing clinical tags', () => {
  const catalog = base();
  const tags = Array.from({ length: 19 }, (_, i) => 'synthetic-subject-' + (i + 1));
  catalog.concepts[0].subjectTags = tags;
  const report = projectContentConnections(catalog, notes());
  assert.deepEqual(report.concepts[0].subjectTags, tags);
  assert.equal(report.concepts.length, catalog.concepts.length);
  assert.equal(report.concepts[0].primaryQuestionIds.length, 2);
  // This is a topology test, not a claim that anaphylaxis spans every subject.
  assert.deepEqual(base().concepts[0].subjectTags, ['emergency-medicine', 'pharmacology', 'immunology']);
});

test('note-only concepts and multiple note drafts remain valid without invented questions', () => {
  const catalog = base();
  catalog.questions = [];
  const drafts = notes();
  drafts.push({ ...drafts[0], noteKey: 'synthetic:second-note' });
  const report = projectContentConnections(catalog, drafts);
  assert.equal(row(report, 'pep-wound-washing').noteKeys.length, 2);
  assert.equal(row(report, 'pep-wound-washing').primaryQuestionIds.length, 0);
});

test('question revisions never create a new alternate identity', () => {
  let catalog = base();
  const original = catalog.questions[0];
  catalog = appendQuestionVersion(catalog, {
    ...original, questionVersionId: original.questionId + '@2', version: 2,
    supersedes: original.questionVersionId, status: 'draft', changeReason: 'Synthetic revision test'
  });
  const report = projectContentConnections(catalog, notes());
  assert.equal(row(report, 'first-line-treatment').primaryQuestionIds.length, 2);
  assert.equal(row(report, 'first-line-treatment').questionLinks.length, 3);
});

test('only published primary identities form structural pairs, not pending or secondary links', () => {
  const catalog = base();
  // Synthetic approvals exist in memory only; never imported or submitted to production.
  for (const q of catalog.questions.filter(q => q.questionId.startsWith('emergency:anaphylaxis:'))) {
    q.status = 'published';
    q.reviews = ['medical', 'references', 'rights'].map(kind => ({
      kind, reviewerId: 'synthetic-reviewer', reviewedAt: '2026-01-01T00:00:00.000Z',
      decision: 'approved', notes: 'Synthetic software test only'
    }));
    q.publishedAt = '2026-01-02T00:00:00.000Z';
  }
  catalog.sources[0].rights = { status: 'owned', evidence: 'Synthetic fixture only' };
  const report = projectContentConnections(catalog, notes());
  assert.equal(row(report, 'first-line-treatment').publishedAlternatePairs, 1);
  assert.equal(row(report, 'pep-wound-washing').publishedAlternatePairs, 0);
  assert.equal(row(report, 'category-iii-rig').publishedAlternatePairs, 0);
  assert.equal(report.transferValidityEstablished, false);
});

test('draft note linking fails closed for unknown concepts, sources and invalid provenance', () => {
  for (const mutate of [
    n => { n[0].conceptId = 'unknown'; },
    n => { n[0].sourceIds = ['unknown']; },
    n => { n[0].sourceIds = []; },
    n => { n[0].sourceIds.push(n[0].sourceIds[0]); },
    n => { n[0].status = 'published'; },
    n => { n[0].bodyMarkdown = ''; },
    n => { n[0].provenance.kind = 'human_authored_original'; },
    n => { n.push(n[0]); }
  ]) {
    const invalid = notes(); mutate(invalid);
    assert.throws(() => projectContentConnections(base(), invalid), TypeError);
  }
});

test('projection does not mutate catalog or notes; retired items do not count', () => {
  const catalog = base(); const drafts = notes();
  catalog.questions[0].status = 'retired';
  const before = JSON.stringify({ catalog, drafts });
  const report = projectContentConnections(catalog, drafts);
  assert.equal(row(report, 'first-line-treatment').primaryQuestionIds.length, 1);
  report.concepts[0].subjectTags.push('mutation');
  assert.equal(JSON.stringify({ catalog, drafts }), before);
});

test('new WHO source is date-pinned with unresolved rights; notes remain review candidates', () => {
  const source = pilot().sources[0];
  assert.equal(source.sourceId, 'who:rabies-fact-sheet:2026-09-17');
  assert.equal(source.rights.status, 'unknown');
  for (const note of notes()) {
    assert.equal(note.status, 'draft');
    assert.equal(note.provenance.kind, 'ai_generated_original');
    assert.deepEqual(note.sourceIds, [source.sourceId]);
  }
});
