// Lexical screening for subsequent source-scope review.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root = new URL('../../', import.meta.url);
const prefix = 'docs/evidence/2026-11-08-nmc-';
const triagePath = prefix + 'standalone-topic-reuse-triage.json';
const reportPath = prefix + 'standalone-topic-variant-leads.json';
const raw = path => readFileSync(new URL(path, root), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const triageText = raw(triagePath);
const triage = JSON.parse(triageText);
const labels = new Map();

for (const {path, sha256} of triage.inputDigests) {
  const contents = raw(path);
  assert.equal(hash(contents), sha256, path);
  const inventory = JSON.parse(contents);
  const entries = inventory.names ?? inventory.entries ?? inventory.homes
    ?? (path.includes('scoped-task-home-proposals-batch-') ? inventory.rows : []);
  for (const entry of entries) {
    const name = entry.proposedHomeName ?? entry.name;
    const key = entry.proposedHomeNameKey ?? entry.nameKey;
    if (!name || !key) continue;
    const item = labels.get(key) ?? {name, nameKey: key, inventoryPaths: []};
    if (!item.inventoryPaths.includes(path)) item.inventoryPaths.push(path);
    labels.set(key, item);
  }
}

function tokens(name) {
  return name.normalize('NFKC').toLowerCase().replace(/[‐‑–—-]/gu, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/u).map(word =>
      word.replace(/haem/g, 'hem').replace(/oedem/g, 'edem')
        .replace(/aetiolog/g, 'etiolog').replace(/ischaem/g, 'ischem')
        .replace(/oesophag/g, 'esophag').replace(/paediatr/g, 'pediatr')
        .replace(/anaesthe/g, 'anesthe').replace(/tumour/g, 'tumor'));
}

function reason(a, b) {
  const left = a.join(' ');
  const right = b.join(' ');
  if (left === right) return 'normalized-spelling-or-punctuation';
  const acronym = (short, long) => short.length === 1 && /^[a-z]{3,8}$/u.test(short[0])
    && long.length >= 3 && short[0] === long.map(word => word[0]).join('');
  if (acronym(a, b) || acronym(b, a)) return 'possible-abbreviation';
  const contains = (short, long) => short.length >= 2 && long.length > short.length
    && long.length - short.length <= 3 && (' ' + long.join(' ') + ' ').includes(' ' + short.join(' ') + ' ');
  if (contains(a, b) || contains(b, a)) return 'shared-phrase-scope-review';
}

const cohort = triage.rows.filter(row => row.triage === 'same-source-label-only');
assert.equal(cohort.length, 545);
assert.equal(new Set(cohort.map(row => row.topicNameKey)).size, cohort.length);
const candidates = [...labels.values()].map(item => ({item, words: tokens(item.name)}));
const rows = cohort.flatMap(row => {
  const words = tokens(row.topicName);
  const leads = candidates.flatMap(({item, words: candidateWords}) => {
    if (item.nameKey === row.topicNameKey) return [];
    const signal = reason(words, candidateWords);
    return signal ? [{...item, signal}] : [];
  });
  return leads.length ? [{topicNameKey: row.topicNameKey, topicName: row.topicName,
    sourceReferenceIds: row.sourceReferenceIds, leads, mappingAccepted: false,
    semanticEquivalence: 'unverified', canonicalConceptId: null, canonicalObjectiveVersionId: null}] : [];
});
const totals = {screenedTopics: cohort.length, topicsWithLeads: rows.length,
  topicsWithoutLexicalLeads: cohort.length - rows.length,
  leads: rows.reduce((sum, row) => sum + row.leads.length, 0)};
const report = {schemaVersion: 1, status: 'lexical-review-leads',
  sourceTriage: {path: triagePath, sha256: hash(triageText)}, totals, rows};
if (process.argv.includes('--verify')) {
  assert.deepEqual(JSON.parse(raw(reportPath)), report);
  console.log(JSON.stringify(totals));
} else {
  console.log(JSON.stringify(report, null, 2));
}
