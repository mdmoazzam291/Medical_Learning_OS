# M04b Supabase account integration

## Canonical identity
Supabase Auth user UUID is the canonical cloud learner ID. The live `study_sessions`, `study_attempts` and `study_bookmarks` tables use UUID `learner_id` columns and learner-read policies compare `auth.uid()` with `learner_id`. Do not introduce a second account-to-learner mapping table unless the product later needs multiple learner personas per account.

The M03 random IndexedDB learner UUID remains demo-local. It is not silently merged into an authenticated account. Any future import/reconciliation flow must be explicit.

## Browser credential boundary
The browser may receive only the Supabase project URL, publishable key and the learner's own Auth session tokens. Never ship database passwords, service-role/secret keys, R2 credentials, Resend API keys, Sentry auth tokens or AI-provider secrets to the browser.

`src/adapters/supabase-auth.js` handles email signup, password sign-in, Google OAuth authorization, callback verification, refresh and sign-out. All providers resolve to the same Supabase Auth user UUID; no provider-specific learner mapping table exists. `src/adapters/cloud-study.js` sends the learner JWT to the cloud study boundary and retries once after refresh on a 401.

## Trusted server boundary
The deployed `study-api` Supabase Edge Function performs explicit user-token validation with `auth.getUser(token)` and runs with gateway `verify_jwt=false`. This is intentional for Supabase's current publishable/secret API-key model, whose gateway verifier is legacy-JWT oriented. The function independently resolves the authenticated user and derives the learner UUID server-side. It never accepts `learner_id`, correctness, concept ID, event ID or authoritative timestamps from the browser.

Trusted writes use the existing server-only atomic database functions. Direct browser reads remain constrained by RLS. `study_catalog` has no learner-facing table policy.

## UI boundary
`/web/account.html` is the cloud-account surface linked from the existing learner shell. The three-question M03 local software demo remains separate from cloud evidence.

The authenticated medical QBank is live behind the publication gate. Identity provider choice does not affect publication, scoring, mastery or review authority.

## Verification completed
- Unit tests cover session persistence/refresh, password non-persistence, unauthenticated rejection and authenticated request construction.
- Browser CI covers sign-in, persisted session reload, cloud progress/question calls and sign-out using mocked Supabase network responses.
- Main Foundation checks passed in run 36188364648.
- `study-api` version 3 is active in the dedicated Supabase project with explicit user-token validation and gateway `verify_jwt=false`.
- Manual deployed-API smoke run `36188568697` attempt 2 passed unauthenticated rejection, allowed-origin preflight and disallowed-origin rejection.

## Current account state
M04b is DONE: hosted Auth, JWT-gated study access, session refresh, logout and two-distinct-real-account learner isolation have already been proven.

Google OAuth is an additional login method, not a new learner identity model. The account UI sends the learner to the hosted Supabase `/auth/v1/authorize` endpoint with `provider=google` and an allow-listed return URL. Supabase owns the Google client secret and provider exchange; the browser never receives that secret.

Email/password remains available. Custom SMTP/Resend is an operational email-delivery improvement rather than a prerequisite for Google sign-in.

The remaining cross-system transport gate is M05c: execute one real learner session through the Study Now recommendation → answer → projection path in a browser and verify the hosted evidence chain.


## Email-confirmation callback

Hosted Supabase projects enable email confirmation by default. The client-only flow can return the new learner session in the redirect URL fragment after confirmation. The local root app now detects Auth callback fragments and forwards them to `/web/account.html`. The account adapter:

1. parses only Auth-related fragment fields,
2. rejects callback errors without persisting a session,
3. validates the returned access token through `/auth/v1/user`,
4. persists the session only after a real user is returned,
5. removes the token-bearing fragment from browser history immediately.

This closes a pre-Resend gap: a delivered confirmation link can now become a usable learner session. Production still requires the deployed site URL and account callback URL to be allow-listed in Supabase Auth URL Configuration.

## Google OAuth path

Google sign-in uses the hosted Supabase social-login flow:

1. the account page generates only `https://<project>.supabase.co/auth/v1/authorize?provider=google&redirect_to=...`;
2. the return URL must be HTTPS, except localhost/127.0.0.1 during development;
3. only the explicit `google` provider is accepted by the adapter;
4. Google/Supabase return the learner session through the existing Auth callback flow;
5. the adapter validates the returned access token through `/auth/v1/user` before persisting it;
6. token-bearing URL fragments are removed from browser history;
7. downstream Study, Review and QBank APIs see only the canonical Supabase learner UUID.

The app does not persist Google access tokens, Google profile payloads, client secrets or a second provider-specific learner identifier.

Supabase currently has no recorded Google identities before the first real Google login. Provider configuration and learner usage are separate facts.
