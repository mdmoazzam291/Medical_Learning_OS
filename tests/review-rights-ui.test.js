import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('reviewer UI requires source-rights resolution before rights approval', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');

  assert.match(source, /source-rights-form/);
  assert.match(source, /citation_only/);
  assert.match(source, /public_domain/);
  assert.match(source, /licensed/);
  assert.match(source, /restricted/);
  assert.match(source, /Resolve source rights/);
  assert.match(source, /!rightsReady/);
  assert.match(source, /review\.resolveRights/);
  assert.doesNotMatch(source, /reviewerId\s*:/);
});
