import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const migrationsUrl = new URL('../supabase/migrations/', import.meta.url);
const names = await readdir(migrationsUrl);
const name = names.find(value => /infrastructure_alert_indexes\.sql$/.test(value));
const sql = name ? await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8') : '';

test('alert delivery foreign keys have covering indexes', () => {
  assert.ok(name, 'infrastructure alert index migration must exist');
  assert.match(sql, /owner_infrastructure_provider_state\s*\(current_alert_id\)/i);
  assert.match(sql, /owner_infrastructure_notification_intents\s*\(alert_id\)/i);
  assert.match(sql, /owner_infrastructure_notification_delivery_events\s*\(idempotency_key\)/i);
});
