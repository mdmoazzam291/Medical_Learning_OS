// Pure content boundary. Review identities/roles must be authorized by a future server.
const roles = ['primary', 'secondary', 'prerequisite', 'distractor'];
const stages = ['draft', 'in_review', 'verified', 'published', 'retired'];
const reviewKinds = ['medical', 'references', 'rights'];
function fail(message) { throw new TypeError(message); }
function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`Invalid ${label}`);
}
function shape(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k))) {
    fail(`Expected fields: ${keys.join(', ')}`);
  }
}
function list(value, label) { if (!Array.isArray(value)) fail(`Invalid ${label}`); }
function unique(values, label) {
  if (new Set(values).size !== values.length) fail(`Duplicate ${label}`);
}
function timestamp(value) {
  text(value, 'timestamp');
  if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    fail('Expected canonical UTC ISO timestamp');
  }
}
function frozenCopy(value) {
  const copy = structuredClone(value);
  const freeze = object => {
    if (object && typeof object === 'object') {
      Object.values(object).forEach(freeze);
      Object.freeze(object);
    }
    return object;
  };
  return freeze(copy);
}
function concept(value) {
  shape(value, ['conceptId', 'label', 'aliases', 'subjectTags']);
  text(value.conceptId, 'conceptId'); text(value.label, 'label');
  for (const key of ['aliases', 'subjectTags']) {
    list(value[key], key); value[key].forEach(v => text(v, key)); unique(value[key], key);
  }
}
function source(value) {
  shape(value, ['sourceId', 'title', 'url', 'version', 'rights']);
  for (const key of ['sourceId', 'title', 'version']) text(value[key], key);
  if (value.url !== null) {
    text(value.url, 'url');
    let parsed;
    try { parsed = new URL(value.url); } catch { fail('Invalid source URL'); }
    if (!['https:', 'http:'].includes(parsed.protocol)) fail('Invalid source protocol');
  }
  shape(value.rights, ['status', 'evidence']);
  if (!['unknown', 'owned', 'licensed', 'public_domain'].includes(value.rights.status)) {
    fail('Invalid rights status');
  }
  text(value.rights.evidence, 'rights evidence');
}
function question(q, catalog) {
  shape(q, ['questionId', 'questionVersionId', 'version', 'supersedes', 'authorId',
    'changeReason', 'stem', 'options', 'answerOptionId', 'explanation', 'conceptLinks',
    'sourceIds', 'provenance', 'status', 'reviews', 'publishedAt']);
  for (const key of ['questionId', 'authorId', 'changeReason', 'stem', 'explanation']) text(q[key], key);
  if (!Number.isSafeInteger(q.version) || q.version < 1 ||
      q.questionVersionId !== `${q.questionId}@${q.version}`) fail('Invalid question version');
  if (q.supersedes !== (q.version === 1 ? null : `${q.questionId}@${q.version - 1}`)) {
    fail('Invalid supersedes link');
  }
  list(q.options, 'options');
  if (q.options.length < 2) fail('At least two options required');
  q.options.forEach(o => { shape(o, ['optionId', 'text']); text(o.optionId, 'optionId'); text(o.text, 'option text'); });
  unique(q.options.map(o => o.optionId), 'optionId');
  if (!q.options.some(o => o.optionId === q.answerOptionId)) fail('Answer must reference an option');
  list(q.conceptLinks, 'conceptLinks');
  q.conceptLinks.forEach(link => {
    shape(link, ['conceptId', 'role']);
    if (!roles.includes(link.role) || !catalog.concepts.some(c => c.conceptId === link.conceptId)) {
      fail('Invalid concept link');
    }
  });
  unique(q.conceptLinks.map(l => `${l.conceptId}\0${l.role}`), 'concept link');
  if (q.conceptLinks.filter(l => l.role === 'primary').length !== 1) fail('Exactly one primary concept required');
  list(q.sourceIds, 'sourceIds'); unique(q.sourceIds, 'sourceId');
  if (!q.sourceIds.length || q.sourceIds.some(id => !catalog.sources.some(s => s.sourceId === id))) {
    fail('Question must reference known sources');
  }
  shape(q.provenance, ['kind', 'exam', 'year', 'evidence']);
  if (!['original', 'ai_generated', 'recalled_pyq', 'licensed_pyq'].includes(q.provenance.kind)) {
    fail('Invalid provenance kind');
  }
  text(q.provenance.evidence, 'provenance evidence');
  if (q.provenance.kind.endsWith('_pyq')) {
    text(q.provenance.exam, 'exam');
    if (!Number.isSafeInteger(q.provenance.year) || q.provenance.year < 1900) fail('Invalid PYQ year');
  } else if (q.provenance.exam !== null || q.provenance.year !== null) {
    fail('Original/generated questions cannot claim PYQ metadata');
  }
  if (!stages.includes(q.status)) fail('Invalid content status');
  list(q.reviews, 'reviews'); unique(q.reviews.map(r => r?.kind), 'review kind');
  q.reviews.forEach(r => {
    shape(r, ['kind', 'reviewerId', 'reviewedAt', 'decision', 'notes']);
    if (!reviewKinds.includes(r.kind) || !['approved', 'rejected'].includes(r.decision)) fail('Invalid review');
    text(r.reviewerId, 'reviewerId'); text(r.notes, 'review notes'); timestamp(r.reviewedAt);
    if (r.reviewerId === q.authorId) fail('Author cannot approve own content');
  });
  const approved = reviewKinds.every(kind => q.reviews.some(r => r.kind === kind && r.decision === 'approved'));
  if (q.status === 'draft' && q.reviews.length) fail('Draft must not carry reviews');
  if (['verified', 'published'].includes(q.status) && !approved) fail('All review gates must pass');
  if (['draft', 'in_review', 'verified'].includes(q.status) && q.publishedAt !== null) fail('Invalid publication timestamp');
  if (q.status === 'published' && q.publishedAt === null) fail('Publication timestamp required');
  if (q.publishedAt !== null) {
    timestamp(q.publishedAt);
    if (!approved || q.reviews.some(r => r.reviewedAt > q.publishedAt)) fail('Invalid publication chronology');
    if (q.sourceIds.some(id => catalog.sources.find(s => s.sourceId === id).rights.status === 'unknown')) {
      fail('Unresolved source rights');
    }
  }
}

export function validateCatalog(input) {
  shape(input, ['schemaVersion', 'concepts', 'sources', 'questions']);
  if (input.schemaVersion !== 1) fail('Unsupported catalog version');
  for (const key of ['concepts', 'sources', 'questions']) list(input[key], key);
  input.concepts.forEach(concept); input.sources.forEach(source);
  unique(input.concepts.map(c => c.conceptId), 'conceptId');
  unique(input.sources.map(s => s.sourceId), 'sourceId');
  input.questions.forEach(q => question(q, input));
  unique(input.questions.map(q => q.questionVersionId), 'questionVersionId');
  for (const q of input.questions) {
    if (q.supersedes && !input.questions.some(p => p.questionVersionId === q.supersedes)) fail('Missing earlier question version');
  }
  unique(input.questions.filter(q => q.status === 'published').map(q => q.questionId), 'published question');
  return frozenCopy(input);
}

export function appendQuestionVersion(catalog, draft) {
  const current = validateCatalog(catalog);
  if (draft.status !== 'draft' || draft.reviews.length || draft.publishedAt !== null) fail('New versions must start as drafts');
  const prior = current.questions.filter(q => q.questionId === draft.questionId);
  const nextVersion = Math.max(0, ...prior.map(q => q.version)) + 1;
  if (draft.version !== nextVersion) fail('Question versions must be sequential');
  return validateCatalog({ ...current, questions: [...current.questions, draft] });
}
function update(catalog, id, fn) {
  const current = validateCatalog(catalog);
  if (!current.questions.some(q => q.questionVersionId === id)) fail('Unknown question version');
  return validateCatalog({ ...current, questions: current.questions.map(q =>
    q.questionVersionId === id ? fn(q) : q) });
}
export function submitForReview(catalog, id) {
  return update(catalog, id, q => {
    if (q.status !== 'draft') fail('Only drafts can enter review');
    return { ...q, status: 'in_review' };
  });
}
export function recordReview(catalog, id, review) {
  return update(catalog, id, q => {
    if (q.status !== 'in_review') fail('Question is not in review');
    const reviews = [...q.reviews, review];
    const approved = reviewKinds.every(kind => reviews.some(r => r.kind === kind && r.decision === 'approved'));
    return { ...q, reviews, status: approved ? 'verified' : 'in_review' };
  });
}
export function publishQuestion(catalog, id, publishedAt) {
  const current = validateCatalog(catalog);
  const target = current.questions.find(q => q.questionVersionId === id);
  if (!target || target.status !== 'verified') fail('Only verified questions can be published');
  if (current.questions.some(q => q.questionId === target.questionId && q.version > target.version && q.publishedAt !== null)) {
    fail('Cannot republish an older version');
  }
  return validateCatalog({ ...current, questions: current.questions.map(q => {
    if (q.questionVersionId === id) return { ...q, status: 'published', publishedAt };
    if (q.questionId === target.questionId && q.status === 'published') return { ...q, status: 'retired' };
    return q;
  }) });
}
export function retireQuestion(catalog, id) {
  return update(catalog, id, q => {
    if (!['in_review', 'verified', 'published'].includes(q.status)) fail('Invalid retirement transition');
    return { ...q, status: 'retired' };
  });
}
export function selectPublishedQuestions(catalog) {
  return validateCatalog(catalog).questions.filter(q => q.status === 'published');
}
export function toLearnerQuestion(question) {
  // Call only on a catalog-validated selected question; no answer keys before submission.
  if (question.status !== 'published') fail('Question is not published');
  return frozenCopy({ questionVersionId: question.questionVersionId,
    stem: question.stem, options: question.options });
}
