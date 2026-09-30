import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const preflight = await readFile(new URL('../web/admin-pair-preflight.js', import.meta.url), 'utf8');
const adminHtml = await readFile(new URL('../web/admin.html', import.meta.url), 'utf8');
const serve = await readFile(new URL('../scripts/serve.js', import.meta.url), 'utf8');

test('M11c preflight is pinned to the exact current anaphylaxis pair', () => {
  assert.match(preflight, /emergency:anaphylaxis:first-line-drug@1/);
  assert.match(preflight, /emergency:anaphylaxis:no-rash-first-action@1/);
  assert.match(preflight, /same primary concept/);
  assert.match(preflight, /Medical, References and Rights review/);
});

test('preflight exposes tentative judgments and explicit overlap risk without claiming authority', () => {
  assert.match(preflight, /NON-AUTHORITATIVE PREFLIGHT/);
  assert.match(preflight, /surfaceNovelty: 'moderate'/);
  assert.match(preflight, /constructAlignment: 'same_primary_construct'/);
  assert.match(preflight, /reasoningAlignment: 'bounded_difference'/);
  assert.match(preflight, /difficultyComparability: 'bounded_difference'/);
  assert.match(preflight, /cueOverlapRisk: 'moderate'/);
  assert.match(preflight, /cue overlap is material rather than negligible/);
  assert.match(preflight, /If either judgment fails, reject the pair/);
});

test('preflight cannot fill, select, attest or submit the human validation form', () => {
  assert.doesNotMatch(preflight, /\.value\s*=/);
  assert.doesNotMatch(preflight, /\.checked\s*=/);
  assert.doesNotMatch(preflight, /requestSubmit\s*\(/);
  assert.doesNotMatch(preflight, /\.submit\s*\(/);
  assert.doesNotMatch(preflight, /dispatchEvent\s*\(/);
  assert.match(preflight, /Nothing below is prefilled, selected or submitted/);
});

test('admin loads the preflight asset and the explicit public server surface allows it', () => {
  assert.match(adminHtml, /<script type="module" src="\/web\/admin-pair-preflight\.js"><\/script>/);
  assert.match(serve, /'web\/admin-pair-preflight\.js'/);
});
