import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  validateExamRuleSet,
  validateExamRuleRegistry,
  examSimulationReadiness,
  toExamSimulationPreset,
  simulatorReadyRuleSets
} from '../src/domain/exam-rules.js';

const source = (kind = 'official') => ({
  sourceId: 'authority:synthetic-rule-notice:2026-01-01',
  title: 'Synthetic exam rule notice',
  authority: 'Test Authority',
  url: 'https://example.org/exam-rules',
  publishedDate: '2026-01-01',
  kind
});

const complete = () => ({
  examId: 'test-exam',
  ruleSetId: 'test-exam:2026@1',
  version: 1,
  supersedes: null,
  label: 'Synthetic test exam 2026',
  session: '2026',
  effectiveFrom: '2026-01-01',
  effectiveUntil: null,
  verification: {
    status: 'verified',
    verifiedBy: 'test-reviewer',
    verifiedDate: '2026-01-02',
    notes: 'Synthetic test rules only'
  },
  sources: [source()],
  rules: {
    deliveryMode: 'computer_based',
    itemType: 'single_best_answer',
    totalQuestions: 6,
    totalDurationSeconds: 420,
    sections: [
      { sectionId: 'A', label: 'Section A', questionCount: 3, durationSeconds: 210 },
      { sectionId: 'B', label: 'Section B', questionCount: 3, durationSeconds: 210 }
    ],
    scoring: { correct: 4, incorrect: -1, unanswered: 0, markedForReviewScored: true },
    navigation: {
      earlySectionAdvanceAllowed: false,
      revisitClosedSectionsAllowed: false,
      timeCarryForwardAllowed: false,
      reviewWithinOpenSectionAllowed: true
    }
  }
});

test('production exam registry starts empty until a ruleset is verified', () => {
  const registry = JSON.parse(readFileSync(new URL('../data/exam-rules.json', import.meta.url), 'utf8'));
  assert.deepEqual(validateExamRuleRegistry(registry), { schemaVersion: 1, ruleSets: [] });
  assert.deepEqual(simulatorReadyRuleSets(registry), []);
});

test('verified fully specified rules become an immutable simulator preset', () => {
  const rules = complete();
  const validated = validateExamRuleSet(rules);
  const readiness = examSimulationReadiness(validated);
  assert.equal(readiness.ready, true);
  assert.deepEqual(readiness.missing, []);
  const preset = toExamSimulationPreset(validated);
  assert.equal(preset.ruleSetId, 'test-exam:2026@1');
  assert.equal(preset.sections.length, 2);
  rules.rules.sections[0].questionCount = 99;
  assert.equal(preset.sections[0].questionCount, 3);
  assert.throws(() => { preset.sections[0].questionCount = 5; }, TypeError);
});

test('draft or partially sourced rules cannot silently become simulator truth', () => {
  const rules = complete();
  rules.verification = {
    status: 'draft',
    verifiedBy: null,
    verifiedDate: null,
    notes: 'Still checking current official bulletin'
  };
  rules.sources = [source('secondary')];
  rules.rules.totalQuestions = null;
  rules.rules.totalDurationSeconds = null;
  rules.rules.sections[0].questionCount = null;
  rules.rules.scoring.incorrect = null;
  rules.rules.navigation.timeCarryForwardAllowed = null;

  const readiness = examSimulationReadiness(rules);
  assert.equal(readiness.ready, false);
  assert.ok(readiness.missing.includes('verified-ruleset'));
  assert.ok(readiness.missing.includes('official-source'));
  assert.ok(readiness.missing.includes('total-questions'));
  assert.ok(readiness.missing.includes('scoring-incorrect'));
  assert.ok(readiness.missing.includes('navigation-timeCarryForwardAllowed'));
  assert.throws(() => toExamSimulationPreset(rules), /not simulator-ready/);
});

test('section totals must reconcile with declared exam totals', () => {
  const badQuestions = complete();
  badQuestions.rules.totalQuestions = 7;
  assert.throws(() => validateExamRuleSet(badQuestions), /question counts/);

  const badTime = complete();
  badTime.rules.totalDurationSeconds = 421;
  assert.throws(() => validateExamRuleSet(badTime), /durations/);
});

test('verification identity and official source provenance are explicit', () => {
  const unreviewed = complete();
  unreviewed.verification.verifiedBy = null;
  assert.throws(() => validateExamRuleSet(unreviewed), /reviewer/);

  const badUrl = complete();
  badUrl.sources[0].url = 'javascript:bad';
  assert.throws(() => validateExamRuleSet(badUrl), /protocol/);
});

test('ruleset history is sequential and cannot cross exam identities', () => {
  const first = complete();
  const second = complete();
  second.ruleSetId = 'test-exam:2026@2';
  second.version = 2;
  second.supersedes = first.ruleSetId;
  second.label = 'Synthetic amended test exam 2026';

  assert.equal(validateExamRuleRegistry({ schemaVersion: 1, ruleSets: [first, second] }).ruleSets.length, 2);

  const missing = structuredClone(second);
  missing.supersedes = 'missing@1';
  assert.throws(() => validateExamRuleRegistry({ schemaVersion: 1, ruleSets: [first, missing] }), /Missing superseded/);

  const crossExam = structuredClone(second);
  crossExam.examId = 'other-exam';
  assert.throws(() => validateExamRuleRegistry({ schemaVersion: 1, ruleSets: [first, crossExam] }), /different exam/);
});
