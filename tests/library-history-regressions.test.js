import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { SUBJECTS } from '../src/domain/content-library.js';
import * as libraryDomain from '../src/domain/library-workspaces.js';
const source = (await readFile(new URL('../web/library.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
async function open(search = '?view=notes&subject=medicine&count=5') {
  const listeners = {}, events = {}, location = { pathname: '/web/library.html', search };
  const stack = [location.pathname + location.search];
  const root = { innerHTML: '', addEventListener(type, fn) { listeners[type] = fn; }, querySelector() { return { focus() {} }; } };
  const context = vm.createContext({ ...libraryDomain, SUBJECTS, URLSearchParams, location, console, e: text => String(text), request: async () => ({ concepts: [], notes: [], questions: [], links: [] }), setupLibraryWorkspaces: () => ({ decorate() {} }), document: { querySelector: () => root }, window: { addEventListener(type, fn) { events[type] = fn; }, dispatchEvent() {} }, CustomEvent: class {}, history: { replaceState(_a, _b, href) { stack[stack.length - 1] = href; location.search = new URL(href, 'https://example.invalid').search; }, pushState(_a, _b, href) { stack.push(href); location.search = new URL(href, 'https://example.invalid').search; } } });
  vm.runInContext(source, context); await new Promise(r => setImmediate(r));
  return { root, location, stack, events, change(target) { return listeners.change({ target: { hasAttribute: () => false, ...target } }); }, switch(view) { return listeners.click({ target: { closest: () => ({ dataset: { view }, hasAttribute: () => false }) } }); } };
}
test('switching a Library representation creates a usable Back destination', async () => {
  const h = await open(); await h.switch('graph');
  assert.equal(h.stack.length, 2);
  assert.match(h.stack[0], /view=notes/); assert.match(h.stack[1], /view=graph/);
});
test('Back restores the Library representation and filters from its URL', async () => {
  const h = await open(); await h.switch('graph');
  assert.equal(typeof h.events.popstate, 'function');
  h.location.search = '?view=notes&subject=medicine&count=5'; h.events.popstate();
  assert.match(h.root.innerHTML, /aria-selected="true" data-view="notes"/);
  assert.match(h.root.innerHTML, /Study these questions \(up to 5\)/);
});

test('Library tabs leave standalone mode filters behind while retaining the chosen subject and count', async () => {
  for (const [view, key, value] of [['references', 'reference', 'labs-diagnostics'], ['media', 'category', 'radiology'], ['subjects', 'module', 'gross-regional-anatomy']]) {
    const h = await open('?view=' + view + '&' + key + '=' + value + '&subject=medicine&count=5');
    await h.switch('notes');
    const params = new URLSearchParams(h.location.search);
    assert.equal(params.get(key), null, view);
    assert.equal(params.get('subject'), 'medicine');
    assert.equal(params.get('count'), '5');
    h.location.search = h.stack[0].split('?')[1]; h.events.popstate();
    assert.equal(h.location.search.includes(key + '=' + value), true);
  }
});


test('Study subject filtering and count edits preserve their sidebar through Back', async () => {
  const h = await open('?view=subjects&master=study&subject=anatomy');
  h.change({ dataset: { filter: 'subject' }, value: 'medicine' });
  assert.equal(new URLSearchParams(h.location.search).get('master'), 'study');
  h.change({ dataset: { sessionCount: '' }, value: '5', hasAttribute: key => key === 'data-session-count' });
  assert.equal(new URLSearchParams(h.location.search).get('master'), 'study');
  await h.switch('notes');
  assert.equal(new URLSearchParams(h.location.search).get('master'), null);
  h.location.search = '?view=subjects&master=study&subject=anatomy'; h.events.popstate();
  h.change({ dataset: { filter: 'subject' }, value: 'medicine' });
  assert.equal(new URLSearchParams(h.location.search).get('master'), 'study');
});


test('contextual subject links retain Study ownership but changing view returns to Library', () => {
  assert.match(libraryDomain.libraryContextUrl('?view=subjects&master=study', { subject: 'medicine' }), /master=study/);
  assert.doesNotMatch(libraryDomain.libraryContextUrl('?view=subjects&master=study', { view: 'notes' }), /master=study/);
});
