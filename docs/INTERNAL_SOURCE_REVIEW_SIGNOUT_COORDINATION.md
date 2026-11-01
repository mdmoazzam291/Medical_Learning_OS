# Internal Admin source-review — signout coordination and residual JWT window

**2026-11-01 • ADR-134 / issue #353. Draft #367 stacked on #366.**
**Local synthetic security regression ONLY. No live Auth, new production
endpoint, managed SQL migration, real reviewer, or learner publication.**

## Verified source facts (not proof of deployed behavior)

Supabase Auth's official [session guide](https://supabase.com/docs/guides/auth/sessions)
explains that access JWTs may remain usable until expiry after signout;
`session_id` maps to the provider-owned `auth.sessions` table. The
[JavaScript signOut reference](https://supabase.com/docs/reference/javascript/auth-signout)
also documents `scope:'local'` and the absence of immediate access-token
revocation. The [account removal guide](https://supabase.com/docs/guides/auth/managing-user-data)
distinguishes refresh-token revocation from existing JWT acceptance.

The active managed MLOS environment (see #365) has **no direct
`authenticated`/`service_role` SELECT on `auth.sessions`**. We must
not copy the earlier disposable `auth.sessions FOR SHARE` fixture into
production or elevate `service_role` privileges merely to make it work.

## Why #366 alone does not close logout

An issued JWT can remain cryptographically valid after a provider-only
signout. Unless MLOS independently invalidates its own reviewer session
row, its app-owned review gate may still accept the signed JWT.
A plain `getClaims` JWT-signature check cannot prove provider session
liveness; even an external Auth preflight isn't a transactionally atomic
proof of app DB review state.

**New deliberate negative regression:** the existing disposable local
GoTrue/PostgREST signed-JWT runner signs out of GoTrue **without** first
revoking the MLOS-owned session row, then verifies that the original signed
JWT still commits a synthetic source-review decision through the
application-owned gate. Next it revokes MLOS-owned access and demonstrates
that the same signed JWT is denied access to the protected readback.

That first accepted decision is an **expected security weakness
reproduction**, not a successful authorization design or production result.
Tests must never use real source rows or reviewer credentials.

## First-party reviewer signout: app-first, provider-second

`src/domain/internal-source-review-signout-handoff.js` is a dependency-
injected offline contract (no network, SDK or DB implementation):

1. Independently verify user and session identity from a trusted server
   adapter. Never accept browser-supplied reviewer/session UUIDs as authority.
2. Call an authenticated server-only MLOS-owned revocation primitive
   **before** the provider signout. That primitive must derive actor/session
   from a verified user context and lock app-owned session rows in the
   same transaction as source-review authorization.
3. Always request provider `local` signout next, **even if app revocation
   acknowledgement is lost**: a user should not be stranded with an active
   provider refresh session just because MLOS is unavailable.
4. Return separate acknowledgement statuses and an explicit
   `needsReconciliation` result when either operation is uncertain. Never
   say `reviewAccessVerifiedDenied`, `providerSessionEndedVerified`,
   `transactionVerified`, `ready`, or any publication flag is true based
   only on callback responses. Do not automatically retry ambiguous
   write-side revocations.

The local signed-JWT runner also demonstrates the happy path: independently
verified current local user → privileged **test-only** MLOS session
revocation → GoTrue local signout, after which the still-issued JWT cannot
submit a source-review decision through the app-owned gate.

**Limitation:** neither this JS helper nor its synthetic test implements
a new deployed signout path. The real workflow needs separate error
disclosure, scoped operator audit and access cleanup for interrupted
network calls. No production guarantee follows from the simulated
administrator-controlled revoker.

## Remaining unclosed routes

- Provider-only signout from another device, session termination, refresh
  reuse detection, password change, account deletion, Auth admin action or
  direct SDK signout **bypasses** app-first revocation.
- A provider-managed logout event and an application-owned grant transaction
  have no tested cross-service atomicity. Polling/webhooks cannot guarantee
  immediate invalidation unless the event/ordering bound is proven.
- A cached `getUser` result, stale JWT claim or separate HTTP preflight
  cannot remove the Auth→DB time-of-check/time-of-use window.
- Browser UI must never treat `bothStepsAcknowledged` as authoritative
  clearance. An operator must be able to reconcile the original session
  and immutable review event after ambiguous errors.
- New authentications and renewals must not automatically reactivate old
  app reviewer grants or session keys. Grant issuer qualification and
  independence remain unverified.

## Release gate and engineering recommendation

**Default: block production internal source-review writes** until an
independently reviewed staging implementation proves a supportable,
least-privilege current-session and grant revocation policy. Two possible
approaches should be evaluated with real tests rather than assumed:

- **Strong invalidation:** a provider-supported current-session verification
  mechanism tied safely to the DB decision point, plus MLOS-owned locks.
  If provider-only logout atomicity cannot be guaranteed, do not claim it.
- **Explicit bounded staleness:** owner-approved residual maximum access-token
  lifetime for *restricted* review decisions, plus app-first signout, rapid
  app-owned revocation and monitored reconciliation; **not** equivalent to
  immediate provider signout revocation, and may be unacceptable for
  reviewer authority.

Next acceptance must use a designated, authorized **separate staging** project,
real least-privilege roles, denied/foreign tokens, interrupted signout, provider
logout race, readback after revocation, backup/restore, independent issuer and
source rights. No such staging acceptance is claimed here. #350 external
provider gateway stays deferred/OFF, and all source-review PRs are draft.
