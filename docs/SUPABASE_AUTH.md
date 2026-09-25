# M04b Supabase account integration

## Canonical identity
Supabase Auth user UUID is the canonical cloud learner ID. The live `study_sessions`, `study_attempts` and `study_bookmarks` tables use UUID `learner_id` columns and learner-read policies compare `auth.uid()` with `learner_id`. Do not introduce a second account-to-learner mapping table unless the product later needs multiple learner personas per account.

The M03 random IndexedDB learner UUID remains demo-local. It is not silently merged into an authenticated account. Any future import/reconciliation flow must be explicit.

## Browser credential boundary
The browser may receive only the Supabase project URL, publishable key and the learner's own Auth session tokens. Never ship database passwords, service-role/secret keys, R2 credentials, Resend API keys, Sentry auth tokens or AI-provider secrets to the browser.

`src/adapters/supabase-auth.js` handles email signup, password sign-in, refresh and sign-out. `src/adapters/cloud-study.js` sends the learner JWT to the cloud study boundary and retries once after refresh on a 401.

## Trusted server boundary
The deployed `study-api` Supabase Edge Function has JWT verification enabled. It independently resolves the authenticated user and derives the learner UUID server-side. It never accepts `learner_id`, correctness, concept ID, event ID or authoritative timestamps from the browser.

Trusted writes use the existing server-only atomic database functions. Direct browser reads remain constrained by RLS. `study_catalog` has no learner-facing table policy.

## UI boundary
`/web/account.html` is the cloud-account surface linked from the existing learner shell. The three-question M03 local software demo remains separate from cloud evidence.

The live shared catalog currently has zero published questions. This is intentional: identity and persistence can be verified without opening a medical QBank before M04c review gates pass.

## Verification completed
- Unit tests cover session persistence/refresh, password non-persistence, unauthenticated rejection and authenticated request construction.
- Browser CI covers sign-in, persisted session reload, cloud progress/question calls and sign-out using mocked Supabase network responses.
- Main Foundation checks passed in run 36188364648.
- `study-api` version 1 is active in the dedicated Supabase project with gateway JWT verification enabled.

## Remaining M04b gate
1. Add a verified Resend sending domain and configure it as Supabase Auth custom SMTP.
2. Create and confirm one real learner account through the actual email flow.
3. Exercise that account through Auth → `study-api` and verify reload/refresh/logout plus learner-scoped reads.
4. Before production exposure, test isolation with two real accounts and cross-device recovery.
5. Configure Sentry for client/server failure capture after the real Auth path is proven.

M04b is not DONE until the real email-confirmed path succeeds. None of this is evidence that the learner application itself is deployed.
