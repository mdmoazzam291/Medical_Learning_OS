import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { evaluateAccessibility, validateBaseline } from '../scripts/accessibility-gate.js';

const empty = { version: 1, entries: [] };
const violation = (id, impact) => ({ id, impact, help: `${id} help`, helpUrl: 'https://example.test', nodes: [{ target: ['#a'] }, { target: ['.b'] }] });

test('serious and critical violations fail; moderate and minor are advisory', () => {
  const outcome = evaluateAccessibility([
    { page: '/', viewport: 'phone', violations: [violation('color-contrast', 'serious'), violation('region', 'moderate')] },
    { page: '/web/exam.html', viewport: 'desktop', violations: [violation('button-name', 'critical'), violation('x', 'minor')] }
  ], empty);
  assert.equal(outcome.passed, false);
  assert.deepEqual(outcome.failures.map(row => row.rule), ['color-contrast', 'button-name']);
  assert.deepEqual(outcome.advisories.map(row => row.rule), ['region', 'x']);
  assert.equal(outcome.failures[0].nodes, 2);
  assert.deepEqual(outcome.failures[0].targets, ['#a', '.b']);
});

test('reviewed baseline entries become known debt only for the exact page and rule', () => {
  const baseline = { version: 1, entries: [{ page: '/', rule: 'color-contrast', reason: 'brand palette fix scheduled' }] };
  const outcome = evaluateAccessibility([
    { page: '/', viewport: 'phone', violations: [violation('color-contrast', 'serious')] },
    { page: '/web/plans.html', viewport: 'phone', violations: [violation('color-contrast', 'serious')] }
  ], baseline);
  assert.equal(outcome.passed, false);
  assert.equal(outcome.knownDebt.length, 1);
  assert.equal(outcome.failures[0].page, '/web/plans.html');
  assert.deepEqual(outcome.staleBaseline, []);
});

test('fixed baseline entries are reported as stale without failing', () => {
  const baseline = { version: 1, entries: [{ page: '/', rule: 'label', reason: 'old form' }] };
  const outcome = evaluateAccessibility([{ page: '/', viewport: 'desktop', violations: [] }], baseline);
  assert.equal(outcome.passed, true);
  assert.deepEqual(outcome.staleBaseline, [{ page: '/', rule: 'label' }]);
});

test('custom blocking impacts are honoured', () => {
  const outcome = evaluateAccessibility(
    [{ page: '/', viewport: 'phone', violations: [violation('region', 'moderate')] }], empty, ['critical', 'serious', 'moderate']);
  assert.equal(outcome.passed, false);
});

test('baseline entries require page, rule and reason and must be unique', () => {
  assert.throws(() => validateBaseline({ version: 1, entries: [{ page: '/', rule: 'label' }] }), /reason/);
  assert.throws(() => validateBaseline({ version: 2, entries: [] }), /version/);
  const duplicate = { page: '/', rule: 'label', reason: 'r' };
  assert.throws(() => validateBaseline({ version: 1, entries: [duplicate, duplicate] }), /Duplicate/);
});

test('committed baseline is valid and every entry carries a reason', async () => {
  const committed = JSON.parse(await readFile(new URL('../ops/accessibility/baseline.json', import.meta.url), 'utf8'));
  assert.doesNotThrow(() => validateBaseline(committed));
});
