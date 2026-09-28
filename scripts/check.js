import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validateCatalog, selectPublishedQuestions } from '../src/domain/content.js';
for (const directory of ['src', 'tests', 'examples', 'scripts', 'web']) {
  for (const path of readdirSync(directory, { recursive: true })) {
    if (!path.endsWith('.js')) continue;
    const check = spawnSync(process.execPath, ['--check', `${directory}/${path}`], { stdio: 'inherit' });
    if (check.error || check.status !== 0) process.exit(1);
  }
}
const catalog = validateCatalog(JSON.parse(readFileSync('data/content-draft.json', 'utf8')));
if (selectPublishedQuestions(catalog).length) throw new Error('Demonstration fixture must remain unpublished');

const medicalSeed = validateCatalog(JSON.parse(readFileSync('data/medical-seed-anaphylaxis-review.json', 'utf8')));
if (selectPublishedQuestions(medicalSeed).length) throw new Error('Medical review seed must remain unpublished');
if (medicalSeed.questions.length !== 1 || medicalSeed.questions[0].status !== 'in_review') throw new Error('Medical review seed must contain one in-review question');
if (medicalSeed.questions[0].provenance.kind !== 'ai_generated') throw new Error('Medical review seed provenance must remain AI-generated');

const decisionText = readFileSync('docs/DECISIONS.md', 'utf8');
const adrIds = [...decisionText.matchAll(/^## ADR-(\d+)\s+—/gm)].map(match => match[1]);
const adrCounts = new Map();
for (const id of adrIds) adrCounts.set(id, (adrCounts.get(id) ?? 0) + 1);
const legacyDuplicateAdrIds = new Set(['028', '052', '058']);
const unexpectedDuplicateAdrIds = [...adrCounts.entries()]
  .filter(([id, count]) => count > 1 && !legacyDuplicateAdrIds.has(id))
  .map(([id]) => id);
if (unexpectedDuplicateAdrIds.length) {
  throw new Error('Duplicate ADR IDs are not allowed: ' + unexpectedDuplicateAdrIds.join(', '));
}
for (const id of legacyDuplicateAdrIds) {
  if ((adrCounts.get(id) ?? 0) !== 2) {
    throw new Error('Legacy ADR duplicate exception changed unexpectedly: ' + id);
  }
}

console.log('Syntax, draft catalog, and decision-ledger checks passed');

