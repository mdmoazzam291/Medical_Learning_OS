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
