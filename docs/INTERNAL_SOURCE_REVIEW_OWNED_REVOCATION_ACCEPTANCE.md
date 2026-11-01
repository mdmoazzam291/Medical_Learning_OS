# Internal Admin source review: application-owned revocation races (isolated)

**2026-11-01; ADR-134 / issue #353. Draft PR #366, stacked on #365.**
This is **NOT** a production-safe review endpoint, hosted migration, migration
plan, source-rights approval or learner-release authorization.

## Why this isolated experiment

The managed MLOS database catalog confirmed that regular `authenticated`
and `service_role` roles lack direct access to `auth.sessions`.
Do not copy the earlier #361/#362 GoTrue-owned session-row lock fixture
to managed Supabase. Instead, this experiment implements only application-owned
serialization over:

- `owned_reviewer_sessions`, keyed by reviewer and provider-issued
  `session_id`, with an MLOS-managed active/revoked status;
- append-only `owned_reviewer_session_revocations` and
  `owned_reviewer_grant_history`, representing app-managed revocation;
- existing isolated immutable package/case/grant/decision fixtures.

**The signed JWT's identity is derived by PostgREST, not from browser fields.**
The test-only public function uses `auth.uid()` and
`auth.jwt()->>'session_id'` and locks only MLOS-owned rows. It then checks
the current exact scoped grant and invokes the strict immutable decision
contract in the same PostgreSQL transaction.

This only proves **MLOS-owned revocation serialization**. A valid JWT can
remain accepted by PostgREST until expiry even after a provider-only signout,
and the MLOS session row is not automatically revoked by GoTrue. Neither
this code nor an app-only epoch proves immediate provider logout invalidation.
Do not use the fixture unchanged, or expose a hosted security-definer RPC.

## Tests

`ops/prototypes/source-evidence/internal-review-owned-revocation.sql` defines
non-deployable SQL restricted to a disposable local PostgreSQL/GoTrue
environment. `scripts/internal-source-review-owned-revocation-check.mjs`
uses synthetic accounts and authentic signed local JWTs. PR #366 opts into
the existing isolated local GoTrue GitHub Actions job.

1. Anonymous, forged token, foreign user, caller-supplied actor/grant denied.
2. Exact request/reviewer/source binding, idempotency and protected readback.
3. **Session decision first**: hold MLOS-owned session row while recording;
   app revoker must block until decision commits; later read/write denied.
4. **Grant revocation first**: hold package/grant lock, competing signed-JWT
   decision blocks and then fails; no new decision.
5. **Grant decision first**: revoker blocks behind package/grant lock; event
   survives, but current-grant readback becomes denied.
6. **Session revocation first**: app revoker locks session, competing review
   blocks and fails. Previously signed JWT alone cannot bypass the app gate.
7. Immutable transition history and forbidden session reactivation.
8. All clinical/rights/exam/learner-release flags remain false.

These test identities, grants, qualification flags and source metadata are
synthetic. The fixture's administrator is an artificial issuer/revoker and
**does not** establish real grant issuer independence or qualified human review.

## Authorization caveats and staging criteria

- The application-owned table is **not a substitute for supported Auth
  session liveness verification**: signout, password changes, token rotation,
  expiry, MFA, SSO, account suspension and cross-device invalidation need
  explicit provider integration or documented bounded-staleness policy.
- Registering/revoking app sessions must be privileged and audited, tied
  to independently verified provider identity, and cannot be performed
  by ordinary `authenticated` users.
- Treat any client-supplied session ID, reviewer UUID, grant or active flag
  as untrusted. Use verified issuer/audience/signature/subject, trusted
  server requests, and a single DB transaction for MLOS-owned grant gates.
- Native role grants, SECURITY DEFINER ownership, private schemas, RLS,
  Data API exposure and managed Supabase deployment behavior must be
  independently reviewed on a dedicated staging project.
- Session-only app revocation is atomic **with app review**, not provider
  signout. A forced immediate-revocation guarantee is **unproven**.
- An authorized separate staging project was not identified in the
  previous catalog check. Do not repurpose the inactive legacy project or
  mutate the active MLOS production project for this test.

**Next gate:** separately authorized staging acceptance using supported
current-provider-session verification (or fail-closed bound-staleness policy)
combined with application-owned atomic grant/revocation. Then test restore,
request idempotency, independent issuer evidence and exact readback integrity.
Source rights, clinical correctness and Review → Live remain independent.
