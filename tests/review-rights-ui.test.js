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


test('reviewer UI can switch between question and NeuralVault canonical note targets', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.match(source, /review-target/);
  assert.match(source, /NeuralVault canonical notes/);
  assert.match(source, /review\.noteQueue/);
  assert.match(source, /noteReviewItem/);
  assert.match(source, /review\.recordNote/);
  assert.match(source, /data-note-version-id/);
});


test('NeuralVault reviewer card shows provenance before gate decision', async () => {
  const source = await readFile(new URL('../web/review.js', import.meta.url), 'utf8');
  assert.match(source, /const provenance = note\?\.provenance/);
  assert.match(source, /<h3>Provenance<\/h3>/);
  assert.match(source, /provenance\.kind/);
  assert.match(source, /provenance\.evidence/);
});
