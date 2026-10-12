import test from 'node:test';
import assert from 'node:assert/strict';
const module = await import('../src/domain/library-workspaces.js').catch(() => null);
const workspace = () => { assert.ok(module, 'published workspaces are implemented'); return module; };
const cls = (subjects = ['medicine'], domains = []) => ({ subjects, domains, systems: ['respiratory'], organs: ['lung'], tasks: ['diagnosis'] });
const library = {
  concepts: [{ conceptId: 'c1', label: 'Shared concept', aliases: [], classification: cls(['medicine', 'pathology'], ['system-pathology']) }, { conceptId: 'c2', label: 'Foundation', aliases: [], classification: cls() }],
  notes: [{ noteVersionId: 'n1@1', conceptId: 'c1', title: 'Source note', bodyMarkdown: 'Published definition and pattern.' }],
  questions: [{ questionId: 'q1', questionVersionId: 'q1@1', stem: 'Synthetic prompt', options: [{ text: 'A' }, { text: 'B' }], conceptLinks: [{ conceptId: 'c1', role: 'primary' }, { conceptId: 'c2', role: 'prerequisite' }], classification: cls(['medicine', 'pathology'], ['system-pathology']), home: { kind: 'pyq', exams: ['neet-pg'], platforms: [] }, observed: { attempts: 2, wrong: 1, state: 'incorrect', repeatedWrong: false }, intelligence: { presentation: ['clinical-vignette'], qualifiers: [], responseFormat: 'single-best-answer' } }], links: []
};
test('subject modules use explicit domain tags without duplicating shared canonical identity', () => {
  const { selectWorkspace } = workspace();
  for (const subject of ['medicine', 'pathology']) assert.equal(selectWorkspace(library, { filters: { subject }, module: 'system-pathology' }).questions[0].questionId, 'q1');
  assert.equal(selectWorkspace(library, { module: 'unassigned-module' }).questions.length, 0);
});
test('question collections and observed filters keep original version identity', () => {
  const { selectWorkspace } = workspace();
  assert.deepEqual(selectWorkspace(library, { collection: 'pyq', observed: 'incorrect' }).questions.map(q => q.questionVersionId), ['q1@1']);
  assert.equal(selectWorkspace(library, { collection: 'platform' }).questions.length, 0);
});
test('published note text is searchable without adding answer keys to the question search', () => {
  const { selectWorkspace } = workspace();
  const data = selectWorkspace(library, { filters: { search: 'definition' } });
  assert.equal(data.notes.length, 1);
  assert.equal(data.questions.length, 0);
  assert.equal(Object.hasOwn(data.questions[0] || {}, 'answerOptionId'), false);
});
test('prerequisite paths come only from explicit published links', () => {
  const { prerequisiteLinks } = workspace();
  assert.deepEqual(prerequisiteLinks(library), [{ from: 'c2', to: 'c1', questionVersionId: 'q1@1' }]);
  assert.deepEqual(prerequisiteLinks({ ...library, questions: [] }), []);
});
test('media and case formats never manufacture content from subject names', () => {
  const { selectWorkspace } = workspace();
  assert.equal(selectWorkspace(library, { view: 'cases' }).questions.length, 1);
  assert.equal(selectWorkspace(library, { view: 'images' }).questions.length, 0);
  assert.equal(selectWorkspace(library, { view: 'references', reference: 'drugs-therapeutics' }).notes.length, 0);
});
test('saved views retain validated filters but discard private drafts and external URLs', () => {
  const { validateSavedViews, savedViewUrl } = workspace();
  const views = validateSavedViews([{ id: 'view-1', name: 'Respiratory', filters: { subject: 'medicine', system: 'respiratory', search: '<script>', token: 'secret' }, view: 'graph', draft: 'private', url: 'https://evil.invalid' }]);
  assert.equal(views.length, 1); assert.equal(views[0].filters.token, undefined); assert.equal(views[0].draft, undefined);
  const url = savedViewUrl(views[0]); assert.ok(url.startsWith('/web/library.html?')); assert.equal(new URL(url, 'https://example.invalid').searchParams.get('search'), '<script>');
  assert.equal(validateSavedViews([{ id: 'view-1', name: 'X', filters: {}, view: 'admin' }]).length, 0);
});
