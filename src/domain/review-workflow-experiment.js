export const REFERENCES_WORKFLOW_BATCH_EXPERIMENT_V2 = Object.freeze({
  schemaVersion: 2,
  experimentId: 'm02c-references-workflow-v2',
  reviewKind: 'references',
  causal: false,
  submissionMode: 'atomic_batch',
  attestationVersion: 'references-batch-attestation-v1',
  treatment: Object.freeze({
    workflowMode: 'claim_first',
    sourceId: 'cdc:co:clinical-guidance:2024-07-08',
    expectedQuestionCount: 7,
    label: 'CO claim-first'
  }),
  comparator: Object.freeze({
    workflowMode: 'standard',
    sourceId: 'asa:preop-fasting:2017',
    expectedQuestionCount: 7,
    label: 'ASA standard'
  })
});

export const REFERENCES_WORKFLOW_EXPERIMENT_V1 = Object.freeze({
  schemaVersion: 1,
  experimentId: 'm02c-references-workflow-v1',
  reviewKind: 'references',
  causal: false,
  treatment: Object.freeze({
    workflowMode: 'claim_first',
    sourceId: 'cdc:co:clinical-guidance:2024-07-08',
    expectedQuestionCount: 7,
    label: 'CO claim-first'
  }),
  comparator: Object.freeze({
    workflowMode: 'standard',
    sourceId: 'asa:preop-fasting:2017',
    expectedQuestionCount: 7,
    label: 'ASA standard'
  })
});

function itemSourceIds(item) {
  return Array.isArray(item?.sources)
    ? item.sources.map(source => source?.sourceId).filter(Boolean)
    : [];
}

export function referencesWorkflowArm(item) {
  const sourceIds = itemSourceIds(item);
  const experiment = REFERENCES_WORKFLOW_EXPERIMENT_V1;
  if (sourceIds.includes(experiment.treatment.sourceId)) {
    return Object.freeze({
      experimentId: experiment.experimentId,
      workflowMode: experiment.treatment.workflowMode,
      label: experiment.treatment.label
    });
  }
  if (sourceIds.includes(experiment.comparator.sourceId)) {
    return Object.freeze({
      experimentId: experiment.experimentId,
      workflowMode: experiment.comparator.workflowMode,
      label: experiment.comparator.label
    });
  }
  return null;
}

export function filterReferencesWorkflowItems(items, workflowMode) {
  if (!Array.isArray(items)) return [];
  if (workflowMode === 'all') return [...items];
  if (!['claim_first', 'standard'].includes(workflowMode)) {
    throw new TypeError('Invalid references workflow mode');
  }
  return items.filter(item => referencesWorkflowArm(item)?.workflowMode === workflowMode);
}
