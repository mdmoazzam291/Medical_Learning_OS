# Isolated Auth provider acceptance — opt-in test protocol

**State (31 October 2026): IMPLEMENTED AS A TEST RUNNER, NOT RUN AGAINST A REAL PROVIDER.** The active MLOS hosted project currently has no development branches. None was created in this work. No learner accounts, credentials, projects, Auth settings, MFA factors, or production SQL were changed.

## What is actually proved and what is not

The offline `scripts/lib/source-evidence-auth-provider-probe.js` protocol runs through multiple clients sharing one test account and a second independent test account. It obtains real tokens from a provider only when the operator explicitly invokes `scripts/source-evidence-auth-nonprod-check.mjs` with a **different project reference** and isolated credentials.

The acceptance sequence checks:
1. Separate verified user identities and three distinct `session_id` claims across two sessions for A and one for B. Decode claims *only after* a network `getUser(access_token)` identity check. Do not trust user_metadata or decoding as authentication.
2. Refresh session A1, verify the same authenticated subject and stable session ID after refresh.
3. Local sign-out A1: fresh attempt to refresh the rotated token must fail; A2 must remain accessible. Record whether A1's previously issued **access JWT** remains recognized rather than assuming revocation.
4. Global sign-out A2: a fresh refresh attempt must fail. Independent B remains accessible. Record whether the old A2 access JWT is still recognized rather than assuming immediate invalidation.
5. A payload-tampered token with an unchanged signature must fail `getUser`. This is **not** a genuine, correctly signed expired-JWT test.
6. Cleanup remaining test sessions; emit only a bounded anonymous report with booleans and observed AAL classes. Never print tokens, user IDs, passwords, addresses, provider error bodies, connection details or secrets.

Strictly **not exercised**: actual MFA challenge/enrollment/verification; correctly signed expired tokens, server-side session `not_after`/inactivity/timebox semantics, password-change revocation, real provider mutation lock order, protected owner SQL/role grants, storage or rights/reviewer flow. A provider sign-out test alone **cannot** certify the owner-only evidence gateway.

## Isolation and invocation

Safety gates run **before any SDK import or network call**:
- Exact HTTPS project endpoint: `https://<TEST_REF>.supabase.co`, where `TEST_REF` is a 20-character nonproduction reference. Both known production/legacy project references are hard-blocked.
- Exact explicit opt-in: `MLOS_AUTH_PROBE_CONFIRM=ISOLATED_NONPRODUCTION_TEST_ACCOUNTS`.
- Two distinct dedicated test emails, each with `+mlos-probe-` tagging and distinct passwords at least 12 characters.
- A current **publishable** project key (not a `service_role`, secret, or legacy JWT key).
- A locally installed and reviewed/pinned server-side `@supabase/supabase-js` module referenced through an absolute `file:///` URL. No application dependency, secret, CI automatic live job or production route is added.

Pass these private environment variables in an operator-owned secure shell/session, **never GitHub issue comments, commit, PR description, command line arguments, chat or logs**:

```text
MLOS_AUTH_PROBE_CONFIRM
MLOS_AUTH_PROBE_PROJECT_REF
MLOS_AUTH_PROBE_URL
MLOS_AUTH_PROBE_PUBLISHABLE_KEY
MLOS_AUTH_PROBE_SDK_MODULE_URL
MLOS_AUTH_PROBE_ACCOUNT_A_EMAIL
MLOS_AUTH_PROBE_ACCOUNT_A_PASSWORD
MLOS_AUTH_PROBE_ACCOUNT_B_EMAIL
MLOS_AUTH_PROBE_ACCOUNT_B_PASSWORD
```

The operator then runs `node scripts/source-evidence-auth-nonprod-check.mjs` from the private workspace. If isolation/credentials/SDK or behavior checks fail, it emits only a generic failure marker and a nonzero exit status. **Do not run against the existing live MLOS project, on learner identities, in PR CI secrets, or in the user's ordinary browser profile.** Test accounts must be verified disposable before operator consent. Adding hosted branches/projects may be billable; check price and get separate authorization, not an implicit test setup.

## Negative controls

`tests/source-evidence-auth-provider-probe.test.js` exercises the same acceptance logic using only a fake provider. It must reject the two known project refs, malformed URLs, missing opt-in, nonsandbox identity inputs, failed local/global refresh revocation, and mismatched users. The fake deliberately permits old signed JWTs after signout; another fake denies them. Both are acceptable observations, because provider rechecks and **current session authorization** are distinct. Tests require correct refresh and deny a forged payload regardless.

The existing `scripts/lib/source-evidence-private-boundary.js` and `ops/prototypes/source-evidence/authority-row-locks.sql` are still offline only. Real provider acceptance does **not** grant SQL access to managed Auth tables. The `not_after` guard is a minimal synthetic-row defense and not a provider-certified session-lifetime policy.

## Remaining acceptance / promotion gates

- [ ] Acquire a separately approved disposable provider environment with dedicated test accounts, after confirming any monetary cost; do not use active/legacy MLOS projects.
- [ ] Execute the opt-in actual provider sequence with safe anonymous receipts and confirm all expected observations.
- [ ] Independently test session timeout, one-session policies, password change, genuine expired JWT, MFA and rotation with explicit capabilities/credentials. No hidden global signouts of real accounts.
- [ ] Obtain a provider-supported restricted database authority design that is compatible with managed Auth ownership and real concurrency; do not transplant synthetic RLS/locking grants into provider schemas.
- [ ] Only then consider a private HTTP transport with origin/method/body limits, TLS, credential rotation, idempotent receipt reconciliation, crash/restore and separate human source-rights/clinical approval checks.
- [ ] PR #346 and dependent #343/#344 remain draft/unmerged; no NMC completeness, reviewer assignment, rights grant, exam-syllabus activation, medical assertion publication or learner visibility follows.

References (official, reviewed 31 October 2026):
- https://supabase.com/docs/guides/auth/signout
- https://supabase.com/docs/guides/auth/sessions
- https://supabase.com/docs/reference/javascript/auth-getuser
- https://supabase.com/docs/reference/javascript/auth-refreshsession


## Acceptance-runner safety hardening — 31 October 2026

A security review of the *test runner itself* found two ways a real provider test could otherwise be falsely accepted or pointed at the wrong environment:

- **Direct-import safety:** the original command-line entry validated nonproduction project and account requirements, but a caller invoking the exported `runIsolatedAuthProviderProbe` directly did not. The core function now performs the full opt-in, project-ref, exact URL and test-identity preflight **before any client creation**, irrespective of which entry point invokes it. The CLI passes the complete validated configuration. Successful Auth-issued JWTs must also have a network-verified subject, an issuer equal to the explicitly selected sandbox `URL + /auth/v1`, and `aud='authenticated'` for the initial and refreshed sessions. The claims are inspected only after the provider verifies the user. A different issuer or audience fails closed and cleans up the test sessions.
- **Revocation-evidence safety:** a refresh attempt that threw a network error or returned no session had previously been counted as a revoked refresh token. Now **only** a provider Auth API error with `code=refresh_token_not_found` or `refresh_token_already_used`, and HTTP status 400, 401 or 422, counts. A timeout, request failure, network outage, unknown response code, malformed SDK response or unexpected exception is **inconclusive and causes test failure**, never a revocation pass. This is a strict test-acceptance policy, not a claim that those are the only possible legitimate provider errors.

The mock suite includes direct-function attempts to bypass production/legacy project guards (asserting zero clients created), cross-project issuer, wrong audience, cleanup, network exception and timeout negative controls. All values are synthetic. If a future SDK/provider version supplies a new well-documented revocation error, update the allowlist only with independent source verification and a regression test; do not widen it to catch-all errors.

These tests establish a stricter *protocol*, not real Auth behavior, production safety certification or a hosted entitlement. No real provider environment was created and no tokens were issued.

Official references: https://supabase.com/docs/guides/auth/jwt-fields and https://supabase.com/docs/guides/auth/debugging/error-codes.
