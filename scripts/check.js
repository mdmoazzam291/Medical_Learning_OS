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
\nconst decisionText = readFileSync('docs/DECISIONS.md', 'utf8');\nconst adrIds = [...decisionText.matchAll(/^## ADR-(\\d+)\\s+—/gm)].map(match => match[1]);\nconst adrCounts = new Map();\nfor (const id of adrIds) adrCounts.set(id, (adrCounts.get(id) ?? 0) + 1);\nconst legacyDuplicateAdrIds = new Set(['028', '052', '058']);\nconst unexpectedDuplicateAdrIds = [...adrCounts.entries()]\n  .filter(([id, count]) => count > 1 && !legacyDuplicateAdrIds.has(id))\n  .map(([id]) => id);\nif (unexpectedDuplicateAdrIds.length) {\n  throw new Error('Duplicate ADR IDs are not allowed: ' + unexpectedDuplicateAdrIds.join(', '));\n}\nfor (const id of legacyDuplicateAdrIds) {\n  if ((adrCounts.get(id) ?? 0) !== 2) {\n    throw new Error('Legacy ADR duplicate exception changed unexpectedly: ' + id);\n  }\n}\n\nconsole.log('Syntax, draft catalog, and decision-ledger checks passed');
