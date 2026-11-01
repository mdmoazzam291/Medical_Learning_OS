# Learner identity and readable UID — implementation proposal

**Date:** 2026-11-02 · **Status:** DESIGN ONLY (no migration, generation, user-data write or live feature) · **Owner decision needed:** approve Phase 1 or keep existing UUID display.

## Decision

**Keep the existing Supabase Auth `auth.users.id` UUID as the only canonical learner identity.** Add, only if useful, an immutable non-sequential **Learner Code** for self-service and support. Do not add a second internal user primary key, replace historical learner IDs, or conflate support identifiers with security credentials.

**Why:** existing authenticated Medretica code already binds account sign-in, Study, NeuralVault, preparation state and learner-admin RPCs to a single Auth user UUID. Existing owner search and management use the same UUID, not a separate "student ID." Another primary key would create unnecessary key translation and history migration. A separate readable code solves *human communication*, not authentication or learning intelligence.

## Proposed identity layers

| Identifier | Example | Owner | Purpose | Visibility |
| --- | --- | --- | --- | --- |
| **Canonical learner UUID** | `auth.users.id` UUID | Supabase Auth | RLS ownership, data FKs, attempt/NeuralVault/Preparation Digital Twin identity, owner administration | Server, user-specific authenticated views and authorised Admin only |
| **Learner Code** (proposed) | `ML-7GQ9-M2RX-5V8K-CP4N` | MLOS server-side identity projection | Learner-friendly support/account reference and exact account lookup in authorised Admin | **Self + authorised support/Admin only**, not a globally browseable directory |
| Display name (optional) | `A Learner` | User profile | UI personalization; mutable, may be non-unique | Only where privacy settings permit |
| Institutional enrollment ID (later) | Institution's own roll number | Tenant-specific enrollment | Campus roster, cohort analytics or integrations | Constrained to that institution, with consent/authorization; **never** the canonical global learner key |

**Do not** create public numeric sequences, use email/phone/DOB/region/exam choice in the code, or expose the raw UUID in search-engine-indexable pages, public profile URLs, shareable analytics or client error logs.

### Candidate Learner Code contract (`learner-code-v1`)

- Pattern: `ML-XXXX-XXXX-XXXX-XXXX`; sixteen uniformly sampled characters from the 32-character uppercase alphabet `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (excludes visually ambiguous I, L, O, U). Normalise case/hyphens **only for authenticated exact lookup**, not for bearer authorization.
- Effective randomness: **80 bits** when generated using a server-side cryptographically secure random source, without truncating UUIDs or using `Math.random()`. Birthday-collision probability is approximately `n(n-1)/(2 × 2^80)`, roughly `1.0×10^-11` at 5 million accounts. **Collision is still possible**; a database `UNIQUE` constraint and bounded retry are mandatory.
- Code is globally unique, immutable, never reassigned, and independent of display name, email, authentication method, institution, exam and billing plan. Avoid sequential creation order or registration timestamps. The prefix `ML` is not a claim that the learner is a physician/verified student.
- User can copy the code from **Account → Identity**. It is **not a password, API token, session key, invitation secret, login lookup on a public endpoint, proof of ownership, or sufficient credential for account recovery**. Anyone may learn a code; no privilege follows from knowing it.
- If generation, backfill or lookup fails, display **“Learner Code not available”** and keep sign-in and study functional. **Never substitute a fabricated or local-only code.**

### Canonical data contract (future, not executed)

- New narrowly scoped `learner_public_identifiers`-equivalent **private profile mapping**: `auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id)`, `learner_code TEXT NOT NULL UNIQUE`, `created_at TIMESTAMPTZ NOT NULL`, `format_version SMALLINT NOT NULL`. Prefer a private/non-exposed schema or strictly denied-default RLS; verify available privileges and Supabase Data API exposure first. This is *not* an open directory.
- **Server-authorised allocation only**: authenticated owner or dedicated server service maps an existing user UUID to one code, atomically. Use idempotent `INSERT ... ON CONFLICT (auth_user_id) DO NOTHING`/readback inside an explicit transaction; on a *code* unique conflict, regenerate and retry a bounded number of times. Always return the **persisted** mapping. A retry must not rotate an issued code.
- **Sign-up safety:** do **not** put a failing external dependency in the signup/Auth trigger path; allocate asynchronously or on first authenticated identity read with a scoped server operation. Existing accounts get an idempotent, rate-limited server backfill. A missing code is not a broken learner account.
- Use existing `auth.users.id` in all content/attempt/event FKs and RLS policies. Enforce access with verified current session and `auth.uid()` plus server-side owner permissions; **never** rely on `user_metadata`, a supplied code or an email match for authorization.
- Audit code-lookup access; rate-limit even owner/support lookups. Read by exact code only with authorised privileges; no prefix search, enumerations, open GET-by-code API, cross-learner leakage or public leaderboards keyed by code.
- If account IDs need authorised merging, treat that as a *separate, audited*, consent-sensitive migration. Do not silently merge learners whose emails or display names coincide. Linked Google/password providers for the same Auth user retain the same UUID/code; a second Auth user must not inherit a code without authorised merge.

## UX and operational journey

1. **Learner Account → Identity:** show “Learner ID” with masked/readable `ML-...` code and **Copy**; explanatory label “Use when contacting support. Never share passwords.” No raw UUID needed in ordinary learner UI.
2. **Owner/Admin → Learner Accounts:** permit *exact* code search beside existing email/UUID search, resolving to the existing UUID **on the server**. Show an unchanged source-of-truth account detail and audit events. No new account actions or elevation.
3. **Support ticket (later):** learner may include the code for routing; staff must still authenticate the request through the established verified process before discussing personal records or changing access.
4. **Institutional / multi-exam expansion:** use the same UUID for Preparation Digital Twin, mastery and forgetting models across exams; use independent `institution_memberships` and scoped student-roll mappings. Institutions do not get cross-tenant global-code lookup just because they know a code.
5. **Privacy and deletion:** code is pseudonymous, **not anonymous**; treat the mapping as personal data, document retention/deletion policies, and do not reassign deleted codes. Avoid putting codes in URLs or PostHog/Sentry analytics. Preserve legitimate privacy/access boundaries.

## Suggested build stages

| Priority | Increment | Exit conditions |
| --- | --- | --- |
| **Build now — no migration** | Confirm existing UUID ownership, show UID proposal to owner, decide whether support code adds enough utility | This proposal reviewed; no alteration of accounts/history |
| **Phase 1, after approval** | Add private exact UUID→code mapping and authenticated read-only self endpoint; idempotent backfill without delaying signup | PostgreSQL uniqueness/collision tests, true session & RLS separation, atomic replay and failed-readback tests, no unauthorised mapping read |
| **Phase 2** | Copyable Learner Code on signed-in Account and owner exact-code search | Chromium/WebKit/mobile tests, signed-out/other-learner/disabled-scope denial, rate limit and no analytics leakage |
| **Later** | Cohorts, institution-specific roster IDs, portability exports and account-merge governance | Separate consent/role/tenant controls, no cross-tenant identity joins exposed |

### Acceptance and negative tests before any live integration

- Same Auth UUID → same code across reload, password reset, OAuth linking and device changes. A different UUID never gets the code.
- Two concurrent first reads/backfills yield one durable code; duplicate random candidate retries under the DB unique index. Failed allocation does not block sign-in or lose learner history.
- Anonymous, suspended/unavailable, other-learner and unprivileged Admin requests cannot read/resolve arbitrary mappings; the same printed code never authorises any action.
- Code stays out of public catalog, CDN cache, logs, URLs, telemetry, emails other than an explicitly permitted support flow, and third-party research exports. Database backup/restore retains mappings or fails without assigning a different code.
- Account deletion follows data-retention policy, leaving no publicly resolving code; active codes never reassigned. No falsely implied link between learner code and professional credential.
- Real managed staging Auth/RLS/browser acceptance and independently reviewed migration before release. Keep current production learner UUIDs and history untouched.

## Decision requested

**Recommended:** accept the two-layer design (internal Supabase UUID + optional stable Learner Code) and stage **Phase 1 only after independent security review**. The learner-facing code is useful for support and future cohort operations, but should **not** block the already-running medical learning engine.

**Rejected alternatives:** sequential short IDs (enumeration + metadata leakage), UUID shortening without collision controls, deriving codes from email/mobile/college, using a public code as login/recovery proof, or replacing `auth.users.id` in the Preparation Digital Twin, graph/learning events or existing foreign keys.

## Evidence and current dependencies

- Current repo: `src/adapters/supabase-auth.js` returns the authenticated Auth user ID; `web/account.js` preserves one learner identity across sign-in methods; `supabase/functions/owner-api/index.ts` currently checks strict UUIDs and uses owner-only RPC for learner detail, search and mutations; `web/owner-console.js` searches by email or UUID. This document does not claim code allocation exists.
- Provider reference: Supabase [Users](https://supabase.com/docs/guides/auth/users), [User Management](https://supabase.com/docs/guides/auth/managing-user-data), and [Identities](https://supabase.com/docs/guides/auth/identities). User metadata is user-editable and must not confer role/authorization.
- Independent product blockers remain: Core6 source/rights/medical review issue #326, authenticated content source-row review issue #353, and open draft PR #376. This learner-code proposal **does not depend on clinical-content publication** but implementation requires separate identity security approval.
