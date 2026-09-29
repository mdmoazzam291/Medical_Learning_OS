import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudStudy } from '/src/adapters/cloud-study.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';

const root = document.querySelector('#medical-app');
const notice = document.querySelector('#notice');
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const auth = createSupabaseAuth({ ...cloudConfig, storage: localStorage });
const cloud = createCloudStudy({ ...cloudConfig, auth });
const requestedStudyNowValue = Number(new URLSearchParams(location.search).get('studyNow'));
let requestedStudyNowMinutes = [10, 20, 30, 60].includes(requestedStudyNowValue) ? requestedStudyNowValue : null;

let state = {
  user: auth.currentUser(),
  loading: false,
  busy: false,
  questions: [],
  progress: null,
  revision: null,
  revisionError: null,
  examReadiness: null,
  examReadinessError: null,
  session: null,
  selectedOptionId: null,
  receipt: null,
  memoryJudgment: null,
  studyNowIntegrity: null,
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
      component: 'medical-study',
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
    const label = 'Medical ' + modality + ' image ' + (index + 1);
    if (!url) {
      return '<div class="question-media-unavailable" role="status"><strong>Image unavailable.</strong><span>This question requires a verified media delivery URL.</span></div>';
    }
    return '<figure class="question-media"><img src="' + escape(url) + '" alt="' + escape(label) + '" loading="eager" decoding="async" referrerpolicy="no-referrer"><figcaption>' + modality + ' · blind first look</figcaption></figure>';
  }).join('');
  return '<div class="question-media-list" aria-label="Question media">' + items + '</div>';
}

function visualDetectionDescriptor(question) {
  const descriptor = question?.visualInteraction;
  if (descriptor?.schemaVersion !== 1 ||
      descriptor?.taskType !== 'detection' ||
      typeof descriptor?.mediaAssetVersionId !== 'string') {
    return null;
  }
  if (!Array.isArray(question?.media) ||
      !question.media.some(item => item?.mediaAssetVersionId === descriptor.mediaAssetVersionId)) {
    return null;
  }
  return descriptor;
}

function safeSourceLink(source) {
  if (!source?.url) return escape(source?.title || source?.sourceId || 'Source');
  try {
    const url = new URL(source.url);
    if (!['https:', 'http:'].includes(url.protocol)) return escape(source?.title || source?.sourceId || 'Source');
    return '<a href="' + escape(url.href) + '" target="_blank" rel="noopener noreferrer">' + escape(source?.title || source?.sourceId || 'Source') + ' ↗</a>';
  } catch {
    return escape(source?.title || source?.sourceId || 'Source');
  }
}

function canonicalTeachingFeedback(receipt) {
  const teaching = receipt?.teaching;
  const decision = receipt?.teachingDecision;
  if (receipt?.event?.correct !== false ||
      decision?.policyId !== 'post-answer-canonical-v1' ||
      decision?.teachingAction !== 'concise_explanation' ||
      teaching?.contractId !== 'grounded-teaching-output' ||
      teaching?.contractVersion !== '1' ||
      teaching?.renderStatus !== 'ready' ||
      teaching?.sourceMode !== 'canonical_fallback' ||
      teaching?.teachingAction !== 'concise_explanation' ||
      !Array.isArray(teaching?.claims) ||
      !teaching.claims.length) {
    return null;
  }

  const claimText = teaching.claims
    .filter(claim => claim?.role === 'explanation' && typeof claim?.text === 'string')
    .map(claim => '<p>' + escape(claim.text) + '</p>')
    .join('');
  if (!claimText) return null;

  const nextPrompt = typeof teaching.nextPrompt === 'string' && teaching.nextPrompt.trim()
    ? '<div class="memory-rating"><strong>Quick retrieval</strong><p>' + escape(teaching.nextPrompt) + '</p></div>'
    : '';

  return '<div class="grounded-teaching"><span class="eyebrow">REVIEWED TEACHING</span><h2>Incorrect. ' +
    escape(teaching.headline || 'Review the reasoning.') + '</h2>' + claimText + nextPrompt + '</div>';
}

function signedOut() {
  return '<main id="main" class="account-page"><a class="text-button" href="/web/account.html">← Cloud account</a><div class="page-heading"><div><span class="eyebrow">MEDICAL QBANK</span><h1>Sign in to study reviewed medical content.</h1><p>The medical QBank uses your authenticated learner identity and server-side scoring.</p></div><span class="badge">M04c</span></div><section class="panel"><a class="primary action-link" href="/web/account.html">Open cloud account →</a></section></main>';
}

function overview() {
  const p = state.progress || {};
  const revision = state.revision;
  const nextDue = revision?.nextDueAt
    ? new Date(revision.nextDueAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : null;
  const studyNowControls = revision && (revision.dueCount || revision.unseenCount)
    ? '<div class="study-now-controls"><strong>Study Now</strong><p>How much uninterrupted time do you have?</p><div class="button-row">' + [10, 20, 30, 60].map(minutes => '<button class="secondary" data-action="study-now" data-minutes="' + minutes + '">' + minutes + ' min</button>').join('') + '</div></div>'
    : '';
  const revisionPanel = state.revisionError
    ? '<section class="panel"><span class="eyebrow">REVISION</span><h2>Schedule temporarily unavailable.</h2><p>The medical QBank still works. Revision state will rebuild from immutable attempts when the service is available.</p></section>'
    : revision
      ? '<section class="panel"><span class="eyebrow">REVISION & STUDY NOW · PROVISIONAL</span><h2>' + revision.dueCount + ' due now</h2><p>' + (revision.dueCount ? 'Due items are ready for review.' : nextDue ? 'Next scheduled review: ' + escape(nextDue) + '.' : 'No scheduled review yet.') + (revision.unseenCount ? ' ' + revision.unseenCount + ' unseen published question' + (revision.unseenCount === 1 ? ' is' : 's are') + ' available for new learning.' : '') + '</p>' + studyNowControls + '<p class="muted">Scheduling state is not a mastery score. Study Now uses explainable candidate classes, not one opaque ranking number. Revision policy: ' + escape(revision.policy?.id || 'unknown') + '.</p></section>'
      : '';
  const exam = state.examReadiness;
  const examPanel = state.examReadinessError
    ? '<section class="panel"><span class="eyebrow">NEET-PG FULL MOCK</span><h2>Readiness temporarily unavailable.</h2><p>The QBank and Study Now remain available.</p></section>'
    : exam
      ? '<section class="panel"><span class="eyebrow">NEET-PG FULL MOCK · RULESET ' + escape(exam.ruleSetId) + '</span><h2>' + exam.eligibleUniqueQuestions + ' / ' + exam.requiredUniqueQuestions + ' unique reviewed questions ready</h2><p>' + (exam.ready ? 'The content-capacity gate has passed.' : exam.shortage + ' more distinct published questions are required before a full mock can start.') + '</p><p class="muted">Timing and navigation use the verified published scheme. Current content assembly is an unstratified reviewed pool and does not claim exam-blueprint fidelity.</p><a class="secondary action-link" href="/web/exam.html">Open Exam Mode →</a></section>'
      : '';
  const list = state.questions.map((q, index) =>
    '<article><span class="number">' + String(index + 1).padStart(2, '0') + '</span><div><span class="eyebrow">PUBLISHED MEDICAL</span><h2>' + escape(q.stem) + '</h2><small>' + escape(q.questionVersionId) + '</small></div></article>'
  ).join('');
  const status = state.loading
    ? '<section class="panel"><p>Loading published medical content…</p></section>'
    : state.error
      ? '<section class="panel"><h2>Medical QBank unavailable</h2><p>' + escape(state.error) + '</p><button class="secondary" data-action="reload">Retry</button></section>'
      : '<section class="panel"><div class="metrics"><div><strong>' + (p.attempts ?? 0) + '</strong><span>Server attempts</span></div><div><strong>' + (p.correct ?? 0) + '</strong><span>Correct</span></div><div><strong>' + state.questions.length + '</strong><span>Published questions</span></div></div></section><section class="panel"><div class="section-heading"><div><span class="eyebrow">REVIEWED CONTENT ONLY</span><h2>Medical QBank</h2></div><button class="primary" data-action="start" ' + (state.questions.length && !state.busy ? '' : 'disabled') + '>Start / resume session →</button></div><div class="question-list">' + (list || '<div class="empty"><h2>No published medical questions.</h2><p>Draft and in-review content are excluded.</p></div>') + '</div></section>';

  return '<main id="main" class="account-page"><a class="text-button" href="/web/account.html">← Cloud account</a><div class="page-heading"><div><span class="eyebrow">AUTHENTICATED MEDICAL STUDY</span><h1>Only reviewed, published versions enter this loop.</h1><p>' + escape(state.user?.email || 'Authenticated learner') + ' · scoring and attempt persistence stay server-side.</p></div><span class="badge">M05</span></div>' + status + revisionPanel + examPanel + '</main>';
}

function studyView() {
  const session = state.session;
  if (!session) return overview();
  if (session.closed) {
    const integrity = state.studyNowIntegrity?.latestRecommendation;
    const sameStudyNowSession = integrity?.sessionId === session.sessionId;
    const integrityCopy = sameStudyNowSession
      ? integrity.evidenceChainComplete
        ? '<div class="memory-rating"><strong>Study Now loop verified.</strong><p class="muted">Recommended items, persisted answers and authoritative reschedule evidence are linked for this session.' +
          (integrity.hostedM05cGateSatisfied ? ' Hosted browser answer evidence is also present.' : '') + '</p></div>'
        : '<div class="memory-rating"><strong>Study evidence saved; integrity reconciliation is incomplete.</strong><p class="muted">' + escape((integrity.blockers || []).join(' · ')) + '</p></div>'
      : '';
    return '<main id="main" class="account-page"><a class="text-button" href="/web/account.html">← Cloud account</a><section class="panel completion"><span class="eyebrow">MEDICAL SESSION COMPLETE</span><h1>Your server evidence is saved.</h1><p>The attempt ledger is attached to your authenticated learner account.</p>' + integrityCopy + '<button class="primary" data-action="reload">Back to medical QBank →</button></section></main>';
  }
  if (!session.question) {
    return '<main id="main" class="account-page"><a class="text-button" href="/web/account.html">← Cloud account</a><section class="panel"><h1>Question unavailable.</h1><p>' + escape(session.blocked || 'question_unavailable') + '</p></section></main>';
  }

  const q = session.question;
  const visualDetection = visualDetectionDescriptor(q);
  const receipt = state.receipt || session.receipt || null;
  const selected = receipt?.selectedOptionId || state.selectedOptionId;
  const answered = Boolean(receipt);
  const memoryJudgment = state.memoryJudgment || session.memoryJudgment || null;
  const options = q.options.map((option, index) => {
    let cls = 'option';
    if (answered && option.optionId === receipt.answerOptionId) cls += ' correct';
    const chosen = option.optionId === selected;
    return '<label class="' + cls + '"><input type="radio" name="answer" value="' + escape(option.optionId) + '" ' + (chosen ? 'checked' : '') + ' ' + (answered || state.busy ? 'disabled' : '') + '><span class="option-letter">' + String.fromCharCode(65 + index) + '</span><span>' + escape(option.text) + '</span>' + (answered && option.optionId === receipt.answerOptionId ? '<b>Correct answer</b>' : '') + '</label>';
  }).join('');

  const memoryPrompt = answered
    ? memoryJudgment
      ? '<div class="memory-rating"><strong>Memory signal saved: ' + escape(memoryJudgment.ratingLabel) + '</strong><p class="muted">Self-reported recall evidence · optional · separate from correctness.</p></div>'
      : '<div class="memory-rating"><strong>How did recall feel before seeing the answer?</strong><p class="muted">Optional memory signal. It does not change your score or block Next.</p><div class="button-row">' + [[1, 'Again'], [2, 'Hard'], [3, 'Good'], [4, 'Easy']].map(([rating, label]) => '<button class="secondary" type="button" data-action="memory-rating" data-rating="' + rating + '" ' + (state.busy ? 'disabled' : '') + '>' + label + '</button>').join('') + '</div></div>'
    : '';

  const primaryConceptId = q.conceptId || q.conceptLinks?.find(link => link?.role === 'primary')?.conceptId || null;
  const recommendationContext = session.recommendationContext || null;
  const recommendationCopy = {
    'mistake-repair': {
      label: 'Mistake repair',
      detail: 'Study Now selected this because the latest prior answer was incorrect and the review was due.'
    },
    'due-revision': {
      label: 'Due revision',
      detail: 'Study Now selected this because its scheduled review was due.'
    },
    'new-learning': {
      label: 'New learning',
      detail: 'Study Now selected this as unseen published material after due work fit your available time.'
    }
  };
  const recommendationReason = recommendationCopy[recommendationContext?.reason] ? recommendationContext.reason : null;
  const recommendationBanner = answered && recommendationReason
    ? '<div class="memory-rating"><strong>Why Study Now sent this: ' + escape(recommendationCopy[recommendationReason].label) + '</strong><p class="muted">' + escape(recommendationCopy[recommendationReason].detail) + '</p></div>'
    : '';
  const vaultParams = primaryConceptId ? new URLSearchParams({ concept: primaryConceptId }) : null;
  if (vaultParams && answered) {
    vaultParams.set('correctionTargetType', 'question_version');
    vaultParams.set('correctionTargetId', q.questionVersionId);
  }
  if (vaultParams && answered && recommendationReason) {
    vaultParams.set('from', 'study-now');
    vaultParams.set('reason', recommendationReason);
  }
  const vaultLink = vaultParams
    ? '<a class="text-button" href="/web/vault.html?' + vaultParams.toString() + '">' + (recommendationReason ? 'Review concept / add private correction →' : 'Open concept / add private correction →') + '</a>'
    : '';
  const canonicalTeaching = answered ? canonicalTeachingFeedback(receipt) : null;
  const answerExplanation = answered
    ? canonicalTeaching || (
        '<div><h2>' + (receipt.event?.correct ? 'Correct.' : 'Incorrect. Review the reasoning.') +
        '</h2><p>' + escape(receipt.explanation || '') + '</p></div>'
      )
    : '';
  const visualEvidence = answered && receipt?.visualDetection
    ? '<div class="visual-evidence-status"><strong>Visual recognition evidence saved.</strong><span>Image-specific evidence is stored separately from your scored question attempt.</span></div>'
    : '';
  const feedback = answered
    ? '<div class="explanation" role="status">' + answerExplanation + '<div><strong>Sources</strong><p>' + (Array.isArray(receipt.sources) && receipt.sources.length ? receipt.sources.map(safeSourceLink).join(' · ') : 'No source links returned.') + '</p></div>' + visualEvidence + recommendationBanner + vaultLink + '</div>' + memoryPrompt + '<button class="primary" type="button" data-action="next" ' + (state.busy ? 'disabled' : '') + '>' + (session.position + 1 >= session.total ? 'Finish session →' : 'Next question →') + '</button>'
    : '<button class="primary" type="submit" ' + (!selected || state.busy ? 'disabled' : '') + '>Check answer →</button>';
  const taskLabel = visualDetection ? 'IMAGE RECOGNITION · SERVER SCORED' : 'MEDICAL QBANK';
  const taskNote = visualDetection
    ? '<p class="visual-task-note">Recognition task. Your option is scored on the server; image evidence is recorded only after the canonical attempt is accepted.</p>'
    : '';

  return '<main id="main" class="account-page"><a class="text-button" href="/web/account.html">← Pause to cloud account</a><div class="section-heading"><div><span class="eyebrow">' + taskLabel + '</span><p>Question ' + (session.position + 1) + ' of ' + session.total + '</p></div><span class="badge">SERVER SCORED</span></div><section class="panel study">' + taskNote + '<form id="medical-answer-form">' + questionMedia(q.media) + '<fieldset ' + (answered || state.busy ? 'disabled' : '') + '><legend>' + escape(q.stem) + '</legend><div class="options">' + options + '</div></fieldset>' + feedback + '</form><p class="muted">Answer keys and explanations are revealed only after the server records the attempt.</p></section></main>';
}

function render() {
  if (!state.user) root.innerHTML = signedOut();
  else root.innerHTML = state.session ? studyView() : overview();
}

async function loadOverview() {
  state = { ...state, loading: true, error: null, session: null, selectedOptionId: null, receipt: null, memoryJudgment: null, studyNowIntegrity: null };
  render();
  try {
    const session = await auth.getSession();
    if (!session?.user) {
      state = { ...state, user: null, loading: false };
      render();
      return;
    }
    const [questions, progress] = await Promise.all([cloud.questions('all'), cloud.progress()]);
    let revision = null;
    let revisionError = null;
    try {
      revision = await cloud.due(15);
    } catch (error) {
      reportUnexpected(error, 'load_revision_due');
      revisionError = error.code || error.message || 'revision_unavailable';
    }
    let examReadiness = null;
    let examReadinessError = null;
    try {
      examReadiness = await cloud.examSimulatorReadiness('neet-pg:2026@1');
    } catch (error) {
      reportUnexpected(error, 'load_exam_readiness');
      examReadinessError = error.code || error.message || 'exam_readiness_unavailable';
    }
    state = {
      ...state,
      user: auth.currentUser() || session.user,
      loading: false,
      questions: Array.isArray(questions?.questions) ? questions.questions : [],
      progress,
      revision,
      revisionError,
      examReadiness,
      examReadinessError,
      error: null
    };
  } catch (error) {
    reportUnexpected(error, 'load_overview');
    state = { ...state, loading: false, error: error.code || error.message || 'medical_qbank_unavailable' };
  }
  render();
}

async function startStudyNow(availableMinutes) {
  if (state.busy) return;
  state.busy = true;
  render();
  try {
    const result = await cloud.studyNow(availableMinutes, 50);
    if (!result.session) {
      state.busy = false;
      announce('Nothing is currently recommended inside this Study Now window. Future reviews were not pulled early.');
      await loadOverview();
      return;
    }
    state = {
      ...state,
      busy: false,
      session: result.session,
      selectedOptionId: result.session.receipt?.selectedOptionId || null,
      receipt: result.session.receipt || null,
      memoryJudgment: result.session.memoryJudgment || null,
      error: null
    };
    if (result.plan?.resumedExisting === true) {
      announce(result.session.receipt
        ? 'Resumed your unfinished Study Now session. This question was already answered earlier; review the saved feedback, then finish or continue.'
        : 'Resumed your unfinished Study Now session.');
    }
  } catch (error) {
    reportUnexpected(error, 'start_study_now');
    state = { ...state, busy: false, error: error.code || error.message || 'study_now_failed' };
    announce('Study Now could not start: ' + state.error + '.');
  }
  render();
}

async function startSession() {
  state.busy = true;
  render();
  try {
    const session = await cloud.start({ limit: 15, filter: 'all' });
    state = {
      ...state,
      busy: false,
      session,
      selectedOptionId: session.receipt?.selectedOptionId || null,
      receipt: session.receipt || null,
      memoryJudgment: session.memoryJudgment || null,
      error: null
    };
  } catch (error) {
    reportUnexpected(error, 'start_session');
    state = { ...state, busy: false, error: error.code || error.message || 'study_start_failed' };
    announce('Medical session could not start: ' + state.error + '.');
  }
  render();
}

async function answerCurrent() {
  const session = state.session;
  const optionId = state.selectedOptionId;
  if (!session || !optionId || state.busy) return;
  const requestId = 'medical:' + session.sessionId + ':' + session.position;
  state.busy = true;
  render();
  try {
    const visualDetection = visualDetectionDescriptor(session.question);
    let receipt;
    if (visualDetection) {
      const result = await cloud.visualDetection(session.sessionId, {
        requestId,
        position: session.position,
        optionId,
        mediaAssetVersionId: visualDetection.mediaAssetVersionId,
        helpUsed: false,
        interventionRef: null
      });
      receipt = result.attemptReceipt;
      if (!receipt?.event?.eventId || !result?.visualReceipt?.eventId) {
        throw new Error('visual_detection_receipt_invalid');
      }
    } else {
      receipt = await cloud.answer(session.sessionId, {
        requestId,
        position: session.position,
        optionId
      });
    }
    state = { ...state, busy: false, receipt, memoryJudgment: null, error: null };
    await refreshProgressAfterWrite('Answer saved.');
  } catch (error) {
    reportUnexpected(error, visualDetectionDescriptor(session?.question) ? 'record_visual_detection' : 'record_answer');
    state = { ...state, busy: false, error: error.code || error.message || 'answer_write_failed' };
    announce('Answer was not confirmed: ' + state.error + '. Your selection is preserved; retry uses the same idempotency key.');
  }
  render();
}

async function refreshProgressAfterWrite(confirmation) {
  try {
    state.progress = await cloud.progress();
  } catch (error) {
    reportUnexpected(error, 'refresh_progress_after_write');
    // The canonical write was already acknowledged. A projection read cannot
    // turn that receipt into a failed answer or session transition.
    announce(confirmation + ' Progress totals are temporarily unavailable.');
  }
}

async function recordMemoryRating(rating) {
  const attemptId = state.receipt?.event?.eventId;
  if (!attemptId || state.memoryJudgment || state.busy) return;
  state.busy = true;
  render();
  try {
    const memoryJudgment = await cloud.memoryJudgment(attemptId, rating);
    state = { ...state, busy: false, memoryJudgment, error: null };
    announce('Memory signal saved: ' + memoryJudgment.ratingLabel + '.');
  } catch (error) {
    reportUnexpected(error, 'record_memory_judgment');
    state = { ...state, busy: false, error: error.code || error.message || 'memory_judgment_failed' };
    announce('Memory signal was not saved: ' + state.error + '. You can continue without it.');
  }
  render();
}

async function nextQuestion() {
  const session = state.session;
  if (!session || !state.receipt || state.busy) return;
  state.busy = true;
  render();
  try {
    const next = await cloud.next(session.sessionId, session.position);
    state = {
      ...state,
      busy: false,
      session: next,
      selectedOptionId: next.receipt?.selectedOptionId || null,
      receipt: next.receipt || null,
      memoryJudgment: next.memoryJudgment || null,
      error: null
    };
    if (next.closed) {
      await refreshProgressAfterWrite('Session complete.');
      try {
        state.studyNowIntegrity = await cloud.studyNowIntegrity();
      } catch (error) {
        reportUnexpected(error, 'load_study_now_integrity');
        state.studyNowIntegrity = null;
      }
    }
  } catch (error) {
    reportUnexpected(error, 'advance_session');
    state = { ...state, busy: false, error: error.code || error.message || 'study_advance_failed' };
    announce('Session did not advance: ' + state.error + '. Retry is safe.');
  }
  render();
}

root.addEventListener('change', event => {
  const input = event.target.closest('input[name="answer"]');
  if (!input || state.receipt || state.busy) return;
  state.selectedOptionId = input.value;
  render();
});

root.addEventListener('submit', event => {
  if (event.target.id !== 'medical-answer-form') return;
  event.preventDefault();
  answerCurrent();
});

root.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  event.preventDefault();
  if (target.dataset.action === 'start') startSession();
  if (target.dataset.action === 'study-now') startStudyNow(Number(target.dataset.minutes));
  if (target.dataset.action === 'memory-rating') recordMemoryRating(Number(target.dataset.rating));
  if (target.dataset.action === 'next') nextQuestion();
  if (target.dataset.action === 'reload') loadOverview();
});

async function bootstrap() {
  if (!state.user) {
    render();
    return;
  }
  await loadOverview();
  if (requestedStudyNowMinutes && state.user && !state.session) {
    const minutes = requestedStudyNowMinutes;
    requestedStudyNowMinutes = null;
    const nextUrl = new URL(location.href);
    nextUrl.searchParams.delete('studyNow');
    history.replaceState(null, '', nextUrl.pathname + nextUrl.search + nextUrl.hash);
    await startStudyNow(minutes);
  }
}

render();
bootstrap();
