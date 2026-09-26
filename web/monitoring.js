import { createErrorMonitor, sanitizeTelemetry } from '/src/adapters/error-monitoring.js';

const SENTRY_DSN = 'https://2fa4dbdadec29f693ffec3a0f6fbce05@o4512152153751552.ingest.us.sentry.io/4512152193466368';
const SENTRY_LOADER = 'https://js.sentry-cdn.com/2fa4dbdadec29f693ffec3a0f6fbce05.min.js';
const environment = location.hostname.endsWith('.onrender.com') ? 'preview' : 'development';
const sentryEnabled = environment === 'preview';
const pendingEvents = [];
let loaderInserted = false;

function stripUrl(value) {
  try {
    const url = new URL(String(value), location.origin);
    return url.origin === location.origin ? `${url.origin}${url.pathname}` : url.origin;
  } catch {
    return '[redacted-url]';
  }
}

function beforeSend(event) {
  const clean = { ...event };
  delete clean.user;
  clean.breadcrumbs = [];
  if (clean.request) clean.request = { url: stripUrl(clean.request.url || location.href) };
  if (clean.extra) clean.extra = sanitizeTelemetry(clean.extra);
  if (clean.contexts) clean.contexts = sanitizeTelemetry(clean.contexts);
  if (clean.tags) clean.tags = sanitizeTelemetry(clean.tags);
  if (clean.message) clean.message = sanitizeTelemetry(clean.message);
  if (clean.exception?.values) {
    clean.exception = {
      ...clean.exception,
      values: clean.exception.values.map(value => ({
        ...value,
        value: value?.value ? sanitizeTelemetry(value.value) : value?.value
      }))
    };
  }
  return clean;
}

function dispatchToSentry(event) {
  const sentry = globalThis.Sentry;
  if (!sentry || typeof sentry.captureException !== 'function' || typeof sentry.withScope !== 'function') {
    pendingEvents.push(event);
    return;
  }

  const error = new Error(event.error.message);
  error.name = event.error.name;
  if (event.error.stack) error.stack = event.error.stack;

  sentry.withScope(scope => {
    for (const [key, value] of Object.entries(event.tags || {})) {
      if (value !== null && value !== undefined) scope.setTag(key, String(value));
    }
    scope.setContext('medical_learning_os', event.context || {});
    sentry.captureException(error);
  });
}

export const errorMonitor = createErrorMonitor({
  sink: dispatchToSentry,
  environment,
  runtime: 'browser'
});

function flushPending() {
  if (!globalThis.Sentry) return;
  while (pendingEvents.length) dispatchToSentry(pendingEvents.shift());
}

function runControlledPreviewTest() {
  const params = new URLSearchParams(location.search);
  if (params.get('monitoring_test') !== '1') return;
  if (sessionStorage.getItem('mlos-monitoring-test-v1') === 'sent') return;

  sessionStorage.setItem('mlos-monitoring-test-v1', 'sent');
  params.delete('monitoring_test');
  const query = params.toString();
  history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);

  errorMonitor.capture(
    new Error('MLOS controlled monitoring test learner@example.com with Bearer fake-test-token'),
    {
      component: 'observability',
      operation: 'controlled_preview_test',
      email: 'learner@example.com',
      authorization: 'Bearer fake-test-token',
      refreshToken: 'fake-refresh-token',
      expected: 'sanitized'
    }
  );
}

function loadSentry() {
  if (!sentryEnabled || loaderInserted) return;
  loaderInserted = true;

  globalThis.sentryOnLoad = function () {
    globalThis.Sentry.init({
      dsn: SENTRY_DSN,
      environment,
      sendDefaultPii: false,
      maxBreadcrumbs: 0,
      tracesSampleRate: 0,
      beforeSend,
      beforeSendTransaction: () => null
    });
    flushPending();
  };

  const script = document.createElement('script');
  script.src = SENTRY_LOADER;
  script.crossOrigin = 'anonymous';
  script.defer = true;
  script.onload = () => {
    flushPending();
    runControlledPreviewTest();
  };
  script.onerror = () => {
    loaderInserted = false;
  };
  document.head.append(script);
}

loadSentry();
