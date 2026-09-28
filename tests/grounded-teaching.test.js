import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildCanonicalTeachingFallback,
  evaluateGroundedTeachingStructure,
  validateGroundedTeachingOutput,
  validateGroundedTeachingStructuralEvalCase
} from '../src/domain/grounded-teaching.js';

const source = {
  type: 'content-source',
  id: 'demo:project-doctrine:v1',
  version: '1'
};

const otherSource = {
  type: 'content-source',
  id: 'source:not-supplied',
  version: '1'
};

const output = () => ({
  schemaVersion: 1,
  actionType: 'micro_correction',
  renderMode: 'provider_generated',
  teachingPoints: [{
    pointId: 'point-1',
    text: 'Use one canonical concept identity across views.',
    sourceRefs: [source]
  }],
  learnerPrompt: 'Which identifier should both views reference?',
  uncertainty: {
    status: 'not_stated',
    note: null
  },
  metadata: {
    instructionVersion: 'grounded-teaching:1'
  }
});

test('grounded teaching output keeps medical/content statements in source-linked teaching points', () => {
  const result = validateGroundedTeachingOutput(output(), { allowedGrounding: [source] });
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.teachingPoints[0]));
  assert.ok(Object.isFrozen(result.teachingPoints[0].sourceRefs));
  assert.equal(result.actionType, 'micro_correction');
  assert.equal(result.teachingPoints[0].sourceRefs[0].id, source.id);
});

test('teaching points fail closed on missing or out-of-task grounding', () => {
  const missing = output();
  missing.teachingPoints[0].sourceRefs = [];
  assert.throws(
    () => validateGroundedTeachingOutput(missing, { allowedGrounding: [source] }),
    /source reference/
  );

  const invented = output();
  invented.teachingPoints[0].sourceRefs = [otherSource];
  assert.throws(
    () => validateGroundedTeachingOutput(invented, { allowedGrounding: [source] }),
    /outside allowed grounding/
  );
});

test('grounded teaching output rejects hidden reasoning and unversioned schema expansion', () => {
  assert.throws(
    () => validateGroundedTeachingOutput({
      ...output(),
      reasoning: 'private chain'
    }, { allowedGrounding: [source] }),
    /Invalid grounded teaching output/
  );
});

test('canonical fallback copies reviewed canonical explanation without generating new medical content', () => {
  const explanation = 'The project models subjects as views over shared concept identities.';
  const result = buildCanonicalTeachingFallback({
    actionType: 'micro_correction',
    canonicalExplanation: explanation,
    sourceRefs: [source],
    learnerPrompt: null
  });

  assert.equal(result.renderMode, 'canonical_fallback');
  assert.equal(result.teachingPoints.length, 1);
  assert.equal(result.teachingPoints[0].text, explanation);
  assert.deepEqual(result.teachingPoints[0].sourceRefs, [source]);
  assert.equal(result.metadata.generated, false);
  assert.equal(result.metadata.source, 'canonical-reviewed-content');
});

test('structural evaluation fixture is explicit that it does not assess medical correctness', async () => {
  const raw = JSON.parse(await readFile(
    new URL('../data/ai-eval-grounded-teaching-structural-v1.json', import.meta.url),
    'utf8'
  ));
  assert.equal(raw.evaluationScope, 'structural_only');
  assert.equal(raw.medicalCorrectnessAssessed, false);
  assert.equal(raw.cases.length, 1);

  const evalCase = validateGroundedTeachingStructuralEvalCase(raw.cases[0]);
  const result = evaluateGroundedTeachingStructure(evalCase, output());
  assert.equal(result.pass, true);
  assert.equal(result.evaluationScope, 'structural_only');
  assert.equal(result.medicalCorrectnessAssessed, false);
  assert.equal(result.claimSupportSemanticsAssessed, false);
  assert.equal(result.misconceptionCorrectionAssessed, false);
});

test('structural evaluator catches action drift, verbosity and missing required citations', () => {
  const baseCase = {
    schemaVersion: 1,
    caseId: 'eval:1',
    allowedGrounding: [source, otherSource],
    expectedActionType: 'micro_correction',
    requiredCitationRefs: [otherSource],
    maxTeachingWords: 3,
    uncertaintyExpectation: 'any',
    learnerPromptPolicy: 'allowed',
    metadata: {}
  };

  const result = evaluateGroundedTeachingStructure(baseCase, output());
  assert.equal(result.pass, false);
  assert.equal(result.checks.contractValid, true);
  assert.equal(result.checks.requiredCitationsPresent, false);
  assert.equal(result.checks.verbosityWithinLimit, false);
  assert.deepEqual(result.failures, [
    'required_citation_missing',
    'verbosity_limit_exceeded'
  ]);

  const wrongAction = output();
  wrongAction.actionType = 'hint';
  const actionResult = evaluateGroundedTeachingStructure({
    ...baseCase,
    requiredCitationRefs: [source],
    maxTeachingWords: 40
  }, wrongAction);
  assert.equal(actionResult.checks.actionMatches, false);
  assert.match(actionResult.failures.join(','), /action_mismatch/);
});

test('structural evaluator enforces explicit uncertainty and learner-prompt policy when requested', () => {
  const evalCase = {
    schemaVersion: 1,
    caseId: 'eval:uncertainty',
    allowedGrounding: [source],
    expectedActionType: 'micro_correction',
    requiredCitationRefs: [source],
    maxTeachingWords: 40,
    uncertaintyExpectation: 'explicit',
    learnerPromptPolicy: 'required',
    metadata: {}
  };
  const failed = evaluateGroundedTeachingStructure(evalCase, {
    ...output(),
    learnerPrompt: null
  });
  assert.equal(failed.pass, false);
  assert.equal(failed.checks.uncertaintyExpectationMet, false);
  assert.equal(failed.checks.learnerPromptPolicyMet, false);

  const passed = evaluateGroundedTeachingStructure(evalCase, {
    ...output(),
    uncertainty: {
      status: 'explicit',
      note: 'The supplied reference does not cover a requested edge case.'
    }
  });
  assert.equal(passed.pass, true);
});

test('structural evaluation case cannot require a citation outside its allowed grounding', () => {
  assert.throws(
    () => validateGroundedTeachingStructuralEvalCase({
      schemaVersion: 1,
      caseId: 'eval:bad-source',
      allowedGrounding: [source],
      expectedActionType: 'hint',
      requiredCitationRefs: [otherSource],
      maxTeachingWords: 40,
      uncertaintyExpectation: 'any',
      learnerPromptPolicy: 'allowed',
      metadata: {}
    }),
    /outside evaluation grounding/
  );
});
