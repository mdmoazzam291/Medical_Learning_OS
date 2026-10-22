# Reviewed medical relationships — learner projection foundation

## Scope

This change gives the existing Library's **Medical** graph perspective a strictly gated, directed, exact-version read contract. It does **not** create clinical facts, promote question co-occurrence into causality, or grant publication authority. The existing Exam and Learning graph perspectives are unchanged.

The canonical learner API's optional `medicalRelationships` snapshot input is projected by `src/domain/medical-relationships.js`. An upstream trusted server must derive verification booleans from actual reviewer grants, immutable review receipts and current source-rights events; **the browser must not originate these booleans**. A missing field or any false check fails closed.

A projected medical relationship requires:
- Stable `relationshipId`, exact `relationshipVersionId`, integer version and two existing distinct canonical `fromConceptId` / `toConceptId`.
- Explicit direction and a bounded relation type: causes, mechanism-of, risk-factor-for, differential-of, complication-of, treated-by, diagnosed-by, or contraindicated-in. The string identifies the reviewed assertion's type, **not** a medical inference.
- Exact `sourceId`, `sourceVersion` matching the published catalog, source fingerprint SHA-256, and exact `evidenceVersionId`.
- Literal, bounded `claimText` reviewed by humans and parseable `reviewedAt`.
- `status='published'` and `medicalReviewVerified`, `referenceReviewVerified`, `rightsVerified` all set to `true` by a privileged authority.

Newer draft, in-review or retired versions suppress older published versions; ambiguous same-version duplicates fail closed. Empty/missing medical input remains a truthful empty medical graph. Graph edges show review version, source ID/version and claim text, escaped against markup injection. This projection does not create independent storage or modify question/note ownership.

## Still required for production medical assertions

**This is P1 read-path work only, not a completed medical relationship registry.** The current production `content-library-api` v4 snapshot has no medical-relationship feed, so this feature will correctly continue to show no clinical edges.

Follow-up implementation must include the database relationship/version table, current-rights evidence checks and immutable publication/retirement events, an authorized Admin stage/review UI, and a service-only snapshot RPC bound to the versioned source, actual reviewer grants and published concept registry. Do not feed `medicalRelationships` from a caller-supplied client payload. Source-rights reuse, corrections, stale versions, disabled reviewer grants, and rollback require PostgreSQL integration tests before migration or API deployment. The new optional projection must not silently fall back to an unverified dataset when source resolution fails.

No genuine medical assertion is imported or published by this change. The current production catalog remains empty. Tests use synthetic non-clinical fixture labels; no medical truth claims or learner events result from browsing.

## Acceptance boundary

- Node projection tests: fail-closed reviews, rights, stale versions, unknown concepts, retired versions, duplicated IDs.
- Browser markup test: XSS-escaped claim, visible source/version and direction; medical graph never inherits educational-only edges.
- Existing CI core/Chromium/WebKit and static build must pass before merge.
- Live authenticated Admin/learner acceptance remains [Issue #301](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/301); server/rights publication work remains [Issue #299](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/299).
