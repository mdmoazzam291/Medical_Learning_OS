import { createClient } from '@supabase/supabase-js';

const root = document.querySelector('#account-app');
const notice = document.querySelector('#account-notice');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let auth, user, questions = [], progress, session, errorMessage = '', busy = false;
function message(value) { notice.textContent = value; }
function render() {
  if (errorMessage) { root.innerHTML = `<section class="panel"><h1>Account study unavailable</h1><p>${esc(errorMessage)}</p><a href="/">Use the local demo</a></section>`; return; }
  if (!user) {
    root.innerHTML = `<div class="page-heading"><div><span class="eyebrow">ACCOUNT STUDY</span><h1>Sign in to study.</h1>
      <p>This account workspace is separate from the nonclinical local demo.</p></div></div>
      <section class="panel"><form id="account-form"><label>Email<input name="email" type="email" autocomplete="email" required></label>
      <label>Password<input name="password" type="password" autocomplete="current-password" minlength="8" required></label>
      <button class="primary" name="mode" value="signin" type="submit">Sign in</button>
      <button class="secondary" name="mode" value="signup" type="submit">Create account</button></form>
      <p class="muted">Confirmation email uses the project's limited development email service. A production sender is not configured.</p></section>`;
    return;
  }
  const q = session?.question, receipt = session?.receipt;
  root.innerHTML = `<div class="page-heading"><div><span class="eyebrow">ACCOUNT STUDY</span><h1>Your study workspace</h1>
    <p>Signed in as ${esc(user.email)}. The server scores published question versions and retains your evidence.</p></div>
    <button class="secondary" data-action="signout">Sign out</button></div>
    <section class="panel"><h2>Observed evidence</h2><p>${progress ? `${Number(progress.attempts || 0)} attempts · ${progress.accuracy === null ? 'no accuracy yet' : `${Math.round(progress.accuracy * 100)}% observed accuracy`}` : 'Loading…'}</p>
    <p class="muted">Accuracy is descriptive; it is not mastery or a predicted rank.</p>
    <button class="secondary" data-action="export">Export account study record</button></section>
    ${q ? `<section class="panel study"><span class="eyebrow">PUBLISHED VERSION ${esc(q.questionVersionId)}</span>
      <h2>${esc(q.stem)}</h2><p>Question ${session.position + 1} of ${session.total}</p>
      <form id="account-answer"><fieldset ${receipt ? 'disabled' : ''}><legend>Select one answer</legend><div class="options">${q.options.map(o => `<label class="option"><input type="radio" name="option" value="${esc(o.optionId)}" required><span>${esc(o.text)}</span></label>`).join('')}</div></fieldset>
      ${receipt ? `<div class="explanation" role="status"><h3>${receipt.event.correct ? 'Correct' : 'Incorrect'}</h3><p>${esc(receipt.explanation)}</p>
        <small>Answer: ${esc(receipt.answerOptionId)}</small></div><button class="primary" data-action="next" type="button">Next question →</button>`
        : '<button class="primary" type="submit">Check answer →</button>'}</form>
      <button class="text-button" data-action="bookmark" data-id="${esc(q.questionVersionId)}">Bookmark question</button>
      <button class="text-button" data-action="cancel">End session</button></section>`
      : `<section class="panel"><h2>${session?.closed ? 'Session complete' : 'Study published questions'}</h2>
      <p>${questions.length ? `${questions.length} eligible question versions.` : 'No reviewed questions are published yet. The account path is ready, but medical content still requires review.'}</p>
      <button class="primary" data-action="start" ${questions.length ? '' : 'disabled'}>Start or resume session →</button></section>`}`;
}
async function api(path, input) {
  const { data: { session: authSession } } = await auth.auth.getSession();
  if (!authSession?.access_token) throw new Error('Session expired. Sign in again.');
  const response = await fetch(path, { method: input === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${authSession.access_token}`, ...(input === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: input === undefined ? undefined : JSON.stringify(input), cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}
async function reload() {
  if (!user) { questions = []; progress = null; session = null; render(); return; }
  [questions, progress] = await Promise.all([api('/api/questions').then(x => x.questions), api('/api/progress')]);
  render();
}
async function run(action) {
  if (busy) return;
  busy = true; root.setAttribute('aria-busy', 'true'); message('');
  try { await action(); }
  catch (error) { message(`Not saved: ${error.message}. Your previous saved evidence is retained.`); }
  finally { busy = false; root.removeAttribute('aria-busy'); }
}
root.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  run(async () => {
    if (form.id === 'account-form') {
      const fields = new FormData(form), credentials = { email: fields.get('email'), password: fields.get('password') };
      const mode = event.submitter?.value || 'signin';
      const { data, error } = mode === 'signup' ? await auth.auth.signUp(credentials) : await auth.auth.signInWithPassword(credentials);
      if (error) throw error;
      form.reset();
      if (!data.session) message('Check your email to confirm the account, then sign in.');
      else { user = data.user; await reload(); }
    }
    if (form.id === 'account-answer') {
      if (!session?.question || session.receipt) return;
      const selected = new FormData(form).get('option');
      if (!selected) throw new Error('Select an answer.');
      session.receipt = await api(`/api/sessions/${session.sessionId}/answer`,
        { requestId: crypto.randomUUID(), position: session.position, optionId: selected });
      render();
    }
  });
});
root.addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  event.preventDefault();
  run(async () => {
    if (button.dataset.action === 'signout') { await auth.auth.signOut(); user = null; await reload(); return; }
    if (button.dataset.action === 'start') { session = await api('/api/sessions', { limit: 15 }); render(); return; }
    if (button.dataset.action === 'next') { session = await api(`/api/sessions/${session.sessionId}/next`, { position: session.position }); await reload(); return; }
    if (button.dataset.action === 'cancel') { session = await api(`/api/sessions/${session.sessionId}/cancel`, {}); await reload(); return; }
    if (button.dataset.action === 'bookmark') { await api('/api/bookmarks', { questionVersionId: button.dataset.id, bookmarked: true }); message('Bookmark saved.'); return; }
    if (button.dataset.action === 'export') {
      const record = await api('/api/export');
      const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'medical-learning-os-account-export.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
});
try {
  const response = await fetch('/auth-config', { cache: 'no-store' });
  if (!response.ok) throw new Error('Set up the dedicated account project and start both local servers.');
  const config = await response.json();
  auth = createClient(config.url, config.publishableKey, { auth: { storageKey: 'mlos-account-auth' } });
  const { data: { session: current } } = await auth.auth.getSession();
  user = current?.user || null;
  await reload();
} catch (error) { errorMessage = error.message; render(); }
