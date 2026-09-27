import { toExamSimulationPreset } from './exam-rules.js';
import {
  createLockedSectionRuntimeRun,
  advanceExamRunClock,
  setExamAnswer,
  setExamReview,
  examRunProgress,
  scoreLockedSectionExamRun
} from '../../supabase/functions/study-api/_shared/exam-runtime.js';

function fail(message) { throw new TypeError(message); }

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

export function createLockedSectionExamRun({
  ruleSet,
  runId,
  questionVersionIds,
  startedAt
}) {
  const preset = toExamSimulationPreset(ruleSet);
  requireLockedTimeSections(preset);
  return createLockedSectionRuntimeRun({
    runId,
    examId: preset.examId,
    ruleSetId: preset.ruleSetId,
    caveats: preset.caveats,
    sections: preset.sections,
    totalQuestions: preset.totalQuestions,
    totalDurationSeconds: preset.totalDurationSeconds,
    questionVersionIds,
    startedAt
  });
}

export {
  advanceExamRunClock,
  setExamAnswer,
  setExamReview,
  examRunProgress
};

export function requestEarlySectionAdvance() {
  throw new Error('early_section_advance_forbidden');
}

export function scoreCompletedExamRun({
  run,
  ruleSet,
  answerKey
}) {
  const preset = toExamSimulationPreset(ruleSet);
  requireLockedTimeSections(preset);
  return scoreLockedSectionExamRun({
    run,
    ruleSetId: preset.ruleSetId,
    scoring: preset.scoring,
    answerKey
  });
}
