import { questionSignature, questionAnswer } from './content-library.js';

// Server-side, read-only structural checks. Do not use this to decide clinical
// accuracy, rights ownership, or whether content should be published.
const MAX_FINDINGS = 120;
const validId = value => typeof value === 'string' && value.length > 0;
const sortedUnique = values => [...new Set(values.filter(validId))].sort();
const issueOrder = { critical: 0, warning: 1, info: 2 };

export function auditCanonicalCatalog({ catalog, notes, links, questionMetadata, conceptMetadata, catalogVersion } = {}) {
  if (!catalog || !Array.isArray(catalog.questions) || !Array.isArray(catalog.concepts) ||
    !Array.isArray(catalog.sources) || !Array.isArray(notes) || !Array.isArray(links) ||
    !Array.isArray(questionMetadata) || !Array.isArray(conceptMetadata) ||
    !Number.isSafeInteger(catalogVersion) || catalogVersion < 0) {
    throw new TypeError('integrity_snapshot_incomplete');
  }

  const findings = [], byCode = {};
  const record = (code, severity, entityType, entityId, relatedIds = []) => {
    byCode[code] = (byCode[code] || 0) + 1;
    findings.push({
      code, severity, entityType, entityId: String(entityId || ''),
      relatedIds: sortedUnique(relatedIds)
    });
  };
  const index = (rows, field, type) => {
    const mapped = new Map();
    for (const row of rows) {
      const id = row?.[field];
      if (!validId(id)) { record('invalid_canonical_id', 'critical', type, 'missing'); continue; }
      if (mapped.has(id)) record('duplicate_canonical_id', 'critical', type, id);
      else mapped.set(id, row);
    }
    return mapped;
  };

  const concepts = index(catalog.concepts, 'conceptId', 'concept');
  const sources = index(catalog.sources, 'sourceId', 'source');
  const notesById = index(notes, 'id', 'note');
  const questionById = new Map(), publishedVersions = new Map(), signatures = new Map();
  const activeQuestions = catalog.questions.filter(q => q?.status === 'published' || q?.status === 'in_review');
  const publishedQuestions = catalog.questions.filter(q => q?.status === 'published');

  for (const q of catalog.questions) {
    const id = q?.questionId;
    if (!validId(id)) { record('invalid_canonical_id', 'critical', 'question', 'missing'); continue; }
    if (!questionById.has(id)) questionById.set(id, q);
    if (q?.status === 'published') {
      publishedVersions.set(id, (publishedVersions.get(id) || 0) + 1);
      if (publishedVersions.get(id) === 2) record('multiple_published_versions', 'critical', 'question', id);
    }
  }
  for (const q of activeQuestions) {
    const id = q?.questionId;
    if (!validId(id)) continue;
    if (!validId(q.questionVersionId)) record('missing_question_version', 'critical', 'question', id);
    const relations = Array.isArray(q.conceptLinks) ? q.conceptLinks : [];
    const primary = relations.filter(link => link?.role === 'primary');
    if (primary.length !== 1) record('primary_concept_cardinality', 'critical', 'question', id);
    const found = new Set();
    for (const link of relations) {
      if (!validId(link?.conceptId) || !concepts.has(link.conceptId)) record('missing_question_concept', 'critical', 'question', id, [link?.conceptId]);
      const key = String(link?.conceptId) + ':' + String(link?.role);
      if (found.has(key)) record('repeated_concept_edge', 'warning', 'question', id, [link?.conceptId]);
      found.add(key);
    }
    for (const sourceId of q.sourceIds || []) {
      if (!sources.has(sourceId)) record('missing_question_source', 'critical', 'question', id, [sourceId]);
    }
    try {
      if (!Array.isArray(q.options) || !q.options.length) throw Error('options_missing');
      const signature = questionSignature(q), answer = questionAnswer(q);
      if (!answer) record('answer_option_unresolvable', 'critical', 'question', id);
      const existing = signatures.get(signature);
      if (existing && existing.id !== id) {
        record(answer !== existing.answer ? 'canonical_answer_conflict' : 'canonical_duplicate_family',
          answer !== existing.answer ? 'critical' : 'warning', 'question', id, [existing.id]);
      } else if (!existing) signatures.set(signature, { id, answer });
    } catch {
      record('question_signature_unverifiable', 'critical', 'question', id);
    }
  }

  const metaIds = new Set();
  for (const m of questionMetadata) {
    const id = m?.question_id;
    if (!validId(id)) { record('invalid_metadata_question_id', 'warning', 'question_metadata', 'missing'); continue; }
    if (metaIds.has(id)) record('repeated_question_metadata', 'warning', 'question_metadata', id);
    metaIds.add(id);
    const current = questionById.get(id);
    if (!current) { record('orphan_question_metadata', 'warning', 'question_metadata', id); continue; }
    if (m.concept_links_version_id && m.concept_links_version_id !== current.questionVersionId) {
      record('stale_question_graph_binding', 'warning', 'question_metadata', id);
    }
    const origins = Array.isArray(m.origins) ? m.origins : [];
    const occurrences = origins.filter(x => x?.kind === 'pyq');
    const seen = new Set();
    for (const occurrence of occurrences) {
      const key = JSON.stringify([occurrence.examId, occurrence.year, occurrence.session]);
      if (seen.has(key)) record('repeated_pyq_occurrence', 'warning', 'question_metadata', id);
      seen.add(key);
    }
  }
  const conceptMetaIds = new Set();
  for (const m of conceptMetadata) {
    const id = m?.concept_id;
    if (!validId(id)) continue;
    if (conceptMetaIds.has(id)) record('repeated_concept_metadata', 'warning', 'concept_metadata', id);
    conceptMetaIds.add(id);
    if (!concepts.has(id)) record('orphan_concept_metadata', 'warning', 'concept_metadata', id);
  }

  const linkedNoteIds = new Set();
  for (const link of links) {
    const noteId = String(link?.note_version_id || '');
    const qId = String(link?.question_id || '');
    if (!notesById.has(noteId)) record('missing_note_link_target', 'warning', 'note_link', noteId, [qId]);
    if (!questionById.has(qId)) record('missing_question_link_target', 'warning', 'note_link', noteId, [qId]);
    if (notesById.has(noteId) && questionById.has(qId)) linkedNoteIds.add(noteId);
  }
  for (const note of notes) {
    const id = note?.id;
    if (!validId(id)) continue;
    if (!concepts.has(note.concept_id)) record('missing_note_concept', 'critical', 'note', id, [note.concept_id]);
    for (const sourceId of Array.isArray(note.source_ids) ? note.source_ids : []) {
      if (!sources.has(sourceId)) record('missing_note_source', 'critical', 'note', id, [sourceId]);
    }
    if (note.status === 'published' && !linkedNoteIds.has(id)) record('published_note_without_question', 'warning', 'note', id);
    if (note.supersedes_id && !notesById.has(note.supersedes_id)) {
      record('missing_note_predecessor', 'warning', 'note', id, [note.supersedes_id]);
    }
  }
  const totals = {
    questions: catalog.questions.length, publishedQuestions: publishedQuestions.length,
    concepts: catalog.concepts.length, sources: catalog.sources.length,
    notes: notes.length, noteQuestionLinks: links.length,
    questionMetadata: questionMetadata.length, conceptMetadata: conceptMetadata.length
  };
  findings.sort((a, b) => issueOrder[a.severity] - issueOrder[b.severity] ||
    a.code.localeCompare(b.code) || a.entityId.localeCompare(b.entityId));
  const findingCount = Object.values(byCode).reduce((sum, n) => sum + n, 0);
  const displayedFindings = findings.slice(0, MAX_FINDINGS);
  return {
    contractId: 'owner-catalog-integrity-v1',
    catalogVersion, totals,
    findingCount, byCode: Object.fromEntries(Object.entries(byCode).sort(([a], [b]) => a.localeCompare(b))),
    findings: displayedFindings, findingsTruncated: findingCount > displayedFindings.length,
    scanComplete: true, evidenceScope: 'structural_only',
    clinicalAccuracyVerified: false, rightsVerified: false,
    emptyCatalog: totals.questions === 0 && totals.concepts === 0 && totals.sources === 0,
    crossTableAtomicSnapshot: false
  };
}
