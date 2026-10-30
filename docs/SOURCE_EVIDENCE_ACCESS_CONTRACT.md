# Offline source-evidence access contract

`evaluateSourceEvidenceAccess(request, context)` in `src/domain/source-evidence-access.js` returns a frozen `{allowed,reason,sourceReviewOnly:true,learnerRelease:false}` result. Unknown/missing fields, wrong types and accessor/inherited records fail closed. It neither mutates input nor performs I/O.

The request contains action (`stage-metadata`, `read-metadata` or `read-source-bytes`) and exact package ID/version/digest. Context contains actor/authentication/runtime state, owner/author IDs, the current package, metadata and byte rights, source-verification metadata and a nullable reviewer grant. See the tests for complete exact shapes.

Rules:

- All actions require a valid authenticated context, enabled runtime, exact current package binding and metadata permission. Withdrawn packages are denied.
- Only the content owner may stage metadata, and only for a draft candidate. An eligibility result is not durable staging or an idempotent persistence receipt.
- The owner may inspect metadata. A reviewer additionally requires a staged package, an active non-revoked `source-row-package` grant bound to that exact ID/version/digest, matching actor, verified consent/qualification/independence and exclusion of the package author. Baseline grants do not qualify.
- Source-byte access, including owner access, additionally requires a staged package, retention and display permissions, a verified-byte flag and equal non-null actual/expected SHA-256 values. No URL or bytes are returned.

**This function is not an authorization boundary.** Never accept this context or an `allowed` result as authority from a browser, uploaded file or untrusted client. The future server must independently authenticate, resolve immutable package/source references, derive current rights/grants and enforce the result atomically. The evaluator cannot establish whether a UUID, rights assertion or verification flag is true, whether bytes belong to the selected package or whether a grant was revoked after the context was read.

Decision-time checks, concurrency/revocation serialization, evidence-stream/range checks, minimal audit projections for withdrawn sources, trusted receipt origin, private persistence/readback, retention enforcement and recovery are not implemented here. No clinical, rights, exam or learner-content approval follows from a positive eligibility result. No real reviewer grant or private source archive has been created.
