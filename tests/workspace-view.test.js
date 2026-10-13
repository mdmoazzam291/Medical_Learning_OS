import test from 'node:test';
import assert from 'node:assert/strict';
const view = await import('../web/workspace-view.js').catch(() => null);
const render = (section, data) => { assert.ok(view, 'real learner workspace views are implemented'); return view.workspaceContent(section, data); };
test('an empty progress record cannot become a mastery or predicted rank', () => {
  const html = render('progress', { attempts: 0, correct: 0, accuracy: null, concepts: [] });
  assert.match(html, /0<\/strong><span>Saved attempts/);
  assert.match(html, /—<\/strong><span>Observed accuracy/);
  assert.doesNotMatch(html, /predicted|100%/);
});
test('past-run links open exact owned runs and cancelled runs cannot offer autopsy', () => {
  const html = render('past', { runs: [{ runId: 'owned-1', status: 'completed' }, { runId: 'cancelled-1', status: 'cancelled' }] });
  assert.match(html, /run=owned-1/);
  const autopsy = render('autopsy', { runs: [{ runId: 'owned-1', status: 'completed' }, { runId: 'cancelled-1', status: 'cancelled' }] });
  assert.match(autopsy, /run=owned-1/); assert.doesNotMatch(autopsy, /run=cancelled-1/);
});
test('recent activity labels concise practice and escapes source IDs', () => {
  const html = render('recent', { items: [{ questionVersionId: '<script>', recordedAt: '2026-10-01T00:00:00Z', correct: false, representation: 'concise-practice' }] });
  assert.match(html, /Concise practice/); assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>/);
});
test('a revision view exposes its actual due items and no automatically starting form', () => {
  const html = render('revision', { dueCount: 1, items: [{ question: { stem: 'Reviewed prompt', questionVersionId: 'q1@1' }, schedule: { dueAt: '2026-10-01T00:00:00Z' } }] });
  assert.match(html, /Reviewed prompt/); assert.match(html, /Open recommended revision/); assert.doesNotMatch(html, /<form/);
});

test('Preferences exposes independent surface style without obsolete sidebar choices', () => {
  for (const style of ['standard', 'glass']) {
    const html = view.preferencesContent({ surfaceStyle: style, palette: 'lavender_precision', theme: 'dark' }, 'device');
    assert.match(html, /data-preference="surfaceStyle"/);
    assert.match(html, new RegExp('value="' + style + '" selected'));
    assert.match(html, /data-preference="palette"/);
    assert.match(html, /data-preference="theme"/);
    assert.doesNotMatch(html, /data-preference="expanded"/);
  }
});
