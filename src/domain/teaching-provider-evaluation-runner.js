import {
  canonicalGroundedTeachingFallback,
  evaluateGroundedTeachingResult,
  resolveGroundedTeachingDelivery,
  validateGroundedTeachingTask
} from './grounded-teaching.js';
import {
  semanticTeachingChecklist,
  validateSemanticTeachingEvaluationSet,
  validateSemanticTeachingReview
} from './teaching-semantic-evaluation.js';

function fail(message) { throw new TypeError(message); }

function text(value, label, max = 240) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    fail(`Invalid ${label}`);
  }
  return value.trim();
}

function timestamp(value, label) {
  text(value, label, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString() !== value) {
    fail(`Invalid ${label}`);
  }
  return value;
}

function deepFreezeCopy(value) {
  const copy = structuredClone(value);
  const visit = item => {
    if (item && typeof item === 'object') {
      Object.values(item).forEach(visit);
      Object.freeze(item);
    }
    return item;
  };
  return visit(copy);
}

function providerDescriptor(provider) {
  const descriptor = provider?.descriptor;
  if (!descriptor || typeof provider?.execute !== 'function' || typeof provider?.supports !== 'function') {
    fail('Invalid semantic teaching evaluation provider');
  }
  if (!provider.supports('learning.teaching.render')) {
    fail('Provider does not support learning.teaching.render');
  }
  return descriptor;
}

function fallbackForCase(item, schemaVersion) {
  if (schemaVersion === 1) {
    return {
      schemaVersion: 1,
      contractId: 'grounded-teaching-output',
      contractVersion: '1',
      renderStatus: 'ready',
      teachingAction: item.teachingAction,
      conceptId: item.conceptId,
      headline: 'Review the canonical rule.',
      claims: [
        {
          claimId: 'canonical-explanation',
          role: 'explanation',
          text: item.gold.canonicalExplanation,
          citationRefs: item.grounding
        }
      ],
      misconceptionCorrection: null,
      nextPrompt: 'State the rule in your own words.',
      abstentionReason: null
    };
  }

  const claims = item.gold.canonicalClaims.map((claim, index) => ({
    claimId: `gold-${index + 1}`,
    role: claim.role,
    text: claim.text,
    citationRefs: item.grounding
  }));
  const correction = claims.find(claim => claim.role === 'correction') ?? null;
  const discriminator = claims.find(claim => claim.role === 'discriminator') ?? null;

  return {
    schemaVersion: 1,
    contractId: 'grounded-teaching-output',
    contractVersion: '1',
    renderStatus: 'ready',
    teachingAction: item.teachingAction,
    conceptId: item.conceptId,
    headline: 'Repair the exact error.',
    claims,
    misconceptionCorrection: item.teachingAction === 'misconception_repair'
      ? {
          learnerBelief: item.learnerError.observedBelief,
          correctionClaimId: correction.claimId,
          discriminatorClaimId: discriminator.claimId
        }
      : null,
    nextPrompt: item.gold.nextPrompt,
    abstentionReason: null
  };
}

export function buildSemanticTeachingEvaluationTask(setValue, caseId, {
  evaluationRunId,
  requestedAt
}) {
  const set = validateSemanticTeachingEvaluationSet(setValue);
  const runId = text(evaluationRunId, 'evaluationRunId', 180);
  timestamp(requestedAt, 'requestedAt');
  const item = set.cases.find(candidate => candidate.caseId === caseId);
  if (!item) fail('Unknown semantic teaching evaluation case');

  return validateGroundedTeachingTask({
    schemaVersion: 1,
    taskId: `${runId}:${item.caseId}`,
    capability: 'learning.teaching.render',
    instructionSet: {
      id: 'grounded-teaching-semantic-evaluation',
      version: '1'
    },
    input: {
      teachingAction: item.teachingAction,
      conceptId: item.conceptId,
      learnerEvidenceRef: `semantic-eval:${item.caseId}:${item.learnerError.selectedOptionId}`,
      misconception: set.schemaVersion === 2 && item.teachingAction === 'misconception_repair'
        ? { observedBelief: item.learnerError.observedBelief }
        : null,
      canonicalFallback: fallbackForCase(item, set.schemaVersion)
    },
    grounding: item.grounding,
    groundingMode: 'required',
    outputContract: {
      id: 'grounded-teaching-output',
      version: '1'
    },
    constraints: {
      maxLatencyMs: 10000,
      maxEstimatedCostMicrousd: 50000
    },
    requestedAt,
    metadata: {
      evaluationOnly: true,
      evaluationSetId: set.evaluationSetId,
      evaluationSetVersion: set.version,
      caseId: item.caseId,
      questionVersionId: item.questionVersionId,
      observedError: item.learnerError,
      representation: set.schemaVersion === 2 ? item.representation : 'factual_recall',
      productionDeliveryAllowed: false
    }
  });
}

function executionError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    category: 'provider_execution_error',
    code: message.slice(0, 160) || 'unknown'
  };
}

export async function runSemanticTeachingProviderEvaluation({
  provider,
  evaluationSet,
  evaluationRunId,
  requestedAt
}) {
  const set = validateSemanticTeachingEvaluationSet(evaluationSet);
  const descriptor = providerDescriptor(provider);
  const runId = text(evaluationRunId, 'evaluationRunId', 180);
  timestamp(requestedAt, 'requestedAt');

  const cases = [];
  for (const item of set.cases) {
    const task = buildSemanticTeachingEvaluationTask(set, item.caseId, {
      evaluationRunId: runId,
      requestedAt
    });
    const providerRunRef = `${runId}:${item.caseId}`;
    const checklist = semanticTeachingChecklist(set, item.caseId);

    let result = null;
    let deterministicEvaluation = null;
    let delivery = null;
    let error = null;
    try {
      result = await provider.execute(task);
      deterministicEvaluation = evaluateGroundedTeachingResult(task, result);
      delivery = resolveGroundedTeachingDelivery(task, result);
    } catch (caught) {
      error = executionError(caught);
      delivery = resolveGroundedTeachingDelivery(task, null);
    }

    const deterministicPassed = deterministicEvaluation?.passed === true;
    cases.push({
      caseId: item.caseId,
      questionVersionId: item.questionVersionId,
      taskId: task.taskId,
      providerRunRef,
      executionStatus: error
        ? 'provider_error'
        : deterministicPassed
          ? 'awaiting_human_review'
          : 'blocked_before_human_review',
      providerResult: result,
      deterministicEvaluation,
      deliveryPreview: {
        source: delivery.source,
        fallbackReason: delivery.fallbackReason
      },
      humanChecklist: checklist,
      humanReviewRequired: deterministicPassed,
      error
    });
  }

  const deterministicPassCount = cases.filter(item => item.deterministicEvaluation?.passed === true).length;
  const providerErrorCount = cases.filter(item => item.executionStatus === 'provider_error').length;
  const deterministicBlockCount = cases.length - deterministicPassCount - providerErrorCount;

  return deepFreezeCopy({
    contractId: 'semantic-teaching-provider-evaluation-run-v1',
    evaluationRunId: runId,
    evaluationSetId: set.evaluationSetId,
    evaluationSetVersion: set.version,
    provider: descriptor,
    requestedAt,
    productionQualificationAuthority: false,
    productionQualified: false,
    cases,
    summary: {
      caseCount: cases.length,
      deterministicPassCount,
      deterministicBlockCount,
      providerErrorCount,
      awaitingHumanReviewCount: deterministicPassCount
    }
  });
}

function validateRunForFinalization(run, set) {
  if (!run || typeof run !== 'object' || Array.isArray(run) ||
      run.contractId !== 'semantic-teaching-provider-evaluation-run-v1' ||
      run.evaluationSetId !== set.evaluationSetId ||
      run.evaluationSetVersion !== set.version ||
      run.productionQualificationAuthority !== false ||
      run.productionQualified !== false ||
      !Array.isArray(run.cases) ||
      run.cases.length !== set.cases.length) {
    fail('Invalid semantic teaching provider evaluation run');
  }
}

export function finalizeSemanticTeachingProviderEvaluation({
  evaluationSet,
  run,
  reviews
}) {
  const set = validateSemanticTeachingEvaluationSet(evaluationSet);
  validateRunForFinalization(run, set);
  if (!Array.isArray(reviews)) fail('Invalid semantic teaching reviews');

  const reviewByCase = new Map();
  for (const raw of reviews) {
    const review = validateSemanticTeachingReview(set, raw);
    if (reviewByCase.has(review.caseId)) fail('Duplicate semantic teaching review');
    const runCase = run.cases.find(item => item.caseId === review.caseId);
    if (!runCase) fail('Semantic review is outside evaluation run');
    if (runCase.humanReviewRequired !== true) fail('Blocked provider case cannot receive passing semantic review');
    if (review.providerRunRef !== runCase.providerRunRef) fail('Semantic review providerRunRef mismatch');
    reviewByCase.set(review.caseId, review);
  }

  const cases = run.cases.map(item => {
    const review = reviewByCase.get(item.caseId) ?? null;
    const status = item.humanReviewRequired !== true
      ? 'blocked'
      : review === null
        ? 'awaiting_human_review'
        : review.overallVerdict === 'pass'
          ? 'passed'
          : 'failed';
    return {
      caseId: item.caseId,
      deterministicPassed: item.deterministicEvaluation?.passed === true,
      humanReview: review,
      status
    };
  });

  const blockedCount = cases.filter(item => item.status === 'blocked').length;
  const humanPassCount = cases.filter(item => item.status === 'passed').length;
  const humanFailCount = cases.filter(item => item.status === 'failed').length;
  const missingHumanReviewCount = cases.filter(item => item.status === 'awaiting_human_review').length;

  const bootstrapVerdict = blockedCount > 0 || humanFailCount > 0
    ? 'fail'
    : missingHumanReviewCount > 0
      ? 'pending'
      : 'pass';

  return deepFreezeCopy({
    contractId: 'semantic-teaching-provider-evaluation-summary-v1',
    evaluationRunId: run.evaluationRunId,
    evaluationSetId: set.evaluationSetId,
    evaluationSetVersion: set.version,
    provider: run.provider,
    bootstrapVerdict,
    productionQualificationAuthority: false,
    productionQualified: false,
    qualificationScope: 'bootstrap_only',
    cases,
    summary: {
      caseCount: cases.length,
      blockedCount,
      humanPassCount,
      humanFailCount,
      missingHumanReviewCount
    }
  });
}
