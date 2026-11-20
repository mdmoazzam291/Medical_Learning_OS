// Runs the NMC concept matcher over staged questions (ADR-150). Used by .github/workflows/map-dataset-concepts.yml.
// Input: concepts.jsonl ({conceptId,label,aliases,subjects}) and questions.jsonl (staging rows: {row_id, subject_label,
// topic_label, payload}). Output: results.jsonl. Logs are public, so only counts are printed — never question text.
// Usage: node scripts/map-dataset-concepts.js concepts.jsonl questions.jsonl results.jsonl <batchId>
import { readFileSync, writeFileSync } from 'node:fs';
import { buildConceptIndex, matchQuestion, MATCHER_VERSION } from '../src/domain/concept-matcher.js';

const [conceptsPath, questionsPath, outPath, batchId] = process.argv.slice(2);
if (!conceptsPath || !questionsPath || !outPath || !/^[a-z0-9-]{1,40}$/.test(batchId || '')) {
  console.error('usage: map-dataset-concepts.js concepts.jsonl questions.jsonl results.jsonl <batchId>'); process.exit(2);
}
const lines = path => readFileSync(path, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const index = buildConceptIndex(lines(conceptsPath));
const out = [], counts = {};
for (const row of lines(questionsPath)) {
  const p = row.payload || {};
  const options = [p.opa, p.opb, p.opc, p.opd];
  const result = matchQuestion({ subjectLabel: row.subject_label, stem: p.question, answer: options[Number(p.cop)],
    explanation: p.exp, topic: row.topic_label }, index);
  counts[result.status] = (counts[result.status] || 0) + 1;
  out.push(JSON.stringify({ dataset_id: 'medmcqa', row_id: row.row_id, batch_id: batchId, subject_id: result.subjectId,
    status: result.status, concept_id: result.conceptId, confidence: result.confidence, reason: result.reason,
    candidates: result.candidates, matcher_version: MATCHER_VERSION }));
}
writeFileSync(outPath, out.join('\n') + (out.length ? '\n' : ''));
console.log(JSON.stringify({ batchId, matcher: MATCHER_VERSION, indexedNames: index.length, questionCount: out.length, ...counts }));
