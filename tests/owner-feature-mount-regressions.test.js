import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = (await readFile(new URL('../web/owner-v3-console.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
const settle = () => new Promise(resolve => setImmediate(resolve));
function open({ unavailable = false, deferred = false } = {}) {
  let current, failing = unavailable;
  const handlers = {}, pending = [];
  const makeRoot = () => {
    const children = [], ai = { before: node => children.push(node) }, infra = { append: node => children.push(node) };
    return { children, ai, infra, querySelector(key) { return key === '#owner-ai' ? ai : key === '#owner-infrastructure' ? infra : children.find(node => '#' + node.id === key) || null; } };
  };
  current = makeRoot();
  const nav = { children: [], querySelector() { return this.children[0] || null; }, append(node) { this.children.push(node); } };
  const app = { querySelector(key) { return key === '#owner-console' ? current : key === '.sidebar nav' ? nav : current.querySelector(key); }, addEventListener(type, fn) { handlers[type] = fn; } };
  const response = (label = '') => ({ ok: !failing, status: failing ? 503 : 200, json: async () => ({ flags: label ? [{ featureKey: label }] : [], alerts: [] }) });
  const context = vm.createContext({ document: { querySelector: () => app, createElement: () => ({ dataset: {} }) }, createSupabaseAuth: () => ({ getSession: async () => ({ accessToken: 'synthetic' }) }), cloudConfig: { projectUrl: 'https://example.invalid', publishableKey: 'synthetic' }, fetch: () => deferred ? new Promise(resolve => pending.push(label => resolve(response(label)))) : Promise.resolve(response()), errorMonitor: { capture() {} }, MutationObserver: class { observe() {} }, queueMicrotask, console, CustomEvent: class {}, window: { dispatchEvent() {} } });
  vm.runInContext(source, context);
  return { context, current: () => current, replace() { current = makeRoot(); }, retry() { failing = false; handlers.click?.({ target: { closest: () => ({}) } }); }, pending };
}
test('overlapping owner mount triggers never create duplicate Feature Gates or alert IDs', async () => {
  const h = open(); vm.runInContext('mount()', h.context); await settle();
  assert.equal(h.current().children.filter(node => node.id === 'owner-features').length, 1);
  assert.equal(h.current().children.filter(node => node.id === 'owner-infrastructure-alerts').length, 1);
});
test('Feature Gates and alerts return after the Admin root is rerendered', async () => {
  const h = open(); await settle(); h.replace(); vm.runInContext('mount()', h.context); await settle();
  assert.equal(h.current().children.filter(node => node.id === 'owner-features').length, 1);
  assert.equal(h.current().children.filter(node => node.id === 'owner-infrastructure-alerts').length, 1);
});
test('unavailable Feature Gates keep an honest anchored error and a duplicate-free retry', async () => {
  const h = open({ unavailable: true }); await settle();
  assert.match(h.current().querySelector('#owner-features')?.innerHTML || '', /Feature gates unavailable/);
  h.retry(); await settle();
  assert.equal(h.current().children.filter(node => node.id === 'owner-features').length, 1);
  assert.match(h.current().querySelector('#owner-features').innerHTML, /Controlled beta exposure/);
});
test('a stale feature response never attaches its controls to a replacement Admin root', async () => {
  const h = open({ deferred: true }); await settle();
  const old = h.pending.splice(0); h.replace(); vm.runInContext('mount()', h.context); await settle();
  old.forEach(resolve => resolve('stale-root')); await settle();
  assert.doesNotMatch(h.current().querySelector('#owner-features')?.innerHTML || '', /stale-root/);
  h.pending.splice(0).forEach(resolve => resolve('current-root')); await settle();
  assert.match(h.current().querySelector('#owner-features').innerHTML, /current-root/);
  assert.equal(h.current().children.filter(node => node.id === 'owner-features').length, 1);
});
