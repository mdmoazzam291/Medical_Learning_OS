import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261003145000_owner_monitor_cron_timeout_v2.sql', import.meta.url), 'utf8');
const monitor = await readFile(new URL('../supabase/functions/infrastructure-monitor/index.ts', import.meta.url), 'utf8');

test('cron caller outlives the Render cold-start probe budget', () => {
  assert.match(monitor, /fetchJson\(renderHealthUrl, \{\}, 30000\)/);
  assert.match(migration, /cron\.alter_job/);
  assert.match(migration, /timeout_milliseconds:=12000/);
  assert.match(migration, /timeout_milliseconds:=45000/);
  assert.match(migration, /mlos-owner-infrastructure-monitor-v1/);
});
