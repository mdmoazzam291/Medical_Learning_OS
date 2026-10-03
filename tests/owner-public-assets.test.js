import test from 'node:test';
import assert from 'node:assert/strict';
import { publicFileSet } from '../scripts/public-surface.js';

test('production server exposes all owner console browser assets', () => {
  for (const path of [
    'web/owner-console.css',
    'web/owner-console.js',
    'src/adapters/cloud-owner.js'
  ]) {
    assert.equal(publicFileSet.has(path), true, `${path} must be public`);
  }
});
