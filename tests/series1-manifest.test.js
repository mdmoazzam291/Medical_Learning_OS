import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSeries1Batch, series1Question, repairText, stripExamTags, orderBySubject } from '../src/domain/series1-manifest.js';
import { validateImport } from '../src/domain/content-library.js';

const repairs = JSON.parse(readFileSync(new URL('../data/series1/text-repairs.json', import.meta.url), 'utf8')).repairs;
const concept = (conceptId, label, subjects = ['anatomy']) => ({ conceptId, label, aliases: [], classification: { subjects, systems: ['cardiovascular'], organs: ['heart'], domains: ['structure'], tasks: ['mechanism'] } });
const concepts = { 'C-1': concept('C-1', 'Coronary circulation'), 'C-2': concept('C-2', 'Hypertension', ['medicine']) };
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const row = (n, over = {}) => ({ rowId: uuid(n), subjectId: n % 2 ? 'anatomy' : 'medicine', choiceType: 'single', conceptId: n % 2 ? 'C-1' : 'C-2', decision: 'corrected',
  payload: { question: `Invented stem ${n} about the aery: March 2009`, opa: `alpha ${n}`, opb: `beta ${n}`, opc: `gamma ${n}`, opd: `delta ${n}`, cop: '2', exp: `Invented explanation ${n} long enough to keep.` }, ...over });
const reviewRow = (n, over = {}) => ({ rowSuffix: uuid(n).slice(-8), subjectId: 'anatomy', conceptLabel: 'x', fit: 'exact', ...over });

test('repairs restore words missing "rt" and never touch abbreviations or real words', () => {
  assert.deepEqual(repairText('Aery, aoa and impoant hypeension', repairs), { text: 'Artery, aorta and important hypertension', count: 4 });
  assert.equal(repairText('PAS stain, PA view, ABO group, SpO2, aerial hyphae, hyperopia, STA', repairs).count, 0);
  for (const [bad, good] of Object.entries(repairs)) {
    assert.ok(bad.length > 2 && !bad.includes('rt') && good.includes('rt'), bad);
    assert.ok(!['pa', 'pas', 'po', 'pos', 'sta', 'apa', 'abo', 'aerial', 'hyperopia', 'disto', 'robe', 'main', 'was', 'way', 'so', 'to', 'like'].includes(bad), bad);
  }
});

test('exam tags are removed from the end of a stem; clinical "repeated" is kept', () => {
  assert.deepEqual(stripExamTags('Diagnosis is: March 2009'), { text: 'Diagnosis is:', removed: 1, leftover: false });
  assert.equal(stripExamTags('Seen in: Sept. 2005, AIIMS 2010').text, 'Seen in:');
  assert.equal(stripExamTags('Supplied by median nerve REPEATED').text, 'Supplied by median nerve');
  assert.equal(stripExamTags('Given (AIPGME 2010)').text, 'Given');
  assert.deepEqual(stripExamTags('CECT is repeated after 2 months'), { text: 'CECT is repeated after 2 months', removed: 0, leftover: false });
  assert.equal(stripExamTags('Asked in AIIMS 2010 about the drug').leftover, true);
});

test('rows are held back for every unsafe condition', () => {
  const ok = reviewRow(1);
  assert.ok(series1Question(row(1), ok, repairs).question);
  assert.equal(series1Question(row(1, { choiceType: 'multi' }), ok, repairs).heldBack, 'not-single-answer');
  assert.equal(series1Question(row(1), undefined, repairs).heldBack, 'not-reviewed');
  assert.equal(series1Question(row(1), reviewRow(1, { fit: 'none' }), repairs).heldBack, 'no-concept');
  assert.equal(series1Question(row(1, { decision: 'rejected' }), ok, repairs).heldBack, 'no-concept');
  for (const flag of ['key-suspect', 'defect', 'no-explanation']) assert.equal(series1Question(row(1), reviewRow(1, { flags: [flag] }), repairs).heldBack, flag);
  const p = row(1).payload;
  assert.equal(series1Question(row(1, { payload: { ...p, opb: 'Alpha 1 ' } }), ok, repairs).heldBack, 'duplicate-options');
  assert.equal(series1Question(row(1, { payload: { ...p, opd: ' ' } }), ok, repairs).heldBack, 'option-empty');
  assert.equal(series1Question(row(1, { payload: { ...p, cop: '4' } }), ok, repairs).heldBack, 'answer-key-invalid');
  assert.equal(series1Question(row(1, { payload: { ...p, exp: 'Ans a' } }), ok, repairs).heldBack, 'no-explanation');
  assert.equal(series1Question(row(1, { payload: { ...p, question: 'Asked in AIIMS 2010 about x' } }), ok, repairs).heldBack, 'stem-tag-unresolved');
});

test('a batch is a valid Admin-preview manifest in the Series 1 collection, options in a–d order', () => {
  const rows = Array.from({ length: 6 }, (_, i) => row(i + 1));
  const { manifest, summary } = buildSeries1Batch({ rows, review: { rows: rows.map((r, i) => reviewRow(i + 1)) }, concepts, repairs, batchId: 'pilot-300', batchNumber: 1, size: 4 });
  validateImport(manifest);
  assert.equal(manifest.importId, 'medretica-qbank-s1-pilot-300-b01');
  assert.equal(manifest.questions.length, 4);
  assert.equal(summary.eligible, 6); assert.equal(summary.batches, 2); assert.equal(summary.included, 4);
  const q = manifest.questions[0];
  assert.match(q.stem, /about the artery:$/);
  assert.deepEqual(q.options.map(o => o.optionId), ['a', 'b', 'c', 'd']);
  assert.equal(q.answerOptionId, 'c');
  assert.deepEqual(q.origins, [{ kind: 'platform', platformId: 'medretica-qbank-s1', edition: 'Series 1', evidence: `Series 1 item ${q.questionId.split(':')[1]}` }]);
  assert.deepEqual(q.conceptLinks, [{ conceptId: q.conceptLinks[0].conceptId, role: 'primary' }]);
  assert.equal(manifest.sources.length, 1);
  assert.equal(manifest.sources[0].title, 'Medretica QBank · Series 1');
  assert.equal(manifest.sources[0].url, null);
  assert.equal(manifest.sources[0].version, 'Series 1');
  assert.match(manifest.sources[0].evidence, /MedMCQA .*Apache-2\.0/);
  assert.deepEqual(manifest.concepts.map(c => c.conceptId), ['C-1', 'C-2']);
  assert.equal(summary.repairs, 4); assert.equal(summary.tagsRemoved, 4);
  const second = buildSeries1Batch({ rows, review: { rows: rows.map((r, i) => reviewRow(i + 1)) }, concepts, repairs, batchId: 'pilot-300', batchNumber: 2, size: 4 });
  assert.equal(second.manifest.questions.length, 2);
  assert.equal(new Set([...manifest.questions, ...second.manifest.questions].map(x => x.questionId)).size, 6);
  assert.equal(buildSeries1Batch({ rows, review: { rows: [] }, concepts, repairs, batchId: 'pilot-300', batchNumber: 1 }).manifest, null);
});

test('misfiled questions take their concept subject; others keep their own subject', () => {
  const rows = [row(1), row(3)];
  const { manifest } = buildSeries1Batch({ rows, review: { rows: [reviewRow(1), reviewRow(3, { flags: ['misfiled-subject'] })] }, concepts: { ...concepts, 'C-1': concept('C-1', 'Coronary circulation', ['physiology']) }, repairs, batchId: 'pilot-300', batchNumber: 1 });
  assert.deepEqual(manifest.questions.map(q => q.classification.subjects), [['anatomy'], ['physiology']]);
});

test('batches interleave subjects in a fixed order', () => {
  const items = [['b', '2'], ['a', '1'], ['a', '3'], ['b', '1'], ['c', '9']].map(([subjectId, rowId]) => ({ subjectId, rowId }));
  assert.deepEqual(orderBySubject(items).map(x => x.subjectId + x.rowId), ['a1', 'b1', 'c9', 'a3', 'b2']);
});

test('the staging workflow is manual, main-only, dry-run by default, and never prints content', () => {
  const wf = readFileSync(new URL('../.github/workflows/stage-series1-batch.yml', import.meta.url), 'utf8');
  assert.match(wf, /^on:\n  workflow_dispatch:/m);
  assert.match(wf, /test "\$\{\{ github\.ref \}\}" = "refs\/heads\/main"/);
  assert.match(wf, /default: 'dry-run'/);
  assert.match(wf, /if: inputs\.stage == 'stage'/);
  assert.match(wf, /content_library_stage_v1\(j, null\)/);
  assert.doesNotMatch(wf, /review_publish|widen/);
  assert.doesNotMatch(wf, /cat "\$RUNNER_TEMP\/(rows|manifest|concepts)/);
  const script = readFileSync(new URL('../scripts/build-series1-batch.js', import.meta.url), 'utf8');
  assert.equal((script.match(/console\.(log|error)\(/g) || []).length, 3);
  assert.match(script, /console\.log\(JSON\.stringify\(\{ \.\.\.summary, importId: manifest\?\.importId \?\? null \}\)\)/);
});
