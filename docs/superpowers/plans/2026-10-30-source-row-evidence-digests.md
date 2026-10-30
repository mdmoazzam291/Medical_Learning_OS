# Source-row evidence digests

Goal: bind source-row claims and deterministic package manifests using existing canonical-integrity.js.
Scope: offline pure domain functions; no source uploads, APIs, authorization or approval.
Spec: NMC_EXACT_ROW_REVIEW_WORKFLOW.md and SOURCE_ROW_REVIEW_CONTRACT.md.

- Write tests for key-order stability, evidence mutation, package-order stability, duplicate cases, invalid locator/digest/schema and mutable caller input.
- Observe positive failures against rejecting placeholders.
- Implement digestSourceRowCase(claim, options) and digestSourceRowPackage(package, options).
- Use existing JCS-RFC8785/SHA-256; domain-separate appearance, case and package payloads.
- Claim locator: one-based PDF page, ordinal, rotation and displayed-page bbox in integer thousandths of a point. Identity proposals/rationale are explicitly versioned and unapproved.
- Snapshot caller data before asynchronous hashing; package uses unique case IDs, sorted by ASCII ID, maximum 10,000 cases.
- Run focused/full tests and repository checks, review and persist.
