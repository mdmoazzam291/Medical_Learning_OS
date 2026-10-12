import test from 'node:test';
import assert from 'node:assert/strict';
import { intakeIntegrityReport } from '../src/domain/intake-integrity-report.js';
import { validateImport } from '../src/domain/content-library.js';

const facets = { subjects: ['medicine'], systems: [], organs: [], domains: [], tasks: ['diagnosis'] };
const concept = { conceptId: 'c1', label: 'Synthetic', aliases: [], subjectTags: ['medicine'], classification: facets };
const source = { sourceId: 's1', title: 'Synthetic source', url: null, version: 'v1', evidence: 'Unit test only' };
const pyq = (year, session='main') => ({ kind: 'pyq', examId: 'neet-pg', year, session, evidence: 'Uploader declaration only' });
const platform = platformId => ({ kind: 'platform', platformId, edition: 'v1', evidence: 'Uploader declaration only' });
const question = (questionId, origins) => ({
  questionId, stem: 'Synthetic next best step?',
  options: [{ optionId: 'a', text: 'Alpha' },{ optionId: 'b', text: 'Beta' }],
  answerOptionId: 'a', explanation: 'Synthetic test evidence only',
  conceptLinks: [{ conceptId: 'c1', role: 'primary' }],
  sourceIds: ['s1'], origins, classification: facets
});
function manifest(questions) {
  return { schemaVersion: 1, importId: 'test-intake', concepts: [concept], sources: [source], questions, notes: [], noteQuestionLinks: [] };
}

test('read-only intake summary preserves all declared PYQ occurrences and exactly one display home', () => {
  const m = validateImport(manifest([
    question('q1',[pyq(2025),pyq(2026),platform('prepladder'),platform('marrow')]),
    question('q2',[platform('dams'),platform('prepladder')]),
    question('q3',[])
  ]));
  const report = intakeIntegrityReport(m);
  assert.deepEqual(report.homes, {pyq: 1, platform: 1, original: 1});
  assert.equal(report.pyqOccurrences, 2);
  assert.equal(report.crossPlatformDeclared, 1);
  assert.equal(report.platformSourcesSuppressed, 3);
  assert.equal(report.duplicateFamilies.length, 1);
  assert.deepEqual(report.duplicateFamilies[0].questionIds, ['q1','q2','q3']);
  assert.equal(report.duplicateFamilies[0].answerConflict,false);
  assert.equal(report.scope, 'manifest_only_declared_unverified');
  assert.ok(!('verified' in report));
});

test('repeated occurrence declarations are visible but never promoted to verified exam evidence', () => {
  const report = intakeIntegrityReport(manifest([question('q1',[pyq(2025),pyq(2025)])]));
  assert.equal(report.repeatedPyqOccurrenceClaims, 1);
  assert.equal(report.pyqOccurrences, 2);
  assert.equal(report.duplicateFamilies.length, 0);
});

test('references outside manifest are unresolved until canonical server matching', () => {
  const m=manifest([question('q1',[])]);
  m.questions[0].conceptLinks=[{conceptId:'from-catalog',role:'primary'}];
  m.questions[0].sourceIds=['other-source'];
  const report=intakeIntegrityReport(m);
  assert.deepEqual(report.externallyReferencedSources,['other-source']);
  assert.deepEqual(report.externallyReferencedConcepts,['from-catalog']);
});

test('manifest-only diagnostics distinguish same stem+options from differing correct answers', () => {
  const a=manifest([question('q1',[]),{...question('q2',[]),answerOptionId:'b'}]);
  const r=intakeIntegrityReport(a);
  assert.equal(r.duplicateFamilies[0].answerConflict,true);
  assert.throws(()=>validateImport(a),/answer_conflict/);
});
