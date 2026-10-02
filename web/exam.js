import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudStudy } from '/src/adapters/cloud-study.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';

const RULE_SET_ID = 'neet-pg:2026@1';
const root = document.querySelector('#exam-app');
const notice = document.querySelector('#notice');
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const auth = createSupabaseAuth({ ...cloudConfig });
const cloud = createCloudStudy({ ...cloudConfig, auth });

let timerId = null;
let clockSyncing = false;
let state = {
  user: auth.currentUser(),
  loading: false,
  busy: false,
  productionReadiness: null,
  productionReadinessError: null,
  testReadiness: null,
  testReadinessError: null,
  internalTestAllowed: false,
  run: null,
  autopsy: null,
  autopsyError: null,
  questionIndex: 0,
  serverOffsetMs: 0,
  error: null
};

function announce(message) {
  notice.textContent = message;
  notice.hidden = false;
}

function reportUnexpected(error, operation) {
  const status = Number(error?.status || 0);
  if (!status || status >= 500) {
    errorMonitor.capture(error, {
      component: 'exam-mode',
      operation,
      code: error?.code || null,
      status: status || null
    });
  }
}

function safeMediaUrl(value) {
  try {
    const url = new URL(String(value ?? ''));
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function questionMedia(media) {
  if (!Array.isArray(media) || !media.length) return '';
  const items = media.map((item, index) => {
    const url = safeMediaUrl(item?.deliveryRef);
    const modality = escape(item?.modality || 'medical');
    const label = 'Exam ' + modality + ' image ' + (index + 1);
    if (!url) {
      return '<div class="question-media-unavailable" role="status"><strong>Image unavailable.</strong><span>The exam has preserved this question, but its signed media could not be loaded.</span></div>';
    }
    return '<figure class="question-media"><img src="' + escape(url) + '" alt="' + escape(label) + '" loading="eager" decoding="async" referrerpolicy="no-referrer"><figcaption>' + modality + ' · blind first look</figcaption></figure>';
  }).join('');
  return '<div class="question-media-list" aria-label="Exam question media">' + items + '</div>';
}

function signedOutView() {
  return '<main id="main" class="exam-page"><a class="text-button" href="/web/account.html">← Cloud account</a><div class="page-heading"><div><span class="eyebrow">EXAM MODE</span><h1>Sign in to use the simulator.</h1><p>Exam state is learner-scoped and server-authoritative.</p></div></div><section class="panel"><a class="primary action-link" href="/web/account.html">Open cloud account →</a></section></main>';
}

function readinessCard({ label, readiness, error, testing }) {
  if (error) {
    return '<section class="panel exam-readiness-card"><span class="eyebrow">' + escape(label) + '</span><h2>Readiness unavailable.</h2><p>' + escape(error) + '</p></section>';
  }
  if (!readiness) return '';
  const ready = readiness.ready === true;
  const count = Number(readiness.eligibleUniqueQuestions ?? 0);
  const required = Number(readiness.requiredUniqueQuestions ?? 0);
  const shortage = Number(readiness.shortage ?? Math.max(0, required - count));
  const caveat = testing
    ? 'Engineering lane only. AI-test-reviewed items remain non-production content.'
    : 'Production lane uses human-reviewed published questions only.';
  const action = ready
    ? '<button class="primary" data-action="' + (testing ? 'start-test' : 'start-production') + '" ' + (state.busy ? 'disabled' : '') + '>Start ' + (testing ? 'internal test mock' : 'full mock') + ' →</button>'
    : '<button class="secondary" disabled>' + shortage + ' more eligible question' + (shortage === 1 ? '' : 's') + ' required</button>';
  return '<section class="panel exam-readiness-card"><span class="eyebrow">' + escape(label) + '</span><h2>' + count + ' / ' + required + ' questions ready</h2><p>' + (ready ? 'Capacity gate passed.' : 'Capacity gate has not passed.') + '</p><p class="muted">' + escape(caveat) + '</p>' + action + '</section>';
}

function homeView() {
  const loading = state.loading
    ? '<section class="panel"><p>Checking simulator state…</p></section>'
    : '';
  const error = state.error
    ? '<section class="panel"><h2>Exam Mode unavailable</h2><p>' + escape(state.error) + '</p><button class="secondary" data-action="reload">Retry</button></section>'
    : '';
  const production = readinessCard({
    label: 'PRODUCTION FULL MOCK',
    readiness: state.productionReadiness,
    error: state.productionReadinessError,
    testing: false
  });
  const internal = state.internalTestAllowed || state.testReadinessError
    ? readinessCard({
        label: 'INTERNAL ENGINEERING MOCK',
        readiness: state.testReadiness,
        error: state.testReadinessError,
        testing: true
      })
    : '';
  return '<main id="main" class="exam-page"><a class="text-button" href="/web/medical.html">← Medical study</a><div class="page-heading"><div><span class="eyebrow">EXAM MODE</span><h1>Rule-faithful, locked-section simulation.</h1><p>' + escape(state.user?.email || 'Authenticated learner') + ' · server timers, immutable exam events, no early section advance.</p></div><span class="badge">M08</span></div>' + loading + error + '<div class="exam-readiness-grid">' + production + internal + '</div><section class="panel"><h2>Before you start</h2><p>NEET-PG 2026 ruleset: 180 questions, five locked sections, 42 minutes per section. Time does not carry forward and closed sections cannot be reopened.</p><p class="muted">The server, not this browser timer, decides section closure and final scoring.</p></section></main>';
}

function currentQuestion() {
  const questions = state.run?.currentSection?.questions;
  if (!Array.isArray(questions) || !questions.length) return null;
  return questions[Math.min(Math.max(0, state.questionIndex), questions.length - 1)] ?? null;
}

function responseFor(questionVersionId) {
  return state.run?.currentSection?.responses?.[questionVersionId] ?? {
    optionId: null,
    markedForReview: false,
    answeredAt: null,
    updatedAt: null
  };
}

function paletteButton(question, index) {
  const response = responseFor(question.questionVersionId);
  const classes = ['exam-palette-button'];
  const isCurrent = index === state.questionIndex;
  if (isCurrent) classes.push('current');
  if (response.optionId !== null) classes.push('answered');
  if (response.markedForReview) classes.push('review');
  const status = [response.optionId !== null ? 'answered' : 'unanswered'];
  if (response.markedForReview) status.push('marked for review');
  const current = isCurrent ? ' aria-current="true"' : '';
  return '<button type="button" class="' + classes.join(' ') + '" data-action="jump" data-index="' + index + '" aria-label="Question ' + (index + 1) + ', ' + status.join(', ') + '"' + current + '>' + (index + 1) + '</button>';
}

function runView() {
  const run = state.run;
  const section = run?.currentSection;
  if (!run || !section) return homeView();
  const q = currentQuestion();
  if (!q) {
    return '<main id="main" class="exam-page"><section class="panel"><h1>Section unavailable.</h1><p>The server returned no current question.</p><button class="secondary" data-action="refresh-run">Refresh run</button></section></main>';
  }
  const questions = section.questions;
  const response = responseFor(q.questionVersionId);
  const options = q.options.map((option, index) =>
    '<label class="option"><input type="radio" name="exam-answer" value="' + escape(option.optionId) + '" ' + (response.optionId === option.optionId ? 'checked' : '') + ' ' + (state.busy ? 'disabled' : '') + '><span class="option-letter">' + String.fromCharCode(65 + index) + '</span><span>' + escape(option.text) + '</span></label>'
  ).join('');
  const palette = questions.map(paletteButton).join('');
  const testing = run.assembly?.testingOnly === true;
  const mode = testing ? 'INTERNAL ENGINEERING TEST' : 'PRODUCTION MOCK';
  const position = state.questionIndex + 1;
  const total = questions.length;
  const reviewLabel = response.markedForReview ? 'Unmark review' : 'Mark for review';
  const questionStatus = response.markedForReview ? 'REVIEW' : response.optionId !== null ? 'ANSWERED' : 'UNANSWERED';
  return '<main id="main" class="exam-page exam-active"><div class="exam-topbar"><div><span class="eyebrow">' + mode + '</span><strong>' + escape(section.label || section.sectionId) + '</strong></div><div class="exam-timer"><span>Section time remaining</span><strong id="exam-countdown" role="timer" aria-live="off" aria-label="Section time remaining">--:--</strong><small>Server authoritative</small></div><button class="danger-outline" data-action="abandon" ' + (state.busy ? 'disabled' : '') + '>Abandon mock</button></div><div class="exam-layout"><aside class="exam-palette panel" aria-label="Current section question palette"><div class="section-heading"><div><span class="eyebrow">CURRENT SECTION</span><h2>' + escape(section.label || section.sectionId) + '</h2></div><span class="badge">' + total + ' Q</span></div><div class="exam-palette-grid" aria-label="Question navigation">' + palette + '</div><div class="exam-legend"><span><i class="answered" aria-hidden="true"></i>Answered</span><span><i class="review" aria-hidden="true"></i>Review</span><span><i aria-hidden="true"></i>Unanswered</span></div><p class="muted">You may move within this section. The next section opens only when the server timer closes this one.</p></aside><section class="panel exam-question" aria-labelledby="exam-question-stem"><div class="section-heading"><div><span class="eyebrow" id="exam-question-position">QUESTION ' + position + ' OF ' + total + '</span><small>' + escape(q.questionVersionId) + '</small></div><span class="badge">' + questionStatus + '</span></div>' + questionMedia(q.media) + '<fieldset aria-describedby="exam-question-position exam-autosave-note" ' + (state.busy ? 'disabled' : '') + '><legend id="exam-question-stem" tabindex="-1">' + escape(q.stem) + '</legend><div class="options">' + options + '</div></fieldset><div class="exam-question-actions"><button class="secondary" data-action="clear-answer" ' + (response.optionId === null || state.busy ? 'disabled' : '') + '>Clear response</button><button class="secondary" data-action="toggle-review" ' + (state.busy ? 'disabled' : '') + '>' + reviewLabel + '</button></div><div class="exam-navigation"><button class="secondary" data-action="previous" ' + (state.questionIndex === 0 || state.busy ? 'disabled' : '') + '>← Previous</button><span class="muted" id="exam-autosave-note">Answers autosave immediately. No answer key is shown during the exam.</span><button class="primary" data-action="next-question" ' + (state.questionIndex >= total - 1 || state.busy ? 'disabled' : '') + '>Next →</button></div></section></div></main>';
}

function autopsyView(autopsy) {
  if (!autopsy) return '<section class="panel"><p>Loading GT Autopsy…</p></section>';
  const sections = autopsy.sections.map(section =>
    '<tr><th>' + escape(section.label || section.sectionId) + '</th><td>' + section.correct + '</td><td>' + section.incorrect + '</td><td>' + section.unanswered + '</td><td>' + section.score + '</td></tr>'
  ).join('');
  const candidates = autopsy.prescription?.candidates?.length
    ? autopsy.prescription.candidates.map(item => {
        const params = new URLSearchParams({ concept: item.conceptId });
        return '<article class="autopsy-candidate"><div><strong>' + escape(item.label) + '</strong><p>' + item.observedIncorrect + ' incorrect · ' + item.observedUnanswered + ' unanswered in this GT</p></div><a class="secondary action-link" href="/web/vault.html?' + params.toString() + '">Review concept →</a></article>';
      }).join('')
    : '<p>No observed incorrect or unanswered concept candidates in this run.</p>';
  const visual = autopsy.visual || {};
  const behavior = autopsy.behavior || {};
  return '<section class="panel"><span class="eyebrow">GT AUTOPSY · DESCRIPTIVE V1</span><h2>Where the marks went</h2><p class="muted">This report describes this completed run. It does not infer mastery, fatigue, confidence or preventable marks.</p><div class="metrics"><div><strong>' + autopsy.result.score + '</strong><span>Score</span></div><div><strong>' + autopsy.result.correct + '</strong><span>Correct</span></div><div><strong>' + autopsy.result.incorrect + '</strong><span>Incorrect</span></div></div><div class="table-wrap"><table><thead><tr><th>Section</th><th>Correct</th><th>Incorrect</th><th>Unanswered</th><th>Score</th></tr></thead><tbody>' + sections + '</tbody></table></div></section><div class="two-column"><section class="panel"><span class="eyebrow">VISUAL QUESTIONS</span><h2>' + (visual.correct ?? 0) + ' correct of ' + (visual.questionCount ?? 0) + '</h2><p>' + (visual.incorrect ?? 0) + ' incorrect · ' + (visual.unanswered ?? 0) + ' unanswered</p><p class="muted">Modalities: ' + escape((visual.modalities || []).join(', ') || 'none') + '</p></section><section class="panel"><span class="eyebrow">ANSWER CHANGES</span><h2>' + (behavior.answerChangeCount ?? 0) + ' observed changes</h2><p>' + (behavior.beneficialChangeCount ?? 0) + ' beneficial · ' + (behavior.harmfulChangeCount ?? 0) + ' harmful · ' + (behavior.wrongToWrongChangeCount ?? 0) + ' wrong→wrong</p><p class="muted">Exact score impact from observed answer changes: ' + (behavior.answerChangeScoreImpact ?? 0) + ' marks.</p></section></div><section class="panel"><span class="eyebrow">NEXT REVIEW CANDIDATES</span><h2>Compress the misses.</h2><p class="muted">These are the most-observed misses in this completed GT, not causal diagnoses.</p><div class="autopsy-candidates">' + candidates + '</div></section>';
}

function completedView() {
  const run = state.run;
  const receipt = run?.receipt;
  const testing = run?.assembly?.testingOnly === true;
  const header = receipt
    ? '<section class="panel completion"><span class="eyebrow">' + (testing ? 'INTERNAL TEST COMPLETE' : 'MOCK COMPLETE') + '</span><h1>Exam submitted by the server clock.</h1><p>Score: <strong>' + escape(receipt.score) + '</strong> · ' + escape(receipt.correct) + ' correct · ' + escape(receipt.incorrect) + ' incorrect · ' + escape(receipt.unanswered) + ' unanswered.</p>' + (testing ? '<p class="muted">Engineering-test content is not production-equivalent.</p>' : '') + '</section>'
    : '<section class="panel"><h1>Exam completed.</h1><p>Loading immutable completion receipt…</p></section>';
  const autopsy = state.autopsyError
    ? '<section class="panel"><h2>GT Autopsy unavailable</h2><p>' + escape(state.autopsyError) + '</p><button class="secondary" data-action="load-autopsy">Retry autopsy</button></section>'
    : autopsyView(state.autopsy);
  return '<main id="main" class="exam-page"><a class="text-button" href="/web/medical.html">← Medical study</a>' + header + autopsy + '<section class="panel"><button class="secondary" data-action="exam-home">Back to Exam Mode</button></section></main>';
}

function cancelledView() {
  const reason = state.run?.termination?.reason === 'user_abandoned'
    ? 'You ended this mock before completion.'
    : 'This mock was cancelled before completion.';
  return '<main id="main" class="exam-page"><a class="text-button" href="/web/medical.html">← Medical study</a><section class="panel completion"><span class="eyebrow">MOCK ENDED</span><h1>No completion score was created.</h1><p>' + escape(reason) + '</p><p class="muted">Recorded answers remain in the exam-run ledger, but a cancelled run is not treated as a completed GT and receives no GT Autopsy.</p><button class="primary" data-action="exam-home">Return to Exam Mode →</button></section></main>';
}

function restoreFocus({ focusQuestion = false, focusAction = null, focusOptionId } = {}) {
  if (!focusQuestion && !focusAction && focusOptionId === undefined) return;
  requestAnimationFrame(() => {
    let target = null;
    if (focusOptionId !== undefined && focusOptionId !== null) {
      target = Array.from(root.querySelectorAll('input[name="exam-answer"]')).find(input => input.value === focusOptionId) || null;
    }
    if (!target && focusAction) target = root.querySelector('[data-action="' + focusAction + '"]');
    if (!target && focusQuestion) target = root.querySelector('#exam-question-stem');
    if (target && !target.disabled) target.focus({ preventScroll:true });
  });
}

function render(focus = {}) {
  if (!state.user) root.innerHTML = signedOutView();
  else if (state.run?.status === 'in_progress') root.innerHTML = runView();
  else if (state.run?.status === 'completed') root.innerHTML = completedView();
  else if (state.run?.status === 'cancelled') root.innerHTML = cancelledView();
  else root.innerHTML = homeView();
  scheduleClock();
  restoreFocus(focus);
}

function setRun(run) {
  state.run = run;
  if (run?.serverNow && Number.isFinite(Date.parse(run.serverNow))) {
    state.serverOffsetMs = Date.parse(run.serverNow) - Date.now();
  }
  const questions = run?.currentSection?.questions;
  if (!Array.isArray(questions) || !questions.length) state.questionIndex = 0;
  else state.questionIndex = Math.min(state.questionIndex, questions.length - 1);
}

function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

function tickClock() {
  const node = document.querySelector('#exam-countdown');
  const end = Date.parse(state.run?.currentSection?.scheduledEndAt || '');
  if (!node || !Number.isFinite(end)) return;
  const remaining = end - (Date.now() + state.serverOffsetMs);
  node.textContent = formatRemaining(remaining);
  if (remaining <= 0 && !clockSyncing) {
    clockSyncing = true;
    refreshRun().finally(() => { clockSyncing = false; });
  }
}

function scheduleClock() {
  if (timerId) clearInterval(timerId);
  timerId = null;
  if (state.run?.status !== 'in_progress' || !state.run.currentSection) return;
  tickClock();
  timerId = setInterval(tickClock, 1000);
}

async function loadReadiness() {
  let productionReadiness = null;
  let productionReadinessError = null;
  let testReadiness = null;
  let testReadinessError = null;
  let internalTestAllowed = false;

  try {
    productionReadiness = await cloud.examSimulatorReadiness(RULE_SET_ID);
  } catch (error) {
    reportUnexpected(error, 'production_readiness');
    productionReadinessError = error.code || error.message || 'production_readiness_unavailable';
  }

  try {
    testReadiness = await cloud.examSimulatorTestReadiness(RULE_SET_ID);
    internalTestAllowed = true;
  } catch (error) {
    if (Number(error?.status) === 403 && error?.code === 'internal_exam_test_forbidden') {
      internalTestAllowed = false;
    } else {
      reportUnexpected(error, 'test_readiness');
      testReadinessError = error.code || error.message || 'test_readiness_unavailable';
    }
  }

  state = {
    ...state,
    productionReadiness,
    productionReadinessError,
    testReadiness,
    testReadinessError,
    internalTestAllowed
  };
}

async function loadAutopsy() {
  const runId = state.run?.runId;
  if (!runId || state.run?.status !== 'completed' || state.autopsy || state.busy) return;
  state.busy = true;
  render();
  try {
    const autopsy = await cloud.examRunAutopsy(runId);
    state = { ...state, busy:false, autopsy, autopsyError:null };
  } catch (error) {
    reportUnexpected(error, 'load_autopsy');
    state = { ...state, busy:false, autopsyError:error.code || error.message || 'gt_autopsy_unavailable' };
  }
  render();
}

async function bootstrap() {
  if (!state.user) {
    render();
    return;
  }
  state = { ...state, loading:true, error:null };
  render();
  try {
    const session = await auth.getSession();
    if (!session?.user) {
      state = { ...state, user:null, loading:false };
      render();
      return;
    }
    state.user = auth.currentUser() || session.user;
    const current = await cloud.resumeExamRun();
    if (current?.runId) {
      state.loading = false;
      setRun(current);
      render({ focusQuestion:current.status === 'in_progress' });
      if (current.status === 'completed') await loadAutopsy();
      return;
    }
    await loadReadiness();
    state.loading = false;
  } catch (error) {
    reportUnexpected(error, 'bootstrap');
    state = { ...state, loading:false, error:error.code || error.message || 'exam_mode_unavailable' };
  }
  render();
}

async function startRun(testing) {
  if (state.busy) return;
  const label = testing ? 'internal engineering mock' : 'full mock';
  if (!window.confirm('Start the ' + label + '? Each section is locked to its server timer and cannot be reopened after it closes.')) return;
  state.busy = true;
  render();
  try {
    const run = testing
      ? await cloud.startTestExamRun(RULE_SET_ID)
      : await cloud.startExamRun(RULE_SET_ID);
    state = { ...state, busy:false, autopsy:null, autopsyError:null, questionIndex:0, error:null };
    setRun(run);
  } catch (error) {
    reportUnexpected(error, testing ? 'start_test_exam' : 'start_exam');
    state = { ...state, busy:false, error:error.code || error.message || 'exam_start_failed' };
    announce('Exam did not start: ' + state.error + '.');
  }
  render({ focusQuestion:state.run?.status === 'in_progress' });
}

async function refreshRun() {
  const runId = state.run?.runId;
  if (!runId || state.busy) return;
  state.busy = true;
  try {
    const run = await cloud.examRun(runId);
    const priorSection = state.run?.progress?.currentSectionIndex;
    state.busy = false;
    setRun(run);
    const sectionChanged = run.progress?.currentSectionIndex !== priorSection;
    if (sectionChanged) state.questionIndex = 0;
    if (run.status === 'completed') {
      render();
      await loadAutopsy();
      return;
    }
    render({ focusQuestion:sectionChanged });
    return;
  } catch (error) {
    reportUnexpected(error, 'refresh_exam_run');
    state = { ...state, busy:false, error:error.code || error.message || 'exam_refresh_failed' };
    announce('Exam state refresh failed: ' + state.error + '.');
  }
  render();
}

async function setAnswer(optionId) {
  const run = state.run;
  const q = currentQuestion();
  if (!run || !q || run.status !== 'in_progress' || state.busy) return;
  state.busy = true;
  render();
  try {
    const updated = await cloud.setExamRunAnswer(run.runId, {
      requestId:'exam-answer:' + crypto.randomUUID(),
      expectedRevision:run.revision,
      questionVersionId:q.questionVersionId,
      optionId
    });
    state.busy = false;
    setRun(updated);
  } catch (error) {
    reportUnexpected(error, 'set_exam_answer');
    state.busy = false;
    await refreshRun();
    announce('Answer was not confirmed. The server state has been refreshed.');
    return;
  }
  render(optionId === null ? { focusQuestion:true } : { focusOptionId:optionId });
}

async function toggleReview() {
  const run = state.run;
  const q = currentQuestion();
  if (!run || !q || run.status !== 'in_progress' || state.busy) return;
  const current = responseFor(q.questionVersionId).markedForReview === true;
  state.busy = true;
  render();
  try {
    const updated = await cloud.setExamRunReview(run.runId, {
      requestId:'exam-review:' + crypto.randomUUID(),
      expectedRevision:run.revision,
      questionVersionId:q.questionVersionId,
      markedForReview:!current
    });
    state.busy = false;
    setRun(updated);
  } catch (error) {
    reportUnexpected(error, 'set_exam_review');
    state.busy = false;
    await refreshRun();
    announce('Review flag was not confirmed. The server state has been refreshed.');
    return;
  }
  render({ focusAction:'toggle-review' });
}

async function abandonRun() {
  const run = state.run;
  if (!run || run.status !== 'in_progress' || state.busy) return;
  if (!window.confirm('Abandon this mock? You will not receive a completion score or GT Autopsy.')) return;
  state.busy = true;
  render();
  try {
    const updated = await cloud.cancelExamRun(run.runId, {
      requestId:'exam-cancel:' + crypto.randomUUID(),
      expectedRevision:run.revision
    });
    state.busy = false;
    setRun(updated);
  } catch (error) {
    reportUnexpected(error, 'cancel_exam');
    state.busy = false;
    await refreshRun();
    announce('Cancellation was not confirmed. The server state has been refreshed.');
    return;
  }
  render();
}

root.addEventListener('change', event => {
  const input = event.target.closest('input[name="exam-answer"]');
  if (!input || state.busy) return;
  setAnswer(input.value);
});

root.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  event.preventDefault();
  const action = target.dataset.action;
  if (action === 'reload') bootstrap();
  if (action === 'start-production') startRun(false);
  if (action === 'start-test') startRun(true);
  if (action === 'refresh-run') refreshRun();
  if (action === 'clear-answer') setAnswer(null);
  if (action === 'toggle-review') toggleReview();
  if (action === 'previous') {
    state.questionIndex = Math.max(0, state.questionIndex - 1);
    render({ focusQuestion:true });
  }
  if (action === 'next-question') {
    const total = state.run?.currentSection?.questions?.length ?? 0;
    state.questionIndex = Math.min(Math.max(0, total - 1), state.questionIndex + 1);
    render({ focusQuestion:true });
  }
  if (action === 'jump') {
    const index = Number(target.dataset.index);
    if (Number.isInteger(index) && index >= 0 && index < (state.run?.currentSection?.questions?.length ?? 0)) {
      state.questionIndex = index;
      render({ focusQuestion:true });
    }
  }
  if (action === 'abandon') abandonRun();
  if (action === 'load-autopsy') loadAutopsy();
  if (action === 'exam-home') {
    state = { ...state, run:null, autopsy:null, autopsyError:null, questionIndex:0, error:null };
    loadReadiness().then(render);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.run?.status === 'in_progress') refreshRun();
});

bootstrap();
