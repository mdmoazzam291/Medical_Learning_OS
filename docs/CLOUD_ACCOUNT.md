# M04b — Supabase learner account integration

## Boundary

Supabase Auth is the production identity boundary for learner accounts. The browser may hold the learner's short-lived access/refresh session, but it never receives an operator credential, database password, secret API key, service-role key, answer key before submission, or a client-controlled learner ID.

The existing M03 IndexedDB walkthrough remains a separate nonclinical local demo. It is not silently migrated into cloud evidence.

## Browser path

`/web/account.html` uses:

- `src/adapters/supabase-auth.js` for sign-up, sign-in, refresh and sign-out.
- `src/adapters/cloud-study.js` for authenticated study requests.
- `web/cloud-config.js` for the public Supabase project URL and publishable key.

The publishable key is intentionally public. Supabase secret/service-role keys never enter browser code.

## Server path

The hosted `study-api` Supabase Edge Function requires a valid JWT and independently resolves the authenticated user. It then uses the server-side secret key to access the study tables and the existing atomic mutation functions.

Current routes cover questions, progress, export, sessions, answering, advancement, cancellation and bookmarks. Learner identity, correctness, event IDs, concept IDs and timestamps are server-derived.

The live catalog currently has zero published questions. This is deliberate: account integration can be exercised without opening the medical QBank before M04c review gates are satisfied.

## Verification boundary

Unit tests cover token persistence/refresh, password non-persistence, unauthenticated rejection and authenticated cloud request construction. Browser CI mocks Supabase network responses to verify account persistence and UI wiring without creating real accounts.

The deployed Edge Function is active with JWT verification enabled. A full real-user email-confirmation path is not yet claimed. Resend/custom SMTP is the next dependency for reliable authentication email, after which a real account can verify the hosted Auth → Edge Function → RLS/storage path.

## Failure and privacy rules

- Auth failures do not erase the M03 local demo.
- Remote sign-out clears the local auth session even if the network logout call fails.
- Cloud study requests retry once after token refresh on a 401.
- No medical content is exposed merely because an account exists.
- Cross-device data is server evidence only; local demo evidence remains local until an explicit migration design exists.
