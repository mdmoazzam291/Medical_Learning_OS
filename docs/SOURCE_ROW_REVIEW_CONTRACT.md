# Offline source-row review contract

Implemented in `src/domain/source-row-review.js`; design: `NMC_EXACT_ROW_REVIEW_WORKFLOW.md`.

`validateSourceRowReviewRequest(value)` returns a detached copy of a strictly allowlisted request or throws `TypeError('source_row_review_invalid')`. It accepts only the four source-interpretation dispositions, exact target/attestation versions, UUID request/package IDs, versions 1–1,000,000, lowercase SHA-256 strings, a lowercase case slug of 1–128 characters and rationale of 24–4,000 characters. Missing/extra/inherited/accessor fields are rejected. No normalization changes the signed intent.

`matchesSourceRowReviewReceipt(receipt, request, expectedReviewerId)` returns a boolean for exact shape and request binding. It checks every request field, the expected reviewer, receipt/server identifier formats, a canonical UTC timestamp and source-only boundaries. Clinical, rights, exam-scope and learner-release flags must all be false.

**A true result is not authentication or authorization.** A forged object can match this contract. A future caller must establish trusted server origin, active target-scoped grant, professional independence, source authenticity, current evidence versions, replay protection and immutable storage. Hash strings are checked for format and equality, not computed or cryptographically verified here. Comparing a receipt against a stale request does not establish that either is current.

The module is offline and has no imports, network, SQL, storage or app integration. It is not wired to PR #337's baseline reviewer endpoints and does not grant authority. No actual review decision or content approval is produced. Private source storage, canonical evidence digests, protected APIs, concurrency/revocation and hosted acceptance remain future work.

Tests cover all missing request/receipt fields, unexpected authority fields, malformed input, all dispositions, valid limits, accessor/prototype/hidden-field rejection, stale field bindings, wrong reviewers, impossible timestamps and false approval boundaries.
