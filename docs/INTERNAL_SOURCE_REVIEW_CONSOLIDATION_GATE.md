# ADR-134 — Internal source-review integration decision and stop/go gate

**2026-11-01 · Evidence snapshot for draft PR #374 · all approvals BLOCKED**

## Decision

**Do not merge, deploy or expose the internal source-review integration.**
The current design has substantial useful disposable-local and managed
staging *database* evidence. The production authorization chain is not
verified; source-review writes, reviewer approval and learner publication
must remain OFF. External provider draft PR #350 remains OFF/deferred.

`ops/prototypes/source-evidence/internal-review-release-gate.json`
is the checked-in fail-closed machine-readable status. It is a status
contract, not proof that an operator or production environment has obeyed
it; the document and tests do not authenticate GitHub or Supabase state.

## Stacked draft PR chain — one logical change under ADR-134

A live GitHub read-only audit on 2026-11-01 confirmed these PRs are
**open drafts**, not merged to main:

| Group | Draft PRs | Role | Evidence interpretation |
| --- | --- | --- | --- |
| Source review, authority and DB-bound identity | #352, #354–#359 | Foundational prototypes and isolation | Not a deployable API |
| GoTrue/JWT, grants, races, retry/recovery, revocation | #360–#368 | Disposable *local* Auth/PG acceptance | Real local JWT evidence, **not hosted** |
| Staging project isolation and managed SQL | #369–#372 | Staging identity and rollback-only managed PG RLS tests | Synthetic database claims, not genuine hosted Auth |
| Hosted Auth read-only and cleanup lifecycle | #373–#374 | Staging-only operator test harnesses | **Not executed against hosted Auth** |

PR **#353 is an issue ID**, not a missing PR. PR #350 concerns a
separate external provider and must not be silently activated by the
source-review chain.

All these changes are stacked on prior feature branches, not main.
Their draft status and specific base dependencies must be preserved if
rebasing or consolidating. The green CI checks on a draft PR do **not**
prove source-review permissions are ready; specialist local GoTrue
workflow jobs were conditional on earlier PR numbers and may be
**skipped** on later draft heads. Consult the exact workflow job statuses.

## Verified versus unverified

**Verified in disposable local tests:** signed JWT negative cases, a
reproduced provider-only logout window, application-owned session/grant
revocation, and local transaction-race/idempotency patterns. This cannot
prove the managed Auth/DB boundary.

**Verified on managed staging:** project identity
`vwtdwafjrraptrgeshzt`, PostgreSQL 17.11, empty public schema, zero
migrations, single-transaction `BEGIN/ROLLBACK` smoke and SQL-editor
`authenticated` role/RLS receipt isolation. The role claims were
injected synthetically; no hosted review RPC or real JWT was accepted.

**Not verified:** hosted signed-in test user JWT; genuinely hosted Auth
account create/read/delete cleanup; managed two-connection concurrent
revocation; server-bound reviewer authority/immutable protected receipts;
provider signout atomicity; qualified reviewer independence; source
rights and clinical approval.

## Material new Auth-admin compatibility blocker

Supabase's newer `sb_publishable_...` and `sb_secret_...` API keys
are opaque keys **rather than user JWTs**. They should not be treated
as bearer JWTs; see the current official API-key documentation:

- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/functions/auth-headers

Draft #374's raw HTTP adapter has therefore been changed to place
these keys in the `apikey` header without manufacturing a JWT bearer
token. **This is a safety correction, not proof that hosted Auth admin
POST/DELETE supports the key-only route.** A provider report exists
of Auth admin POST behaving differently from GET using a new secret key:
https://github.com/supabase/supabase/issues/48288

**Owner/operator must confirm the currently supported Auth admin
transport before any account creation attempt.** If the selected
provider key and endpoint are unsupported, fail closed; do not
automatically retry with a production token, paste secrets in CI, or
insert directly into provider-managed `auth.users`.

The pre-existing test journal and exact synthetic-account ownership
checks remain mandatory even if the provider client/transport changes.
If hosted Auth user provisioning becomes unavailable, prefer a
provider-supported disposable test-identity setup outside PR CI, with
explicit removal and separate verification, over creating another
privileged browser or SQL workaround.

## Consolidation and execution order

1. **Freeze scope and review:** Keep #352/#354–#374 in their current
   stacked draft state. Deduplicate overlapping prototypes and
   separate provider-neutral authorization policy from Postgres/Auth
   adapters. Audit `SECURITY DEFINER`, privilege grants, role
   identity, exact source rights and digest/version checks.
2. **Resolve the staging Auth admin transport:** In a trusted staging
   operator environment, verify the key belongs to
   `vwtdwafjrraptrgeshzt` and that the chosen supported Auth admin
   client can create/read/delete the exact randomized test identity.
   Do not use production identities or staged clinical data.
3. **Run genuine staged Auth acceptance:** Verify signed JWT user,
   anonymous denial and tampered-token rejection; require independent
   exact-ID test-user deletion verification and journal cleanup.
4. **Review readback privilege boundary:** Prefer private,
   least-privileged server-owned rows, an independently qualified
   issuer, and unforgeable current-session identity. Before hosting,
   check transactional grant/session revocation and fingerprint
   parity. No test-only public `SECURITY DEFINER` escape.
5. **Test managed concurrency:** Independently synchronized
   PostgreSQL sessions; prove both review-first and revoke-first
   ordering and exact retry/replay denial. Do not infer correctness
   from the earlier unconfirmed advisory-lock attempt.
6. **Decision on provider-only signout:** Either establish a
   provider-supported transaction-compatible session authority
   or have the owner explicitly accept/document a bounded-staleness
   security policy. No preflight `getUser` alone proves atomicity.
7. **Then consolidate for review:** One carefully audited merge
   train or a properly rebased integration PR, with exact-head
   core/browser/WebKit plus specialized Auth/PG CI. Merge/deploy
   only under explicit authorization, with rollback/backup and
   independent rights/clinical controls.

**Build priority:** current foundation — merge-blocked; next —
supported staging Auth lifecycle and signed JWT; later — secured
readback/concurrency; release — human security/rights/clinical approval.
No source-review writes or learner-facing publication are approved.
