import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const parseJsonc = async relativePath => JSON.parse(
  (await readFile(new URL(relativePath, import.meta.url), 'utf8'))
    .replace(/^\s*\/\/.*$/gm, '')
);

const wrangler = await parseJsonc('../wrangler.jsonc');
const heartbeatWrangler = await parseJsonc('../ops/cloudflare-heartbeat/wrangler.jsonc');

test('learner web Worker has a distinct Cloudflare application name', () => {
  assert.equal(wrangler.name, 'medical-learning-os-web');
  assert.equal(heartbeatWrangler.name, 'medical-learning-os');
  assert.notEqual(wrangler.name, heartbeatWrangler.name);
});

test('heartbeat cron remains isolated from learner static delivery', () => {
  assert.deepEqual(heartbeatWrangler.triggers?.crons, ['17 0,8,16 * * *']);
  assert.equal(wrangler.triggers, undefined);
});

test('Worker serves the reviewed static bundle before invoking dynamic code', () => {
  assert.equal(wrangler.assets?.directory, './dist-pages');
  assert.equal(wrangler.assets?.run_worker_first, false);
});

test('dynamic fallback remains the existing Render origin during migration', () => {
  assert.equal(wrangler.vars?.ORIGIN_BASE_URL, 'https://medical-learning-os-preview.onrender.com');
  assert.equal(wrangler.main, 'cloudflare/edge-worker.js');
});
