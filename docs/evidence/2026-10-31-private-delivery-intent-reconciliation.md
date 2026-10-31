# MLOS private delivery-intent and acknowledgement reconciliation — 31 October 2026

**Status:** Experimental native PostgreSQL ledger prototype; **NOT an outbound delivery integration**, production authority, source/clinical approval, or proof of external content delivery.

## Problem and replacement

The earlier disposable `evidence_private.receipts.delivered_at` marker was misleading: a SQL commit did not mean any medical content, evidence metadata or response bytes actually reached an external recipient. If the provider rejected authentication after that commit, the old marker could still have been set. This milestone **removes the marker and old `deliver` function from the prototype**. The replacement separates staging, a one-shot dispatch intent and an independent externally observed durable acknowledgement.

This design never calls Supabase-managed `auth.users`/`auth.sessions` from SQL and never installs roles, policies, triggers, grants or migrations on provider-owned relations. It is not connected to an API route, mailer, learner page or real outbound provider.

## Explicit state machine

| State | Durable evidence in MLOS-owned database | Meaning |
|---|---|---|
| `staged` | Immutable `receipts` record: exact request, actor, session, subject epoch, digest | A source-review metadata request has been staged, **not sent** |
| `intent` | Exactly one `delivery_attempts` row per request, generated `attempt_id`, timestamp | A trusted server may consider a single outbound operation; **no bytes are sent by this prototype** |
| `uncertain` | Same attempt and ID; `mark_uncertain` may annotate an ambiguous result | Outbound response or commit cannot be inferred; **no automatic redrive** |
| `acknowledged` | Same attempt and an externally correlated acknowledgement digest/time | A separate trusted confirmer asserted a **durable external acknowledgement**. The test oracle is synthetic; no actual delivery proved |

`reserve_intent` runs under an MLOS-owned subject row lock and the existing epoch/lease check, then atomically inserts **at most one** attempt for that exact request. A second reservation returns only `reconciliation-required`, never another attempt ID. This is **at-most-one database intent**, not exactly-once provider delivery. The same request ID cannot bind a different actor/session/digest/epoch.

The confirmer role is separate from gateway/controller and cannot read private tables or invoke the reserve/stage functions. Only it may call `inspect_intent` and `record_ack`. `inspect_intent(request_id,digest)` recovers the generated attempt ID after a committed intent response is lost; it **cannot create a new intent**. The internal reconciler uses that attempt ID to query a trusted outbound provider for a durable record bound to request ID, attempt ID and digest. A negative, missing, mismatched or unavailable answer remains denied/uncertain; no success is inferred from a timeout, SDK return, private timestamp or JWT alone.

`record_ack` stores only the digest of the independent acknowledgement and is idempotent with the same digest. A different acknowledgement conflicts. It can record an **audit fact after private revocation** without granting dispatch rights; it does not reauthorize the original staging session or turn a receipt into learner-visible content. A compromised/confused confirmer could still assert a false receipt. Production requires verified provider-specific proof, credential isolation and authenticated callbacks.

## Failure and concurrency experiments

The native PostgreSQL 17.6 and 18.6 scripts plus unit suites cover:

- Provider unavailable/revoked token before SQL: fail closed without reserving intent.
- Provider denial after intent SQL commit: caller sees denied, but the durable intent remains unresolved; retry cannot dispatch again.
- Two concurrent reservation calls: one generated attempt, one `reconciliation-required`; row lock barrier observed, no duplicate attempts.
- Correct binding and replay: exact same staged request idempotent, altered digest conflicts, stale actor epoch remains invalid after re-enable.
- Negative external acknowledgement or lookup timeout: stays unresolved; `mark_uncertain` does not authorize a new attempt.
- Lost acknowledgement **database response after commit**: caller sees uncertain; a later independent lookup recovers and records the already durable acknowledgement idempotently.
- Lost intent **database response before the caller knows attempt ID**: trusted confirmer recovers the committed ID without redispatch; no provider acknowledgement means no completion assertion.
- Unauthorized access to private tables, controller or confirmer RPCs by wrong roles is denied; expired private leases still deny stage/reserve.
- Native cluster cleanup and identical tests on PostgreSQL 17.6 and 18.6.

**Evidence:** [Exact-head Actions CI](https://github.com/mdmoazzam291/Medical_Learning_OS/actions) under draft PR #346; the successful native test log must contain `Private authority delivery ledger PASS` and `Private authority acknowledgement PASS`. Do not promote this report to full exact-head green until both native jobs and the remaining CI matrix have finished successfully.

## Unresolved acceptance gates

1. **Real transport/provider:** No external provider, delivery channel, immutable receipt signature, provider idempotency contract, recipient confirmation, or actual payload streaming is implemented. Synthetic positive callbacks must not count as external delivery evidence.
2. **Verifier atomicity:** Network `getUser(token)` and MLOS SQL are not one transaction. Post-commit rejection can leave an intent that requires reconciliation. A stale yet still accepted JWT and provider-side revocation timing need independent security controls.
3. **Safety of retries:** Deliberately **no automatic new attempt** after an ambiguous commit/ack. Later compensation or manual review needs a measured operational protocol and verified provider-side idempotency key semantics, not a generic exponential retry.
4. **Least-privilege deployment:** Fixture PostgreSQL roles authenticate through a disposable native cluster only. Authenticated transport, secret rotation, role grants, ownership, RLS, restored ACLs and private cloud runtime remain unverified. `SECURITY DEFINER` cannot be exposed via public/anon RPC.
5. **Source, clinical, rights:** These synthetic digests confer **no** source-use permission, NMC competency mapping completeness, qualified medical review, exam publication or learner release.

**Decision:** Keep PR #346 DRAFT/unmerged; evidence gateway OFF, production Auth and learners untouched. The next meaningful design gate is an authenticated narrow connector and trusted external acknowledgement verifier with a reproducible restart/restore replay test—not a new UI feature.
