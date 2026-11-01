# Internal source-row reviewer Auth preflight — existing review-api reuse

**1 November 2026 — draft, not deployed.** ADR-134 Option A only. This increment is stacked on draft PRs #352 → #354 → #355 → #356. It does **not** activate a source-row review route, create Supabase migrations, store decisions, grant reviewer authority, or merge the deferred external provider PR #350.

## Why this increment exists

The internal decision prototype's `evidence_internal.record_review(actorId,...)` accepts a claimed actor ID, and the safer `SESSION_USER` variant uses synthetic native PostgreSQL logins (not MLOS user authentication). MLOS already has an authenticated server path in `supabase/functions/review-api/index.ts`:

1. `userClient.auth.getUser(token)` resolves the actual current authenticated account identifier from the identity provider, not from the browser request body.
2. `checkRuntimeAccess(admin, token, reviewerId)` requires current session/runtime access using the existing server-only RPC.
3. Separately fetched source/rights/reviewer grants would be loaded by a privileged server reader for that verified account ID. **These source-row grant queries are not implemented or deployed yet.**

Adding another JWT parser/verifier would duplicate the established Auth boundary and risk a false sense of security. Merely decoding a JWT's `sub`, `session_id`, or role claims must NEVER authorize an internal source adjudication.

## Added domain contract

`src/domain/internal-source-row-server-preflight.js` exposes `createInternalSourceRowServerPreflight({auth,checkRuntimeAccess,loadCurrentEvidence})` for **server-only composition**. It validates the source-row request shape first, obtains the reviewer ID exclusively from an externally verified identity-provider `getUser(token)`, then checks current runtime status **before any privileged source/grant reads**. It reads an exact current package/case/rights/grant snapshot and reuses `assessInternalSourceRowReviewEligibility` from PR #354. It rejects actor mismatch, withdrawn/stale package, missing source rights, revoked grant or changed digests.

This is an **adapter contract**. Its injectable dependencies are controlled only by future trusted server wiring. Unit-test mocks do not validate a real access token or prove current hosted sessions. The resulting `eligible:true` output is deliberately labeled `reason:'server-preflight-only'`; `reviewerGrantVerified:false`, `decisionRecorded:false` and all clinical, rights, exam-scope and learner-release flags remain false. It never forwards a token, reviewer ID or user-provided context to an unbound SQL review decision call.

## Acceptance boundaries

- Unit tests cover verification-first call ordering; suspended, invalid, unavailable or revoked sessions; no privileged reads after Auth failure; forged body IDs, hostile metadata getters, cross-account context mismatches, changed source-version/hash/rights, request mutation during async calls and no publication side effects.
- **Required next:** Wire to existing `review-api` *only after* trusted current-grant storage and transactional server-to-database actor binding are designed and verified. A real live endpoint must derive Auth user ID from verified `getUser(token)`, independently check current runtime/account and reviewer qualification, then recheck grants/rights/source status **in the same database transaction** that appends a decision. App-layer preflight alone cannot prevent TOCTOU, SQL role compromise or replay.
- Do not reuse the generic `medical/references/rights` reviewer grant or singleton Admin status as permission to adjudicate a source-row identity: source-row review requires a separate target-specific independent qualified grant.
- The experiment does not provide an authenticated Admin queue, stored review event, backup/restore, managed platform Auth acceptance, licensed source text, clinical review, or production readiness. Server wiring, live data rights, source adjudication, roles, migrations and deployment require separate review and owner authorization.

**Success criterion:** testable verified identity and current-session **preflight ordering** without inventing a second authentication system or conflating source review with learner publication.
