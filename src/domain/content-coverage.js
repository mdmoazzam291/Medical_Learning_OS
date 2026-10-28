// Metadata-only Admin inventory. Stored workflow state is not clinical approval.
import { SUBJECTS, questionHome } from './content-library.js';
const invalid = () => { throw new TypeError('coverage_filter_invalid'); };
const badSnapshot = () => { throw new TypeError('coverage_snapshot_invalid'); };
const states = ['all', 'pending', 'stored-published', 'stored-verified'];
const gaps = ['', 'no-assessment', 'no-questions', 'no-notes', 'pending', 'unclassified'];
const allowed = ['snapshot', 'subject', 'system', 'concept', 'search', 'home', 'exam', 'year', 'task', 'state', 'gap', 'cursor', 'limit'];
export function parseCoverageFilters(params = new URLSearchParams()) {
  for (const key of params.keys()) if (!allowed.includes(key) || params.getAll(key).length !== 1) invalid();
  const f = Object.fromEntries(allowed.map(key => [key, params.get(key) || '']));
  if (Object.values(f).some(x => x.length > 240 || /[\u0000-\u001f]/.test(x))) invalid();
  f.state ||= 'all'; f.limit ||= '50'; f.cursor ||= '0';
  if (!states.includes(f.state) || !gaps.includes(f.gap) || (f.subject && !SUBJECTS.includes(f.subject) && f.subject !== 'unclassified') ||
      (f.home && !['pyq', 'platform', 'original'].includes(f.home)) || (f.year && !/^(19|20)\d{2}$/.test(f.year)) ||
      !/^(?:[1-9]|[1-9]\d|100)$/.test(f.limit) || !/^(0|[1-9]\d{0,5})$/.test(f.cursor) ||
      (f.snapshot && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(f.snapshot))) invalid();
  return { ...f, limit: Number(f.limit), cursor: Number(f.cursor) };
}
const uniq = values => [...new Set(values)];
const arr = x => Array.isArray(x) ? x : badSnapshot();
const id = x => typeof x === 'string' && x.length > 0 && x.length <= 240;
function latest(versions, statuses) {
  const map = new Map();
  for (const q of versions.filter(q => statuses.includes(q.status))) if (!map.has(q.questionId) || map.get(q.questionId).version < q.version) map.set(q.questionId, q);
  return [...map.values()];
}
function selectedVersions(questions, state) {
  const pending = latest(questions, ['draft', 'in_review']), published = latest(questions, ['published']), verified = latest(questions, ['verified']);
  return state === 'pending' ? pending : state === 'stored-published' ? published : state === 'stored-verified' ? verified : [...pending, ...published, ...verified];
}
function matches(q, f) {
  const home = questionHome(q.origins);
  return (!f.home || home.kind === f.home) && (!f.exam || q.origins.some(o => o.kind === 'pyq' && o.examId === f.exam && (!f.year || String(o.year) === f.year))) &&
    (!f.year || q.origins.some(o => o.kind === 'pyq' && String(o.year) === f.year && (!f.exam || o.examId === f.exam))) &&
    (!f.task || q.classification?.tasks?.includes(f.task));
}
const questionCount = rows => uniq(rows.map(q => q.questionId)).length;
const claims = (rows, f) => uniq(rows.flatMap(q => q.origins.filter(o => o.kind === 'pyq' && (!f.exam || o.examId === f.exam) && (!f.year || String(o.year) === f.year)).map(o => JSON.stringify([q.questionId, o.examId, o.year, o.session])))).length;
function counts(primary, other, notes, staged, filters) {
  return { questions: questionCount(primary), otherQuestions: questionCount(other), pendingQuestions: questionCount(primary.filter(q => ['draft', 'in_review'].includes(q.status))),
    publishedQuestions: questionCount(primary.filter(q => q.status === 'published')), verifiedQuestions: questionCount(primary.filter(q => q.status === 'verified')),
    noteVersions: notes.length, pyqClaims: claims(primary, filters), stagedQuestions: staged.length };
}
export function coveragePage(snapshot, filters = parseCoverageFilters()) {
  const s = snapshot, f = filters;
  if (!s || !id(s.snapshotId) || !Number.isSafeInteger(s.catalogVersion) || s.catalogVersion < 0 || !Number.isFinite(Date.parse(s.asOf)) || !Number.isFinite(Date.parse(s.expiresAt)) || !id(s.registryVersion)) badSnapshot();
  const concepts = arr(s.concepts), questions = arr(s.questions), notes = arr(s.notes), candidates = arr(s.candidates), links = arr(s.links || []);
  if ([concepts, questions, notes, candidates, links].some(rows => rows.length > 50000)) badSnapshot();
  if (new Set(concepts.map(c => c.conceptId)).size !== concepts.length || new Set(questions.map(q => q.questionVersionId)).size !== questions.length) badSnapshot();
  for (const c of concepts) if (!id(c.conceptId) || !id(c.label) || !Array.isArray(c.aliases) || !c.classification || ['subjects', 'systems', 'organs', 'domains', 'tasks'].some(k => !Array.isArray(c.classification[k]))) badSnapshot();
  for (const q of questions) if (!id(q.questionId) || !id(q.questionVersionId) || !Number.isSafeInteger(q.version) || q.version < 1 || !['draft', 'in_review', 'verified', 'published', 'retired'].includes(q.status) || !Array.isArray(q.conceptLinks) || !Array.isArray(q.origins) || q.conceptLinks.some(l => !id(l.conceptId) || !['primary', 'secondary', 'prerequisite', 'distractor'].includes(l.role))) badSnapshot();
  for (const n of notes) if (!id(n.id) || !id(n.conceptId) || !['draft', 'in_review', 'verified', 'published', 'retired', 'rejected'].includes(n.status)) badSnapshot();
  for (const c of candidates) if (!id(c.importId) || !id(c.questionId) || !Array.isArray(c.conceptIds)) badSnapshot();
  const versions = selectedVersions(questions, f.state).filter(q => matches(q, f));
  const noteStates = f.state === 'pending' ? ['draft', 'in_review'] : f.state === 'stored-published' ? ['published'] : f.state === 'stored-verified' ? ['verified'] : ['draft', 'in_review', 'verified', 'published'];
  const artifactFiltered = Boolean(f.home || f.exam || f.year || f.task);
  const conceptRows = concepts.filter(c => (!f.subject || (f.subject === 'unclassified' ? !c.classification.subjects.length : c.classification.subjects.includes(f.subject))) &&
    (!f.system || c.classification.systems.includes(f.system)) && (!f.concept || c.conceptId === f.concept) && (!f.search || [c.conceptId, c.label, ...c.aliases].join(' ').toLowerCase().includes(f.search.toLowerCase())));
  const primaryIndex = new Map(), otherIndex = new Map(), noteIndex = new Map(), candidateIndex = new Map();
  const add = (index, key, value) => { if (!index.has(key)) index.set(key, []); index.get(key).push(value); };
  for (const q of versions) {
    for (const key of uniq(q.conceptLinks.filter(l => l.role === 'primary').map(l => l.conceptId))) add(primaryIndex, key, q);
    for (const key of uniq(q.conceptLinks.filter(l => l.role !== 'primary').map(l => l.conceptId))) add(otherIndex, key, q);
  }
  for (const n of notes) if (noteStates.includes(n.status)) add(noteIndex, n.conceptId, n);
  for (const q of candidates) for (const key of uniq(q.conceptIds)) add(candidateIndex, key, q);
  const linkedNotes = new Map(notes.filter(n => noteStates.includes(n.status)).map(n => [n.id, n.conceptId]));
  const byQuestion = new Map();
  for (const q of versions) add(byQuestion, q.questionId, q);
  for (const link of links) {
    if (!id(link.noteVersionId) || !id(link.questionId) || !['explains', 'contrasts', 'prerequisite'].includes(link.relation)) badSnapshot();
    const conceptId = linkedNotes.get(link.noteVersionId);
    if (!conceptId) continue;
    for (const q of byQuestion.get(link.questionId) || []) {
      if (!(primaryIndex.get(conceptId) || []).includes(q) && !(otherIndex.get(conceptId) || []).includes(q)) add(otherIndex, conceptId, q);
    }
  }

  const materialFor = c => {
    const primary = primaryIndex.get(c.conceptId) || [];
    const other = otherIndex.get(c.conceptId) || [];
    // Question-only filters cannot establish note or staged-candidate matches.
    const ns = artifactFiltered ? [] : (noteIndex.get(c.conceptId) || []);
    const staged = artifactFiltered || f.state !== 'all' ? [] : (candidateIndex.get(c.conceptId) || []);
    return { primary, other, ns, staged };
  };
  const rows = conceptRows.map(c => {
    const {primary, other, ns, staged} = materialFor(c), n = counts(primary, other, ns, staged, f);
    const rowGaps = [...(!n.questions ? ['no-assessment'] : []), ...(!n.questions && !n.otherQuestions ? ['no-questions'] : []), ...(!artifactFiltered && !n.noteVersions ? ['no-notes'] : []), ...(n.pendingQuestions || n.stagedQuestions ? ['pending'] : []), ...(!c.classification.subjects.length ? ['unclassified'] : [])];
    return { conceptId: c.conceptId, label: c.label, subjects: [...c.classification.subjects], systems: [...c.classification.systems], counts: n, gaps: rowGaps,
      questionVersions: uniq([...primary, ...other].map(q => q.questionVersionId)), noteVersions: ns.map(n => n.id) };
  }).filter(r => !f.gap || r.gaps.includes(f.gap)).sort((a,b) => a.label.localeCompare(b.label, 'en') || a.conceptId.localeCompare(b.conceptId, 'en'));
  const included = new Set(rows.map(r => r.conceptId)), scoped = conceptRows.filter(c => included.has(c.conceptId)).map(materialFor);
  const primary = uniq(scoped.flatMap(x => x.primary)), other = uniq(scoped.flatMap(x => x.other));
  const summary = { ...counts(primary, other, uniq(scoped.flatMap(x => x.ns)), uniq(scoped.flatMap(x => x.staged)), f), concepts: rows.length,
    candidateQuestions: candidates.length, approvedQuestions: null, verifiedPyqOccurrences: null };
  return { contractId: 'admin-content-coverage-v1', snapshotId: s.snapshotId, asOf: s.asOf, expiresAt: s.expiresAt, catalogVersion: s.catalogVersion, registryVersion: s.registryVersion,
    baseline: { status: 'incomplete', version: null, coverageFraction: null }, summary,
    facets: { subjects: [...SUBJECTS], systems: uniq(concepts.flatMap(c => c.classification.systems)).sort(), exams: uniq(questions.flatMap(q => q.origins.filter(o=>o.kind==='pyq').map(o=>o.examId))).sort(), years: uniq(questions.flatMap(q=>q.origins.filter(o=>o.kind==='pyq').map(o=>o.year))).sort(), tasks: uniq(questions.flatMap(q=>q.classification?.tasks || [])).sort() },
    rows: rows.slice(f.cursor, f.cursor + f.limit), nextCursor: f.cursor + f.limit < rows.length ? String(f.cursor + f.limit) : null };
}
