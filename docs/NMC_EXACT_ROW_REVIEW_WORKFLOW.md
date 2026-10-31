# Exact-row source review workflow proposal
Date:2026-10-30. Status:DESIGN PROPOSAL ONLY; no new endpoint,SQL,grant,receipt importer or UI implemented.
Basis:PR346 evidence at f6687965afb6c1da043028476a44c98ea39ee4c3; inspected PR337 at641c094579e6bce752621a954322bf9258814b79.

## Problem and recommended approach
Current evidence freezes aggregate metadata and22unreviewed anomaly cases. A positive source-row identity decision must bind exact source bytes/row evidence,not a count or generic syllabus label.
PR337 validates an exact baseline-level payload and supports only scope-reviewed/changes-required. It also treats external source hashes as reviewer declarations. Its authorization cannot be assumed to cover source inventories.

Approaches:
- Use signed external/manual review files initially: simplest private preparation, but no trusted ingestion until identity/version verification exists.
- Recommended future implementation: a distinct source-row attestation type within existing verified Auth/runtime/review infrastructure; own narrow grant target and append-only decisions. Reuse infrastructure,not the baseline decision schema.
- A separate reviewer service/account system duplicates Auth,security and restore obligations without demonstrated benefit.
The recommendation is the agent's proposal,not an owner-approved implementation decision. Immediate authorized work is this reviewable design only.

## Four identities that must stay separate
1. Source document: edition,actual SHA256,official locator,applicable clarification chain and rights state.
2. Physical appearance: source digest+PDF page+rotation/coordinate convention+bbox or explicit row ordinal+raw-token evidence digest; repeated appearances remain distinct.
3. Proposed logical requirement: candidate normalized identity and relations (same/partial/nested/unknown); not official code correction.
4. Review decision: exact versioned claim/evidence/case digests,verified reviewer/grant,decision and server time. Source identity attestation does not approve clinical teaching,rights,exam scope or release.

## Proposed sequence
1. Prepare immutable private source manifest and candidate row/case package. Include duplicate appearances,uncoded rows,footnote markers and unresolved totals; no copied descriptions in public assets.
2. Freeze a versioned package manifest. Canonical digest algorithm must be implemented/tested before signing; do not sign ad hoc JSON serialization or the current aggregate hashes as proof of complete raw rows.
3. Verify real reviewer consent,professional scope and independence separately from Auth account existence. No reviewer exists yet; no invitation/grant authorized by this document.
4. Owner grants only the exact source-review target/version family using a new typed grant scope. PR337 baseline grants do not automatically confer this authority.
5. Reviewer inspects privately authorized original pages and exact candidate appearance/claim evidence. Source fetch/hash verification remains explicit; PR337 does not implement it.
6. Reviewer can accept/reject a proposed interpretation,request primary clarification or retain unresolved. A positive result is per-case/source interpretation,not an NMC correction or completeness certificate.
7. Server revalidates current grant/revocation,author exclusion,exact frozen source/package/case and request identity atomically. Decision receipt append-only; uncertain retries reuse original requestID/payload.
8. Corrections create a new case version; revocation blocks future review writes/access. Historical receipt retained with current-eligibility invalidation where relevant. Author cannot substitute their own approval.
9. Roll up only actual reviewed records. A source inventory completeness statement also needs every applicable page disposition,zero unexplained omissions/extras and resolved scope/edition limitations.
10. Clinical,rights,canonical mapping,each exam overlay and learner release remain separate gates.

## Data contract proposal
Fields for future source-review request:
requestId,targetType=source-row-case,packageId,packageVersion,packageDigest,caseId,caseVersion,caseDigest,sourceSha256,appearanceEvidenceDigest,disposition,rationale,attestationVersion.
Actor identity,reviewer grant,event/receipt IDs and record time are server-bound. No identity,email or timestamp supplied by clients as authority.
Allowed dispositions:accept-proposed-interpretation,reject-proposed-interpretation,request-primary-clarification,retain-unresolved.
Revision/digest updates invalidate pending target; no overwrite/upsert of old decisions. Exact schema allowlist rejects extra approval/publication flags.
No clinical descriptions,publisher PDFs or full source tables in Git/static learner assets. Rights-reviewed private evidence access needs its own implemented policy.

## Required acceptance evidence before implementation release
- Negative tests:anon/learner/unassigned/other-package/self/author/revoked accounts denied; typed grants cannot cross baseline/source-row contracts.
- Exact-version tests:changed source,package,case,row evidence or amendment chain rejects stale positive decisions; retained unresolved/rejection behavior explicit.
- Idempotency:exact retry same receipt; changed payload with same requestID conflict; simultaneous grant/revoke/decision serialization.
- Immutability:old receipts cannot mutate/delete through supported roles; corrections create versioned superseding evidence without rewriting history.
- Privacy:limited target projection,private accepted meanings only where authorized,no protected corpus/public catalog or learner-model changes.
- Recovery:exact schema restored and authorization/receipt integrity rechecked. No production migration before reviewed engineering release sequence.
- Hosted genuine-role acceptance and competent independent reviewer verification remain required; mock tests not substituted.
No production behavior or passing automated implementation tests claimed.

## Current blockers and next work
Durable exact-row package still needs approved private-storage/rights handling; current Git receipts are aggregate and detailed raw extraction is transient. Reviewer recruitment remains deferred. This design therefore cannot honestly claim a working row-review system.
Next implementation unit,after design authorization: pure provider-independent source-row claim/receipt contract and meaningful fail-closed tests; no cloud deployment or reviewer grants. Then protected persistence/API extension using existing portability/recovery rules.
