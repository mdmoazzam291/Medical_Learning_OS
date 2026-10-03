import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const migrationsUrl = new URL('../supabase/migrations/', import.meta.url);
const migrationNames = await readdir(migrationsUrl);
const migrationName = migrationNames.find(name => /infrastructure_alert_delivery\.sql$/.test(name));
const migration = migrationName
  ? await readFile(new URL(`../supabase/migrations/${migrationName}`, import.meta.url), 'utf8')
  : '';
const monitor = await readFile(new URL('../supabase/functions/infrastructure-monitor/index.ts', import.meta.url), 'utf8');

test('provider health keeps persistent streak state and treats configured as neutral', () => {
  assert.ok(migrationName, 'infrastructure alert delivery migration must exist');
  assert.match(migration, /owner_infrastructure_provider_state/);
  assert.match(migration, /consecutive_unhealthy/);
  assert.match(migration, /consecutive_healthy/);
  assert.match(migration, /p_status in \('degraded','unavailable'\)/);
  assert.match(migration, /p_status='healthy'/);
  assert.match(migration, /p_status='configured'/);
});

test('one unhealthy observation never opens or notifies while the second does', () => {
  assert.match(migration, /consecutive_unhealthy\s*>=\s*2/i);
  assert.match(migration, /owner_infrastructure_alerts/);
  assert.match(migration, /notification_kind[^\n]*opened|['"]opened['"]/i);
  assert.match(migration, /deliveryIntent/);
});

test('repeat notification uses six-hour cooldown and critical escalation bypasses it', () => {
  assert.match(migration, /interval '6 hours'/i);
  assert.match(migration, /warning/);
  assert.match(migration, /critical/);
  assert.match(migration, /escalat/i);
  assert.match(migration, /last_notification_at/);
});

test('recovery requires two consecutive healthy observations and emits one recovery intent', () => {
  assert.match(migration, /consecutive_healthy\s*>=\s*2/i);
  assert.match(migration, /resolved_at/);
  assert.match(migration, /['"]resolved['"]/);
  assert.match(migration, /notification_kind[^\n]*recovery|['"]recovery['"]/i);
});

test('notification intent and immutable delivery-attempt evidence are separate and idempotent', () => {
  assert.match(migration, /owner_infrastructure_notification_intents/);
  assert.match(migration, /idempotency_key text primary key/);
  assert.match(migration, /owner_infrastructure_notification_delivery_events/);
  assert.match(migration, /before update or delete on public\.owner_infrastructure_notification_delivery_events/);
  assert.match(migration, /owner_monitor_record_notification_delivery_v1/);
  assert.match(migration, /pending|sent/);
  assert.match(migration, /failed/);
});

test('monitor sends only database-issued intents with Resend idempotency and operational-only payload', () => {
  assert.match(monitor, /deliveryIntent/);
  assert.match(monitor, /api\.resend\.com\/emails/);
  assert.match(monitor, /Idempotency-Key/i);
  assert.match(monitor, /admin\.auth\.admin\.getUserById/);
  assert.match(monitor, /content_admin_account/);
  assert.match(monitor, /owner_monitor_record_notification_delivery_v1/);
  assert.match(monitor, /MLOS_ALERT_FROM/);
  assert.doesNotMatch(monitor, /questionVersionId|selectedOptionId|medicalContent|learnerId/);
});

test('notification delivery failure is fail-soft with respect to health recording', () => {
  const recordIndex = monitor.indexOf('owner_monitor_record_provider_v1');
  const deliveryIndex = monitor.indexOf('owner_monitor_record_notification_delivery_v1');
  assert.ok(recordIndex >= 0, 'health recording must exist');
  assert.ok(deliveryIndex > recordIndex, 'delivery evidence is downstream of health recording');
  assert.match(monitor, /delivery_failed/);
  assert.match(monitor, /try[\s\S]*sendAlertNotification[\s\S]*catch/);
});
