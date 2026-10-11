import test from 'node:test';
import assert from 'node:assert/strict';
const view = await import('../web/library-workspace-view.js').catch(() => null);
const render = (type, data, options = {}) => { assert.ok(view, 'real workspace views are implemented'); return view.workspaceMarkup(type, data, options); };
const empty = { concepts: [], notes: [], questions: [], links: [] };
test('subject explorer exposes all nineteen subjects and honest empty module coverage', () => {
  const html = render('subjects', empty, { filters: { subject: 'anatomy' } });
  assert.equal((html.match(/data-subject=/g) || []).length, 19);
  assert.match(html, /Gross &amp; regional anatomy/);
  assert.match(html, /0 published questions/);
});
test('comparison uses exact source notes and escapes clinical source markup', () => {
  const data = { ...empty, concepts: [{ conceptId: 'c1', label: '<script>', classification: { subjects: ['medicine'] } }], notes: [{ noteVersionId: 'n1@1', conceptId: 'c1', title: 'Source', bodyMarkdown: '<img onerror=alert(1)>' }] };
  const html = render('compare', data, { compare: ['c1'] });
  assert.match(html, /&lt;img onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img onerror/);
  assert.match(html, /n1@1/);
});
test('unsupported atlas formats are labelled and source-bound self review cannot claim a score', () => {
  assert.match(render('atlas', empty), /3D.*requires/);
  const html = render('recall', empty);
  assert.match(html, /No published notes/);
  assert.doesNotMatch(html, /accuracy|mastered|Correct answer/);
});
test('saved view links stay local and device bookmarks do not manufacture deleted catalog records', () => {
  const html = render('savedviews', empty, { device: { views: [{ id: 'v1', name: 'View', view: 'graph', filters: { subject: 'medicine' } }], bookmarks: ['question:erased'] }, persistence: 'session' });
  assert.match(html, /view=graph/);
  assert.match(html, /page memory/);
  assert.doesNotMatch(html, /data-question-card="erased"/);
});
