# Learner Code v1 — offline engineering foundation

**Status: DRAFT / NOT DEPLOYED / NO REAL ACCOUNT ASSIGNED**

This increment implements the first testable, **provider-independent portion** of the learner identity proposal in [LEARNER_IDENTITY_AND_UID_PROPOSAL.md](../LEARNER_IDENTITY_AND_UID_PROPOSAL.md). It deliberately does **not** create a production or staging table, deploy a Supabase Edge Function, authenticate a learner, authorize support lookup or emit any actual learner code.

## Components

- `ops/prototypes/learner-identity/learner-code.js`: strict `ML-XXXX-XXXX-XXXX-XXXX` format/normalization, cryptographic generation from sixteen independent random bytes masked to five bits each (80-bit resulting code space), UUID identity validation, and bounded idempotent candidate allocation. No `Math.random()`, email, phone, numeric sequence or timestamp in generation.
- `tests/learner-code-offline-foundation.test.js`: synthetic collision and replay tests, simultaneous allocation on one UUID, prior-code preservation, invalid code rejection, malformed/missing persistence readback denial, error propagation and no public route.
- **No new table, migration, cloud secret, Auth policy, trigger, hosted endpoint or browser UI is added by this PR.**

## The real security boundary is not implemented yet

The allocation function accepts an **injected storage interface** and `authUserId` solely for offline proof. Its input is **not a verified identity** until a future server handler obtains an authenticated user from Supabase Auth; never expose this function as a client endpoint or accept a caller-supplied UUID. A copyable code is **not an authorization credential**.

A future adapter must use a private, non-exposed mapping table where `auth_user_id` is the immutable canonical UUID primary key/FK to `auth.users(id)`, and `learner_code` has its own `UNIQUE` constraint. The table must deny public/anon and ordinary arbitrary authenticated reads, prohibit modification or reassignment after issuance, and restrict support exact-code lookup to independently verified owner permissions. Database write concurrency, UPSERT behavior and readback require controlled real PostgreSQL tests; the synthetic Map proves only the domain contract.

### Future staging acceptance, in order

1. Independent identity-security review of canonical Auth UUID, current-session validation, reviewer/support roles, RLS/private schema access, deletion/retention policy and hosted staging target.
2. Isolated **staging-only** mapping migration: exact constraints, permissions, defensive RLS and immutable assignment. Do not provision in production or change existing learner data. Avoid Auth signup triggers that could block signups.
3. Staging adapter translating **only** unique-constraint code collisions and same-UUID conflicts to the domain result; unexpected SQL, unauthorized, timeout or lost-response cases must remain errors. Test collisions and two concurrent sessions with PostgreSQL, not just mocks.
4. Server-only **authenticated self** readback: verify current Supabase Auth user/session and runtime access before calling allocation; never trust UUIDs from the browser or JWT user metadata. Restrict visibility to that same learner. Fail readback closed, rate-limit issuance.
5. Account UI: show exact persisted code with Copy and “Not available” fallback. Owner exact-code search must remain a separately reviewed privilege; do not add open lookup or enumerate by partial prefix.
6. Before release: genuine identity-role/other-user/expired-session tests, independent security review, full Node/Chromium/WebKit CI, explicit staging acceptance, rollback plan and owner approval.

**Edge cases that must never claim success:** code candidate rejected by DB unique constraint, duplicate UUID request, lost write acknowledgment, duplicate account email, relinking a provider, deleted account, stale token, source table unavailable, collision retry limit, code displayed from local cache without server-confirmed persistence.

## Measurable value and non-goals

A learner code should reduce account-identification friction for support without changing study outcomes, mastery estimates, retention schedules, Note/Graph identities or exam mappings. Track `support identification time`, `incorrect-account lookup attempts` and `identity-related support errors`, not engagement. Do not force a learner to use the code to study; no real learner or credentials are touched here.

**Important:** Passing synthetic tests or green CI establishes only the offline algorithm and interface safety. It **does not** approve the DB schema, hosted Auth behavior, legal/clinical content or production publication. Keep this PR draft and stacked on PR #377 until the design is reviewed.
