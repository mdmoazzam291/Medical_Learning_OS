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
console.log('Syntax and draft catalog checks passed');
