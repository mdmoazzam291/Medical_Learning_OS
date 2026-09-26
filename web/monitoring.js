import { createErrorMonitor } from '/src/adapters/error-monitoring.js';

const environment = location.hostname.endsWith('.onrender.com') ? 'preview' : 'development';
const pendingEvents = [];

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
  if (sessionStorage.getItem('mlos-monitoring-test-v2') === 'sent') return;

  sessionStorage.setItem('mlos-monitoring-test-v2', 'sent');
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

if (globalThis.Sentry && typeof globalThis.Sentry.onLoad === 'function') {
  globalThis.Sentry.onLoad(flushPending);
}
runControlledPreviewTest();
