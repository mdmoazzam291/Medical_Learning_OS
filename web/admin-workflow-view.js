export function importPreflight(draft) {
  const kinds = Array.isArray(draft?.reviewKinds) ? draft.reviewKinds : [];
  const missing = ['medical','references','rights'].filter(kind => !kinds.includes(kind));
  const rights = (draft?.sources || []).some(source => !['owned','licensed','public_domain','citation_only'].includes(source.rights?.status) || !source.rights?.evidence?.trim());
  const message = [
    missing.length ? 'Current reviewer grants required: ' + missing.map(kind => kind[0].toUpperCase()+kind.slice(1)).join(', ') + '. Refresh after authority is renewed.' : 'Current Medical, References and Rights grants observed.',
    rights ? 'Choose verified reuse permission and record evidence for every source before publication.' : 'Inspect every source permission and evidence.',
    'Exact-version review notes and your own inspection attestation are required. The server rechecks every gate at submission.'
  ].join(' ');
  return {authorized: missing.length === 0, message};
}
export function adminErrorMessage(error) {
  const code = String(error?.code || '');
  if (['authentication_required','unauthorized','runtime_access_denied'].includes(code)) return 'Sign in again to continue. Check the current record before retrying a write.';
  if (['content_admin_required','reviewer_not_authorized'].includes(code)) return 'Your current Admin or reviewer grant does not permit this action. Refresh authority before retrying.';
  if (/stale_|relationship_not_latest|import_payload_conflict|relationship_payload_conflict/.test(code)) return 'This exact version changed or conflicts with an existing record. Keep your entered text, refresh the inspection and compare the latest version before retrying.';
  if (/rights|source_evidence/.test(code)) return 'Resolve the source permission and evidence for this exact version, then inspect it again before submitting.';
  if (/attestation|review_evidence/.test(code)) return 'Complete your own exact-version review, notes and inspection attestation before submitting.';
  if (['manifest_invalid','invalid_json','relationship_invalid','relationship_fields_invalid'].includes(code) || error instanceof SyntaxError) return 'Check the JSON format and required fields, then try again. Your entered text remains on screen.';
  return 'The request could not be completed. Your entered text remains on screen. Check the current record before you try again.';
}
