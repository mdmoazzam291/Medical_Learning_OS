// Offline shape/binding checks only. A caller must authenticate the receipt origin
// and enforce grants, independence, version freshness and immutable persistence.
const REQUEST_FIELDS = ['requestId','targetType','packageId','packageVersion','packageDigest',
  'caseId','caseVersion','caseDigest','sourceSha256','appearanceEvidenceDigest',
  'disposition','rationale','attestationVersion'];
const RECEIPT_FIELDS = [...REQUEST_FIELDS,'contractId','decisionId','reviewerId','grantEventId',
  'receiptDigest','recordedAt','sourceReviewOnly','clinicalApproved','rightsApproved',
  'examScopeApproved','learnerRelease'];
const DISPOSITIONS = new Set(['accept-proposed-interpretation','reject-proposed-interpretation',
  'request-primary-clarification','retain-unresolved']);
const invalid = () => { throw new TypeError('source_row_review_invalid'); };
const uuid = v => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const digest = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const version = v => Number.isSafeInteger(v) && v >= 1 && v <= 1000000;
function exactRecord(v, fields) {
  if (!v || typeof v !== 'object' || ![Object.prototype,null].includes(Object.getPrototypeOf(v))) invalid();
  const keys = Reflect.ownKeys(v);
  if (keys.length !== fields.length || keys.some(k => typeof k !== 'string' || !fields.includes(k))) invalid();
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(v,key);
    if (!descriptor.enumerable || !Object.hasOwn(descriptor,'value')) invalid();
  }
}
export function validateSourceRowReviewRequest(v) {
  exactRecord(v,REQUEST_FIELDS);
  if (!uuid(v.requestId) || !uuid(v.packageId) || v.targetType !== 'source-row-case' ||
    !version(v.packageVersion) || !version(v.caseVersion) ||
    typeof v.caseId !== 'string' || !/^[a-z0-9][a-z0-9._:-]{0,127}$/.test(v.caseId) || v.caseId.includes('..') ||
    !['packageDigest','caseDigest','sourceSha256','appearanceEvidenceDigest'].every(k=>digest(v[k])) ||
    !DISPOSITIONS.has(v.disposition) || typeof v.rationale !== 'string' ||
    v.rationale.trim().length < 24 || v.rationale.length > 4000 ||
    v.attestationVersion !== 'source-row-review-v1') invalid();
  return structuredClone(v);
}
export function matchesSourceRowReviewReceipt(receipt, request, expectedReviewerId) {
  try {
    const q = validateSourceRowReviewRequest(request);
    exactRecord(receipt,RECEIPT_FIELDS);
    if (!uuid(expectedReviewerId) || receipt.reviewerId !== expectedReviewerId ||
      !uuid(receipt.decisionId) || !uuid(receipt.grantEventId) || !digest(receipt.receiptDigest) ||
      receipt.contractId !== 'source-row-review-receipt-v1' || receipt.sourceReviewOnly !== true ||
      !['clinicalApproved','rightsApproved','examScopeApproved','learnerRelease'].every(k=>receipt[k] === false) ||
      typeof receipt.recordedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(receipt.recordedAt) ||
      new Date(receipt.recordedAt).toISOString() !== receipt.recordedAt) return false;
    return REQUEST_FIELDS.every(key=>receipt[key] === q[key]);
  } catch {
    return false;
  }
}
