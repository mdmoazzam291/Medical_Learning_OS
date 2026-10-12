import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { deviceCollections, selectWorkspace } from '../src/domain/library-workspaces.js';
import { workspaceMarkup } from '../web/library-workspace-view.js';
const domain = await import('../src/domain/library-workspaces.js');
const source = (await readFile(new URL('../web/library-enhancements.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replace('export function', 'function');
const cls = system => ({ subjects: ['medicine'], systems: [system], organs: [], domains: [], tasks: [] });
const library = {
  concepts: ['a', 'b'].map(id => ({ conceptId: id, label: id, aliases: [], classification: cls(id) })),
  notes: ['a', 'b'].map(id => ({ noteVersionId: id + '@1', conceptId: id, title: 'Note ' + id, bodyMarkdown: 'Source ' + id })),
  questions: ['a', 'b'].map(id => ({ questionId: id, questionVersionId: id + '@1', stem: 'Image ' + id, options: [], classification: cls(id), conceptLinks: [{ conceptId: id, role: 'primary' }], home: { exams: [], platforms: [], kind: 'original' }, observed: { state: 'unattempted' }, intelligence: { presentation: ['image'], qualifiers: [], responseFormat: 'single-best-answer' } })),
  links: []
};
function harness(view = 'recall', cloud = {}) {
  const listeners = {}, targets = new Map(), s = { library, view, filters: {}, options: {}, busy: false };
  const target = key => { if (!targets.has(key)) targets.set(key, { innerHTML: '', textContent: '', insertAdjacentHTML(_where, html) { this.innerHTML = html; }, remove() {} }); return targets.get(key); };
  const root = { querySelector: target, querySelectorAll: () => [], addEventListener(type, fn) { (listeners[type] ||= []).push(fn); } };
  const context = vm.createContext({ URL, URLSearchParams, location: { search: '', origin: 'https://example.invalid' }, window: { addEventListener() {} }, document: { querySelector: target }, deviceCollections: () => deviceCollections(() => { throw Error('blocked'); }), selectWorkspace, workspaceMarkup, e: value => String(value), auth: {}, request() { throw Error('No session write expected'); }, createCloudStudy: () => cloud, cloudConfig: { projectUrl: 'https://example.invalid' } });
  vm.runInContext(source, context);
  let api;
  const render = () => { target('#media-viewer').innerHTML = ''; api.decorate(); };
  api = context.setupLibraryWorkspaces({ root, state: () => s, change(update) { if (update.options) s.options = { ...s.options, ...update.options }; }, render, remember() {} });
  render();
  const click = async dataset => { const button = { dataset, hasAttribute: name => name === 'data-reveal-recall' && dataset.reveal === true }; await Promise.all((listeners.click || []).map(fn => fn({ target: { closest: () => button } }))); };
  const input = value => listeners.input.forEach(fn => fn({ target: { id: 'self-recall', value, hasAttribute: () => false } }));
  return { s, render, click, input, target, markup: () => target('#library-status').innerHTML };
}
test('recall drafts stay bound to exact source notes across card changes and filters', async () => {
  const h = harness(); h.input('Draft for A'); await h.click({ recallStep: '1' }); h.input('Draft for B');
  h.s.filters = { concept: 'a' }; h.render();
  assert.match(h.markup(), /Draft for A/); assert.doesNotMatch(h.markup(), /Draft for B/);
  h.s.filters = { concept: 'b' }; h.render(); assert.match(h.markup(), /Draft for B/);
});
test('revealing a source note cannot reveal a different filtered card', async () => {
  const h = harness(); await h.click({ reveal: true }); assert.match(h.markup(), /Source a/);
  h.s.filters = { concept: 'b' }; h.render(); assert.doesNotMatch(h.markup(), /Source b/);
});
test('excluded media and late responses cannot remain in a new filtered workspace', async () => {
  let resolve; const pending = new Promise(r => { resolve = r; });
  const h = harness('images', { mediaPrompt: () => pending });
  const opening = h.click({ media: 'a@1' });
  assert.match(h.target('#media-viewer').innerHTML, /Loading prompt media/);
  h.s.filters = { system: 'b' }; h.render();
  assert.equal(h.target('#media-viewer').innerHTML, '');
  resolve({ media: [{ deliveryRef: 'https://example.invalid/a.png', mediaAssetVersionId: 'media-a@1' }] }); await opening;
  assert.equal(h.target('#media-viewer').innerHTML, '');
});
test('leaving the media view cancels its pending display instead of reopening an endless loading panel', async () => {
  let resolve; const pending = new Promise(r => { resolve = r; });
  const h = harness('images', { mediaPrompt: () => pending });
  const opening = h.click({ media: 'a@1' });
  h.s.view = 'notes'; h.render();
  resolve({ media: [] }); await opening;
  h.s.view = 'images'; h.render();
  assert.equal(h.target('#media-viewer').innerHTML, '');
});
test('concept handoffs retain filters, builder ownership and selected count while dropping unrelated URL fields', () => {
  assert.equal(typeof domain.libraryContextUrl, 'function');
  const url = new URL(domain.libraryContextUrl('?view=graph&subject=medicine&system=a&collection=pyq&build=1&count=5&token=private', { concept: 'a' }), 'https://example.invalid');
  assert.equal(url.searchParams.get('subject'), 'medicine'); assert.equal(url.searchParams.get('system'), 'a');
  assert.equal(url.searchParams.get('collection'), 'pyq'); assert.equal(url.searchParams.get('build'), '1');
  assert.equal(url.searchParams.get('count'), '5'); assert.equal(url.searchParams.get('concept'), 'a');
  assert.equal(url.searchParams.has('token'), false);
});
test('a full saved-view collection rejects a new view instead of reporting a save that was discarded', () => {
  assert.equal(typeof domain.addSavedView, 'function');
  const values = Array.from({ length: 30 }, (_, i) => ({ id: 'v' + i, name: 'View ' + i, view: 'notes', filters: {}, options: {} }));
  assert.throws(() => domain.addSavedView(values, { id: 'new', name: 'New view', view: 'notes', filters: {} }), /30 saved views/);
  assert.equal(values.length, 30);
});
test('keyword frequencies respect workspace collection and observed filters', () => {
  assert.equal(typeof domain.workspaceKeywordCounts, 'function');
  const tagged = { ...library, questions: library.questions.map(q => ({ ...q, classification: { ...q.classification, tasks: ['diagnosis'] } })) };
  assert.deepEqual(domain.workspaceKeywordCounts(tagged, {}), [{ id: 'diagnosis', count: 2 }]);
  assert.deepEqual(domain.workspaceKeywordCounts(tagged, { collection: 'pyq' }), []);
  assert.deepEqual(domain.workspaceKeywordCounts(tagged, { observed: 'incorrect' }), []);
});
test('restored recall drafts keep a stable field label independent of their text', () => {
  const html = workspaceMarkup('recall', library, { recallDraft: 'Restored draft text' });
  assert.match(html, /<textarea[^>]*aria-label="Your recall"/);
});
