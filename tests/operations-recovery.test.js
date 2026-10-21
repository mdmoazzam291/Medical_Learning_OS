import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflow = await readFile(
  new URL('../.github/workflows/supabase-r2-restore-drill.yml', import.meta.url),
  'utf8'
);

test('recovery drill discovers latest canonical R2 backup rather than a pinned archive', () => {
  assert.match(workflow, /aws s3api list-objects-v2/);
  assert.match(workflow, /supabase\/\\d\{4\}\/\\d\{2\}\/\\d\{2\}\/\\d\{8\}T\\d\{6\}Z\/backup\\\.tar\\\.gz/);
  assert.match(workflow, /max\(candidates, key=lambda item:/);
  assert.doesNotMatch(workflow, /prefix=supabase\/20\d\d\//);
});

test('recovery drill rejects stale or mismatched backup metadata', () => {
  assert.match(workflow, /age <= timedelta\(days=9\)/);
  assert.match(workflow, /project_ref.*iyapppmeieqhflnzslao/);
  assert.match(workflow, /mdmoazzam291\/Medical_Learning_OS/);
  assert.match(workflow, /manifest_delay <= timedelta\(minutes=30\)/);
  assert.match(workflow, /R2 archive checksum mismatch/);
  assert.match(workflow, /SQL checksum mismatch/);
});

test('recovery drill restores only into disposable local Supabase and verifies all dumped data', () => {
  assert.match(workflow, /supabase db start/);
  assert.match(workflow, /127\.0\.0\.1:54322/);
  assert.match(workflow, /ops\/r2-backups\/verify_restore\.py/);
  assert.match(workflow, /supabase\/verification\/data-api-grants\.sql/);
  assert.ok(workflow.indexOf('docker network disconnect') < workflow.indexOf('--file "/tmp/mlos-restore/roles.sql"'));
  assert.ok(workflow.indexOf('test "$cron_state" = off') < workflow.indexOf('--file "/tmp/mlos-restore/roles.sql"'));
  assert.doesNotMatch(workflow, /SUPABASE_DB_URL|upload-artifact/);
  assert.match(workflow, /head\.repo\.full_name == github\.repository/);
  assert.match(workflow, /user\.login == github\.repository_owner/);
});

test('full recovery drill is low-frequency to conserve Actions quota', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /cron: '30 0 1 \* \*'/);
  assert.doesNotMatch(workflow, /branches: \["ops\/m14-latest-backup-restore"\]/);
});
