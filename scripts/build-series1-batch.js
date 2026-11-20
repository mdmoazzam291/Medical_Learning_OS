// Builds one Admin-preview Series 1 import manifest (ADR-152). Used by .github/workflows/stage-series1-batch.yml.
// Input: rows.jsonl ({rowId, subjectId, choiceType, payload, conceptId, decision}) and concepts.json ({id: identity}).
// Output: the validated manifest file. Logs are public, so only counts are printed — never question text.
// Usage: node scripts/build-series1-batch.js rows.jsonl concepts.json manifest.json <batchId> <batchNumber>
import { readFileSync, writeFileSync } from 'node:fs';
import { buildSeries1Batch } from '../src/domain/series1-manifest.js';

const [rowsPath, conceptsPath, outPath, batchId, batchNumberText] = process.argv.slice(2);
const batchNumber = Number(batchNumberText);
if (!rowsPath || !conceptsPath || !outPath || !/^[a-z0-9-]{1,40}$/.test(batchId || '') || !Number.isInteger(batchNumber)) {
  console.error('usage: build-series1-batch.js rows.jsonl concepts.json manifest.json <batchId> <batchNumber>'); process.exit(2);
}
const rows = readFileSync(rowsPath, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
try {
  const { manifest, summary } = buildSeries1Batch({
    rows, concepts: JSON.parse(readFileSync(conceptsPath, 'utf8')),
    review: read(`../data/series1/${batchId}-concept-review.json`), repairs: read('../data/series1/text-repairs.json').repairs,
    batchId, batchNumber
  });
  if (manifest) writeFileSync(outPath, JSON.stringify(manifest));
  console.log(JSON.stringify({ ...summary, importId: manifest?.importId ?? null }));
  if (!manifest) process.exitCode = 3;
} catch (error) {
  // Validation messages are codes; never print row content.
  console.error('Series 1 build failed: ' + String(error?.message || 'unknown').slice(0, 80)); process.exitCode = 1;
}
