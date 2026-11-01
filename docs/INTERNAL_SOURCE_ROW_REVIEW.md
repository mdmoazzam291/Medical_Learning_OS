# Internal Admin source-row review — owner-approved Option A

**Decision:** 1 November 2026. Owner approved internal MLOS Admin source-evidence review. **External durable-receipt delivery is deferred; private gateway remains OFF.** This document specifies the initial metadata-only internal projection and the remaining release gates. Source-review decisions, application Auth, server grants and publication are *not* implemented or simulated as real in this slice.

## Canonical systems reused

- `src/domain/source-row-evidence.js`: one canonical, versioned source-row package and per-case/appearance SHA-256 evidence digest, **not** verified original PDF bytes.
- `src/domain/source-evidence-staging.js` and the disposable `ops/prototypes/source-evidence/` SQL: metadata-only stage, history, guarded readback/withdrawal and conformance fixtures. Their feature-branch merge (#349) did **not** deploy a hosted backend.
- `src/domain/source-evidence-resolution.js`: exact selected-case source binding, never a "latest" source fallback.
- `src/domain/source-row-review.js`: a strict, typed request with four dispositions (accept/reject proposed interpretation, request primary clarification, retain unresolved), meaningful rationale and exact digest/version binding. Its receipt matcher **does not prove** server origin, independent reviewer rights or durable storage.
- `src/domain/admin-action-inbox.js`: existing Admin triage UI model for medical, references and rights. A queue count does not confer authority; no new Admin route or invented count is added without trustworthy server readback.

## Implemented in this review PR

`src/domain/internal-source-row-review.js` adds:

1. `buildInternalSourceRowReviewCandidates(packageCandidate,expectedDigest)` — validates/captures the existing source-row package, recomputes its canonical package and case digests, rejects stale or mismatched bindings, and yields a sorted frozen list of **metadata-only candidates** (source hash, edition, page, row ordinal, case/appearance digests, proposed identity and relation).
2. `preflightInternalSourceRowReviewRequest(packageCandidate,expectedDigest,request)` — uses the existing source-row-review request contract and verifies the request's exact case/version/source/digest binding against the current supplied package. It rejects stale requests and extra authority/publication fields.

Both are **offline preparation only**. Every candidate has `reviewState:'unverified'`; `adjudicatedCount:null` prevents interpreting generated candidates as reviewed cases. Even a successfully bound decision request returns `reviewerAuthenticated:false`, `reviewerGrantVerified:false`, `decisionRecorded:false`, and **all release flags false**. The helpers do not query a server, persist a decision, create an authorization, publish content, send a request, or connect an external provider. No new conceptual store or queue engine: these are adapters/projections of existing canonical records.

## Required internal Admin implementation after this slice

### Authenticated review selection and evidence context

- **Trusted server-only read API** lists exact, current packages/cases for a source reviewer with active target-scoped grant; no unrestricted enumeration, browser table access or leak of source bytes.
- Reviewer must be qualified, independent of package author, actively granted under a separately authenticated session, and scoped to the **exact packageId, version, packageDigest, caseId, caseDigest and appearanceEvidenceDigest**.
- Verify current source/metadata rights, source-edition identity, withdrawal and owner/runtime status on every protected read and again at commit; separate clinical and copyright reviewers must not be silently replaced by this role.
- Never infer pending-review count from all source appearances. A trusted backend must supply counts from a versioned **authoritative review event** projection; missing telemetry stays unknown, not zero.

### Atomic decision event

- An authenticated server checks grant, independence, source status and exact current digest **within the database's authoritative transaction**, writes one immutable source-review event/receipt and enforces actor-scoped request-idempotency.
- The event records requestId, reviewer actor, grant event, target version/digests, disposition, rationale, recorded timestamp and evidence/source locator. Same requestId/different payload must conflict. Revocation and withdrawal writers must use the same serialization mechanism.
- Existing `matchesSourceRowReviewReceipt` validates shape/bindings but is **not enough**: require independently verified issuer origin and protected readback before marking a decision recorded.
- `accept-proposed-interpretation` means **source identity adjudication only**, never copyright clearance, clinical correctness, exam validity or learner publication. Rejected/uncertain/clarification cases remain visible as unresolved.

### Admin experience and downstream gates

- Within current Admin review navigation, show a case-by-case review inbox with source edition/page and exact extracted appearance evidence, distinct from the existing published References/Medical/Rights workflows.
- Provide the four existing dispositions, meaningful rationale, decision history and reviewer/source provenance. Link to the controlled original file *only if reuse/display rights permit*; otherwise expose metadata locators, not copied source text/PDF.
- Never add a public/learner route, automatically "Review → Live", or claim an accepted NMC/exam competency denominator from the number of rows imported.
- Only after proven authorized server reads/writes and CI can the Admin UI be wired. Publishing continues through existing independent rights, medical, exam-scope and manual publication controls.

## Trust boundaries / acceptance tests

**Build now:** canonical candidate and exact binding/preflight, malformed-source and stale-request tests (this PR).

**Next engineering slice:** private metadata-only review read API, current grant/state checks, immutable idempotent review event storage, role isolation, two-connection revoke/decision races, readback/restore evidence, and integration with existing Admin action inbox. Separate feature branch/PR and explicit review before any hosted migration.

**Not now:** provider signer registration, external receipt lookup, outbound queue, email/webhook deliveries, private provider credentials, learner content or new feature-specific navigation. External delivery decision was deferred by owner; experimental [#350](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/350) stays draft/unmerged; [#347](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/347) is the archived/deferred provider release blocker.

## Success measurement (when authenticated implementation exists)

Monitor **source review outcome correctness** on sampled independently adjudicated cases, unresolved-case burden by source/version, stale-decision rejection rate, grant/revocation failures, median qualified review turnaround, and unauthorized/rights-gated disclosure failures. Do not optimize for superficial "approved" counts or quick clicks. Source adjudication is upstream of Medical Knowledge Graph and Exam DNA; it cannot independently certify curriculum completeness or mastery.

**Status:** approved architecture direction; review-only pure-domain increment. No production migration, no reviewer identity/grants certified, no real source decisions, no external provider, no gateway activation, no learner release.
