import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const review = JSON.parse(readFileSync(new URL('../data/series1/pilot-300-concept-review.json', import.meta.url), 'utf8'));
const FITS = new Set(['exact', 'broad', 'none', 'exclude']);
const FLAGS = new Set(['cross-subject', 'misfiled-subject', 'key-suspect', 'stem-cleanup', 'defect']);
const ROW_KEYS = new Set(['rowSuffix', 'subjectId', 'conceptLabel', 'fit', 'conceptSubject', 'gap', 'flags']);

test('Series 1 pilot review covers 304 distinct questions with valid decisions', () => {
  assert.equal(review.batchId, 'pilot-300');
  assert.match(review.reviewer, /not clinician-reviewed/);
  assert.equal(review.rows.length, 304);
  assert.equal(new Set(review.rows.map((row) => row.rowSuffix)).size, 304);
  for (const row of review.rows) {
    assert.match(row.rowSuffix, /^[0-9a-f]{8}$/);
    assert.ok(FITS.has(row.fit), row.rowSuffix);
    assert.equal(row.conceptLabel === null, row.fit === 'none' || row.fit === 'exclude', row.rowSuffix);
    for (const flag of row.flags ?? []) assert.ok(FLAGS.has(flag), `${row.rowSuffix} ${flag}`);
  }
});

test('Series 1 pilot review keeps question text out of the public repository', () => {
  for (const row of review.rows) {
    for (const key of Object.keys(row)) assert.ok(ROW_KEYS.has(key), `${row.rowSuffix} has unexpected field ${key}`);
    if (row.gap) assert.ok(row.gap.length <= 60 && !/[?]/.test(row.gap), row.rowSuffix);
    if (row.conceptSubject) assert.ok(row.conceptSubject.length <= 30, row.rowSuffix);
  }
});
