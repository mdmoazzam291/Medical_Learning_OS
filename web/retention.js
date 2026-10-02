import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudRetentionProbe } from '/src/adapters/cloud-retention-probe.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';

const root = document.querySelector('#retention-app');
const notice = document.querySelector('#notice');
const auth = createSupabaseAuth({ ...cloudConfig });
const probe = createCloudRetentionProbe({ ...cloudConfig, auth });
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

let state = {
  user: auth.currentUser(),
  loading: false,
  busy: false,
  inbox: null,
  renderReady: false,
  result: null,
  error: null
};

function announce(message) {
  notice.textContent = message;
  notice.hidden = false;
}

function reportUnexpected(error, operation) {
  const status = Number(error?.status || 0);
  if (!status || status >= 500) {
    errorMonitor.capture(error, { component:'retention-check', operation, code:error?.code || null, status:status || null });
  }
}

function answerRequestKey(servedEventId) {
  const key = `mlos-retention-answer:${servedEventId}`;
  let value = sessionStorage.getItem(key);
  if (!value) {
    value = `retention-answer:${crypto.randomUUID()}`;
    sessionStorage.setItem(key, value);
  }
  return value;
}

function clearAnswerRequestKey(servedEventId) {
  sessionStorage.removeItem(`mlos-retention-answer:${servedEventId}`);
}

function signedOutView() {
  return `<main id="main" class="account-page"><a class="text-button" href="/web/account.html">← Account</a><div class="page-heading"><div><span class="eyebrow">OPTIONAL RETENTION CHECK</span><h1>Sign in to check for delayed retrieval work.</h1><p>This feasibility surface never starts a question automatically.</p></div></div><section class="panel"><a class="primary action-link" href="/web/account.html">Open account →</a></section></main>`;
}

function noneView() {
  return `<main id="main" class="account-page"><a class="text-button" href="/web/account.html">← Account</a><div class="page-heading"><div><span class="eyebrow">OPTIONAL RETENTION CHECK</span><h1>No retention check is waiting now.</h1><p>Study Now and due revision remain the priority. This page does not create an assignment by being opened.</p></div><span class="badge">NO ACTION</span></div><section class="panel"><h2>Nothing to do here.</h2><p>If a preregistered optional check becomes eligible later, it can appear here only after the existing consent, timing, content and workload gates pass.</p><p><a class="primary action-link" href="/">Study Now →</a> <a class="secondary action-link" href="/web/medical.html">Study →</a></p></section></main>`;
}

function blockedView() {
  return `<main id="main" class="account-page"><a class="text-button" href="/web/account.html">← Account</a><div class="page-heading"><div><span class="eyebrow">OPTIONAL RETENTION CHECK</span><h1>The optional check is not available right now.</h1><p>Higher-priority learning work, timing rules or another preregistered gate is blocking delivery.</p></div><span class="badge">BLOCKED</span></div><section class="panel"><h2>Do ordinary learning instead.</h2><p>A retention probe is never allowed to displace due revision, mistake repair or an open study session.</p><p><a class="primary action-link" href="/">Study Now →</a></p></section></main>`;
}

function availableView() {
  const close = state.inbox?.windowCloseAt ? new Date(state.inbox.windowCloseAt).toLocaleString() : null;
  return `<main id="main" class="account-page"><a class="text-button" href="/web/account.html">← Account</a><div class="page-heading"><div><span class="eyebrow">OPTIONAL RETENTION CHECK</span><h1>One delayed-retrieval question is available.</h1><p>Starting is your choice. Opening this page has not exposed the question or recorded a response.</p></div><span class="badge">OPTIONAL</span></div><section class="panel"><h2>What this measures</h2><p>This feasibility check asks a different published question linked to previously studied material after a delay. It is descriptive research evidence, not a mastery score.</p>${close ? `<p class="muted">Current eligibility window closes ${escape(close)}.</p>` : ''}<button class="primary" data-action="start" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Starting…' : 'Start 1-question check →'}</button><p class="muted">No automatic scheduling or Study Now authority is enabled.</p></section></main>`;
}

function questionView() {
  const q = state.inbox?.learnerQuestion;
  if (!q) return blockedView();
  const options = Array.isArray(q.options) ? q.options : [];
  const optionHtml = options.map((option, index) => `<label class="option"><input type="radio" name="retention-answer" value="${escape(option.optionId)}" ${(!state.renderReady || state.busy) ? 'disabled' : ''}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${escape(option.text)}</span></label>`).join('');
  const readiness = state.renderReady
    ? '<p class="muted" id="retention-render-state">Browser render recorded. This does not claim that you viewed or remembered the question.</p>'
    : `<p class="muted" id="retention-render-state">${state.busy ? 'Recording browser render…' : 'Browser render evidence is unavailable. Retry before answering.'}</p><button class="secondary" data-action="retry-render" ${state.busy ? 'disabled' : ''}>Retry render receipt</button>`;
  return `<main id="main" class="account-page"><a class="text-button" href="/web/account.html">← Account</a><div class="page-heading"><div><span class="eyebrow">DELAYED RETRIEVAL · 1 QUESTION</span><h1>Answer from memory.</h1><p>No answer key or explanation is shown until your response is server-scored.</p></div><span class="badge">OPTIONAL PILOT</span></div><section class="panel exam-question"><form id="retention-answer-form"><fieldset aria-describedby="retention-render-state" ${(!state.renderReady || state.busy) ? 'disabled' : ''}><legend id="retention-question-stem">${escape(q.stem)}</legend><div class="options">${optionHtml}</div></fieldset>${readiness}<button class="primary" type="submit" ${(!state.renderReady || state.busy) ? 'disabled' : ''}>${state.busy ? 'Submitting…' : 'Submit answer'}</button></form></section><section class="panel"><p class="muted">This response enters the same canonical learning-evidence ledger as ordinary question attempts. It does not itself activate mastery, forgetting or causal inference.</p></section></main>`;
}

function resultView() {
  const receipt = state.result?.attemptReceipt;
  if (!receipt) return noneView();
  const event = receipt.event || {};
  const options = state.inbox?.learnerQuestion?.options || [];
  const selected = options.find(option => option.optionId === receipt.selectedOptionId)?.text ?? receipt.selectedOptionId;
  const correct = options.find(option => option.optionId === receipt.answerOptionId)?.text ?? receipt.answerOptionId;
  const sources = Array.isArray(receipt.sources) && receipt.sources.length
    ? `<details><summary>Sources</summary><ul>${receipt.sources.map(source => `<li>${source.url ? `<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a>` : escape(source.title)}</li>`).join('')}</ul></details>`
    : '';
  return `<main id="main" class="account-page"><a class="text-button" href="/web/account.html">← Account</a><div class="page-heading"><div><span class="eyebrow">RETENTION CHECK COMPLETE</span><h1>${event.correct === true ? 'Correct.' : 'Incorrect.'}</h1><p>The server recorded this as delayed retrieval evidence. No mastery label is inferred here.</p></div><span class="badge">RECORDED</span></div><section class="panel"><h2>Answer review</h2><p><strong>Your answer:</strong> ${escape(selected)}</p><p><strong>Correct answer:</strong> ${escape(correct)}</p>${receipt.explanation ? `<p>${escape(receipt.explanation)}</p>` : ''}${sources}</section><section class="panel"><h2>Return to learning</h2><p>The retrieval can update ordinary revision evidence, but this pilot has no Study Now recommendation authority.</p><p><a class="primary action-link" href="/">Study Now →</a> <a class="secondary action-link" href="/web/medical.html">Study →</a></p></section></main>`;
}

function errorView() {
  return `<main id="main" class="account-page"><a class="text-button" href="/web/account.html">← Account</a><div class="page-heading"><div><span class="eyebrow">OPTIONAL RETENTION CHECK</span><h1>Retention check unavailable.</h1><p>${escape(state.error || 'retention_probe_unavailable')}</p></div></div><section class="panel"><button class="secondary" data-action="reload">Retry</button> <a class="primary action-link" href="/">Study Now →</a></section></main>`;
}

function render() {
  if (!state.user) root.innerHTML = signedOutView();
  else if (state.result) root.innerHTML = resultView();
  else if (state.error) root.innerHTML = errorView();
  else if (state.loading || !state.inbox) root.innerHTML = '<main id="main" class="account-page"><a class="text-button" href="/web/account.html">← Account</a><section class="panel"><p>Checking optional retention work…</p></section></main>';
  else if (state.inbox.state === 'available') root.innerHTML = availableView();
  else if (state.inbox.state === 'in_progress') root.innerHTML = questionView();
  else if (state.inbox.state === 'blocked') root.innerHTML = blockedView();
  else root.innerHTML = noneView();
}

async function acknowledgeRender() {
  const inbox = state.inbox;
  if (inbox?.state !== 'in_progress' || !inbox.servedEventId || !inbox.learnerQuestionSha256 || state.renderReady || state.busy) return;
  state = { ...state, busy:true };
  render();
  try {
    const receipt = await probe.rendered({
      servedEventId: inbox.servedEventId,
      learnerQuestionSha256: inbox.learnerQuestionSha256
    });
    state = { ...state, busy:false, renderReady:receipt?.browserRenderedConfirmed === true, error:null };
  } catch (error) {
    reportUnexpected(error, 'record_render');
    state = { ...state, busy:false, renderReady:false };
    announce('Browser render was not recorded. Retry before answering.');
  }
  render();
}

async function recoverServedSession(inbox) {
  if (inbox?.state !== 'in_progress' || inbox.sessionId || !inbox.assignmentId || !inbox.servedEventId) return inbox;
  return probe.start({
    assignmentId:inbox.assignmentId,
    requestId:`retention-resume:${inbox.servedEventId}`
  });
}

async function loadInbox() {
  state = { ...state, loading:true, error:null, result:null };
  render();
  try {
    const session = await auth.getSession();
    if (!session?.user) {
      state = { ...state, user:null, loading:false, inbox:null };
      render();
      return;
    }
    let inbox = await probe.inbox();
    inbox = await recoverServedSession(inbox);
    state = {
      ...state,
      user:auth.currentUser() || session.user,
      loading:false,
      inbox,
      renderReady:inbox?.state === 'in_progress' && inbox?.browserRenderedConfirmed === true,
      error:null
    };
    render();
    if (inbox?.state === 'in_progress' && inbox?.browserRenderedConfirmed !== true) {
      requestAnimationFrame(() => acknowledgeRender());
    }
  } catch (error) {
    reportUnexpected(error, 'load_inbox');
    if (Number(error?.status) === 401) state = { ...state, user:null, loading:false, inbox:null, error:null };
    else state = { ...state, loading:false, error:error?.code || error?.message || 'retention_probe_unavailable' };
    render();
  }
}

async function startProbe() {
  if (state.inbox?.state !== 'available' || state.busy) return;
  state = { ...state, busy:true };
  render();
  try {
    const inbox = await probe.start({
      assignmentId:state.inbox.assignmentId,
      requestId:`retention-serve:${crypto.randomUUID()}`
    });
    state = { ...state, busy:false, inbox, renderReady:inbox?.browserRenderedConfirmed === true, error:null };
    render();
    if (inbox?.browserRenderedConfirmed !== true) requestAnimationFrame(() => acknowledgeRender());
  } catch (error) {
    reportUnexpected(error, 'start_probe');
    state = { ...state, busy:false };
    announce(`Retention check did not start: ${error?.code || error?.message || 'retention_probe_start_failed'}.`);
    await loadInbox();
  }
}

async function submitAnswer(form) {
  const inbox = state.inbox;
  if (inbox?.state !== 'in_progress' || !state.renderReady || state.busy) return;
  const data = new FormData(form);
  const optionId = data.get('retention-answer');
  if (!optionId) {
    announce('Choose an answer first.');
    return;
  }
  state = { ...state, busy:true };
  render();
  try {
    const result = await probe.answer({
      servedEventId:inbox.servedEventId,
      requestId:answerRequestKey(inbox.servedEventId),
      optionId:String(optionId)
    });
    clearAnswerRequestKey(inbox.servedEventId);
    state = { ...state, busy:false, result, error:null };
    render();
    document.querySelector('#main h1')?.focus?.({ preventScroll:true });
  } catch (error) {
    reportUnexpected(error, 'answer_probe');
    state = { ...state, busy:false };
    announce(`Answer was not recorded: ${error?.code || error?.message || 'retention_probe_answer_failed'}.`);
    render();
  }
}

root.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  event.preventDefault();
  if (target.dataset.action === 'reload') loadInbox();
  if (target.dataset.action === 'start') startProbe();
  if (target.dataset.action === 'retry-render') acknowledgeRender();
});

root.addEventListener('submit', event => {
  if (event.target.id !== 'retention-answer-form') return;
  event.preventDefault();
  submitAnswer(event.target);
});

render();
loadInbox();
