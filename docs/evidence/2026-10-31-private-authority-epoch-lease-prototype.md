# MLOS-owned private authority — epoch, lease and receipt prototype (31 October 2026)

**Result: DISPOSABLE NATIVE POSTGRESQL 17.6 AND 18.6 ACCEPTANCE PASS. Production authority and provider-revocation guarantees remain NOT ESTABLISHED.**

## Why this was necessary

The preceding genuine disposable GoTrue experiment demonstrated (1) no existing appropriately restricted login with the privileges required to lock `auth.sessions`/`auth.users`, and (2) a `FOR SHARE` lock on a test session row held back local sign-out but **not** local refresh. Therefore the proposed evidence gateway cannot claim that a narrow Auth-row lock serializes the full provider lifecycle. The next path must not require unmanaged grants, policies, triggers or locks on Supabase-owned Auth relations.

## What was built

- `ops/prototypes/source-evidence/private-authority.sql`: new, **standalone fixture-only** `evidence_private` schema with its own `subjects` epoch/enabled/lease and `receipts` request/digest/session/epoch records. It references **no Auth tables**. Owner is a non-login, non-bypass role. Separate disposable login roles execute strictly bounded `control` and `stage`/`deliver` functions; no role has direct table SELECT/UPDATE grants. Functions are `SECURITY DEFINER` with empty search path and exact EXECUTE grants, not public RPC routes. These fixture login roles use local trust authentication **only** and have no deployed secrets.
- `scripts/lib/source-evidence-private-authority-prototype.js`: offline trusted adapter with exact `{accessToken,requestId,digest}` inputs. Network `getUser(token)` verification **precedes** decoding the JWT actor/session locator, checks issuer/audience/expiration, and repeats after the gated SQL statement. No caller-supplied actor/session, verified flag, epoch, lease or arbitrary SQL is accepted. Failure to obtain a positive provider result denies; unknown SQL/network faults do not become authorized success.
- `tests/source-evidence-private-authority-prototype.test.js`: deterministic failure and identity cases; provider unavailable/denied, forged-subject/session mismatch, stale/expired claims, wrong input shape, SQL uncertainty, postcommit provider rejection and exact query binding.
- `scripts/source-evidence-private-authority-pg-check.js`: authentic disposable PostgreSQL 17.6/18.6 transactions with multiple independent connections and explicit wait-for graph observations; checks role ACL denials, stage/readback concurrency, epoch changes, stale receipt replay, leases and rollback. No Supabase connection.

**Proof:** [Foundation run 41198683455](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41198683455). Both `evidence-native-postgres17` and `evidence-native-postgres` jobs **SUCCESS**. Logs confirm:
- `provider outage/rejection fail closed, epoch rollback-denial, stale receipt replay forbidden, idempotence`
- `writer-first and evidence-first row-lock ordering, denied delivery after revoke`
- `rollback, bounded private lease expiry and immutable receipt audit`
- cleanup of the disposable native PostgreSQL directory

## Precise observation and failure modes

| Experiment | Observed |
|---|---|
| Replayed identical request while privately enabled | Idempotent one staged record |
| Same request ID with altered digest | Conflict, no overwritten receipt |
| Private revocation after staging | Delivery check denied despite deliberately positive synthetic Auth response |
| Re-enable private authority (new epoch) | Old request still denied; staging same request conflicts |
| Provider unavailable or token rejected | Denied; no new SQL authorization on initial failure |
| Provider rejection after SQL commit | Response denied, but SQL's audit marker may persist |
| Writer-first private revoke (uncommitted) | Staging waits; revoke commits; staging denied |
| Evidence-first stage with held row lock | Revoke waits for stage transaction; later delivery check denied |
| Controller rollback | Stage record preserved; private authority remains enabled |
| MLOS-owned lease expired | Stage denied even with positive synthetic network Auth response |
| Direct table read/role escalation by gateway/controller | Denied; only explicitly granted functions executable |

### Critical safety distinctions

1. **No automatic GoTrue revocation feed.** The fixture controller is manually operated by the test. A private `enabled` flag or short `lease_until` does not reveal a Supabase sign-out, password change, MFA downgrade, server-side session revocation, or still-valid-but-expired provider session. If the provider fails to report a revocation, this private gate can remain enabled. This test **does not prove instant provider revocation**. Provider outage is denied only because a **fresh network verification** is required for each prototype call; the provider's exact guarantees must still be checked.
2. **Not proof of actual content delivery.** The proof's `receipts.delivered_at` and `markDelivered()` names are **internal experiment bookkeeping**, not evidence that content was transmitted to any learner. A server/provider failure after the SQL write can produce a marked receipt and a denied caller result. This is an **uncertain reconciliation case**, not proof that material was delivered. A production design requires a distinct delivery-intent/attempt ledger and explicit acknowledgement semantics, and must never label this marker as proof of release.
3. **No exact atomicity with outside provider.** MLOS row locks serialize only the MLOS-owned authority row and receipt state. A GoTrue decision can change between network verification and the SQL transaction. The postcommit second verification reduces but does not eliminate this gap. This cannot inherit the stronger synthetic Auth-lock fixture claims.
4. **No deployed capability credential.** The fixture roles use local PostgreSQL trust, not TLS/authenticated direct-login secret rotation, a private Edge/Worker connection, hosted ACLs or production secret storage. `SECURITY DEFINER` on private functions is intentional for tests; its future use needs independent owner/ACL/search-path review, deny-by-default grants and backup/restore audits.
5. **No medical approval.** All requests and digests are synthetic, store no source-row clinical details and grant no NMC completeness, copyright/source-rights, reviewer approval, learner visibility or exam-release rights.

## Gate decision

**Keep gateway OFF and PR #346 DRAFT/unmerged.** This experiment proves an isolated MLOS-owned epoch/receipt state machine can fail closed for **known** revocations, expired private leases, stale receipts and provider network failure, while behaving correctly under ordinary PostgreSQL row-race ordering. It does not certify the behavior of a hosted Supabase provider or a production credential.

**Next slice:** convert the bookkeeping marker into an explicit delivery-intent/reconciliation model, exercise indeterminate commit/acknowledgement and provider failure between checks, then design the narrow private runtime credential. Do not build a public endpoint or apply this fixture SQL to the hosted database until those gates are reviewed.

See [Supabase Auth sessions](https://supabase.com/docs/guides/auth/sessions), [sign-out semantics](https://supabase.com/docs/guides/auth/signout), and earlier `2026-10-31-local-gotrue-session-writer-races.md`.
