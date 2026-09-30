import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const account = await readFile(new URL('../web/account.js', import.meta.url), 'utf8');

test('account projections fail independently instead of collapsing the learner record', () => {
  assert.match(account, /Promise\.allSettled\(\[/);
  assert.match(account, /progressResult\.status === 'fulfilled' \? progressResult\.value : state\.progress/);
  assert.match(account, /questionsResult\.status === 'fulfilled' \? \(questionsResult\.value\.questions \|\| \[\]\) : state\.questions/);
  assert.match(account, /retentionResult\.status === 'fulfilled' \? retentionResult\.value : state\.retentionConsent/);
  assert.match(account, /Available learning data remains visible/);
  assert.doesNotMatch(account, /state\.error/);
  assert.doesNotMatch(account, /Promise\.all\(\[\s*cloud\.progress\(\),\s*cloud\.questions\('all'\),\s*cloud\.retentionProbeConsent\(\)/s);
});

test('retention projection failure disables research-pilot actions without disabling account navigation', () => {
  assert.match(account, /!consent \|\| state\.projectionErrors\.retention/);
  assert.match(account, /No probe can be scheduled from this screen/);
  assert.match(account, /state\.projectionErrors\.retention\) return/);
  assert.match(account, /href="\/web\/medical\.html">Study →/);
  assert.match(account, /href="\/web\/exam\.html">Exams →/);
  assert.match(account, /href="\/web\/vault\.html">NeuralVault →/);
});

test('account refresh reports degraded projection state without exposing it as authentication failure', () => {
  assert.match(account, /Session refresh verified\. Available cloud data reloaded; one or more account projections remain temporarily unavailable\./);
  assert.match(account, /reportUnexpected\(progressResult\.reason, 'load_progress'\)/);
  assert.match(account, /reportUnexpected\(questionsResult\.reason, 'load_questions'\)/);
  assert.match(account, /reportUnexpected\(retentionResult\.reason, 'load_retention_consent'\)/);
  assert.match(account, /signedOutState\(\)/);
});
