# Internal source review vs real local GoTrue session lifecycle

**1 November 2026 — disposable test only.** ADR-134 (internal review). Stacked atop draft #359; no real users, hosted database, source rights adjudication, production credentials, external provider, or learner release.

## Why this test is distinct

Draft #359 verified synthetic signed JWTs with real PostgREST and a synthetic session table, but the table was **not** the real authentication provider's session state. A signed access token can remain cryptographically valid after refresh-token revocation/sign-out. If a source-review write only checks JWT signature, it may accept a recently signed-out user. The existing MLOS `review-api` checks `getUser(token)` plus runtime-access session logic; the database write must independently enforce appropriately current session state at the point of commit.

## This isolated acceptance

`scripts/internal-source-review-local-gotrue-check.mjs` starts from a fresh local-only CLI Auth/GoTrue project, random `@mlos.local` account, verified `auth.getUser(accessToken)`, and the actual local `auth.sessions` row. A separate test-only `evidence_internal.record_local_gotrue_review(p_actor,p_session,request,grant)`:
- takes a `FOR SHARE` lock on that **actual provider-owned session row**, matches user+session and checks expiry;
- while still holding the transaction, checks exact versioned source-row, rights, scoped case grant and reviewer independence via the existing disposable internal decision SQL;
- writes one immutable source-only decision (all four release flags FALSE);
- coordinates a genuine local `signOut({scope:'local'})`, commits the first review, verifies the session row is then absent, and denies a subsequent source review using the revoked session ID;
- leaves the first event auditable while its source-review authority no longer exists.

The acceptance refuses any non-loopback service, remote or malformed DB URL, nonlocal confirmation, missing local publishable key or unexpected SDK import paths **before creating any client**. `CI #360` uses pinned temporary CLI/SDK/driver packages, a migration-free local stack, no project linking and `stop --no-backup`. The only coupling is deliberately recorded in the portability baseline.

## What is *not* established by this test

The disposable SQL function accepts `p_actor` and `p_session` supplied by a highly privileged test client. **It is not safe for production**, nor a replacement for #359's JWT-verifying user-scoped RPC. The test combines actual provider session-row lifetime with the review event transaction, but does **not** prove both properties in a single real hosted least-privilege user role. The provider-owned `auth.sessions` row ACLs/lock compatibility, pool topology, revocation writers and permission grants may differ in managed production.

A local sign-out test does not verify every global signout, Auth expiration, MFA assurance, provider signing-key rollover, account ban or refresh race. The duration from token issuance to session deletion is not a formally bounded global consistency guarantee. No stable user-facing source-review endpoint exists.

## Required next validation

- An officially supportable managed Auth/session query or a managed internal revocation ledger with explicit authority, consistency and race contract. Never change provider-owned managed Auth table ACLs by assumption.
- Compose a genuinely verified user-scoped JWT identity and current provider-authoritative session/rights/grant check inside **one least-privileged database decision transaction**; test isolated actual GoTrue token through PostgREST, then hosted nonproduction.
- Prove native race ordering, idempotent persisted receipt/readback, non-authorized role denial, backup/restore, source-rights and independent reviewer grant issuance.
- After security/legal/clinical review and explicit owner authorization, wire the existing Admin UI. Do not silently conflate source identity with clinical accuracy, exam mapping, rights or learner publication.

**No provider delivery/receipt integration**: #350 remains deferred, gateway OFF. This PR is DRAFT/unmerged. 
