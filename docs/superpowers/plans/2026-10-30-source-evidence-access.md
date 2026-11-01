# Offline source evidence access policy

Goal: evaluate staging/metadata/source-byte eligibility from exact trusted context.
Spec: NMC_PRIVATE_EVIDENCE_STORAGE_ACCESS.md. No Auth verification, storage or endpoints.

- Add failing tests for owner staging, exact staged reviewer grants, revocation, stale versions, rights withdrawal, unverified bytes and malformed context.
- Implement evaluateSourceEvidenceAccess(request, context), returning frozen allowed/reason/sourceReviewOnly/learnerRelease fields.
- Request fields: action,packageId,packageVersion,packageDigest. Actions: stage-metadata,read-metadata,read-source-bytes.
- Context: authenticated actor ID, content owner/author IDs, runtime flag, current package, rights, source verification and nullable typed package grant. Exact data shapes; no getter execution.
- Reviewer grants bind source-row-package target, exact ID/version/digest and verified consent/qualification/independence; no author/self review authority.
- Withdrawn package denies access. Source bytes require staged package, retention/display permission and actual/expected hash equality. Owner staging requires draft status and metadata permission.
- Run focused/full tests and repository checks; read-only review; persist results and limitations.
