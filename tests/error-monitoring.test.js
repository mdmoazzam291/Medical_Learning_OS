import test from 'node:test';
import assert from 'node:assert/strict';
import { createErrorMonitor, sanitizeTelemetry } from '../src/adapters/error-monitoring.js';

test('telemetry sanitizer removes common secrets and personal identifiers', () => {
  const cleaned = sanitizeTelemetry({
    email: 'learner@example.com',
    authorization: 'Bearer abc.def.ghi',
    nested: {
      accessToken: 'eyJabc.def.ghi',
      message: 'Contact learner@example.com with Bearer very-secret-token',
      databaseUrl: 'postgresql://user:password@db.example.com/postgres',
      safe: 'study-api'
    }
  });

  assert.equal(cleaned.email, '[redacted]');
  assert.equal(cleaned.authorization, '[redacted]');
  assert.equal(cleaned.nested.accessToken, '[redacted]');
  assert.match(cleaned.nested.message, /\[redacted-email\]/);
  assert.match(cleaned.nested.message, /Bearer \[redacted\]/);
  assert.equal(cleaned.nested.databaseUrl, '[redacted]');
  assert.equal(cleaned.nested.safe, 'study-api');
});

test('error monitor emits only sanitized bounded context and cannot break the app', () => {
  const events = [];
  const monitor = createErrorMonitor({
    sink: event => events.push(event),
    environment: 'preview',
    runtime: 'browser'
  });

  const error = new Error('Failed for learner@example.com with Bearer secret-value');
  const event = monitor.capture(error, {
    component: 'account',
    operation: 'cloud_load',
    status: 503,
    refreshToken: 'top-secret',
    detail: { route: '/progress', password: 'never-store-me' }
  });

  assert.equal(events.length, 1);
  assert.equal(event.tags.environment, 'preview');
  assert.equal(event.tags.runtime, 'browser');
  assert.equal(event.tags.component, 'account');
  assert.equal(event.tags.operation, 'cloud_load');
  assert.equal(event.tags.status, 503);
  assert.doesNotMatch(JSON.stringify(event), /learner@example\.com|top-secret|never-store-me|secret-value/);
});

test('monitor sink failure is isolated from product behavior', () => {
  const monitor = createErrorMonitor({ sink: () => { throw new Error('monitor down'); } });
  assert.doesNotThrow(() => monitor.capture(new Error('product error'), { component: 'test' }));
});
