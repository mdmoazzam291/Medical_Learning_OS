import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';

const root = document.querySelector('#medical-app');
const auth = createSupabaseAuth({ ...cloudConfig });
const FEATURE_KEY = 'answer_confidence_capture';
const values = Object.freeze([
  ['guess', 'Guess'],
  ['unsure', 'Unsure'],
  ['fairly_sure', 'Fairly sure'],
  ['certain', 'Certain']
]);

let enabled = false;
let pending = null;
let statusLoaded = false;

async function request(path, { method = 'GET', body, retry = true } = {}) {
  const session = await auth.getSession();
  if (!session?.accessToken) throw Object.assign(new Error('not_authenticated'), { status: 401 });
  const response = await fetch(`${cloudConfig.projectUrl}/functions/v1/learner-experiment-api${path}`, {
    method,
    headers: {
      apikey: cloudConfig.publishableKey,
      Authorization: `Bearer ${session.accessToken}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (response.status === 401 && retry) {
    const refreshed = await auth.getSession({ forceRefresh: true });
    if (refreshed?.accessToken && refreshed.accessToken !== session.accessToken) {
      return request(path, { method, body, retry: false });
    }
  }
  let payload = null;
  try { payload = await response.json(); } catch {}
  if (!response.ok) throw Object.assign(new Error(payload?.error || 'learner_experiment_request_failed'), {
    status: response.status,
    code: payload?.error || null
  });
  return payload;
}

function sessionIdFromUrl() {
  const value = new URLSearchParams(location.search).get('resume');
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '') ? value : null;
}

function promptMarkup() {
  return `<fieldset class="answer-confidence-beta" data-confidence-beta>
    <legend>Before checking: how confident are you?</legend>
    <p class="muted">Experimental calibration signal. It never changes your score, revision timing or Study Now recommendation.</p>
    <div class="button-row">${values.map(([value, label]) => `<label class="confidence-choice"><input type="radio" name="answer-confidence" value="${value}" data-confidence="${value}"><span>${label}</span></label>`).join('')}</div>
    <p class="muted" data-confidence-message></p>
  </fieldset>`;
}

function ensurePrompt() {
  if (!enabled || !root) return;
  const form = root.querySelector('#medical-answer-form');
  if (!form || form.querySelector('.answer-feedback') || form.querySelector('[data-confidence-beta]')) return;
  const submit = form.querySelector('button[type="submit"]');
  if (!submit) return;
  submit.insertAdjacentHTML('beforebegin', promptMarkup());
}

function showSavedStatus(text, kind = 'muted') {
  const feedback = root?.querySelector('.feedback-context') || root?.querySelector('.answer-feedback');
  if (!feedback || feedback.querySelector('[data-confidence-status]')) return;
  const status = document.createElement('p');
  status.dataset.confidenceStatus = 'true';
  status.className = kind;
  status.textContent = text;
  feedback.append(status);
}

async function persistPending() {
  if (!pending || pending.sending || !root?.querySelector('.answer-feedback')) return;
  const active = pending;
  active.sending = true;
  try {
    await request('/confidence', {
      method: 'POST',
      body: { sessionId: active.sessionId, confidence: active.confidence }
    });
    if (pending === active) pending = null;
    showSavedStatus('Pre-answer confidence saved as experimental self-report evidence.');
  } catch (error) {
    if (pending === active) pending = null;
    showSavedStatus('Answer saved. Confidence signal was not saved; your score and study schedule are unchanged.');
    if (Number(error?.status || 0) >= 500 || !error?.status) {
      errorMonitor.capture(error, {
        component: 'answer-confidence-beta',
        operation: 'record_confidence',
        code: error?.code || null
      });
    }
  }
}

function observeSurface() {
  ensurePrompt();
  persistPending();
}

root?.addEventListener('submit', event => {
  if (!enabled || event.target?.id !== 'medical-answer-form' || event.target.querySelector('.answer-feedback')) return;
  const choice = event.target.querySelector('input[name="answer-confidence"]:checked');
  const message = event.target.querySelector('[data-confidence-message]');
  if (!choice) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (message) message.textContent = 'Choose one confidence level before checking this answer.';
    event.target.querySelector('input[name="answer-confidence"]')?.focus();
    return;
  }
  const sessionId = sessionIdFromUrl();
  if (!sessionId) {
    if (message) message.textContent = 'Confidence capture is temporarily unavailable. Your answer can still be submitted.';
    errorMonitor.capture(new Error('confidence_session_route_missing'), {
      component: 'answer-confidence-beta',
      operation: 'prepare_confidence'
    });
    return;
  }
  pending = { sessionId, confidence: String(choice.value), sending: false };
}, true);

async function loadFeatureStatus() {
  if (statusLoaded) return;
  statusLoaded = true;
  try {
    const payload = await request('/status');
    enabled = payload?.featureKey === FEATURE_KEY && payload?.enabled === true;
  } catch (error) {
    enabled = false;
    if (Number(error?.status || 0) >= 500 || !error?.status) {
      errorMonitor.capture(error, {
        component: 'answer-confidence-beta',
        operation: 'feature_status',
        code: error?.code || null
      });
    }
  }
  observeSurface();
}

if (root) {
  const observer = new MutationObserver(() => queueMicrotask(observeSurface));
  observer.observe(root, { childList: true, subtree: true });
  loadFeatureStatus();
}
