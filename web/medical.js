import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudStudy } from '/src/adapters/cloud-study.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';

const root = document.querySelector('#medical-app');
const notice = document.querySelector('#notice');
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const auth = createSupabaseAuth({ ...cloudConfig });
const cloud = createCloudStudy({ ...cloudConfig, auth });
const requestedStudyNowValue = Number(new URLSearchParams(location.search).get('studyNow'));
let requestedStudyNowMinutes = [10, 20, 30, 60].includes(requestedStudyNowValue) ? requestedStudyNowValue : null;
const requestedResumeId = new URLSearchParams(location.search).get('resume');
const requestedSummaryId = new URLSearchParams(location.search).get('summary');

let studyMinutes = 20;
try {
  const savedMinutes = Number(localStorage.getItem('mlos-study-duration-v1'));
  if ([10, 20, 30, 60].includes(savedMinutes)) studyMinutes = savedMinutes;
} catch { /* A preference outage never blocks study. */ }

let state = {
  user: auth.currentUser(),
  loading: false,
  busy: false,
  questions: [],
  questionsAvailable: false,
  progress: null,
  revision: null,
  revisionError: null,
  examReadiness: null,
  examReadinessError: null,
  session: null,
  sessionEntry: null,
  selectedOptionId: null,
  receipt: null,
  memoryJudgment: null,
  studyNowIntegrity: null,
  sessionSummary: null,
  summaryLoading: false,
  summaryError: null,
  error: null
};

function announce(message) {
  notice.textContent = message;
  notice.insertAdjacentHTML?.('beforeend', '<button class="notice-dismiss" type="button" data-dismiss-notice aria-label="Dismiss message">Dismiss</button>');
  notice.hidden = false;
}

notice.addEventListener?.('click', event => {
  if (!event.target.closest('[data-dismiss-notice]')) return;
  notice.hidden = true;
  notice.textContent = '';
  const destination = root.querySelector?.('.completion .primary, #answer-feedback-title, #study-entry-title');
  if (destination && !destination.matches('a[href], button, [tabindex]')) destination.setAttribute('tabindex', '-1');
  destination?.focus({ preventScroll: true });
});

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

  return '<div class="grounded-teaching"><span class="eyebrow">REVIEWED TEACHING</span><h2>' +
    escape(teaching.headline || 'Review the reasoning.') + '</h2>' + claimText + nextPrompt + '</div>';
}

function signedOut() {
  return '<main id="main" class="account-page"><a class="text-button" href="/web/account.html">← Cloud account</a><div class="page-heading"><div><span class="eyebrow">MEDICAL QBANK</span><h1>Sign in to study reviewed medical content.</h1><p>The medical QBank uses your authenticated learner identity and server-side scoring.</p></div><span class="badge">M04c</span></div><section class="panel"><a class="primary action-link" href="/web/account.html">Open cloud account →</a></section></main>';
}

function overview() {
  const p = state.progress;
  const revision = state.revision;
  const nextDue = revision?.nextDueAt
    ? new Date(revision.nextDueAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : null;
  const hasWork = Boolean(revision && (revision.dueCount || revision.unseenCount));
  const heading = state.busy ? 'Opening your session…' : state.loading ? 'Finding your next step…'
    : !state.questionsAvailable ? 'Study temporarily unavailable.' : !revision ? 'Schedule temporarily unavailable.'
      : revision.dueCount ? revision.dueCount + ' due now'
        : revision.unseenCount ? 'Build on something new.' : 'Your scheduled reviews are up to date.';
  const description = !state.questionsAvailable ? 'Reviewed questions could not be loaded. Reload Study to try again.' : !revision ? 'The medical QBank still works. Browse reviewed questions while your revision schedule is unavailable.'
    : (revision.dueCount ? 'Review due items, repair mistakes and learn new concepts.' : nextDue ? 'Next scheduled review: ' + nextDue + '.' : 'No scheduled review yet.') +
      (revision.unseenCount ? ' ' + revision.unseenCount + ' unseen published question' + (revision.unseenCount === 1 ? ' is' : 's are') + ' available for new learning.' : '');
  const durationPicker = hasWork && !state.loading
    ? '<fieldset class="duration-picker"><legend>How much uninterrupted time do you have?</legend><div class="duration-options">' + [10, 20, 30, 60].map(minutes => '<button type="button" data-action="duration" data-minutes="' + minutes + '" aria-pressed="' + (studyMinutes === minutes) + '" ' + (state.busy ? 'disabled' : '') + '>' + minutes + ' min</button>').join('') + '</div></fieldset>' : '';
  const action = state.loading ? '<p role="status">Reading your saved progress and review schedule…</p>'
    : !state.questionsAvailable ? '<button class="primary" type="button" data-action="reload">Reload Study →</button>' : hasWork ? '<button class="primary" type="button" data-action="study-now" data-minutes="' + studyMinutes + '" ' + (state.busy ? 'disabled' : '') + '>Open ' + studyMinutes + ' min session →</button><p class="muted">Continue unfinished work if available; otherwise start a recommended session. Future reviews stay on their schedule.</p>'
      : '<a class="primary action-link" href="#question-browser" data-action="browse-questions">Browse reviewed questions →</a>';
  const failure = state.error ? '<section class="panel study-entry-error" role="status"><h2>Study could not open.</h2><p>Your saved answers are unchanged. Try again when you are ready.</p>' + (state.questionsAvailable ? '<button class="secondary" type="button" data-action="reload" ' + (state.busy ? 'disabled' : '') + '>Reload Study</button>' : '') + '</section>' : '';
  const list = state.questions.map((q, index) =>
    '<article><span class="number">' + String(index + 1).padStart(2, '0') + '</span><div><span class="eyebrow">REVIEWED QUESTION</span><h3>' + escape(q.stem) + '</h3></div></article>'
  ).join('');
  const exam = state.examReadiness;
  const examPanel = '<aside class="panel study-exam-link"><span class="eyebrow">EXAMS</span><h2>Practice the exam flow.</h2><p>' + (exam ? exam.eligibleUniqueQuestions + ' / ' + exam.requiredUniqueQuestions + ' unique reviewed questions ready.' : 'Exam readiness is temporarily unavailable.') + '</p><a class="text-button" href="/web/exam.html">Open Exam Mode →</a><details><summary>Full-mock content readiness</summary><p>' + (exam ? exam.ready ? 'The content-capacity gate has passed.' : exam.shortage + ' more distinct published questions are required before a full mock can start.' : 'The QBank and Study Now remain available.') + '</p><p class="muted">The reviewed pool does not claim exam-blueprint fidelity.</p></details></aside>';
  const content = state.loading || !state.questionsAvailable ? '' : '<div class="metrics study-snapshot"><div><strong>' + (p?.attempts ?? '—') + '</strong><span>Saved attempts</span></div><div><strong>' + (p?.correct ?? '—') + '</strong><span>Correct</span></div><div><strong>' + state.questions.length + '</strong><span>Reviewed questions</span></div></div>' + (!p ? '<p class="muted">Progress totals are temporarily unavailable. Your saved answers are unchanged.</p>' : '') +
    '<div class="study-library-layout"><section id="question-browser" class="panel"><span class="eyebrow">QUESTION BROWSER</span><h2 tabindex="-1" id="question-browser-title">Reviewed QBank</h2><p>Browse without starting a session. Open a QBank session to work through up to 15 reviewed questions; an unfinished session continues first.</p><button class="secondary" type="button" data-action="start" ' + (state.questions.length && !state.busy ? '' : 'disabled') + '>Open QBank session →</button><details class="question-browser-list"' + (!hasWork ? ' open' : '') + '><summary>Browse ' + state.questions.length + ' reviewed question' + (state.questions.length === 1 ? '' : 's') + '</summary><div class="question-list">' + (list || '<div class="empty"><h3>No published medical questions.</h3><p>Draft and in-review content are excluded.</p></div>') + '</div></details></section>' + examPanel + '</div>';
  return '<main id="main" class="account-page study-entry-page"><div class="study-entry-topbar"><a class="text-button" href="/">← Home</a><div><a class="text-button" href="/web/vault.html">Vault</a><a class="text-button" href="/web/account.html">Account</a></div></div><div class="page-heading"><div><span class="eyebrow">STUDY</span><h1>Your study workspace.</h1><p>One session at a time, with your answers saved as you go.</p></div></div><section class="panel study-entry-card" aria-labelledby="study-entry-title" aria-busy="' + (state.loading || state.busy) + '"><span class="eyebrow">YOUR NEXT SESSION</span><h2 id="study-entry-title">' + escape(heading) + '</h2>' + (!state.loading && !state.busy ? '<p>' + escape(description) + '</p>' : '') + durationPicker + action + '<small>Scheduling state is not a mastery score.</small></section>' + failure + content + '</main>';
}

function completionSummary() {
  if (state.summaryLoading) return '<p role="status">Loading your session results…</p>';
  const s = state.sessionSummary;
  if (!s || s.sessionId !== state.session?.sessionId) {
    return '<p>Your session is saved. Results are temporarily unavailable.</p><button class="secondary" type="button" data-action="retry-summary">Retry session results</button>';
  }
  const concepts = s.concepts.filter(c => c.incorrectCount > 0);
  const repairs = concepts.length
    ? '<h2>Concepts to revisit</h2><p>These concepts had an incorrect answer in this session.</p><ul>' + concepts.map(c => '<li><a class="concept-revisit" href="/web/vault.html?concept=' + encodeURIComponent(c.conceptId) + '&returnSession=' + encodeURIComponent(s.sessionId) + '"><span>' + escape(c.label) + '</span><span aria-hidden="true">→</span></a></li>').join('') + '</ul>'
    : '<p>No incorrect answers in this session. Delayed retrieval is still needed to test retention.</p>';
  const r = s.revision;
  const schedule = !r.available
    ? '<p>Revision timing is temporarily unavailable. Your answers remain saved.</p>'
    : r.dueNowCount
      ? '<p>' + r.dueNowCount + ' session item' + (r.dueNowCount === 1 ? ' is' : 's are') + ' due for review now.</p>'
      : r.nextDueAt
        ? '<p>Next review: ' + escape(new Date(r.nextDueAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })) + '.</p>'
        : '<p>No review time is available for these session items yet.</p>';
  return '<div class="session-results"><div class="results-evidence"><h2>This session</h2><div class="metrics"><div><strong>' + s.answeredCount + ' / ' + s.selectedCount + '</strong><span>Answered</span></div><div><strong>' + s.correctCount + '</strong><span>Correct</span></div><div><strong>' + s.incorrectCount + '</strong><span>Incorrect</span></div></div>' +
    (s.unansweredCount ? '<p>' + s.unansweredCount + ' selected question' + (s.unansweredCount === 1 ? ' was' : 's were') + ' left unanswered.</p>' : '') + repairs +
    '</div><aside class="next-revision"><span class="eyebrow">YOUR NEXT STEP</span><h2>Your next revision</h2>' + schedule + (r.available && r.missingCount ? '<p>Some answered items do not yet have a review time.</p>' : '') +
    '<p class="muted">Choose your time and check all due reviews on Home.</p><a class="primary action-link" href="/#study-next">Plan my next session →</a></aside></div><p class="muted results-note">Session accuracy is observed performance, not mastery. Review times reflect the current schedule for these items.</p>';
}

function studyView() {
  const session = state.session;
  if (!session) return overview();
  if (session.resumePending || session.resumeUnavailable) {
    return '<main id="main" class="account-page"><section class="panel"><h1>Return to study</h1>' + (session.resumePending ? '<p role="status">Opening your saved session…</p>' : '<p>Your session could not be opened. Your saved answers are unchanged.</p><button class="secondary" data-action="retry-resume">Retry saved session</button>') + '<a class="text-button" href="/web/medical.html">Open Study →</a></section></main>';
  }
  if (session.summaryPending || session.summaryUnavailable) {
    return '<main id="main" class="account-page"><section class="panel"><h1>Session results</h1>' + (session.summaryPending ? '<p role="status">Loading saved session…</p>' : '<p>Session results are unavailable. Completion has not been confirmed here.</p><button class="secondary" data-action="retry-summary">Retry session results</button>') + '<a class="text-button" href="/web/medical.html">Back to medical QBank →</a></section></main>';
  }
  if (session.closed) {
    const integrity = state.studyNowIntegrity?.latestRecommendation;
    const sameStudyNowSession = integrity?.sessionId === session.sessionId;
    const integrityCopy = sameStudyNowSession
      ? integrity.evidenceChainComplete
        ? '<div class="memory-rating"><strong>Study Now loop verified.</strong><p class="muted">Recommended items, persisted answers and authoritative reschedule evidence are linked for this session.' +
          (integrity.hostedM05cGateSatisfied ? ' Hosted browser answer evidence is also present.' : '') + '</p></div>'
        : '<div class="memory-rating"><strong>Study evidence saved; integrity reconciliation is incomplete.</strong><p class="muted">' + escape((integrity.blockers || []).join(' · ')) + '</p></div>'
      : '';
    const completionLabel = state.sessionSummary?.completedAllSelected === true ? 'MEDICAL SESSION COMPLETE' : 'MEDICAL SESSION CLOSED';
    return '<main id="main" class="account-page"><a class="text-button" href="/web/account.html">← Cloud account</a><section class="panel completion"><span class="eyebrow">' + completionLabel + '</span><h1>Your session is saved.</h1>' + completionSummary() + integrityCopy + '<button class="text-button results-back" data-action="reload">Browse medical QBank →</button></section></main>';
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
    if (answered && chosen && receipt.event?.correct === false) cls += ' chosen-incorrect';
    return '<label class="' + cls + '"><input type="radio" name="answer" value="' + escape(option.optionId) + '" ' + (chosen ? 'checked' : '') + ' ' + (answered || state.busy ? 'disabled' : '') + '><span class="option-letter">' + String.fromCharCode(65 + index) + '</span><span>' + escape(option.text) + '</span>' + (answered && option.optionId === receipt.answerOptionId ? '<b>' + (chosen ? 'Your answer · Correct answer' : 'Correct answer') + '</b>' : answered && chosen ? '<b>Your answer</b>' : '') + '</label>';
  }).join('');

  const memoryPrompt = answered
    ? memoryJudgment
      ? '<div class="memory-rating"><strong>Memory signal saved: ' + escape(memoryJudgment.ratingLabel) + '</strong><p class="muted">Self-reported recall evidence · optional · separate from correctness.</p></div>'
      : '<details class="memory-rating recall-disclosure"><summary>Optional recall rating</summary><strong>How did recall feel before seeing the answer?</strong><p class="muted">Optional memory signal. It does not change your score or block Next.</p><div class="button-row">' + [[1, 'Again'], [2, 'Hard'], [3, 'Good'], [4, 'Easy']].map(([rating, label]) => '<button class="secondary" type="button" data-action="memory-rating" data-rating="' + rating + '" ' + (state.busy ? 'disabled' : '') + '>' + label + '</button>').join('') + '</div></details>'
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
    ? '<details class="study-reason"><summary>Why Study Now sent this: ' + escape(recommendationCopy[recommendationReason].label) + '</summary><p class="muted">' + escape(recommendationCopy[recommendationReason].detail) + '</p></details>'
    : '';
  const vaultParams = primaryConceptId ? new URLSearchParams({ concept: primaryConceptId }) : null;
  if (vaultParams && answered) {
    vaultParams.set('returnSession', session.sessionId);
    vaultParams.set('correctionTargetType', 'question_version');
    vaultParams.set('correctionTargetId', q.questionVersionId);
  }
  if (vaultParams && answered && recommendationReason) {
    vaultParams.set('from', 'study-now');
    vaultParams.set('reason', recommendationReason);
  }
  const vaultLink = vaultParams
    ? '<a class="secondary action-link concept-handoff" href="/web/vault.html?' + vaultParams.toString() + '">' + (recommendationReason ? 'Review concept / add private correction →' : 'Open concept / add private correction →') + '</a>'
    : '';
  const canonicalTeaching = answered ? canonicalTeachingFeedback(receipt) : null;
  const answerExplanation = answered
    ? canonicalTeaching || (
        '<div><h2>Reasoning</h2><p>' + escape(receipt.explanation || '') + '</p></div>'
      )
    : '';
  const visualEvidence = answered && receipt?.visualDetection
    ? '<div class="visual-evidence-status"><strong>Visual recognition evidence saved.</strong><span>Image-specific evidence is stored separately from your scored question attempt.</span></div>'
    : '';
  const feedback = answered
    ? '<section class="answer-feedback" aria-labelledby="answer-feedback-title"><div class="answer-outcome ' + (receipt.event?.correct ? 'answer-correct' : 'answer-incorrect') + '"><span class="eyebrow">ANSWER SAVED</span><h2 id="answer-feedback-title" tabindex="-1">' + (receipt.event?.correct ? 'Correct.' : 'Incorrect. Review the reasoning.') + '</h2><p>Your answer is recorded. Continue when you are ready.</p></div><div class="explanation">' + answerExplanation + '<details class="answer-sources"><summary>Sources' + (Array.isArray(receipt.sources) && receipt.sources.length ? ' (' + receipt.sources.length + ')' : '') + '</summary><p>' + (Array.isArray(receipt.sources) && receipt.sources.length ? receipt.sources.map(safeSourceLink).join(' · ') : 'No source links returned.') + '</p></details>' + visualEvidence + '</div><div class="feedback-context">' + recommendationBanner + vaultLink + '</div>' + memoryPrompt + '<div class="study-continue"><button class="primary" type="button" data-action="next" ' + (state.busy ? 'disabled' : '') + '>' + (session.position + 1 >= session.total ? 'Finish session →' : 'Next question →') + '</button><small>Recall rating is optional.</small></div></section>'
    : '<button class="primary" type="submit" ' + (!selected || state.busy ? 'disabled' : '') + '>Check answer →</button>';
  const entryLabel = { new: 'New recommended session', resumed: 'Continuing saved session', saved: 'Saved session', opened: 'Session opened' }[state.sessionEntry] || 'Study session';
  const taskLabel = visualDetection ? 'IMAGE RECOGNITION · SERVER SCORED' : 'MEDICAL QBANK';
  const taskNote = visualDetection
    ? '<p class="visual-task-note">Recognition task. Your option is scored on the server; image evidence is recorded only after the canonical attempt is accepted.</p>'
    : '';

  return '<main id="main" class="account-page"><div class="study-entry-topbar"><a class="text-button" href="/web/medical.html">← Study overview</a><a class="text-button" href="/web/account.html">Account</a></div><p class="session-entry-context">' + escape(entryLabel) + ' · Saved answers stay with this session.</p><div class="section-heading"><div><span class="eyebrow">' + taskLabel + '</span><p>Question ' + (session.position + 1) + ' of ' + session.total + '</p></div><span class="badge">SERVER SCORED</span></div><section class="panel study">' + taskNote + '<form id="medical-answer-form" data-attempt-key="' + escape(session.sessionId + ':' + session.position + ':' + q.questionVersionId) + '">' + questionMedia(q.media) + '<fieldset ' + (answered || state.busy ? 'disabled' : '') + '><legend>' + escape(q.stem) + '</legend><div class="options">' + options + '</div></fieldset>' + feedback + '</form><p class="muted">Answer keys and explanations are revealed only after the server records the attempt.</p></section></main>';
}

function render() {
  if (!state.user) root.innerHTML = signedOut();
  else root.innerHTML = state.session ? studyView() : overview();
}

async function loadOverview() {
  if (new URLSearchParams(location.search).has('summary') || new URLSearchParams(location.search).has('resume')) {
    const url = new URL(location.href);
    url.searchParams.delete('summary');
    url.searchParams.delete('resume');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
  state = { ...state, loading: true, error: null, session: null, sessionEntry: null, selectedOptionId: null, receipt: null, memoryJudgment: null, studyNowIntegrity: null };
  render();
  try {
    const session = await auth.getSession();
    if (!session?.user) {
      state = { ...state, user: null, loading: false };
      render();
      return;
    }
    const [questionRead, progressRead] = await Promise.allSettled([cloud.questions('all'), cloud.progress()]);
    if (questionRead.status === 'rejected') throw questionRead.reason;
    const questions = questionRead.value;
    const progress = progressRead.status === 'fulfilled' ? progressRead.value : null;
    if (progressRead.status === 'rejected') reportUnexpected(progressRead.reason, 'load_progress');
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
      questionsAvailable: true,
      progress,
      revision,
      revisionError,
      examReadiness,
      examReadinessError,
      error: null
    };
  } catch (error) {
    reportUnexpected(error, 'load_overview');
    state = { ...state, loading: false, questions: [], questionsAvailable: false, progress: null, revision: null, error: error.code || error.message || 'medical_qbank_unavailable' };
  }
  render();
}

async function loadSessionSummary(sessionId, restore = false) {
  state = { ...state, summaryLoading: true, summaryError: null, sessionSummary: null };
  if (restore) state.session = { sessionId, summaryPending: true };
  render();
  try {
    const summary = await cloud.sessionSummary(sessionId);
    if (summary?.contractId !== 'study-session-summary-v1' || summary.sessionId !== sessionId) throw new Error('session_summary_invalid');
    if (restore && !summary.closed) {
      state.session = await cloud.session(sessionId);
      state.receipt = state.session.receipt || null;
      state.memoryJudgment = state.session.memoryJudgment || null;
    } else if (restore) {
      state.session = { sessionId, closed: true, total: summary.selectedCount };
    }
    if (state.session?.sessionId === sessionId) state.sessionSummary = summary;
  } catch (error) {
    reportUnexpected(error, 'load_session_summary');
    state.summaryError = error.code || error.message || 'session_summary_unavailable';
    if (restore) state.session = { sessionId, summaryUnavailable: true };
  }
  state.summaryLoading = false;
  render();
}

async function loadResumedSession(sessionId) {
  state = { ...state, session: { sessionId, resumePending: true }, receipt: null, selectedOptionId: null, memoryJudgment: null, error: null };
  render();
  try {
    const session = await cloud.session(sessionId);
    if (session?.sessionId !== sessionId) throw new Error('session_resume_invalid');
    state = { ...state, session, sessionEntry: 'saved', receipt: session.receipt || null, selectedOptionId: session.receipt?.selectedOptionId || null, memoryJudgment: session.memoryJudgment || null };
    if (session.closed) {
      const url = new URL(location.href);
      url.searchParams.delete('resume');
      url.searchParams.set('summary', sessionId);
      history.replaceState(null, '', url.pathname + url.search + url.hash);
      await loadSessionSummary(sessionId);
    }
  } catch (error) {
    reportUnexpected(error, 'load_resumed_session');
    state = { ...state, session: { sessionId, resumeUnavailable: true }, receipt: null, selectedOptionId: null };
  }
  render();
}

function retainSessionRoute(session) {
  if (!session?.sessionId || !/^[a-zA-Z0-9-]{1,160}$/.test(session.sessionId)) return;
  const url = new URL(location.href);
  url.searchParams.delete('studyNow');
  url.searchParams.delete('summary');
  url.searchParams.set('resume', session.sessionId);
  history.replaceState(null, '', url.pathname + url.search);
}

async function startStudyNow(availableMinutes) {
  if (state.busy) return;
  state.busy = true;
  state.error = null;
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
      sessionEntry: result.plan?.resumedExisting === true ? 'resumed' : result.plan?.resumedExisting === false ? 'new' : 'opened',
      selectedOptionId: result.session.receipt?.selectedOptionId || null,
      receipt: result.session.receipt || null,
      memoryJudgment: result.session.memoryJudgment || null,
      error: null
    };
    retainSessionRoute(result.session);
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
  if (state.busy) return;
  state.busy = true;
  state.error = null;
  render();
  try {
    const session = await cloud.start({ limit: 15, filter: 'all' });
    state = {
      ...state,
      busy: false,
      session,
      sessionEntry: 'opened',
      selectedOptionId: session.receipt?.selectedOptionId || null,
      receipt: session.receipt || null,
      memoryJudgment: session.memoryJudgment || null,
      error: null
    };
    retainSessionRoute(session);
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
  if (state.receipt) document.querySelector('#answer-feedback-title')?.focus?.();
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
    // Resume/write notices describe the previous cursor, not the new item.
    notice.textContent = '';
    notice.hidden = true;
    if (next.closed) {
      const summaryUrl = new URL(location.href);
      summaryUrl.searchParams.delete('resume');
      summaryUrl.searchParams.set('summary', next.sessionId);
      history.replaceState(null, '', summaryUrl.pathname + summaryUrl.search + summaryUrl.hash);
      await loadSessionSummary(next.sessionId);
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
  if (target.dataset.action === 'browse-questions') {
    const browser = root.querySelector('.question-browser-list');
    if (browser) browser.open = true;
    root.querySelector('#question-browser')?.scrollIntoView({ block: 'start' });
    root.querySelector('#question-browser-title')?.focus({ preventScroll: true });
  }
  if (target.dataset.action === 'duration') {
    const minutes = Number(target.dataset.minutes);
    if (state.busy || ![10, 20, 30, 60].includes(minutes)) return;
    studyMinutes = minutes;
    try { localStorage.setItem('mlos-study-duration-v1', String(minutes)); } catch { /* Optional preference. */ }
    render();
  }
  if (target.dataset.action === 'start') startSession();
  if (target.dataset.action === 'study-now') startStudyNow(Number(target.dataset.minutes));
  if (target.dataset.action === 'memory-rating') recordMemoryRating(Number(target.dataset.rating));
  if (target.dataset.action === 'next') nextQuestion();
  if (target.dataset.action === 'retry-resume') loadResumedSession(state.session.sessionId);
  if (target.dataset.action === 'retry-summary') loadSessionSummary(state.session.sessionId, !state.session.closed);
  if (target.dataset.action === 'reload') loadOverview();
});

async function bootstrap() {
  if (!state.user) {
    render();
    return;
  }
  const hasRestore = /^[a-zA-Z0-9-]{1,160}$/.test(requestedSummaryId || '') || /^[a-zA-Z0-9-]{1,160}$/.test(requestedResumeId || '');
  if (hasRestore) {
    try {
      const authenticated = await auth.getSession();
      state.user = authenticated?.user || null;
    } catch (error) { reportUnexpected(error, 'restore_auth'); state.user = null; }
    if (!state.user) { render(); return; }
  } else await loadOverview();
  if (requestedSummaryId && /^[a-zA-Z0-9-]{1,160}$/.test(requestedSummaryId) && state.user) {
    const summaryUrl = new URL(location.href);
    summaryUrl.searchParams.set('summary', requestedSummaryId);
    history.replaceState(null, '', summaryUrl.pathname + summaryUrl.search + summaryUrl.hash);
    await loadSessionSummary(requestedSummaryId, true);
    return;
  }
  if (requestedResumeId && /^[a-zA-Z0-9-]{1,160}$/.test(requestedResumeId) && state.user) {
    const url = new URL(location.href);
    url.searchParams.set('resume', requestedResumeId);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    await loadResumedSession(requestedResumeId);
    return;
  }
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
