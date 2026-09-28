function fail(message) { throw new TypeError(message); }

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

function responseFor(run, questionVersionId) {
  return run.responses?.[questionVersionId] ?? {
    optionId: null,
    markedForReview: false,
    answeredAt: null,
    updatedAt: null
  };
}

function primaryConceptId(question) {
  const links = Array.isArray(question?.conceptLinks) ? question.conceptLinks : [];
  const primary = links.find(link => link?.role === 'primary');
  return typeof primary?.conceptId === 'string' && primary.conceptId ? primary.conceptId : null;
}

function outcome(optionId, answerOptionId) {
  if (optionId === null || optionId === undefined) return 'unanswered';
  return optionId === answerOptionId ? 'correct' : 'incorrect';
}

function scoreFor(outcomeName, scoring) {
  if (outcomeName === 'correct') return scoring.correct;
  if (outcomeName === 'incorrect') return scoring.incorrect;
  return scoring.unanswered;
}

function validateScoring(scoring) {
  if (!scoring || typeof scoring !== 'object' || Array.isArray(scoring) ||
      !Number.isFinite(scoring.correct) ||
      !Number.isFinite(scoring.incorrect) ||
      !Number.isFinite(scoring.unanswered)) {
    fail('gt_autopsy_scoring_invalid');
  }
  return scoring;
}

function summarizeOutcomeRows(rows, scoring) {
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  let markedForReview = 0;
  let score = 0;
  for (const row of rows) {
    if (row.outcome === 'correct') correct += 1;
    else if (row.outcome === 'incorrect') incorrect += 1;
    else unanswered += 1;
    if (row.markedForReview) markedForReview += 1;
    score += scoreFor(row.outcome, scoring);
  }
  return {
    questionCount: rows.length,
    correct,
    incorrect,
    unanswered,
    markedForReview,
    score
  };
}

function answerChangeSummary(events, answerKey, scoring) {
  const previous = new Map();
  const changedQuestions = new Set();
  let answerSetEventCount = 0;
  let answerChangeCount = 0;
  let beneficialChangeCount = 0;
  let harmfulChangeCount = 0;
  let wrongToWrongChangeCount = 0;
  let clearedAnswerCount = 0;
  let answerChangeScoreImpact = 0;
  let reviewToggleCount = 0;
  const reviewState = new Map();

  const ordered = [...events].sort((a, b) =>
    Number(a.revisionAfter ?? a.revision_after ?? 0) - Number(b.revisionAfter ?? b.revision_after ?? 0)
  );

  for (const row of ordered) {
    const eventType = row.eventType ?? row.event_type;
    const event = row.event ?? {};
    const questionVersionId = String(event.questionVersionId ?? '');

    if (eventType === 'answer.set' && questionVersionId) {
      answerSetEventCount += 1;
      const nextOption = event.optionId === null || event.optionId === undefined
        ? null
        : String(event.optionId);
      const priorOption = previous.has(questionVersionId)
        ? previous.get(questionVersionId)
        : null;

      if (nextOption === null) {
        if (priorOption !== null) clearedAnswerCount += 1;
        previous.set(questionVersionId, null);
        continue;
      }

      if (priorOption !== null && priorOption !== nextOption) {
        const key = answerKey[questionVersionId];
        if (typeof key !== 'string' || !key) fail('gt_autopsy_answer_key_missing');
        answerChangeCount += 1;
        changedQuestions.add(questionVersionId);
        const before = priorOption === key ? 'correct' : 'incorrect';
        const after = nextOption === key ? 'correct' : 'incorrect';
        const delta = scoreFor(after, scoring) - scoreFor(before, scoring);
        answerChangeScoreImpact += delta;
        if (before === 'incorrect' && after === 'correct') beneficialChangeCount += 1;
        else if (before === 'correct' && after === 'incorrect') harmfulChangeCount += 1;
        else wrongToWrongChangeCount += 1;
      }
      previous.set(questionVersionId, nextOption);
      continue;
    }

    if (eventType === 'review.set' && questionVersionId) {
      const next = event.markedForReview === true;
      const prior = reviewState.get(questionVersionId) ?? false;
      if (next !== prior) reviewToggleCount += 1;
      reviewState.set(questionVersionId, next);
    }
  }

  return {
    answerSetEventCount,
    answerChangedQuestionCount: changedQuestions.size,
    answerChangeCount,
    beneficialChangeCount,
    harmfulChangeCount,
    wrongToWrongChangeCount,
    clearedAnswerCount,
    reviewToggleCount,
    answerChangeScoreImpact
  };
}

export function buildGtAutopsyV1({
  run,
  receipt,
  questions,
  concepts,
  events = [],
  media = []
}) {
  if (!run || typeof run !== 'object' || Array.isArray(run) || run.status !== 'completed') {
    throw new Error('gt_autopsy_requires_completed_run');
  }
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) {
    fail('gt_autopsy_receipt_required');
  }
  if (!Array.isArray(run.sections) || !run.sections.length || !Array.isArray(questions) ||
      !Array.isArray(concepts) || !Array.isArray(events) || !Array.isArray(media)) {
    fail('gt_autopsy_input_invalid');
  }

  const scoring = validateScoring(receipt.scoring);
  const ids = run.sections.flatMap(section =>
    Array.isArray(section?.questionVersionIds) ? section.questionVersionIds : []
  );
  if (!ids.length || new Set(ids).size !== ids.length) fail('gt_autopsy_run_questions_invalid');

  const questionById = new Map(
    questions
      .filter(q => typeof q?.questionVersionId === 'string')
      .map(q => [q.questionVersionId, q])
  );
  const conceptById = new Map(
    concepts
      .filter(c => typeof c?.conceptId === 'string')
      .map(c => [c.conceptId, c])
  );
  const mediaByQuestion = new Map();
  for (const item of media) {
    const qid = String(item?.questionVersionId ?? '');
    const modality = String(item?.modality ?? '');
    if (!qid || !modality) continue;
    const set = mediaByQuestion.get(qid) ?? new Set();
    set.add(modality);
    mediaByQuestion.set(qid, set);
  }

  const answerKey = {};
  const rows = [];
  for (const [sectionIndex, section] of run.sections.entries()) {
    for (const questionVersionId of section.questionVersionIds) {
      const question = questionById.get(questionVersionId);
      if (!question || typeof question.answerOptionId !== 'string' || !question.answerOptionId) {
        fail('gt_autopsy_question_unavailable');
      }
      answerKey[questionVersionId] = question.answerOptionId;
      const response = responseFor(run, questionVersionId);
      const result = outcome(response.optionId, question.answerOptionId);
      const conceptId = primaryConceptId(question);
      const concept = conceptId ? conceptById.get(conceptId) : null;
      rows.push({
        questionVersionId,
        sectionIndex,
        sectionId: section.sectionId,
        outcome: result,
        markedForReview: response.markedForReview === true,
        conceptId,
        conceptLabel: concept?.label ?? conceptId,
        subjectTags: Array.isArray(concept?.subjectTags) ? concept.subjectTags : [],
        modalities: [...(mediaByQuestion.get(questionVersionId) ?? [])].sort()
      });
    }
  }

  const computed = summarizeOutcomeRows(rows, scoring);
  for (const key of ['correct', 'incorrect', 'unanswered', 'markedForReview', 'score']) {
    if (Number(receipt[key]) !== Number(computed[key])) fail('gt_autopsy_receipt_mismatch');
  }
  if (Number(receipt.totalQuestions) !== rows.length) fail('gt_autopsy_receipt_mismatch');

  const sections = run.sections.map((section, sectionIndex) => {
    const sectionRows = rows.filter(row => row.sectionIndex === sectionIndex);
    return {
      sectionId: section.sectionId,
      label: section.label,
      ...summarizeOutcomeRows(sectionRows, scoring)
    };
  });

  const conceptMap = new Map();
  for (const row of rows) {
    const conceptId = row.conceptId ?? 'unmapped';
    const current = conceptMap.get(conceptId) ?? {
      conceptId,
      label: row.conceptLabel ?? conceptId,
      subjectTags: row.subjectTags,
      attempts: 0,
      correct: 0,
      incorrect: 0,
      unanswered: 0,
      markedForReview: 0
    };
    current.attempts += 1;
    current[row.outcome] += 1;
    if (row.markedForReview) current.markedForReview += 1;
    conceptMap.set(conceptId, current);
  }
  const conceptRows = [...conceptMap.values()].sort((a, b) =>
    (b.incorrect + b.unanswered) - (a.incorrect + a.unanswered) ||
    b.incorrect - a.incorrect ||
    b.attempts - a.attempts ||
    a.conceptId.localeCompare(b.conceptId)
  );

  const visualRows = rows.filter(row => row.modalities.length);
  const visual = {
    ...summarizeOutcomeRows(visualRows, scoring),
    modalities: [...new Set(visualRows.flatMap(row => row.modalities))].sort()
  };

  const behavior = answerChangeSummary(events, answerKey, scoring);
  const prescriptionCandidates = conceptRows
    .filter(row => row.incorrect + row.unanswered > 0 && row.conceptId !== 'unmapped')
    .slice(0, 5)
    .map(row => ({
      conceptId: row.conceptId,
      label: row.label,
      subjectTags: row.subjectTags,
      observedIncorrect: row.incorrect,
      observedUnanswered: row.unanswered,
      observedAttempts: row.attempts,
      priorityReason: 'most-observed-misses-in-this-completed-run',
      suggestedAction: 'review-and-retest',
      inferenceAuthority: false
    }));

  return freeze({
    contractId: 'gt-autopsy-v1',
    runId: run.runId,
    examId: run.examId,
    ruleSetId: run.ruleSetId,
    completedAt: run.completedAt,
    assembly: run.assembly ?? null,
    result: {
      totalQuestions: rows.length,
      correct: computed.correct,
      incorrect: computed.incorrect,
      unanswered: computed.unanswered,
      markedForReview: computed.markedForReview,
      score: computed.score,
      scoring
    },
    sections,
    concepts: conceptRows,
    visual,
    behavior,
    rootCause: {
      status: 'not_inferred',
      reasons: [
        'confidence-not-collected',
        'active-time-not-measured',
        'item-difficulty-not-calibrated',
        'causal-error-mechanism-not-observed'
      ]
    },
    prescription: {
      status: 'descriptive-candidates-only',
      candidates: prescriptionCandidates
    },
    inferenceAuthority: false,
    masteryInferenceEnabled: false,
    preventableMarksInferenceEnabled: false,
    fatigueInferenceEnabled: false,
    confidenceCalibrationEnabled: false,
    limitations: [
      'completed-run-descriptive-evidence-only',
      'wall-clock-answer-timestamps-are-not-active-time',
      'concept-error-counts-are-not-mastery-estimates',
      'prescription-candidates-are-not-causal-root-causes'
    ]
  });
}
