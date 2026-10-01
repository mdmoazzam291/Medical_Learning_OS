import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const wrangler = JSON.parse(
  (await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'))
    .replace(/^\s*\/\/.*$/gm, '')
);

test('Git-connected Worker name matches the existing Cloudflare application', () => {
  assert.equal(wrangler.name, 'medical-learning-os');
});

test('Worker serves the reviewed static bundle before invoking dynamic code', () => {
  assert.equal(wrangler.assets?.directory, './dist-pages');
  assert.equal(wrangler.assets?.run_worker_first, false);
});

test('dynamic fallback remains the existing Render origin during migration', () => {
  assert.equal(wrangler.vars?.ORIGIN_BASE_URL, 'https://medical-learning-os-preview.onrender.com');
  assert.equal(wrangler.main, 'cloudflare/edge-worker.js');
});
