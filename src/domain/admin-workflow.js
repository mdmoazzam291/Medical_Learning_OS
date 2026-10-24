// Unknown evidence remains unknown; a transport failure must never become zero work.
export function readAdminWorkflowSummary(value) {
  if (!value || value.contractId !== 'admin-workflow-summary-v1' ||
      typeof value.asOf !== 'string' || !Number.isFinite(Date.parse(value.asOf)) ||
      !['draftImportBatches', 'draftRelationshipAssertions'].every(key =>
        Number.isSafeInteger(value[key]) && value[key] >= 0)) return null;
  return { contractId: value.contractId, asOf: value.asOf,
    draftImportBatches: value.draftImportBatches, draftRelationshipAssertions: value.draftRelationshipAssertions };
}
