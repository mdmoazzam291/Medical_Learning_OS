// ADR-152: builds Admin-preview import manifests (content-library manifest v1) for Medretica QBank · Series 1
// from the private staging rows and the reviewed concept links. Pure: no database, no network, no logging.
// Question text never leaves the caller; results carry counts and reasons only alongside the manifest.
import { validateImport, SUBJECTS, COLLECTIONS } from './content-library.js';

export const SERIES1_COLLECTION = 'medretica-qbank-s1';
export const SERIES1_BUILDER_VERSION = 'series1-builder-v1';
const OPTION_KEYS = ['opa', 'opb', 'opc', 'opd'];
const OPTION_IDS = ['a', 'b', 'c', 'd'];
const HOLD_FLAGS = ['key-suspect', 'defect', 'no-explanation'];
const MONTH = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\\.?';
const EXAM = '(?:AIIMS|PGI|PGIMER|SGPGI|JIPMER|NEET(?:\\s*PG)?|AIPG(?:MEE?)?|AI|DNB|FMGE|UPSC|COMEDK|MAHE|KCET|CMC)';
// Trailing source tags such as ": March 2009", "AIIMS 06", "(NEET 13)"; a colon before the tag is kept. Exam acronyms are case-sensitive.
const TRAILING_TAGS = [
  new RegExp(`[\\s;,\\-]*[([]?\\s*${EXAM}\\s*(?:${MONTH}\\s*)?'?\\d{2,4}\\s*[)\\]]?\\s*\\.?\\s*$`),
  new RegExp(`[\\s;,\\-]*[([]?\\s*${MONTH}\\s*,?\\s*\\d{4}\\s*[)\\]]?\\s*\\.?\\s*$`)
];
const REPEATED = /\s*[([]?\bREPEATED\b[)\]]?/g;
const LEFTOVER_TAG = new RegExp(`\\b${EXAM}\\s*(?:${MONTH}\\s*)?'?\\d{2,4}\\b|\\bREPEATED\\b`);
const normalize = value => String(value).trim().toLowerCase().replace(/\s+/g, ' ');

/** Whole-word, case-preserving repair of words that lost the letters "rt". ALL-CAPS tokens are never changed. */
export function repairText(text, repairs) {
  let count = 0;
  const value = String(text ?? '').replace(/[A-Za-z]+/g, word => {
    if (word.length > 1 && word === word.toUpperCase()) return word;
    const fixed = Object.hasOwn(repairs, word.toLowerCase()) ? repairs[word.toLowerCase()] : null;
    if (!fixed) return word;
    count += 1;
    return word[0] === word[0].toUpperCase() ? fixed[0].toUpperCase() + fixed.slice(1) : fixed;
  });
  return { text: value, count };
}

/** Removes exam/date source tags from a stem. Returns the cleaned stem, how many tags went and whether one may remain. */
export function stripExamTags(stem) {
  let value = String(stem ?? '');
  let removed = 0;
  value = value.replace(REPEATED, () => { removed += 1; return ''; });
  for (let changed = true; changed;) {
    changed = false;
    for (const pattern of TRAILING_TAGS) {
      const next = value.replace(pattern, '');
      if (next !== value) { value = next; removed += 1; changed = true; }
    }
  }
  value = value.replace(/[\s,;\-–]+$/, '').trim();
  return { text: value, removed, leftover: LEFTOVER_TAG.test(value) };
}

function reviewIndex(review) {
  const index = new Map();
  for (const row of review?.rows ?? []) index.set(row.rowSuffix, row);
  return index;
}

/** Decide whether one staged row can go into Series 1; returns {question} or {heldBack: reason}. */
export function series1Question(row, reviewRow, repairs) {
  const p = row?.payload ?? {};
  if (row?.choiceType !== 'single') return { heldBack: 'not-single-answer' };
  if (!reviewRow) return { heldBack: 'not-reviewed' };
  if (!['exact', 'broad'].includes(reviewRow.fit) || !row.conceptId || !['confirmed', 'corrected'].includes(row.decision)) return { heldBack: 'no-concept' };
  const flag = HOLD_FLAGS.find(f => (reviewRow.flags ?? []).includes(f));
  if (flag) return { heldBack: flag };
  const key = Number(p.cop);
  if (!Number.isInteger(key) || key < 0 || key > 3) return { heldBack: 'answer-key-invalid' };
  let repairsMade = 0;
  const fix = value => { const r = repairText(value, repairs); repairsMade += r.count; return r.text.trim(); };
  const stripped = stripExamTags(fix(p.question));
  if (stripped.leftover) return { heldBack: 'stem-tag-unresolved' };
  const options = OPTION_KEYS.map((k, i) => ({ optionId: OPTION_IDS[i], text: fix(p[k]) }));
  if (options.some(o => !o.text)) return { heldBack: 'option-empty' };
  if (new Set(options.map(o => normalize(o.text))).size !== options.length) return { heldBack: 'duplicate-options' };
  const explanation = fix(p.exp);
  if (explanation.replace(/\W/g, '').length < 20) return { heldBack: 'no-explanation' };
  if (!stripped.text) return { heldBack: 'stem-empty' };
  return { question: { stem: stripped.text, options, answerOptionId: OPTION_IDS[key], explanation }, repairsMade, tagsRemoved: stripped.removed };
}

function conceptEntry(document) {
  const c = document.classification;
  const facets = Object.fromEntries(['subjects', 'systems', 'organs', 'domains', 'tasks'].map(f => [f, [...new Set(c?.[f] ?? [])]]));
  return { conceptId: document.conceptId, label: document.label, aliases: [...new Set(document.aliases ?? [])], subjectTags: [...facets.subjects], classification: facets };
}

/** Interleave eligible rows subject by subject (fixed order), so every batch covers all subjects. */
export function orderBySubject(items) {
  const bySubject = new Map();
  for (const item of [...items].sort((a, b) => a.subjectId.localeCompare(b.subjectId) || a.rowId.localeCompare(b.rowId))) {
    if (!bySubject.has(item.subjectId)) bySubject.set(item.subjectId, []);
    bySubject.get(item.subjectId).push(item);
  }
  const queues = [...bySubject.values()];
  const ordered = [];
  for (let round = 0; queues.some(q => q.length > round); round += 1) for (const q of queues) if (q[round]) ordered.push(q[round]);
  return ordered;
}

/**
 * rows: [{rowId, subjectId, choiceType, payload, conceptId, decision}] (private staging + review columns)
 * review: data/series1/<batch>-concept-review.json; concepts: {conceptId: accepted identity document}
 * Returns {manifest|null, summary} where summary holds counts only.
 */
export function buildSeries1Batch({ rows, review, concepts, repairs, batchId, batchNumber, size = 100 }) {
  if (!COLLECTIONS[SERIES1_COLLECTION]) throw new TypeError('collection_missing');
  if (!/^[a-z0-9-]{1,40}$/.test(batchId) || !Number.isInteger(batchNumber) || batchNumber < 1 || !Number.isInteger(size) || size < 1 || size > 100) throw new TypeError('batch_invalid');
  const index = reviewIndex(review);
  const heldBack = {};
  const eligible = [];
  for (const row of rows) {
    const reviewRow = index.get(String(row.rowId).slice(-8));
    const result = series1Question(row, reviewRow, repairs);
    if (result.heldBack) { heldBack[result.heldBack] = (heldBack[result.heldBack] ?? 0) + 1; continue; }
    const concept = concepts[row.conceptId];
    if (!concept) { heldBack['concept-missing'] = (heldBack['concept-missing'] ?? 0) + 1; continue; }
    eligible.push({ ...result, rowId: row.rowId, subjectId: row.subjectId, conceptId: row.conceptId, reviewRow });
  }
  const ordered = orderBySubject(eligible);
  const chosen = ordered.slice((batchNumber - 1) * size, batchNumber * size);
  const summary = { builder: SERIES1_BUILDER_VERSION, batchId, batchNumber, rows: rows.length, eligible: eligible.length, batches: Math.ceil(eligible.length / size), included: chosen.length, heldBack, repairs: 0, tagsRemoved: 0, subjects: {} };
  if (!chosen.length) return { manifest: null, summary };
  const usedConcepts = new Map();
  const questions = chosen.map(item => {
    summary.repairs += item.repairsMade; summary.tagsRemoved += item.tagsRemoved;
    summary.subjects[item.subjectId] = (summary.subjects[item.subjectId] ?? 0) + 1;
    const concept = conceptEntry(concepts[item.conceptId]);
    usedConcepts.set(concept.conceptId, concept);
    const misfiled = (item.reviewRow.flags ?? []).includes('misfiled-subject');
    const subjects = misfiled ? concept.classification.subjects.filter(s => SUBJECTS.includes(s)) : [item.subjectId];
    return {
      questionId: `${SERIES1_COLLECTION}:${item.rowId}`,
      ...item.question,
      conceptLinks: [{ conceptId: item.conceptId, role: 'primary' }],
      sourceIds: [SERIES1_COLLECTION],
      origins: [{ kind: 'platform', platformId: SERIES1_COLLECTION, edition: 'Series 1', evidence: `Series 1 item ${item.rowId}` }],
      classification: { subjects: subjects.length ? subjects : [item.subjectId], systems: [...concept.classification.systems], organs: [...concept.classification.organs], domains: [...concept.classification.domains], tasks: [] }
    };
  });
  const manifest = validateImport({
    schemaVersion: 1,
    importId: `${SERIES1_COLLECTION}-${batchId}-b${String(batchNumber).padStart(2, '0')}`,
    concepts: [...usedConcepts.values()].sort((a, b) => a.conceptId.localeCompare(b.conceptId)),
    sources: [{
      sourceId: SERIES1_COLLECTION,
      title: COLLECTIONS[SERIES1_COLLECTION].label,
      url: null,
      version: 'Series 1',
      evidence: 'Questions adapted from MedMCQA (Pal, Umapathi and Sankarasubbu, 2022; Apache-2.0; openlifescienceai/medmcqa, train split). Words missing "rt" repaired and exam tags removed by the Series 1 builder. Answer keys unverified (owner decision, 20 November 2026). Concept links AI-reviewed, not clinician-reviewed.'
    }],
    questions,
    notes: [],
    noteQuestionLinks: []
  });
  summary.concepts = usedConcepts.size;
  return { manifest, summary };
}
