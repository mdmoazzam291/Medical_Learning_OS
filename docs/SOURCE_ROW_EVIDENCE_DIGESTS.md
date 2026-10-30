# Offline source-row evidence digests

`src/domain/source-row-evidence.js` reuses `canonical-integrity.js` (JCS-RFC8785 / SHA-256). No new provider or cryptographic implementation is introduced.

`digestSourceRowCase(claim, options)` returns the case ID/version, source SHA-256, `caseDigest` and `appearanceEvidenceDigest`. A claim has exactly:

- `caseId`, `caseVersion`, `sourceSha256`, `sourceEdition`.
- `appearance`: one-based `pdfPage` and `rowOrdinal`, PDF `rotation` (0/90/180/270), four `bboxMilliPoints` integers and `rawCellSha256`. The bbox is measured in displayed, rotation-adjusted page coordinates, in thousandths of a point. Right/bottom must exceed left/top; values are 0–1,000,000,000. Actual page dimensions/row existence cannot be checked without the source.
- `interpretation`: `proposedIdentity` (bounded ASCII label or null), `relation` and `rationaleSha256`. Relations are unresolved, proposed-normalization, distinct-appearance, candidate-equivalence, partial or nested. These are proposals, never approvals.

Case IDs follow the existing lowercase 1–128-character slug rule. Edition/proposed-identity labels use the same punctuation allowance with uppercase letters also permitted. Versions/page/ordinal are integers 1–1,000,000. Hashes are lowercase SHA-256 strings. Unknown fields, hidden/accessor properties, sparse/custom arrays and malformed locators are rejected.

Appearance hashing uses `{contractId:'source-row-appearance-evidence-v1',sourceSha256,sourceEdition,appearance}`. Case hashing uses `{contractId:'source-row-case-evidence-v1',claim}`. This separates physical evidence from a versioned interpretation. A rationale or case-version change can change the case digest without changing the physical evidence digest.

`digestSourceRowPackage({packageId,packageVersion,cases}, options)` captures all caller input before the first asynchronous hash. It rejects empty packages, more than 10,000 cases and repeated case IDs, sorts by ASCII case ID and hashes a manifest with `contractId:'source-row-package-evidence-v1'`, the existing integrity profile, package ID/version and computed case references. Package ordering is irrelevant; membership and versions remain bound. The returned digest/reference fields fit the offline review-request contract.

**Hashes bind supplied metadata only.** This code does not download/hash source PDFs, verify source authenticity, open private evidence, authenticate receipts/reviewers, enforce current grants, persist events, approve interpretations or enable learner content. A stale or false claim can still have a valid digest. Trusted provenance, independent review, rights handling and server-side freshness remain separate requirements. No live NMC source package was generated or approved by this increment.

Tests include an independent Node SHA-256 oracle for canonical case bytes, mutation during hashing, evidence/version changes, order stability, duplicate IDs, malformed metadata, accessor/array restrictions, unavailable crypto and review-request interoperability.
