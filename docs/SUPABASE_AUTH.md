# M04b Supabase account integration

## Canonical identity
Supabase Auth user UUID is the canonical cloud learner ID. The live `study_sessions`, `study_attempts` and `study_bookmarks` tables use UUID `learner_id` columns and learner-read policies compare `auth.uid()` with `learner_id`. Do not introduce a second account-to-learner mapping table unless the product later needs multiple learner personas per account.

The M03 random IndexedDB learner UUID remains demo-local. It is not silently merged into an authenticated account. Any future import/reconciliation flow must be explicit.

## Browser credential boundary
The browser may receive only the Supabase project URL, publishable key and the learner's own Auth session tokens. Never ship database passwords, service-role/secret keys, R2 credentials, Resend API keys, Sentry auth tokens or AI-provider secrets to the browser.

`src/adapters/supabase-auth.js` handles email signup, password sign-in, refresh and sign-out. `src/adapters/cloud-study.js` sends the learner JWT to the cloud study boundary and retries once after refresh on a 401.

## Trusted server boundary
The deployed `study-api` Supabase Edge Function performs explicit user-token validation with `auth.getUser(token)` and runs with gateway `verify_jwt=false`. This is intentional for Supabase's current publishable/secret API-key model, whose gateway verifier is legacy-JWT oriented. The function independently resolves the authenticated user and derives the learner UUID server-side. It never accepts `learner_id`, correctness, concept ID, event ID or authoritative timestamps from the browser.

Trusted writes use the existing server-only atomic database functions. Direct browser reads remain constrained by RLS. `study_catalog` has no learner-facing table policy.

## UI boundary
`/web/account.html` is the cloud-account surface linked from the existing learner shell. The three-question M03 local software demo remains separate from cloud evidence.

The live shared catalog currently has zero published questions. This is intentional: identity and persistence can be verified without opening a medical QBank before M04c review gates pass.

## Verification completed
- Unit tests cover session persistence/refresh, password non-persistence, unauthenticated rejection and authenticated request construction.
- Browser CI covers sign-in, persisted session reload, cloud progress/question calls and sign-out using mocked Supabase network responses.
- Main Foundation checks passed in run 36188364648.
- `study-api` version 3 is active in the dedicated Supabase project with explicit user-token validation and gateway `verify_jwt=false`.
- Manual deployed-API smoke run `36188568697` attempt 2 passed unauthenticated rejection, allowed-origin preflight and disallowed-origin rejection.

## Remaining M04b gate
1. Add a verified Resend sending domain and configure it as Supabase Auth custom SMTP.
2. Create and confirm one real learner account through the actual email flow.
3. Exercise that account through Auth → `study-api` and verify reload/refresh/logout plus learner-scoped reads.
4. Before production exposure, test isolation with two real accounts and cross-device recovery.
5. Configure Sentry for client/server failure capture after the real Auth path is proven.

M04b is not DONE until the real email-confirmed path succeeds. None of this is evidence that the learner application itself is deployed.


## Email-confirmation callback

Hosted Supabase projects enable email confirmation by default. The client-only flow can return the new learner session in the redirect URL fragment after confirmation. The local root app now detects Auth callback fragments and forwards them to `/web/account.html`. The account adapter:

1. parses only Auth-related fragment fields,
2. rejects callback errors without persisting a session,
3. validates the returned access token through `/auth/v1/user`,
4. persists the session only after a real user is returned,
5. removes the token-bearing fragment from browser history immediately.

This closes a pre-Resend gap: a delivered confirmation link can now become a usable learner session. Production still requires the deployed site URL and account callback URL to be allow-listed in Supabase Auth URL Configuration.
