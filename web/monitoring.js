import { createErrorMonitor } from '/src/adapters/error-monitoring.js';

function sentrySink(event) {
  const sentry = globalThis.Sentry;
  if (!sentry || typeof sentry.captureException !== 'function' || typeof sentry.withScope !== 'function') return;

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

const environment = location.hostname.endsWith('.onrender.com') ? 'preview' : 'development';

export const errorMonitor = createErrorMonitor({
  sink: sentrySink,
  environment,
  runtime: 'browser'
});
