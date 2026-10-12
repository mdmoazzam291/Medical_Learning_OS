import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = (await readFile(new URL('../web/exam.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
async function open(address) {
  const calls = [], listeners = {};
  const location = new URL(address);
  const root = { innerHTML: '', addEventListener(type, callback) { listeners[type] = callback; }, querySelector() { return null; }, querySelectorAll() { return []; } };
  const cloud = { async examRun(id) { calls.push(['run', id]); return { runId: id, status: 'cancelled', termination: { reason: 'learner-requested' } }; }, async resumeExamRun() { calls.push(['resume']); return { run: null }; }, async examSimulatorReadiness() { return {}; }, async examSimulatorTestReadiness() { return {}; } };
  const context = vm.createContext({ URL, URLSearchParams, console, Date, Number, setTimeout, clearTimeout, setInterval, clearInterval, location, history: { replaceState(_state, _title, href) { const next = new URL(href, location); location.href = next.href; } }, window: { confirm() { return false; } }, document: { querySelector(selector) { return selector === '#exam-app' ? root : {}; }, addEventListener() {}, visibilityState: 'visible' }, createSupabaseAuth: () => ({ currentUser: () => ({ id: 'owner' }), getSession: async () => ({ user: { id: 'owner' } }) }), createCloudStudy: () => cloud, cloudConfig: {}, errorMonitor: { capture() {} } });
  vm.runInContext(source, context); await new Promise(resolve => setImmediate(resolve));
  return { calls, location, listeners, root };
}
test('a saved exam run remains the selected run after reload', async () => {
  const first = await open('https://example.invalid/web/exam.html?run=saved-run');
  assert.equal(first.location.searchParams.get('run'), 'saved-run');
  const second = await open(first.location.href);
  assert.deepEqual(second.calls, [['run', 'saved-run']]);
});
test('explicitly returning to the simulator clears the selected historical run', async () => {
  const page = await open('https://example.invalid/web/exam.html?run=saved-run');
  page.listeners.click({ preventDefault() {}, target: { closest() { return { dataset: { action: 'exam-home' } }; } } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.location.searchParams.has('run'), false);
});
