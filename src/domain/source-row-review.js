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
 // Unicode-aware lower bound on meaningful rationale characters; format
 // characters/whitespace do not satisfy the evidence-review minimum. Preserve
 // Unicode prose as written (including Indic scripts and combining marks).
const rationaleValid = v => typeof v === 'string' && v.length <= 4000 &&
   !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u.test(v) &&
   [...v.replace(/[\p{White_Space}\p{Default_Ignorable_Code_Point}]/gu, '')].length >= 24;
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
    !DISPOSITIONS.has(v.disposition) || !rationaleValid(v.rationale) ||
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
