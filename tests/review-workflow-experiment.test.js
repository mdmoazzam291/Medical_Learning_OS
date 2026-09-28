import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REFERENCES_WORKFLOW_EXPERIMENT_V1,
  REFERENCES_WORKFLOW_BATCH_EXPERIMENT_V2,
  referencesWorkflowArm,
  filterReferencesWorkflowItems
} from '../src/domain/review-workflow-experiment.js';

const item = (questionVersionId, sourceId) => ({
  question:{ questionVersionId },
  sources:[{ sourceId }]
});

test('M02c review experiment is explicitly non-causal and matched at seven questions per arm', () => {
  const experiment=REFERENCES_WORKFLOW_EXPERIMENT_V1;
  assert.equal(experiment.causal,false);
  assert.equal(experiment.reviewKind,'references');
  assert.equal(experiment.treatment.workflowMode,'claim_first');
  assert.equal(experiment.comparator.workflowMode,'standard');
  assert.equal(experiment.treatment.expectedQuestionCount,7);
  assert.equal(experiment.comparator.expectedQuestionCount,7);
});

test('workflow arm derives from exact canonical source identity', () => {
  assert.equal(
    referencesWorkflowArm(item('co@1','cdc:co:clinical-guidance:2024-07-08')).workflowMode,
    'claim_first'
  );
  assert.equal(
    referencesWorkflowArm(item('asa@1','asa:preop-fasting:2017')).workflowMode,
    'standard'
  );
  assert.equal(referencesWorkflowArm(item('other@1','other:source')),null);
});

test('experiment filter never pulls unrelated review targets into an arm', () => {
  const items=[
    item('co@1','cdc:co:clinical-guidance:2024-07-08'),
    item('asa@1','asa:preop-fasting:2017'),
    item('other@1','other:source')
  ];
  assert.deepEqual(
    filterReferencesWorkflowItems(items,'claim_first').map(x=>x.question.questionVersionId),
    ['co@1']
  );
  assert.deepEqual(
    filterReferencesWorkflowItems(items,'standard').map(x=>x.question.questionVersionId),
    ['asa@1']
  );
  assert.equal(filterReferencesWorkflowItems(items,'all').length,3);
  assert.throws(()=>filterReferencesWorkflowItems(items,'bad'),/Invalid references workflow mode/);
});

test('M02c batch experiment v2 preserves matched arms while changing only submission mechanics', () => {
  const v1 = REFERENCES_WORKFLOW_EXPERIMENT_V1;
  const v2 = REFERENCES_WORKFLOW_BATCH_EXPERIMENT_V2;
  assert.equal(v2.causal, false);
  assert.equal(v2.submissionMode, 'atomic_batch');
  assert.equal(v2.attestationVersion, 'references-batch-attestation-v1');
  assert.equal(v2.treatment.sourceId, v1.treatment.sourceId);
  assert.equal(v2.comparator.sourceId, v1.comparator.sourceId);
  assert.equal(v2.treatment.expectedQuestionCount, 7);
  assert.equal(v2.comparator.expectedQuestionCount, 7);
});
