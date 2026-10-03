import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase/migrations/20261003115100_owner_admin_audit_immutable.sql', import.meta.url), 'utf8');

test('owner learner administration audit log is database append-only', () => {
  assert.match(sql, /before update or delete on public\.owner_admin_audit_events/);
  assert.match(sql, /raise exception 'owner_admin_audit_immutable'/);
  assert.match(sql, /prevent_owner_admin_audit_mutation/);
});
