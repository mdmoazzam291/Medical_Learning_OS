import { readFileSync } from 'node:fs';
import { projectContentConnections } from '../src/domain/content-connections.js';

const read = name => JSON.parse(readFileSync(new URL('../data/' + name, import.meta.url), 'utf8'));
const catalogs = ['medical-seed-anaphylaxis-review.json', 'content-intake-pilot-rabies-01.json',
  'content-intake-connected-learning-08.json'].map(read);
const catalog = { schemaVersion: 1, ...Object.fromEntries(['concepts', 'sources', 'questions']
  .map(key => [key, catalogs.flatMap(c => c[key])])) };
const report = projectContentConnections(catalog, read('canonical-note-connected-learning-08.json').notes);
console.log(JSON.stringify({
  scope: 'repository-authoring-fixtures-not-live-readiness',
  ...report
}, null, 2));
