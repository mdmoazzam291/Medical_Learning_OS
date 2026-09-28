// Pure locked-section exam runtime shared by domain tests and the trusted Edge API.
// No database, browser, or provider dependencies belong here.

function fail(message) { throw new TypeError(message); }

function canonicalInstant(value, field) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString() !== value) {
    fail(`${field} must be a canonical UTC ISO timestamp`);
  }
  return value;
}

function text(value, field) {
  if (typeof value !== 'string' || !value.trim()) fail(`${field} is required`);
  return value.trim();
}

function integer(value, min, field) {
  if (!Number.isSafeInteger(value) || value < min) fail(`${field} is invalid`);
  return value;
}

function freeze(value) {
  const copy = structuredClone(value);
  const visit = object => {
    if (object && typeof object === 'object') {
      Object.values(object).forEach(visit);
      Object.freeze(object);
    }
    return object;
  };
  return visit(copy);
}

function responseEntry(run, questionVersionId) {
  return run.responses[questionVersionId] ?? {
    optionId: null,
    markedForReview: false,
    answeredAt: null,
    updatedAt: null
  };
}

function sectionForQuestion(run, questionVersionId) {
  return run.sections.findIndex(section => section.questionVersionIds.includes(questionVersionId));
}

export function createLockedSectionRuntimeRun({
  runId,
  examId,
  ruleSetId,
  caveats = [],
  sections,
  totalQuestions,
  totalDurationSeconds,
  questionVersionIds,
  startedAt
}) {
  text(runId, 'runId');
  text(examId, 'examId');
  text(ruleSetId, 'ruleSetId');
  canonicalInstant(startedAt, 'startedAt');
  integer(totalQuestions, 1, 'totalQuestions');
  integer(totalDurationSeconds, 1, 'totalDurationSeconds');

  if (!Array.isArray(caveats) || caveats.some(item => typeof item !== 'string')) {
    fail('caveats are invalid');
  }
  if (!Array.isArray(sections) || sections.length === 0) fail('sections are required');
  if (!Array.isArray(questionVersionIds) || questionVersionIds.length !== totalQuestions) {
    fail('Question count does not match pinned ruleset');
  }
  questionVersionIds.forEach((id, index) => text(id, `questionVersionIds[${index}]`));
  if (new Set(questionVersionIds).size !== questionVersionIds.length) fail('Duplicate questionVersionId');

  const startMs = Date.parse(startedAt);
  let cursor = 0;
  let elapsedSeconds = 0;
  const runtimeSections = sections.map((section, index) => {
    if (!section || typeof section !== 'object' || Array.isArray(section)) fail(`sections[${index}] is invalid`);
    const sectionId = text(section.sectionId, `sections[${index}].sectionId`);
    const label = text(section.label, `sections[${index}].label`);
    const questionCount = integer(section.questionCount, 1, `sections[${index}].questionCount`);
    const durationSeconds = integer(section.durationSeconds, 1, `sections[${index}].durationSeconds`);
    const ids = questionVersionIds.slice(cursor, cursor + questionCount);
    if (ids.length !== questionCount) fail('Pinned ruleset section question totals are inconsistent');
    cursor += questionCount;
    const scheduledStartAt = new Date(startMs + elapsedSeconds * 1000).toISOString();
    elapsedSeconds += durationSeconds;
    const scheduledEndAt = new Date(startMs + elapsedSeconds * 1000).toISOString();
    return {
      sectionId,
      label,
      questionVersionIds: ids,
      scheduledStartAt,
      scheduledEndAt,
      closedAt: null
    };
  });

  if (cursor !== questionVersionIds.length || elapsedSeconds !== totalDurationSeconds) {
    fail('Pinned ruleset section totals are inconsistent');
  }

  return freeze({
    schemaVersion: 1,
    engineId: 'locked-time-sections-v1',
    runId: runId.trim(),
    examId: examId.trim(),
    ruleSetId: ruleSetId.trim(),
    caveats,
    startedAt,
    scheduledEndAt: new Date(startMs + totalDurationSeconds * 1000).toISOString(),
    status: 'in_progress',
    currentSectionIndex: 0,
    completedAt: null,
    sections: runtimeSections,
    responses: {}
  });
}

export function advanceExamRunClock(input, at) {
  const run = structuredClone(input);
  canonicalInstant(at, 'at');
  if (run.engineId !== 'locked-time-sections-v1') fail('Unsupported exam run engine');
  if (run.status === 'completed' || run.status === 'cancelled') return freeze(run);

  const atMs = Date.parse(at);
  if (atMs < Date.parse(run.startedAt)) fail('Clock cannot precede exam start');

  let index = run.currentSectionIndex;
  while (index !== null &&
         index < run.sections.length &&
         atMs >= Date.parse(run.sections[index].scheduledEndAt)) {
    run.sections[index].closedAt = run.sections[index].scheduledEndAt;
    index += 1;
  }

  if (index >= run.sections.length) {
    run.status = 'completed';
    run.currentSectionIndex = null;
    run.completedAt = run.scheduledEndAt;
  } else {
    run.currentSectionIndex = index;
  }

  return freeze(run);
}

function writableRun(input, questionVersionId, at) {
  const run = advanceExamRunClock(input, at);
  text(questionVersionId, 'questionVersionId');
  if (run.status !== 'in_progress' || run.currentSectionIndex === null) {
    throw new Error('exam_run_completed');
  }
  const index = sectionForQuestion(run, questionVersionId);
  if (index < 0) throw new Error('question_not_in_exam_run');
  if (index !== run.currentSectionIndex) {
    throw new Error(index < run.currentSectionIndex ? 'section_locked' : 'future_section_locked');
  }
  return structuredClone(run);
}

export function setExamAnswer(input, { questionVersionId, optionId, at }) {
  canonicalInstant(at, 'at');
  if (optionId !== null) text(optionId, 'optionId');
  const run = writableRun(input, questionVersionId, at);
  const current = responseEntry(run, questionVersionId);
  run.responses[questionVersionId] = {
    ...current,
    optionId,
    answeredAt: optionId === null ? null : (current.answeredAt ?? at),
    updatedAt: at
  };
  return freeze(run);
}

export function setExamReview(input, { questionVersionId, markedForReview, at }) {
  canonicalInstant(at, 'at');
  if (typeof markedForReview !== 'boolean') fail('markedForReview must be boolean');
  const run = writableRun(input, questionVersionId, at);
  const current = responseEntry(run, questionVersionId);
  run.responses[questionVersionId] = {
    ...current,
    markedForReview,
    updatedAt: at
  };
  return freeze(run);
}

export function cancelExamRun(input, { at, reason }) {
  canonicalInstant(at, 'at');
  if (!['user_abandoned', 'operator_cancelled'].includes(reason)) {
    fail('Invalid exam cancellation reason');
  }

  const run = structuredClone(advanceExamRunClock(input, at));
  if (run.status === 'completed') throw new Error('exam_run_completed');
  if (run.status === 'cancelled') throw new Error('exam_run_cancelled');
  if (run.status !== 'in_progress' || run.currentSectionIndex === null) {
    throw new Error('exam_run_not_open');
  }

  const current = run.sections[run.currentSectionIndex];
  if (current && current.closedAt === null) current.closedAt = at;
  run.status = 'cancelled';
  run.currentSectionIndex = null;
  run.termination = {
    kind: 'cancelled',
    reason,
    at
  };
  return freeze(run);
}

export function examRunProgress(input, at) {
  const run = advanceExamRunClock(input, at);
  const totalQuestions = run.sections.reduce((sum, section) => sum + section.questionVersionIds.length, 0);
  const answered = Object.values(run.responses).filter(response => response.optionId !== null).length;
  const markedForReview = Object.values(run.responses).filter(response => response.markedForReview).length;
  const current = run.currentSectionIndex === null ? null : run.sections[run.currentSectionIndex];

  return freeze({
    runId: run.runId,
    ruleSetId: run.ruleSetId,
    status: run.status,
    currentSectionIndex: run.currentSectionIndex,
    currentSectionId: current?.sectionId ?? null,
    currentSectionEndsAt: current?.scheduledEndAt ?? null,
    totalQuestions,
    answered,
    unanswered: totalQuestions - answered,
    markedForReview
  });
}

export function scoreLockedSectionExamRun({ run: input, ruleSetId, scoring, answerKey }) {
  text(ruleSetId, 'ruleSetId');
  if (input.ruleSetId !== ruleSetId) throw new Error('ruleset_mismatch');
  if (input.status !== 'completed') throw new Error('exam_run_not_completed');
  if (!scoring || typeof scoring !== 'object' || Array.isArray(scoring) ||
      typeof scoring.correct !== 'number' || !Number.isFinite(scoring.correct) ||
      typeof scoring.incorrect !== 'number' || !Number.isFinite(scoring.incorrect) ||
      typeof scoring.unanswered !== 'number' || !Number.isFinite(scoring.unanswered) ||
      scoring.markedForReviewScored !== true) {
    fail('Invalid scoring');
  }
  if (!answerKey || typeof answerKey !== 'object' || Array.isArray(answerKey)) {
    fail('answerKey is required');
  }

  const ids = input.sections.flatMap(section => section.questionVersionIds);
  if (Object.keys(answerKey).length !== ids.length ||
      ids.some(id => typeof answerKey[id] !== 'string' || !answerKey[id])) {
    fail('Answer key must cover the exact exam run');
  }

  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  let markedForReview = 0;
  for (const id of ids) {
    const response = responseEntry(input, id);
    if (response.markedForReview) markedForReview += 1;
    if (response.optionId === null) unanswered += 1;
    else if (response.optionId === answerKey[id]) correct += 1;
    else incorrect += 1;
  }

  const score =
    correct * scoring.correct +
    incorrect * scoring.incorrect +
    unanswered * scoring.unanswered;

  return freeze({
    runId: input.runId,
    examId: input.examId,
    ruleSetId: input.ruleSetId,
    completedAt: input.completedAt,
    totalQuestions: ids.length,
    correct,
    incorrect,
    unanswered,
    markedForReview,
    score,
    scoring
  });
}

export async function seededQuestionOrder(questionVersionIds, seed) {
  if (!Array.isArray(questionVersionIds) || questionVersionIds.length === 0) {
    fail('questionVersionIds are required');
  }
  questionVersionIds.forEach((id, index) => text(id, `questionVersionIds[${index}]`));
  if (new Set(questionVersionIds).size !== questionVersionIds.length) fail('Duplicate questionVersionId');
  if (typeof seed !== 'string' || seed.trim().length < 8 || seed.length > 200) fail('invalid_exam_assembly_seed');

  const encoder = new TextEncoder();
  const rows = await Promise.all(questionVersionIds.map(async questionVersionId => {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${seed.trim()}:${questionVersionId}`));
    const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    return { questionVersionId, hash };
  }));
  rows.sort((a, b) => a.hash.localeCompare(b.hash) || a.questionVersionId.localeCompare(b.questionVersionId));
  return freeze(rows.map(row => row.questionVersionId));
}
