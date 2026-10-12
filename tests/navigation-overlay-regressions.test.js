import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as nav from '../src/domain/app-navigation.js';
import { navigationMarkup, flyoutMarkup } from '../web/navigation-view.js';
import { mutatePreference } from '../web/navigation-preferences.js';
const source = (await readFile(new URL('../web/navigation.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
function open({ ready = true } = {}) {
  const shellHandlers = {}, docHandlers = {}, windowHandlers = {}, classes = new Set(), targets = {};
  const input = { value: '', focus() {} }, flyout = { hidden: true };
  const shell = { innerHTML: '', classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x) }, addEventListener(type, fn) { shellHandlers[type] = fn; }, querySelector(key) { return key === '#mlos-flyout' ? flyout : input; }, querySelectorAll: () => [] };
  const body = { dataset: {}, prepend() {}, classList: { add() {} } };
  const context = vm.createContext({ ...nav, URL, URLSearchParams, CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }, navigationMarkup, flyoutMarkup, mutatePreference, preferenceStore: () => nav.preferenceStore(() => { throw Error('blocked'); }), resolvePinnedAccess: async () => false, innerWidth: 620, location: { pathname: '/web/library.html', search: '?view=notes', hash: '' }, document: { body, activeElement: null, documentElement: { dataset: {} }, createElement: () => shell, querySelector: () => ready ? {} : null, addEventListener(type, fn) { docHandlers[type] = fn; } }, window: { addEventListener(type, fn) { windowHandlers[type] = fn; }, dispatchEvent(event) { windowHandlers[event.type]?.(event); } } });
  vm.runInContext(source, context);
  context.document.getElementById = id => targets[id] || null;
  return { body, shell, classes, shellHandlers, docHandlers, input, targets, location: context.location, windowHandlers, outside() { docHandlers.click({ target: { closest: () => null } }); } };
}
test('a narrow expanded panel can be dismissed by tapping outside it', () => {
  const h = open(); const button = { dataset: {}, hasAttribute: name => name === 'data-rail' };
  h.shellHandlers.click({ target: { closest: () => button } });
  assert.equal(h.body.dataset.rail, 'expanded'); h.outside(); assert.equal(h.body.dataset.rail, 'collapsed');
});
test('a compact search overlay closes on an outside tap without submitting a search', () => {
  const h = open(); let prevented = false;
  h.shellHandlers.submit({ target: { matches: () => true }, preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(h.classes.has('mlos-search-open'), true);
  h.outside(); assert.equal(h.classes.has('mlos-search-open'), false);
});

test('route restoration refreshes search while appearance changes keep an unsent draft', () => {
  const h = open(); h.input.value = 'Unsent draft';
  const button = { dataset: {}, hasAttribute: name => name === 'data-theme' };
  h.shellHandlers.click({ target: { closest: () => button } });
  assert.equal(h.input.value, 'Unsent draft');
  h.location.search = '?view=questions&search=Restored'; h.windowHandlers.popstate();
  assert.equal(h.input.value, 'Restored');
  h.location.pathname = '/web/account.html'; h.location.hash = '#research'; h.windowHandlers.hashchange();
  assert.equal(h.input.value, 'Restored');
});

test('a shell action remains inside navigation after its original target is detached during bubbling', () => {
  const h = open(), button = { dataset: {}, hasAttribute: name => name === 'data-rail' };
  const target = { closest: selector => selector === 'button' ? button : null };
  const event = { target, composedPath: () => [target, h.shell] };
  h.shellHandlers.click(event);
  assert.equal(h.body.dataset.rail, 'expanded');
  h.docHandlers.click(event);
  assert.equal(h.body.dataset.rail, 'expanded');
});

test('outside touch dismisses compact search on pointerdown without depending on a compatibility click', () => {
  const h = open();
  h.shellHandlers.submit({ target: { matches: () => true }, preventDefault() {} });
  assert.equal(h.classes.has('mlos-search-open'), true);
  h.docHandlers.pointerdown?.({ target: { closest: () => null }, pointerType: 'touch', composedPath: () => [] });
  assert.equal(h.classes.has('mlos-search-open'), false);
});

test('the hosted clean Library path intercepts a shared representation menu action', () => {
  const h = open(); h.location.pathname = '/web/library';
  let prevented = false, selectedView = null;
  h.windowHandlers['mlos:library-view'] = event => { selectedView = event.detail.view; };
  const anchor = { href: 'https://example.invalid/web/library.html?view=graph' };
  h.shellHandlers.click({ target: { closest: selector => selector === 'a' ? anchor : null }, preventDefault() { prevented = true; } });
  assert.equal(prevented, true); assert.equal(selectedView, 'graph');
});

test('an unavailable Library keeps normal link navigation instead of swallowing a view action', () => {
  const h = open({ ready: false }); h.location.pathname = '/web/library';
  let prevented = false, dispatched = false;
  h.windowHandlers['mlos:library-view'] = () => { dispatched = true; };
  const anchor = { href: 'https://example.invalid/web/library.html?view=graph' };
  h.shellHandlers.click({ target: { closest: selector => selector === 'a' ? anchor : null }, preventDefault() { prevented = true; } });
  assert.equal(prevented, false); assert.equal(dispatched, false);
});
test('an Admin deep link scrolls to its asynchronously mounted section once per target', () => {
  const h = open(); let scrolls = 0;
  h.location.pathname = '/web/admin'; h.location.hash = '#owner-users';
  h.windowHandlers['mlos:access']({ detail: { isAdmin: true } }); h.windowHandlers.hashchange();
  h.targets['owner-users'] = { closest: () => ({}), scrollIntoView() { scrolls++; } };
  h.windowHandlers['mlos:admin-ready']?.(); h.windowHandlers['mlos:admin-ready']?.();
  assert.equal(scrolls, 1);
  h.targets['owner-users'] = { closest: () => ({}), scrollIntoView() { scrolls++; } };
  h.windowHandlers['mlos:admin-ready']?.(); assert.equal(scrolls, 2);
  h.windowHandlers['mlos:access']({ detail: { isAdmin: false } });
  h.windowHandlers['mlos:admin-ready']?.(); assert.equal(scrolls, 2);
});
test('an Admin fragment restores its position after asynchronous feature layout changes', () => {
  const h = open(); let scrolls = 0;
  h.location.pathname = '/web/admin'; h.location.hash = '#owner-infrastructure';
  h.targets['owner-infrastructure'] = { closest: () => ({}), scrollIntoView: () => { scrolls++; } };
  h.windowHandlers['mlos:access']({ detail: { isAdmin: true } });
  h.windowHandlers['mlos:admin-ready']({ detail: { layoutChanged: true } });
  assert.equal(scrolls, 2);
});
