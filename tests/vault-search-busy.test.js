import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';

const source = (await readFile(new URL('../web/vault.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '');
const concepts = [
  { conceptId: 'fixture:reviewed', label: 'Reviewed fixture', annotationCount: 0 },
  { conceptId: 'fixture:empty', label: 'Unpublished fixture', annotationCount: 0 }
];
const settle = () => new Promise(resolve => setImmediate(resolve));

async function openVault() {
  const listeners = {}, reads = [], pendingSearches = [];
  let focused = null;
  const root = {
    innerHTML: '',
    addEventListener(type, listener) { listeners[type] = listener; },
    querySelector(selector) {
      return selector === '#concept-title' ? { focus() { focused = selector; } } : null;
    }
  };
  const location = new URL('https://example.invalid/web/vault.html?concept=fixture:reviewed&returnSession=vault-fixture');
  const user = { id: 'fixture-learner' };
  const cloud = {
    async vaultConcepts() { return { concepts }; },
    async vaultConcept(conceptId) {
      reads.push(conceptId);
      return { concept: concepts.find(concept => concept.conceptId === conceptId), canonicalNote: null, annotations: [] };
    },
    vaultSearch(query) {
      return new Promise((resolve, reject) => pendingSearches.push({ query, resolve, reject }));
    }
  };
  const context = createContext({
    URL, URLSearchParams, location,
    history: { replaceState(_state, _title, href) { location.href = new URL(href, location).href; } },
    document: { querySelector: selector => selector === '#vault-app' ? root : {} },
    window: { addEventListener() {}, matchMedia: () => ({ matches: true }) },
    createSupabaseAuth: () => ({ currentUser: () => user, getSession: async () => ({ user }) }),
    createCloudStudy: () => cloud, cloudConfig: {}, errorMonitor: { capture() {} },
    createVaultDrafts: () => ({ restore() {}, hasDrafts: () => false }),
    FormData: class { constructor(form) { this.form = form; } get(key) { return this.form.values[key]; } }
  });
  runInContext(source, context);
  await settle();
  function button(marker) {
    const tag = root.innerHTML.match(/<button\b[^>]*>/g)?.find(value => value.includes(marker));
    assert.ok(tag, 'rendered button: ' + marker);
    return { disabled: /\sdisabled(?:\s|>|=)/.test(tag) };
  }
  return {
    root, location, reads, pendingSearches, button,
    focused: () => focused,
    search(query) {
      listeners.submit({ preventDefault() {}, target: { id: 'vault-search-form', dataset: {}, values: { q: query } } });
    },
    select(conceptId) {
      const target = { dataset: { action: 'select-concept', conceptId } };
      listeners.click({ preventDefault() {}, target: { closest: selector => selector === '[data-action]' ? target : null } });
    }
  };
}

function assertSearchControlsDisabled(h, disabled) {
  assert.equal(h.button('data-concept-id="fixture:empty"').disabled, disabled,
    'an old catalog match must not accept a click that the busy handler discards');
  assert.equal(h.button('type="submit"').disabled, disabled, 'Search reflects whether submissions are accepted');
}

test('pending Vault search disables stale matches until selection can actually navigate', async () => {
  const h = await openVault();
  assertSearchControlsDisabled(h, false);
  h.search('empty');
  assert.equal(h.pendingSearches[0].query, 'empty');
  assertSearchControlsDisabled(h, true);
  // Even synthetic events cannot start a detail request during the pending search.
  h.select('fixture:empty');
  assert.deepEqual(h.reads, ['fixture:reviewed']);
  h.pendingSearches[0].resolve({ results: [concepts[1]] });
  await settle();
  assertSearchControlsDisabled(h, false);
  h.select('fixture:empty');
  await settle();
  assert.deepEqual(h.reads, ['fixture:reviewed', 'fixture:empty']);
  assert.equal(h.location.searchParams.get('concept'), 'fixture:empty');
  assert.equal(h.location.searchParams.get('returnSession'), 'vault-fixture');
  assert.equal(h.focused(), '#concept-title');
  assert.match(h.root.innerHTML, /No reviewed canonical note is published yet/);
});

test('failed Vault search restores usable matches and Clear without losing the previous result', async () => {
  const h = await openVault();
  h.search('empty');
  h.pendingSearches[0].resolve({ results: [concepts[1]] });
  await settle();
  h.search('missing');
  assertSearchControlsDisabled(h, true);
  assert.equal(h.button('data-action="clear-search"').disabled, true);
  h.pendingSearches[1].reject(Object.assign(new Error('fixture unavailable'), { status: 503 }));
  await settle();
  assertSearchControlsDisabled(h, false);
  assert.equal(h.button('data-action="clear-search"').disabled, false);
  assert.match(h.root.innerHTML, /The last action could not finish/);
  h.select('fixture:empty');
  await settle();
  assert.equal(h.location.searchParams.get('concept'), 'fixture:empty');
});
