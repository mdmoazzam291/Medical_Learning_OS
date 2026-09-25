# M04b Supabase account integration

## Canonical identity
Supabase Auth user UUID is the canonical learner ID. The live `study_sessions`, `study_attempts` and `study_bookmarks` tables already use UUID `learner_id` columns and their read policies compare `auth.uid()` with `learner_id`. Do not introduce a second account-to-learner mapping table unless product requirements later require multiple learner personas per account.

The M03 random IndexedDB learner UUID remains a demo-local identity. It is not silently merged into an authenticated account. A deliberate import/reconciliation flow is required before any demo evidence can become server evidence.

## Browser credential boundary
The browser may receive only the Supabase project URL, publishable key, and the learner's own short-lived Auth session tokens. Never ship database passwords, service-role/secret keys, R2 credentials, Resend API keys, Sentry auth tokens or AI-provider secrets to the browser.

`src/adapters/supabase-auth.js` is the dependency-light Auth adapter. It implements email signup, password sign-in, authenticated-user lookup and conversion of a verified Auth user into the canonical learner principal. The checked-in project URL and publishable key are intentionally public identifiers, not secrets.

## Data boundary
Direct browser reads are constrained by RLS. Learner-scoped read policies exist for sessions, attempts and bookmarks. `study_catalog` has RLS enabled without a browser policy. Writes/scoring remain a trusted-server concern. Do not add permissive browser INSERT/UPDATE policies merely to make integration convenient. The server must derive learner identity from a verified Supabase access token and must never accept `learner_id` from a request body.

## Next implementation slice
1. Replace M04a operator-token principal resolution with verified Supabase session principal resolution at the same service boundary.
2. Connect the learner UI to authenticated server endpoints.
3. Verify two-account isolation, token expiry, logout, refresh/reload, cross-device recovery and RLS denial.
4. Then configure Resend as Supabase Auth SMTP and Sentry for client/server failure capture.
