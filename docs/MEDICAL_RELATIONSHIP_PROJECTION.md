# Reviewed medical relationships — learner projection foundation

## Scope

This change gives the existing Library's **Medical** graph perspective a strictly gated, directed, exact-version read contract. It does **not** create clinical facts, promote question co-occurrence into causality, or grant publication authority. The existing Exam and Learning graph perspectives are unchanged.

The canonical learner API's optional `medicalRelationships` snapshot input is projected by `src/domain/medical-relationships.js`. An upstream trusted server must derive verification booleans from actual reviewer grants, immutable review receipts and current source-rights events; **the browser must not originate these booleans**. A missing field or any false check fails closed.

A projected medical relationship requires:
- Stable `relationshipId`, exact `relationshipVersionId`, integer version and two existing distinct canonical `fromConceptId` / `toConceptId`.
- Explicit direction and a bounded relation type: causes, mechanism-of, risk-factor-for, differential-of, complication-of, treated-by, diagnosed-by, or contraindicated-in. The string identifies the reviewed assertion's type, **not** a medical inference.
- Exact `sourceId`, `sourceVersion` matching the published catalog, source fingerprint SHA-256 matching the current privileged source record’s `fingerprintSha256`, and exact `evidenceVersionId`. Human review/rights checks must be bound to that fingerprint upstream; a matching version label alone is insufficient.
- Literal, bounded `claimText` reviewed by humans and parseable `reviewedAt`.
- `status='published'` and `medicalReviewVerified`, `referenceReviewVerified`, `rightsVerified` all set to `true` by a privileged authority.

Newer draft, in-review or retired versions suppress older published versions; ambiguous same-version duplicates, duplicate source/concept identities, malformed version states and reused exact relationship-version identities fail closed. These checks do not resolve conflicts by input order. Empty/missing medical input remains a truthful empty medical graph. Graph edges show review version, source ID/version and claim text, escaped against markup injection. This projection does not create independent storage or modify question/note ownership.

## Protected registry released — 23 October 2026

[PR309](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/309) is merged and its owner-approved migration/API/static release is live. The registry and canonical catalog remain empty; no medical assertion was imported or attested. See the [production receipt](releases/2026-10-23-relationship-registry-release.md) and [registry authority/lifecycle](MEDICAL_RELATIONSHIP_REGISTRY.md). Genuine clinical signoff and populated acceptance remain separate.

The following original read-path boundary records the earlier v6 release; it is historical, not the current registry status.

## Original read-path release boundary (historical)

**This is P1 read-path work only, not a completed medical relationship registry.** The production `content-library-api` v6 read/display release has no medical-relationship feed, so this feature will correctly continue to show no clinical edges. See the [23 October release receipt](releases/2026-10-23-medical-graph-integration-release.md).

Follow-up implementation must include the database relationship/version table, current-rights evidence checks and immutable publication/retirement events, an authorized Admin stage/review UI, and a service-only snapshot RPC bound to the versioned source, actual reviewer grants and published concept registry. Do not feed `medicalRelationships` from a caller-supplied client payload. Source-rights reuse, corrections, stale versions, disabled reviewer grants, and rollback require PostgreSQL integration tests before migration or API deployment. The new optional projection must not silently fall back to an unverified dataset when source resolution fails.

No genuine medical assertion is imported or published by this change. The current production catalog remains empty. Tests use synthetic non-clinical fixture labels; no medical truth claims or learner events result from browsing.

## Acceptance boundary

- Node projection tests: fail-closed reviews, rights, stale versions, unknown concepts, retired versions, duplicated IDs.
- Authenticated handler tests: only the service snapshot supplies relationships; client query injection is rejected; source corrections remove dependent edges/concept/source visibility; RPC failure returns an error without a stale fallback.
- Browser acceptance at 390/768/820/1180/1600 CSS px: positive Medical graph, escaped claim, source/evidence version, visible direction arrowheads, progressive 60→100→140→180→200 edge bound, inbound/outbound concept navigation and retirement/rights withdrawal. The fixtures exercise the projection and actual learner controller without production content or writes.
- Existing empty Medical, educational-only graph, opaque Admin preview and context continuity regressions remain enabled.
- Existing CI core/Chromium/WebKit and static build must pass before merge.
- Live authenticated Admin/learner acceptance remains [Issue #301](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/301); server/rights publication work remains [Issue #299](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/299).

## Current milestone and next dependency

The read/display slice is PR #303. Its new fingerprint input is deliberately fail-closed and additive: old snapshots with no medical feed remain valid and empty; a future feed without current source fingerprints remains empty. Deployment must include the new domain module wherever `content-library.js` is bundled; a static frontend release cannot install a server snapshot feed.

Preparation integration applies the selected scope at the shared graph boundary, including calls with the original API library. A relationship remains only when both canonical endpoints survive the scope; its exact source metadata remains available. Empty, invalid and unmapped scopes clear medical relationships. Explore all retains the published context. These inventory filters do not grant curriculum suitability, human review or learning authority.

The next registry slice (#299) must extend the existing canonical publication architecture with authoritative storage, immutable versions/review/publish/retire receipts, exact-source current-rights checks, scoped reviewer authorization, Admin review controls and a service-owned snapshot feed. Disposable PostgreSQL tests must cover privileges/RLS, stale review/source/version rejection, retirement/corrections and rollback. Preserve account privacy and exports when adding reviewer-linked records. No browser-supplied verification flags, new clinical content or inference is authorized by this read contract.
