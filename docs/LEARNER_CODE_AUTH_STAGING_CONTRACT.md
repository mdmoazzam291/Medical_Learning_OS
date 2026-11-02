# Learner identity — private mapping and self endpoint (PR #379)

**Status:** managed **staging schema applied**, API **deployed only to isolated staging v3**; production unchanged. See [staging schema receipt](releases/2026-11-02-learner-code-staging-schema.md). The exact production `learner_runtime_access_v1(uuid,uuid)` definition is now restored **to staging only**, with equal installed-function digest and server-only privileges ([parity receipt](releases/2026-11-02-learner-runtime-session-parity.md)); genuine signed-in Edge acceptance is **still unverified**; nine hosted negative checks passed ([staging API receipt](releases/2026-11-02-learner-identity-staging-api.md)). This is stacked on the Learner Code proposal (#377) and offline algorithm (#378); it does not require or affect Core6 medical content rights.

## Source implementation

| Component | Responsibility |
| --- | --- |
| `supabase/migrations/20261102084000_learner_reference_codes.sql` | New additive `public.learner_reference_codes` table with `auth_user_id` referencing `auth.users.id`, canonical format constraint, DB primary-key uniqueness, unique code, Auth-delete cascade, explicit service-only SELECT/INSERT and enabled RLS with no browser policies |
| `supabase/functions/learner-identity-api/index.ts` | **GET /me** returns only current signed-in learner's persisted code or null; **POST /ensure** allocates only after verified Auth user **and** existing runtime session/access check; no caller-specified target, search or listing |
| `ops/prototypes/learner-identity/learner-code.js` | Existing 80-bit cryptographic format validation and server-only idempotent allocation contract; retries code collisions with readback |
| `scripts/learner-reference-code-db-check.js` | Real disposable PGlite tests for constraints, two learner IDs, ACL denial, no browser RLS policy, service-only INSERT/SELECT, FK, and deletion cascade; intentionally independent of hosted learner data |
| `tests/learner-code-auth-boundary.test.js` | API source-boundary regression for runtime Auth checks, self-only route, never-public asset and role restrictions |

### Caller behavior

1. Learner signs in with existing Google/password identity. The JWT is verified using `auth.getUser(token)`. Existing runtime check verifies `session_id`, account access and suspension.
2. **GET** `/functions/v1/learner-identity-api/me` returns `{contractId:"learner-identity-self-v1",status:"not_assigned",learnerCode:null}` if no server-issued code exists; does **not** create one.
3. **POST** `/functions/v1/learner-identity-api/ensure` with no body generates an immutable code only if valid identity and runtime access. The storage layer enforces user primary key and code unique constraint, rejects unexpected write errors, and re-reads the exact current learner UUID.
4. Same account + multiple sign-in methods/devices always resolves to the same persisted Auth UUID and code. **Not an account-recovery credential**: no entitlement, verified-human status, doctor status or support authority follows from knowing the code.
5. No code query parameters, POST identities, public user enumeration or email lookup. A missing/failed mapping does not block Study, Auth, NeuralVault, Exam, Study Now or personalization.

### Security boundaries

- The table is in the public schema **for compatibility with existing service role Data API**, but is **private by grants and RLS**, not a public profile. Explicit revocation removes Supabase historical public automatic grants. No `anon`/`authenticated` table privileges and no policies; service role gets only SELECT and INSERT.
- The service key is only read inside the Edge runtime. Do not expose the function directly from a client proxy that can choose an arbitrary learner UUID. The real session ID must be present and valid.
- Never put codes in public URLs, search indexes, public learner graphs, event logging, PostHog/Sentry metadata or exam leaderboards. A signed-in learner sees only their own.
- The SQL does not include a signup trigger, force a learner-data backfill, change `auth.users`, or alter any learner FK. Existing accounts can enroll lazily. Service roles cannot UPDATE/DELETE or rotate codes.
- Auth account deletion cascades the mapping; **permanent no-reuse after deletion is not yet guaranteed**. If the owner requires absolute never-reassign, implement a privacy-reviewed minimal tombstone/taken-code registry before release. Current code collisions are extremely unlikely but the design must not misstate this distinction.

### Remaining staging verification (managed schema migration is recorded; hosted Auth acceptance pending)

- The managed staging ledger now records **`20261102033205 learner_reference_codes`** for the source file `20261102084000_learner_reference_codes.sql`. Preserve the exact provider/source association during later integration; do not rewrite applied history.
- Obtain independent role/security review of public-schema service-only privileges, root-key exposure, rollback, audit and retention policy; release only into isolated staging first.
- The staging schema/grant/RLS readback already passed (see receipt). Still required: controlled live two-client uniqueness/collision tests and actual bearer-token denied-access checks.
- The required session RPC was restored verbatim from the production contract **in staging**. The API is now deployed **to staging only** as v3 with exact dependency readback and nine hosted negative checks. Genuine managed JWT/session verification remains required. Real self-only, other-learner, revoked-session, suspended-account, no-signin and bad-origin probes require controlled synthetic accounts and proper cleanup.
- Review Edge logs for accidental codes/secrets; run staged reload/recovery tests; record hosted acceptance receipt and backout procedure. Nothing is approved or deployed by this document.
- Only after staging and explicit release approval, implement copyable Account → Learner ID UX. Do not imply a code exists before actual server readback.

## Rollback / operational safety

This PR is an **additive source change** and the separate **staging schema migration was applied** via the managed Supabase tool. GitHub CI itself does not write hosted data. The Edge API is deployed only to isolated staging v3 with negative HTTP checks; no actual code assignment has occurred. If a later staging API deployment fails, disable the endpoint without deleting mapping/history. For database schema rollback, first export/migrate all issued mappings and obtain privacy/owner approval; automatic dropping would lose identity references. Production data and current canonical UUIDs remain untouched.

## 2 November continuation audit: delivery freshness and native proof

The handler now repeats the current runtime session check after GET readback or POST persisted allocation, immediately before returning a code/status. A session revoked during I/O receives a denied response; a mapping already committed is retained for same-account reconciliation. A final-check dependency outage returns503 without a code. These checks reduce the exposure window; they do not make provider Auth and SQL writes atomic or invalidate a response already delivered.

New behavioral tests execute the actual TypeScript handler and runtime helper using isolated trusted Auth/storage callbacks. They prove route/body/origin/session failure handling, verified self-only IDs, corrupted cross-user readback rejection, uncertain-write sanitization and post-I/O denial. They are not genuine hosted JWT/SDK acceptance.

A separate native PostgreSQL17.6/18.6 CI fixture uses independent service-role login connections, actual unique-index waits/blocking PIDs and the source migration. It tests same-user convergence, different-user code collision retry, rollback and committed lost-response reconciliation; a removed-UUID-uniqueness negative control must fail the barrier and clean up. This is major-version fixture evidence, not managed staging17.11 acceptance. No signup, real code issuance, provider Auth update or deployment occurs in this audit.

The 2 November hosted runtime required a bounded empty-body stream guard for POST/ensure; accepting only req.body===null rejects valid bodyless HTTP POSTs on this runtime. No content-type or payload is accepted; a first read must immediately prove stream completion or fail within2seconds. Real negative ensure now reaches token verification and denies401. See the staging API receipt; positive Auth acceptance remains open.

Current stagingv3 pins top-level SDK2.118.0 to the reviewed operator manifest/lock, with exact3file readback/nine hosted negatives/zero rows. This is not full transitive Node/Edge parity or genuine signed-in acceptance. See [pin receipt](releases/2026-11-02-learner-identity-sdk-pin.md); v2 receipt is historical.
