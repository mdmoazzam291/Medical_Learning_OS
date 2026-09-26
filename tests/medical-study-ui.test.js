import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('medical learner page uses authenticated cloud study and server scoring', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');

  assert.match(source, /createSupabaseAuth/);
  assert.match(source, /createCloudStudy/);
  assert.match(source, /cloud\.questions\('all'\)/);
  assert.match(source, /cloud\.start/);
  assert.match(source, /cloud\.answer/);
  assert.match(source, /cloud\.next/);
  assert.match(source, /'medical:' \+ session\.sessionId \+ ':' \+ session\.position/);
  assert.match(source, /receipt\.answerOptionId/);
  assert.match(source, /String\.fromCharCode\(65 \+ index\)/);
  assert.match(source, /Answer keys and explanations are revealed only after the server records the attempt/);
  assert.doesNotMatch(source, /learnerId\s*:/);
});

test('cloud account exposes medical QBank only when published questions exist', async () => {
  const source = await readFile(new URL('../web/account.js', import.meta.url), 'utf8');
  assert.match(source, /const medicalAction = count \?/);
  assert.match(source, /\/web\/medical\.html/);
});


test('medical option labels have explicit visual separation from option text', async () => {
  const css = await readFile(new URL('../web/styles.css', import.meta.url), 'utf8');
  assert.match(css, /#medical-app \.option-letter/);
  assert.match(css, /margin-right:\.35rem/);
});


test('medical overview reads revision due state without making it mastery', async () => {
  const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');
  assert.match(source, /cloud\.due\(15\)/);
  assert.match(source, /load_revision_due/);
  assert.match(source, /This is scheduling state, not a mastery score/);
  assert.match(source, /The medical QBank still works/);
});
