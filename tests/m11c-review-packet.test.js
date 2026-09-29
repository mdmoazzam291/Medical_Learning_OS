import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [api, admin] = await Promise.all([
  readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../web/admin.js', import.meta.url), 'utf8')
]);

test('M11c review packet exposes source/provenance evidence without reviewer identity secrets', () => {
  assert.match(api, /reviewPacket = \(question: any\)/);
  assert.match(api, /sourceIds/);
  assert.match(api, /rightsStatus/);
  assert.match(api, /provenance/);
  assert.match(api, /changeReason/);
  assert.match(api, /reviewSummary/);
  assert.doesNotMatch(api, /reviewPacket[\s\S]{0,1800}reviewerId/);
});

test('admin pair cards display grounded packet but leave pair judgment unselected', () => {
  assert.match(admin, /HUMAN REVIEW PACKET/);
  assert.match(admin, /Provenance:/);
  assert.match(admin, /rights:/);
  assert.match(admin, /<option value="">Choose…<\/option>/);
  assert.doesNotMatch(admin, /selected[^>]*>Validate pair/);
  assert.doesNotMatch(admin, /selected[^>]*>Comparable/);
});

test('review packet does not acquire activation authority', () => {
  assert.match(admin, /Validation does not activate probes/);
  assert.match(admin, /Activation authority: none/);
});
