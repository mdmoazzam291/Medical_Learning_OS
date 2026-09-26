import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('study-api retries only the transient PGRST303 trusted-read failure once', async () => {
  const source = await readFile(new URL('../supabase/functions/study-api/index.ts', import.meta.url), 'utf8');

  assert.match(source, /const trustedRead = async/);
  assert.match(source, /result\.error\?\.code === "PGRST303"/);
  assert.match(source, /setTimeout\(resolve, 75\)/);
  assert.match(source, /trusted_read_retry/);

  for (const operation of [
    'catalog',
    'attempts',
    'bookmarks',
    'session_state',
    'session_receipt',
    'export_sessions',
    'answer_session'
  ]) {
    assert.match(source, new RegExp(`trustedRead\\("${operation}"`));
  }

  // Mutations remain direct and are not blindly retried.
  assert.doesNotMatch(source, /trustedRead\([^\n]+[\s\S]{0,250}\.upsert\(/);
  assert.doesNotMatch(source, /trustedRead\([^\n]+[\s\S]{0,250}\.delete\(/);
  assert.doesNotMatch(source, /trustedRead\([^\n]+[\s\S]{0,250}\.rpc\(/);
});
