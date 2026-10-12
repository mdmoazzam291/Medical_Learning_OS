import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = (await readFile(new URL('../web/owner-v3-console.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
const settle = () => new Promise(resolve => setImmediate(resolve));
function open({ deferred = false, flagsFail = false } = {}) {
  let current;
  const pending = [], events = [];
  const makeRoot = () => {
    const children = [], ai = { before: node => children.push(node) }, infra = { after: node => children.push(node) };
    return { children, querySelector(key) { return key === '#owner-ai' ? ai : key === '#owner-infrastructure' ? infra : children.find(node => '#' + node.id === key) || null; } };
  };
  current = makeRoot();
  const app = { querySelector(key) { return key === '#owner-console' ? current : current.querySelector(key); }, addEventListener() {} };
  const context = vm.createContext({
    document: { querySelector: () => app, getElementById: () => null, createElement: () => { const states = {}; return { dataset: {}, innerHTML: '', querySelector(key) { return states[key] ||= { innerHTML: '' }; } }; } },
    createSupabaseAuth: () => ({ getSession: async () => ({ accessToken: 'synthetic' }) }), cloudConfig: { projectUrl: 'https://example.invalid', publishableKey: 'synthetic' },
    fetch: url => { const isFlags = url.endsWith('/feature-flags'); const response = label => ({ ok: !(flagsFail && isFlags), status: flagsFail && isFlags ? 503 : 200, json: async () => ({ flags: [{ featureKey: label }], alerts: [{ provider: label, state: 'open' }] }) }); return deferred ? new Promise(resolve => pending.push(label => resolve(response(label)))) : Promise.resolve(response('fixture')); },
    errorMonitor: { capture() {} }, MutationObserver: class { observe() {} }, queueMicrotask, console, location: { hash: '' }, requestAnimationFrame: fn => fn(),
    CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }, window: { dispatchEvent: event => events.push(event) }
  });
  vm.runInContext(source, context);
  return { context, current: () => current, replace() { current = makeRoot(); }, pending, events };
}
test('owner operations mounts once per root and remounts on replacement', async () => {
  const h = open(); vm.runInContext('mount()', h.context); await settle();
  assert.equal(h.current().children.length, 2);
  h.replace(); vm.runInContext('mount()', h.context); await settle();
  assert.equal(h.current().children.length, 2);
});
test('a failed feature read does not hide a successful alerts destination', async () => {
  const h = open({ flagsFail: true }); await settle();
  assert.match(h.current().querySelector('#owner-features').querySelector('#owner-features-state').innerHTML, /Feature gates unavailable/);
  assert.match(h.current().querySelector('#owner-infrastructure-alerts').querySelector('#owner-alerts-state').innerHTML, /fixture/);
});
test('a replaced owner root ignores stale alerts instead of overwriting the current Action Inbox', async () => {
  const h = open({ deferred: true }); await settle();
  const old = h.pending.splice(0); h.replace(); vm.runInContext('mount()', h.context); await settle();
  old.forEach(resolve => resolve('stale-root')); await settle();
  assert.equal(h.events.filter(event => event.type === 'mlos:owner-alerts').length, 0);
  h.pending.splice(0).forEach(resolve => resolve('current-root')); await settle();
  const alertEvents = h.events.filter(event => event.type === 'mlos:owner-alerts');
  assert.equal(alertEvents.length, 1);
  assert.equal(alertEvents[0].detail.alerts[0].provider, 'current-root');
});
