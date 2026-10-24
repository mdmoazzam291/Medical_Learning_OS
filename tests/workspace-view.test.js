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
test('recent activity links exact owned attempts and preserves the page offset',()=>{
 const html=render('recent',{activityOffset:50,items:[{attemptId:'a1',questionVersionId:'q@1',representation:'original'}],nextOffset:100});
 assert.match(html,/attempt=a1/);assert.match(html,/offset=50/);assert.match(html,/offset=100/);assert.match(html,/Review saved attempt/);
});
test('saved review renders stored results and escaped original content without answer controls',()=>{
 const html=render('recent',{items:[],activityOffset:50,attemptReview:{availability:'available',attempt:{questionVersionId:'q@1',correct:false},question:{stem:'<img onerror=bad>',options:[{optionId:'a',text:'<script>'},{optionId:'b',text:'Beta'}]},receipt:{selectedOptionId:'a',answerOptionId:'b',explanation:'<svg onload=bad>',sources:[]}}});
 assert.match(html,/Saved attempt review/);assert.match(html,/Your answer/);assert.match(html,/Recorded correct answer/);assert.match(html,/Incorrect/);assert.match(html,/&lt;img/);assert.match(html,/&lt;svg/);assert.doesNotMatch(html,/<img|<svg|<input|<form/);assert.match(html,/offset=50/);
});
test('restricted or failed historical review never renders supplied prompt or answer fields',()=>{
 for(const data of [{attemptReview:{availability:'restricted',attempt:{correct:true},question:{stem:'HIDDEN'},receipt:{explanation:'HIDDEN'}}},{attemptReviewError:true}]){const html=render('recent',{items:[],...data});assert.match(html,/Review unavailable/);assert.doesNotMatch(html,/HIDDEN/);}
});
