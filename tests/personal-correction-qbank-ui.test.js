import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../web/medical.js', import.meta.url), 'utf8');

test('answered QBank items deep-link exact question correction target into NeuralVault', () => {
  assert.match(source, /vaultParams\.set\('correctionTargetType', 'question_version'\)/);
  assert.match(source, /vaultParams\.set\('correctionTargetId', q\.questionVersionId\)/);
  assert.match(source, /Review concept \/ add private correction/);
});
