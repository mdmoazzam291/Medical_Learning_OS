# Internal source review — provider `getUser` versus already-issued JWT

**2026-11-01 • ADR-134 / issue #353. Draft #368 stacked on #367.**
This is an isolated local Auth acceptance test, not a production review
endpoint or an authorization-to-publish decision.

## Precise question

After a successful `signOut({scope:'local'})`, a previously issued access
JWT may remain cryptographically valid. Does a fresh, server-side
`supabase.auth.getUser(token)` reject that session, even while PostgREST
continues to accept the JWT signature?

The existing #367 experiment established the latter: a provider-only logout
left a signed JWT usable against the app-owned-only source-review fixture.

**This change measures the first part with a genuine disposable local
GoTrue instance** by adding three checks to the same acceptance sequence:

1. Before logout, `getUser(originalAccessToken)` returns the correct user.
2. After provider `local` logout, a new `getUser(originalAccessToken)`
   request must not certify the signed-out provider session.
3. The still-signed JWT remains a separate test of the *PostgREST-only*
   MLOS-owned gate. After MLOS-owned revocation, that gate rejects it.

These checks distinguish an Auth-server user lookup from verification of
a JWT's signature and expiry. They also show why a successful preflight
**before logout** cannot authorize a decision **after logout**.

## Official reference and engineering interpretation

The [Supabase advanced server-side Auth guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
states that `getUser()` checks session state at the Auth server, whereas
`getClaims()` validates the JWT locally. The
[User sessions guide](https://supabase.com/docs/guides/auth/sessions)
states that previously issued access JWTs may remain valid until expiry
even after signout, and describes `session_id` association with
`auth.sessions`.

Both can be true: PostgREST verifies the JWT, and a separate fresh Auth
check may reject the provider session.

**Do not infer atomicity.** Even if a fresh `getUser` rejects a logged-out
session in local CI, an earlier successful `getUser` is a time-of-check
snapshot. Provider logout can race after that check and before the DB
transaction's app-owned session/grant locks. A request cannot claim
transactionally current provider session authority merely by calling
`getUser` first.

## Release decision

Keep **source-review writes OFF** until independent staging validation
establishes one of:

- A supported least-privilege, transaction-compatible provider-session
  consistency boundary with no unsafe provider-owned row locks, OR
- An explicitly owner-approved bounded-staleness policy and a separate
  security assessment showing that this weaker guarantee is acceptable
  for the specific internal reviewer operation.

Neither route is authorized by this draft. Do not broaden ordinary Admin
roles, grant access to `auth.sessions`, expose service credentials,
introduce a new managed migration, or re-enable the external provider.

Tests use only synthetic users, source metadata, short-lived local database
containers and the scoped #368 Actions job. The earlier #367 recovery and
signout contracts remain test-only and source-review-authority flags false.
