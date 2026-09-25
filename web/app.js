const authFragment = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : '');
if (['access_token', 'refresh_token', 'error', 'error_code', 'error_description'].some(key => authFragment.has(key))) {
  location.replace('/web/account.html' + location.hash);
}

import { openStore } from '/src/adapters/local-store.js';
import { currentQuestion, currentAttempt, demoQuestions, queue } from '/src/domain/demo-study.js';
import { summarizeAttempts } from '/src/domain/learning-events.js';
const app = document.querySelector('#app');
const notice = document.querySelector('#notice');
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let store, state, screen = 'today', filter = 'all', search = '', busy = false;
let operations = Promise.resolve();
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('mlos-local') : null;
const nav = [['today', 'Today'], ['qbank', 'Demo QBank'], ['progress', 'Progress'], ['plan', 'Study plan']];
const button = (label, action, cls = '', extra = '') => `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
function announce(message) { notice.textContent = message; notice.hidden = false; }
function countdown() {
  const node = document.querySelector('#countdown');
  if (!node) return;
  const difference = new Date(state.settings.targetDate + 'T00:00:00').getTime() - Date.now();
  const total = Math.max(0, Math.floor(difference / 1000));
  node.textContent = difference <= 0 ? 'Target date reached' : `${Math.floor(total / 86400)} days · ${String(Math.floor(total / 3600) % 24).padStart(2, '0')}:${String(Math.floor(total / 60) % 60).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function metrics() {
  const today = new Date().toLocaleDateString('en-CA');
  const events = state.events.filter(e => new Date(e.occurredAt).toLocaleDateString('en-CA') === today);
  return `<div class="metrics"><div><strong>${events.length}<small> / ${state.settings.dailyGoal}</small></strong><span>Demo answers today</span></div><div><strong>${queue(state, 'incorrect').length}</strong><span>To revisit</span></div><div><strong>${events.length ? Math.round(events.reduce((n, e) => n + e.durationMs, 0) / 60000) : 0}<small> min</small></strong><span>Recorded demo time</span></div></div>`;
}
function today() {
  return `<section class="countdown"><div><span class="eyebrow">YOUR EXAM HORIZON</span><h2 id="countdown"></h2><p>NEET-PG · personal target ${escape(state.settings.targetDate)} · not an official exam date</p></div>${button('Edit target ↗', 'plan', 'text-button')}</section>
  <div class="page-heading"><div><span class="eyebrow">YOUR LEARNING WORKSPACE</span><h1>Make the next answer count.</h1><p>A focused session. A clearer picture of what to revisit.</p></div><span class="badge">LOCAL PREVIEW</span></div>
  <section class="hero"><div><span class="eyebrow">STUDY NOW</span><h2>${currentQuestion(state) ? 'Pick up where you left off.' : 'Try your first learning loop.'}</h2><p>Explore answering, explanations and revision queues with three nonclinical questions about this system.</p>${button(currentQuestion(state) ? 'Continue demo →' : 'Start demo →', 'start', 'primary')}<small>Nonclinical demo · about 2 minutes · saved on this browser</small></div><div class="session-card"><span class="eyebrow">THE LEARNING LOOP</span><ol><li><span>01</span> Retrieve an answer</li><li><span>02</span> Understand the explanation</li><li><span>03</span> Keep evidence for revision</li></ol><p>Observed accuracy ≠ durable mastery</p></div></section>
  <section class="panel"><div class="section-heading"><h2>Today’s demo progress</h2>${button('Edit plan', 'plan', 'text-button')}</div>${metrics()}</section>
  <div class="two-column"><section class="panel"><span class="eyebrow">REVISION PRIORITIES</span><h2>Give mistakes another look.</h2><p>${queue(state, 'incorrect').length} demo questions with an incorrect latest answer. Scheduling comes in a later milestone.</p>${button('Open incorrect queue →', 'incorrect', 'secondary')}</section><section class="panel"><span class="eyebrow">MEDICAL CONTENT</span><h2>Quality before quantity.</h2><p>No reviewed medical questions are available yet. Drafts stay outside the medical QBank.</p><span class="status-dot">Medical QBank awaiting reviewed content</span></section></div>`;
}
function bank() {
  const questions = queue(state, filter).filter(q => `${q.stem} ${q.label}`.toLowerCase().includes(search.toLowerCase()));
  return `<div class="page-heading"><div><span class="eyebrow">NONCLINICAL WALKTHROUGH</span><h1>Demo QBank</h1><p>System concepts only. These results are separate from medical learning evidence.</p></div></div>
    <section class="panel"><div class="toolbar"><label>Search demo questions<input id="search" type="search" value="${escape(search)}" placeholder="Concepts, evidence, review…"></label><label>Show<select id="filter" aria-label="Question filter">${[['all', 'All questions'], ['incorrect', 'Incorrect latest answer'], ['bookmarks', 'Bookmarks']].map(([v, label]) => `<option value="${v}" ${v === filter ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div>
    <div class="question-list">${questions.length ? questions.map((q, i) => `<article><span class="number">${String(i + 1).padStart(2, '0')}</span><div><span class="eyebrow">${q.label}</span><h2>${q.stem}</h2><small>Original software demo · ${q.id}</small></div>${button(state.bookmarks.includes(q.id) ? 'Bookmarked' : 'Bookmark', 'bookmark', 'secondary', `data-id="${q.id}" aria-pressed="${state.bookmarks.includes(q.id)}"`)}</article>`).join('') : '<div class="empty"><h2>No questions here yet.</h2><p>Change the filter, clear search, or answer a demo question.</p></div>'}</div>
    <p class="muted">Starting a queue includes all its questions, regardless of the search text. An unfinished session always resumes first.</p>${button(currentQuestion(state) ? 'Continue active demo →' : 'Start selected queue →', 'start', 'primary', !queue(state, filter).length && !currentQuestion(state) ? 'disabled' : '')}</section>`;
}
function study() {
  const q = currentQuestion(state), s = state.session;
  if (!q) return `<section class="panel completion"><span class="eyebrow">DEMO COMPLETE</span><h1>Your evidence is saved.</h1><p>These software-demo answers do not measure medical knowledge. You can revisit mistakes or export your local record.</p>${button('View progress →', 'progress', 'primary')} ${button('Back to today', 'today', 'secondary')}</section>`;
  const answer = currentAttempt(state);
  return `<div class="section-heading"><div><span class="eyebrow">NONCLINICAL DEMO</span><p>Question ${s.index + 1} of ${s.questionIds.length} · ${q.label}</p></div>${button('Pause & return', 'pause', 'secondary')}</div>
    <section class="panel study"><div class="section-heading"><span class="badge">SYSTEM WALKTHROUGH</span>${button(state.bookmarks.includes(q.id) ? 'Bookmarked' : 'Bookmark', 'bookmark', 'text-button', `data-id="${q.id}" aria-pressed="${state.bookmarks.includes(q.id)}"`)}</div>
    <form id="answer-form"><fieldset ${answer ? 'disabled' : ''}><legend>${q.stem}</legend><div class="options">${q.options.map((text, index) => `<label class="option ${answer && index === q.answer ? 'correct' : ''}"><input type="radio" name="answer" value="${index}" ${s.selected === index ? 'checked' : ''}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${text}</span>${answer && index === q.answer ? '<b>Correct answer</b>' : ''}</label>`).join('')}</div></fieldset>
    ${answer ? `<div class="explanation" role="status"><h2>${answer.correct ? 'Correct.' : 'A useful mistake to revisit.'}</h2><p>${q.explanation}</p><small>Source: Medical Learning OS project design · nonclinical software demo</small></div>${button(s.index + 1 === s.questionIds.length ? 'Finish demo →' : 'Next question →', 'next', 'primary', 'type="button"')}` : '<button class="primary" type="submit" id="submit-answer" ' + (s.selected === null ? 'disabled' : '') + '>Check answer →</button>'}</form>
    <p class="muted">${answer ? 'Answer saved on this browser.' : 'Choose an answer. Your selection is saved so you can return later.'}</p></section>`;
}
function progress() {
  const summary = summarizeAttempts(state.events, state.learnerId);
  return `<div class="page-heading"><div><span class="eyebrow">EVIDENCE, NOT PREDICTIONS</span><h1>Your demo progress</h1><p>Observed results from the software walkthrough. No mastery score or rank estimate.</p></div>${button('Export local data ↓', 'export', 'secondary')}</div>
  <section class="panel">${metrics()}<div class="accuracy"><strong>${summary.accuracy === null ? '—' : Math.round(summary.accuracy * 100) + '%'}</strong><div>All-time demo accuracy<p>${summary.correct} correct / ${summary.attempts} attempts · includes repeated practice</p></div></div></section>
  <section class="panel"><h2>Evidence by concept</h2>${summary.concepts.length ? `<div class="table-wrap"><table><thead><tr><th>Demo concept</th><th>Attempts</th><th>Correct</th><th>Accuracy</th></tr></thead><tbody>${summary.concepts.map(c => `<tr><th>${demoQuestions.find(q => q.conceptId === c.conceptId).label}</th><td>${c.attempts}</td><td>${c.correct}</td><td>${Math.round(c.accuracy * 100)}%</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><h2>No evidence yet.</h2><p>Complete a demo answer to start your record.</p></div>'}</section>`;
}
function plan() {
  return `<div class="page-heading"><div><span class="eyebrow">MAKE ROOM FOR STUDY</span><h1>Your study plan</h1><p>Keep a small daily target that can fit around internship duties.</p></div></div><div class="two-column"><section class="panel"><form id="settings-form"><label>Personal target date<input name="targetDate" type="date" required value="${escape(state.settings.targetDate)}"></label><p class="muted">Your planning date, not a verified exam announcement.</p><label>Daily question target<input name="dailyGoal" type="number" min="1" max="200" required value="${state.settings.dailyGoal}"></label><p class="muted">A planning target only. It does not change the three-question demo or schedule reviews.</p><button class="primary" type="submit">Save plan</button></form></section><section class="panel"><h2>Your data, on this browser.</h2><p>A random local learner identity keeps this preview usable without an account. Answers, bookmarks, settings and the current session persist on this browser and origin.</p><p>Clearing browser data removes this record. Other devices do not sync. Export a copy you want to keep.</p>${button('Export local data ↓', 'export', 'secondary')}</section></div>`;
}
function render(focus = false) {
  document.documentElement.dataset.theme = state.settings.theme;
  app.innerHTML = `<div class="shell"><aside class="sidebar"><a class="brand" href="#today"><span class="brand-mark">m.</span><span>Medical<span>Learning OS</span></span></a><span class="nav-caption">WORKSPACE</span><nav aria-label="Main navigation">${nav.map(([id, label]) => `<a href="#${id}" ${screen === id ? 'aria-current="page"' : ''}>${label}<span aria-hidden="true">↗</span></a>`).join('')}</nav><div class="sidebar-note"><span class="status-dot">Local workspace</span><p>Build understanding.<br>Keep the evidence.</p></div></aside><div class="workspace"><header><span>MEDICAL LEARNING OS <span class="header-divider">/</span> ${screen === 'study' ? 'Demo session' : nav.find(([id]) => id === screen)?.[1]}</span>${button(state.settings.theme === 'dark' ? 'Light mode' : 'Dark mode', 'theme', 'text-button', `aria-label="Switch to ${state.settings.theme === 'dark' ? 'light' : 'dark'} mode"`)}</header><main id="main" tabindex="-1">${({ today, qbank: bank, study, progress, plan })[screen]()}</main><footer>Medical Learning OS · local preview · nonclinical demo</footer></div></div>`;
  countdown();
  if (focus) document.querySelector('#main').focus();
}
async function save(action, rerender = true) {
  state = await store.dispatch({ ...action, now: Date.now() });
  channel?.postMessage('updated');
  if (rerender) render();
}
function sessionAction(type, extra = {}) { return { type, sessionId: state.session?.id, index: state.session?.index, ...extra }; }
function run(fn) {
  // Serialize quick user actions instead of silently dropping input while a
  // previous IndexedDB transaction is finishing. Errors never break the queue.
  operations = operations.then(async () => {
    busy = true; notice.hidden = true; app.setAttribute('aria-busy', 'true');
    try { await fn(); } catch (error) { render(); announce(`Not saved: ${error.message}. Your previous saved data is retained. Reload to retry.`); }
    finally { busy = false; app.removeAttribute('aria-busy'); }
  });
  return operations;
}
async function navigate(next) {
  if (screen === 'study' && next !== 'study' && currentQuestion(state)) await save(sessionAction('pause'), false);
  screen = next; render(true);
}
app.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (link) { event.preventDefault(); run(() => navigate(link.hash.slice(1))); return; }
  const target = event.target.closest('[data-action]');
  if (!target) return;
  event.preventDefault();
  run(async () => {
    const action = target.dataset.action;
    if (nav.some(([id]) => id === action)) return navigate(action);
    if (action === 'theme') { await save({ type: 'settings', settings: { ...state.settings, theme: state.settings.theme === 'light' ? 'dark' : 'light' } }); return; }
    if (action === 'bookmark') { await save({ type: 'bookmark', id: target.dataset.id }); return; }
    if (action === 'incorrect') { filter = 'incorrect'; search = ''; return navigate('qbank'); }
    if (action === 'pause') return navigate('today');
    if (action === 'next') { await save(sessionAction('next')); document.querySelector('#main').focus(); return; }
    if (action === 'start') {
      await save({ type: currentQuestion(state) ? 'resume' : 'start', id: crypto.randomUUID(), filter: screen === 'qbank' ? filter : 'all' }, false);
      screen = 'study'; render(true); return;
    }
    if (action === 'export') {
      const latest = await store.load();
      const url = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), scope: 'nonclinical-local-demo', data: latest }, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'medical-learning-os-local-export.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
});
app.addEventListener('change', event => {
  if (event.target.name === 'answer') run(async () => { await save(sessionAction('select', { option: Number(event.target.value) }), false); document.querySelector('#submit-answer').disabled = false; });
  if (event.target.id === 'filter') { filter = event.target.value; render(); }
});
app.addEventListener('input', event => {
  if (event.target.id === 'search') { search = event.target.value; const position = event.target.selectionStart; render(); const input = document.querySelector('#search'); input.focus(); if (position !== null) input.setSelectionRange(position, position); }
});
app.addEventListener('submit', event => {
  event.preventDefault();
  run(async () => {
    if (event.target.id === 'answer-form') { await save(sessionAction('answer')); document.querySelector('#main').focus(); }
    if (event.target.id === 'settings-form') {
      const data = new FormData(event.target);
      await save({ type: 'settings', settings: { ...state.settings, targetDate: data.get('targetDate'), dailyGoal: Number(data.get('dailyGoal')) } }); announce('Study plan saved.');
    }
  });
});
channel && (channel.onmessage = () => { if (!busy) run(async () => { state = await store.load(); render(); }); });
document.addEventListener('visibilitychange', () => {
  if (store && screen === 'study' && currentQuestion(state) && !busy) run(() => save(sessionAction(document.hidden ? 'pause' : 'resume'), false));
});
try {
  store = await openStore(indexedDB); state = await store.load(); render(); setInterval(countdown, 1000);
} catch {
  app.innerHTML = '<main class="startup-error"><h1>Your saved workspace could not be opened.</h1><p>Saved data has not been replaced. Enable browser storage or close other app tabs, then reload. If the problem persists, keep this browser’s data for recovery.</p><button id="reload">Reload workspace</button></main>';
  document.querySelector('#reload').onclick = () => location.reload();
}
