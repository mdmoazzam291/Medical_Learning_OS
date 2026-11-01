# Internal Admin source-review — implementation and release ledger

**Date:** 1 November 2026  
**Owner decision:** ADR-134 Option A — internal qualified Admin review, **no external evidence-delivery provider**.  
**Status:** review-only engineering; no live source-row review queue, server write endpoint, production migration, or learner publication.

This is the canonical **review-stack handoff** rather than a claim that a verified user-facing feature has shipped.

## Completed and independently testable

| Layer | Branch/PR | Actual capability | Deployment status |
|---|---|---|---|
| Source evidence foundation | #349 **merged into feature base only** | Versioned canonical package/case/appearance metadata; source digest binding, isolation/recovery tests | Not merged to `main`; no production feature |
| Canonical internal candidates | #352 DRAFT | ADR-134; metadata-only candidates, exact source-row request preflight, all downstream release flags false | No review API |
| Eligibility and event prototype | #354 DRAFT stacked on #352 | Scoped/grant/independence policy; disposable PGlite SQL guarded immutable decision and protected readback | Not a hosted migration; SQL accepts caller-provided actor |
| Native concurrency proof | #355 DRAFT stacked on #354 | Real PG17/18 decision-vs-revoke lock ordering and idempotency | Test-only |
| Native session-bound identity | #356 DRAFT stacked on #355 | Real PG17/18 synthetic reviewer LOGIN accounts, protected `SESSION_USER` binding, append-only grant/revoke events | Fixture identity, **not** MLOS Auth |
| Existing Auth reuse preflight | #357 DRAFT stacked on #356 | Provisional server-only composition: externally verified `getUser` → current runtime access → privileged current source/grant read → exact eligibility check | Injected dependencies only, no deployed endpoint |
| Public/hosted isolation regression | #357 DRAFT | Test forbids private review modules/SQL from Cloudflare Pages assets, the deployed `review-api`/`study-api` and SQL migrations | Build-time safety guard only |

All five review PRs are **separate, stacked and unmerged**, with no live content decisions. The currently deployed review API already has a verified-user + current runtime access pattern, but it is **not wired** to these source-row experiments. No external signer, transport, receipt service, credential, or gateway was implemented under ADR-134. Experimental provider PR #350 is deferred/unmerged; external-provider issue #347 was closed as `not_planned`, **not** as successfully verified.

## Still blocked — before a real internal reviewer can act

1. **Authoritative source inventory and rights (foundation).** Identify exact current original source, edition, digest, usage/reuse permission and permissible controlled Admin access. Human adjudication remains necessary. Imported NMC counts or source-row appearances are not independently verified medical syllabus coverage.
2. **Qualified, independent reviewer grants.** Define grant issuance/revocation authority, qualification and independence evidence, author exclusion, audit and scope (package+case+version+digest). Prevent ordinary Admin roles from inheriting source-review power.
3. **Real application Auth/transaction handoff.** Connect existing `review-api`'s verified `getUser(token)` and `checkRuntimeAccess` to a private, least-privilege service. A reviewer identity must be independently bound to the **same database transaction** that verifies current grant, revocation, source rights and exact case/hash. Do not trust a browser-supplied ID, a decoded JWT claim, a mock or an app-layer preflight as commit authority.
4. **Durable, protected authoritative storage.** Replace isolated `evidence_internal` test tables with reviewed real migration, immutable reviewer events/receipt, idempotency, session/grant revocation and withdrawal serialization, protected readback, audited corrections, recovery and backup/restore. A fixture with a mutable grant row does not satisfy real grant governance.
5. **Real Admin interface and queue.** Integrate a source-row case list and decisions within existing Admin navigation and action-inbox contracts only after safe read/write APIs exist. Counts must be derived from authoritative stored events; unknown is not zero. Source pages may be displayed only where permitted.
6. **Independent release gates.** Separate source identity, clinical validity, exam-scope mapping, copyright rights, and manual Review → Live. An internal reviewer action does **not** set `clinicalApproved`, `rightsApproved`, `examScopeApproved` or `learnerRelease`.
7. **Acceptance and rollout.** Native PG concurrency, negative roles, adversarial session revocation, cross-account tests, backup/restore and real hosted Auth verification; then independent security/rights/clinical reviewers, explicit owner merge/migration/deployment approval, monitor/rollback runbook. Keep public & hosted isolation tests until such approval.

## Sequence and priorities

- **Build now:** audit this stacked review diff; keep all exact-head CI green; make the server-to-database identity/transaction boundary concrete and testable *offline*, without treating service-worker Auth as proof of a new source reviewer.
- **Next gated implementation:** reviewed current-reviewer grant schema and transaction-bound internal event handling, then real server-only read/write adapter with hosted Auth acceptance on a separate environment.
- **After trust gates:** Admin queue UI, decision history, authoritative counts and an independently approved source adjudication pilot.
- **Later:** clinical/rights/exam publication pipeline integration, measured review throughput and quality, then first controlled learner content release.
- **Deferred:** experimental external evidence delivery/#350. Avoid optional infrastructure without an identified outside recipient.

**Do not merge/deploy just because CI is green.** This ledger, the CI and the isolated prototypes are engineering evidence, not credentials, approved rights, authenticated humans or completed learner functionality.


## 1 November 2026 — stacked security continuation (#358–#364)

**This section supersedes the earlier “five PRs” count, not the earlier
unmerged/deployment prohibitions.** Each PR remains stacked, DRAFT and separate
from the production `main` branch.

| PR | Added verified or proposed engineering boundary | Release authority |
| --- | --- | --- |
| #358 | Strict offline canonical event/receipt contract handoff; no verified origin | None |
| #359 | Disposable signed-JWT PostgREST and synthetic session verification | None |
| #360 | Disposable local GoTrue-owned session/sign-out lock ordering | None |
| #361 | Same-transaction actual local GoTrue JWT/session, scoped grant and immutable event | None |
| #362 | Native exact-grant revocation races in both transaction orders, synthetic revoker | None |
| #363 | JCS/SHA-256 projected canonical receipt and event/readback shape parity; cannot prove persisted origin | None |
| #364 | Original-request-ID-only recovery after lost response; one protected read, zero writes, never auto-resubmit | None |

The proposed #364 isolated local GoTrue acceptance asserts that a receipt
candidate can be reconstructed from the previously committed event without a
second write; foreign JWTs must be denied. Its exact-head CI results must be
checked separately. Prior CI results on earlier heads are not a substitute.

**Next blocking gate:** authenticate and audit a least-privileged current-session
and exact-scoped-grant readback implementation on an explicitly isolated
nonproduction managed Supabase environment, or design a formally supported
revocation-status bridge when `auth.sessions` locks are unavailable. Define
authoritative digest persistence and idempotency recovery/restore semantics.
Independent security, source rights, qualified reviewer evidence and explicit
owner release authorization are still required before any migration, merging
the stacked PRs, Admin UI action, learner publication or provider integration.


## 2026-11-01 — managed Auth permission inventory (draft #365)

A catalog-only SQL SELECT on the **active** MLOS managed Supabase project
(PostgreSQL 17.6) confirmed `auth.sessions` exists, but both `authenticated`
and `service_role` lack direct SELECT/UPDATE privileges on that table. The
list of connected projects showed **no separately designated MLOS staging
project**. No identity/session/learner rows were read, and no SQL writes,
privilege grants, migrations or deployments were performed.

Repeatable exact catalog query: `scripts/internal-source-review-managed-auth-capabilities.sql`.
Offline fail-closed assessment and tests: `scripts/internal-source-review-managed-auth-capabilities.mjs`
and `tests/internal-source-review-managed-auth-capabilities.test.js`.
Source and architectural decision:
`docs/INTERNAL_SOURCE_REVIEW_MANAGED_AUTH_CAPABILITY_AUDIT.md`.

**Revised recommendation:** Do NOT copy the #361/#362 test-only
`auth.sessions FOR SHARE` provider-row lock into managed production. Use
application-owned reviewer grant/revocation serialization with a separately
supported current-session verification strategy; provider signout atomicity
remains **unproven**. Provision or explicitly identify staging before further
hosted acceptance. No PR in the internal source-review stack is approved for
merge or deployment by this metadata inspection.


## 2026-11-01 — application-owned revocation test-only continuation (#366)

The blocked provider-owned `auth.sessions` lock path is **not** a proposed
production dependency. Draft #366 adds disposable SQL and real local
GoTrue/PostgREST tests where **MLOS-owned** reviewer session and exact-grant
rows are locked for review/revocation, with commit ordering and protected
readback. No managed DB or hosted endpoint has been changed.

**In-scope proof (subject to exact-head CI):** app-issued review-session
revocation and scoped grant revocation can serialize with a signed-JWT
review decision using application-owned rows. These are separate operations
from Supabase Auth signout, which has no demonstrated atomic coupling to
the app-owned gate. A still-valid access token may outlive provider signout
unless independently invalidated or checked. This limitation blocks real
source-review authorization.

Read `docs/INTERNAL_SOURCE_REVIEW_OWNED_REVOCATION_ACCEPTANCE.md`.
Next release prerequisite: dedicated authorized staging, supported current
provider-session semantics, least-privilege review-grant governance,
qualifications/rights, persisted trusted receipt and disaster recovery.
All current source-review PRs remain draft/unmerged.


## 2026-11-01 — provider-only signout gap and app-first coordination (#367)

Draft #367 adds a **deliberate negative** to the disposable signed-JWT
acceptance: provider-only signout may leave a previously issued JWT usable
against an MLOS-owned review-session gate if the app revocation has not
occurred. This must be recorded as an exposure, **not** proof of security.

It also adds a provider-neutral, test-only app-first source-review signout
handoff that requests MLOS-owned revocation before Supabase local signout,
continues signout despite ambiguous app failure, does not auto-retry a
potentially committed revoke, and preserves explicit unresolved status.
No callback can assert real provider-session invalidation or authorized
source-review completion.

See `docs/INTERNAL_SOURCE_REVIEW_SIGNOUT_COORDINATION.md`. Provider-only
logout, token lifetime and cross-service atomicity are still unresolved.
Real source-review writes remain **blocked**. Separate staging, owner-risk
decision, qualified grant issuers, authoritative source rights and
independent security acceptance are required before any real API,
migration or learner publication.


## 2026-11-01 — Auth-server liveness recheck counterexample (#368)

Draft #368 adds a locally signed JWT experiment on top of #367:
`getUser(originalToken)` before and after a genuine `local` provider
signout, compared against a still-signed JWT accepted by the disposable
PostgREST-only application session gate. This separates fresh remote
session lookup from JWT-signature-only acceptance.

**Test acceptance is scoped to disposable GoTrue** and is not a supported
managed Auth session/DB atomicity guarantee. Even a fresh `getUser`
preflight can become stale before a review write commits, so it must not
weaken the existing **no production source-review writes** rule. No
hosted SQL, credentials, grant issuance, author permissions, source rights,
learner-facing features or external provider changed.

See `docs/INTERNAL_SOURCE_REVIEW_GOTRUE_SESSION_RECHECK.md`.
Independent authorized staging and security/rights/clinical sign-off remain
required. #368 remains draft and stacked until separately approved.


## 2026-11-01 — staging environment identity quarantine (#369)

The linked Supabase project list was rechecked: only active
`medical_learning_os` and inactive legacy `NEETPG2027`; **no separate
approved staging project exists**. Draft #369 adds a purely offline,
fail-closed project-selection classifier, pins both existing environment
identities, and leaves the required staging ref `null`. It blocks
production/legacy misselection, inactive candidates, wrong organization,
duplicate or forged metadata and accidental approval by project-name match.

Even a matching future staging target remains **metadata candidate only**:
no hosted SQL, Auth/security acceptance, production review, migration or
learner release permission is granted by the classifier. Reference:
`docs/INTERNAL_SOURCE_REVIEW_STAGING_TARGET_GATE.md`.
Explicit separate staging creation/approval and current-session
security testing are still outstanding; do not revive the old project.

The prior #368 local Auth `getUser` experiment does not prove provider
signout and the application DB write are atomic. All real reviewer
writes and review UI remain OFF until independent reviewed staging
acceptance and explicit owner release approval.


## 2026-11-01 — approved isolated staging *identity*, baseline verified (#370)

The owner explicitly authorized creation of `medical_learning_os_staging`
in Medical ORG, Mumbai. Supabase quoted **$0/month** for project creation
and returned a confirmation ID required by its API. Creation succeeded:
project ref `vwtdwafjrraptrgeshzt` is `ACTIVE_HEALTHY` and distinct
from production `iyapppmeieqhflnzslao` and excluded inactive legacy
`ueuguguoladoqvtxkumt`.

Read-only staging evidence: PostgreSQL 17.11, no application migration
history, no public tables, no security-advisor lints on the empty project.
The `auth.sessions` catalog table exists, but authenticated and
service_role have no direct SELECT/UPDATE privileges. No user/session
data selected and **no migrations or test SQL writes performed**.
The project ref is now pinned in staging policy as a **metadata candidate
only**; every runtime, SQL, hosted Auth acceptance and release permission
remains false. See
`docs/INTERNAL_SOURCE_REVIEW_STAGING_BASELINE_20261101.md`.

Staging build/hosted Auth/SQL validation, review grant authority, source
rights and production release remain independent, **unapproved** gates.
Do not copy production identities or data into staging. All internal review
PRs remain draft and unmerged.


## 2026-11-01 — first managed staging PostgreSQL rollback acceptance (#371)

Two synthetic SQL transactions were executed **only** against approved
staging project `vwtdwafjrraptrgeshzt` (PostgreSQL 17.11).
Temporary session/grant/receipt rows, application-owned row locks,
synthetic revoke, and duplicate request-ID deduplication completed.
After explicit `ROLLBACK`, an independent read-only inspection
confirmed zero public tables/migrations and no permanent test objects.
No GoTrue users, Auth row reads, public RPCs, production access or
production schema/data modifications occurred.

**Limited proof:** single managed-Postgres transaction only; no real
concurrent grant race, no signed JWT/PostgREST on managed staging,
no immutable receipt proof or payload fingerprint comparison, and no
provider logout/DB atomicity. The experiment is NOT source-review
authorization or release approval. Reproducible rollback-only SQL and
limitations in
`docs/INTERNAL_SOURCE_REVIEW_MANAGED_STAGING_ROLLBACK_SMOKE.md`.
All internal source-review PRs remain draft, provider #350 OFF,
and production Review → Live disabled.


## 2026-11-01 — managed staging synthetic role/RLS protected receipt (#372)

Against authorized staging `vwtdwafjrraptrgeshzt`, a rollback-only SQL
editor transaction tested temporary, app-owned reviewer-session, grant and
receipt tables as PostgreSQL role `authenticated`, with **fabricated**
request JWT claim GUCs (NOT genuinely signed GoTrue tokens).

Verified: no claims 0 receipts; exact reviewer A/B identities each read
only their own 1/2 receipt; mismatched session 0; application-owned session
A revocation removed A readback; application-owned grant B revocation
removed B readback; anon SELECT denied and authenticated receipt
INSERT/UPDATE/DELETE not granted. Independent post-rollback inspection
confirmed **zero public tables, zero migrations**. No permanent objects,
real Auth users or production changes.

This establishes hosted **RLS policy behavior only**, not signed-token,
provider-session, concurrent-transaction, immutable receipt or rights
authority. Exact executed SQL and limitations:
`docs/INTERNAL_SOURCE_REVIEW_STAGING_RLS_READBACK.md`.
Source-review writes/publication remain OFF. PR #372 is draft and stacked.


## 2026-11-01 — staging signed-JWT read-only verification harness (#373)

A staging-identity-pinned, no-write `GET /auth/v1/user` test harness is
now draft code with mocked-HTTP security unit tests. It consumes an
**existing**, independently provisioned staging test JWT; it cannot
create/log in/delete an Auth user, refresh/logout a session or reach
source-review write endpoints. Every result keeps production/staging
review-write, migration, publication and rights approval **false**.

**Real managed staging Auth JWT positive test NOT RUN** because no
authorized signed-in staging test session was provided. Remote Auth
acceptance is not to be fabricated from a simulated SQL-editor claim.

Limited advisory-lock probes against two staging PostgreSQL backend PIDs
did not observe confirmed overlapping lock contention; the contender
acquired the lock. Consequently there is **no hosted two-connection
review-versus-revocation race proof**. The project remained healthy,
with no public application tables or applied migrations after testing.

See `docs/INTERNAL_SOURCE_REVIEW_STAGING_SIGNED_JWT_READONLY.md`.
Provision approved synthetic Auth credentials and separately reviewed
hosted readback/race harness before any further write-bearing acceptance.
PR #373 is draft; all source-review release gates remain OFF.


## 2026-11-01 — disposable hosted staging test identity cleanup contract (#374)

Draft #374 implements **operator-only code**, not executed on hosted Auth:
a strictly pinned staging synthetic Auth user creation / signed JWT read-only
verification / admin deletion lifecycle. It requires explicit opt-in and
**staging-only** publishable/admin secret keys, and creates an exclusive,
0600 local cleanup journal *before* calling Auth admin. Every known
created identity is deleted and the absence rechecked; an ambiguous
create/delete or interrupted lifecycle leaves manual-reconciliation
evidence instead of claiming cleanup. No tokens, passwords, user IDs,
emails or provider response bodies appear in result logs or Git.

Mock-adapter tests cover success, identity spoofing, sign-in failure,
ambiguous create/delete, journal failure and all release-deny flags.
**No actual hosted staging Auth user, signed JWT or cleanup was tested**,
and hosted reviewer readback/race gates are still blocked. Detailed
controls and operator cleanup:
`docs/INTERNAL_SOURCE_REVIEW_STAGING_IDENTITY_LIFECYCLE.md`.

Never run an admin secret in untrusted PR CI or browser. No production
Auth/DB, migration, medical source data, review UI, rights/clinical
approval or learner publication changed. The review PR stack remains
draft/unmerged. #350 external provider stays OFF.
