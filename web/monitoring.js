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

if (globalThis.__MLOS_SENTRY_READY__) flushPending();
else if (environment === 'preview') {
  const listeners = globalThis.__MLOS_SENTRY_READY_LISTENERS__ = globalThis.__MLOS_SENTRY_READY_LISTENERS__ || [];
  listeners.push(flushPending);
}
