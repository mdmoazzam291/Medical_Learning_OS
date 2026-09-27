import { toExamSimulationPreset } from './exam-rules.js';

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

function requireLockedTimeSections(preset) {
  if (!preset.sections.length) fail('At least one exam section is required');
  if (preset.navigation.earlySectionAdvanceAllowed !== false ||
      preset.navigation.revisitClosedSectionsAllowed !== false ||
      preset.navigation.timeCarryForwardAllowed !== false ||
      preset.navigation.reviewWithinOpenSectionAllowed !== true) {
    fail('Ruleset is not supported by locked-time-sections-v1');
  }
  if (preset.scoring.markedForReviewScored !== true) {
    fail('Runner requires marked-for-review responses to use normal scoring');
  }
}

function questionSet(run) {
  return new Set(run.sections.flatMap(section => section.questionVersionIds));
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

export function createLockedSectionExamRun({
  ruleSet,
  runId,
  questionVersionIds,
  startedAt
}) {
  const preset = toExamSimulationPreset(ruleSet);
  requireLockedTimeSections(preset);
  text(runId, 'runId');
  canonicalInstant(startedAt, 'startedAt');

  if (!Array.isArray(questionVersionIds) ||
      questionVersionIds.length !== preset.totalQuestions) {
    fail('Question count does not match pinned ruleset');
  }
  questionVersionIds.forEach((id, index) => text(id, `questionVersionIds[${index}]`));
  if (new Set(questionVersionIds).size !== questionVersionIds.length) {
    fail('Duplicate questionVersionId');
  }

  const startMs = Date.parse(startedAt);
  let cursor = 0;
  let elapsedSeconds = 0;
  const sections = preset.sections.map(section => {
    const ids = questionVersionIds.slice(cursor, cursor + section.questionCount);
    cursor += section.questionCount;
    const scheduledStartAt = new Date(startMs + elapsedSeconds * 1000).toISOString();
    elapsedSeconds += section.durationSeconds;
    const scheduledEndAt = new Date(startMs + elapsedSeconds * 1000).toISOString();
    return {
      sectionId: section.sectionId,
      label: section.label,
      questionVersionIds: ids,
      scheduledStartAt,
      scheduledEndAt,
      closedAt: null
    };
  });

  if (cursor !== questionVersionIds.length ||
      elapsedSeconds !== preset.totalDurationSeconds) {
    fail('Pinned ruleset section totals are inconsistent');
  }

  return freeze({
    schemaVersion: 1,
    engineId: 'locked-time-sections-v1',
    runId: runId.trim(),
    examId: preset.examId,
    ruleSetId: preset.ruleSetId,
    caveats: preset.caveats,
    startedAt,
    scheduledEndAt: new Date(startMs + preset.totalDurationSeconds * 1000).toISOString(),
    status: 'in_progress',
    currentSectionIndex: 0,
    completedAt: null,
    sections,
    responses: {}
  });
}

export function advanceExamRunClock(input, at) {
  const run = structuredClone(input);
  canonicalInstant(at, 'at');
  if (run.engineId !== 'locked-time-sections-v1') fail('Unsupported exam run engine');
  if (run.status === 'completed') return freeze(run);

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
    throw new Error(index < run.currentSectionIndex
      ? 'section_locked'
      : 'future_section_locked');
  }
  return structuredClone(run);
}

export function setExamAnswer(input, {
  questionVersionId,
  optionId,
  at
}) {
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

export function setExamReview(input, {
  questionVersionId,
  markedForReview,
  at
}) {
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

export function requestEarlySectionAdvance() {
  throw new Error('early_section_advance_forbidden');
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

export function scoreCompletedExamRun({
  run: input,
  ruleSet,
  answerKey
}) {
  const preset = toExamSimulationPreset(ruleSet);
  requireLockedTimeSections(preset);
  if (input.ruleSetId !== preset.ruleSetId) throw new Error('ruleset_mismatch');
  if (input.status !== 'completed') throw new Error('exam_run_not_completed');
  if (!answerKey || typeof answerKey !== 'object' || Array.isArray(answerKey)) {
    fail('answerKey is required');
  }

  const ids = [...questionSet(input)];
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
    if (response.optionId === null) {
      unanswered += 1;
    } else if (response.optionId === answerKey[id]) {
      correct += 1;
    } else {
      incorrect += 1;
    }
  }

  const score =
    correct * preset.scoring.correct +
    incorrect * preset.scoring.incorrect +
    unanswered * preset.scoring.unanswered;

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
    scoring: preset.scoring
  });
}
