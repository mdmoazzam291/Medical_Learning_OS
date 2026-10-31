## 2026-10-31 — MLOS-owned private authority epoch/lease gate: native prototype PASS

- [Foundation run 41198683455](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41198683455): real disposable PostgreSQL **17.6 and 18.6 jobs passed** the separate `evidence_private` schema and network-verifier-adapter experiment. It uses zero managed Auth tables; separate no-login owner, narrowly executable gateway and controller fixture roles, and exact `stage`/`deliver` functions. All roles remain disposable local trust accounts, not hosted or deployable credentials.
- Evidence: positive provider-verification callback is required before and after each SQL action; offline/rejected tokens fail closed. Controller revocation increments a MLOS epoch; old receipts remain unavailable after reactivation; expired leases deny; replayed requests are idempotent/conflict-bound; writer-first/evidence-first row locks serialize changes; rollback leaves no unexpected delivery; native temporary clusters are destroyed.
- **Limits:** mocked provider verdicts do **not** prove real GoTrue revocation freshness. The SQL `delivered_at` is an experimental attempted-delivery marker, not actual payload distribution, and a postcommit provider rejection can leave it set. External provider decisions and internal DB transaction remain non-atomic. No TLS/private runtime connector, provider feed, production migration, source rights or learner activation.
- Decision: prototype only, gateway OFF, PR #346 DRAFT. Detailed report: `docs/evidence/2026-10-31-private-authority-epoch-lease-prototype.md`. Next priority: delivery-intent acknowledgement/reconciliation under uncertain commit and provider change.

## 2026-10-31 — Real disposable GoTrue session-writer race: sign-out blocked, refresh unblocked

- [Foundation run #41197278066](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41197278066), `auth-local-gotrue` job PASS. Real local GoTrue sign-out **waited** on `auth.sessions` `FOR SHARE` and then removed the test session row; refresh of an independently generated active test session **did not wait**, completed, and preserved its row.
- This is a **negative boundary finding**, not a global security incident: one tested refresh operation did not serialize on the locked session row. No general provider-lifecycle atomicity can be claimed. Observer uses a disposable PostgreSQL administrator to lock only test session IDs; no managed Auth ACL, table, role, trigger or data changed by test SQL.
- Previously proven live-local privileges still block a supported narrow app login. Therefore **do not enable or deploy evidence gateway**; no bypass via `service_role`, privileged owner or installed Auth policies. Detailed reproducible evidence: `docs/evidence/2026-10-31-local-gotrue-session-writer-races.md`.
- Next design slice: private owned authority / invalidation freshness gate without managed-Auth writes, with explicit failure semantics, followed by disposable race/receipt reconciliation tests. No hosted provider/user change, clinical, rights or learner release approval.

## 2026-10-31 — Real local GoTrue Auth table privilege feasibility: BLOCKED

- [Foundation #41196030994](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41196030994) `auth-local-gotrue` **PASS**: catalog-only privilege matrix confirmed `anon`, `authenticated`, and `service_role` each have `auth` schema USAGE but **no direct SELECT or id UPDATE** on `auth.users` or `auth.sessions`; they cannot be assumed to provide the proposed `FOR SHARE` row-lock boundary. The provider-owned `supabase_auth_admin` does have those privileges but is not a valid restricted app login.
- This is a disposable local GoTrue observation only. The test did not query/lock Auth rows, modify any provider managed tables, create roles/grants/policies, or touch hosted accounts/data.
- **Decision:** as-is narrow Auth-row locking is **blocked**. No service-role or owner credential fallback; investigate supported provider Auth ACL guarantees, else design a private authority with explicit revocation-freshness requirements. Neither is deployment-approved. Details: `docs/evidence/2026-10-31-local-gotrue-auth-privilege-feasibility.md`. Draft PR #346, gateway OFF.



## 2026-10-31 — Real local GoTrue Auth catalog compatibility PASS

- [Foundation run 41194293134](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41194293134) passed the disposable provider Auth test **and** a separately connected read-only PostgreSQL system-catalog probe. Local PostgreSQL major 17; `auth.users`/`auth.sessions` owned by `supabase_auth_admin`, RLS enabled and zero user-added policies/triggers; `not_after` present, `service_role` bypasses RLS, proposed narrow roles absent.
- Fixed loopback-only database target validation, fixed catalog SQL, read-only transaction and cleanup. Negative tests deny production host/port, malformed target, incorrect owner/column, dangerous preexisting gateway role, unknown SQL and missing opt-in. Output has no credentials or Auth user/session rows.
- This does NOT demonstrate least-privilege grants to managed Auth tables, GoTrue writer locking, hosted provider acceptance, TLS/secret rotation or publishing rights. PR #346 remains draft/unmerged, gateway disabled.
- Details: `docs/evidence/2026-10-31-local-gotrue-auth-catalog-compatibility.md`.
## 2026-10-31 — Real disposable GoTrue Auth acceptance PASS

- CI run [41192900215](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41192900215): **actual local GoTrue `auth-local-gotrue` job PASS**, using migration-free GitHub Actions Docker stack, pinned Supabase CLI and SDK, generated test-only identities, and post-job `stop --no-backup` cleanup. No hosted Auth identities or provider settings accessed.
- Two independent sessions of the same user and another user isolated; refresh retained session ID; local and global signout rejected the appropriate refresh tokens, other account unaffected, tampered JWT rejected. Access JWTs were rejected after signout by the **local GoTrue** `/user` endpoint in this run; that observation is not a hosted or universal guarantee.
- Corrected SDK `AuthSessionMissingError` ambiguity by testing bounded, exact-host network `/auth/v1/user` responses separately for signed-out and tampered access tokens. Corrected wire parsing of `{code:403,error_code:"session_not_found"}` and added negative tests for ambiguous transport, unexpected values, malformed responses and inconsistent fields.
- Remaining **NOT VERIFIED**: actual hosted Supabase session lifecycle, MFA challenges, genuinely expired signed JWT, real managed-Auth row-lock privilege feasibility, hosted network-to-direct-PG credential assurance and production approval. Draft PR #346 unmerged, gateway default OFF, no medical/content rights, source-evidence publication, or learner activation. This is a local integration milestone, not deployment sign-off.

## 2026-10-31 — Auth probe trusted-client and cleanup hardening

- The earlier PR #346 CI run `41184092379` is **fully green** (core, Chromium, WebKit, PostgreSQL17.6/18.6), confirming the previous isolated acceptance-runner increment.
- Latest Auth-probe code now requires an exact SDK client `supabaseUrl` match to the previously validated sandbox URL before sign-in; every client factory receives this canonical URL. The probe refuses test clients mistakenly constructed with the live project host. The SDK factory is still trusted code; a spoofed client object is not a production security boundary.
- Refresh-token revocation proof now accepts only verified provider `AuthApiError` classifications with allowlisted codes/status, not client-generated errors. If a supposedly revoked refresh token succeeds, the newly authenticated disposable session receives a best-effort local logout before failure; cleanup cannot compensate for a defective provider.
- Added offline negative tests for wrong SDK host and misleading client-side Auth errors, and updated `docs/evidence/2026-10-31-auth-provider-nonproduction-acceptance.md`. Genuine sandbox provider operations, MFA, signed expired token and hosted DB Auth authority remain **unrun**.
- No live provider project/account, migration, role, HTTP route, source rights or learner release change; PR #346 remains draft/unmerged with gateway disabled. Latest-head CI must still pass after commits.

## 2026-10-31 — Provider Auth nonproduction acceptance runner prepared (not executed live)

- Verified previous exact-head Foundation run `41182662804` fully green (check, native PG17/18, Chromium and WebKit). Disposable retained-session expiry proof remains separate from genuine managed provider semantics.
- Read-only branch inventory of active MLOS project: zero development branches. **No hosted branch/project/account created**; no Auth secrets/credentials or production operations changed.
- Added a manual opt-in real-provider acceptance protocol: `scripts/lib/source-evidence-auth-provider-probe.js`, CLI `scripts/source-evidence-auth-nonprod-check.mjs`, and synthetic negative tests `tests/source-evidence-auth-provider-probe.test.js`. Config refuses known production/legacy project references, non-HTTPS/nonmatching endpoint, missing opt-in, and accounts not tagged `+mlos-probe-`. Requires a separately installed/private SDK and publishable key only, not broad service role. No live test executes in CI.
- The protocol checks network-verified identities, two simultaneous sessions on one account plus other-user isolation, refresh-session ID continuity, local/global logout refresh-token denial, and JWT payload tampering. Records whether old access JWT remains accepted rather than claiming immediate invalidation. Report excludes identities, tokens, passwords. **MFA, genuinely expired signed tokens, server-side session authority and managed transaction race remain untested.**
- `docs/evidence/2026-10-31-auth-provider-nonproduction-acceptance.md` records operator procedure, isolation and all remaining provider/credential/clinical/rights release gates. CI for this increment must be checked separately. PR #346 draft/unmerged/default-off; no learner activation.

## 2026-10-31 — Retained expired Auth session guard (disposable only)

- Identified a gap in existing `public.learner_runtime_access_v1` (migration `20261003153000_owner_operations_v3.sql`): the function's `session_active` field means row existence, not proof that provider-managed session lifetime/expiry is valid. Managed `auth.sessions` has a `not_after` column; it may retain expired sessions, and Auth access JWTs can survive sign-out until their own expiration.
- Hardened **only** `ops/prototypes/source-evidence/authority-row-locks.sql`: disposable `not_after` field and `FOR SHARE` guarded `clock_timestamp()` deadline check; expired retained rows must deny owner-only evidence operations even when the network verifier still returns a user identity. No real Auth schema/RLS/credentials/API/runtime migration modified.
- Added PGlite probe denial/acceptance for past/future/null deadlines; native PG17.6/PG18.6 now exercise sixth authority mutation (expiry) in both writer/evidence-first directions, plus stage/readback denial on a retained expired row and end-to-end synthetic `getUser` still accepting a JWT while SQL denies staging with no new request. Verify exact-head workflow before claiming passed.
- **Not a provider signout/refresh/MFA acceptance:** nullable deadline, time-box/inactivity semantics and safe provider-supported read/lock privilege still need nonproduction genuine Auth verification. Existing live `learner_runtime_access_v1` is unchanged, production stays default-off and PR #346 remains draft. Detailed limitations in `docs/SOURCE_EVIDENCE_GATEWAY_DEPLOYMENT_GATES.md`.

## 2026-10-31 — Private Auth token and direct-login adapters implemented (offline only)

- Added `scripts/lib/source-evidence-private-boundary.js` for provider `getUser(token)` response-only verified UUID extraction, and direct `evidence_gateway` SQL query closure. The latter permits exactly two private functions, creates/ends fresh client connections, verifies actual login/current role and forbids broad RLS-bypass/superuser clients or arbitrary SQL.
- Added `tests/source-evidence-private-boundary.test.js` coverage for response errors and malformed IDs, exact forwarded tokens, private role/downgrade denial, argument/SQL rejection, paired Auth/delegation/SQL path, post-commit revoked identity withholding. These use **synthetic network verification** only.
- Added real native disposable `pg` driver use of the two statements and broad-login denial to existing PostgreSQL **17.6** and **18.6** concurrent authorization suites. Implementation head `f5365dbf1671089845f9f131e6ae6e3f85c37ba2`; [Foundation run 41181858402](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41181858402) verified native17, native18 and check SUCCESS at inspected point; browser/WebKit still running.
- Deployment remains blocked for real managed Auth state transitions, genuine token/expiry/MFA/refresh behavior, provisioned narrow private credentials, TLS/autocommit/restore and independent source/rights review. No live login, hosted schema/API change, credential, rights or learner action. See `docs/SOURCE_EVIDENCE_GATEWAY_DEPLOYMENT_GATES.md`.
- Next: design a provider-supported nonproduction genuine-session acceptance protocol and document precise minimal-privilege credential provisioning/rotation before any hosted integration; existing reviewer/source gates unchanged.

## 2026-10-31 — PostgreSQL 17.6 disposable row-lock proof complete

- PR #346 now runs both native PG18.6 legacy conformance and a separately installed exact PostgreSQL **17.6** `evidence-native-postgres17` job (package 17.6.0-beta.15); the actual server version is asserted inside the original concurrency harness before fixture setup. No changes to production PostgreSQL or Auth.
- Exact implementation head `7034fe5def1fbc85694860e46c882499b491cac7`; Foundation run `41181017264`, PG17 job `124478302267` **SUCCESS**. Native logs: 10 plain-writer/reader order cases, transaction rollback/no-orphan/retry, other-user independence, expected `40P01` deadlock victim rollback/retry, and correct unsafe-key-share rejection/cleanup.
- Engine-version compatibility completed, **provider Auth semantics still blocked**: live GoTrue role ownership, cleanup, refresh, MFA, token revocation, cascade, managed ACLs and a real restricted gateway remain unverified. Never transplant disposable policies to `auth`. See `docs/evidence/2026-10-31-hosted-auth-readonly-compatibility.md`.
- Remaining Foundation jobs and documentation-head exact CI must be inspected separately before any engineering release. Draft stacked PRs unmerged; no hosted secrets, routes, SQL changes, NMC approvals, source bytes, or learner publication.

## 2026-10-31 — Live Supabase Auth schema compatibility: read-only audit, hosted gate blocked

- Checked active Medical Learning OS Supabase **read-only metadata only**: project healthy, PostgreSQL 17.6 vs disposable native Postgres 18.6; `auth.users`/`auth.sessions` owned by `supabase_auth_admin`, RLS on, zero policies; session→user hard-delete cascade; Admin→user delete restriction. Actual session has `not_after`, `refreshed_at`, `aal` fields with provider-specific semantics. No Auth rows/user identities or tokens fetched.
- Live `service_role` is broad with BYPASSRLS; `evidence_gateway`/`evidence_executor`/`evidence_authority_locker` not provisioned. Supabase's documented session expiry cleanup means row presence alone is not active-session authority. Security advisor no-policy informational notices must not be automatically "repaired" by adding exposed access.
- New `docs/evidence/2026-10-31-hosted-auth-readonly-compatibility.md` records exact catalog evidence, read-only rerun queries, release blockers and safer verification path; `docs/SOURCE_EVIDENCE_GATEWAY_DEPLOYMENT_GATES.md` reconciled. PR #346 remains stacked/DRAFT, no deployment; do not install synthetic Auth policies/role privileges or broad service-role fallback.
- **Next priority:** PostgreSQL 17-specific disposable protocol proof and an independently reviewed provider-supported Auth/credential approach, followed by nonproduction authentic-token/session/race acceptance. Real hosted token verifier, owner-only credential, rights/reviewer, HTTP, restore and source verification remain blocked. No production SQL mutations, API/Edge/Auth changes, learner content or exams affected.

## 2026-10-31 — Authority row-lock investigation checkpoint, native CI pending

- Owner Codex /root; checked31October2026 IST. Draft PR346/feature feat/nmc-complete-competency-audit-20261030; resumed023d0307c8aaceab39d64a0735123996e17be513 in isolated mlos-evidence-row-locks. Main91a11aff41048984b039fd269a2a0a9ddc3d99da unchanged. One writer; no production scope.
- Added separate disposable authority-row-locks overlay: exact account→session→Admin→feature FOR SHARE before existing evidence metadata advisory lock; unchanged runtime/Admin checks. READ COMMITTED only; missing rows deny. No synthetic authority mutation triggers installed in this fixture.
- Dedicated non-login/non-bypass locker owns one private empty-path lock-only definer; executor invokes, gateway cannot call/assume/read Auth. Minimal SELECT/UPDATE-column grants plus RLS UPDATE USING(true) WITH CHECK(false) permit locks but prohibit actual writes. Initial positive placeholder failed; further positive exposed required UPDATE-policy visibility; final PGlite0.5.13 behavior/ACL/catalog/write-denial/isolation checksPASS.
- Native independent-login test written for five plain mutation types in both commit orders, row/transaction blocking PID chains, no writer advisory locks/triggers, rollback/no-orphan reconciliation, unrelated-user independence, inverse writer lock-order40P01 atomicity/retry. --key-share weaker-lock negative control must fail barrier+cleanup. Local native execution remains blocked by UID0-only namespace; no native result claimed until CI.
- Full npm test1,633PASS/0FAIL; npm run checkPASS13services/252couplings; syntax/diffPASS. Fresh read-only review found no blocker; native proof pending. No dependency/provider marker change. CI configured to run local overlay proof/native positive/weaker-lock negative control.
- Minimal authority fields are not provider Auth expiry/refresh/MFA/cleanup/cascade acceptance; account hard deletion is restricted by Admin FK, soft-deletion flag is not cascade proof. No deadlock-free claim. No hosted migration/role/trigger/route/credential/source bytes/rights/reviewer/clinical/exam/learner release. Next inspect exact native CI, fix any failures, record evidence and retain hosted gates. Ownership retained while pending.

## 2026-10-31 — Offline owner delegation verified, hosted connector remains gated

- Checked31October2026 12:36IST; owner Codex /root; draft PR346/feature feat/nmc-complete-competency-audit-20261030. Implementation50884283d891d97593d63b85b0d784f8a4c794b7 exact9source/config readbacks verified. This followup is documentation only; no runtime wiring.
- Foundation run41179228740, evidence-native-postgres job124473017762 SUCCESS; exact logs inspected. Four delegation SQL groups PASS: feature/default-off and original stage/readback/retry receipt, foreign/unverified denial; corrupt readback withholding and lost-delivery reconciliation; unavailable postcommit readback uncertain then reconciliation; revoked session denies after commit and fresh same-owner session reconciles original audit. Prior narrow capability, real-login native races, omitted-trigger/lock negative controls, snapshot/ACL and immediate/WAL recovery also PASS with cleanup.
- Local8focused testsPASS; full npm test1,633PASS/0FAIL; npm run check13services/252locationsPASS; syntax/diffPASS. Rejecting placeholder positive/status failures observed before implementation. Fresh read-only review found no blocker; its unavailable-readback coverage suggestion was implemented and passes.
- Core/browser/WebKit CI still in progress at recording; no complete Foundation or final-documentation-head CI claim. No frontend or product runtime file changed.
- Trusted verifier/query and stolen gateway credential remain capable of impersonation; synthetic verifier map does not implement real token signature/expiry/issuer/MFA. Dedicated direct-login credential routing, authenticated connector transport and query autocommit/commit-ack semantics remain gates; SQL status inside an open outer transaction is insufficient. Existing broad service_role unchanged. No production route/migration/Auth trigger/credential/source bytes/rights/reviewer/clinical/exam/learner release.
- Next bounded task: representative row-lock authorization protocol that does not require global triggers on provider Auth; prove plain session/account/Admin/feature writer ordering and rollback/deadlock behavior before proposing any hosted connector. Restore must separately reconcile Auth/Admin/feature/roles. Ownership released at saved evidence checkpoint.

## 2026-10-31 — Offline verified owner delegation checkpoint

- Owner Codex /root; checked31October2026 IST. Resumed draft PR346, feature feat/nmc-complete-competency-audit-20261030 from05ab3be211af36d5caef49176e620efc4838aece in isolated mlos-evidence-delegation; main91a11aff41048984b039fd269a2a0a9ddc3d99da. One writer; no production changes.
- Added test-only private verifier-to-gateway closure: exact token/candidate or token/target inputs, no caller actor/session/verified overrides; snapshots before awaits; verified ID/session bound locally; fixed gated SQL only; reverify after commit and independently rehash canonical package/manifest/request/original receipt before accepted/available. Unknown delivery returns uncertain without receipt; errors sanitized.
- Rejecting placeholder positive/status tests observed RED, then8focusedPASS. Actual PGlite0.5.13 gateway-role integration PASS for default-off, original receipt retry, foreign/unverified denial, corrupted readback, lost delivery and unavailable postcommit readback reconciliation, revoked-session denial/new same-owner session original audit. Verifier is a synthetic exact-token map: no actual JWT signature/expiry/provider Auth test claimed.
- Full npm test1,633PASS/0FAIL; npm run checkPASS13services/252couplings; final script syntax/diffPASS. Read-only review found no blocker; missing postcommit unavailable-readback integration case added and passed. CI step added; native/core exact checkpoint CI pending.
- Deployment-gates design preserves existing authentic getUser ordering, describes dedicated direct-login credential isolation and representative provider row-lock investigation; no real credential, HTTP handler, migration/Auth trigger, source rights/reviewer/clinical/exam/learner approval. Existing broad service_role, trusted verifier/query and stolen gateway credential can still impersonate; production routing/provider Auth mutation/restore/HTTP controls unresolved.
- Next: inspect checkpoint CI and record evidence; then test representative provider account/session/Admin/feature row-lock protocol without global Auth triggers, before any hosted implementation. No secrets or protected source bytes in git. Ownership retained until evidence checkpoint.

## 2026-10-31 — Narrow gateway and platform ordering verified

- Checked 2026-10-31 05:50 UTC; owner Codex /root; draft PR346, branch feat/nmc-complete-competency-audit-20261030. Tested implementation acbec7548b0a1f0dcc807d567d0a946ff4a25e5e, exact 10 implementation/config file readbacks verified after push. Base unchanged.
- Foundation run41174062255, evidence-native-postgres job124457846742 SUCCESS. Real evidence_gateway login rejects SET ROLE executor/service and SET SESSION AUTHORIZATION postgres; five native platform races PASS (plain session deletion, account suspension, feature disable, Admin transfer before retry/readback; stage before queued session revocation). Real independent PIDs/advisory waits observed; audit retained/later delivery denied. Omit-trigger negative control fails platform_advisory_barrier_not_observed and cleans up. Earlier native seven races, snapshot/ACL and immediate/WAL crash-recovery checks also PASS in same job.
- Local npm test1,625PASS/0FAIL; npm run checkPASS13services/252coupling locations; PGlite0.5.13 capability+previous platform checksPASS; deliberately postgres-owned bridge rejected by catalog negative control; whitespacePASS. Read-only reviewer found no gateway bypass; catalog assertions and idle-client error handling suggestions implemented before tested commit.
- This followup updates documentation/plan only. Core/browser/WebKit CI still in progress when recorded; neither full workflow nor this documentation head is claimed fully green.
- No hosted API/credential/Auth trigger/migration or learner release. Existing service_role remains broad; real verified-token delegation/production narrow-role routing, provider-specific Auth lock/latency/restore compatibility and independent reviewer governance remain gates. Global synthetic mutation triggers must not be transplanted into real Auth tables. Next: design least-privilege hosted gateway credential/delegation boundary and provider Auth ordering strategy before any hosted handler, preserving default-off behavior.

## 2026-10-31 — Narrow fixture gateway capability checkpoint

- Owner: Codex /root; draft PR346; branch feat/nmc-complete-competency-audit-20261030, parent cebd691f71b64dbc82dab240a3ac8107919da7dd. Checked 2026-10-31 UTC.
- Added dedicated non-inheriting gateway login with only stage/readback entry points; private non-login/non-bypass executor owns exactly two empty-search-path definer bridges with explicit table/RLS/helper allowlists. Raw service_role remains broad for earlier unrelated probes; actual production credential routing is unresolved.
- TDD invoker placeholder failed permission denied for platform_guard; bridge passes disposable PGlite0.5.13 staging, raw table/helper/governor/role switching denial, feature/session retry denial, catalog owner/definer/search-path/role/schema checks. Original embedded superuser session cannot prove login-level SET SESSION AUTHORIZATION denial; native script uses actual gateway logins.
- Added synthetic-only Auth/session/Admin/feature mutation triggers and native real-PID/pg_locks races (plain revocation/suspension/feature/Admin writes first; stage first), plus omit-trigger negative control. Native CI pending at this checkpoint; local UID0-only container cannot run initdb as mapped non-root user. No native result claimed yet.
- Reviewed shared SQL-definition fixture adds one Supabase coupling location:13services/252locations. No dependencies or hosted changes. Review added definer catalog assertions and idle-client error handling. Full npm test/check currently running; final evidence followup required.
- No production migration/API/Auth trigger, credential, source material, grant, clinical/rights/exam approval or learner release. Coarse synthetic Auth locks are not a production design. Next: inspect exact checkpoint native CI, fix any failures, finish existing checks and record evidence.

## Owner-only platform compatibility verified, hosted adapter remains proposal —31 October2026 IST
- Checked at 2026-10-31T05:35:24.158Z. Implementationce3c63f0bbee3d29627843d490d6dfad31b5e2d2; Foundation run41173028054/job124454806451 SUCCESS, exact logs inspected. Follow-up records results only.
- Completed concrete owner-only HTTP/RPC proposal plus disposable session-gated wrappers using exact repository runtime/Admin SQL definitions on synthetic Auth/session tables. Default-off wrapper capability; no hosted route or real platform mutation.
- Local/CI fixture PASS for valid owner, missing/foreign/revoked/new-session retry, suspension/deletion, missing runtime result, Admin change without package transfer, policy/withdrawal/postcommit off, and browser/backend feature-row ACL. Previous native races/WAL/recovery/negative controls also PASS.
- Review limitation explicit: trusted service_role retains raw low-level RPC/table privileges; wrapper gates are not an enforceable database-wide backend capability. Production privilege/delegation plan, real token/Auth behavior, exact source permission and real Auth-writer serialization still block exposure. Eight-table evidence snapshot excludes Auth/Admin/platform-feature state.
- Local npm test1,625PASS/0FAIL; npm run checkPASS13services/251coupling. One new script/Auth SQL dependency reviewed/registered with ownership/export/restore gaps; no new provider/app dependency. Foundation check job SUCCESS atce3c63f; browser/WebKit in progress when inspected. Later docs-head CI separate.
- Next: resolve concrete server capability/privilege boundary and prove current account/session/source-policy revocation ordering with disposable platform fixtures before any migration/owner-api handler. Source rights/genuine independent review still unresolved. No production migration, real sessions/grants/source bytes/clinical/exam/learner activation or deployment. Ownership released at checkpoint.

## Owner-only platform/session fixture — CI pending —31 October2026 IST
- Checked at 2026-10-31T05:32:38.898Z. Resumed draft PR3466d17b238a41fefdf8784fe6aa5e0460cf35e79c8; isolated mlos-evidence-platform-gate, one writer.
- Added owner-only adapter proposal (not route) and disposable platform-gate.sql/script. Loads exact existing repository runtime/Admin SQL definitions against synthetic Auth/session/Admin tables; wrapper feature defaults off. Positive placeholder failure observed before wrapper implementation.
- Local fixture PASS: valid owner, missing/foreign/revoked sessions, new same-owner session idempotency, suspension/deletion, NULL runtime result, current Admin transfer without package transfer, metadata/withdrawal/postcommit off and browser/backend ACL.
- Review boundary documented: service_role still has raw lower-level probe/table privileges, so wrapper feature-off is not a database-wide backend capability boundary. No hosted privilege readiness claimed; current real Auth writers do not share prototype lock and eight-table evidence snapshots omit Auth/Admin/feature data.
- Full npm test1,625PASS/0FAIL. Initial check flagged new script/Auth-SQL coupling; reviewed exactly one path, updated service ownership/export/restore gaps and explicit baseline, then npm run checkPASS13services/251coupling. No new provider/app dependency.
- Added isolated platform fixture CI step with temporary PGlite0.5.13 tooling. Next inspect exact-head job/core results, record evidence and leave production APIs disabled. No real sessions/rights/reviewer grants/source bytes/clinical/exam/learner activation or production changes. Ownership retained while CI pending.

## Immediate WAL recovery verified and session boundary audited —31 October2026 IST
- Checked at 2026-10-31T05:19:02.321Z. Implementationcf4c33deb2af91afeceba064168ffc916547aeff; Foundation run41171957291/job124451684840 evidence-native-postgres SUCCESS, exact logs inspected. This checkpoint records results only.
- Test-first RED verified at95b2378/run41171677157/job124450852230: missing restart hook assertion, cleanupPASS. Controlled pg_ctl immediate stop/same-directory restart implemented; native GREEN verifies distinct postmaster, interrupted/automatic recovery logs and fsync/synchronous_commit/full_page_writes on.
- Acknowledged committed8-table payload/receipts preserved; explicit open transaction package/cases/request/event absent after recovery. Simulated lost application delivery retries original receipt. Metadata withdrawal, source-policy and account denials persist. Native postcrash restore exact digest/receipt/denial/browser ACL and cleanup PASS. Original seven races and omitted-lock negative control also PASS.
- Audited actual repository owner-api getUser -> runtime session/account -> singleton Admin boundary. Four actual runtime helper tests confirm separately supplied actor/session binding, malformed claim denial and unavailable lookup denial. Package ownership/source rights/shared-writer current revocation and genuine independent reviewer authority are NOT supplied by singleton Admin/session checks; documented blockers, no live Auth claim or route wiring.
- Local npm test1,625PASS/0FAIL; npm run checkPASS13services/250coupling; static read-only review no blocker. Foundation check job also SUCCESS atcf4c33d; browser/WebKit in progress when inspected. Later documentation-head CI not claimed complete.
- Next: concrete owner-only evidence adapter proposal with exact package/source authority and disposable platform/session fixtures, keeping hosted exposure disabled until real authorization/rights acceptance. Process-crash/WAL replay is not physical power-loss/hardware durability certification. No production migration, real sessions/reviewer grants/source bytes/clinical/rights/exam/learner activation or deployment. Ownership released at saved checkpoint.

## Native immediate recovery implementation — CI pending —31 October2026 IST
- Checked at 2026-10-31T05:16:41.323Z. Test-first commit95b2378250bdc11bfa129aabc80137e787545787 observed expected RED in run41171677157/job124450852230: immediate restart hook required; cleanupPASS. One writer, mlos-evidence-crash-auth.
- Implemented pg_ctl immediate shutdown/same-directory restart, readiness/recovery logs and bounded controlled cleanup. Native test covers fsync/synchronous_commit/full_page_writes, committed/uncommitted state, original/lost-delivery receipt, account/policy/withdrawal denial and native postcrash restore/ACL. Native GREEN result pending.
- Audited existing owner-api/session/SQL Admin boundaries; added4 actual runtime-helper tests with synthetic RPC/tokens. Confirms separate verified actor/session binding and fail-closed lookup, not live Auth or exact package/reviewer authority. No API wiring.
- Static read-only review no blocker. Local npm test1,625PASS/0FAIL and npm run checkPASS13services/250coupling. Local native launch still blocked by UID0 namespace; isolated CI provides required execution.
- Next inspect native CI, fix any failure and persist exact result; no power-loss or production storage certification. No migration/real sessions/grants/source bytes/clinical/rights/exam/learner activation or production changes. Ownership retained pending CI.

## Native crash acceptance test-first checkpoint —31 October2026 IST
- Checked at 2026-10-31T05:12:33.777Z. Resumed PR346329887d25ca6988767397f51ed494664ee1b3705; one writer in mlos-evidence-crash-auth.
- Added native crash test for synchronous durability flags, acknowledged receipts, explicit uncommitted transaction, account/policy/withdrawal denial and postcrash restore. Native helper restart hook deliberately not implemented yet; CI must observe the missing-hook assertion before implementation.
- Isolated native CI step added, no hosted URL/credentials/app dependencies. Local syntax/check stage; native run requires non-root CI because local UID mapping only root.
- Next inspect expected CI failure, implement controlled pg_ctl immediate shutdown/restart (not power-loss certification), verify WAL replay and all postconditions, then finish current owner-api/session compatibility audit. Work in progress, no crash success claim.
- No hosted migration/API/source-byte/reviewer/clinical/rights/exam/learner release or production changes. Ownership retained during CI.

## Native PostgreSQL independent-connection acceptance verified —31 October 2026 IST
- Checked at 2026-10-31T05:05:34.059Z. Implementation commit37de68c9178ba9de1db4cfb51447e6c1d60cf90b on draft PR #346. Foundation run41171036865/job124448843962 evidence-native-postgres SUCCESS; exact job logs inspected. This follow-up records results only, without changing tested code/workflow.
- Actual PostgreSQL18.6 on non-root Ubuntu24.04 verified three distinct backend PIDs. Seven real lock/wait/commit schedules PASS: identical request convergence, conflicting payload, withdrawal first, stage first, authority denial, policy denial and rollback releasing waiter. pg_locks/pg_blocking_pids barriers required.
- Native8-table snapshot recovery PASS with exact payload digest/original receipt/withdrawal denial/browser ACL parity. Omitted advisory-lock fixture negative control failed specifically advisory_barrier_not_observed; normal and negative runs both confirmed clients/server/temp cluster cleanup.
- Local root-only namespace restriction remains factual, not a bypass: native startup requires mapped non-root identity. Isolated CI provided valid execution, no hosted database or credentials. No app dependency, OS user creation or workspace permission changes.
- Local npm test1,621PASS/0FAIL; npm run checkPASS(13services/250coupling); static read-only review no blocker. Foundation check job also SUCCESS at implementation37de68c; browser/WebKit still running when inspected. Later documentation-head CI not claimed verified.
- Next: current production authority/session compatibility and crash/restart durability acceptance before hosted adapter/API design. Real source rights/genuine independent reviewer remain unresolved. No production migration, source bytes/reviewer grants/clinical/rights/exam/learner activation or deployment. Ownership released at saved checkpoint.

## Native PostgreSQL race harness — CI execution pending —31 October 2026 IST
- Checked at 2026-10-31T05:03:11.660Z. Codex resumed draft PR #346 at 1cfbc87036d865b50eaf6eff05aae133f768dd0c; isolated mlos-evidence-postgres-races worktree, one writer.
- Added native private-cluster helper and independent-client tests for identical/conflicting retries, both withdrawal orderings, authority/policy waits, rollback waiter and native snapshot recovery/ACL parity. PID/pg_locks barriers required; omit-locks negative control must fail named barrier and clean up.
- Local actual binary PostgreSQL18.6 verified; installed only scratch tooling @embedded-postgres/linux-x6418.6.0-beta.19 and pg8.22.0, no app dependency. Native launch blocked by namespace UID0-only mapping: nobody chown EINVAL; user namespace denied. No root-check bypass or OS user creation attempted. Temp native copy removed.
- Static read-only review found no concrete blocker. Local npm test1,621PASS/0FAIL; npm run checkPASS(13 services/250 coupling locations); syntax/diff checksPASS. Native race/negative-control execution NOT verified yet.
- Added isolated evidence-native-postgres job to existing Foundation CI using non-root Ubuntu24.04, temporary tooling, no secrets/hosted URLs. This checkpoint triggers required runner verification; next inspect exact-head job logs and fix failures before native success claims.
- No production migration/API/source bytes/reviewer grants/clinical/rights/exam/learner activation or hosted DB changes. Existing production Auth/authority compatibility and crash-durability remain unverified. Ownership retained while CI pending.

## Batch: withdrawal, postcommit denial and disposable recovery —31 October 2026 IST
- Checked at 2026-10-30T23:27:05.473Z. Codex resumed draft PR #346 at 4c81e0fc1bd57fa48dca9f06eb6bde31d3fd5fca; main 91a11aff41048984b039fd269a2a0a9ddc3d99da. Isolated mlos-evidence-withdraw-restore worktree, one writer. Owner asked for multiple next tasks in one run.
- Completed three linked disposable slices: exact immutable metadata withdrawal (wrong owner/digest deny, retry/read deny, other version unaffected); account/policy/withdrawal changes after actual commit before protected readback (denied without receipt, committed audit retained); complete8-table consistent snapshots and fresh transactional restore without allow-seeding.
- Snapshot expected digest must be retained separately; checksum is not origin proof. Restore audits canonical/physical bindings, policy/authority history, request/event and withdrawal integrity without requiring current allow. Allowed/account-denied/policy-denied/withdrawn states round-trip to identical payload digests; original receipt/ACL/denied behavior preserved. Postrestore writes/identity continuation, corruption/omission, pinned removal of withdrawal, injected import rollback/all8tables, nonempty target refusal and source changes after capture tested.
- TDD missing withdrawal/snapshot behavior failed before implementation; reviewer reproduced orphan null-bound audit events. Negative restore regression RED then GREEN after non-null/positive/unique event constraints and every-event audit. One SQL ACL test initially ran under admin fixture role; corrected role setup and reran PASS, no permission defect.
- Final recovery script PASS; previous SQL conformance10 scenarios/3 broken controls/lifecycle PASS; extended SQL probe PASS. Full npm test1,621PASS/0FAIL; npm run checkPASS(13 services/250 coupling locations); git diff --checkPASS.
- Snapshot tests are synthetic/in-memory only, not production backup coverage. Expected digest cannot establish completeness if caller trusts attacker-selected history. Singleconnection shared-lock schedules do not prove real multi-connection/crash behavior; current external revocations after snapshot need reconciliation.
- Next: real PostgreSQL multi-connection transaction/withdrawal races and disposable recovery validation against current production authority/Auth boundaries before any hosted adapter/API proposal. Rights/genuine reviewer remain unresolved. No migration/app dependency/hosted data/source bytes/reviewer grants/clinical/rights/exam/learner activation or production changes. Hosted new-head CI unverified; ownership released at checkpoint.

## Disposable SQL staging transaction conformance —31 October 2026 IST
- Checked at 2026-10-30T23:10:02.304Z. Codex resumed draft PR #346 at 0a9fd7feb87fb89319ac1002ca6ab706200f9539; main 91a11aff41048984b039fd269a2a0a9ddc3d99da. Isolated mlos-evidence-sql-conformance worktree, one writer.
- Added test-only SQL driver and standalone scripts/source-evidence-sql-conformance.js. Fresh PGlite0.5.13 per scenario; actual SQL stage/readback, independent JS hash/receipt checks, inspect queries committed rows without a mirror.
- Existing10 scenarios PASS against SQL: retry, request/revision conflicts, precommit rollback, lost acknowledgement, unavailable/tampered readback, overlapping identical/conflicting calls and authority recheck.3 broken-driver controls rejected false acceptance/inconsistent inspected claims.
- TDD rejecting driver positive path RED. Read-only reviewer found close could finish before async hashing joined queue; lifecycle regression RED then GREEN after entire preparation/SQL/readback was queued. Concurrent close RED then GREEN via shared completion promise; new staging after close rejects. Final SQL conformance/lifecycle PASS and previous standalone SQL probe PASS.
- Final clean npm test1,621PASS/0FAIL; npm run checkPASS(13 services/250 coupling locations); git diff --checkPASS. Driver uses one embedded connection/promise queue; simulated postcommit delivery faults and ephemeral tampered readback are not actual network/crash or independent-connection acceptance.
- Next: metadata withdrawal and postcommit current-access denial acceptance, then consistent disposable export/restore and true multi-connection checks before any hosted adapter/API. No migration/dependency/hosted Auth or production authority integration, source bytes/reviewer grants, clinical/rights/exam/learner activation or production changes. Hosted new-head CI unverified; ownership released at checkpoint.

## Restricted-domain SQL evidence digest derivation —31 October 2026 IST
- Checked at 2026-10-30T22:55:03.907Z. Codex resumed draft PR #346 at e45473ca253ad72bcf26c66ea6f17b4cfb16d16d; main 91a11aff41048984b039fd269a2a0a9ddc3d99da. Isolated mlos-evidence-db-digests worktree, one writer.
- Added disposable digests.sql: ASCII printable keys/strings and integer0..1e9 canonical subset, independent appearance/case/manifest/profile/claims/request/receipt hash derivation and canonical-byte comparison. Not a general Unicode/floating-point RFC8785 serializer. Existing domain/JS validation remains mandatory.
- Normalized stored case order so reversed-array exact retry preserves original receipt. Readback recomputes stored digests and binds actual package/revision/request keys plus per-case projections.
- TDD forged well-shaped claim accepted before derivation RED, rejected GREEN. Author-found case-projection gap RED/GREEN. Reviewer found stored receipt-flag/contract and physical package-binding holes; regression assertions added and shared validation/readback/exact-retry checks fixed in one pass.
- Disposable PGlite0.5.13 script PASS:12 JS oracle packages across relations/rotations/null/limits, helper serializer/boundaries, forged claim/manifest/fingerprint, noncanonical bytes, corrupt stored receipts/projections and wrong physical revision key. Final npm test1,621PASS/0FAIL; npm run checkPASS(13 services/250 coupling locations); git diff --checkPASS.
- Next: implement disposable SQL driver for existing transaction conformance harness, including lost acknowledgement/unavailable readback and exact retry/current denial mapping. General serializer certification, hosted Auth/production authority integration, multi-connection/crash durability and export/restore remain unverified. No migration/API/reviewer grant/source bytes/clinical/rights/exam/learner activation or production changes. Hosted new-head CI unverified; ownership released at checkpoint.

## Disposable SQL validation and immutable authority history —31 October 2026 IST
- Checked at 2026-10-30T22:47:22.907Z. Codex resumed draft PR #346 at 07713bdd15574cd100e1ca3a66830dc7d35b1d63; main 91a11aff41048984b039fd269a2a0a9ddc3d99da. Isolated mlos-evidence-db-parity worktree, one writer.
- Prototype now validates exact package/case/appearance/interpretation and receipt/binding shapes, scalar limits and canonical UTC date form; receipt negative tests recompute hashes so schema gaps cannot hide behind checksum failure. Added immutable package owner/lexical ID and append-only authority/source policy versions.
- Private administrative fixture writers share staging/readback lock; latest history governs access, no historical-allow bypass. Backend/browser cannot mutate history or invoke authority writers. No production authority integration inferred.
- TDD rehashed malformed receipt acceptance observed RED, fixed GREEN; history writer missing-function RED then GREEN. Disposable PGlite0.5.13 script PASS for schema/date/history/latest-deny/package alias/ACL and prior rollback checks. Full npm test1,621PASS/0FAIL; npm run checkPASS(13 services/250 coupling locations); git diff --checkPASS.
- Fresh read-only review found no concrete SQL blocker within reduced prototype scope; corrected stale README statements. No hosted Auth, multi-connection/crash durability, real rights or restore acceptance.
- Next: SQL/domain canonical digest derivation parity (JCS/case/appearance/manifest/request), then disposable real transaction-driver conformance. Existing JS canonical validation remains mandatory; this is schema validation progress, not full SQL digest parity. No migration/API/reviewer grant/source-byte/clinical/rights/exam/learner activation or production changes. Hosted new-head CI unverified; ownership released at checkpoint.

## Disposable owner-only evidence SQL prototype —31 October 2026 IST
- Checked at 2026-10-30T22:41:50.338Z. Codex resumed draft PR #346 at 2d19d3a489835a8e12d30a2ca9d56fa3378ea425; main 91a11aff41048984b039fd269a2a0a9ddc3d99da. Isolated mlos-evidence-db-prototype worktree, one writer.
- Added ops/prototypes/source-evidence/schema.sql (NOT migration), standalone scripts/source-evidence-db-check.js and README/plan. Uses fresh disposable PGlite0.5.13 installed only in external scratch tooling; no app dependency or hosted URL.
- SQL prototype stores canonical revision/manifest bytes, case projections, request receipts/events; server-only invoker functions and exact owner readback. Returns committed, not accepted. Existing JS JCS validation/digest recomputation remains mandatory.
- TDD placeholder positive commit failed. Disposable checks PASS: canonical readback/mixed-source resolution, exact retry/conflicts/history, byte and approval tamper, four write-boundary rollbacks, anon/authenticated ACL denial, two enabled owner isolation, source-policy/authority denial. Reviewer identified missing enabled-second-owner coverage; added and reran PASS. No remaining concrete blocker within documented reduced scope.
- Full npm test1,621PASS/0FAIL; npm run checkPASS(13 services/250 coupling locations); final script syntax/diff checksPASS. No real adapter conformance, hosted Auth/RLS, multi-connection/crash durability or export/restore claim.
- Next: tighten disposable SQL/domain envelope parity and immutable package/authority lifecycle, then actual disposable transaction driver conformance. SQL does not independently validate every domain schema/JCS/case derivation; fixture authority/policies mutate sequentially without shared serialized writer protocol. No migrations/API/reviewer grants/source bytes or production writes. Rights/genuine reviewer unresolved; hosted new-head CI unverified; ownership released at checkpoint.

## Private evidence database/authorization design —31 October 2026 IST
- Checked at 2026-10-30T22:35:48.706Z. Codex resumed draft PR #346 at 767f9bfe08e1411a2c384aed77ccdf259ec7782c; main 91a11aff41048984b039fd269a2a0a9ddc3d99da. Isolated mlos-evidence-schema-design worktree, one writer.
- Added SOURCE_EVIDENCE_DATABASE_DESIGN.md specifying immutable canonical bytes/revisions/cases/request receipts, append-only policy/grant/access history, exact composite bindings and lexical UUID handling; JSONB projections cannot replace JCS digest bytes.
- Reuses existing server-only SECURITY INVOKER pattern, explicit ACL/RLS, verified actor delegation and deny-by-default authority. First adapter owner-only; full package operations check rights for every source. No automatic baseline-grant reuse or publication authority.
- Serializing all relevant authority writers and protected operations is an explicit unimplemented requirement. Separate postcommit readback and current-access check precede accepted staging; unknown commit outcomes reconcile with same request.
- Design-only: git diff --check PASS; source/docs inspection and fresh read-only design review found no blocker for disposable prototype. No runtime tests rerun; prior1,621 result belongs to767f9bf. Official security/functions docs and HTML changelog consulted; no live project/version/config verified.
- Next: disposable-only schema/RPC prototype and database checks for owner staging/exact readback, then actual driver conformance and authority/restore acceptance before API wiring. No SQL migration/schema write, grants, source upload, medical/rights/exam approval, learner activation, merge or production deployment. Hosted new-head CI unverified; ownership released at checkpoint.

## Offline exact package/case/source resolution —31 October 2026 IST
- Checked at 2026-10-30T22:25:47.426Z. Codex resumed draft PR #346 at 089986085057d77704d36dd0f586f7f67b1dad1c; main 91a11aff41048984b039fd269a2a0a9ddc3d99da. Isolated mlos-exact-resolution worktree, one writer.
- Added resolveSourceEvidenceCase: all exact package/case versions and digests required, full package rehash, selected case source hash/edition derivation, scalar frozen source-only result with bytesVerified:false and learnerRelease:false. No latest fallback or source override.
- Extracted existing synchronous strict captureSourceRowPackage for reuse; digest domains/inputs unchanged. Original malformed arrays/descriptors rejected before cloning; both resolver inputs captured before await.
- TDD rejecting placeholder failed positive paths; final focused14PASS (six resolver/eight prior digest groups). Full npm test1,621PASS/0FAIL; npm run checkPASS(13 services/250 coupling locations); git diff --checkPASS. Fresh read-only review found no concrete defect.
- Offline self-consistent metadata may resolve without trusted origin/current access. No source-byte verification, rights/grants, storage, schema or API enforcement. Hosted new-head CI unverified.
- Next: persistence schema/authorization design and disposable transaction adapter conformance, including exact revision/source retrieval, real cross-account denial, withdrawal and recovery. Genuine reviewer/source rights remain unresolved. No source upload, clinical/rights/exam approval, learner activation, merge or production deployment. Ownership released at checkpoint.

## Synthetic staging transaction conformance —31 October 2026 IST
- Checked at 2026-10-30T22:16:43.092Z. Codex resumed draft PR #346 at d2eb6b20bbd8606416b19af4b800ca782b02aed4; main 91a11aff41048984b039fd269a2a0a9ddc3d99da. Isolated mlos-staging-transactions worktree, one writer.
- Added reusable test-only driver harness, in-memory executable model and 10 transaction scenarios: exact retries, request/revision conflicts, precommit rollback, lost response, readback unavailable/tampered, concurrent identical/conflicting calls and authority recheck. Six negative controls prove detection.
- TDD rejecting model failed ten positive paths. Reviewer reproduced missing authoritative stored-claim verification; new regression observed RED then GREEN after independent stored package/request/receipt checks. No other concrete finding. Final focused16PASS; npm test1,615PASS/0FAIL; npm run checkPASS(13 services/250 coupling locations); git diff --checkPASS.
- Model is test-only memory, not production/durable persistence, Auth, rights enforcement or database concurrency acceptance. A single simulated precommit fault/deny toggle does not certify every SQL boundary or authority transition. No actual adapter has run this harness.
- Next: exact-package/case/source resolution contract and offline negative tests, then separately reviewed schema/authorization and disposable real adapter conformance. Source rights/genuine reviewer remain unresolved. No source upload, grants, clinical/rights/exam approval, learner activation, merge or production deployment. Hosted new-head CI unverified; ownership released at checkpoint.

## Offline staging request and receipt bindings —31 October 2026 IST
- Checked at 2026-10-30T22:11:43.748763+00:00. Codex resumed draft PR #346 at 2023fd1ba8165b1c379bab5b9e9672e49e430288 in isolated mlos-staging-request worktree; one writer.
- Added source-evidence-staging.js: exact request preparation, server-recomputable canonical claims/package/request fingerprints, pre-await snapshots and receipt shape/binding/checksum matcher. No storage, API or trusted authority implemented.
- TDD rejecting placeholder failed positive paths. Hidden/custom-prototype candidate arrays and malformed receipt inherited getter hazards reproduced RED, fixed by pre-copy ordinary-tree checks, then focused 8PASS. Fresh read-only review found no further concrete defect. Final npm test 1,599PASS/0FAIL; npm run check PASS (13 services/250 coupling locations); git diff --check PASS.
- Canonical candidate limit 16 MiB after parsing; transport must cap before parsing. A self-consistent forged receipt passes checksum matching by design; origin/durability/current permissions must be established by future trusted adapter.
- Next: fault-injectable transaction-port conformance harness for atomic metadata staging, exact retry/conflict/uncertain readback, then separately reviewed persistence/schema/API work. Rights and genuine reviewer unresolved. No source upload, grants, clinical/rights/exam approval, learner activation, merge or production deployment. Hosted new-head CI unverified; ownership released at checkpoint.

## Metadata staging transaction and exact-resolution design —31 October 2026 IST
- Checked at 2026-10-30T22:04:55.793493+00:00. Codex resumed draft PR #346 at 9eb5354b400fc8908608d9b958f5d941c6ad44ff; remote main remains 91a11aff41048984b039fd269a2a0a9ddc3d99da. One writer; isolated mlos-staging-contract worktree.
- Added SOURCE_EVIDENCE_STAGING_PORT.md: trusted principal/current authority, request fingerprint/immutable revision uniqueness, atomic metadata writes, exact retries, uncertain commit recovery and durable digest readback. Resolves selected case/source within exact package, including multi-source packages.
- Clarified staged access state versus unapproved editorial status. Proposed receipt conveys metadata staging only. No source bytes, protected text, schema/API/storage implementation or service changes.
- Documentation-only: runtime tests not rerun; prior 1,591-test result belongs to 9eb5354. Document checked against existing digest/access contracts; git diff --check recorded below. No new hosted CI claim.
- Next: strict offline staging request/fingerprint/receipt contract and synthetic tests, then fault-injected transaction-port harness before persistence/API wiring. Rights and genuine independent review remain unresolved. No grants, ingestion, clinical/rights/exam approval, merge or production deployment. Ownership released at checkpoint.


## Offline private-evidence staging/access policy —30 October2026 IST
- Checked at 2026-10-30T17:46:47.692898+00:00. Resumed PR346b954eb9bd367f05c20ae877ccb201f9a2fd24730 in isolated worktree. Added evaluateSourceEvidenceAccess and8test groups; no app/Auth/storage adapter wiring.
- TDD rejecting placeholder failed3positive paths; final focused8PASS. Full npm test1591PASS/0FAIL; npm run checkPASS(13services/250coupling locations). Read-only review found no concrete defect under trusted-server-context assumption.
- Exact typed package grant/version/digest and author exclusion; metadata rights/runtime/account state; byte reads need staged state,retention/display permission and matching verified byte hashes. Withdrawn/stale/revoked/malformed cases denied; no publication authority.
- Context must be server-derived and current; evaluator does not authenticate,verify rights/source bytes,bind actualsource to package,serialize races or persist decisions. Added SOURCE_EVIDENCE_ACCESS_CONTRACT.md and plan. No live reviewer or evidence uploaded.
- Next:trusted metadata staging port/transaction contract and source-package resolution before any protected API wiring. Hosted new-head CI pending. No migrations,grants,review decisions,clinical/rights/syllabus approval,merge/deploy/activation. Ownership released at checkpoint.


## Private source-evidence persistence/access proposal —30 October2026 IST
- Resumed PR3466ace6d3a84ea247183e7f74992bf32700b8c46f6. Read portability/service/content/archive contracts. Existing ArchivePort is interface only,not live reviewer storage; Drive original ownership and app review-metadata authority retained.
- Added NMC_PRIVATE_EVIDENCE_STORAGE_ACCESS.md:metadata-first exact private package staging;raw PDFs remain official-source references until rights/retention/display resolved. Future authorized archives require implemented adapter/readback/recovery,not public/static links.
- Design addresses immutable metadata/idempotency/partial failures,typed source-row grants,authenticated delivery/revocation limits,no-store,rights withdrawal,retention/backup/restore/provider exit. No service/coupling register changed for proposal.
- Design-only: no runtime tests or implementation completion claimed. Next:pure fail-closed staging/access contract and tests,then separately reviewed persistence/API work. No upload,provisioning,grants/messages,rights/clinical/syllabus approval,merge/deploy/activation. Ownership released at checkpoint.

## Canonical source-row evidence digests —30 October2026 IST
- Checked at 2026-10-30T17:37:54.212505+00:00. Resumed PR346aef95af7ccef8fa1c1ca5c1aa3f8176885145c44. Added offline source-row-evidence.js using existing canonical-integrity JCS/SHA256; distinct appearance/case/package domains,strict shapes and deterministic sorted packages.
- TDD placeholder4positive failures observed; focused8PASS. Final npm test1583PASS/0FAIL; npm run checkPASS (13services/250coupling locations). Read-only review found no concrete defect.
- Captures all caller claims/package values before asynchronous hashing; rejects duplicates,sparse/custom/accessor data and malformed hashes/locators. Independent SHA oracle and offline review-request interoperability verified.
- Added SOURCE_ROW_EVIDENCE_DIGESTS.md and implementation plan. Hashes bind supplied metadata,not true source bytes,authority,reviewer independence,freshness or clinical/rights approval. No live NMC package generated or corpus uploaded.
- Next:private evidence package persistence/import boundaries and exact-source access/rights design before protected API integration. Hosted new-head CI pending; no DB/API/grants/source approval/merge/deploy/learner activation. Ownership released at saved checkpoint.


## Offline source-row contract implemented —30 October2026 IST
- Checked at 2026-10-30T17:30:55.253282+00:00. Codex resumed PR346 from3128dacc82b66a81b3083d6ba19608f5ed0a0a6c in isolated detached worktree. Added pure source-row request validator/receipt matcher and8test groups; existing PR337baseline schema/endpoints unchanged.
- TDD rejecting placeholder failed2positive tests,then focused6PASS. Fresh reviewer found no concrete defect; added missing-receipt/accessor/hidden-field/boundary tests. Final npm test1575PASS/0FAIL; npm run checkPASS (13services/250coupling locations).
- Request exact-shape/UUID/version/hash/slug/note constraints; all4source dispositions. Receipt binds every request field/reviewer/server metadata and requires all approval flags false. Matching does NOT authenticate receipt origin,grant,independence,freshness or source bytes.
- Added plan and SOURCE_ROW_REVIEW_CONTRACT.md. No imports/provider/dependency/runtime app wiring,SQL/API/Auth changes,real grant/decision or production actions. Hosted CI on new head not yet verified.
- Next:canonical private evidence package/digest and trusted persistence design before hosted source-row review. Genuine reviewer and rights/storage handling remain unresolved. No syllabus/content approval or learner activation. Ownership released after saved checkpoint.


## Exact-row review workflow design —30 October2026 IST
- Resumed PR346f6687965afb6c1da043028476a44c98ea39ee4c3. Inspected PR337doc/domain validator at641c094579e6bce752621a954322bf9258814b79; existing strict baseline payload cannot accept row-case decisions.
- Added docs/NMC_EXACT_ROW_REVIEW_WORKFLOW.md:agent-proposed separate typed source-row attestation reusing Auth/runtime/review infrastructure,not repurposing scope-reviewed.
- Design covers source/physical/logical/decision identities,version/digest binding,consent/independence,target grants,revocation,retry,immutability,privacy,recovery and separate clinical/rights/exam/release gates. No implementation or runtime tests claimed.
- Next:design authorization then pure source-row contract/receipt validation and tests; private evidence rights/storage and genuine reviewer remain unresolved. No runtime changes,endpoint,migration,grants/messages,approval,ingestion,merge/deploy/activation. Ownership released at checkpoint.

## Cross-file evidence validation and PR refresh —30 October2026 IST
- Resumed PR34682e8af39ab4d6e9002e9b8cc2afed032995faf81.21cross-file checks PASS on that exact evidence commit:source hashes,263page/1031page counts,subject arithmetic,AETCOM targets,foundation/FAP/pandemic/goals,22null decisions,13open queue items and disabled eligibility.
- Added docs/evidence/nmc-crossfile-validation.json with exact input blob hashes; metadata consistency only,not clinical review or runtime CI.
- Refreshing stale PR346description:official source bytes now retrieved;2634appearances/2631rawtokens and14matches/5disagreements replace obsolete8-row-only audit wording while distinguishing unchanged8unverified app proposal records.
- No runtime changes/tests rerun/fresh CI claim. Next:address actual source/rights/reviewer gates and durable exact-row review import design,not additional count-only summaries. Keep draft/stacked/unmerged. No approvals/ingestion/merge/deploy/activation; ownership released at checkpoint.

## Per-subject reconciliation snapshot —30 October2026 IST
- Resumed PR346c2612636aa1ee21fa915d9e9f603e4437c96b926. Added NMC_SUBJECT_RECONCILIATION.md and evidence-bound19subject snapshot.
-2634appearances/2631distinct raw tokens/3GMrepeats;14count matches,5disagreements. Net-150 versus2781=PE-153+GM4+OG1-SU1-OP1,not150verified missing requirements.
- No normalization approvals orPS9.2count subtraction; effective amended denominator unknown. Aggregate snapshot only,not exported fullraw corpus.
-19/2781/2634/2631/3/14/5/delta validation PASS. No runtime tests/fresh CI claim. Next:cross-file evidence validation and current PR346scope/status reconciliation. No source/medical/rights approval,ingestion,merge/deploy/activation; ownership released at checkpoint.

## Ambiguous code-column region triage —30 October2026 IST
- Resumed PR346fa8a50d24c790b27c28bbc5ba4779a1729fcc18e. Added NMC_AMBIGUOUS_REGION_TRIAGE.md and253region metadata.
-492text regions match heading families. Empty-code regions classify159mergedheadings/59emptybands/6headers/29body continuations. Visually inspected all29bodyregions in5sheets; no clearly new uncoded requirement identified there.
- Preceding-row links remainprovisional,not approved exclusions or independent signoff. No full-corpus no-omission claim.
-253/category sums/29links/hash/page/disabled checks PASS. No runtime tests/fresh CI claim. Next:per-subject appearance/distinct/raw-normalized reconciliation and frozen reviewer snapshot. No approvals/ingestion/merge/deploy/activation; ownership released at checkpoint.

## Geometry extraction and method comparison —30 October2026 IST
- Resumed PR3460cd243c4a464bb068f3d510814f4a54ee93d3829. Geometry scan263defining pages produced2634identifier candidates (2627standard+7nonstandard),253empty/492header-unclassified regions.7known malformed/wrapped-token assertions PASS.
- Stored opaque page receipts and method comparison; detailed raw column extraction remains transient,not full-corpus export. All263page hashes/counts/disabled flags validated.
- PyMuPDF strict-line/geometry standard-ID multisets match260/263pages. DifferencesPDF172wrappedBC14.24,352PS2.1*footnote,445malformedOR2.2.9truncation explained. Not independent source review or no-omission proof.
- Added NMC_RAW_CODECELL_CHECKPOINT.md,nmc-codecell-page-receipts.json,nmc-codecell-method-comparison.json. No runtime tests/fresh CI claim.
- Next:classify ambiguous empty/header regions and uncoded rows visually,then freeze reviewable row inventory under rights constraints. No approval/ingestion/merge/deploy/activation; ownership released at checkpoint.

## Source adjudication packet —30 October2026 IST
- Resumed PR3463a8653bbf2808bf10a36f9f449098cd88a8b45de. Added NMC_SOURCE_ADJUDICATION_PACKET.md and22case machine-readable packet bound to frozen evidence/source hashes.
- Cases retain observations,pages,proposals andnull decisions; no reviewer assigned. Identity adjudication distinct from clinical,rights,exam/release approval. Runtime import/enforcement not implemented.
-22unique IDs/source references/pages/hash/null-decision/disabled validation PASS. Documentation-only/no runtime tests/fresh CI claim.
- Next:raw defining-row inventory including malformed/uncoded rows under rights constraints,not another summary-only checkpoint. Source completeness and independent adjudication remain open. No permission grants/messages/approval/ingestion/merge/deploy/activation. Ownership released at saved checkpoint.

## Volume-global structural comparison —30 October2026 IST
- Resumed PR346a9548cae11c5a219d82b311cde24414a73b23b29. Added NMC_VOLUME_FRAMEWORK_COMPARISON.md and metadata; queue structural_comparison_review_pending.
-3volume sets35numbered competencies/5roles versus opening40bullets/7roles. Two split/combined clauses plus7additional-role bullets explain count structure,not approved semantic identity.
- VolumeII institutional(l) onPDF252 visibly continues(k); preserved likely formatting anomaly unnormalized. Text-comparison boundary artifacts not clinical discrepancies.
-3x35sets/count vectors/40=35-2+7/page/hash/disabled checks PASS; no runtime tests/fresh CI claim. Next:review-ready anomaly decision packet and raw-row no-omission work. No approvals/ingestion/merge/deploy/activation; ownership released at checkpoint.

## Unified1031-page scope matrix —30 October2026 IST
- Resumed PR3466a3828cf5dff0600d6cfe5524ca6c2c2521bc669. Added NMC_SOURCE_COVERAGE_MATRIX.md and12document/1031page disposition checklist; updated unified queue.
- Every retrieved page has provisional category,pending review and no approved exclusion.263subject table pages included. Retrieved set not certified exhaustive.
- New explicit gap:volume introductory frameworksPDF75-107/242-268/371-402 may differ from opening2024goals; compare instead of silently deduplicate.
-12/1031uniqueness/contiguity/hash/263membership/disabled flags PASS; documentation-only/no runtime tests/fresh CI claim. Next:exact volume-global comparison and additional goal locators. No approval/ingestion/merge/deploy/activation; ownership released at checkpoint.

## National/institutional/subject goals —30 October2026 IST
- Resumed PR346563ee64bc900f7a33129c235129b2052c38b59f3. Added NMC_GOAL_LOCATORS.md and source-bound185subject-goal items across19sections plus5national/11institutional/8nested locators.
- Preserved hierarchical/overlapping role summaries; no additive full-coverage denominator. Updated global-subject-goals queue to extracted_review_pending,completed=false.
-19/185uniqueness/5/11/8hierarchy/page/hash/disabled checks PASS. Text extraction plus selected-page visual inspection,not whole-source review. No runtime tests/fresh CI claim.
- Next:unified source-coverage matrix with extracted/reviewed/mapped states and unresolved no-omission page dispositions. Independent review/canonical/exam approvals remain open. No ingestion/approval/merge/deploy/activation; ownership released after saved checkpoint.

## Pandemic competency appearances —30 October2026 IST
- Resumed PR3468553658645584b3cd360de42cdeb1db440e342f6. Added PANDEMIC_COMPETENCY_ENUMERATION.md and source-bound17module/47row metadata.
-3nested subcompetencies and5teaching objectives distinct; similar3.1/3.2/3.3 parent cluster not merged. Standard subject-code token scan found0inPDF11-79,not proof no overlap. Historical appended legal referencesPDF80-113 separated.
- Corrected colon-sensitive extraction and one verification-command syntax error;17table-heading checks PASS.17/47uniqueness/pages/hash/disabled metadata PASS; no runtime tests/fresh CI claim.
- Next:national/institutional and subject-goal prose enumeration,then full scope reconciliation and independent review. No source approval/ingestion/merge/deploy/activation; ownership released after saved checkpoint.

## Global IMG and unified review queue —30 October2026 IST
- Resumed PR3465ceb4d164504398872c2afece94924810be83421. Added NMC_GLOBAL_SUPPORT_REVIEW_QUEUE.md and machine-readable register.
- Global section6 has40top-level bullets across7roles; compound subclauses and subject/other goal overlap pending.17pandemic module openings located; module objective enumeration incomplete.
- Remaining support docs classified as assessment/alignment/logbook/online guidance,not presumed new competency lists.13open queue items consolidate inventory,adjudication,mapping,rights,review,exam/release dependencies.
-7/40/17/13metadata uniqueness/ranges/hash/disabled checks PASS; no runtime tests/fresh CI claim. Next:pandemic objective rows and edition-specific subject references,then remaining global/subject goals. No source approval/ingestion/merge/deploy/activation; ownership released after checkpoint.

## ECE/skills requirement classification —30 October2026 IST
- Resumed PR34674cee40597d21269fe507f2402fffb3376da2725. Added ECE_SKILLS_SCOPE_CLASSIFICATION.md and metadata register.
-2024ECE5objective locators/3elements separate from2019 repeats,6sample lessons,observation guides and example questions. Skills evidence/process requirements separate from lab/faculty guidance and6task examples.
- Explicit AETCOM2.1 reuse and2019subject-code references retained; no auto IM->GM or same-number semantic equivalence. MCQ evidence not practical certification.
- Metadata5/3/3/6counts/hash/disabled checks PASS. No runtime changes/tests/fresh CI claim; no source approval/ingestion/merge/deploy/activation. Next:global IMG and remaining support-module scopes,then unified review queue. Ownership released at checkpoint.

## FAP and electives requirement enumeration —30 October2026 IST
- Resumed PR346f41ec37d25cb6f7413b9049a55c1c400b7e9d6a6. Added FAP_ELECTIVE_ENUMERATION.md and metadata register.
- FAP17phase targets/10report headings/11image-table competency rows indexed separately. PDF68-70 text-empty does not mean requirement-empty. No additive38 or deduplicated denominator claimed.
- Official2024PDF32 resolves electives2x15days/1month versus legacy2x4weeks;PDF37 learner participation/time/logbook/75% requirements distinguished from institution guidance.
-17/10/11/4metadata uniqueness/page/hash/disabled checks PASS. Documentation-only, no runtime tests/fresh CI claim. Next:ECE/skills requirements versus examples,then overlap reconciliation/independent review. No approvals/ingestion/merge/deploy/activation; ownership released at checkpoint.

## Foundation45 outcomes and nested scope —30 October2026 IST
- Resumed PR346a1d4b5e5a528e845a2c4dde7290fbf425154ad06. Added FOUNDATION_SUPPLEMENT_ENUMERATION.md and metadata register.
- Visually enumerated45top-level2019FC outcomes (10/9/6/15/5) and8nested disability entries underFC4.5;2024 applicability unresolved, no additive53 claim.
- Classified ECE6sample modules and skills6example modules; not extra universal competencies. Electives/FAP full learner requirements still pending.
-45unique IDs/8nested/6+6 examples/source hashes/disabled flags PASS. Local workspace briefly disconnected then recovered; no lost repo checkpoint. Documentation-only/no runtime tests or fresh CI claim. Next:FAP targets and elective learner obligations, then ECE/skills classification and independent review. No approval/ingestion/merge/deploy/activation. Ownership released at checkpoint.

## AETCOM candidate module/appendix bridge —30 October2026 IST
- Resumed PR34627201e77920a9b7352b8f5a77895fc8f9f4e635f. Added AETCOM_CANDIDATE_BRIDGE.md and machine-readable27-module bridge with44 candidate links/28 distinct appendix targets; unlinked numbers explicit.
-2024 subject-paper blueprint inspected; subject assignment is not subject-code equivalence.4.8->35 partial relationship preserved; no canonical mappings or source approval.
- Metadata uniqueness/target ranges/partitions/source hashes/fail-closed flags PASS; documentation-only no runtime tests/fresh CI claim. No ingestion/approval/merge/deploy/activation. Next: remaining supplementary requirement/page inventories and independent candidate adjudication. Ownership released at checkpoint.

## AETCOM numbered entries and modules —30 October2026 IST
- Resumed PR346b6c876522c065bf4c8a7edb03141a5268d11cc0c. Added AETCOM_ENUMERATION.md and docs/evidence/aetcom-2018-enumeration.json.
- Appendix87-91 enumerates1-54 (39core/15desirable);14 extra appearances on92-93 provisionally match existing numbered entries. Row37 core/noncore conflict and16/17 semantic similarity remain unresolved; do not claim68 unique requirements.
-27 learning-module IDs align with2024 Annexure1 reference set; no automatic module->competency or subject overlap approval. Local locators explicitly not NMC codes.
-54/14/27 uniqueness/count/reference-set checks PASS. Metadata only, no runtime tests rerun/fresh CI claim. No source prose, approval, ingestion, merge/deploy/activation. Next: candidate module/competency/subject overlap mapping with exact-source review. Ownership released after saved checkpoint.

## Supplementary source retrieval and scope audit —30 October2026 IST
- Resumed PR3466a5032c735320df215c2c1706dd5f3db71343040. Downloaded10 official supplementary PDFs; exact hashes/sizes/pages recorded in docs/evidence/nmc-supplement-sources.json. Parsed10PDFs; no protected PDFs/prose committed.
- Visually checked AETCOM appendix declaration39core/15desirable,2024 annexure index and foundation2weeks/80hours. Separate modules/competencies/subject overlaps and legacy cohort applicability. Supplements not fully enumerated.
- Recorded embedded family adoption/alignment/AETCOM scopes; research infrastructure/admission disability policies not automatically clinical competencies. Targeted later-amendment searches are nonexhaustive; no absence claim.
-10source metadata/unique IDs/hash/page checks PASS. Documentation-only, no runtime tests rerun/fresh CI claimed; no approval/ingestion/merge/deploy/activation. Next: exact AETCOM appendix/module enumeration and2024 overlap/applicability, then other supplements/later notices. Ownership released after saved checkpoint.

## Consolidated extraction inventory —30 October2026 IST
- Resumed PR34614bb3ba51d36738dc30ae415d340cf5c7dc06510. Added docs/evidence/nmc-2024-consolidated-inventory.json and NMC_CONSOLIDATED_INVENTORY.md.
-19 subjects/263 defining-table pages/2624 strict distinct candidates; per-page counts and ordered-code hashes, exact source pair hashes,9 anomaly links and3 unapplied October amendments consolidated. Published base2781 retained; no effective denominator inferred.
- Metadata validation19 subjects/263 unique pages/count sums/anomaly links/fail-closed eligibility PASS. Documentation/evidence only; no runtime tests rerun or fresh CI claimed.
- Not a complete raw-row/code manifest or approved curriculum. Supplements/later amendments and independent adjudication remain pending. Next: source manifest and explicit page scopes for supplements/later notices. No ingestion/approval/merge/deploy/activation; ownership released at checkpoint.

## Malformed-cell visual checkpoint —30 October2026 IST
- Resumed PR346 f71e9a88ce33fa00afe93cb567330f10246c1a0b. Inspected8 official pages plus prior OR page. Added9-record metadata anomaly register and NMC_MALFORMED_CELL_ADJUDICATION.md.
- BC strict82 shortfall explained by prefixless14.1 and wrappedBC14.24 physical rows; topic counts84. PA extra-dot,FM colon,MI missing suffix,AS malformed token andOR malformed cell confirmed. Proposed corrections remain unapproved, not automatically applied.
- SU26.2 defining row absent at visible26.1->26.3 jump. OP topic counts59 versus headline60: no missing code invented.
- Metadata validation9 unique IDs/page bounds/hash binding/false activation and JSON round-trip PASS; no runtime changes/tests rerun, fresh CI unverified. No approvals/ingestion/merge/deploy/learner activation.
- Next: consolidate raw-row/code identity inventory and unresolved adjudications; supplementary/later amendment audit. Independent review pending. Ownership released after saved checkpoint.

## Remaining subjects and prefix register —30 October2026 IST
- Resumed PR346 head81869be726cb79f866f306c47073a42f51527474. Added NMC_REMAINING_SUBJECT_REGISTER.md:19-subject strict extraction observations, page ranges, malformed cells and targeted visual evidence.
- DR/RD defining sections conflict with DE/RT contents legends. Preserved raw observations, no global aliases applied. PA.29.1,FM2:12,ASS.4,split MI/BC tokens and malformed OR2. 2.9 explain candidate parser gaps; proposed identities remain adjudication work.
- Exact totals are not source approval. No runtime changes/tests required; no fresh CI claimed. No content ingestion, approval, merge/deploy or learner activation. Next: visual malformed-cell adjudication and BC/SU/OP gap tracing, then metadata normalization decisions and focused parser tests if justified. Ownership released at saved checkpoint.

## Medicine and OBGYN defining-table reconciliation — 30 October 2026 IST
- Checked2026-10-30T11:17:58Z. Codex resumed PR346 head50ccb65aa55b10595ba2f352bfb0b9218d557213; no competing head observed.
- GM529 unique defining tokens/532 occurrences versus headline525 and topic-header sum531. Visually confirmed GM9.8,GM14.1,GM14.2 printed repeats; GM8.9 numbering gap; topic9 header21/observed17; topic27 header15/observed18. Do not fabricate or remove codes.
- OG142 unique defining tokens and topic-header sum142 versus headline141. Wrapped Topic33 count05 requires multiline handling. No cross-reference false positive or arbitrary extra identified.
- Added NMC_MEDICINE_OBGYN_RECONCILIATION.md with exact source/pages, arithmetic, inspection limits. Documentation-only, no runtime tests rerun; fresh CI unverified. No protected prose, approvals, runtime changes, merge/deploy or learner activation.
- Next: remaining subject defining-range counts and DR/DE,RD/RT alias inspection; then metadata discrepancy ledger and amendment/supplement audit. Independent review pending; ownership released at checkpoint.

## Official NMC source recovery — 30 October 2026 IST
- Codex resumed PR346 from584b398a3122907f84607f4893f0676214f591ce; no competing head observed. Recovered official current /rules-regulation-nmc/33/file and /34/file downloads, actual hashes recorded in NMC_OFFICIAL_SOURCE_RECOVERY.md.
- Official467-page base contains a blank page2; all465 shifted subsequent pages have identical normalized extracted text to mirror. All22 PE defining pages render pixel-identically. PE253/32 versus heading406/35 is confirmed in official-host source, still unresolved.
- October clarification PDF3 changes PE6.4/PY9.1 and deletes PS9.2; base2781 is not an automatically valid amended denominator. No copied descriptions or fabricated missing rows.
- Documentation-only: no runtime tests rerun; fresh CI unverified. No approvals, ingestion, merge, deployment or learner activation. Next exact action: classify GM/OG extra tokens from defining tables, then remaining subject aliases and supplements/later amendments. Independent review pending. Ownership released at checkpoint.

## Paediatrics mirror-section investigation — 30 October 2026 IST
- Checked at 2026-10-30T11:07:37Z. Codex resumed PR346 at c3d7a1e0c787f61ac3fca95bd3ceda87b36542ae; current main91a11aff41048984b039fd269a2a0a9ddc3d99da. Prior handoff released ownership; no remote agent tasks launched.
- Re-downloaded mirror with identical SHA256; rendered/inspected all22 PE pages in contact sheets plus full-page endpoint/transition. Observed253 candidates and32 topics versus printed406/35. This is a mirror source anomaly, not evidence153 official requirements are missing. Preserved denominator and unverified state.
- Added docs/NMC_PAEDIATRICS_SOURCE_ANOMALY.md with provenance, two count aggregations, inspection limits and next acceptance steps. No runtime files or source descriptions changed; runtime/browser tests not rerun for documentation-only checkpoint. Fresh CI not yet verified.
- Next exact action: recover official revised source/clarification and compare PE section, then classify GM/OG extras and remaining aliases. Keep PR346 draft and issue345 unresolved. No ingestion, syllabus approval, merge, deploy or learner activation. Ownership released for continuation after saved checkpoint.

## Dual-exam syllabus proposal and mirror source investigation — 30 October 2026 IST
- Owner requested a practical proposal and continued necessary source work. Codex resumed PR346 branch feat/nmc-complete-competency-audit-20261030, code head 5df017dcaae9ea8f07e7cb98e9170900c03743c9. Remote main observed 91a11aff41048984b039fd269a2a0a9ddc3d99da. No competing writer observed; no remote tasks launched.
- Added docs/NMC_DUAL_EXAM_ADVANCEMENT_PROPOSAL.md: separate source completeness, exact concept/assessment mapping and exam-specific learner activation gates; scoped claims, supplements, rights, uncertainty, invalidation and partial-pilot prerequisites. Proposed policy only; no runtime enforcement claimed.
- Downloaded 466-page institutional mirror; actual bytes SHA256 9bb9e28bd33f0bb6c00ee04bce8095da9f61086f0b2f917ded6daefc16d41db4. Rendered/inspected PDF257-259 (printed17-19) confirming volume totals; PDF280 confirms GM1.1-GM1.8 at printed40, correcting earlier chat locator. Mirror is not authenticated official bytes or independent human review.
- Local metadata scan reproduced2626 candidate tokens, PE253 vs published406, GM529 vs525 and OG142 vs141. All discrepancies remain unresolved; no inferred missing codes or full protected corpus committed. Official direct/compendium retrieval returned404. Only provenance and investigation metadata saved.
- Existing code head core/Chromium/WebKit/Cloudflare all SUCCESS. This documentation checkpoint needs its own CI; no runtime tests rerun because no runtime files changed. Content source verification, rights and genuine independent review remain pending; no ledger approvals, exam certification, merge, deployment or learner activation.
- Next exact action: recover official revised source/clarification via current NMC index; establish mirror parity, then reconcile Paediatrics defining rows page-by-page and GM/OG extra tokens, followed by subject aliases/shortfalls and supplementary inventories. Keep issue345 open, PR337 and stacked343/344/346 draft; preserve326/330. Ownership released for resume after checkpoint.

## PR336 read-only backend staged; genuine-role checker ready — 30 October 2026 IST
- Codex confirmed PR335 main Foundation40945216341 and PR336733edf3 Foundation40945763427 completed SUCCESS. Applied reviewed additive admin_syllabus_review_preflight migration; RPC security invoker and service-only EXECUTE verified (anon/authenticated denied). No draft or learner writes.
- Owner API15 ACTIVE,19/19 exact source files; Review31 ACTIVE,2/2 exact source files. Preserved verify_jwt=false because both existing handlers verify Auth/runtime internally; no weakening. Owner adds reviewed read-only route/dependencies; both APIs add only exact first-party336preview origin https://feat-admin-syllabus-review-preflight-20-medical-learning-os-web.medicalos.workers.dev. PriorOwner13 andReview30 retained in session as rollback reference.
- Extended existing non-persisting checker with preflight suite:anonymous401,distinct learner403,Admin missing UUID404/invalid revision400/POST405. Fixed {} POST only; no valid checklist save. Real roles must match Review.me; no token/identity/body output. Browser regression now covers both suites in both engines through existing CI. Added336migration to existing recovery workflow PR paths; no step/secret/permission change.
- TDD:preflight test failed unsupported scope before code,then focused25PASS and updated origin/contract22PASS; full1548Node/static/124-file build PASS. Independent six-file source review found no important issue. New exact-head browser/recovery CI and genuine deployed Admin/learner checks remain pending; do not merge yet. No official syllabus,medical/rights approval,reviewer grant or publication. Preserve326/330/337.
- Next:verify preview deployment,run preflight Admin/learner checker with real sessions,corroborate Owner15 logs and unchanged counts; require fresh candidate CI/recovery before guarded336merge. RootCodex owns this task; no other active writer.

## PR335 merged and production builds verified; PR336 prepared — 30 October 2026 IST
- Codex completed guarded PR335 merge958f9aa3b2f4389e86de630a50024f6b4cbab0bf. Main tree exactly equals fully green703b908 candidate. Independent review,1540Node/static/build,real two-account non-writing Auth checks and fresh exact-schema recovery40943461358 PASS. Production web/heartbeat/sandbox builds SUCCESS; homepage renders; database0drafts/0acceptances/catalog446. Main repeat core green,browser/WebKit still running at receipt. No direct served-asset byte equality or new production editor save claimed.
- Full receipt:docs/releases/2026-10-30-private-syllabus-drafts-release.md. No medical/rights/syllabus approval,learner publication,valid checklist save or production restore. Preserve326/330.
- PR336 non-forcibly reconciled with released main atc208145f342b9fafc747a1a2785d41c68cbe549c,retargeted main,still draft; unchanged tested source tree2f509134868879543a923427826821f9df5f8e39. Combined1547Node/static/build PASS; source CI40945410842 and fresh checkpointCI require final verification. No336migration/API deployment. JSONB repair preserved; independent source review found no important preflight/private identity concern.
- Next owner Codex/resumable:verify final336exact-headCI;stage and verify separate read-only preflight endpoint with genuine Admin/learner authorization and recovery before guarded release. Keep337separate; no bulk merge. This docs-only checkpoint records actual release without changing runtime. No active subagents or background work beyond GitHubCI.

## PR336 reconciled with corrected PR335 candidate — 30 October 2026 IST
- Codex prepared a forward-only merge of PR336 head8f37cab27560d72171fcbee73528d8a72c867485 with PR335 candidate703b908bc89c5743cfe385c120d20c03b9b1093d. Parent335 is not yet merged; do not release336 early. Resolved only documentation prefixes and overlapping syllabus editor helper, preserving both preflight UI and JSONB key-order repair; browser fixture retains reordered keys.
- Combined local verification:1547 Node tests PASS, npm run check PASS (13 services/250 coupling locations),124-file build PASS, whitespace PASS. Independent source review found no important preflight/private-identity issue. Minor known boundary difference:preflight caps catalog5000 while draft creation allows50000; reconcile before that scale. Fresh combined-head hosted CI/SQL/browser is still required.
- PR335 recovery40943461358 completed SUCCESS: fresh snapshot20261029T194918Z;75public/108COPY tables, exact data/Auth/FK/access/encrypted Vault verification and cleanup passed. No production restore/provider failover. PR335 core40943461362 green; Chromium/WebKit still running at checkpoint.
- No PR336 migration/API deployment, valid checklist write, reviewer grant, approved scope, clinical/rights decision or learner publication. Keep draft. Next: finish335 final CI/release/deployment verification, reconcile336 with actual released main, then stage its separate read-only preflight and verify real Admin/learner authorization. Preserve326/330 and337 order. Root Codex owns this source checkpoint; no competing writer.

## PR335 save confirmation repair — 30 October 2026 IST
- Codex final release review found one important blocker: raw JSON.stringify equality rejected valid JSONB readback when PostgreSQL reordered object keys, leaving saves permanently unconfirmed. Independent reviewer confirmed the defect and the fix; no other important source issue found.
- Reproduced with mounted real editor: reordered-key confirmation failed before repair; changed-value rejection already passed. Minimal recursive sorted-key signature now retains all fields and array order. Browser regression fixture now reorders keys instead of echoing the submitted document unchanged.
- Local verification on b289450 plus this three-file repair: 1,540 Node tests PASS, npm run check PASS (13 services/248 coupling locations), 124-file build PASS, whitespace check PASS. Focused editor tests independently rerun 5/5 PASS. Fresh exact-head Chromium/WebKit/SQL CI required; prior green head does not cover this repair.
- Real hosted non-writing Admin/learner acceptance from preceding receipt remains established at Owner API v13; no endpoint/schema/Auth changes in this repair. No valid syllabus save or publication performed. PR335 remains draft pending new CI, recovery evidence and final release; preserve serial #336/#337 and clinical/source publication #326/#330.
- Next: inspect final repair-head Foundation and preview results, confirm recoverability for staged syllabus schema before guarded merge and live frontend readback. Then reconcile PR336 with released main and verify its separate read-only endpoint. Task owner Codex; no other active writer or remote task launched beyond CI.

## Genuine PR335 Admin and learner HTTP acceptance — 30 October 2026 IST
- Owner requested autonomous completion. Codex resumed branch `feat/admin-syllabus-baseline-drafts-20261029` at tested code head `0d59e8fae059f8bd1156ed238d6c5848daa2a7e3`; no implementation edits. Foundation run 40937425017 independently confirmed completed SUCCESS.
- Real cloud-browser sign-in through secure credential handling: Admin syllabus suite PASS (anonymous GET/invalid POST 401; Admin inventory GET 200 and fixed invalid POST 400). Signed out, separately authenticated a learner; learner suite PASS (anonymous 401; learner GET/invalid POST 403). No credentials, tokens or identity values extracted.
- Independent production function-edge log aggregation for 2026-10-29T19:35:00Z–19:42:00Z confirms Owner API v13, exactly TWO distinct authenticated subjects, one authenticated request per expected GET200/POST400/GET403/POST403. This supersedes the prior no-authenticated-session blocker. Observed Admin request window 19:37:00–19:37:07Z; learner 19:40:19–19:40:26Z.
- Read-only database verification: zero syllabus draft revisions, zero private acceptances, learner catalog version 446. No valid save, attestation, review grant, medical/rights decision or publication submitted.
- PR335 remains unmerged pending final source/recovery/release review; this receipt is verification, not syllabus approval. Documentation update requires fresh exact-head CI. PR336 and PR337 remain separate stacked drafts; previous heads have successful Foundation runs 40928662668 and 40931908949 respectively, which does not certify rebased/new source.
- Next: final exact-head PR335 release review and recovery evidence, then serial release. Review PR336/337 against PR335 accepted-private identity bindings, reconcile with released parent without force-pushing other work, re-run isolated SQL and hosted Auth checks before those releases. Preserve #326/#330. No outgoing remote jobs launched; ownership available to resume.

## PR335 hosted syllabus role acceptance page wired — 30 October 2026 IST
- Extended the existing non-persisting engineering acceptance page with Admin/learner syllabus test controls on exact Cloudflare PR335 preview origin. Each requires a real matching authenticated browser session and sends only GET or deliberately invalid {} POST; credentials, response bodies and user identifiers are not displayed. No syllabus approval or learner publication.
- Owner API v13 and Review API v30 deployed, each **only one exact CORS origin addition**, source parity 16/16 and 2/2. No auth/role/grant changes. GitHub CI 40935355530 Foundation SUCCESS and hosted 5 negative + 3 preview/origin checks SUCCESS. Full Chromium/WebKit suite was still in progress at checkpoint.
- PR335 remains draft/unmerged until distinct real Admin and learner endpoint checks are observed; production private drafts 0, private concept acceptances 0, catalog v446. PR336/337 independent draft work stays blocked in serial order. Rights #326 and publication #330 still require their own release gates.

## Serial Admin syllabus release checkpoint — 29 October 2026 IST
- PR334 merged and production release verified. PR335 has passed exact-head core, Chromium, native WebKit and Cloudflare preview CI. Its protected additive private-checklist migration and Owner API v12 backend were staged with exact source parity and zero learner/catalog writes. **PR335 remains draft/unmerged**: new endpoint still lacks independently verified actual authenticated Admin/learner HTTP outcomes.
- PR336 is the next read-only proposal review feature. Reconciled its original stacked branch with corrected PR335 via two-parent commit d353abc44b02bf026313bc350bfa7cb79ce8a959, retaining backend auth/route fixes; only 14 additive feature files beyond PR335. Exact CI running, not a production release. No independent syllabus approval, medical source rights, learner publication, official denominator, or readiness claim.

## PR334 exact preview access approved — 29 October 2026 IST
- Owner explicitly approved all necessary next checks and exact334preview origin on Owner+Review APIs. Added only https://feat-admin-concept-acceptance-20261029-medical-learning-os-web.medicalos.workers.dev alongside existing333origin; no wildcard or Auth/runtime/Admin bypass. Retained v10/v28 rollback manifests.
- Preview-only session-bound checker now supports both exact approved origins and acceptance suite: anonymousGET/invalidPOST401, real learnerGET/invalidPOST403, AdminGET405/invalidPOST400. Fixed{} POSTs only, no valid acceptance or attestation payload, no credential/body output.18focused role/origin/scope/error tests PASS. Full checks/deploy/live browser and exactCI pending at source checkpoint; do not assert release.
- Prior staging migration20261029161151 and rollback proof, backup40909908198/restore40910513398 PASS remain valid.0durable acceptances/1draftrevision/catalog446 unchanged. No persistent acceptance authorized; keep engineering draft unaccepted and revision2 unsaved.334 remains draft until browser/CI gates; preserve326/330.

## PR334 backend and recovery staged — 29 October 2026 IST
- Source2dc231a6f18a1a380d3af05ce9e983b1f2c37b78 remains draft onmain. Core+Chromium40908425894 SUCCESS; cancelledWebKit123569450477 rerun requested separately. Do not cancel that code-head run for documentation-only updates. This docs checkpoint is on docs/private-acceptance-staging-20261029; no code delta.
- Applied reviewed migration provider20261029161151/admin_concept_acceptance; SQL SHA256864b8bcf15a82882a22ca0c4a98da30ea8e6e4b8c91e9ad14ed76a0f2a7d8ff1 exactly source. RLS=true; anon/authenticated table/RPC denied; serviceSELECT/INSERT granted, UPDATE/DELETE denied. No learner catalog mutation. OwnerAPIv10 ACTIVE hash4ff7b8382c0861871acb69fc770821b09a11fef0859810053b281bc69257567b;14/14 deployed files exact source. Priorv9 fullbundle is rollback. ReviewAPI28 unchanged.
- Explicit productionBEGIN/ROLLBACK synthetic nonclinical acceptance test passed private receipt/readback/exact retry, wrong actor, stale and conflicting retry, original draft replay, post-acceptance revision rejection and private identity collision. Independent post-rollback0acceptances/1originaldraftrevision/catalog446/digest9b5e6a2ef1210c1c15ea41a507c8aa59be180af6f8e1393dddf5bbb28d60b5d3 unchanged. No real identity/classification attestation retained. Do not accept existing engineering draft; revision2 still unsaved after earlier auto-review rejection.
- Fresh backup40909908198 SUCCESS: supabase/2026/10/29/20261029T161634Z. Isolated restore40910513398/job123576913942 SUCCESS on2dc231a6, selected that archive; checksum/source/freshness, exact public owners/grants/defaults, data/encrypted configuration and cleanup passed. No production restore/provider failover. Real anonymous and invalid-bearer POST/concept-draft-accept401/no-store; unrelatedorigin403. Actual production333 draft reader still works withv10.
- Remaining before334frontend: nativeWebKit exact-head pass, real authenticated acceptance-endpoint invalid/learner denial and preview control checks. Actual334preview https://feat-admin-concept-acceptance-20261029-medical-learning-os-web.medicalos.workers.dev currently preflight403origin_not_allowed. Prior approval covers only333preview. Obtain approval for this exact334origin on BOTH Owner and Review APIs; retain all Auth/runtime/Admin checks and avoid wildcard. Existing non-persisting acceptance harness may be extended with fixed invalid{} acceptance requests; no token extraction, valid acceptance or new review attestation. Keep334unmerged; preserve326/330 and335–337. Issue338 has full live receipts.

## PR333 released; serial continuation PR334 — 29 October 2026 IST
- PR333 merged a52982e786ca63a0f174129eb55e0c4d3c3c087a; merged tree886cbb71ee1b07d02a81024a54de7e26b68b465d exactly equals tested a38bcc3b tree. Exact feature Foundation40903412540 SUCCESS across core/Chromium/nativeWebKit. Production website df596c06-0a3a-40a5-877a-2e9b9a8a4c30 and heartbeat4ce0b099-55c9-4145-827d-30794ceb105c SUCCESS. Main40906463499 completed SUCCESS across core/Chromium/nativeWebKit.
- Owner API9/hash a014aaa7f6b3852d9fa7b2ea49eb2dee84560ceda5558e1eb3657d68fa6bc131 exact12 files; Review API28/hash684dca0ab739c0ffb5583fb4de2c2ed607a8d01429977a6ef8fa96ba1641fd99 exact2-file content. Both exact preview origin additions owner-approved, Auth/runtime/Admin intact. Draft migration20261029113205 unchanged. Fresh backup40893708167 and isolated schema restore40894417921 SUCCESS (before retained engineering test draft; no claim that draft row itself was restored).
- Actual browser seven-case endpoint contract PASS: anonymousGET/invalidPOST401, real learnerGET/invalidPOST403, Admin inventory200/missing404/invalidPOST400, no-store and readable browser CORS. Tokens never extracted. Actual Admin save/exact revision1 readback/reload and production released editor readback PASS; actual production learner route denial PASS; production acceptance-tool page disabled. One retained private nonclinical proposal aa61bb76-a21e-4c58-bbde-07d753cadd83 revision1; no revision2 after auto-review refusal. Catalog446/10concepts/6questions/digest9b5e6a2ef1210c1c15ea41a507c8aa59be180af6f8e1393dddf5bbb28d60b5d3 unchanged. No canonical acceptance/publication or clinical/rights approval; real induced transport-retry remains unclaimed.
- Next PR334 owner Codex: reconcile original906886a9 with released maina52982e by non-forced merge, keep existing private-identity safety fixes and333 origin/harness fixes. Resolved only portability-register overlap by preserving reviewed entries from both, then minimized formatting diff. Effective increment inspected: new Admin-private identities only, no learner catalog writes; existing concept revisions cannot be accepted. Add release333 receipt in this checkpoint. Local combined full test/check/build and new exact-head CI pending before any334 migration/API/frontend. Keep334 draft and undeployed; do not accept the engineering test draft. Preserve326/330 and335–337/sibling stack.

## Non-persisting hosted HTTP acceptance UI — 29 October 2026 IST
- Existing Node harness needs operator-supplied tokens; browser automation cannot extract them. Added exact-preview-only /web/concept-http-check.html using existing auth internally, selected-role verification through Review API/me, anonymous401, learner403, Admin inventory200/missing404/invalid400. All POST bodies fixed to{}; no valid save endpoint payload, token/identity/body output or persistence. Readable browser response proves CORS enforcement; no false assertion on non-exposed ACAO header.
- Four focused tests pass including scope/role/session rejection, exact invalid requests, sanitized reports, transport/status/cache/JSON failures. New two Supabase adapter/UI coupling entries explicitly reviewed. Local full test/check/build and exact CI/live page acceptance pending. Product authoring unchanged; no new API/schema. PR333 remains unmerged. Prior revision2 denial respected; one existing revision1 retained.

## Real candidate Admin save/readback passed — 29 October 2026 IST
- Owner approved same exact first-party concept preview origin for Review API. Read deployedv27 pinned sourcedf6039fe; repository Review API byte-equal. Deployed full source+runtime helper asv28, bundle684dca0ab739c0ffb5583fb4de2c2ed607a8d01429977a6ef8fa96ba1641fd99; both files exact content-match readback (provider normalizes paths). Added only exact origin and removed unused JSR declaration import; no Auth/runtime/role bypass. Twelve real-handler origin tests,1514Node and check13services241locations passed. Live preview OPTIONS200, anonymousGET401, lookalike403.
- Genuine signed-in Admin candidate loaded concept editor via review.me and Owner APIv9;10canonical targets/catalog446/6questions; empty drafts before test. Saved proposed nonclinical Engineering acceptance — private draft only through actual UI, status Saved and confirmed revision1. Exact source/reason/label displayed in readback; proposal aa61bb76-a21e-4c58-bbde-07d753cadd83, new draft conceptC-dd9b3a6e-936f-4b2b-bbf9-e39da774e570. No medical classification/claims or canonical acceptance/publication. This is ONE retained private engineering proposal; earlier zero-draft receipts are historical.
- Automatic approval review rejected attempted second immutable revision because exact follow-up payload/revision was not explicitly authorized. No second save/revision performed. Retained SQL readback independently confirms revision1 original reason. Browser transport then disconnected; reload acceptance and current unsaved UI state unverified. Never bypass rejected write using SQL/API.
- Source7af41ff409cd0800ddbeab7c55c188a74334665f; Foundation40899234769 queued at checkpoint. Need explicit approval for exact revision2 if desired, hosted endpoint-specific negative/invalid cases and fresh CI before merge. Prior transaction rollback tests cover idempotent retry but no claim of real browser retry transport test. PR333 remains unmerged; no clinical/learner/canonical write. Preserve326/330 and serial releases.

## Exact candidate origin authorized — 29 October 2026 IST
- Owner explicitly approved only https://feat-admin-concept-drafts-20261029-medical-learning-os-web.medicalos.workers.dev for Owner API acceptance. Added this exact origin, no wildcard; Auth/runtime/singleton Admin checks unchanged. Direct preview works without Cloudflare dashboard sign-in; before change its OPTIONS returned403 origin_not_allowed.
- Real-handler origin regression now includes Owner API and verifies exact preview preflight, unrelated/lookalike/HTTP origin rejection and missing/invalid-token401. Twelve focused cases pass. Full test/check and new hosted CI tracked separately; do not infer deployment from source checkpoint.
- Prior Owner APIv8 complete12-file bundle retained as rollback; candidate differs only in entrypoint origin line. Backend deployment/readback and live preflight pending at this source checkpoint. Current app session learner; candidate session signed out. PR333 remains unmerged; no clinical/learner/canonical writes.

## Fresh deployed-schema recovery proof — 29 October 2026 IST
- Backup40893708167/job123517004526 SUCCESS on main13b3c8c; uploaded and size-verified supabase/2026/10/29/20261029T143958Z. Live service-only privilege audit passed before dump.
- Isolated restore40894417921/job123519531797 SUCCESS on PR333 exact9b87c294; selected that archive/run40893708167, freshness/checksums/source passed, restored exact public access metadata/data/encrypted Vault and cleanup passed. Snapshot job skipped. Restore workflow and verifier byte-unchanged from main; feature branch supplies deployed draft migration to exact-table inventory. No production restore or provider failover.
- Real Admin access and distinct learner Admin-route denial previously passed; runtime CI40890803494 SUCCESS. PR333 remains unmerged. Endpoint-specific seven-case HTTP checks, authorized draft save/retry/readback and editor frontend acceptance remain. Current Work app session is learner. No canonical/clinical/learner write or function/frontend deployment.

## Hosted acceptance continuation — 29 October 2026 IST
- Current PR333 exact head802b52204fe09d6d1a333bd4fd2820d8bc68f762 is open/unmerged; Foundation40870298366 completed SUCCESS. Owner API remains ACTIVE v8, bundle93871fd489f3953ff6f670583712f198d0992345631d7d878b43b14c44421d36. No migration reapplication or redeployment.
- Secure real Admin sign-in succeeded in Work browser; fresh Home showed Master Admin and server-verified Owner Overview loaded through live APIv8. This verifies existing Admin access, not the undeployed333editor or concept-drafts HTTP contract. Keep the signed-in browser for continuation; do not extract tokens.
- Direct GitHub jobs readback confirms isolated restore40846013331/123353574201 SUCCESS, including backup freshness/checksums/source, disposable restoration, access/data/encrypted Vault verification and cleanup. Snapshot job skipped. It recovered Oct25 backup; no later draft-table recovery asserted. Latest scheduled-run enumeration is unavailable through the connector fetch allowlist.
- Remaining release gates: real distinct non-Admin HTTP/browser denial; Admin concept-draft HTTP contract and source-authorized safe save/retry/exact readback; recovery coverage/rollback readiness for added draft schema; then controlled333frontend release/build and editor acceptance. No synthetic permanent clinical drafts, new accounts, permissions, canonical/learner/clinical writes or merges performed. Keep334–337 unreleased and326/330 independent.

## PR332 released; next unit PR333 — 29 October 2026 IST
- Codex completed staged332 rollout after owner requested integration instead of more features. PR332 merged13b3c8c; website production8f70c0a6 SUCCESS; Owner APIv7 exact10-file source and migration20261029111344/hash verified. Real Admin Coverage Index and existing integrity/dashboard acceptance passed; catalog446/digest and review/rights counts unchanged. See releases/2026-10-29-admin-coverage-index-release.md and issue338 for exact evidence/limits.
- No other feature PR merged/deployed. Parent333 is now based on main13b3c8c; effective24-file concept-only increment inspected, no duplicated coverage migration. This docs checkpoint changes no333runtime source. Reverify fresh exact-head CI before its staged migration/API/frontend rollout. No new feature development; preserve326/330 and the later341/342 sibling stack.
- Main332 core and dedicated Chromium/nativeWebKit steps passed; broader main suites were running at checkpoint. Genuine learner-account HTTP denial, physical iPad and dashboard rollback controls remain unverified. CLI asset byte equality failed403/timeouts but real browser feature and API are verified. No clinical/source approval or learner/content mutation.

## Concept draft editor — reviewed source complete, 29 October 2026 IST
- Stacked PR333 adds zero-question concept proposals and revisions with immutable history, exact readback/idempotent retries, safe incomplete/newer typing and stale-base protection. Runtime 2af00ae693d18668a12f57cff1b319443c64eb85; see [receipt](CONCEPT_DRAFTS.md).
- 1,511Node/check13services240locations/build118/disposable SQL and Chromium3viewport authoring/inventory checks pass. Important review findings fixed with regressions. New-branch full CI remains pending; no hosted acceptance or production deployment. Parent PR332 final CI40764606041 all jobs SUCCESS and ready for review.
- Canonical concepts, syllabus baseline, review/rights evidence and learner publication remain unchanged. This is the first authoring increment, not all slice2 or a deployed master collection.

## Admin Coverage Index — slice1 implemented, 29 October 2026 IST
- Owner approved design PR331 and requested implementation. Feature branch feat/admin-coverage-index-20261029 / draft [PR332](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/332), remote code81d87c888d837a0605f242578c0a3aa5f67d608b. Admin inventory filters preserve empty concepts; coherent actor/registry-bound metadata snapshots, separate pending/stored counts, note relationships and scoped PYQ claims reuse canonical IDs.
- Latest1503Node tests, syntax/catalog/ADR/portability13services236locations,116-file Pages build, disposable PostgreSQL permission/replay/expiry/redaction checks and Chromium phone/tablet/desktop coverage flows pass. Fresh review findings fixed with failing regressions. Initial native WebKit coverage passed; whole navigation CI found duplicate Coverage Index headings, now fixed with a browser regression. Fresh CI40763850459 pending; local Linux WebKit remains unaccepted after dependency/runtime crash. [Exact receipt and limits](COVERAGE_INDEX.md).
- No production migration/API/site deployment, content import, clinical/source approval, learner evidence or visibility changes. Baseline incomplete and true approved coverage unknown. Slices2/3 and PR318/330 remain separate.

## Canonical note reader — production release verified, 25 October 2026 IST
- Owner-selected formatted notes/section navigation released: [PR #328](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/328) merged as `345ac4e112c1b30ed7bbdc17e1f766998e2c8866`. Foundation run **40145021645**: Node/check/build, Chromium and native WebKit all successful, including responsive Library/Vault note navigation, iPad rotation and existing Back/Forward/personal overlay flows. Provider production Cloudflare builds succeeded for `medical-learning-os` (`2c4d257b-1b2b-4d11-831b-3632b796f3ce`) and `medical-learning-os-web` (`63a4e332-4728-404b-9868-b88b30749b93`).
- Shared zero-dependency escaped Markdown renderer and opaque palette-aware reading layout added; actual six published notes each produce six section anchors. No clinical/rights content changes, DB writes, auth, backend, theme or master navigation changes. Rights/provenance issue #326 remains open and draft disclaimers still visible. Live signed-in browser acceptance and served-asset byte equality remain separate. [Release evidence](releases/2026-10-25-canonical-note-reader-release.md).

## Canonical note reading UI — feature verification in progress, 25 October 2026 IST
- Owner selected Build now: properly formatted canonical notes, section navigation and clean reading layout in NeuralVault and Library, preserving the approved theme and navigation. Current task branch `feat/canonical-note-reader-20261025`, based on main `a2a1436ae9b58fe8ab84d1ce7aea795e681cafe1`. No medical-content rewrite, approval/status mutation, schema migration or learner-data write.
- Adds a shared no-dependency escaped Markdown renderer with anchored headings, list/inline formatting, inert HTTPS references and per-note outline. Shared styles use opaque Sage/Lavender surfaces and responsive reading measure. Vault and Library/Compare/References/Recall rendering use the same presentation; existing exact hashes and private overlays remain. Regression tests include malicious Markdown and phone/tablet/desktop real browser interactions; full CI and deployment verification are **not yet confirmed at this checkpoint**.
- Existing content governance incident [#326](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/326) is unaffected; stale unpublished-warning text remains faithfully present as content pending review. No false reviewed exam relevance or mastery values added.
- Next verify full Node/check/build and Chromium/WebKit across all viewports, repair observed regressions, merge only after green PR, verify Cloudflare website build, then record exact deployment evidence and remaining real signed-in acceptance.

## Saved-attempt review continuation PR324 — 25 October 2026

PR324 supersedes closed PR322, preserving main90aaacdc and the released PR321 learner-content fallback. Combined1484Node tests/check/build pass on exact source0e59653. Fresh Foundation40142407864 is queued; responsive hosted acceptance, runtime deployment and website release are pending. Original text review is implemented; archived-retired authorization and non-original/media history remain unfinished. All content and learner data stay in Supabase.

## Published learner-content fallback — production release verified
- Checked 25 October 2026 IST. Owner fix PR #321 merged as `c264eb1bfcd23e3158760ff721d7979fc3148181`. Foundation run 40141314085 passed Node/check, Chromium and native WebKit; Cloudflare production web/heartbeat builds succeeded. Supabase `study-api` v53 ACTIVE includes the no-mapping fallback; exact ten-file bundle audited. Catalog v446, 6 published questions and 6 published notes unchanged. No clinical review/rights/learner writes or migration. Real authenticated production learner acceptance and served-asset equality remain unverified. See [release receipt](releases/2026-10-25-learner-content-visibility-release.md). Follow up with normal learner Library/Study Now/Notes/Graph acceptance and approved exam requirements.

## Learner published-content visibility repair — PR #321 pending validation
- Checked 25 October 2026 (Asia/Kolkata). Live Supabase catalog v446 contains 6 published questions, 6 published canonical notes and 10 concepts. The shipped preparation registry has zero approved objectives/mappings/artifacts, previously hiding the catalog under valid configured goal profiles.
- Owner requested a fix. Feature branch `fix/learner-unmapped-content-fallback-20261025`, PR #321 changes only the shared preparation projection, Study Now fallback receipt/learner message, Library status message, preparation tests, responsive browser assertions and documentation. It does not publish content, grant medical/exam approval, change DB privileges, or restore erased pilots.
- Initial CI check failed on two older medical-graph integration assertions expecting unmapped to hide published graph context. Those assertions were updated on the same feature branch to retain published context only for valid profiles. Follow-up CI is not yet confirmed here. Production web and `study-api` deployment and genuine signed-in acceptance remain pending; existing sessions and approved mapped scopes retain old behavior.
- Exact next: verify PR #321 full Node/check, Chromium and WebKit; review diff; merge only if green; deploy coupled web + study-api; inspect live API and route with genuine learner credentials when available. Unrelated PR #318 remains untouched.

## Saved-attempt review UI — 25 October 2026

PR322 now includes Recent Activity review links and read-only exact-version question/result/explanation display. URL preserves attempt/page across reload/return; failures and restrictions preserve activity with no protected content.1482Node tests/check/build pass. Hosted responsive/Chromium/WebKit flow and deployment acceptance pending. All retired versions remain denied; archive authorization and non-original/media retrieval remain open. No database or production runtime changed in this follow-up.

## Protected attempt review backend — 25 October 2026

PR322 saves the first learner-owned historical review boundary on codea38e22b. Exact still-published original-text prompts and stored receipts can be retrieved independently of session closure; retired/rights-restricted/missing content stays redacted. Final1476Node tests/check/build pass; hosted CI and deployment pending. No UI or archived-retired authorization is claimed; frozen non-original/media retrieval remains open. No production database or learner records changed. See latest handoff and the scoped plan.

## Scheduled retention acceptance — 25 October 2026

Natural04:15IST monitor execution persisted normal capacity:22,047,891bytes against500,000,000 operating budget. Delivery now diagnoses missing configuration. R2 correctly remains degraded because no main storage audit exists; repaired its manual-only workflow with monthly read-only inventory and scoped main-file-change triggers. Eight guard tests and1465Node/check/build pass. Hosted repaired CI and audit execution pending; sender and withdrawal-aware historical retrieval remain open. Supabase remains authoritative.

## Retention acceptance follow-up — 25 October 2026

PR319 hosted core checks pass; Chromium found an eager accessible-name selection race in the navigation test helper. The helper now waits for either valid phone Tools control without weakening assertions or changing runtime. Local tests/check/build and full hosted browser acceptance pending. Version7 scheduled snapshots, sender configuration and withdrawal-aware historical retrieval remain separately unverified. No content or learner data moved.

## Supabase retention monitor deployed — 25 October 2026

PR319 monitoring source is live as version7; exact pin readback and unauthenticated401 verified. Database-byte measurement22,047,891 is below budget. Local1465tests/check/build pass; exact-head CI and natural scheduled snapshot pending. Email remains blocked by sender configuration; full hosted historical-prompt retrieval remains unimplemented. No content, learner records, schema or credentials changed. See retention readiness and handoff.

## Supabase retention safeguards — 25 October 2026

PR319 adds capacity stages and accurate backup/notification evidence while retaining Supabase authority. Local1465Node tests/check/build pass; Python24pass/2skip. Exact-head CI and pinned monitor rollout pending. Existing encrypted backup repair was already integrated; sender configuration and safe hosted historical-prompt retrieval remain gaps. See [readiness](SUPABASE_RETENTION_READINESS.md) and latest handoff for limits and exact next action. No production data/schema/credentials changed.

## Responsive Admin top entry and complete feature map — released
- Checked 24 October 2026 at 15:32 IST. Owner explicitly chose Master Admin in tablet/iPad/desktop top navigation, phone/narrow split entry in avatar. PR316 merged asfacfbaa2b351f607e21c2ceb77c46b83d13440fa fromd72fc325a5b546474d0cc08a49ca936c607e6778; merged treee614aa4fad2451b45fbadad3c63f00c5d4d1cb69 equals the exact tested feature tree. Codex owns docs/admin-responsive-entry-release-20261024 for this receipt; no runtime change after merge.

## Responsive Admin top entry and complete feature map — released
- Checked 24 October 2026 at 15:32 IST. Owner explicitly chose Master Admin in tablet/iPad/desktop top navigation, phone/narrow split entry in avatar. PR316 merged asfacfbaa2b351f607e21c2ceb77c46b83d13440fa fromd72fc325a5b546474d0cc08a49ca936c607e6778; merged treee614aa4fad2451b45fbadad3c63f00c5d4d1cb69 equals the exact tested feature tree. Codex owns docs/admin-responsive-entry-release-20261024 for this receipt; no runtime change after merge.
- Single authorized entry per layout; wide Admin is a destination without a learner-context Admin tool disclosure. Existing Admin local toolbar, five groups, legacy-pin isolation, draft/history and denial behavior remain. Ordinary learner/guest navigation is byte-identical to base across40 rendering combinations. No backend/grant/content or other learner-feature changes.
- Foundation40083545559 completed SUCCESS on exactd72fc325:1460Node tests/check/110-file build, six isolated PostgreSQL scripts, Chromium and native WebKit with phone/iPad/desktop/rotation, fit, drafts, history and denial/adjacent flows. Responsive regression failed before fix then65focused/fullsuite green. Independent reviewer found no Critical/Important/Minor findings, passed36targeted tests and verified isolated geometry at11widths701–1600px; that fixture is distinct from full application acceptance.
- Production web buildcd17fe51-0799-4d70-8951-db9cdc7c0b06, heartbeat914f54e6-c7e3-4c59-b3a0-3ee25337d541 and existing sandboxf0e82231-bd08-427c-824a-569aa547979c all SUCCESS at merge. Existing Git integration only; no provider/security/payment settings or transactions changed. Fresh live guest Admin requires sign-in. No genuine signed-in production acceptance or served-asset byte equality is claimed.
- docs/ADMIN_FEATURE_MAP.md records all five groups/19destinations, exact implemented actions and limits, and prioritized stability suggestions. Broader status/blocker, draft recovery/error, pagination, guided relationship, experiment separation, audit and telemetry changes are proposals only. Task complete; next owner decision is the proposed Admin workflow-stability scope. Keep genuine source/clinical review and populated acceptance separate; no content publication or learner data created. Automatic main/docs CI may run; exact feature core/Chromium/WebKit already passed. No mutating background task retained; other worktrees/PRs untouched.

## Responsive Admin top entry and complete feature map — verification checkpoint
- Checked 24 October 2026 at 15:19 IST. Owner explicitly selected Master Admin in the top row on tablet/iPad/desktop, phone entry in the avatar. Codex owns fix/admin-tablet-top-entry-20261024, base main0ac50bbc72d32566e44b937d7428cf8dc2957435, in Medical_Learning_OS_relationship299. This supersedes only all-device avatar placement; Admin tools/pin isolation and local toolbar remain intact. Broader Admin stability changes are recommendations only.
- Wide navigation now exposes a server-authorized Admin destination without an Admin tool disclosure or duplicate avatar entry. Phone keeps its existing avatar entry and four learner master links. No backend/grant/content or learner feature changes. Responsive regression failed before the fix, then65focused/1460full tests pass; check13services/230locations,110-file build and diff whitespace pass. Existing Chromium/WebKit journeys now locate the single responsive Admin entry. Exact-head hosted results pending.
- Added docs/ADMIN_FEATURE_MAP.md: all five current groups/19destinations, actual actions, authority/workflow boundaries and limitations. Source audit includes reviewer authority being a status-only view, conditional AI telemetry, source watch as owner-operated evidence, latest100 relationship inbox, and health/restore workflow evidence distinct from actual recovery. Proposed status/blocker consistency, draft recovery, friendly errors, pagination, guided relationship entry and separation of experiments remain unimplemented.
- Independent readonly review is running; no final verdict claimed. Exact next: checkpoint remotely/open PR, complete review and exact-head browser checks/fit, merge scoped placement correction and verify production runtime/delivery. Do not implement the broader map recommendations without owner selection. Real clinical/reuse review and populated acceptance remain separate; no mutating hosted data task retained.

## Admin navigation isolation — production release verified
- Checked 24 October 2026 at 14:59 IST. Owner-authorized Admin-only repair PR314 merged as40f852622fce5e7c66fa9c7c41af31a4c1770559. Reviewed/tested head589c5f8c20c409fa1fb07cac42126e91b766cf12; merged tree643996c33e6b1442077b5f2ee1650c78b577fffe equals that feature tree exactly. Codex owns docs/admin-navigation-release-20261024 for this receipt; no runtime changes after merge.
- Admin is absent from global learner master lists and entered from the server-authorized avatar. Admin pages have their own local Tools control; existing five groups remain. Legacy Admin pins cannot render in learner menus or offer new cross-workspace pins. Ordinary learner/guest shell is byte-identical to base across40 render combinations. Intake removes its redundant navigation row and links its existing medical relationship section through draft-safe same-document history. No backend/API/database/grant/clinical changes.
- Foundation40081311132 completed SUCCESS on exact589c5f8: core1460Node tests/check/build, six disposable PostgreSQL checks, Chromium and native WebKit including phone/iPad portrait/landscape/split/desktop, Admin draft/history, focus rotation, denial and adjacent workflows. Local full Chromium also passed. Phone/tablet/desktop Admin images inspected. Independent reviewer had two Important findings, both RED-to-GREEN fixed and full suite green; no Critical/Minor findings. Earlier failed/test-synchronization states remain recorded below.
- Git-triggered production website buildc466d732-e395-4b90-a48c-5e3a391caa83 and heartbeat27bd13f7-8ada-4c28-870e-0e87a382865c both SUCCESS at merged source. No manual provider setting or payment operation. Live guest Admin page requires sign-in, no avatar Admin link/local toolbar; fresh DOM adminWorkspace=false confirms new navigation runtime. Raw CLI HTTP reads returned HTTPError, so full served-asset byte equality is not claimed. Genuine authenticated production Admin acceptance was unavailable; automated signed-in checks use nonclinical fixtures.
- Work complete within authorized scope. Exact next: owner refreshes the website, opens avatar → Master Admin, and uses its local Tools menu. Keep real content/reviewer approval and populated acceptance301 separate; no source publication, learner records or human attestations created. Automatic main/docs CI may still run; exact feature core/Chromium/WebKit already passed. Other worktrees/PRs untouched; no custom mutating background task retained. See docs/releases/2026-10-24-admin-navigation-isolation-release.md.

## Admin navigation isolation — browser verification checkpoint
- Checked 24 October 2026 at 14:46 IST. Codex owns PR314/fix/admin-navigation-isolation-20261024; actual source checkpointacebbfda13fbb798ea276e90f35cab776f1c8e26 is saved remotely, base main17c813410769113825c4e76c866922cc76f7457e. Scope remains only Admin entry/tools and leakage; no learner feature, backend or content changes. No production release yet.
- Full1460/1460 Node tests, check13services/230coupling locations,110-file build and diff check pass. Local Chromium completed the full three-layout navigation journey on8abec347 with real Admin draft/history, rotation focus, independent groups, appearances/pins and denial checks. Phone/tablet/desktop Admin screenshots inspected; inherited toolbar margin was reproduced by geometry failure then corrected. No dependency/package changes in repository.
- Independent review's two Important findings both have RED-to-GREEN fixes; no Critical/Minor findings. Hosted Foundation40080915215 core passed; WebKit failed at menu sweep immediately after cross-page avatar entry (admin:overview assertion). Latest checkpoint adds explicit Admin heading/data readiness and expected menu-heading waits, preserving every leaf assertion. Earlier local failures were missing browser executable, legacy top-header selector and resize-test synchronization; none is hidden as a green run. Latest exact-head hosted result pending.
- Exact next: inspect final hosted core/Chromium/WebKit, fix any reproduced failure, then merge/release the scoped UI repair and verify byte-exact delivered navigation assets and signed-out denial. Genuine authenticated production acceptance is not claimed. All private content/source review remains separate. No mutating hosted data task retained; other worktrees/PRs untouched.

## Admin navigation isolation — implementation checkpoint
- Checked 24 October 2026, 14:35 IST (Asia/Kolkata). Owner authorizes only Master Admin entry/tools and removal of Admin controls leaking into other masters; no broader learner redesign. Codex owns fix/admin-navigation-isolation-20261024 in Medical_Learning_OS_relationship299, base main17c813410769113825c4e76c866922cc76f7457e. Changes are not deployed at this checkpoint.
- Found real navigation overlap: authorized Admin pins surfaced in learner contextual menus. Admin entry now renders only in the server-authorized avatar; global learner masters retain Home/Study/Library/Exams. Admin pages have their own local toolbar/trigger; existing phone drawer and tablet/desktop contextual tools remain. Admin pins no longer render or offer cross-workspace pin actions. All five Admin groups remain; existing Medical relationships anchor is discoverable and redundant intake navigation row removed. No database/API/reviewer/clinical/source publication changes.
- Baseline1453/1453 passed. Four initial isolation/discovery tests failed before implementation; focused65 passed after. Independent review identified two Important findings: clean-URL relationship shortcut could reload away drafts, and phone drawer rotation lost focus. Both were reproduced with failing regressions and fixed using bounded same-page Admin intake interception plus Admin-only resize focus return; full1460/1460 now passes. Reviewer had no Critical/Minor findings; no second review claimed. Browser regression also asserts real intake draft/history and rotation focus. npm run check (13services/230coupling locations),110-file build and diff whitespace passed before the final reviewer fixes; fresh final rerun/hosted CI pending.
- Local Chromium was initially missing; isolated pinned Playwright/browser installed outside the repo, then existing navigation journey launched against synthetic nonclinical fixtures. Final browser/hosted results pending; no actual signed-in production acceptance is claimed. No dependency or package/lockfile changed. Existing backend authorization remains authoritative and fail-closed.
- Exact next: save code/docs checkpoint remotely and open PR; finish local browser and fresh check/build, inspect hosted core/Chromium/WebKit plus final images, repair reproduced failures, merge scoped repair and verify delivered assets/public denial. Retain genuine content review and issue301 separately. One writer; independent reviewer readonly and complete; no mutating hosted task retained.

## Content publication failure — production repair verified
- Checked 24 October 2026, 03:32 IST (Asia/Kolkata). Codex completed the screenshot-reported import_publication_failed engineering repair. PR312 code636ecc60db55e4ccdd2a45cbde4cc3901975d6fb merged asad9c618e87821e389f55c347ac2fbb795419dbce; merged tree69bde69f6c688b2ada5e18887d4a622abb3a0413 equals the tested feature tree. This docs receipt uses docs/content-publication-release-20261024, based on that merge; no competing writer or custom mutating background job retained.
- Exact-head Foundation40029990672 completed SUCCESS: core1453Node tests/build/check, all six disposable PostgreSQL checks, Chromium and WebKit/phone/tablet workflows. Independent reviewer found no Critical/Important/Minor issues. The specific SQLSTATE42725 regression failed before replacement and passed after. Full platform migration-chain replay and actual signed-in clinical publication remain unclaimed.
- Committed migration20261023214659_content_import_intelligence_grouping.sql applied through apply_migration as ledger20261023220111/content_import_intelligence_grouping. Stored single SQL body SHA256be29169925d676a5200e6d8946078bd177164a9262f245232af1b15a8194d2bb exactly matches reviewed source. Full live pg_get_functiondef byte-matches the original definition with only the grouped extraction change. Wrapper OID24165/ownerpostgres, SECURITY DEFINER, empty search_path and service-only EXECUTE unchanged; anon/authenticated denied. Legacy OID23533/MD5b4eb4a30b179e281fd5eb6ed666314c4 unchanged. Security/performance advisor findings match pre-repair. No API/static source or provider settings changed.
- Fresh live readback: NEETPG26-CORE6-20261024-v1 remains draft, digestf65956bc03fac780f8539e86033b5a93542c63857c5743a95ba47fd3650c6112, no publication receipt. Catalog407/questions0/notes0/clinical-review-events0 and existing rights-events12 unchanged. No hosted publication RPC was invoked, no reviewer impersonated and no clinical/rights approval invented.
- Exact next: genuine signed-in Admin retries Review & publish on the retained draft after checking actual review/permission evidence. Failure retains the current form values while the page remains open; a reload may require re-entering unsaved notes. The blank medical relationship editor is separate and can stay empty for ordinary question/note publication. Relationship proposals remain private pending published endpoint bindings and genuine separate review. Populated acceptance301, pagination300 and deeper exploration302 remain open. See docs/releases/2026-10-24-content-publication-grouping-repair.md. Post-merge CI may run automatically; the complete tested feature tree is already green.

## Content publication failure — reviewed repair ready for CI
- Checked 24 October 2026, 03:28 IST (Asia/Kolkata). Codex owns fix/content-import-publication-20261024 in Medical_Learning_OS_relationship299, base main09a0b596159cd42b3c5672c0c8e1f538b6cc33a7 (PR311). Owner screenshots report import_publication_failed after genuine Admin review submission. Scope is the engineering repair; no agent publication or fabricated reviewer/rights attestation.
- Live PostgreSQL logs at 23 October 21:39:02 and21:41:56 UTC show SQLSTATE42725 in content_library_review_publish_v1: x->'intelligence'-'derivatives' ambiguously binds subtraction before JSON extraction. The forward migration20261023214659_content_import_intelligence_grouping.sql groups the extracted JSONB before subtraction. The historical migration stays unchanged; delegate, advisory lock, version/conflict behavior, SECURITY DEFINER, empty search_path and service-only execution remain intact. No content rows or human approvals are written by the repair.
- RED reproduced the exact unknown-minus-unknown error without the forward replacement. GREEN targeted PGlite historical-wrapper-to-forward-replacement replay covers empty-derivative first publication, retries, successive derivative appends, metadata/removal/change conflicts, transactional rollback, legacy/schema1 behavior, delegated attestation/digest failures and browser denial. The legacy publisher is explicitly a component fixture; actual Medical/References/Rights acceptance and full platform migration-chain replay are not claimed. Full Node1453/1453, npm run check (13services/230coupling locations) and git diff --check passed.
- Independent readonly reviewer review_publication_grouping_fix reports no Critical/Important/Minor findings and independently reproduced RED and passed GREEN/check/diff. New coupling baseline entry was manually reviewed; no new provider/store/dependency or ownership/export gap. The CLI created this forward filename; no applied history rewritten. Exact migration SHA256be29169925d676a5200e6d8946078bd177164a9262f245232af1b15a8194d2bb.
- Live readonly inventory after failed submissions: NEETPG26-CORE6-20261024-v1 remains draft, same digestf65956bc03fac780f8539e86033b5a93542c63857c5743a95ba47fd3650c6112 and no receipt. Catalog407/questions0/notes0/review-events0; existing rights-events12 unchanged. The blank relationship JSON editor is a separate workflow, not an ordinary-question publication prerequisite.
- Exact next: checkpoint engineering/docs remotely; obtain exact-head hosted CI, merge the reviewed repair, apply only committed SQL through apply_migration, and read back ledger bytes/function privileges and unchanged private draft. At this checkpoint no live DDL has been applied. Then genuine Admin retries their review form after resolving its real gates. Never call hosted publication with a fabricated actor or substitute a clinical approval. Issues300/301/302 remain separate; no custom mutating background task retained.

## NEET-PG core-content intake — staged for genuine review
- Checked 24 October 2026, 02:58 IST. Owner explicitly requested the smallest useful selection from the dedicated Drive NEET-PG folder for website feature testing. Codex owns content/neetpg-feature-coverage-20261024 in Medical_Learning_OS_relationship299, base main359c5d246aec58f49e9ced76a0b8701fb689212d. This is content curation/staging and a docs receipt; no product code, migration or deployment changed.
- Selected6complete text questions, prepared6unapproved original AI-assisted linked note drafts,10proposed canonical concepts and8source records. Preserved source stems/options/recall lineage; proposed keys are not official or human-approved. Three medical-relationship proposals remain private/unstaged. One visibly conflicting source key was excluded rather than silently corrected. Separate2026recall material was not merged into the5285-question collection; erased pilots/fixtures were not restored.
- Existing content_library_stage_v1(jsonb,null) staged immutable NEETPG26-CORE6-20261024-v1, status draft, publicationAuthority=false, digestf65956bc03fac780f8539e86033b5a93542c63857c5743a95ba47fd3650c6112. Exact JSONB readback matches; submitted_byNULL honestly identifies service staging, not a human actor. No publication receipt. Catalog407/questions0/notes0/relationships0/clinical-review-events0 and existing12rights-events unchanged. Genuine Admin review and actual source reuse permission remain pending; no fabricated attestation or learner/research records.
- Verified original PDF SHA256, all1166extraction-file checksums, seven source-image pixel/page bindings and visual inspection of the six selected crops. Node and live read-only SQL validate the manifest;12placement items retain pending human review and unresolved curriculum; prompt-only preview question objects omit keys/explanations/private provenance. Saved35-file private review ZIP (34checksummed contents) in Drive, downloaded it and verified exact bytes/hash5d23735be7e4752014e1a0e8e66cf226bdb831857a71299015659f7a3bd87496. Companion staging receipt and NEETPG-folder pointer roundtrip match. INDEX30 preserves the old index and records only candidate staging; private source bodies/bindings stay outside Git.
- Live guest Admin intake shows Sign in to continue; there is no current authenticated cloud session and no signed-in draft/populated learner acceptance is claimed. Six questions are a practical core-workflow candidate, not all-feature coverage: full recorded180-question exam/Autopsy, clinical media/cases, verified multi-year Exam DNA, official curriculum, derivative/transfer/retention/research, load, billing/privacy and physical-device actions retain separate requirements. See NEETPG_CORE_CONTENT_STAGING.md for coverage and limits.
- Exact next: genuine authorized Admin inspects this exact draft, resolves clinical/reference and reuse-rights evidence, and performs the existing Review & publish action only after the gates pass; then run authenticated phone/tablet/desktop acceptance301 and bind any separately reviewed medical assertions to actual published versions. Current owner authorization covers selection/intake, not invented clinical facts, commercial permission or human attestation. This receipt releases implementation ownership; no custom mutating background task retained.

## Relationship registry #299 — approved production rollout verified
- Checked 23 October 2026, 15:36 IST (Asia/Kolkata). Owner explicitly approved the concrete PR309 merge, migration/API/static release with “Ok I approve you”. PR309 merged as4c6f3771935a60b46fee03eedf3d09f3437555c2; tree7505022f93674c958750c8e9f5149f0d5c541430 equals reviewed3660aa7. Codex owns docs/relationship-registry-release-20261023 in Medical_Learning_OS_relationship299 for this receipt; no runtime edits after merge.
- Applied committed20261023091436_medical_relationship_registry.sql as provider-ledger20261023095946 medical_relationship_registry. Readback of its single SQL body SHA25669493ff4704ca3488b87c6a4ae8f09eb7f0ccb9ed2ccae87269a3fb7491ae74b equals the exact reviewed file. Both new tables RLS/no browser access/no service direct write/immutable triggers; five external RPCs plus snapshot service-executable, internal helpers/browser execution denied, fixed empty search_path verified.
- Live catalog remains407 with0concepts/0sources/0questions; registry0versions/0events; feed/snapshot arrays empty. Existing Admin inspection is empty with actual current three grants; no actor ID exposed. Privacy v10 complete=true, missing/unmapped[]. Security adds only expected two INFO no-policy service-only ledgers; existing leaked-password WARN unchanged. No new unindexed FK; new covering indexes unused on empty registry.
- Library APIv7 ACTIVE/all8files byte-exact merged source; only handler changed fromv6. Existing verify_jwt=false plus actual Auth/runtime checks preserved. Study API unchanged. Git-triggered Cloudflare website64fda0cd-f124-43a4-99f5-b4fe2cb1111e, heartbeatcd07dc94-7160-4097-8261-a925f916155f and existing sandbox2fa31988-f353-48ec-92c8-45f29d7f6ea4 builds SUCCESS at exactmerge. No manual deploy/auth attempt/provider/security/billing setting or payment changed.
- Canonical HTML/controller200 with byte-exact source; .html307 canonical redirect followed. Anonymous Library/relationship endpoints401 and direct new-table requests401/42501 denied. Fresh live guest Chromium shows relationship section with staging disabled and Sign in to continue. No live authenticated/populated acceptance is claimed. Cloudflare Dashboard ordinary sign-out did not block the verified Git deployment; no need for credentials or login handoff.
- Final release checked 23 October 2026, 19:45 IST. Feature Foundation39933609853 and post-merge Foundation39935853125 are ALL SUCCESS:1453Node tests, six disposable PostgreSQL checks, Chromium and WebKit. Main Chromium attempt1 hit the15-minute limit after dependency installation consumed about9m38s, without a product assertion failure; the single targeted retry120458461843 passed all steps, including172navigation leaves and adjacent workflows. Core/WebKit successes were retained; no runtime/CI settings changed. Retry artifact12507152590 ZIP SHA256f6b712833c4616584c876de281da322eb25a279892e22a4980faf26a341af12e; original final-feature screenshots remain the inspected visual evidence.
- Engineering release and verification complete; issue299 CLOSED as completed, with clinical launch gates explicitly retained. Final operational receipt is docs-only PR310; tested runtime remains merge4c6f377. Exact next work remains genuine source/provenance/rights review and authenticated populated acceptance301, pagination300 or deeper graph exploration302 as separately selected. Real multi-connection contention and extended-schema hosted restore remain unverified. No real claims, source imports, grants, attestations, learner responses or research enrollment created. Ownership releases after this receipt is saved; no custom mutating background task retained.

## Relationship registry #299 — engineering complete, production authorization pending
- Checked 23 October 2026, 15:21 IST (Asia/Kolkata). PR309 / feature/relationship-registry-299-20261023 is ready for review, based on main d93fea09cec4ff07b546ed0ec76f4a18c6bf4a60. Product code026d2eb642827a9ffebe765f0250ce6aa4b9d41d; final tested code/test head3f9c112f3b93073bca77a07ba27d7e0e4585e29c / treeb414a7deff2006fa3df1e868fe74048cb236c086. This final checkpoint changes Markdown only; it does not rerun identical runtime jobs. Local worktree Medical_Learning_OS_relationship299 is preserved for the rollout/review.
- Completed protected immutable assertion/version and lifecycle ledgers, exact source/endpoint bindings, current actual singleton-Admin/reviewer/rights gates, service-only RPCs and trusted learner snapshot. Existing Import & review supports external-curator staging, exact-target inspection/attestation, corrections, immutable history and retirement. Client actor/verification injection cannot authorize publication. No question co-occurrence becomes a clinical assertion.
- Final1453/1453 Node tests and all six disposable PostgreSQL checks PASS: relationship authority/rights/expiry/rotation/drift/latest suppression/immutability/idempotency/rollback/role isolation, question intelligence, access manifest, recovered baseline, privacy scope and chronological ACL71tables195statements. Syntax/decision/portability13services229locations,110-file build and whitespace pass. PostgreSQL fixtures execute exact migration/helpers on minimal platform shapes, not a full hosted platform or concurrent-session rehearsal.
- Foundation39933609853 at3f9c112: check, Chromium and WebKit ALL SUCCESS. Relationship stage/inspect/approve/graph/correct/retire, errors, current rights/grants, delayed editor locks, dirty edits and escaped claims pass phone/tablet/desktop alongside all adjacent journeys. Final screenshots from12493172036 inspected; ZIP SHA25645ad034d9807f8ef45911b7963f53f6c5d7efa7c8543231fed59dd98a695a037. Hosted static artifact12493215522 matches all110local files byte-for-byte; ZIP SHA256dd1451d8cd8a02fbe2761337a55c7d980ea74ed8426da91645d7643e1b2123dd. Local browser engines were unavailable; hosted acceptance supplies these results.
- Independent fresh whole-branch reviewer found no Critical/Minor and one Important pending-save edit loss. Four regressions failed before the fix; all editors lock during awaited saves/inspection, failed saves preserve changes and another form's draft needs explicit discard confirmation. Five UI regressions and full1453 suite pass. No second review claimed. Earlier browser failures were missing-panel RED and two fixture defects (per-tab interception; assuming a concept stayed public after its only eligible claim disappeared); final corrected assertions include zero edges/no draft leakage.
- Exact migration/API/controller hashes, deployment order, evidence and limits: releases/2026-10-23-relationship-registry-development-acceptance.md and MEDICAL_RELATIONSHIP_REGISTRY.md. No merge, production DDL/API/static deployment, clinical content, grants, human attestation, learner responses, research enrollment or provider setting changed. Previous production release remains live; no new live authenticated/populated acceptance claimed.
- Rulings/limits: intake is external-curator-only under ADR-097; native self-authored assertions need a separate supported review path. Clinical/provenance/rights truth requires genuine human review. Inbox is latest100 versions; pagination300 remains separate and older identities may need exact IDs. Multi-connection contention and full hosted restore of this new schema remain unverified. No deferred Minor findings. Private supplied material stays unapproved and outside Git.
- Exact next: obtain explicit authorization for PR309 merge plus the committed transactional migration/API/static rollout, then follow the receipt and verify live grants/RLS/security advisors, unchanged empty catalog, empty registry and protected/anonymous API behavior. Never attest or publish clinical assertions on the agent's behalf; populated expert-content acceptance301 and deeper exploration302 remain open. Issue299 stays open for rollout. Implementation ownership releases after this verified checkpoint; no custom mutating background task retained. Other branches untouched.

## Relationship registry #299 — reviewed implementation, release pending
- Checked 23 October 2026, 15:08 IST (Asia/Kolkata). Codex owns PR309 / feature/relationship-registry-299-20261023 in isolated Medical_Learning_OS_relationship299, base main d93fea09cec4ff07b546ed0ec76f4a18c6bf4a60. Latest code026d2eb642827a9ffebe765f0250ce6aa4b9d41d / treed7dc7f48fb8aa6afdb1ff196b8363b4e8cd23416 is saved remotely. Production release is not authorized by the engineering checkpoint; no live DDL/API/static/clinical changes performed.
- SQL registry, current singleton Admin/reviewer grants, exact source/endpoint bindings, immutable publication/retirement and trusted learner snapshot are implemented. Existing Import & review now stages/inspects externally authored assertions, binds actions to digest, shows live gates/history, prepares corrections and supports retirement. API identities derive from Auth and strict envelope validation. Registry/rollback/export documentation is MEDICAL_RELATIONSHIP_REGISTRY.md; migration README explicitly marks development only.
- Fresh full1453/1453 Node tests,15focused controller/route/adjacent draft tests, npm check13services229locations,110-file build and diff whitespace pass. Exact new SQL and genuine current helper fixture PGlite passes; latest helper includes singleton Admin rotation. Earlier existing privacy scope and71-table/195-statement chronological ACL replay passed locally and hosted check39932206590. Initial migration/routes tests failed before implementation.
- Hosted RED39931728460: Chromium/WebKit correctly failed missing panel. First UI run39932206590 check SUCCESS; both browsers reached publication then failed learner graph because test interception covered only Admin tab. Corrected fixture to context.route covering both tabs; no product graph fix was inferred. Latest026d2eb Foundation39933229293 remains IN PROGRESS; no final browser acceptance claimed yet.
- Fresh independent whole-branch reviewer relationship299_code_review read SQL/API/UI and passed22focused/PGlite. No Critical/Minor, one Important pending-save edit loss. Four regressions failed first; all editors now lock through awaited mutation/inspection, failure retains edits and unsaved work in another form requires discard confirmation. Five UI regressions and1453full now pass. No second independent review claimed.
- Builder/review rulings: external-curator-only follows ADR-097; native self-authored clinical assertions need a separate reviewed path. Genuine clinical/provenance/rights truth cannot come from engineering fixtures. Latest100-version Admin inbox is bounded; pagination300 remains separate and older identities may need a known exact ID. Real multi-connection contention is unverified; single-connection PostgreSQL behavior/locks/predecessor checks and code review are not concurrent-session acceptance. Production rollout and populated clinical acceptance301 remain pending. No deferred Minor findings.
- Exact next: inspect final Foundation39933229293 Chromium/WebKit results (including delayed edit locks and context-scoped learner fixture), repair any reproduced failure, inspect generated phone/tablet/desktop screenshots; then finish plan/docs/PR ready status. Preserve clinical emptiness and immutable audit history; present the concrete migration/API/static release for authorization. Other open PRs/branches untouched. No custom mutating background job retained.

## Relationship registry #299 — development checkpoint, 23 October 2026
- Checked 23 October 2026, 14:55 Asia/Kolkata. Owner “Next” selects the previously recorded next task. Codex owns feature/relationship-registry-299-20261023 in Medical_Learning_OS_relationship299, based on main d93fea09cec4ff07b546ed0ec76f4a18c6bf4a60. Code checkpoint 4b79a3f0eb9b87a469718a8932c7e9443f4f2131 / tree7cac2b86020695874964c47dc540951c830e60d1 is saved remotely. Other branches remain untouched.
- Implemented immutable relationship versions and publication/retirement receipts, exact assertion/source/endpoint bindings, current reviewer/source-rights checks, service-only RPCs and trusted Library snapshot. Authenticated relationship routes require current Admin and derive actors from Auth; client approval flags cannot supply authority. External-curator provenance preserves ADR-097; native self-authored clinical assertions are outside this intake.
- Baseline1441/1441 and current1448/1448 Node tests pass. Six new route behaviors failed first because routes were absent; one async failure escaped the outer handler, fixed with awaited invocation and regression. New PGlite test failed on absent migration then passed exact SQL: stale targets, grants/expiry, rights, retirement/correction, immutable rows, rollback, retries and browser/service denial. Existing privacy scope check passes. ACL replay initially failed because future tables were created before chronological migration replay; replay now creates each shape at its actual migration boundary and passes71tables/195statements. npm run check passed13services/228locations before adding the new browser journey path.
- Builder check identified external-curator versus native-author distinction, resolved from ADR-097 and documented. No clinical source content, human attestations, real grants, live learner data or research enrollment created. No production DDL, API/website deploy or clinical publication performed. Live catalog remains the separately verified empty v407; this checkpoint is not live registry acceptance.
- Unfinished: Admin relationship panel, browser RED→GREEN (new journey is intentionally added before panel), independent code review and exact-head final checks. Issue299 remains open; pagination300, populated real-content acceptance301 and deeper exploration302 stay separate.
- Exact next: open draft PR, observe missing-panel browser failure; implement the panel on existing Import & review; run Chromium/WebKit phone/tablet/desktop, local SQL/Node/check/build, independent review, then prepare the concrete release for review. Do not deploy this WIP. No competing writer or custom mutating background task retained.

# Current status

## Graph integration released and main verified — 23 October 2026 (Asia/Kolkata)
- Owner “Next” completed PR303 integration. Runtime dd5424eddcba97587f0b2c2032ccb62b1a315e58 merged as ff46e6d9207d5fc0766246b8b88c7ff5b19324a5; tested/merged tree94bfad145755f7a83422ecc02ce549eb79cd2411 matches exactly. Codex owns the final docs-only reconciliation on docs/preparation-curriculum-review-20261023 / PR308; its earlier material-readiness changes are preserved alongside this release receipt. Other open branches remain untouched.
- Preparation and graph now agree on visible endpoints and exact source rows. Shared conceptNeighborhood scopes original API inventory, covering the actual UI call path. Six new regressions cover goals/foundations/all, empty/invalid focus, immutable input and source availability. Three first failed, a source-retention assertion failed after endpoint repair, and two reviewer reproductions failed before the raw-renderer fix. Independent review had one Important finding, now fixed; no Critical/Minor findings or second independent review claimed.
- Final1441/1441 Node tests,35focused tests, syntax/decision/portability13services/226locations,109-file build and diff against main pass. Feature Foundation39926198142 AND main Foundation39927285345: check, Chromium and WebKit ALL SUCCESS. Five-width synthetic goal/foundation/all, Back/reload, positive/revoked/retired graphs, bounds, escaping, draft isolation and adjacent journeys passed. Phone/iPad-landscape/desktop screenshots inspected. Hosted109-file artifact equals local build; ZIP SHA256a3978574ee002fb356d4f2a1903bef78df49484080423f95ff289c16a199a363.
- Production website build61fe2600-5f9a-4a99-84f9-a2cf6dc89230 and heartbeat buildd0828e0d-ac27-44bc-9c41-72812f9ce9fd SUCCESS. Library APIv6 ACTIVE/all8files and Study APIv52 ACTIVE/all10files exactly match merged source. Existing verify_jwt=false and server Auth/runtime checks preserved; only preparation domain changed in the Study bundle. All5changed public runtime assets returned200 with exact source bytes; anonymous Library and consent endpoints returned401 unauthorized. Initial direct asset403 was followed by successful curl readback, with no cause inferred.
- Live cloud-Chromium guest reload retained the Medical graph URL and safe sign-in return target. Prior authenticated tab/session was gone; no new signed-in or populated medical-content acceptance is claimed. Read-only SQL confirmed catalogv407, concepts0/sources0/questions0 and no medical snapshot feed. No SQL, clinical publication/review, content restoration, research enrollment, learner response or provider setting changed. Current protected-registry work remains issue299; issue301 stays open.
- Earlier local Chromium installation failed (invalid archive); hosted suites supply browser acceptance. Earlier1399baseline overlapped merge exploration and is not clean baseline evidence. Staged merge whitespace warning concerned a pre-existing EOF blank in main's retention receipt; current-main diff passes and unrelated text was preserved. See releases/2026-10-23-medical-graph-integration-release.md for precise evidence limits and PREPARATION_CURRICULUM_READINESS.md for already-archived private material (INDEX29/rules6/privatev0.23), still unapproved.
- Exact next: implement issue299's protected relationship/version registry, actual reviewer/current-rights receipts, immutable publication/retirement, Admin controls and trusted feed with disposable PostgreSQL authority tests; keep source/clinical/rights review genuine and the live catalog empty until publication gates pass. Issue300 pagination,301 populated acceptance and302 deeper exploration remain separate. This task's implementation ownership releases after the verified docs checkpoint; no custom mutating background job retained.

## Graph PR303 integration with current main — 23 October 2026
- Checked 23 October 2026, 14:08 Asia/Kolkata. Owner “Next” resumes the existing approved read/display slice. Codex owns PR303 remote feat/reviewed-medical-graph-projection-20261022, original head96a8010923ad98fcbcdb74456283c188ef6c6923; local isolated worktree Medical_Learning_OS_graph303 on integrate/graph303-current-main-20261023 merges main26b9c0f48b7f70a36a38afe714794cf36f9d72f9. No competing writer observed. Preparation/retention releases are retained. PR308 remains a separate open supplied-material readiness reconciliation.
- Reproduced three documentation merge conflicts; retained newer main receipts and historical graph matrix. Existing runtime files merged cleanly but executable tests exposed scope inconsistency: medical relationships survived excluded endpoints and lost their referenced source rows. Three regressions failed first; endpoint filtering left a separate source-retention failure, then both were fixed.
- Independent read-only reviewer found one additional Important actual-renderer bypass: the UI passes original API inventory to conceptNeighborhood. Two raw-entry regressions failed first; applying preparation scope at that shared boundary fixed medical/exam/learning entry consistency. Six integration regressions now cover goals/foundations/all, invalid/unmapped, input immutability, source metadata and original API renderer calls. No Critical/Minor findings. No second review is claimed; the material finding was fixed and verified by the root.
- Fresh final full1441/1441 Node tests and35focused tests pass; npm run check passes13services/226couplinglocations;109-file build, syntax and whitespace checks pass. Earlier1399 baseline run overlapped the exploratory merge and is not clean baseline evidence. Local Chromium binary was missing and download returned an invalid archive; no local browser acceptance is claimed. New actual-controller five-width graph/preparation scope and Back/reload cases join existing positive/revoked/retired/draft tests; hosted Chromium/WebKit remain pending.
- Scope remains read/display only. #299 protected DB versions/reviewer grants/current rights/publication/retirement/snapshot feed remains unimplemented; clinical validity/learning efficacy and genuine reviewed-content acceptance under301 are separate. No clinical data, review attestation, research enrollment, learner response, SQL or provider setting changed. New module must be bundled wherever content-library.js is imported; existing APIs currently have no medical feed and correctly show empty graphs.
- Exact next: save this tested integration to the original PR using a non-forced expected-head update, verify remote tree/head, inspect exact-head hosted checks and repair any reproduced failure before merge/release claims. Keep issue299/301 open and include current preparation/account behavior in rollout readback. Codex retains implementation ownership until the final saved receipt; only normal CI/provider build jobs run remotely.

## Preparation curriculum and supplied-material readiness — 2026-10-23
- Checkpoint receipt checked2026-10-23T07:21Z: documentation commit27b21c67d850ca108f3888e181f09d0aeea32e3d, treec0a1ddfa21e1a0baf1512250e80d46a6360f5ca3, saved and fetched byte-identically on the owned branch; PR308 OPEN, not merged. Foundation39917058815 was queued at this receipt, not a passing result. This follow-up records the prior commit and PR; no code commit exists for this docs-only task.
- Checked2026-10-23T07:15:08Z against main26b9c0f48b7f70a36a38afe714794cf36f9d72f9. Connected material is already archived: live governance INDEX29 / ACTIVE_RULES6 identifies private working v0.23, extending the v0.21 evidence freeze. This supersedes a blanket “awaiting supplied material” description, not human review or release gates.
- Reported unified inventory:5285 question identities/5358 appearances;204 older items have provisional subject tags;33 classification rechecks proposed9 revisions with3 cases still unresolved. No human subject/clinical approvals or official year verifications. Frozen review requests cover20 source-incomplete questions/21 appearances and12 unsigned clinician packets; all other material also remains unapproved and rights remain unknown.
- Separate NEET-PG2026 extractionv2:171 fragments,103 structurally complete drafts,68 source-gap fragments and8 priority review packets. Structural completeness does not mean clinically valid or study-ready. No merge with the unified bank was performed or inferred.
- PREPARATION_CURRICULUM_READINESS.md records evidence read, current-version precedence, source acquisition limitations and exact publication/mapping dependencies. No private clinical text, Drive IDs or source media copied into Git; no production registry/runtime/database changes. Full dataset hashes/clinical references were not independently revalidated in this metadata reconciliation.
- Retention main Foundation39915010221 now ALL SUCCESS: check, browser/Chromium, WebKit. This docs-only task passed25existing preparation tests, npm run check (13services/226couplinglocations),32relative-link checks and diff whitespace validation. Clinical publication and populated live acceptance remain pending genuine source/rights/reviewer evidence; next independent engineering candidate is existing PR303 integration.

## Inactive retention pilot fix deployed and accepted — 2026-10-23 (Asia/Kolkata)
- Owner “proceed next” completed issue265's Account warning fix. Runtime8841addab39be7df5889245eb415c81947c87f06 merged through PR306 as cecce6cc1a4f83cd40679a5bc7a48c6f785db10c; merged treeb15c471aef967236cd77be346f7b80d92750f8e9 equals the tested feature tree. Codex owns docs/inactive-retention-release-20261023 for this docs-only receipt; unrelated PR303 remains untouched.
- Verified root cause: the successful consent RPC returns SQL NULL when no preregistered optional protocol exists. The GET now returns explicit inactive status, null protocol/event and all authority flags false. Registered receipts/consent writes remain unchanged. Real errors remain500; independently loaded account metrics remain visible and unavailable metrics remain unknown. Account renders inactive without opt-in/withdrawal controls or a false global failure warning.
- Verification: baseline1411Node tests; two new reproductions failed before implementation. Focused47tests and full1420/1420Node tests pass; syntax/decision/portability13services/226locations and108-file bundle pass. Independent reviewer and follow-up found no Critical/Important/Minor findings. PR Foundation39914014198 core, Chromium and WebKit ALL SUCCESS, including five-width inactive/error/registered/reload cases and full adjacent regressions. An obsolete source guard banning the entire word mastery was narrowed to actual mastery RPCs/true authority without weakening behavioral checks.
- Production frontend build628f4698-6902-4b5a-940e-e2d1bc7ec929 SUCCESS, web version0a6d3788-d814-46e4-a21b-f27459bcb243. Heartbeat build5263072a-4eab-432e-bfbf-11237f2e65b3 SUCCESS, version1d97a4d6-b0dc-4237-bcab-9bcb9ceb4bc9. Study APIv51 ACTIVE, all10files byte-identical to merged source; existing verify_jwt=false/server token+runtime checks preserved. Served account.js matches merged bytes. Anonymous consent read returns401 unauthorized. No migration, privilege/origin configuration change or new service.
- Real signed-in cloud-Chromium acceptance: reproduced warning/unavailable consent with visible0/0/0learning metrics before rollout. After coordinated frontend/API deployment, reload showed Retention feasibility: inactive, no failure warning, no unavailable message, no opt-in button and the same metrics; explicit Refresh session completed with the same healthy result. Workspace/browser briefly disconnected and were restored; the authenticated session survived, without another login. Initial immediate post-deploy locator observation timed out; subsequent fresh DOM and refreshed-page assertions confirmed the actual completed state. No credentials, private identifiers or account screenshots are recorded here.
- Post-release read-only database counts: optional protocols0, consent events0, assignments0. No pilot recreated, research enrolled/scheduled, learner answers/ratings or content changed. Registered-protocol/failure/device cases use synthetic tests; no deliberate live database/network failure or native-device acceptance is claimed.
- Main Foundation39915010221 core SUCCESS; duplicate post-merge Chromium/WebKit suites still running at this receipt. Runtime bytes equal the already-green PR source; do not claim these pending jobs passed. Exact next: record their eventual results if needed, then continue reviewed NEET-PG/INI-CET objective mappings and supplied-content acceptance under normal human source/rights/publication gates. Issue265 can close for this fix; separate domain/merchant work remains under266. Codex releases implementation ownership after this saved receipt; no custom mutating background job retained.

## Inactive retention Account fix — implementation checkpoint, 2026-10-23 (Asia/Kolkata)
- Owner “proceed next” resumes issue265. Codex owns fix/inactive-retention-account-20261023 from main4e555b5fc7b1eb25492954d6c60b636b1ab9df15. Other branches/PR303 untouched. No production rollout yet.
- Root cause verified against deployed study-api v50 and live SQL definition: no preregistered protocol makes the read RPC return SQL NULL; API classified that as500. Live protocol count remains0. Successful missing-protocol reads now project inactive status with protocol:null, no consent event and all authority false. Account hides opt-in/withdrawal without a spurious data warning; real errors stay errors and available metrics remain visible. No SQL/migration, enrollment, scheduler, Auth/origin change or content restoration.
- New executable route/controller tests first reproduced2expected failures; focused15 then47tests passed. Baseline1411Node tests passed. First full changed suite1419/1420 had one obsolete source-text guard matching masteryInferenceAuthority:false; reviewed guard now rejects actual mastery RPCs/true authority instead. Fresh full suite1420/1420passed. Syntax/portability13services/226locations and108-file build passed. Independent read-only review found no Critical/Important/Minor findings; focused reviewer17tests passed. Reviewer rechecked guard/docs and independently passed47focused tests; no findings.
- Expanded existing five-width preparation acceptance with inactive, genuine-failure, registered and reload cases. Hosted Chromium/WebKit and final full suite remain pending; do not claim deployed/live acceptance from synthetic coverage.
- Exact next: save this checkpoint/PR, inspect fresh full suite and hosted checks, repair reproduced failures, then perform the coordinated study-api/frontend release and authenticated Account readback. Keep optional research inactive and genuine errors distinguishable. Implementation ownership remains Codex; no custom mutating background job.

## Preparation production release verified — checked 2026-10-23 (Asia/Kolkata)
- Owner's “Next” completed the recorded PR304 release. Codex owns docs/preparation-release-receipt-20261023 from merge/main 8d37ff3da549573982d827637311f22cc09d8af5 (tree 069f432ce6c664ed70370308c0c8172f4f35096b); receipt PR305. PR304 is merged. Unrelated PR303 and other branches remain untouched. Merged source exactly matched the freshly tested task tree.
- Fresh local 1411/1411 Node tests, syntax/decision/portability checks (13 services / 226 coupling locations) and 108-file build pass. Exact main Foundation39859651120: core, Chromium and WebKit ALL SUCCESS, including preparation, workspace, responsive navigation and adjacent learner journeys. https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/39859651120 . Earlier feature Foundation39845183157 also passed all three jobs.
- Production: content-library-api v5 (7 files), study-api v50 (10 files), every deployed file byte-identical to merged source, including the shared preparation modules. Existing verify_jwt=false plus server auth.getUser/runtime-access checks preserved. Both anonymous reads return401 unauthorized; Cloudflare origin preflights return200 and correct CORS; unknown origins return403 without allow-origin. No SQL migration or authorization change.
- Cloudflare web build acb712f9-3050-4804-a92d-086684ef01ee SUCCESS / version9172cf7d-1bfa-4b08-8a0a-88ca2388ab93; heartbeat build7055fb7d-6063-4cd0-bd13-a361aadf8f7f SUCCESS / version32fe923a-91bd-4383-b668-0b5a4cda0fe9. All12 changed public bundle files match production byte-for-byte; Account and Library HTML also match. This is production readback, beyond a preview receipt.
- Real single-account cloud-Chromium acceptance passed after secure user-provided email sign-in: saved Both (NEET-PG + INI-CET; primary NEET-PG), reloaded and observed confirmed saved goals, opened authenticated Library, switched foundations/all scope and restored both through Back/Forward. Separate NEET-PG/INI-CET inventory states honestly say Not mapped yet. Authenticated Study reads zero attempts/questions and shows the empty-catalog state. No answer, rating, consent, billing, content publication or clinical import performed. Only the requested combined preparation preference was saved; existing account identity was retained. No credentials or private identifiers are recorded here.
- Limits: no real populated curriculum/question/session existed, so live recommendation selection, non-empty cross-view material and unfinished-session preservation were not exercised with real content. Those behaviors have synthetic automated coverage. Live native iPad/cross-device and two-real-account checks were not repeated. Account's optional retention consent panel reported unavailable and a partial-data warning; this pathway release does not certify that optional service or infer a cause. That read failure remains a bounded follow-up before any retention-pilot onboarding.
- Exact next: populate real reviewed curriculum requirements and exact approved artifact bindings through existing human source/rights/publication gates, then perform a real-content Library→Study loop. Diagnose the optional retention-consent projection separately without enrolling learners or changing research authority. Never restore erased pilots, fabricate clinical mappings or claim syllabus completeness/mastery. Future pathways remain unavailable. Codex releases implementation ownership once this docs-only receipt is saved/integrated; no custom mutating background jobs retained.


## Preparation foundation complete and ready for review — checked 23 October 2026 (Asia/Kolkata)
- Objective completed by Codex on feat/combined-preparation-pathways-20261023, PR304: https://github.com/mdmoazzam291/Medical_Learning_OS/pull/304 . Base main288b84100cbb64e44702065314727154cecdd7ba remains unchanged; unrelated graph PR303 was not modified or merged. Final tested runtime0bddf286b8bebdbf6aa38ac31a859602374af796 / tree438692ca701605e85a715cd2ffd0477a972044b0. Receipt commitb35ff655b24bedb66be2ba3e3d82259811226e70 and subsequent final receipt alter documentation/register text only; no runtime changes follow the tested code.
- Foundation39845183157 attempt2: **coreSUCCESS, Chromium browserSUCCESS, WebKitSUCCESS**. Both engines passed the new5width Account save/reload/retry/account-switch isolation and Library goals/foundations/all, exact-note dossier, Back/Forward and unmapped-curriculum checks. Full adjacent navigation, Study, Library/Admin draft isolation, Vault, Exams and other existing journeys also passed. Attempt1's cancelled Chromium job followed9minutes of dependency installation and the15minute job deadline; only that job was retried, with no runtime changes or test relaxation. Earlier cancellation/failure records below are historical and superseded by this exact-source acceptance.
- Local1411/1411Node tests, full syntax/portability check13services/226locations,108-file production bundle and focused34preparation/state tests passed. Independent read-only review found no remaining Critical/Important product issues after reproduced scope, navigation and account-isolation defects were fixed. Public sign-in markup remains frozen independently of authorized authenticated Account changes. The simulator registry is byte-identical to main.
- Delivered: shared canonical NEET-PG/INI-CET/Both preparation, synced learner preference (not authority), versioned objective/context/prerequisite/requirement/artifact contracts, consistent Library scope and per-exam inventory, metadata placement warning, and scoped new Study Now plans with existing-session and history preservation. Two active preparation identities ship; objective/mapping/artifact registry remains intentionally empty until genuinely reviewed material is provided. Future pathways and additional assessment runtimes remain unavailable. See PREPARATION_PATHWAYS.md.
- Saved source and tested tree were independently verified through GitHub. PR304 is being marked ready, not merged. No production API deployment, database migration, actual learner-data mutation, clinical content publication, erased-content restoration or new paid service. The successful Cloudflare feature-preview build is not production release or live authenticated acceptance.
- Next owner-authorized release task: review/integrate PR304; deploy the matching frontend, content-library-api and study-api including shared preparation modules; verify real signed-in Account/Library/Study behavior. Then add reviewed curriculum requirements and exact published bindings through normal human content/rights review. Keep initial pathways free of invented syllabus-completeness or mastery claims. Existing Home/QBank/revision inventory counts remain full-catalog evidence; goal focus is Library/new Study Now plus per-exam mapping inventory in this foundation.
- Codex releases implementation ownership at this saved receipt. No custom mutating background job retained; verification jobs completed. Incoming agents should resume from actual PR/main metadata and this receipt, not the older active/WIP checkpoints below. Do not repeat completed fixes or auto-merge unrelated work.


## Preparation foundation saved; final Chromium retry — 23 October 2026 (Asia/Kolkata)
- Codex owns feat/combined-preparation-pathways-20261023 / draft PR304, base main288b84100cbb64e44702065314727154cecdd7ba. Final runtime0bddf286b8bebdbf6aa38ac31a859602374af796 has exact tree438692ca701605e85a715cd2ffd0477a972044b0. Remote/local source-tree parity, unchanged main and mergeable PR were verified. Subsequent receipt/register edits are documentation-only.
- Complete code: existing canonical workspace reused; validated exam/objective/context/prerequisite/binding registry; synced NEET-PG/INI-CET/Both preference; consistent goals/foundations/all scope and per-exam inventory; new Study Now selection uses shared requirements; existing sessions and historical evidence remain authoritative. Source contains two active preparation identities and no fabricated clinical objectives/mappings/content. Simulator registry is byte-identical to main. Curriculum authoring/rights review and actual medical publication remain separate.
- Verification:1411/1411localNode tests; full syntax/portability check13services/226locations;108-file bundle. Independent reviewer confirmed no remaining Critical/Important product finding after scope/history and account-isolation fixes. Final new preference/scope/account-switch tests passed at5widths in BOTH hosted Chromium and WebKit, as did the existing unified workspace/draft-isolation tests.
- Foundation39845183157 on exact runtime0bdd: coreSUCCESS and fullWebKitSUCCESS. Chromium attempt1 installed dependencies from20:02:12 through20:11:50UTC, then passed new preparation/workspace and prior adjacent journeys. Job hit its15minute deadline during old navigation at20:17:23; no failing application assertion was reported. Reran ONLY cancelled browser job120056845505 on the same source; final broad Chromium acceptance remains pending. Preserve success-vs-cancellation distinction.
- No main merge, production API deployment, schema change, real learner write, content ingestion or new paid service. Cloudflare feature-preview build15679dc7-ead2-4409-8c41-f09f090af897 SUCCESS is a preview, not production release. Source has no live authenticated acceptance claim.
- Exact next: inspect attempt2 browser job for39845183157, repair any reproduced code failure, then record its final receipt, mark PR ready and release ownership. Normal release needs coordinated frontend/content-library-api/study-api rollout (include preparation-pathways.js and preparation-curriculum.js imports), then real signed-in acceptance. Populate reviewed curricula/real artifacts through existing review gates; never restore erased pilots.


## Final account-owner isolation regression — 23 October 2026 (Asia/Kolkata)
- PR304 runtime7c358cfad245431ad0e7f57015ffbaaf1306cb1a / treea76dff8abdfca5612aa2dd3b6dd8ae9af9f33c4c passed hosted core checks and the new five-width WebKit preparation step in Foundation39844636236; remaining job results were still running at inspection. Local1410Node tests, full check13services/226locations and108-file build pass.
- Reviewer found one further case: starting a fresh load as learnerB after learnerA could retain A's preference if B's read failed. New RED→GREEN regression verifies the profile clears on identity change; the same reset clears previous progress/question/consent/admin display caches. Added browser coverage that changes the stored synthetic identity, fails its preference read and verifies no saved-goal display leaks.
- Follow-up remains on this owned feature branch, no release/merge or production request. Full fresh suite and final saved-head hosted acceptance are required before ready-for-review. Earlier failed runs remain superseded evidence, not successes.


## Preparation review corrections and hosted acceptance — 23 October 2026 (Asia/Kolkata)
- Active Codex branch feat/combined-preparation-pathways-20261023, draft PR304. Saved code7d3be4060a10c70ce896d275ff396db75f8f458f has exact treeb28df63469a0330910af693f63aba584c316b906; source trees verified equal locally/remotely. All1407Node tests pass on this scope-fix implementation; static build108files passes.
- First hosted Foundation39844047399 core failed only on the new synthetic-auth browser marker missing from the portability baseline. Reviewed script intercepts every existing-origin request; explicitly added its single path/provider pair (13services/226locations). No new service. Chromium passed all earlier adjacent journeys, then new preparation flow timed out on a standalone note-title selector; actual dossier displays the title in a provenance line. Selector now targets that actual line. WebKit pending at this checkpoint; no hosted full acceptance claimed.
- Independent review confirmed all3original scope fixes and found a late account projection could restore a signed-out learner or old access display. Added generation/identity guards before preference/account writes and after reviewer access, with2RED→GREEN VM regressions. Equivalent metadata field/goal ordering now canonicalizes before save confirmation; regression passes. Failure wording no longer claims an ambiguous remote write definitely left the old preference intact.
- Current local follow-up is being saved to the same PR; fresh full suite/check/build and hosted Chromium/WebKit results remain required. No merge, production deployment, clinical content/mapping, schema or learner evidence change. Exact next: inspect new saved-head CI, repair real failures, obtain final read-only review receipt and release ownership at final checkpoint.


## Combined preparation foundation — checked 23 October 2026 (Asia/Kolkata)
- Owner requested implementation of shared canonical NEET-PG + INI-CET preparation after inspecting existing work. Codex owns feat/combined-preparation-pathways-20261023 from main288b84100cbb64e44702065314727154cecdd7ba. Existing workspace/dossier PR296/298 are merged; older workspace-blocker paragraphs below are stale. Separate medical-graph PR303 is untouched.
- Initial code checkpoint2370770d1acd0e27d601f670c37384c22e8f0e58 saved through the connected GitHub app, exact tree18ae899ff7da25fdf58e08f4cec2f05d78be221b equals local implementation. Direct git push lacked credentials; no credentials requested/exposed. Current follow-up fixes/browser acceptance are being saved on the same branch; PR metadata owns subsequent exact head.
- Added validated pathway/objective/requirement/artifact contracts; synced learner preference via existing Auth metadata (never authority); Account NEET-PG/INI-CET/Both selector; Library goals/foundations/all scopes and separate exam inventory; scoped new Study Now plans with unchanged open-session resume. Registry intentionally has no invented clinical requirements/content; future pathways remain unavailable. See PREPARATION_PATHWAYS.md.
- Baseline1384Node tests passed. First changed full suite had one obsolete whole-Account hash guard failure; narrowed it to preserved public sign-in markup after reviewing authorized signed-in changes. Focused27tests pass; syntax/portability pass13services/225locations. Full fresh suite and hosted browser acceptance remain pending.
- Independent read-only reviewer found3Important scope issues (nested all-mode dossier re-filter, subjects/bookmarks bypass, replaced history). Added reproductions and fixes; focused15tests pass, including history RED→GREEN. Local Chromium download succeeded but launch is blocked by socket Operation not permitted; this is an environment limitation. New five-width synthetic Account/Library acceptance is wired for hosted Chromium/WebKit and has not yet passed.
- Exact next: save follow-up/checkpoint, inspect full suite/check/build and hosted responsive results, fix any actual failure, obtain reviewer recheck, then record final receipts. No merge, production API deployment, SQL change, medical ingestion, learner write or simulator modification performed. Implementation owner remains active; no mutating remote job outside normal verification workflows.

## Workspace re-audit and reviewed-relationship projection — 2026-10-22
- Current main `288b841` includes merged PR296 (shared Library workspace and isolated placement preview) and PR298 (source-grounded structured dossier). Direct GitHub check readback confirms core, Chromium, WebKit and provider builds succeeded. PR297 records ACTIVE content API v4; no fresh live API/session/database claim is made by this audit.
- Old PR296 “implementation pending” and handoff blocking-review text is historical, superseded by the merge receipt and current handoff. Focused graph/dossier/inspector tests pass, including the previously blocking context-list bound.
- Continued existing draft PR303 rather than creating a duplicate foundation. Four reproduced fail-closed gaps repaired: current-source fingerprint mismatch; ambiguous source/concept identities; invalid version states allowing old publication fallback; and reused exact relationship-version identities. Directed graph arrowheads now stop outside target nodes. Tests cover trusted-service handler projection, no cached fallback, synthetic five-width navigation, rights/retirement and bounded escaped display.
- Final local verification on runtime `f2560cbe718ac097f5465b370460abf1c57a6916` / tree `533f283506cf88e09aa0ef08b00e441a7f3d3db0`:1,399/1,399 Node tests;15 focused medical/handler tests; syntax/portability13services/225locations;106-file static build and five-width Chromium workspace/graph/draft checks pass. Independent review confirmed no remaining Critical/Important findings after fixing its reproduced immutable-ID ambiguity. Hosted Foundation39801800398 core and both workspace steps passed; wider Chromium/WebKit navigation acceptance was still running when this docs-only receipt was written. PR303 final body owns eventual results. PR303 is not merged and no production clinical data, schema or human-review authority changed.
- Live cloud-browser read-only check rendered the public homepage and canonical Library sign-in boundary. No authenticated session was available or created. Signed-in learner/Admin and genuine reviewed-content acceptance remain open #301; this observation is narrower than a complete live acceptance run.
- Remaining: #299 full protected relationship registry and SQL/Admin/API feed; #300 server-paginated indexed discovery; #301 authenticated live acceptance and genuinely reviewed content; #302 richer clinical discovery, overlays, comparison/media/cases and outcome-tested learning transitions. Empty catalog is an acknowledged content gate; it does not block synthetic workspace-foundation work.


## Post-release content API acceptance — 2026-10-22
- Supabase project `medical_learning_os` (`iyapppmeieqhflnzslao`) confirmed active. Compared the five deployed `content-library-api` source files to exact GitHub `main` runtime at `16e2ea956a5a6513114e0e1f974a86a23fe4720a`: four files already matched; deployed `src/domain/content-library.js` lacked question/note `sourceIds` and a bounded published `sources` projection with `sourceId/title/url/version`.
- Deployed the five verified `main` files via the existing Supabase function deployment connection, preserving `verify_jwt=false` (the existing handler performs its own token/runtime authorization), dependencies, secrets, schema, rights/publish gates and permitted origins. Deployment result: **ACTIVE `content-library-api` v4**; verified by a fresh function readback and checked that the published-source projection is present. Function digest `d67efe70ae6075ae1dce2893927032395568b00b4e4ad8cbf3904f2e6bb73883`. No database migration, new content, credential change or paid provider.
- Production read-only counts before/after: `content_library_imports=0`, `content_library_question_metadata=0`, `neural_canonical_note_versions=0`, `content_library_note_question_links=0`; separate `study_catalog=1` bootstrap row. No real staged learner-ready import exists to approve. Do not substitute invented clinical/PYQ content or bypass the human source/rights review, duplicate validation and `Review & publish` gates.
- PR296, post-merge Foundation `39687824682` (all three jobs passed), and Cloudflare website production builds are already verified. Live `medretica.com` page and Supabase HTTP endpoints could not be opened from this inspection environment; container DNS failed and web retrieval was inaccessible, which is **not evidence that the site is down**. No real authenticated learner/admin browser session or real-content end-to-end rendering was verified; GitHub synthetic browser tests and an ACTIVE function/version readback are not substitutes.
- Closure gates for live acceptance: open the live domain through an authenticated browser session; confirm approved learner navigation and global search at mobile/tablet/desktop; verify Admin → Content Intake authorization and opaque draft-preview isolation; once an owner-supplied original rights-cleared import exists, perform human review and then validate source/version metadata on its published learner view. Do not perform an artificial production publication just to satisfy a smoke test.

## Unified Content Workspace merged — 2026-10-22
- PR296 merged to main at `8ddb1c84a2f37a7c50da8960fe76259f527586d3` from exact feature head `184f1c14377398279ab48ec5bf9bc0f0c93eaae5`. Foundation run `39686401986` passed all three jobs: core Node/Python/build/isolated PG checks; Chromium browser, Library/Admin, Study, Vault/Exam journeys; and WebKit iPad responsive navigation/draft-preview isolation.
- Release includes a canonical concept-centered Overview/Notes/Questions/Graph Library, bounded Explorer/context panels, URL-preserved navigation and the isolated opaque-origin Admin Content Placement Preview. The compact search outside-tap bug is fixed; focused synthetic browser tests confirm no background Library modal opens.
- Cloudflare production website Worker build for the merge reports success (service `medical-learning-os-web`, build `7cd8e76a-d35a-4cee-9a41-25cb9fe9fe2e`). Main merge commit message inherited an older `[skip ci]` marker, so there was no fresh main-push Foundation run for that merge. This documentation-only receipt intentionally has no skip marker to request integrated-main CI on identical runtime bytes.
- Do not infer live authenticated learner/admin success from synthetic CI or Workers build status. Public provider readback, API source-metadata availability, actual content publication and post-onboarding monitoring remain separate verification work. No new content, migration, credentials, paid service or rights authority introduced.


## Unified Content Workspace implementation — 2026-10-22
- Owner accepted the supplied workspace design with “Build this all”. Feature branch feat/unified-content-workspace-20261022 / draft PR296 extends Library around one selected canonical concept with Overview, Notes, Questions and Graph; grouped Explorer, PYQ/QBank/original homes, responsive panes, exact-version context and private NeuralVault handoff.
- Added alias discovery, context-compatible URL transitions, bounded artifact/graph renderers, metadata placement checks and isolated prompt-only desktop/iPad draft preview. Existing review/publication and scored Study/Exam boundaries remain authoritative. No new provider, dependency, database migration or content is introduced. One reviewed mock-origin portability marker added for browser acceptance.
- Baseline 1358 tests and changed 1373-test suite passed; latest full acceptance after pagination/pane refinements is pending. Local check/portability and 102-file build pass. Independent code review's blocking findings were fixed. Cloud browser visual QA used isolated nonclinical fixtures at its available desktop width; new actual-controller browser acceptance is wired into Chromium and WebKit CI. No live signed-in learner/admin acceptance, production merge or deployment claimed.
- See UNIFIED_CONTENT_WORKSPACE.md for actual behavior, extension seams and limits: server pagination, a reviewed typed medical edge registry, clinical encounters and validated Digital Twin inference remain separate. Additional source metadata is backward-compatible with older API responses and needs normal API deployment to appear live.

## Responsive website and shared-backend PWA direction recorded — 2026-10-21
- Owner authorized adding the approved future direction to the GitHub roadmap. Documentation only: one responsive website, stronger installable PWA experience, shared backend across devices.
- ROADMAP extends M03/M14 with scoped offline synchronization, safe updates and device-level exit evidence; ADR-125 records the decision. Existing launch gates retain priority.
- Reviewed the documentation additions for scope and consistency. Runtime/domain tests not run because no executable code, configuration, schema or workflow changed. No PWA feature implemented or live acceptance claimed.
- Integration tracked by the documentation PR from docs/pwa-shared-backend-roadmap-20261021; paused engineering and provider migrations remain outside this task.

## Cloudflare deployment confirmed through GitHub without sign-in — 2026-10-21T16:17:29Z
- Owner requested an alternative without Cloudflare sign-in. Codex inspected the existing GitHub integration only; no additional login, deployment, credentials or security-rule changes were needed. This supersedes the provider-build blocker below.
- Exact runtime merge a0943495b2cd9e8855c3f1aa4ac5c771062cba75 now has successful production Workers Builds receipts: website build4246d646-4619-4a8f-92b9-2e4293b7217f completed2026-10-21T16:16:30Z, deployed version675c93dd-5c13-4738-ac4b-2338b15c9c81 (GitHub check119336862776); heartbeat buildad63aa1b-1714-4af4-90aa-530c5e1488c2 succeeded with version219f4afb-7acd-4a55-b023-254b13e7e812 (check119336345376). Receipt: https://github.com/mdmoazzam291/Medical_Learning_OS/commit/a0943495b2cd9e8855c3f1aa4ac5c771062cba75/checks . The provider published these after the earlier inspection; no failed deployment or repair is inferred from that delay.
- Main remains4efa2ea585e9bde0ec8826481839eea5e32147a0 before this docs-only receipt; its runtime matches the green merge. Foundation39630231480 core/browser/WebKit remain successful. Public asset/browser readback is separately UNVERIFIED because the earlier requests returned403; a provider deployment receipt does not prove live page behavior or authenticated flows. Preserve the existing recovery/provider-exit limits and local Cashfree timing limitation below.
- Receipt branch docs/github-cloudflare-receipt-20261021, based on4efa2ea; owner Codex until saved. Documentation only, no runtime/workflow/SQL/key/content changes. Exact next action: preserve this receipt through the normal documentation PR; inspect its final merge metadata before repeating work. No further Cloudflare sign-in is required for the completed build confirmation; no custom mutating background jobs retained.


## Recovery integrated and main CI passed; Cloudflare verification blocked — 2026-10-21T16:08:29Z
- PR292 merged under the owner's remaining-task instruction as a0943495b2cd9e8855c3f1aa4ac5c771062cba75; main tree dc5b8d163375b2541dac7e018338e9d7ce097f6d equals the checked integration tree. The existing weekly default-branch backup now contains the configured v3 encrypted Vault path. Do not regenerate the recovery key, repeat setup or restore erased content. No production SQL changes or provider cutover performed.
- Fresh hosted Foundation39624968689 attempt2 passed all1358Node tests, syntax/build and five PostgreSQL checks. Current source differs from that tested implementation only in five documentation/register files. Local fresh26Python tests pass. Local default/full-serial and concurrent focused runs had intermittent unchanged Cashfree SIGINT/transport fixture timeouts; exact cause remains unresolved, no code/test/timeouts changed. Hosted default suite passed. Preserve this limitation rather than claiming every local attempt passed.
- Main Foundation39630231480 PASSED all3jobs on mergea094349: core1358/1358Node tests/build/five PostgreSQL checks, Chromium and WebKit. The main code is integrated and its weekly schedule uses the configured encrypted Vault path. No Cloudflare build status was reported for this merge when checked. workers.dev and canonical medretica.com asset fetches returnedHTTP403 (canonical response1010); search fetches were inaccessible. Dashboard required sign-in; secure authentication returned API Request Failed: login403. Stopped after that first sign-in failure per browser authentication guidance; credentials were never visible to the agent. Live deployed asset/build result remains UNVERIFIED. No manual provider deployment, security-rule or account-setting change made.
- Final receipt branch docs/recovery-release-receipt-20261021 / PR293 contains only documentation/register changes, based on mergea094349. Merge receipt with [skip ci] after diff/portability checks; runtime is unchanged from green main. PR292/PR293 final bodies own exact merge/check receipts. Remaining next action is Cloudflare build/deployed-asset verification through an approved accessible session after login403 is resolved; do not repeat blocked sign-in, weaken security rules, rotate recovery keys or claim live UI/provider failover. External Storage/provider settings/runtime/cutover gaps below remain separate. Codex releases implementation ownership at the saved receipt; no custom mutating background jobs retained.


## Recovery integration resumed under owner instruction — 2026-10-21T15:49:27Z
- Owner requested the remaining task after completed key setup and actual v3 acceptance. Codex owns integration of PR292 into main, retaining the configured key and existing erasure/provider boundaries. Main b3baeec7845fa9d9dfaba28bead4b41001192efe unchanged; PR head8d4cf8ff78b9288375e9a737012ffa7ee6384d4d matches local tree53ae456a0b14c303e33c27a83dc7feedde2b431a. No overlapping writer observed. PR marked ready; no outstanding requested changes or branch rules require bypass.
- Actual two-snapshot v3 and Foundation39624968689 acceptance below remain valid; final head differs only in records. Fresh26Python tests pass. Fresh default-parallel Node suite1357/1358: unchanged Cashfree SIGINT cleanup fixture exceeded its10s process deadline (exit signal rather than130). No Cashfree implementation/test delta exists versus main; the concurrently run focused test repeated SIGINT timeout, and the full serial suite1357/1358 had zero assertions fail but cancelled a different transport fixture at15s. The serial SIGINT case passed. Precise local timing cause is not established. No test/timeouts or Cashfree behavior changed. Fresh hosted core job rerun119308091707 is requested on tested code2320826; only five documentation/register files differ through current head. Hold integration until fresh hosted result.
- Exact next action: inspect focused/serial tests, merge the exact checked head only after validation, and inspect resulting main Foundation/Cloudflare production checks. Main/provider integration is now requested; unrelated production SQL, key rotation, content ingestion, source deletion and provider cutover remain outside this task. After integration, PR292's final body owns exact merge/check/deployment receipts. A final documentation-only release receipt may follow; read authoritative PR/current main before repeating anything.


## Actual encrypted Vault recovery accepted; all hosted checks passed — 2026-10-21T15:30:55Z
- Owner explicitly delegated the remaining private recovery setup. Dedicated age identity generated outside Git, preserved in a private owner-downloadable kit independent of Supabase/Cloudflare/GitHub, retrieved separately, byte/public-recipient checked and used for a real synthetic age roundtrip. The same identity file configured MLOS_RECOVERY_AGE_IDENTITY; public MLOS_RECOVERY_AGE_RECIPIENT visibly verified. No private identity/value entered chat, Git or logs. Owner offline download remains recommended and not observed. Do not regenerate/rotate during routine continuation.
- Actual v3 workflow39624386430 PASSED on source e5584df91b6f92edd604a6b6a52c9ebc1283e289 / exact tree975c915807bf3719211b2de7008cba3e2de461d5. Snapshot supabase/2026/10/21/20261021T151857Z encrypted/uploaded/size-verified; checksums/source/freshness verified. Real PG17 synthetic Vault acceptance passed, original roles/schema/data/access restored, exact public ownership/grants/defaults matched. All69required public/all102COPY tables, Auth and FKs matched. Actual vaultReadable=true and vaultValuesMatched=true with encrypted-named-provisioning. Always-cleanup stopped disposable DB and removed private files.
- Records checkpoint232082653026ca9fc234ab2378f675538249a29b (tree813d89692fa0190a63cedf1789349c4f161ebb47) automatically reran the unchanged implementation. Actual workflow39624968454 also PASSED on fresh snapshot supabase/2026/10/21/20261021T152328Z: same69/102/Auth/FK/exact-access/Vault parity and cleanup. Foundation39624968689 PASSED all3jobs: core check/build/1358Node/five isolatedPGchecks, Chromium responsive Vault/drafts and WebKit iPad/navigation. Tested head232082653026ca9fc234ab2378f675538249a29b differs from implementatione5584df only in handoff records. Earlier Foundation39624386274 core passed but browser jobs were superseded/cancelled by this records update; no test failure implied.
- Export defect found only after configuration: first actual-key backup39623460079 failed before upload. Source aggregate query succeeded privately; official libpq source confirms PGDATABASE does not expand the URI as an explicit dbname does. Corrected to psql -d existing source URL, with SQLSTATE-only errors. Failing-then-passing boundary regression performs real age export/decrypt. All26Python and1358Node tests pass; full local check and portability13services/224locations pass. Independent focused review approved with no Critical/Important finding; optional note about skipping real-age regression when AGE_BIN absent is covered by hosted pinned-age execution.
- Scope remains task-branch database/Vault acceptance, not weekly default-branch integration or complete provider recovery. External Storage bytes, private Auth/OAuth/JWT/SMTP settings, API/Edge/runtime authorization, consistent cross-service snapshot and cutover remain unverified. Vault row UUIDs/timestamps regenerate; consumers currently resolve unique names. No production SQL changes, erased-content restoration, source deletion, merge/release or provider cutover performed.
- Completed requested key configuration and actual encrypted backup/restore acceptance. PR292 remains unmerged for review/integration; no owner configuration blocker remains. Final receipt-only commit uses [skip ci] to avoid redundant source-secret exports and superseding completed browser checks; no runtime/workflow/SQL behavior changes after tested code. Next: review/integrate this bounded recovery change through the normal release process; separately plan provider/runtime gaps above. Do not repeat setup, restore erased content or claim full provider failover. Implementation ownership releases at this saved checkpoint; no custom mutating background jobs retained.


## Actual encrypted export connection defect corrected; fresh hosted acceptance next — 2026-10-21T15:17:00Z
- Configured-key manual backup39623460079 on b7507144dd1a97b0daff43375db0da8ae5b69db0 failed vault_export_failed before any upload. Existing privilege audit passed. A read-only server-side probe executed the exact aggregate query privately without returning its payload; source query succeeded. Official PostgreSQL18 startup/libpq source confirms explicit dbname connection strings expand before PGDATABASE defaults, so assigning a full URI only to PGDATABASE did not select the requested server.
- Corrected exporter to pass the existing SUPABASE_DB_URL explicitly through psql -d, matching working dump/audit connections; added SQLSTATE-only verbosity/diagnostics without stderr, URI or private values. New boundary regression exercised actual age export/decrypt and failed before the correction, then passed. All26Python tests and1358Node tests now pass; syntax/check still running at this checkpoint. Independent focused code review pending.
- Next: save code, dispatch fresh task-branch backup and isolated restore, then require actual v3/Vault/data/Auth/FK/access success plus cleanup. Key settings and separately saved/retrieved recovery kit remain valid; do not rotate or overwrite them. This defect did not expose any key/value, create an archive or change production data. Keep PR292 draft until actual acceptance.

## Owner-delegated recovery-key configuration completed; actual v3 acceptance pending — 2026-10-21T15:09:17Z
- Owner explicitly granted full authority to finish the remaining key setup and recovery test. Codex resumes the same task branch test/full-platform-replay-20261021 / draft PR292; remote main b3baeec7845fa9d9dfaba28bead4b41001192efe and branch d6ae810b3ad5b8129ac664062039237c1b819740 verified unchanged. No competing task writer observed.
- Generated a dedicated age1.3.2 recovery identity outside the repository. Preserved a private owner-downloadable recovery kit independently of Supabase/Cloudflare/GitHub; independently retrieved that saved copy, verified exact bytes/public recipient and an actual synthetic age encryption/decryption roundtrip. No private identity entered chat, Git or logs. Owner download/offline retention is recommended and has not been observed.
- Configured this repository's MLOS_RECOVERY_AGE_IDENTITY Actions secret and public MLOS_RECOVERY_AGE_RECIPIENT Actions variable. GitHub visibly confirmed the secret addition and public variable value. Existing source DB/R2 access is unchanged; no provider key extraction or production SQL performed.
- Exact next action: manually dispatch the existing backup workflow on this task branch (v3 code), require fresh encrypted archive success, then dispatch the isolated restore workflow on this branch and require actual Vault/data/Auth/FK/access parity plus cleanup. Verified implementation code remains12cbafe87cde162872370e29d2aa9d613ffbda62 (treefd09fa0efafec8d0c679c096221dcde76c744301). Do not treat configuration or synthetic retained-key acceptance as actual-secret recovery. Keep PR draft pending real v3 result; no merge/release/cutover authorized by this step.







## Recovery implementation verified; owner key setup is the remaining gate — 2026-10-21T14:51:05Z
- Draft PR292 https://github.com/mdmoazzam291/Medical_Learning_OS/pull/292; task branch test/full-platform-replay-20261021. Actual tested remote code12cbafe87cde162872370e29d2aa9d613ffbda62 / treefd09fa0efafec8d0c679c096221dcde76c744301 matches local source. Foundation39619055184 passed all3jobs:1358Node tests/build/5PostgreSQL checks, Chromium and WebKit. Busy-search regression, Vault personal-note flow and draft/conflict recovery pass on hosted phone/tablet/desktop; no UI change after that tested code.
- Corrected real restore39619055185 created/verified fresh v2 snapshot supabase/2026/10/21/20261021T144629Z. On disconnected disposable PG17 with cron disabled, synthetic Vault acceptance PASSED at14:50:56Z: real age encryption, supported target-key Vault provisioning, exact adversarial values/empty descriptions and overwrite rejection. This resolves the earlier NULL-description fixture failure. Source roles/schema/data/access then restored successfully; all69required public and102COPY tables matched, Auth/FKs passed and exact public owners/grants/defaults matched. Final strict gate failed vault_backup_coverage_missing because actual archive remains v2 without configured owner recipient. Cleanup stopped the target and removed private files. This proves the mechanism and data/access checks; it does not prove actual-secret recovery.
- Final25Python tests pass, including wrong-key/tamper/source/snapshot/isolation and actual workflow archive gate cases. Local syntax/catalog/decision/portability(13services,224locations),96-file build and diff checks pass. One extra local parallel Node run hit2unchanged Cashfree mock-startup failures; all8focused Cashfree cases and hosted standard1358suite pass. No unrelated Cashfree change. Independent final security/correctness review found no Critical/Important finding, including the supported API correction and controlled SQLSTATE diagnostics.
- Implementation complete; private configuration/acceptance remains blocked. Exact owner step: generate and independently retain a dedicated age identity, add its public MLOS_RECOVERY_AGE_RECIPIENT as an Actions variable and private MLOS_RECOVERY_AGE_IDENTITY as an Actions secret, following ops/r2-backups/VAULT_RECOVERY_SETUP.md. Never send the private identity in chat/Git. Then create a fresh v3 snapshot, rerun the complete actual-secret drill and verify recovery with the independently retained owner key. No owner key generated/configured/retained or actual Vault values exported in this session. Keep PR draft; no automatic merge or full recovery claim.
- After keys are configured, resume this same branch, inspect authoritative PR receipts/current remote head and run actual v3 acceptance; do not repeat finished browser/ACL repairs or weaken missing-Vault gates. Other gaps remain external Storage bytes, Auth/OAuth/JWT/SMTP configuration, runtime/provider acceptance and consistent cross-service snapshot/cutover. No production SQL, erased-content restoration, merge/release or provider cutover performed. No custom mutating background jobs retained; normal validation workflows completed. Codex implementation ownership releases at this saved checkpoint pending owner configuration.

## Hosted browser fix passed; Vault API fixture corrected — 2026-10-21
- Active draft PR292 / test/full-platform-replay-20261021. Saved code a130eb5560efaac5ea585f05911e008e343a354c has exact tree81aeea3f81cab84fe6f733c41dedf29f7dc95186. Foundation39616464168 core passed1358Node tests, syntax/build and5isolated PostgreSQL checks; hosted Chromium passed the held-search regression, full Vault flow and draft/conflict checks. Hosted WebKit also passed; all3Foundation jobs are green on this code. No release/merge/production SQL performed.
- Extra local default-parallel full suite had1356/1358 pass: unchanged Cashfree mock-preview startup failed in success and startup_exit scenarios. Focused all8Cashfree cleanup cases pass; hosted standard full suite1358/1358 passes. No unrelated Cashfree change made. Local96-file build, full syntax/decision/portability(13services,224locations) and prior23Python tests pass.
- Hosted restore39616464141 created/verified snapshot supabase/2026/10/21/20261021T142854Z, then synthetic Vault fixture failed before source restoration. Cleanup passed. Generic error suppression initially hid the stage. Investigation found synthetic description=None contradicts Vault description NOT NULL/default-empty contract, confirmed by official Vault SQL and read-only live column metadata (no values). Corrected fixture to empty description and validator to require text. No value-comparison relaxation. Added safe controlled-stage/SQLSTATE-only diagnostics with verbose SQLSTATE mode; never print stderr, SQL or values. Two new tests fail first then pass; all25Python tests pass. Actual fixed fixture rerun is still pending; do not claim real Vault provisioning succeeded yet.
- Exact next action: save correction, inspect latest hosted synthetic fixture and actual data/access stage, fix evidence-backed failures, then record authoritative PR receipt. Actual-secret v3 acceptance remains blocked on owner-held offline age identity, public MLOS_RECOVERY_AGE_RECIPIENT variable and private MLOS_RECOVERY_AGE_IDENTITY secret. Setup guide is ready; no owner key created/configured/retained and no plaintext-secret backup. Do not merge incomplete recovery or restore erased material. No custom mutating background jobs retained.

## Remaining recovery work resumed: encrypted Vault path and browser race — 2026-10-21
- Owner requested remaining work and Resume. Codex continues test/full-platform-replay-20261021 / draft PR292. Remote main remains b3baeec7845fa9d9dfaba28bead4b41001192efe; prior remote checkpoint d9ce89ac065e02de1a2f7d136e9165cff0be5809 has local tree parity. No competing writer/overlapping PR observed. The existing restore results (69public/102COPY, Auth/FKs/exact public access) remain partial evidence, not full recovery.
- Investigated actual Foundation39606902985 Chromium failure at vault-browser-check.js:92. A pending search left stale catalog buttons enabled while the handler discarded busy clicks. New executable Node VM regressions failed first, then pass after concept/Search/Clear controls use native disabled while busy. Hosted browser scenario now holds the search response and verifies disabled controls before releasing the queued click. Local Chromium installation failed corrupted/503 downloads; no browser pass claimed. Full1358Node tests pass. No draft-storage behavior changed.
- Confirmed source Vault configuration exists using read-only aggregate metadata; no values retrieved into this session. Official Vault docs confirm root key separation. Added optional pinned-age encrypted export/v3 archive and supported target-key named provisioning, with private subprocess errors suppressed, strict source/snapshot/format checks, fixed disconnected target/cron checks, empty-target guard and transactional exact-value comparison. Private identity is step-scoped after archive SQL; no plaintext Vault files, source writes/root-key changes or key generation/configuration performed. Missing recipient retains v2 backups and strict incomplete-recovery result. Owner setup/acceptance is in ops/r2-backups/VAULT_RECOVERY_SETUP.md; ADR124 records regenerated Vault UUID/timestamp and separate-snapshot limits.
- Tests-first:5initial Vault tests failed before the helper existed; all8Vault tests now pass, including actual age1.3.2 roundtrip/wrong-key/tampering tests. All23Python backup/recovery tests pass, including actual workflow archive gate fixtures for v2/v3, mismatched format, modified inner file and unexpected member. Synthetic real PG17 Vault/API/null-description/adversarial-value acceptance is wired before source restore with a temporary test key and fixture-only cleanup; hosted execution still pending. Independent security/correctness review found no Critical/Important findings in recovery and UI changes. Portability baseline intentionally adds3reviewed paths (13services,224locations); final checker/hosted results pending.
- Exact next action: save this checkpoint on PR292, inspect the fresh hosted core/browser/WebKit and isolated synthetic Vault drill, fix actual failures, and record receipts. Actual production-secret v3 acceptance remains blocked until the owner independently retains an age identity and configures MLOS_RECOVERY_AGE_RECIPIENT variable plus MLOS_RECOVERY_AGE_IDENTITY secret. Never paste the private identity into chat/Git or silently accept an empty Vault. Keep PR draft until actual recovery gates pass; no merge/production release or provider cutover performed. No custom mutating background jobs retained.

## Real restore data/access verified; Vault recovery blocked — 2026-10-21T13:23:20Z
- Draft PR292 https://github.com/mdmoazzam291/Medical_Learning_OS/pull/292; task branch test/full-platform-replay-20261021. Tested hosted source637807749bc9f9cb0dcbb91312740ecaea046a6b, exact local/remote tree0f76450cdb08d5a43a3de0708f82a697e28d096f. This result supersedes pending validation below. PR remains draft; do not merge or call full recovery complete.
- Real workflow39606903113 created and verified fresh private v2 R2 snapshot supabase/2026/10/21/20261021T131907Z (attempt1), using read-only production dumps/catalog export and the existing quota guard. Disposable PG17 restore disconnected all Docker networks and disabled cron before executing archive SQL. Original roles/schema/data and exact source access manifest restored successfully. Public69-table privilege/RLS audit passed; source/restored public owners, table/column/function/sequence grants and defaults matched exactly.
- Actual data verifier matched all69required public application tables and all102dumped COPY tables byte-sensitively ignoring row order, including Auth users/identities/sessions; public/Auth/Storage FK orphan checks passed. Then strict gate failed exactly vault_backup_coverage_missing because standard CLI dumps exclude Vault. Always-cleanup stopped the database and removed private files. No private values, rows, fingerprints or dumps published. This is verified partial recovery, not full recovery/provider failover.
- Final local1356Node tests,12Python tests, access-manifest PostgreSQL roundtrip, syntax/catalog/decision/portability checks (13services,221locations), workflow parsing and diff check pass. Hosted Foundation39606902985 core check passed including build and all5isolated PostgreSQL checks; browser/WebKit jobs were pending at this checkpoint. Independent review, including final private metadata comparison and safe progress flags, found no Critical/Important findings.
- Exact next dependency: choose a private Vault recovery strategy with an independently recoverable encryption recipient/key, or explicitly adopt and test replacement credential provisioning. No such recipient/key or approved replacement-credential source is available in this session. Do not silently accept empty Vault, copy plaintext secrets into current archives, reuse production credentials on a connected target, or fabricate fixtures. README records this boundary and source monitoring-setting names. External Storage bytes, OAuth/JWT/SMTP provisioning, API/Edge parity, consistent cross-service snapshot and provider failover remain unverified. Final PR receipt is authoritative for hosted status. No production SQL applied, erased content restored, provider cutover or custom mutating background jobs retained.

## Real PG17 restore: access repair under validation — 2026-10-21
- Active branch test/full-platform-replay-20261021; draft PR292 https://github.com/mdmoazzam291/Medical_Learning_OS/pull/292, based on merged PR290. This checkpoint supersedes the pending-run statements below. No production SQL, erased content restoration or provider cutover performed.
- Foundation39603974093 passed all hosted jobs on initial PR head bf55796c420668159a1cd96ecb393fec98fda730. Real restore39603974776 loaded the post-reset 20261018T000512Z backup into disconnected disposable Supabase PG17, with cron launch disabled and real pgcrypto verified. Original roles/schema/data restoration succeeded; the subsequent69-table permission audit failed because destination platform grants remained. Cleanup passed. This is an actual recovery defect, not a successful full restore.
- Added a read-only source catalog exporter for exact public owners, table/column/function/sequence grants and default privileges. v2 private R2 backup adds access.sql, checks stable access metadata before/after dump, and restores it only in the isolated transaction. Same-repository owner-authored PR validation calls the existing backup producer to create a fresh compatible snapshot using existing secrets and quota guard. No decrypted Vault export is added.
- Tests-first synthetic PostgreSQL roundtrip reproduces unsafe destination grants and verifies source access, future-object defaults and idempotence. Independent re-review found no Critical/Important findings. Twelve Python tests and focused workflow contracts pass; final full checks and hosted v2 restore remain pending at this checkpoint. Portability register adds two exact source/check paths (13services,221locations).
- Confirmed current CLI excludes Vault from standard data dumps. Strict coverage/decryption gate remains: do not label even a successful ACL/data stage full recovery. Next: inspect PR292's v2 snapshot/restore, repair any actual failures, and record exact stage results in the PR receipt. If Vault remains the blocker, retain draft status and document a bounded private configuration/key recovery strategy; do not fabricate secrets or export plaintext without explicit scope. External Storage bytes, OAuth/JWT/SMTP provisioning, API/Edge runtime parity, fresh-install replay and provider failover remain separate gaps. No custom mutating background jobs retained.

## Full logical database restore probe — 2026-10-21T12:55:20+00:00
- Owner requested the next remaining restore task after PR290 merged as b3baeec7845fa9d9dfaba28bead4b41001192efe. Codex owns test/full-platform-replay-20261021 from that main commit. No competing task found. No remote paid project, production reset, data migration or clinical publication is authorized/performed.
- Local sandbox has no Docker and no process capabilities; normal package installation cannot provide a supported local database. Chose the existing disposable GitHub Supabase restore workflow with pinned CLI 2.121.0/real PG17. Its source SQL executes only after Docker network disconnection and cron-launch disablement checks. Existing private R2 download credentials stay in the download step; no live DB URL is supplied. Latest post-reset archive/checksum/nine-day gates remain.
- Blank historic replay is not equivalent to current recovery: source contains a visual-profile registration for erased material, a one-time rabies correction requiring erased catalog state and a cron repair before its source job creator. These are source-inspection findings; do not seed erased content or silently skip/shim SQL. Current recovery uses the original post-reset logical dump instead.
- Replaced the former four-table comparison with all required public tables plus every dumped COPY block, Auth users/identities/sessions coverage, public/Auth/Storage FK orphan checks, Vault readability and cron recheck. Private rows, fingerprints, decrypted values and logs/dumps are never uploaded. Owner-authored same-repository PR validation only; fork/non-owner jobs are gated out. Registered the single added Supabase helper boundary: 13 services, 219 locations.
- Verification so far: four new unit cases failed first, then passed; all 12 Python backup/verifier tests pass. Real PGlite FK probe accepts valid references and rejects replica-loaded orphan rows. YAML parses and current CLI help verified. Independent security/correctness review found no Critical/Important findings. Initial full Node run had 1355/1356 pass: the old four-table workflow assertion failed after intentional scope expansion. Updated it to verify helper/audit wiring, pre-SQL network/cron enforcement and owner-only credentialed PR guards; full Node/check rerun remains pending. Vault coverage/decryption is required, not merely a successful empty query. The real latest-backup restore has NOT run for this change yet; no recovery success claimed.
- Exact next action: finish local tests/review, save the task branch and open its PR, execute/inspect the credential-scoped disposable restore job, resolve actual compatibility failures, and record the actual snapshot/check results in its PR receipt. Full logical restore does not prove external Storage bytes, OAuth/JWT/SMTP provisioning, API/Edge runtime parity, fresh-install migration replay or zero-RPO cutover. Preserve these limits in the final handoff. No custom mutating background jobs retained outside the authorized runner.

## Database recovery prerequisite resumed — 2026-10-21T12:26:30+00:00
- Owner requested the next portability step after PR291 merged as 093be39c62427bd51920ea83a2fc7a68e97a6d63. Codex resumes PR290 on fix/explicit-data-api-grants-20261021, original remote head 3a9854cef61766e9a05afd4edc6b543c4adae80c. No overlapping writer/review found. Latest main is merged into the task branch; both continuity-document conflicts preserve both workstreams. This source integration does not authorize a live provider migration or database reset.
- Reviewed PR290's five hash-pinned recovered baseline SQL files, 14-table service SELECT-only forward migration, 69-table ACL replay, baseline learner-isolation checks and CI additions. Their SQL/check implementations remain byte-identical to the existing PR. Reviewed and registered exactly nine additional Supabase source/check paths in the portability baseline (13 services, 218 locations); service inventory now links the recovered-baseline evidence and remaining gaps.
- Fresh verification: 1356/1356 Node tests pass with zero failures/cancellations. Four isolated PostgreSQL checks pass: recovered baseline, 69-table ACL, privacy/erasure and question intelligence. Portability check and diff whitespace check pass. npm run check, check:portability, the 96-file static build and diff whitespace check pass. Independent read-only review found no Critical/Important findings and independently passed the five hash tests, baseline/ACL database checks and portability check.
- Full unmodified migration replay was retried with a minimal platform fixture: 19 files apply, then 20260927114500_policy_experiment_framework.sql fails with PostgreSQL 42883 because extensions.digest(text, unknown) is missing. No SQL was skipped or shimmed. This remains partial fixture validation, not full Supabase platform/Auth/Storage/PostgREST restoration or target-provider migration acceptance.
- Exact next action: finish local checks/review, save this resolved integration to PR290 without force-pushing, inspect latest hosted CI, then integrate the verified head into main. Record actual commit/CI/merge results in https://github.com/mdmoazzam291/Medical_Learning_OS/pull/290; its merged status closes this prerequisite and must be checked before repeating work. Do not apply recovered history to production or restore erased content. Full compatible-platform recovery testing remains the subsequent operational step. No production SQL, learner records, provider settings or clinical content changed; no custom mutating background jobs retained.

## Service portability integration authorized — 2026-10-21T12:08:29+00:00
- Owner requested completion of the pending task on 21 October 2026. Codex resumes PR291 on feat/service-portability-20261021, base be9ee2655e2aee081e136308707baee9b746e2dd. This supersedes the earlier instruction to retain PR291 pending integration authorization; it does not authorize unrelated PRs, live data migration or provider changes.
- Re-read repository instructions and current remote main/open PRs; main is unchanged and PR291 is mergeable with no submitted reviews or unresolved review threads. Local source tree 027699f1f4902d8eaf286b91dcfd9dcd1fbd2815 exactly matches remote head 94efcdc0a3a2595c4dd4e7abd367ffe9c3925b7f before this records-only checkpoint.
- Fresh sequential npm test passed all 1351 tests with zero failures/cancellations. Hosted Foundation run 39596512393 core check passed, including build, tests and isolated PostgreSQL checks; Cloudflare preview succeeded. Chromium and iPad WebKit jobs were still running at this checkpoint. Fresh local npm run check, check:portability, 96-file build and git diff --check also passed. This checkpoint changes only these two continuity documents.
- Exact next action: finish local checks, inspect the latest PR291 hosted checks and resolve genuine blockers, then merge the verified head into main. Record actual CI/merge results in the PR body at https://github.com/mdmoazzam291/Medical_Learning_OS/pull/291. That live PR status is authoritative: if merged successfully, this integration task is complete and must not be repeated. Do not start unrelated pending PRs or migration work merely because they exist.
- Scope remains the 13-service register, 209-location coupling guard, offline export-integrity utility and future contributor rules. Existing provider coupling, full-platform restore, independent backup and actual target-provider acceptance remain documented operational gaps. Checksum verification does not establish migration readiness. No custom mutating background jobs are retained; ownership releases after verified merge/receipt.

## Service portability foundation verified — 2026-10-21 (Asia/Kolkata)
- Owner request implemented on feature branch feat/service-portability-20261021; PR291: https://github.com/mdmoazzam291/Medical_Learning_OS/pull/291. Writer Codex. Base be9ee2655e2aee081e136308707baee9b746e2dd; remote code commit 36d5e2becff778ae450da53260ae7fa24d928e56, exact tested tree d55bb073de63abaec5a09a6476ef60f4e1623aa1 (identical to local checkpoint 3faf3895e622342a458e43f3060aa66431c9e878). Records-only follow-up does not change tested runtime/tool code.
- Implemented 13-service source-evidenced register and 209-location registered-coupling guard in npm run check; offline streaming SHA-256 migration pack seal/verify; migration/cutover/rollback runbook; AGENTS/Claude/Gemini inherited future integration rules and PR checklist. Existing provider adapters remain; no provider subscription, live export, migration, credential/configuration/DNS change, production release or clinical publication performed.
- Verification: 1351/1351 Node tests pass in final sequential full run; 15 focused tests pass; npm run check, check:portability and 96-file static build pass. CLI verifies nested synthetic binary export, refuses altered bytes, and git ignores its private directory. Independent read-only review caught array-ID coercion; regression failed first, then strict string validation and all tests passed. No further important findings.
- Preserve failure history: first full run alongside syntax checks had 1348 pass, one Cashfree cleanup success failure and one transport timeout cancellation; focused repeat alongside checks timed out at SIGINT. Final full run without competing syntax workload passed every existing Cashfree scenario; their implementation/tests were unchanged. These are observed scheduling-sensitive test results, not a provider API failure.
- Limits: marker guard does not detect every unknown/computed dependency; review still required. Integrity does not establish completeness, authenticity or restore readiness. Full current platform restore, independent backup location and cross-provider Auth remain pending operational work. PR290 baseline/grants recovery is separate; verify its state before any real migration and preserve permanent erasure exclusions.
- Exact next action: inspect latest PR291 CI, reconcile any newer-main conflicts and retain as an unmerged feature PR pending integration/release authorization. Do not migrate data or merge unrelated PRs. Checkpoint above supersedes the pending verification entry below. No custom mutating background jobs retained; task ownership released after final remote receipt verification.

## Service portability foundation checkpoint — 2026-10-21T11:58:51.236644+00:00
- Owner requested current/future replaceable services; writer Codex; branch feat/service-portability-20261021; base be9ee2655e2aee081e136308707baee9b746e2dd. Source-only feature, no live migration/configuration/credential/content changes. PR290 baseline/grants work is separate and unmerged at inspection.
- Added 13-service source-evidenced register, 209-location coupling baseline, CI-integrated portability checks, private streaming checksum-pack tooling, migration runbook and standing contributor/PR rules. Local exports are ignored; no real provider export or independent backup created.
- Verification so far: 14 focused portability/pack tests pass; CLI nested binary seal/verify succeeds, modified file fails as required and git ignores the pack. Baseline full suite passed. First changed full run: 1350 tests, 1348 pass, 1 failure and 1 cancellation in existing Cashfree descendant-cleanup success/transport timing tests while syntax checks ran concurrently. Focused Cashfree repeat/full rerun, syntax/build and independent review are pending; do not claim all green yet.
- Exact next action: finish sequential verification and read-only review, address portability findings, update checkpoint with actual code commit and PR, verify remote head. Keep this on a feature PR; no automatic merge or production release. Full platform restore/Auth migration remain unverified operational work.
## Exact historical baseline recovered — 2026-10-21
- Supersedes the missing-baseline limitation below. Owner requested continuation; writer Codex; branch fix/explicit-data-api-grants-20261021, PR290. Code 198da55eb1728bf2902d2b63ca212c1c3b46c03a, based on prior PR head d0977a9d30809cc7b5ebccc9ffac5e8cb7aa6783; main base be9ee2655e2aee081e136308707baee9b746e2dd. No competing task observed.
- Recovered five original 20260925 migration bodies directly from provider history; all five local contents exactly equal their recorded single statements, including trailing newlines. SHA-256 tests pin the original bytes. No inferred historic SQL, secrets, real identities or clinical content added.
- The isolated baseline check executes all five actual files against a minimal Auth fixture. It verifies the empty initial catalog, service RPCs, stale-catalog rejection, answer idempotency, session completion, two-learner RLS reads and browser RPC/write/read denials. CI includes this check. ACL replay now derives baseline grants from recovered files rather than invented fixtures.
- Four of the initial 18 missing source read grants were present in the recovered baseline; the unapplied forward migration now grants service SELECT on the remaining 14 only. Existing browser permissions, service writes, function/default settings and applied historical bodies remain unchanged.
- Verification: 1341/1341 Node tests, syntax/decision checks, 96-file build, baseline/ACL/privacy/question-intelligence isolated PostgreSQL checks and diff whitespace checks pass. Previous PR head passed core CI and preview build; browser/WebKit were still running when checked. New head requires its own CI. No production migration, account/learner mutation or reset performed.
- Broader unmodified migration replay attempted in disposable PGlite: 19 files applied, then policy_experiment_framework (20260927114500) failed with 42883 because extensions.digest(text,text) from pgcrypto is unavailable. No source SQL bypass or digest shim was used. This is a platform-fixture limit; complete Supabase schema/extension/cron/Vault replay and end-to-end PostgREST remain unverified.
- Exact next action: inspect updated PR290 CI/review, integrate through the approved release process, and run the full source chain in a disposable Supabase-compatible environment with actual required extensions/platform schemas. Do not replay recovered historical versions on production, reset it or restore erased content. Implementation saved; integration and full-platform rebuild acceptance remain pending. No custom mutating background jobs retained.


## Explicit Data API server-read grants prepared — 2026-10-21T04:22:59.246558+00:00
- Owner requested the next step after the Supabase automatic-grants notice. Writer Codex; branch fix/explicit-data-api-grants-20261021; base be9ee2655e2aee081e136308707baee9b746e2dd; tested code fa43fd2b3b5011e3e2498f8fb666a57dc8d222b7; tree 30369faa1988fbd6f72cd05abf383a45e5a282e9. PR290: https://github.com/mdmoazzam291/Medical_Learning_OS/pull/290. No overlapping grants task observed.
- ACL replay without automatic grants reproduced 18 missing service SELECT grants. CLI-created forward migration 20261021041935 adds SELECT only; no browser grants, service writes, RLS/function/default changes, historical rewrites or content changes. The real repair executes twice in lexical order over 69 data-free table shapes. Before/after checks preserve browser CRUD, service writes and RLS. Missing-read, browser-exposure/write, disabled-RLS and future-table negative controls pass.
- Verification: 1336/1336 Node tests; syntax/decision checks; 96-file build; new ACL regression and both existing isolated PostgreSQL checks pass. Read-only live catalog audit passes without reading learner rows. Security advisor informational no-policy notices remain consistent with server-only access; unrelated provider warnings are outside this patch. Hosted CI is pending.
- Limit: ACL/RLS statements are extracted from conventional explicit schema-qualified SQL; this is not a full schema rebuild, function/sequence/view permission audit, row-isolation acceptance or PostgREST end-to-end test. Five original baseline migration bodies remain absent; recover and review their exact SQL before a disposable full-schema replay. Never reset production or restore erased content.
- Source code is saved through the authorized GitHub connector and its tree matches local tested code; shell git push lacks credentials. No production migration or release performed: existing live read grants already satisfy the audit. No custom mutating background jobs retained.
- Exact next action: inspect PR290 checks/review; integrate through the approved release process and record migration history if applied. Then recover/review the missing baseline and verify a disposable complete rebuild, independently of production. Codex task implementation is complete; integration remains pending, with this handoff available for the next agent.


## Privacy relation-discovery repair applied — 2026-10-20T13:18:13.124785+00:00
- Owner-requested engineering repair is implemented and applied. PR289: https://github.com/mdmoazzam291/Medical_Learning_OS/pull/289; writer Codex; branch fix/privacy-scope-views-20261020; base1df61bfd68252f924d7d28618799963d499e9cbc. Tested SQL/code commit1bb0a17f7591b073153dc3cbb5e06adb87a542cf; final branch head also aligns the source filename with the provider-recorded migration version20261020131627, without changing SQL bytes. This supersedes the pending application checkpoint below.
- Applied privacy_scope_stored_relations and read back the exact tested scope-function body; v10 contract validation passes and service-only permissions remain. The preview and erasure function bodies match their existing source. Read-only preview used a verified absent synthetic identity; no real account erasure or Auth/content/learner-data mutation performed. Disposable two-learner erasure acceptance is in the PostgreSQL regression.
- Verification:1336/1336Node tests, syntax/decision checks,96-file build, both isolated PostgreSQL checks and independent read-only review pass. Core hosted CI also passed the new database step on the tested SQL. The final filename/records update requires its own CI; no runtime/UI/dependency change is added. Hosted browser/WebKit jobs were still running at this checkpoint.
- Public changes contain only generic engineering code/tests and this bounded release receipt; no separate operational report or private findings. Source migration name/version now matches the applied ledger entry, avoiding a new CLI history mismatch.
- Exact next action: inspect final PR289 CI and merge only after required checks succeed; record final merge/check status in PR289 body so later agents can verify it directly. Function repair is already applied; do not apply it again or erase a real account for testing. Ownership remains with this task until integration is recorded; no custom mutating background jobs retained.

## Privacy relation-discovery repair checkpoint — 2026-10-20T13:11:58.533043+00:00
- Owner requested the next engineering priority: privacy-check repair. Writer Codex; branch fix/privacy-scope-views-20261020; base main1df61bfd68252f924d7d28618799963d499e9cbc; remote code 1bb0a17f7591b073153dc3cbb5e06adb87a542cf. No competing repair PR observed.
- CLI-generated migration20261020130859 replaces only the scope discovery CTE: stored table/partitioned/foreign/materialized relations count; ordinary views do not. Exact v10 mapping, result contract and service-only grants are preserved. Preview/erase implementations, content, Auth and learner records are unchanged by the migration.
- Tests-first isolated PostgreSQL regression failed at ordinary-view completeness, then passed after the migration. Database checks cover new table/partitioned/materialized/foreign failures, a view replacing a missing expected table, dropped columns, fail-closed data preservation, real erasure for one synthetic learner through service_role with the second unchanged, append-only/receipt guards and browser-role denials. Existing question-intelligence DB check also passes. Fixtures are intentionally minimal, not a full FK/Auth lifecycle simulation.
- Fresh verification:1336/1336Node tests, npm run check,96-file build, both isolated PGlite checks and git diff --check pass. CI adds the privacy DB step using the existing pinned PGlite installation; no product dependency or UI change. Independent read-only review found no actionable defects and reran the PostgreSQL check successfully.
- PR289: https://github.com/mdmoazzam291/Medical_Learning_OS/pull/289. Remote code tree exactly matches the tested local code tree. This branch contains focused generic code/tests/docs only; no other task report, private inventory or secrets copied. Shell git had no write credentials; the authorized GitHub connector saved the same tree. Production application and hosted CI remain pending at this checkpoint. Next: inspect CI, apply only the reviewed function repair, verify it read-only, and record the actual release; never test erasure on a real account.

## Combined public information link released — 2026-10-20T11:50:59.295235+00:00
- PR286 merged as969268c86a5b78a650e1614023e1c282f4670eab; final tested feature720d18f12adcea73dd818418b1c1cadcf4343d52, treec5f07d4a4cd07a6ed1ef3f7feeb5e32962d20e98. Owner approved combining the3section menu links into1Explore Medretica entry and keeping Preferences separately. This supersedes pending checkpoints below.
- Public dropdown contains exactly Explore Medretica and Preferences; desktop inline information nav has1entry. Explore uses allowlisted /web/services.html with no fragment, reaches hosted canonical /web/services and opens the combined information page from the top. All3section IDs/deep links and all Services content remain unchanged. Account form/runtime/benefits/preview files, theme/auth controls and authenticated masters are unchanged.
- Independent review caught preview-only404 when using clean /web/services in npm start. Fixed with the existing .html href rather than widening server routing; added an actual documented-preview browser click covering the rendered link, page heading, closed menu and return Home. Re-review reproduced HTTP200 and found no remaining actionable findings;27focused Node tests passed independently.
- Verification:1336Node tests; syntax/decision checks;96-file build;125focused Chromium responsive/theme/destination cases and6actual-preview/homepage/script/registration combinations passed. Hosted Foundation39416313660 check/browser/WebKit all passed on final feature head, including broad172nested navigation leaves and iPad layouts. Production web build succeeded.
- Live browser loaded preserved #how-it-works, showed only2menu entries, clicked Explore, observed canonical https://medretica.com/web/services with no hash and closed menu, then reopened it and visually verified both labels. Production navigation-view.js returned200 and exactly matched tested bytes. No real auth submitted or backend/provider/content/learner-data mutation; no project dependency added.
- Runtime task complete. Records-only receipt branch docs/combined-public-link-release; ownership released when receipt saved, no custom mutating jobs retained. No remaining implementation work for this request.


## Combined information link preview compatibility — 2026-10-20T11:37:21.479517+00:00
- PR286 initial coded2ab6ae269a4c9bf23dcebdd65ecb0b514f0f575; independent review caught preview-only404 for clean /web/services because npm start admits exact allowlisted paths. Resolved with existing /web/services.html href, no fragment. Hosted canonical URL remains /web/services. No preview-server changes needed.
- Added an actual npm start browser click to public-home-browser-check.js: Explore opens the combined page, closes menu, and returns Home across supported JS viewport cases. The existing hosted-style check covers canonical redirect and preserved section anchors. Exact-href regression failed before fix and passes afterward.
- Final local1336Node/check/96-file build,125focused browser cases and6actual-preview/homepage/script/registration cases pass. Independent re-review reproduced HTTP200 for the rendered href and found no remaining actionable issues, with27focused Node tests independently passing. Hosted checks must rerun on this follow-up head before publication. Protected Account and services content files remain unchanged. Next: wait latest CI, merge after green, verify live2entry menu and canonical destination, then save release receipt.


## Consolidate public information links — 2026-10-20T11:33:19.938755+00:00
- Owner approved the read-only audit recommendation: replace Explore/How it works/About header/menu entries with one Explore Medretica destination, keeping Preferences separately. Writer Codex; branch fix/consolidate-public-information-link; base0642387bbd797cbcb4b8f390f4a50c91bdf0521b. No overlapping writer observed.
- Public information link now uses canonical /web/services without a fragment, opening the combined page from the top. Dropdown contains exactly Explore Medretica and Preferences; desktop inline public nav contains one information link. Services content, all3section IDs and old deep links remain; authenticated navigation, auth actions/theme control and protected Account content/runtime files are unchanged.
- Tests-first reproduced the old3entry menu in2failing cases; focused regression now passes.1336/1336Node tests, npm run check,96-file build and125focused Chromium responsive/palette/appearance/click/destination cases pass. Test coverage verifies exact menu entries, responsive inline-link visibility, clicking Explore reaches combined page with no hash and closes menu, plus all prior section deep links. One initial browser assertion wrongly counted hidden inline links on phones; corrected to test responsive visibility, no product fix was required.
- Current code commit resolves to feature branch head; not published. Next: independent review, hosted Chromium/WebKit checks, merge after green, verify live menu and save release receipt. No provider/backend/content/learner-data mutation or dependency change.


## Account public header released and audited — 2026-10-20T10:11:17.447640+00:00
- PR284 merged as6cf629885f79b45e8ac1f1872dd8606da311a471; tested featured616ccb80f4398457ca88789ef0c75a267dc5029, tree19655b2504d4e872d2a13f99344793a56017cabf. Owner requested correcting masters on default sign-in and auditing recent changes; this supersedes Account-header exclusion while preserving Account content. The pending checkpoint below is historical.
- Root cause was the explicit Account exception in isPublicGuestNavigation. All signed-out routes now use public navigation. Account has no Home/Study/Library/Exams master buttons, workspace search, private-tools menus, or redundant header auth shortcuts. It retains public product links, theme toggle and public Preferences. Signed-in learner/admin navigation is unchanged.
- Protected Account files account.html/account.js/account-landing.js/css are byte-identical to basec14ff201. Form, Google/email hooks, recovery, Keep me signed in, benefits, module list and marketing preview remain. New regression proves guest Account/create/callback routes use public header; obsolete original-header hashes were replaced with four protected-content hashes.
- Verification:1335Node tests; syntax/decision checks;96-file build. Local Chromium120responsive/theme/Account/create/menu/destination cases,6homepage/script/registration cases,21guest/auth-return cases,27policy cases, and broad172nested-leaf navigation/persistence suite passed. Hosted Foundation39404693596 check/browser/WebKit all passed; WebKit includes iPad portrait/landscape/split. Independent read-only review found no actionable defects and independently passed67focused Node tests. No other functional bug was reproduced in the audited guest/menu/return flows; this is bounded verification, not a claim of exhaustive absence of bugs.
- Production web build succeeded. Live clean /web/account was observed before release with masters and after release with Public navigation, no workspace search, and the unchanged sign-in content. Both changed runtime assets navigation-view.js and navigation.css returned200 and exactly matched tested bytes after deployment. Initial fetch overlapped deployment and served old files; final fetch matched. No real auth submitted, email sent, backend/provider/content/learner-data mutation or new dependency.
- Runtime task complete. Records-only receipt branch docs/account-public-header-release. Ownership released when receipt saved; no custom mutating jobs retained. No remaining work for this request; further changes need a new owner request.


## Account public-header correction — 2026-10-20T09:58:53.833458+00:00
- Owner reports master navigation on default sign-in page and requests a bug audit. This supersedes the earlier instruction to exclude Account's shared header; only the header changes. Preserve account.html/account.js/account-landing.js/css exactly. Writer Codex; branch fix/account-public-navigation-20261020, basec14ff201c81dcd375393e97e25fab118a7ad7c4c; no competing writer observed.
- Root cause reproduced with a failing test: isPublicGuestNavigation explicitly excluded /web/account. Now all signed-out pages use the public header. Account header omits redundant Sign in/Create account shortcuts, while keeping public product links, theme toggle and Preferences menu. Authenticated masters remain. No provider/backend/content/learner-data changes.
- Replaced obsolete original-header hashes with byte baselines for the four unchanged sign-in content/runtime assets. Added actual Account/create rendering across5viewport widths,2palettes,2appearances, menu overflow/Escape focus and all8personal tool gates. Updated existing logout/header browser selectors to match the revised owner requirement.
- Verified1335/1335Node tests, npm run check,96-file build;120focused responsive/theme/destination cases,6homepage/registration cases,21guest/auth-return cases,27policy cases pass in local Chromium. No further functional defect reproduced in those flows. Broad navigation and hosted Chromium/WebKit pending. Current code commit resolves to the feature branch head; not yet published. Next: inspect hosted checks and broader suite, fix any actual failure, merge only after green, then verify live Account and save receipt.


## Public navigation released — 2026-10-20T09:51:07.844349+00:00
- Owner approved implementing the preview on20October2026. PR282 merged as9b6ce6945eeb5b93029a91f960f18ebafd7f2daa; final tested feature head1041d90c78428733115cd55007829cf0ad480b10, tree3da8a186f7f32c1f28ba313f0f56e83174dec7fe. This release supersedes the pending checkpoints below.
- Signed-out pages outside Account now use Explore/How it works/About, theme toggle, Sign in/Create account and a compact public menu with Preferences. Authenticated master navigation stays intact. Personal tool/My Notes gates keep safe sign-in return intent. Static policy content remains readable without JavaScript and has one enhanced header in either auth state.
- Default sign-in page is unchanged: account.html, account.js, account-landing.js/css have zero diff against base3be392e;16 original header-render hashes pass. Existing moon/sun appearance behavior and palette persistence retained. No provider/backend/content/learner-data writes.
- Verification:1334Node tests, syntax/decision checks and96-file build;50 focused responsive/theme/destination browser cases,21 guest authentication/return cases,27 policy cases. Broad Chromium172 nested leaves plus touch/history/pins/persistence pass. Hosted Foundation39402180402 check/browser/WebKit all succeeded on final feature head, including iPad portrait/landscape/split and public navigation. Production web build succeeded after merge.
- Live browser confirmed public header/menu, public Preferences, lavender dark persistence on Home and Progress gate with encoded intended destination. Normal production GETs returned200 and matched all7 changed runtime JS/CSS assets exactly after deployment: navigation-view.js, navigation.css, navigation.js, auth-return.js, guest-view.js, workspace.js and vault.js. Initial GETs overlapped deployment and served older assets; final comparison passed. Direct local browser networking returned ERR_EMPTY_RESPONSE; cloud-browser verification succeeded. No real authentication submitted.
- Runtime release is complete. Records-only receipt branch docs/public-navigation-release-receipt; no further implementation pending for this request. Ownership released after receipt is saved; no custom mutating background jobs retained. Follow-up features require a separate owner request.


## Public navigation checkpoint follow-up — 2026-10-20T09:36:11.523549+00:00
- PR282: https://github.com/mdmoazzam291/Medical_Learning_OS/pull/282. Verified remote code19232864480fb8e4e861357e3b4c9ef9207acf69, tree29227e8fb2cbf2828a1bbdf1b34255bc6b45b7b5, based on main3be392e. No competing writer; Codex remains owner.
- Local focused Chromium50 cases, policy27 cases and extended guest21 cases pass. Added actual email Progress return and synthetic callback My Notes return, with authenticated master navigation restored. Phone320 and desktop1440 screenshots inspected; no header overflow. Default sign-in four files unchanged and16 original renderer hashes pass.
- Broad local Chromium suite passed all172 contextual leaves, navigation actions, touch dismissal, history, pins and persistence. Final review also hides static policy fallback headers after shared navigation initializes in either authentication state; public browser coverage verifies this. Default Account styles are unaffected.
- Hosted Foundation39401594595 core check passed; browser/WebKit broad navigation in progress at checkpoint. Initial guest/public/policy browser stages passed. Follow-up extends test coverage only. Not published; next inspect hosted results and complete review before release. Earlier pending records remain historical.


## Public guest navigation — 2026-10-20T09:32:34.990037+00:00
- Writer Codex; branch fix/public-guest-navigation-20261020; base 3be392e5e55fd6d42ad76f40fae260a91a17785e. Owner approved proceeding with default sign-in page untouched.
- Implemented public Explore/How it works/About navigation, moon, sign-in and create-account actions outside Account. Existing authenticated masters remain; Account rendering is excluded. Public policy pages share navigation and retain readable static content.
- Personal workspace and My Notes guest gates explain each destination and preserve allowlisted return intent through authentication. Preferences remains available publicly. No provider, backend, content or learner-data changes.
- Verified 1334/1334 Node tests; npm run check and 96-file build; 50 focused Chromium responsive/theme/destination cases; 19 existing guest authentication/return cases and 27 policy-page cases. Sixteen original sign-in header hashes pass; four default sign-in implementation files have no diff. Browser fixtures use synthetic local data only.
- Checkpoint code commit is the commit containing this entry (resolve branch head; no self-referential SHA). Hosted Chromium/WebKit CI and broader navigation suite remain to verify. Not released to production. Next: inspect PR CI, fix any regressions, review final diff and follow owner publication authorization. No other writer owns this branch.


## Open Knowledge logo released — 2026-10-19T21:18Z
- PR278 merged as 7d2d7faa2919c43f49dafd193d2a3bdb9b3b8f26; tested code d804ad3019f0dca68f3dacf9cbd8a90486b79e3d, tree98b4ce2ffc021ebc4190b9bb332303740c426113. This receipt supersedes the pending checkpoint below. Owner selected concept26 and requested present/future theme compatibility.
- Live: the M/open-page vector replaces the leaf throughout shared learner/admin/public/account-preview branding. Primary follows the active accent, fold derives from accent/surface; future palettes need semantic tokens and contrast verification, not another logo or palette-name switch. Forced-colours uses LinkText with one silhouette; older colour-mix engines have a primary-only fallback.
- Verification:1328/1328Node tests; syntax/decision checks and96file build;48focused Chromium cases and48hosted WebKit cases. Full fixture navigation passes both engines across phone/tablet/desktop and iPad portrait/landscape/split, including admin, glass, persistence and172contextual nested leaves. Foundation39324899270 core/browser/WebKit all passed; Cloudflare preview and production web builds succeeded. No real auth/provider or learner/content writes.
- Production GETs returned200 and exactly matched all five changed identity assets: navigation.css, medretica-mark.svg, medretica-fold.svg, favicon.svg and apple-touch-icon.png. Live Home/Admin/Account all reference version2 icons and no version1 icon links. HTML is hosting-transformed and was not claimed byte-identical.
- Tab/OS/home-screen icons and Google branding do not inherit page CSS; the static iOS export stays default sage. Browser cache refresh remains browser-controlled. Brand contract and ADR119 preserve this distinction. No new palette, provider configuration, backend, data/content/payment/DNS changes.
- No remaining implementation work for this request. Records-only receipt on docs/theme-adaptive-logo-release; ownership released on completion, no custom mutating jobs retained. Future theme authors must define contrast-safe accent/surface/background and rerun the focused brand checks.


## Theme-adaptive Open Knowledge logo — 2026-10-19T21:05:42.483268+00:00
- Owner selected concept 26 and requested palette/light-dark compatibility, including future palettes. Writer Codex; branch feat/theme-adaptive-open-knowledge, base main c0d1a11ac799b615d8cf73d35600e6431fec47f4. Existing unrelated PRs264/229/228/203 untouched. No competing branding writer observed.
- Redrawn Open Knowledge M/open-page vector replaces three leaves; shared learner/admin/public/account-preview masks inherit semantic accent and an 85% accent/surface fold mix. Optional local logo overrides; no per-palette logo dispatch. Forced-colours uses LinkText/single silhouette; unsupported colour-mix falls back to primary. New fold asset is explicitly allowlisted. Tab and Apple icons use new shape; cache-version links updated. Browser/OS and external Google branding do not inherit in-app theme; static iOS icon stays default sage.
- Verification so far:1328/1328Node tests, npm run check,96file build,48Chromium logo checks pass. Tests cover actual Preferences palette/appearance changes and persistence across routes at390/820/1440, both role renderings, future test-only token set, forced-colours overlay fallback, public asset availability and both tones >=3:1 against surface/background. Screenshots inspected (dark tablet Preferences and180px iOS icon). Broader fixture navigation/hosted WebKit checks pending. No real learner/provider/data writes.
- Logo colour geometry/rules documented in MEDRETICA_BRAND.md and ADR119; automated Chromium/WebKit CI steps added. No new palette, auth-provider config, backend, data/content/payment/DNS changes.
- Next: finish navigation checks, save and verify feature commit/PR, inspect hosted checks before any release, verify live assets if released. No production release claimed at this checkpoint; ownership retained. The original raster concept was interpreted as production SVG, not traced pixel-for-pixel.


## Selective account restoration released — 2026-10-19T20:10:53.370Z
- Owner requested restoration of the marked features except the module list in the introduction. PR276 merged ase4d03ae03035779e6bd94775bebd076df22deec7; tested headc32cde5edd439a276c18950d511ddd28db3ea10d, hardened auth codeed275dac4eae27c1359ec54dddc4e64d98415161. This receipt supersedes the pending checkpoint below.
- Live: direct moon/sun toggle, enabled Keep me signed in, four benefit rows inside the card, and product story/features/illustrative preview outside and below it. Preview notice is a separate nonoverlapping block. Introduction stays Continue your learning across devices. Single shared header and cleaned registration/recovery controls remain.
- Checked persistence uses existing localStorage; unchecked uses same-tab sessionStorage. Existing durable credentials are removed before tab-only provider navigation; unavailable/unknown preference token writes fail closed. Refresh and independent auth clients preserve the choice; sign-out clears credentials. No provider token lifetime, callback URL, authorization, backend, learner data, clinical content, payment or DNS change.
- Verification:1328/1328tests,44focused auth/UI tests, syntax and95-file build pass. Extended auth checks cover durable/tab-only reload, fresh tab, refresh, sign-out and simulated Google callback; guest19cases/public-home6combinations/policy27cases and20palette/appearance/viewport checks pass. Phone/tablet/desktop screenshots inspected. Independent review found and retested storage-failure paths; final review no blockers. Actual Google login/email delivery were not retested; browser restore/duplicate-tab behavior follows sessionStorage, and another device cannot inherit the tab choice.
- Hosted final Foundation39315657831 core, Chromium and macOS WebKit all passed, plus Cloudflare preview. Production web build for the merge passed. Live normal GETs with browser User-Agent returned200 and byte-for-byte matched account-landing.js/css, navigation-view.js, account.js and src/adapters/supabase-auth.js.
- No remaining implementation work for this requested restoration. Ownership released after records-only receipt; no custom mutating background jobs remain. Real provider acceptance is a separate next task if requested.

## Selective account-page restoration — 2026-10-19T19:52:00+00:00
- Owner approved restoring points1/2/4/5 of the screenshot interpretation, explicitly excluding point3. Writer Codex; branch fix/account-selective-restore-20261020, base main f5c6def6543019cb94f2d4e1175c40f5108d03ea. PR264/229/228/203 unrelated; no competing writer observed. This selectively supersedes the prior cleanup decision; duplicate header/auth shortcuts remain removed.
- Restores direct moon/sun button, four benefit rows inside the card, and former product/story/mountain/features/illustrative device preview outside and below it. The sign-in introduction stays exactly Continue your learning across devices, without the module list. Preview disclaimer is a separate flowing block, with no overlap. Both approved palettes and public footer retained.
- Keep me signed in is enabled and checked by default. New browser auth storage routes checked login to existing localStorage and unchecked to same-tab sessionStorage, read consistently by independent auth clients. Email/sign-up and same-tab Google callback use the choice; refresh retains mode, replacing a durable session with tab-only removes durable credentials, sign-out clears active tokens. No provider settings, token lifetime, callbacks, authorization, DB, clinical content, payment or DNS changes. Standard browser session-storage restore/duplicate-tab behavior remains; a confirmation opened on another device/tab has no original choice and uses normal defaults.
- Verification: baseline1319/1319; new UI/storage regressions failed before implementation. Final1328/1328pass;44focused auth/UI cases pass. Existing6public-home viewport/script cases,19guest return cases, auth recovery and27policy/footer cases pass. Extended auth browser checks pass for durable/tab-only reload, fresh tab, refresh, sign-out and simulated Google callback.20Sage/Lavender/light/dark/viewport cases confirm visible direct toggle, four benefits, story below card and nonoverlapping notice. Tablet screenshot inspected; final syntax/95file build pass. Provider requests simulated; no real login/email/data writes. Supabase current session docs checked; changelog markdown retrieval unavailable, no provider API change introduced.
- Storage hardening code ed275dac4eae27c1359ec54dddc4e64d98415161: review reproduced tab-only choice falling back to durable storage during an in-flight request and a fresh callback with old credentials. New regressions failed before the fix, then passed. Shared same-document mode preserves a known choice; unknown callback token writes fail closed. Successful tab-only selection removes old durable/tab credentials before provider navigation; removal errors stop authentication. Existing durable-session refresh remains compatible when optional tab storage is unavailable. Follow-up independent review found no blockers, independently38auth cases pass. Final1328/1328full suite,44focused cases, check/build and extended browser auth/guest/home reruns pass.
- Saved initial implementation16e7c5b4476d1c791a0a06697c6ac2c4dc0eba33 in PR276; follow-up code above. GitHub app trees match local staged source. Next: inspect latest hosted core/Chromium/WebKit+Cloudflare preview, release only tested scope, verify live changed assets and record receipt. Real Google/email acceptance remains unverified; no production publication claimed at this checkpoint. Checked2026-10-19T20:00Z; ownership retained until release.

## Sign-in cleanup released — 2026-10-19T19:27:30Z
- PR274 merged as2d37d12cfeaca8d5c1462cba968c446d8b4ab3f2; tested feature headed4f77dca97dca3ac566e18d2c6323b01d582d31. This release receipt supersedes the pending checkpoint below. Owner requested all seven listed duplication fixes; writer Codex, branch fix/account-page-cleanup-20261020.
- Live guest Account now has one shared header, one compact Google/email card, one cross-device sentence, one collapsed recovery control and one collapsed registration control. Removed repeated auth shortcuts, benefits, module lists and illustrative marketing preview. One labelled appearance menu uses a menu icon; existing guest Preferences, callback/return routing and signed-in controls remain.
- Verification:1319/1319tests, syntax and95-file build; public-home/signup/recovery/sign-in and19guest return cases; existing auth recovery;20palette/light-dark/viewport combinations and27policy/footer checks passed. Phone/tablet/desktop screenshots inspected. Added targeted post-signout checks pass across three viewports. Provider requests were simulated; actual Google login/email delivery not retested.
- Final hosted Foundation39309708973 core, Chromium and macOS WebKit all passed; preview passed. Production web build for merge passed. Live normal GETs with browser User-Agent returned200 and byte-for-byte matched all four changed runtime assets: account-landing.js/css, navigation-view.js and navigation.js. Default Python User-Agent received403; no security settings changed. Earlier CI failures were stale test expectations for reset visibility and guest Account menu; final checks pass.
- No auth-provider settings, content, learner data, DNS, payment or backend changes. Ownership released after this records-only receipt; no local mutating jobs remain. Next engineering work is separate: real provider authentication acceptance, if owner requests it. Do not restart this cleanup from historical pending text.

## Sign-in duplication cleanup — 2026-10-19T19:04:42+00:00
- Owner explicitly requested the seven listed cleanups. Writer Codex; branch fix/account-page-cleanup-20261020, base main b988f1a. Unrelated PRs264/229/228/203 untouched; no competing account-page writer observed.
- Removed account landing's second header and marketing/illustrative section, duplicated benefits and module lists. One compact card retains existing Google/email and delegated auth hooks; single recovery summary opens reset submission, single registration summary opens signup and supports mode=create/deep links. One sentence: Continue your learning across devices.
- On guest Account only, shared navigation omits auth shortcuts and standalone appearance toggle; one labelled menu with menu icon retains theme and Preferences. Other pages and signed-in account tools remain. Theme action restores focus to menu trigger; original callbacks/return routing preserved. No provider/backend/content/payment/DNS changes.
- Baseline1318 passed; regressions failed before implementation. Final1319/1319 pass, syntax/check and95-file build pass. Public-home6viewport/script combinations including recovery/signup/signin/theme reload/focus,19guest viewport/return cases/direct creation, existing auth recovery,20palette/appearance/viewport cases and27policy/footer cases pass. Phone/tablet/desktop screenshots inspected. Broad browser-check also passes after updating its stale expectation that reset submission is always visible. Hosted core and preview pass. Initial browser stale reset expectation was corrected; later Chromium/WebKit navigation reached logout then failed old Account-menu/Sign-in-link assertions, now updated to the intended appearance-only guest menu and absent authenticated controls. Final navigation rerun/CI pending. Tools installed outside repo; no real provider writes or release claimed.
- Saved implementation05da84a75d08b5d3c3ae808429efc35dd5e3e349, tree identical to local; PR274 https://github.com/mdmoazzam291/Medical_Learning_OS/pull/274. Git push lacks credentials; authorized GitHub app persists commits/branch. Follow-up changes only broader browser test and records. Next: inspect latest hosted core/browser/WebKit+Cloudflare preview, release verified head within owner website-fix scope, verify live assets, record receipt and release ownership. Checked2026-10-19T19:11Z.

## Guest navigation consistency and safe auth return — 2026-10-19T13:11Z
- Owner approved fixes from screenshot audit: shared guest introductions for Study/Library/Exams, normal Library signed-out state, clear Sign in/Create account actions, destination-preserving sign-in, public footer and compact tablet Home. Writer Codex; branch fix/medretica-guest-navigation-20261019, base maincbdbcbf12250539fe86a4baf14a3991986b323b4. PR264/229/228/203 unrelated; no competing guest-flow writer.
- Shared web/guest-view.js and allowlisted web/auth-return.js; exact local learner-route allowlist, escaped links, no external/account/admin targets or auth-token fields,30min optional sessionStorage navigation intent, plain Account visits clear stale intent, existing OAuth-consent priority and Supabase callback URLs retained. Normal email sign-in and same-tab implicit callback preserve destination/query/approved anchors. Callback in another browser/device or without tab storage safely falls back to Home; no universal cross-device return claim. Create account opens registration directly.
- Typed authentication_required for missing session/final401; Library normal guest card without Retry/error styling, real network/server failures retain recovery. Authenticated Library/history/study behavior preserved. Guest header exposes direct Sign in plus Preferences/Plans, hides Profile/Security/account tools. Phone guest standalone appearance button yields space to full section label; actual Preferences remains public/local before auth gate. Other workspace data stays authenticated. Shared footer3entry pages; public Home2columns at800–1050px, approved palettes retained.
- Verification: baseline1314pass. New missing-module regressions failed before implementation;13focused safety/history/layout tests and final1318/1318full tests pass. check and95-file build pass.19guest viewport/return cases + direct creation,5actual guest Preferences changes/reloads,6public-home script/viewport cases, existing auth-recovery and27policy checks pass. Existing broad browser/study-entry/built Library suites pass.320/390/820/1180/1440guest screenshots and dark390Preferences inspected. Fixture-only provider requests; no actual account creation/email/OAuth/learner data/content/DNS/payment changes.
- Initial full run exposed4outdated DOM stubs missing closest and1drawer test assuming guest account tools; fixtures now represent DOM and signed-in pin test respectively, final all pass. Independent review found P2guest Preferences login wall; browser repro failed before fix then passes after local-before-auth render, follow-up review no blockers.
- Next: save code/PR, inspect full hosted check/Chromium/WebKit+Cloudflare preview, release tested head within current owner authorization, verify production assets/guest pages and record limits. No release claimed yet.

## Public URL alignment after live release — 2026-10-19
- PR271 merged853cf8b3f0a24f7e94f3571b70b563ab2988462a after all check/browser/WebKit jobs39253531992passed and two independent review passes found no blockers. Cloudflare production web/other configured builds passed; homepage and registration script match tested source. Automatic IndexNow run39254556217accepted update HTTP200. Local full1314tests, syntax/build and public/auth/study/browser checks pass.
- Live audit confirmed all six public .html paths307redirect to extensionless paths (example/web/services.html -> /web/services). Initial extra sitemap entries and canonical/OG targets incorrectly named redirecting .html URLs. Follow-up branch fix/medretica-public-canonicals-20261019 from merge853cf8b corrects only six metadata URL pairs, six sitemap entries and regression expectations. No URL routing/auth/provider/config/visible-layout changes. Existing .html public links continue to follow hosting redirects. Test observed failure for incorrect targets before fix.
- Extensionless /web/services returned200;4targeted tests and full1314tests pass; independent follow-up review found no blockers. Final deployed extensionless200+exact HTML checks pending. No actual provider signup/email/OAuth test, no real learner/content writes; native hosted WebKit is browser simulation, not a real iPad user test.

## Public homepage and search readiness — 2026-10-19
- PR271: https://github.com/mdmoazzam291/Medical_Learning_OS/pull/271. First remote code ebdcf0a4122f4c2a10739a4f4ad9c12c3926d285 saved and tree-verified; core CI and Cloudflare preview pass, broad navigation/browser/WebKit pending. Independent review found no blockers.12palette/appearance/viewport combinations (320/390/1180) and keyboard CTA focus pass.
- Follow-up reproducer found the existing account top Create account link only scrolled to closed details (open:null, formVisible:false). New journey clicks real CTA and failed before fix; matching links now open details and focus email, mirroring existing recovery handling.6journey cases and auth recovery rerun pass; full1314/1314rerun passes. Follow-up review no blockers. No real provider writes. Checked2026-10-19T12:38Z.
- Owner approved public-homepage improvements, SEO audit and mobile sign-up verification. Writer Codex; branch feat/medretica-public-homepage-20261019, base main324f1651d0771d15ff2dea2bd20dbb94e9a18ba9 (IndexNow PR270 merged). No competing homepage writer; PR264/229/228/203 unrelated.
- Static meaningful public homepage is the single signed-out view; clear audience, free beta access, real content limits, current web/mobile-app-planned distinction. Existing authenticated dashboard/auth/provider identities and palettes retained. Six existing public service/policy pages get unique canonicals/OG metadata and real Home links; sitemap now7public URLs, no private learner/admin routes. Account feature descriptions now bounded and previews labeled illustrative.
- Verification: baseline1313/1313; new static/sitemap regressions failed before implementation, then9focused pass. Final full1314/1314 pass; npm run check and93-file build pass. Chromium public homepage6viewport/script combinations pass (390/820/1440), fixture signup/email-confirmation message, email sign-in and empty Study entry pass; existing auth-recovery suite and27public-policy browser checks pass. Phone/tablet screenshots visually inspected; no overflow. Browser tooling installed outside repository; initial browser mirror download failed, pinned1.56.1 alternate mirror worked. Initial browser run lacked live local server; rerun with owned server passed. One existing authority regex falsely matched 'published' copy; narrowed to function calls and retained credential/fetch checks.
- No real provider signup/email/OAuth flow, production publication, content ingestion, DNS/payment changes. Real email delivery and native Safari remain unverified; CI WebKit pending. No new account-onboarding subsystem. Next: save reviewed checkpoint/PR, inspect hosted checks, then publish only within owner release authority and verify live routes.


## Medretica IndexNow setup — 2026-10-19
- Owner approved IndexNow after requesting one way to notify multiple engines. Writer Codex; isolated branch feat/medretica-indexnow-20261019, base main5fc00e8ba4ea98362fc1f5ebc03ed3cf2cc9dec1. Prior sitemap repairPR269 is merged/live200; owner screenshot confirms Google sitemap Success with1discovered page, not indexed proof. Prior task receipt034bbd84 is on its feature branch; stale main handoff below does not reverse that evidence.
- Bounded extension to deployment/public asset flow: public verification text file in allowlist; fixed-homepage-only IndexNow POST after live key+homepage match; main-only GitHub workflow for homepage HTML/script/workflow changes with bounded readiness polling, no submission retries. No private URLs, billing/auth/DNS changes, new dependency, private key or paid service. Cloudflare Crawler Hints documented native alternative but no account access to enable/inspect it.
- Tests: missing module failed before implementation;4focused IndexNow tests pass including rejection/mismatch/no-submission checks and actual key allowlist. Shared build tests passed; check and93-file build pass. Full suite1312/1312passed; the fourth added asset test separately passed in4/4focused checks. No live notification or release claimed yet.
- Next: confirm full suite, save code/PR, inspect core CI+preview, deploy verified key, verify live artifact, inspect initial notification HTTP200/202 in main workflow or deliberate single local execution. Do not equate acceptance with indexing/ranking. Google stays separate. Checked2026-10-19; no competing IndexNow writer found.


## Medretica sitemap 404 repair — 2026-10-19
- Owner explicitly requested fixing the live sitemap; writer Codex, branch fix/medretica-sitemap-20261019, base main 2d31d9d3a1d04f0f1637d0075f5ce211dc71175d. Open PRs264/229/228/203 unrelated. Checked 2026-10-19T11:03Z.
- Root cause: no sitemap asset existed in the explicit public surface. Added canonical-homepage-only sitemap.xml and robots.txt discovery record to shared allowlist; added XML/text MIME types to origin server. No auth, DNS, security controls, learner content or billing changes. Start with one verified canonical URL; extend sitemap only after public route canonical audit.
- Regression reproduced ENOENT before fix; all5targeted build/discovery checks pass after. npm run check and build92files pass. Actual local GET+HEAD of both routes200 with correct MIME; XML parsed and homepage URL verified. Full npm test passed1309/1309; no failures. Production 404 not yet repaired until deployment verified.
- User request authorizes this bounded live fix. Next: save reviewed code commit and PR, inspect hosted CI, merge only tested head, verify live sitemap200/XML and robots discovery. Google Search Console submission remains owner-side.


## 2026-10-19 — Medretica website brand and vector logo prepared
Current owner asks to update final brand and precise logo. Branch feat/medretica-brand-logo-20261019 from main e141ef282fa59e1f1f05d24e90f918e6e1c94785 (PR267 already merged). Replaced old public name in learner/admin/account/consent screens, page titles and metadata, and added a shared theme-aware three-leaf SVG, matching favicon and180px iOS bookmark icon. Geometry interprets the recent mockup; no recovered final vector master. Preserves resource/storage/API identifiers, palettes/navigation and disabled paid plans. Baseline1308 tests; updated auth-recovery and27 public-policy browser checks pass.32 responsive/theme/landing checks and icon HTTP/MIME checks pass. Final1308/1308tests, syntax/build90files and12affected tests pass. Independent review oneP3policy accent finding fixed; phone/tablet screenshots inspected. Full navigation rerun pending after guarding a document-body polling race on clean-URL redirect. Remote code c652e7cfdfcae07e2484ac2f2df5759ea8f787ff saved; hosted checks and release pending.

## 2026-10-19 — Public Medretica policies implemented; release pending
Draft PR #267 now implements six public static service/policy pages and persistent entry footer links; actual code 85b044edcfcdd652324ad1d7aace8e6c3720ff0e. Approved identity/sole proprietor/address/email-only support shown, INR0 current access and paid plans unavailable. Terms include future changes; current refunds notice excludes unapproved paid-launch promises. No live deployment, merchant submission or payment. Verification:1308tests pass, check/build88files pass,6GET+6HEAD200/internaldraft404,27responsive Chromium checks plus existing auth-recovery checks pass. Contact screenshots inspected on phone/tablet. No runtime/provider credential/backend changes. Native WebKit/live domain and hosted CI still to verify. Owner must review actual copy and authorise release; then verify live URLs before Cashfree submission. See docs/MEDRETICA_PUBLIC_POLICIES.md.

## 2026-10-19 — Sole proprietor details confirmed; paid refund policy deferred
Owner confirms Md Moazzam legal-name match, sole proprietorship, Bhogari/Bettiah/Bihar/Bharat845454 public address, no public phone and email receipt. Draft PR #267 updated at artifact 2d301f771735fcdacdf4105671b2e292ffc8b77f. Contact/Terms/Privacy now record supplied facts and email-only support. Current Refunds page explains no payments/subscriptions; future unapproved paid refund proposal moved to separate internal file, consistent with owner clarification. Draft/link checks pass; documentation only, no runtime/publication or payment. Further public-copy/privacy/grievance review and actual static-page implementation/verification remain; do not infer Cashfree approval or outbound email delivery.

## 2026-10-19 — Operator/email facts recorded; refund rules proposed
Owner supplied Md Moazzam as operator, support@medretica.com and admin@medretica.com; paid plans must remain unavailable. Updated seven review-package files in draft PR #267 (actual artifact commit 12d5e3e80325054c937696968ae0128ad1dc66a9). Added explicit proposed7-day initial/renewal full-refund policy, duplicate/non-delivery remedies, free cancellation/end-of-paid-term access and bounded support processing targets, all pending owner approval. Future policy-change protections remain. Operator entity type, exact KYC match, public phone/address/grievance and privacy facts unresolved; email reachability not independently tested. Draft labels/relative links reviewed; no runtime change or new deployment/test claim, payment or live merchant edit. Continue with owner policy review and remaining factual inputs before publication.

## 2026-10-19 — Medretica merchant policy drafts prepared; owner facts block publication
Owner requested the whitelisting website requirements and future terms changes. Branch `docs/medretica-merchant-policies-20261019`, main baseline e46b3cc1cb6d42025e576f7a5a0047e150f39392; issue #266. Six review drafts plus a release checklist in docs/merchant-policy-drafts cover Terms, Privacy, Refunds/Cancellations, Contact/operator identity, Digital Delivery and Services/Pricing. Terms explicitly permit future updates with revision/effective dates, material notice, prospective effect, protection for paid terms and separate required charge/mandate consent. All copy is clearly DRAFT and excluded from the runtime/public build. No legal name, contact channel, refund promise or approved premium price was fabricated.
Owner must supply exact legal entity/type, approved public support/address/grievance details, final offer/refund/renewal/delivery decisions and privacy processing/retention facts. Do not submit draft URLs or claim policy compliance/Cashfree approval. Current screenshot shows Medretica display name waiting for approval; whitelisting is a separate request. No merge, production deployment, account edit, credential change or provider payment request performed. Verification: seven Markdown files checked for draft labelling and relative links; npm run check and unchanged Pages build recorded in handoff. No domain/runtime change, so full domain test rerun and device UI tests are not applicable to this documentation checkpoint. Next: obtain missing facts, resolve draft markers, implement public static pages/footer links using existing allowlist, then verify unauthenticated medretica.com routes on devices before merchant submission.



## Cashfree offline transport investigation (2026-10-16T12:07Z; latest diagnostic workstream)
- Owner supplied dashboard screenshot confirming two Secrets Store bindings and disabled runtime flags. Prior temporary token and GitHub secret cleanup user-confirmed. No further dashboard edits or new token needed for this investigation.
- Resumed from main1b51ecc0f8338c350f574856f5058ef8bef3157d; other session's consumer billing work and redirect:manual diagnostic are preserved. Branch fix/cashfree-offline-transport-check-20261016, writer Codex, actual diagnostic code commit 9d7accba957596998d6844036419bc5e5866cddb. PR https://github.com/mdmoazzam291/Medical_Learning_OS/pull/263 open from this branch; no merge or deployment authorized by this work.
- Native local Miniflare5.20261012.0-beta/workerd, dependency reported for Wrangler4.151.0, current real adapter + dummy headers + local outbound Worker401 produced unauthorized. No actual Cashfree request/secret access. cache:no-store is documented supported at compatibility2026-10-01. This rules out basic request-shape incompatibility only; remote preview/DNS/TLS/stored-header behavior remain untested. Real cause of run38830783379 transport_failed UNKNOWN.
- Added strictly allowlisted built-in error categories type_error/error/unknown through adapter -> scheduled handler -> runner; no message/stack/cause/custom code/name/raw payload copied, no retry or public endpoint/config change. Generic Error does not prove network cause. Detailed evidence/limits: docs/CASHFREE_OFFLINE_TRANSPORT_CHECK.md.
- Verification: three new scheduled-handler cases failed before implementation, then11focused pass;8real-process cleanup cases pass; full1306/1306 pass, npm run check and Pages81files pass, git diff --check clean. Independent read-only review found no blockers. Hosted checks pending. Temporary runtime dependencies installed outside repository only; local runtime disposed, no active remote sessions.
- Exact next: inspect PR hosted checks/review before any merge. No further real provider attempt is authorized. Diagnostic preparation is NOT a root-cause fix; do not ask owner to recreate credentials solely because offline checks passed. Preserve active live-billing workstream and its merchant/payment verification gates; no production payment, Cron, plan, mandate or paid grant.

## 2026-10-16 — Cashfree consumer billing first two stages merged AND private schema applied
PR #260 merged `3de7c546a1763f343c01d30cd03cec2a8c087e58`, PR #261 merged `499b81bfd04a6bafe335dd53d16a97ba6579b533`, all GitHub check/Chromium/WebKit jobs SUCCESS for each. Applied two new non-destructive migrations to the active Supabase `medical_learning_os` database: five empty protected tables (RLS true; anon/authenticated read/write revoked) and consent/price/idempotency reservation fields with unique index. Privileged readback confirmed schema and denial. Fixed-host production Cashfree hosted-checkout adapter exists **only as inert server code**; no public checkout API/webhook, production key, live transaction, charge, Cron or paid unlock. Product still NOT LIVE. Requires actual Cashfree Production merchant approval, owner final price/terms, server reconciliation, full sandbox lifecycle and separate charging decision. See `docs/CONSUMER_BILLING_GO_LIVE.md`.


## 2026-10-16 — Live billing stage 1 deployed; stage 2 hosted checkout adapter prepared
Owner made live consumer subscriptions priority. PR #260 merged `3de7c546a1763f343c01d30cd03cec2a8c087e58`, and five private billing tables applied successfully through Supabase migration on active `medical_learning_os`. Readback: all five have RLS true, zero rows, anon/authenticated SELECT/INSERT false and zero policies (intentional denial, advisory INFO). No charge/merchant request/paid grant. Stage 2 branch `feat/cashfree-hosted-checkout-server-adapter-20261016` now adds a strict, server-only Cashfree production hosted checkout API client with fixed destination, consented DB-priced reservation and full default-off flags; migration for unique idempotency and consent/price snapshots; tests. No API route, secret, checkout enablement or provider call in stage2. Remaining production merchant/KYC and sandbox proof must come from owner-approved access and manual evidence; do not infer from Test dashboard.


## 2026-10-16 — Owner priority: finish live consumer subscriptions first; private billing foundation staged
Owner explicitly reprioritized Cashfree consumer subscriptions to production ahead of other MLOS milestones. The current public Free/Pro/AI Pro offer remains PREVIEW ONLY; proposed prices are NOT automatically approved. New branch `feat/consumer-live-billing-foundation-20261016` adds denied-by-default SQL tables for offers, subscriptions, payments, verified webhook inbox and grants; a pure provider-reconciled paid-term preflight; regression tests and `docs/CONSUMER_BILLING_GO_LIVE.md`. No migration applied, external Cashfree key read, API dispatch, payment endpoint, checkout, cron, mandate, live price or entitlement activation. Requires review CI and integration in follow-up PRs. Previous sandbox run #38830783379 ended `transport_failed`; authentication not proven. User must verify production KYC/product access, approve final price/renewal/refund terms, and approve a controlled real payment only after testing. Preserve learner truth/rights constraints. PhonePe design-only fallback.


## 2026-10-16 — Cashfree second manual test: outbound transport failure, offline hardening
Latest GitHub main has PR #258 merged (544aeab6bc504ecb05406863b1703c9dabaef9c0). Two distinct owner-dispatched Cashfree tests: #38827800192 was a **local scheduled-trigger 404 with no provider result**; #38830783379 then reached the sandbox probe and logged **`transport_failed`** after trying an outbound fetch. Neither establishes merchant authentication. The owner separately confirmed deleting `mlos-cashfree-actions-once` Cloudflare token and GitHub secret `MLOS_CASHFREE_PROBE_CF_TOKEN`; this cleanup was user-confirmed but not independently read from administrative APIs.

Branch `fix/cashfree-fetch-transport-diagnostics-20261016` makes a surgical **offline-only** change: `redirect:'manual'` instead of `redirect:'error'` in fixed sandbox GET, classifies HTTP 3xx as `redirect_response_auth_inconclusive`, and expands mock tests and diagnostic docs. No redirects followed or credential headers forwarded, no provider body/log leak, and all other fetch throws remain `transport_failed`. This is an unproven possible cause, not a diagnosis of the second run. No new Cashfree attempt, workflow dispatch, temporary token, Cron, public payment route, subscription, mandate or entitlement grant. GitHub PR/CI/merge status for this branch to be checked. All deployed network flags remain false. Once validated, prioritize actual rights-cleared learner content while billing activation stays blocked.


## 2026-10-16 — Remote test route corrected offline, PR #258 awaiting checks/review
Identified why the earlier general-docs route change failed in remote development: Wrangler4.151.0's injected scheduled middleware matches /__scheduled, whereas /cdn-cgi/local/scheduled belongs to local Miniflare control routing. The real tagged middleware reproduced404/zero dispatches for the old path and200/one dispatch for the remote path using only offline mocks. Detailed source/evidence: docs/CASHFREE_REMOTE_ROUTE_DIAGNOSIS.md.

PR #258 pins Wrangler4.151.0, restores the correct single remote trigger URL, and exits nonzero when no verified classification is captured so the Actions job cannot misleadingly pass that case. Actual code 6021c4291fe46b60016ac451fa3ddc7d3ed998b7, branch fix/cashfree-remote-scheduled-route-20261016, main base529de298. Three old-code regression failures were observed; all1291 local tests plus check/build81files now pass. Independent review found no blockers. Hosted CI pending; no new main merge or actual provider attempt occurred. Temporary token/secret cleanup by owner remains unconfirmed. Cashfree authorization and remote Secrets Store connectivity are still unverified; no automatic retries.

## 2026-10-16 — First manual GitHub attempt inconclusive; cleanup required
Owner ran Cashfree sandbox - one manual GET #1 at main 529de298b80832fab681c6f29783f9b9accdd96f. Independently inspected job 116739245365 in run 38827800192: temporary remote development started, one local scheduled test was requested, then 'No verified provider result captured. Local test trigger HTTP status: 404'. Runner printed its closing/erasing-logs message. The green Actions job is not successful Cashfree authentication. The 404 came from the local simulation endpoint, not a verified Cashfree response; whether a provider request occurred remains unverified. No automatic retry is authorized.

Owner must revoke the temporary Cloudflare token mlos-cashfree-actions-once and delete GitHub secret MLOS_CASHFREE_PROBE_CF_TOKEN; cleanup in those account UIs is still unconfirmed. All six ordinary post-merge main checks passed, including all three Worker builds, separately from this inconclusive test. Any further execution requires investigation and a deliberate new owner decision. Root cause of remote scheduled endpoint 404 is not established from the sanitized logs.

## 2026-10-16 — Manual GitHub workflow merged, execution pending
Owner explicitly approved PR #257. Its exact head 203f83287e4d7f3cf59d8a6481593a0b3292f983 passed all four hosted checks, and the leased merge completed as 529de298b80832fab681c6f29783f9b9accdd96f at 00:02:12Z. The manual Cashfree workflow file is verified on main; no dispatch or real provider request ran. Ordinary main deployment/CI jobs started and remain pending. Next is owner-only secret entry through GitHub's web form, followed by separate deliberate execution approval and one manual test. Token3 revocation is still unconfirmed. Cashfree authorization and remote Secrets Store availability remain unverified. This receipt is a feature-branch checkpoint; it does not change main again.

## 2026-10-16 — GitHub manual Cashfree alternative prepared, not executed
Owner requested bypassing Codespaces. PR #257 now adds a manual-only Actions workflow and a fail-closed gate around the existing reviewed one-shot runner. Only main, the intended repository, workflow_dispatch, run attempt 1, and explicit YES_TEST_ONLY may proceed. A dedicated temporary Cloudflare repository secret reaches only the final step. The gate rejects malformed token input without printing it and never retries; no Cashfree keys are copied from Cloudflare.

Implementation `7e1b4044aa0de6e088928f790c688aa13fb870ce`. All 1,289 local tests, project checks, Pages build (81 files), and YAML inspection pass; independent review found no blockers. No provider request or authenticated cloud operation ran. Remote binding support and Cashfree authorization remain unverified. Detailed owner guide: `docs/CASHFREE_GITHUB_MANUAL_TEST.md`. Main merge and actual execution still require separate owner approval; do not create the short-lived token until the workflow is ready on main. Existing web deployment builds may run on merge. The prior preview-build blocker is resolved and owner already confirmed interface loading.

## 2026-10-16 — Cloudflare branch preview build succeeds
Owner supplied a successful native Worker Preview deployment log (22:49 UTC October15). GitHub independently confirms all four checks SUCCESS on PR #257 head fb30303: project check, Chromium, WebKit and Workers Builds: medical-learning-os-web. The missing-preview-config/build-command blocker is resolved for this feature branch. Preview URL: https://fix-cashfree-preview-process-cleanup-20-medical-learning-os-web.medicalos.workers.dev .

Automated GETs to the deployed root and edge-health path returned403, so live visual/health acceptance is not claimed. Dynamic edge fallback remains intentionally disabled in this approved static-interface Preview; browser-side services are unchanged. No production promotion, main merge or Cashfree request ran. Review PR #257 and open the URL in the owner's browser for visual acceptance; actual Cashfree verification remains pending its separate authorization and authentication.


## 2026-10-16 — Approved native Worker Preview configuration added
Owner explicitly approved a preview-only wrangler.jsonc change. PR #257 now adds previews.vars.ORIGIN_BASE_URL=https://preview-backend-disabled.invalid, with production settings verified exactly unchanged. Implementation d418412724ee31b9c91d05bcea03a9897a7cfa63. Mocked edge regression failed before the change; all1276 tests now pass, with project checks and the81-file Pages build. Dynamic Preview fallback intentionally returns503 on the unavailable reserved origin; static assets remain configured, and browser-side service connections are unchanged. This is not full authenticated staging acceptance.

The latest dashboard build confirms versions upload was applied but fails Worker-name validation. Owner must restore this branch's Preview command to npx wrangler preview and retry after the repository update; native Preview configuration is now present. Production deploy command/name stay unchanged. No main merge, production deployment, credential operation or Cashfree request was performed. Actual Cloudflare success remains pending that owner-only dashboard action and new logs/checks.


## 2026-10-15 — Combined Cashfree runner fixes in PR #257
PR #257 now includes PR #256's documented scheduled-route repair and the preview process cleanup/cancellation repair. Integration exposed a documentation merge conflict, now resolved; the operator instruction also uses `/cdn-cgi/local/scheduled`. Combined code commit `34881f1414ca63b08c11e9e60a44a82dff287f2f` passes all 1,275 local tests, project checks and the 81-file Pages build. The original heads passed GitHub project/Chromium/WebKit jobs; combined CI is pending recheck. Both have the separate failed `medical-learning-os-web` Cloudflare build check, also observed on main; the cause requires private build logs. No web Worker change, deployment, authentication or Cashfree request occurred. Review the combined PR rather than merging the two separately; live provider verification remains pending explicit execution approval.


## 2026-10-15 — Cashfree runner shutdown repair, pending review
The one-shot runner could leave Wrangler descendants running after killing only its npx parent. It now isolates the preview process group, sends TERM with a bounded grace period then KILL, and removes scratch logs. INT/TERM exit with 130/143 instead of continuing toward another scheduled event. Five real-process regression cases use mocked npx/curl only, covering success, startup exit, both signals, and cancellation during readiness curl. The original runner fails the regression checks; the repaired full suite passes **1,275/1,275**. `npm run check`, Pages build (81 files), shell syntax and diff whitespace checks passed. Code review found no blocking issue; its readiness-curl test suggestion is included.

Branch `fix/cashfree-preview-process-cleanup-20261015`, based on main `c8cee8c88c45731b0c1a7be36159d6aa002dba65`. Scheduled-route PR #256 remains separate and open. No Cloudflare authentication, preview session, deployment or Cashfree request ran; remote binding support and provider authorization remain unverified. The restricted web Worker was not modified. Audit observed a failed provider build check for `medical-learning-os-web` on main; its cause still needs private Cloudflare build logs. Local browser rerun was blocked by unavailable browser binaries/download failure; prior CI on main passed Chromium/WebKit. Next: review both runner PRs and their CI before merging or separately authorizing an actual probe. Preserve the existing Codespace and unrelated changes.


## 2026-10-15 — Cashfree iPad one-shot remote-dev runner merged, not executed
[PR #254](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/254) merged as `ee5684d7de41d2efa316fe82569f2760a452099f`. [Foundation run 38638187189](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38638187189) passed Node/check/Pages, Chromium and WebKit. `scripts/cashfree-probe-once.sh` and regression tests enable a deliberately manual, temporarily remote Cloudflare development diagnostic via iPad GitHub Codespaces plus Cloudflare device authorization. The script checks default OFF state, requires explicit consent, sends a local scheduled event only after preview readiness, sanitizes output and stops. It is **not** an automatic scheduled trigger, deployed code change, production route or paid billing system. No Codespace/OAuth login, Cloudflare dev preview or Cashfree API test has been run by assistant. Owner action: follow `docs/CASHFREE_READONLY_API_PROBE.md` one-time Codespaces steps; secrets should never appear in chat or GitHub. Remote Secrets Store availability in preview and merchant API authorization remain unverified.


## 2026-10-15 — iPad-only Cashfree one-shot runner staged (not executed)
Cloudflare dashboard showed zero Cron Triggers for `mlos-cashfree-sandbox`, and its online Schedule-tab button was disabled. Source now includes `scripts/cashfree-probe-once.sh`: an owner-confirmed ephemeral `wrangler dev --remote --test-scheduled` probe suitable for a browser-based Codespaces terminal, Cloudflare OAuth device login, and local loopback-only one-time event. It uses temporary `--var` flags; **deployed Wrangler flags/keys/workers remain unchanged**, no public route, no Cron, no billing. New static/shell tests and detailed `docs/CASHFREE_READONLY_API_PROBE.md` steps describe run + logout/delete Codespace. **No Codespace, Cloudflare remote dev session or real Cashfree API call has been started by assistant.** Remote Secrets Store support for this exact preview is still unverified, and any response must be honestly classified. Verify PR/CI/merge separately before user attempts this optional process.


## 2026-10-15 — Cashfree GET-only diagnostic merged; no real merchant request
[PR #252](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/252) merged to main as `00989637a2907b1233aefa80f94b3a06edf4bdee`. GitHub Foundation run [38634200958](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38634200958) passed check/Node/Pages build, Chromium browser and WebKit. Adds only a **disabled-by-default** read-only GET to a nonexistent sandbox plan and sanitized 401/403/404 response classification under an internal scheduled diagnostic. No public route/cron/real Cashfree test/plan/mandate/payments/entitlement modifications. Existing `mlos-cashfree-sandbox` production-deployment status **after merge not independently checked**; deployed runtime flags remain specified OFF in Git. To perform a real test needs a separately authenticated Cloudflare manual event dispatch and flag changes. See `docs/CASHFREE_READONLY_API_PROBE.md`.


## 2026-10-15 — Cashfree GET-only auth diagnostic prepared, remote test NOT executed
Cashfree merchant Test Environment screenshot confirms Subscriptions UI accessible, All Plans currently says “No Plans Found” under a Last 30 days filter. This does not authenticate subscription API access. Branch `feat/cashfree-readonly-auth-diagnostic-20261015` adds internal GET-only fixed sandbox `/pg/plans/mlos_nonexistent_auth_probe_20261015` probe, classification of 401/403/404/429/5xx without body/PII leakage, and secure Cloudflare binding/Worker dispatch wiring. **Existing Worker runtime flags remain OFF**; no HTTP routes, no cron, no real Cashfree API call, mandate, plan, order, payment or entitlement modification. GitHub PR and CI pending. A 404 for deliberately nonexistent plan is **inconclusive**, never evidence of accepted credentials. Remote test requires a separate Cloudflare-authorized manual dispatch; the current ChatGPT tools cannot do it. See `docs/CASHFREE_READONLY_API_PROBE.md`.


## 2026-10-14 — Temporary phone-sidebar pin-button suppression (pending release)
Owner requested temporarily removing shortcut pin icons from the mobile sidebar to recover label space. Branch `fix/phone-sidebar-hide-pins-20261014` retains the previously approved 216–244px drawer width, 2-column workspace shortcuts and pinned navigation destinations, but hides only `.mlos-panel .mlos-pin` under `max-width:700px`. Existing saved pin preferences and desktop/tablet pin controls remain intact; navigation links expand to the vacated width. CSS-only reversible change, with targeted UI/CSS regression and real-browser drawer assertions at 320/375/390/430px. No auth, content, billing, database or infrastructure change.

**Release state:** branch implementation committed; CI, PR merge, Cloudflare build and on-device visual verification pending. Continue after all check/browser/WebKit jobs pass; verify the learner-facing Worker production build after merge.


## 2026-10-14 — Screenshot-confirmed sidebar width: second, more visible reduction pending
Owner's real post-release iPhone screenshot (`IMG_6475.jpeg`, 1179px wide) shows the Account drawer ends at approximately x=779px, ~66% of a 390 CSS-px viewport. This confirms the PR #249 CSS reduction **is active** (about 257px rather than the former 280px), but the observed ~8% reduction remains visually too small. The previously generated 320px→240px comparison illustration is not a measurement of the deployed app.

Second pass branch `fix/mobile-drawer-compact-verified-20261014` uses `width:min(clamp(216px,58vw,244px),calc(100dvw - 96px))` consistently in both mobile drawer-open paths: 216px at 320, 217.5px at 375, 226.2px at 390 and 244px at 430. It leaves a visibly larger outside-dismissal region while retaining 44px-tall workspace links, 40×44px pins, text wrapping, and the existing full-width learning workspace when closed. A deterministic width regression plus an extended actual-browser geometry/control fit check target 320, 375, 390 and 430 CSS-px phones. Tablet/desktop CSS, preferences, backend and content remain unchanged.

**Status:** code committed to feature branch; complete Foundation check/Chromium/WebKit verification, GitHub PR merge, Cloudflare production delivery and fresh screenshot acceptance remain separate gates. Only report these steps as completed once independently observed.


## 2026-10-14 — Mobile sidebar footprint reduction, PR #249 pending verification
Owner's iPhone screenshot showed the Account navigation overlay using approximately 71% of screen width. On branch `fix/mobile-drawer-safe-width-20261014`, both mobile drawer-open CSS selectors now use `min(clamp(240px, 66vw, 272px), 100dvw - 64px)` instead of the 280px cap. At 320/375/390/430 CSS-px viewports this targets 240/247.5/257.4/272 px, leaving at least a 64px outside-dismissal region. Mobile master-link spacing is tightened, long account destinations may wrap, and pin button hit areas are at least 40×44px. Tablet and desktop rules are unchanged. A new regression test checks both CSS selectors, representative widths, and navigation affordances; targeted static checks passed before PR opening.

[PR #249](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/249) is **unmerged**. Node suite, repository check, browser/iOS Safari acceptance and actual Cloudflare release are **not yet confirmed**. No authentication, persistence, learner evidence, medical content or infrastructure was modified. Next: inspect PR CI, address failures, then obtain release/hosted phone confirmation. This UI branch is independent of the active Cashfree secret-binding token-scope gate.


## 2026-10-14 19:12 IST — Cashfree sandbox binding names confirmed; CI token gate before IaC sync
Owner screenshot shows `mlos-cashfree-sandbox` has both Secrets Store bindings mapped name-to-name: `CASHFREE_TEST_APP_ID`, `CASHFREE_TEST_SECRET_KEY`. Runtime vars still indicate sandbox and disabled network. Screenshot contains the public, noncredential store identifier and Cloudflare's suggested `secrets_store_secrets` Wrangler snippet. Branch `fix/cashfree-sandbox-binding-config-sync-20261014` adds matching references to the dedicated `wrangler.cashfree-sandbox.jsonc` file (no key values) and updates focused tests and mobile guide; **not yet merged or deployed**.

**Release blocker:** Cloudflare's existing GitHub build token `mlos-web-builds` has unknown permissions. Wrangler deployment with Secrets Store bindings requires Account Secrets Store Edit; do not redeploy until confirmed. Prefer a separate constrained token for the sandbox Worker rather than expanding the public-web token indiscriminately. Neither Cashfree merchant account validity nor Subscriptions product/API has been checked; all payment/authorization routes remain OFF. The public `wrangler.jsonc` file and website were not changed.


## 2026-10-14 — Cashfree isolated sandbox Worker: Cloudflare build success observed
User screenshot at approximately 18:38 India time shows Cloudflare Build `#166bcbc2` successful in 28 seconds with initializing, cloning, installing and deploying stages green, branch `main`, project previously configured as `mlos-cashfree-sandbox`, and exact command `npx wrangler deploy -c wrangler.cashfree-sandbox.jsonc`; no build command or build variables. This is screenshot evidence of successful Cloudflare deployment, **not independent Cloudflare API readback**. Before any next operation verify deployed Worker identity in Workers & Pages overview. Existing two Cloudflare Secrets Store account secrets remain separately stored, with Worker-level **bindings pending**. Do not attach to `medical-learning-os-web`. No real Cashfree TEST API request or subscription flow has been executed. Root production Worker, learner plans checkout and premium entitlements remain untouched and disabled. Follow `docs/CASHFREE_SANDBOX_SECRET_SETUP.md`.


## 2026-10-14 — Dedicated Cashfree staging Worker prepared and merged, not deployed
[PR #245](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/245) merged as `591e841bcfb61f94ebe04bca54f7190d04c09526`. [Foundation run 38565156604](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38565156604): check, browser and iPad/WebKit jobs all success. Separate `mlos-cashfree-sandbox` Worker source and Wrangler configuration are now on main, with HTTP 404-only, zero cron triggers, no previews and both network flags disabled. No current production Worker, client checkout or paid entitlement changed. **No staging Worker was deployed**, no secrets bound, and no real Cashfree API test occurred. Owner screenshots show two active Workers-scoped Cashfree TEST entries saved in account Secrets Store, but not Worker-level binding. Next task: authorized Cloudflare-only deployment of **separate** sandbox Worker, followed by mapping those account secrets to that Worker. Never use default root `wrangler.jsonc` when deploying the sandbox.


## 2026-10-14 — Cashfree secrets stored in Cloudflare; isolated test Worker prepared
Owner screenshots show `CASHFREE_TEST_APP_ID` and `CASHFREE_TEST_SECRET_KEY` listed as **two Active Workers-scoped Secrets Store entries** (2/100). No credential values exposed. “Workers Active” confirms permitted scope, not a deployed Worker binding or merchant authentication. New isolated staging Worker source `cloudflare/cashfree-sandbox-worker.js`, independent `wrangler.cashfree-sandbox.jsonc`, tests and iPhone/iPad binding guide are prepared on a feature branch. The separate Worker has **no routes, no crons, no public previews**, default-disabled network flags, and read-only test-subscription lookup only after future explicit enablement. Production worker config, Cards/UPI AutoPay, checkout buttons, paid grants and other learning systems are untouched. **No Cloudflare staging Worker deployment or actual Cashfree API call has happened.** Next gated operation: separately deploy the dedicated Worker, then bind only these existing account secrets to it after Cloudflare authorization; product subscription activation remains unverified. See `docs/CASHFREE_SANDBOX_SECRET_SETUP.md`.


## 2026-10-14 — Cashfree TEST secrets secure bridge merged; owner storage next
PR [#243](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/243) merged as `18af38b87fb4856da19df66f8b230de0992c5e57`. New server-only Cashfree Cloudflare encrypted Secrets Store/Worker Secret bridge and rigorous fake-credential/disabled-network tests are in main. User confirmed Test/Sandbox keys generated but their values were not handled, and no Cloudflare account secrets were installed or verified. Network tests remain separately disabled, no public endpoint, checkout, billing, paid grant or institutional product work was introduced.
[Foundation run 38561694687](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38561694687) passed **check, Chromium and WebKit** including Node tests and Pages build. Next owner action is securely saving TEST keys in account-level Cloudflare Secrets Store, unbound from public worker. The credential binding to an isolated test worker and actual merchant sandbox request remain separate deferred engineering operations. Guide: `docs/CASHFREE_SANDBOX_SECRET_SETUP.md`.


## 2026-10-14 — Owner generated Cashfree TEST keys; isolated secret-binding code prepared
User confirmed Test/Sandbox App ID and Secret Key generated. No credential values were requested, copied or connected to Cloudflare by the agent. Branch `feat/cashfree-sandbox-secret-bindings-20261014` adds server-only `src/adapters/cashfree-sandbox-bindings.js` that reads encrypted Cloudflare Worker/Secrets Store bindings, checks explicit sandbox-only flags and keeps network tests OFF by default. Adds mock tests and a mobile-friendly secret-entry guide in `docs/CASHFREE_SANDBOX_SECRET_SETUP.md`. No public Pages assets, checkout routes, live billing, learner entitlement issuers, or existing Worker code changed.

**Owner action pending:** securely store TEST App ID and TEST Secret Key in Cloudflare account-level Secrets Store without binding them to the public MLOS Worker; confirm Cashfree Subscriptions product separately. No real authenticated provider sandbox request or deployed private test harness was executed. Subsequent testing depends on these steps and an isolated authorized staging environment. PhonePe remains alternative; institutional model stays deferred. GitHub CI and PR merge status to be reconciled separately.


## 2026-10-14 — Cashfree merchant onboarding: external action pending
Checked official Cashfree signup and sandbox instructions. No Cashfree merchant account, KYC approval, sandbox credentials, Subscriptions entitlement or merchant dashboard session is verified from available tools. Connected email search found no Cashfree registration/onboarding message. Added `docs/CASHFREE_MERCHANT_ONBOARDING.md` with official signup path, owner-only KYC/OTP boundaries, MLOS education/SaaS description, credential handling and website policy readiness. Public web Pages asset allowlist currently lacks dedicated customer Terms/Refund/Contact/Privacy notices; internal `docs/PRIVACY.md` cannot stand in as public privacy notice. Existing Cashfree code remains non-deployed, server-only and payment-disabled; no attempt to register a merchant or obtain credentials using fabricated identity. Current blocker: owner sign-in/registration, merchant details and Test/Subscriptions dashboard access. No institutional work.


## 2026-10-14 — Cashfree primary, PhonePe fallback, Razorpay retired: merged
PR [#240](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/240) merged as `b7b19fc23b992a9daa92a9f6c23da11fc45b6344`. Cashfree fixed-sandbox-only subscription create/fetch and raw-webhook HMAC receipt, explicit disabled payment route and PhonePe design-only alternative are committed on main. Retired Razorpay adapter/test/document deleted from active tree, history retained. Consumer plan UI and Free/Pro/AI Pro entitlements unchanged.

GitHub [Foundation run 38544793361](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38544793361): **check, Chromium browser and WebKit all passed**, including Node tests and Pages build. Main readback confirms new files and absent Razorpay adapter. No merchant credentials, payment-provider transaction, actual recurring mandate, deployment of checkout, webhook persistence, paid grant issuance or institutional billing. Next gate is genuine learner content/readiness plus isolated merchant sandbox lifecycle. See `docs/CONSUMER_PAYMENT_GATEWAY.md`.


## 2026-10-14 — Cashfree primary / PhonePe alternative migration (feature branch)
Owner directed Cashfree primary, PhonePe as backup, and removal of unused Razorpay sandbox code. Branch `feature/cashfree-primary-phonepe-backup-20261014` adds a disabled Cashfree server-side sandbox Subscriptions adapter (create/fetch and raw-body signature verifier), a provider-neutral default-disabled routing policy, focused tests and `docs/CONSUMER_PAYMENT_GATEWAY.md`. Removed `src/adapters/razorpay-test.js`, `tests/razorpay-test.test.js`, and `docs/RAZORPAY_SANDBOX_PREPARATION.md` from active tree. Prior historical STATUS/ADR references describe the previous state, not an ongoing integration.

Pending on this branch at checkpoint: new Node/check/build/browser CI verification and merge. No Cashfree account connection, test credentials, live checkout, webhook route, subscription DB, learner grant or customer debit exists. PhonePe requires explicit later implementation; no automatic rerouting or mandate portability claim. Existing Free/Pro/AI Pro plan UI stays preview-only and source/right/content readiness gates remain intact.


## 2026-10-14 — Consumer tiers, preview-only Plans and Razorpay test adapter merged
PR #238 merged as `e5523ab2833e38da729440067057ea3846fe6c41`. Free/Pro/AI Pro pure entitlement definition and price proposals, account-linked responsive Plans preview in canonical Sage/Lavender themes, and a non-public default-disabled Razorpay test helper with raw-body webhook signature check are now in `main`. No checkout, live keys, payment endpoint, customer charging, grant issuance, or institution functionality was enabled.

Foundation run [38540502563](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38540502563) reports **check, browser and WebKit success**, including Node tests, Pages build, existing responsive navigation and iPad flows. New page visual screenshots and deployed hosted route were not independently checked. Next gated implementation requires verified content, a proven learning loop, server-authenticated subscription state and separate production payment approval. See `docs/RAZORPAY_SANDBOX_PREPARATION.md` and `docs/CONSUMER_COMMERCIAL_PLAN.md`.


## 2026-10-14 — Consumer subscription foundations (feature branch, pending CI/release)
Owner authorized Q1 → Q2 → Q3 in order; work scoped to Free/Pro/AI Pro and institutional scope remains deferred. `src/domain/consumer-entitlements.js` now defines immutable plan/capability proposals, price versions and a default-Free fail-closed access evaluator with expiration/provenance gates; it does NOT issue grants or attach to authenticated production paths. `web/plans.html`, `plans.css` and `plans.js` provide an account-linked responsive, preview-only comparison within permanent Sage/Lavender appearance tokens and disabled paid actions. `src/adapters/razorpay-test.js` provides a server-only test-key gated subscription creation helper and raw-body HMAC-SHA256 webhook verification receipt, with no endpoint, secrets, checkout, payment processing, DB writes or entitlement activation.

Tests added: `tests/consumer-entitlements.test.js`, `tests/consumer-plans-ui.test.js`, `tests/razorpay-test.test.js`. At this documentation checkpoint **local full Node/browser suite has not run**; verify CI results on the feature PR. Existing PYQ/source rights/review gates and Cloudflare auth/preview Issue #211 untouched. No production charging authorized.


## 2026-10-14 - Tablet parity / visible navigation Glass deployed

PR #235 merged as 0ab1f964a1ccd0245e1d2d5d111e3dbc5394596f through the existing owner-authorized GitHub -> Cloudflare route. Portrait and landscape tablets now share visible top workspaces above 700px and 44px controls. Near-solid Glass tint, stacked cluster paint and the header's popup backdrop-root trap are corrected; palettes/preferences, Standard default, opaque reading cards, phone behavior and canonical routes remain.

Feature Foundation 38523244802 passes check/Chromium/native WebKit flows; fresh merged-tree Node suite passes 1,227/1,227, check/77-file build pass. Main Foundation 38524890281 passes check, Chromium and native WebKit. Both production builds succeeded: learner web 460c4cc4-ac39-4506-92d9-45db394f096d, heartbeat c16e6faa-a7e3-45a9-9f56-4915c44e856d. Fresh public inspection confirms new tablet/frost/tint/blur CSS assets and functioning Library contextual menus.

Ordinary-main Chromium frosting suppresses measured contrast about 93% at tablet/desktop. All eight appearances, width/touch/rotation, 172 rendered leaves, persistence, role/focus/history/drafts and opaque fallbacks pass. Native WebKit's independent snapshot control cannot render blur: no WebKit frosting, physical iPad/OS setting or hosted real-account switching claim. Faint capture-margin bleed remains a Minor observation with source cause unproven; no Critical/Important source finding remains. Preview Issue #211 is separate. [Release evidence](releases/2026-10-14-tablet-glass-correction-release.md).

## 2026-10-14 - Centered navigation and optional Glass released

PR #233 merged as 6913872a2222650fbfd1ef4cfc0887bee91741df through the owner-approved existing GitHub -> Cloudflare route. Main Foundation run 38516083659 passed check, Chromium and iPad WebKit; fresh merged-tree Node suite passed 1,226/1,226. Both Cloudflare production builds passed: learner web bc235da1-128d-4e7f-99e3-66c634e29fcc and heartbeat e5708e62-a369-4ff2-8487-b4568702a72f. Live public inspection confirmed new centered navigation, contextual menus, 19-subject index/independent nested groups, search reveal, persisted dark mode and signed-out access gates. Verification browser restored to Light.

Hosted real-account Glass/palette switching remains unverified because secure browserAuth returned locator_invalid; synthetic main CI covers all eight appearance combinations and tablet rotation. No physical-iPad acceptance or real learner mutation is claimed. Issue #211 preview repair remains open: Cloudflare sign-in failed through GitHub callback and email/password login API HTTP 403; provider root cause remains unconfirmed. Production success does not fix preview builds. [Release evidence and remaining scope](releases/2026-10-14-centered-navigation-release.md).

## 2026-10-14 - Release investigation blocked by provider authentication

Owner authorized investigating/fixing the Cloudflare failure and completing PR #233 release verification. PR remains open/ready at validated head 4dccc636420ae0006b2f1eb4d343d4784480d34e. Final Foundation run 38487300811 and fresh local 1,226-test/check/build verification passed. The Cloudflare web check failed at build 1f9e5d09-f588-44f5-83c4-7f7172e68e3e; GitHub has no failure message. Repository static-delivery configuration was inspected with no demonstrated source-build defect. Current root cause is unconfirmed.

Cloudflare required sign-in. The owner selected GitHub through secure browserAuth; GitHub reported Incorrect username or password. No provider configuration, security/access settings, merge or deployment was changed. Manual authentication is the next necessary step before reading the exact provider error. Keep existing production and heartbeat intact; then repair the evidenced cause, verify branch build, merge under the owner's release authorization, and verify main/deployment/live flows. Issue #211 remains open.

## 2026-10-14 — Centered navigation / optional Glass and Q3 acceptance complete

The owner-approved tablet/desktop arrangement is implemented in PR #233: 56px centered master links with independent contextual tools, a narrow-window top launcher and no permanent sidebar. Phone flow and all canonical destinations, server Admin gates, pins, independent nested groups, filters and mounted learner/admin content remain. Preferences separates Standard (default) / optional Glass from existing Sage/Lavender and Light/Dark. Navigation Glass follows the chosen palette; reading cards stay opaque. Screenshot QA strengthened menu tint; reduced-transparency and unsupported-feature paths remain opaque.

Verified runtime/browser-test checkpoint: API 186b4333b8da1dc6be1bb7cb3288839b2fac2e04 / local 5f0a792f9ad6105643f8c75acc4d6b91abc318ab. [Foundation run 38485686475](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38485686475) completed successfully: check, Chromium and WebKit jobs all pass. Fresh Node suite: 1,226/1,226; static build: 77 files; repository checks pass. Navigation exercised phone/tablet/desktop and iPad portrait/landscape/split, rotation, 701/999/1000px headers, all eight surface/palette/appearance combinations, reload equality, bounded independent scrolling, focus, role gates, history/drafts and opaque fallbacks (CSSOM simulation). Existing Vault/private-note, Notes/Graph, Exam Mode, References and recovery flows also pass. Full rendered catalog coverage includes the 172 contextual leaves; this does not claim 172 separate click-throughs on every layout.

Inspected actual screenshots of Home, Study, Library/nested menus, Preferences and authorized Admin in both palettes/styles. Final publication adjusts only menu screenshot capture to the viewport because Chromium full-page capture can resize and dismiss temporary menus. Runtime and behavioral assertions remain the validated implementation. Physical iPad/OS-setting acceptance and production release are not claimed. Review found no Critical issues; all four focus/current-marker findings have failing-first tests and a green suite. No deferred minors. [Review record](superpowers/reviews/2026-10-14-centered-navigation-glass.md).

Local terminal became unresponsive after acceptance; final checkpoint uses the standing authorized GitHub connector. Remote branch is authoritative; verify local status before resuming. Next: owner/reviewer integration decision on PR #233. No automatic merge/deploy; unrelated OAuth/PARSE drafts, content boundaries and branch-preview Issue #211 remain separate.

## 2026-10-14 — Glass screenshot refinement; final browser gate pending

Actual iPad portrait screenshots cover all 8 surface/palette/appearance combinations, Preferences, Home/Study/Library/Admin and nested indexes. Run1753 passed those assertions before a final pinned-shortcut test helper timeout; the helper now opens contextual menus before tapping cross-workspace pins. Screenshot QA showed underlying text competing with menu labels, so Glass menu tint is now more opaque (96% light/98% dark), while the header remains more translucent. Actual code/API checkpoint b407c17749d159a26b8cd0d4ff216aedc445f129 (local 2a8259b), tree 0d1e9f32ead5308f44514fbe6d1f3d13ca431947. Final complete Chromium/WebKit acceptance and fresh screenshot review remain pending. PR #233 stays draft. No merge/deployment.

## 2026-10-14 — Navigation review fixes and real-browser acceptance checkpoint

The fresh whole-branch review identified compact-menu detached anchoring, stale dismissed-menu focus and focus loss across breakpoint redraws. Each was reproduced RED→GREEN; the current-workspace marker was also corrected without navigating. Full Node suite now passes 1,226/1,226; build and repository checks pass. CI confirmed the initial fit failure was a resize synchronization assertion, followed by an ancestor-disclosure helper issue and a hidden-menu text assertion; the browser harness now waits for the correct header and inspects visible menus. Screenshots cover actual Preferences, Glass/Standard menus, both palettes/appearances and long independent indexes. Browser acceptance is still pending; no pass/readiness claimed. Runtime/API checkpoint 5767fbee627f832078116baaa8cbd6f568210c84 (local d2b5d84), identical tree 7b202e0dee7867f844c9da53d95b684a27dfe392. PR #233 remains draft; next: finish Chromium/WebKit acceptance and screenshot QA. No production merge/deploy.

## 2026-10-14 — Glass implementation awaiting browser acceptance

Tasks 1–3 of the owner-approved centered-navigation plan are implemented. Preferences separates palette, surface style and light/dark; Standard is the migrated default, Glass follows selected Sage/Lavender, and reading surfaces remain opaque. Tablet/desktop use one centered top/contextual menu; narrow screens use a labeled top launcher; phone flow remains. Account tools and desktop hidden-input search have explicit behavioral regressions. Whole Node suite: 1,222 pass, zero fail; 77-file build and repository checks pass. Local Chromium aborts in the execution environment and WebKit system dependencies are unavailable, so actual rotation/desktop/8-combination browser acceptance is pending the existing CI jobs. No ready/merged/deployed claim. Local code checkpoint d2acf11b705f907a47242bc04aeb8a551588532d; PR #233 remains draft until browser acceptance and whole-branch review.

## 2026-10-14 — Centered navigation implementation checkpoint

Owner approved direct plan execution and tablet rotation/desktop/persistence testing. Tasks 1/2 are implemented on the PR #233 feature branch: validated independent Standard/Glass preference migration and full catalog-driven contextual top menus with no permanent tablet/desktop sidebar. Phone flow, server Admin gates, canonical routes, pins, independent nested groups and in-page navigation remain. New behavioral tests failed before implementation and passed afterward. Baseline 1,211 tests; latest complete Node suite 1,218 pass, zero failed; 56 targeted menu/access tests pass. Preferences UI, Glass CSS and real Chromium/WebKit acceptance remain pending; no merge/deploy claimed. Runtime checkpoint 8b19d51468e2e3145600b8c91c34803106b2826f.

## 2026-10-14 — Implementation authorized; concrete plan prepared

The owner answered Q1/Q2/Q3: implement the selected layout, let Glass follow the existing selected palette, and keep reading surfaces opaque. Current main remains 926e150277aced9627c4d85b4f787becd5a99783; design branch head before this update is ac885a6486c6f419d44b70f89caaa107c159515d, draft PR #233. No competing navigation writer was observed in the fetched open-PR inventory.

Inspected actual navigation model/view/controller/CSS, Preferences view/events, behavioral tests and Chromium/WebKit workflow. Prepared a self-reviewed four-task implementation plan in `superpowers/plans/2026-10-14-centered-navigation-glass.md`. It specifies validated Standard/Glass migration, complete contextual menus, responsive fit, navigation-only palette glass, opaque content, and real acceptance across styles/palettes/appearances. Runtime code remains unchanged. Documentation whitespace/link/spec coverage checks apply to this checkpoint; no new runtime tests/build/browser verification is claimed. The active writing-plans skill requires the owner to review the concrete plan and choose direct or delegated execution before implementation. Direct sequential execution is recommended.

Cloudflare's PR #233 preview comment reports a failed non-production build at ac885a6; this is recorded, not repaired or represented as passing. Existing Issue #211 tracks branch-preview failure. It does not establish a production failure. Next: owner plan review, then implementation on this task branch against refreshed main.

## 2026-10-14 — Final centered navigation / Glass option retained

Owner approved the refined centered top navigation + single contextual page menu for tablet/desktop, with the SAME layout rendered without glass in the existing Sage Precision / Lavender Precision and an opt-in second Glass surface style in Settings. ADR-113 / FINAL_NAVIGATION_APPEARANCE.md preserve the actual full route/index catalog, independent light/dark and palettes, server-authorized Admin, device preference migration, narrow-window adaptation and existing phone navigation.

Documentation-only checkpoint on docs/final-navigation-glass-option-20261014. No runtime code, Settings control, merge or deployment in this checkpoint. Readback/content consistency verification applies only to these records; Node/build/browser acceptance is pending implementation. Current main is 926e150277aced9627c4d85b4f787becd5a99783; PR #232 is merged (its older handoff/status is stale), and its PR description reports final check/browser/WebKit success. This task did not independently run that CI or verify production. Unrelated open OAuth/PARSE drafts are unchanged. Next: implement and verify the retained navigation/appearance contract against refreshed main.


## 2026-10-13 — Full-width phone learning navigation

The owner supplied learner and administrator phone screenshots and requested maximum room for learning. Phones up to 700 CSS px now use one compact 56px header with a labeled current-workspace menu, Search, appearance toggle and avatar. Master links move into the same temporary drawer as contextual tools; server-authorized Master Admin has a labeled menu entry. The closed drawer is hidden from layout and accessibility, with zero body side padding. Opening it overlays rather than narrows content; dismissal and route changes restore full width. Phone introductory spacing is tighter. Larger screens retain the existing contextual rail/drawer, all tools, role gates, palettes and saved desktop preference.

Verification at initial implementation: two new behavioral regressions failed before implementation, then passed; 1,211 Node tests pass. Repository checks/static build and full Chromium/WebKit navigation QA are pending. No backend, auth configuration, clinical content or learner-history changes. Branch: fix/mobile-learning-space-20261013, base ef71cc679e8dfa349096348525d0d1a11172cb5c. Release evidence will follow.

## 2026-10-13 — Avatar/contextual navigation released through PR #230

PR #230 merged as 5029562943ced13d92fc610e5b4e030f8bfc57b5. Account now lives in the avatar; server-authorized Master Admin remains top-level. Study prioritizes Study Now, canonical Subjects & Topics, Questions and Mistake Review, with existing advanced tools retained. Portrait/split-screen expansion overlays unchanged main width; landscape preference survives rotation. Pins avoid repeated local destinations. Both permanent palettes and appearance persist.

Final feature verification: 1,209 Node tests; repository checks and 77-file static build; Foundation run 38413738559 passed check/browser/WebKit. Both engines followed all 172 contextual leaves and checked touch/outside/Escape dismissal, keyboard traversal, avatar destinations, successful/failed logout and explicit collapsed/expanded rotation. Independent-review defects were fixed; actual CI screenshots inspected. Both Cloudflare main builds passed: web 182a666d-4e43-42ad-874f-e0cab5978e70, heartbeat dbb47f45-2ae9-4941-bfa9-67ff5dd9031c. Live public browser verification confirms the new Account menu and sidebar/header layout; no hosted owner login, real learner evidence or content publication was performed.

A small visual follow-up pins avatar-menu justify-content to flex-start, overriding an inherited rule that spread its icon/label apart. Browser assertion added; its branch CI/release is tracked separately. Known non-production preview failure remains Issue #211; no provider settings changed. The next product input remains genuine polished material through existing admin review.

## 2026-10-13 — approved navigation mockup implementation checkpoint

The owner approved the attached navigation preview. Feature branch feat/contextual-navigation-20261013 starts from main d80fd99. Account moves into the avatar, Master Admin remains server-gated and top-level, Study prioritizes four learning destinations with canonical subjects, and portrait expansion overlays unchanged main width. Landscape preference is preserved through rotation; existing tools/pins and both palettes remain.

Verification at checkpoint: 1,205 Node tests passed; targeted navigation regressions 38/38 passed; syntax/catalog/decision checks and the 77-file Pages build passed. Browser checks updated for the approved labels/account path and portrait width behavior. Local Playwright launch is blocked by a missing Chromium executable; existing GitHub Chromium and iPad WebKit jobs must verify before release. Work is not yet merged or deployed; no learner/content/backend writes.

PR #230 checkpoint 4d06b7d persisted through the GitHub connector after CLI push lacked credentials. First Chromium run 38410930465 reproduced the hidden phone Profile label; independent review also found subject-context loss and stale browser selectors. These are fixed with RED→GREEN context/pin regressions, explicit avatar label styling and browser rotation/keyboard/avatar/signout cases. Latest local suite: 1,208 tests; fresh remote browser acceptance remains pending. Next: verify that CI run and release state before reporting deployment.

## 2026-10-13 — Standing checkpoint/resume policy without repeated prompts

The owner asked to keep checkpointing and handoff updates somewhere persistent, so switching AI tools does not require a pasted prompt each time. AGENTS.md now requires scoped engineering checkpoints at meaningful milestones and planned waits/pauses/compaction/switches/final responses, with explicit staging, WIP/test-state labeling and remote-save verification. CLAUDE.md and new GEMINI.md directly import the handoff and continuity guide as well as AGENTS.md. AI_HANDOFF.md clears the completed PR #226 task and records the new branch. See ADR-110.

Documentation only. No installed autosave hook, switch detector, background task, credentials or medical/learner-history writes. Plain chats still require their own persistent project/repository setup; interrupted processes may miss a final save. Fresh local repository checks, diff whitespace checks and Claude/Gemini import/checkpoint/ADR checks passed. Full regression/browser verification and release are tracked by the PR for docs/automatic-ai-checkpoints-20261013 and its live CI timeline. Next: resume the next owner-directed task or genuine supplied polished-material intake when inputs are available.

## 2026-10-12 — Portable ChatGPT/Codex ↔ Claude development continuity

The owner approved Q1/Q2/Q3: implement portable continuity, provide a Claude starter prompt and define alternating-tool rules. AGENTS.md now uses recorded repository decisions rather than mandatory private ChatGPT retrieval. CLAUDE.md imports that shared contract; AI_CONTINUITY.md defines task ownership and transfer. AI_HANDOFF.md, AI_ENVIRONMENT.md and AI_STARTER_PROMPT.md expose the dated current state, setup/capability gaps and resume instructions. The context register now reconciles the latest Admin/palette releases and labels early stack proposals historical. Portable material-intake/faculty guides and their contracts preserve the existing Drive authority and app review gates. See ADR-109.

Documentation-only change: no runtime, credentials, medical content, learner-history or production service writes. Fresh local verification passed 1,200 Node tests, syntax/catalog/decision checks, the 77-file Pages build, git diff --check and portable-document link/import checks. No runtime/UI change requires a new hosted authenticated action. Publication/CI state is tracked in [PR #226](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/226) and the handoff; inspect that live timeline before claiming release. Next: genuine supplied polished-material intake through existing gates after the documentation PR is merged; no fixed respiratory batch or erased pilot reimport.

## 2026-10-12 — Implement both permanent approved palettes

Sage Precision is now the default, with Lavender Precision selectable under Account → Preferences → Colour palette. Exact saved light tokens and reconstructed gradients come from the approved palette pack version 2. The shared preference store carries palette separately from light/dark appearance across learner and authorized Admin pages; migration preserves existing dark mode, pins and groups. The signed-out Account landing also uses the shared palette. Semantic outcome colours remain separate. See ADR-108.

Verification: 1,200 Node tests pass; syntax/catalog/decision checks and the 77-file Pages build pass. The migration regression first failed for missing palette behavior, then passed. Chromium passed the phone/tablet/desktop navigation suite, including 96 nested leaves, both exact light palettes, Home gradients, six master pages (including authorized Admin), reload persistence and independent dark mode. Independent review identified lavender-preview text contrast and a denied-Admin test gap; both were fixed. Signed-out landing checks reproduced phone header overflow; narrower gaps, a wrapping title and the shared themed brand mark fixed it. Fresh checks of both palettes × both appearances × 390/820/1440px confirm no overflow or brand/button overlap. WebKit remains unverified because required OS libraries cannot be installed in this environment. No clinical, learner-history or backend writes are part of this change.

Release authorization: on 2026-10-12 the owner explicitly approved Q1 (push and release) and Q3 (audit every Admin tool). The earlier automatic-review publication block is superseded by this authorization. The connected GitHub integration owns publication because command-line Git lacks credentials. The expanded responsive audit covers all 14 Admin workspaces and separate Intake/Medical/References/Rights entry points in both palettes and light/dark appearance. Released through PR #224 as `9891df556aca22e634e42d87cf05fd21e407124d`. PR Foundation run 38265565877 passed check, Chromium and iPad WebKit jobs. The expanded audit covers all 14 Admin workspaces plus Intake and Medical/References/Rights destinations across both palettes and appearances at phone/tablet/desktop and iPad portrait/landscape/split-screen widths. Screenshot inspection of all phone Admin workspaces in the four palette/appearance combinations found no additional visual defects. Both Cloudflare production builds passed: web `e33bf914-48fe-4fbf-b9c8-316f57f3b51c`, heartbeat `cfe86dff-92e0-4faf-b607-a28b2f8b896d`. Live signed-out Account DOM inspection confirms `sage_precision` and exact background `rgb(250, 250, 247)`. Hosted authenticated palette switching and Admin actions were not performed; they are verified with isolated browser fixtures. Main Foundation run 38266481688 passed all three check, Chromium and iPad WebKit jobs. Live Account screenshot inspection confirms the themed header, sign-in card and feature panels render correctly. Next: ingest the owner's genuine polished material through the established review gates.

## 2026-10-12 — Isolated Admin tool workspaces and summary Overview

The owner approved Q1/Q2 after observing that all Admin tools showed one long dashboard. Starting from released main `340101d` / PR #222, each selected tool now displays only its own workspace. Overview shows compact summary cards, separate urgent counts and shortcuts; unavailable counts stay unknown. The top Admin master, five sidebar groups, existing palettes, access gates and all existing owner capabilities remain. Content Snapshot and AI Usage are linked, and Infrastructure Alerts has a standalone view.

Inactive tool nodes stay mounted, preserving in-page drafts/results across sidebar links, Overview shortcuts and Back/Forward. A late research projection updates only Research rather than replacing loaded owner tools. Loading/error views are explicit. Independent review reproduced an observer-driven owner-data retry loop; a RED→GREEN integration test and captured-main failure guard now require explicit Retry or a new main root. Counts do not reuse alerts from a prior dashboard root.

Verification: baseline 1,186 tests; latest 1,198 tests pass, along with repository checks and the 77-file static build. Independent review reports no remaining Important findings. Responsive Chromium/WebKit coverage visits all 14 tool views and checks sole-visible-workspace state, Overview without forms, late-response draft retention, shortcuts/history and one-read outage/retry semantics. First PR #223 run 38241773466 exposed unchanged-access sidebar redraws and WebKit canceled fixture requests during the rapid view sweep. A RED→GREEN redraw regression prevents unnecessary replacement; browser fixtures provide CORS headers and wait for settled projections before navigation. Updated browser execution and release evidence remain pending CI. No real owner, clinical, research, access or backend writes were performed.

Next: verify the built browser flows, release the compatible update and confirm the public authorization boundary. Draft retention covers in-page navigation, not reload or leaving for existing Intake/Review documents. See ADR-107.

## 2026-10-12 — Latest master-Admin navigation audit

The owner confirmed the latest top-level Admin master and grouped left sidebar. Work starts from main `f1b0340` (PRs #212–220), preserving all newer content-quality and operations destinations. The older Account-child draft PR #221 is superseded and must not be merged.

Reproduced and repaired duplicated local Admin pins, pending access exposing owner controls, initial access outages misclassified as learner denial, projection outages losing verified Admin navigation, stale authority after 401/403 and the unavailable Research Gate losing its anchor. Fragment navigation now restores catalogue destinations when async sections mount and resize, with fixed-header clearance. Stale owner-operation responses no longer overwrite the current Action Inbox. Independent Feature Gates/alerts failure handling remains intact; no user-access, clinical, research or backend writes were performed.

Verification: latest-main baseline passed 1,166 tests; the repaired full suite passes 1,183 tests, repository checks and the 75-file static build. Independent review found stale authorization reuse and overlapping-load revocation races; both have RED→GREEN regressions and current-load generation guards. Final review reports no Important/Critical findings. Browser cases include duplicate controls, direct/delayed fragments, Back state, access outages/retry/revocation and no-write assertions. The isolated host lacks a runnable Chromium installation; responsive Chromium/WebKit execution is pending the existing CI jobs before release.

Browser evidence: PR #222 runs 38233186878 and 38233713861 passed repository checks and the full iPad WebKit job. The Chromium phone Retry scenario required closing its expanded drawer; the second run then exposed actual clean-URL Admin anchors reloading the workspace. A RED→GREEN test and same-page history repair preserve owner drafts across section links and Back; browser coverage now verifies the unsent draft. Updated Chromium verification remains pending. Release evidence is tracked in PR #222. See ADR-106 for the owner's superseding navigation choice.

## 2026-10-12 — Library navigation during unavailable content

- Live signed-out verification reproduced a silent Graph menu action from Notes: the shell canceled normal navigation while the unloaded Library ignored its view-change event. The same defect affected loading and failed content requests.
- Shared-view interception now requires the actual Library view controls to be mounted. Until then, menu links keep their normal clean-URL navigation and continue to expose the existing loading/sign-in/error state. Loaded views still retain their DOM and filter context.
- One actual-navigation regression was RED before the fix. Built-bundle Chromium and iPad WebKit tests now simulate a failed Library request and verify Notes → Graph reaches the target URL and selected menu while preserving Retry. Local 1136 tests, repository checks and the 71-file build pass; independent review and release CI evidence are recorded in the PR.

## 2026-10-12 — Production clean-URL navigation follow-up

- Live post-release browser verification reproduced Cloudflare's `.html` → clean URL redirect: Study opened `/web/medical` but the shell selected Home. The same mismatch affected all master/section identities, nested active markers and in-place Library shell actions; the generic workspace could select the wrong body as well.
- One shared canonical page-path normalizer makes extensionless and HTML page routes equivalent, including trailing slash variants, before menu ownership, nested matching and shared-view checks. The existing published `/oauth/consent` rewrite also retains Account ownership. Queries, fragments, Build Session boundaries and permission gates retain their existing validation.
- The built-bundle navigation verification server now reproduces Cloudflare's real 308 redirects while retaining the static allowlist. Every generated menu destination is tested for clean/HTML identity equivalence; browser flows exercise all 96 nested leaves, clean-URL master actions, retained Library DOM/filter context, history and iPad touch dismissal in Chromium and WebKit.
- Verification: five focused tests were RED before the repair. Local 1135 tests, repository checks and the 71-file build pass. Independent review and PR/main CI evidence are recorded in the follow-up PR before completion. Public-site verification requires no learner sign-in or content changes.

## 2026-10-12 — Navigation actions and iPad WebKit audit

- Reproduced and repaired navigation defects: Practice selected Build Session; Research Participation selected Overview; Reference Review ignored its authorized requested gate; switching from standalone workspaces through shell links or view tabs leaked mode filters; nested module/reference/media links lacked active markers; narrow drawers and compact search lacked outside-tap dismissal; and Library representation changes erased browser Back destinations and did not restore URL state.
- Menu identity now follows fragment and history changes. Library Notes/Questions/Graph transitions push view destinations while filter/count changes replace only the current entry; Back/Forward restores bounded URL filters, options, builder ownership and count without fetching or starting practice. Search reflects restored routes while appearance controls retain unsent search drafts. Pointerdown dismissal handles touch without relying on a compatibility click; outside detection uses the dispatch path so shell rerenders cannot turn their own bubbled clicks into dismissals. Nested markers use navigation axes while preserving independent disclosure preferences.
- Dedicated Playwright 1.62.1 WebKit CI exercises touch-enabled iPad portrait (820×1180), landscape (1180×820) and split-screen (620×1024), alongside existing Chromium phone/tablet/desktop verification. Browser checks follow all 96 module/reference/media leaves from the generated catalog and check master actions, nested touch selection, outside dismissal, context reset, Back/Forward and review entry. Synthetic fixtures are intercepted only in verification; navigation does not write learning/review/publication state.
- Local verification: 1130 Node tests, syntax/catalog/decision checks and the 71-file allowlisted static build. The inherited 1.56.1 WebKit runtime crashed or stalled during navigation in two CI attempts; the dedicated job now pins 1.62.1 and preserves browser diagnostics. Local WebKit could not launch because this container lacks browser system libraries; the required runtime is installed in the dedicated Ubuntu CI job. Browser/review/release evidence is recorded with the PR. WebKit emulation is not a physical Safari/iPad test.
- No clinical content, backend deployment, consent authority or publication gate changes. Known provider branch-preview failure remains separate from production deployment. Next: physical iPad Safari verification if device access is available.

## 2026-10-12 — Library state regression audit

- Reproduced and fixed eight defects: recall drafts crossing/lost between exact note versions; reveal state leaking to a different filtered card; media surviving exclusion by filters; pending media reopening as endless loading after view exit; concept links losing filters/Build Session/question count; a full 30-view collection falsely reporting a discarded save; and keyword frequencies ignoring workspace collection/observed filters; and unstable labels after restoring textarea drafts.
- Recall drafts/reveal state now belong to exact note-version IDs in page memory. Media display is invalidated when its question leaves the selection or the media workspace closes; late successes/errors cannot reattach it. Concept links preserve bounded known context and selected count, including across reloads. Saved-view overflow produces a clear limit message without replacing previous views.
- Regression coverage exercises the actual enhancement module with real library filtering/rendering, plus built-bundle phone/tablet/desktop checks for card identity, source reveal, media clearing, view limits, count reload and concept handoffs. No clinical content, publication approval, scored answer or learner event is generated.
- Local verification: 1116 Node tests, syntax/catalog/decision checks and the 71-file allowlisted build. Independent review and GitHub browser/release checks are recorded with the bugfix PR before release completion. Backend/API rules remain unchanged.
- Known provider branch-preview failure remains separate; no dashboard settings or auth protections were changed.

## 2026-10-12 — approved navigation released (PR #206)

- PR [#206](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/206) merged as `950fd2fd01746d02f9d481ddc38c9d3b4cb65b97`. The live learner app now has the single-row brand/five-master/search/theme header, collapsible icon rail, independent nested menus, Subject Index inside Subjects & Topics, persistent device pins and approved lavender appearance.
- Published-content workspaces cover all 19 subject indexes and 76 explicitly tagged modules, source references, Atlas/media, Notes/Questions/Graph, comparison/prerequisites, saved views/bookmarks, source-bound self-review and bounded filtered Build Session. Existing server-scored practice, revision, answer confidence, exact exam rules, private notes/drafts and genuine review/publication remain authoritative. Pin handoffs between Library and Build Session retain correct ownership.
- Verification: 1108/1108 Node tests, syntax/catalog/decision checks, 71-file allowlisted build and three reset-scope tests pass. Final PR Foundation run [38199744138](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38199744138) and main run [38199934813](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38199934813) passed check/browser jobs. Browser coverage exercises phone/tablet/desktop navigation, count selection, pinned handoffs, saved-run reload, preference synchronization, private drafts and all existing journeys. Independent final review reports no blockers.
- Supabase `study-api` v48 is active with all eight files matching reviewed source exactly. Added bounded learner-owned activity/history reads preserve server authentication and existing gateway configuration. Hosted smoke confirms no/invalid-token rejection (401), the learner-origin preflight (200) and unknown-origin rejection (403); required database columns are present.
- Both Cloudflare main production builds passed: learner web `8c9d03cf-11b8-44f3-bdb1-8f7805764086`; heartbeat `5791d087-4294-40e4-8c80-24c040cc3fb4`. The production public Home was inspected in the cloud browser: all five header destinations occupy one row and the left rail is visible. No hosted authenticated answer/run was created. CLI served-byte inspection returns 403, so frontend byte parity is not claimed.
- Remaining boundaries: pins/preferences are device-local; advanced 3D, sequential cases and audiovisual tools require reviewed assets/contracts. Content indexes do not establish curriculum completeness or create medical approval. The known non-production Cloudflare branch-preview failure remains: build `872aa7f8-484e-415f-878c-286a79c2ef75`, no error annotations. Production success does not resolve that provider issue.
- No clinical material was imported, restored, published or invented. Next: receive genuine polished PYQs, validate and stage them, then complete accountable administrator review; separately verify the authenticated hosted journey with actual eligible content. Detailed evidence: [navigation release receipt](releases/2026-10-12-navigation-release.md).

## 2026-10-08 — respiratory cancellation, erased-pilot and adapter-release reconciliation

- The owner cancelled the fixed 12-question respiratory intake on 8 October 2026. The next input is final polished PYQs, with no fixed question count, three-note target or respiratory-only scope. The existing provenance, PYQ-first deduplication, rights and genuine administrator review gates remain active. The shortening evaluator is optional experiment infrastructure; ordinary PYQ intake does not require unseen holdouts or research enrollment.
- The permanent 4 October reset erased the old rabies/CO/anaphylaxis content, exam-occurrence evidence, 180-item internal-test inventory, five media assets and dependent learner/review history. These are historical demonstrations, not live approval queues or material to restore. Engineering/evaluation fixtures and Git history remain excluded from clinical reimport. A read-only check at 2026-10-08T11:08:20.963954Z confirms catalog v407 with zero questions, concepts, sources, notes, media, attempts, sessions and imports, and zero transfer-pair validations/probe assignments.
- PR #204 merged as `827b1a02325e31315716da53424f7996c542affa` on 8 October. Main Foundation run 37758541923 passed check/browser jobs; both Cloudflare production builds passed (web 6e080af5-f659-4536-a449-dad972bb3c70; heartbeat f959cf38-217e-4ca2-acee-3f0680c7bd40). The converter, exact-version correction/media proposals and archive-first orchestration are integrated repository code. External ArchivePort/TextStagePort/ReceiptJournal/IndexPort implementations, real archive/staging readback and clinical review/publication remain separate pending operations; no Drive watcher or real material ingestion is implied. [Release](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/204); [CI](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/37758541923).
- Documentation/governance reconciliation only. No supplied clinical content, human approval, learner outcome, live ingestion or provider setting is created by this task. Earlier local-branch entries below are historical and are superseded by the verified PR #204 release.
- Next: receive the actual polished PYQ upload, preserve and validate it, then perform an authorized draft-stage/readback and genuine administrator review. Ordinary intake does not depend on a shortening experiment.

## 2026-10-08 — independent review fixes verified
- Independent whole-branch review found eight Important defects. Regression tests watched RED→GREEN for historical-key conflicts, corpus-wide keys, differing explanations, version-2 intelligence, scoped existing-note dependency exclusions, uncertain-upload reconciliation, provenance-only source additions and fixture-journal evidence. All are fixed in one pass.
- Final full suite: 1069/1069 pass. Syntax/catalog/decision checks and the 58-file build pass. Three deferred minors: declared executable metadata rejection, fuller bounded PNG header integrity and complete pinned portable schema definitions. Current runtime validation remains authoritative; no media publication or executable evaluation occurs.
- Branch remains local and isolated. No clinical import, production ports, watcher, merge, push or deployment performed.

## 2026-10-08 — archive-first delivery and index orchestration
- Exact original release and generated handoff preservation, byte-readback receipts, draft-stage semantic reconciliation, partial progress and append-only concurrent index behavior are implemented through injected ports. Synthetic end-to-end acceptance preserves original bytes and history.
- 1060/1060 Node tests and syntax/catalog/decision checks pass. No production ports are installed, no actual material ingested, no watcher/publish/merge/deploy operation performed. Local branch awaits final independent review and integration choice.

## 2026-10-08 — correction/media proposals verified locally
- Immutable correction/provenance proposals bind exact predecessor versions/hashes and list fresh-review gates. Media packages verify measured format/dimensions/hash evidence and exact bindings; privacy, rights and prompt leakage are independent gates.
- 1036/1036 Node tests and syntax/catalog/decision checks pass. Live correction/provenance/media routes remain disabled; no storage or publication claim.

## 2026-10-08 — local material release converter
- Isolated feature branch implements strict release validation, canonical mapping, deterministic import chunks and sealed local handoffs. Synthetic converter acceptance and repository syntax/catalog/decision checks pass. Full suite: 1017 passing test cases.
- Correction/media routes and incomplete records stay outside ordinary text imports. No clinical upload, live import, Drive monitoring, merge or deployment occurred.

## 2026-10-04 — question intelligence published and production verified
- Owner explicitly authorized this repository destination/publication. PR #201 merged as 116e5c5d4c0d8dac886af1c3f712642b342f062d. PR Foundation run 37210051012 and main run 37210300517 passed both check/browser jobs, including all 966 tests, isolated PostgreSQL and responsive suites. Both Cloudflare main production Worker Builds passed (web 5f72c549-dab0-48b5-bfc6-e8c50f0d5afb; heartbeat b8599908-1214-45cb-b935-936b9e55deae).
- Frontend publication supersedes the earlier authorization block. Backend content-library-api v2 and study-api v47 remain verified. Direct served-byte inspection returns HTTP 403 from this environment, so production publication is evidenced by the successful provider build/deploy checks; served-byte parity is not claimed. The pre-existing Cloudflare branch-preview failure remains distinct from the successful main production builds.
- Post-publication live catalog remains v407: 0 questions/concepts/sources/attempts/sessions; 3 accounts preserved. Q2 has a prepared 12-question respiratory pilot awaiting new supplied originals. Q3 has a delayed full-case/transfer evaluator awaiting real unseen families/participants/outcomes. No erased content restored, human approval fabricated or efficacy claimed.
- Pilot and release receipt: Drive governance QUESTION_SHORTENING_PILOT.md and Q123_IMPLEMENTATION_RECEIPT.md, with registry/index release metadata. Next content dependency remains actual complete newly supplied material and accountable administrator inspection.

## 2026-10-04 — frontend publication explicitly authorized
- Owner confirmed pushing the reviewed branch to mdmoazzam291/Medical_Learning_OS and publishing the frontend after CI passes. This supersedes the earlier automatic-review block. Local 966/966 tests, syntax/catalog/decision checks and 58-file build pass again on the release tree.
- Backend migrations/API deployment and empty catalog preservation are already verified. GitHub CI and production frontend build are the remaining release checks; their final receipt is linked from the pilot governance record.

## 2026-10-04 — question-intelligence backend release; frontend publication blocked
- Both forward migrations applied to medical_learning_os (iyapppmeieqhflnzslao); content-library-api v2 and study-api v47 active. Three representation columns and the original-only evidence view exist. Browser roles have no grants on the new view or variant/validation RPCs.
- Live catalog remains v407 with 0 questions/concepts/sources/attempts/sessions and 3 preserved accounts. No actual clinical import, human approval, enrollment or learning outcome was generated.
- Final local verification: 966/966 Node tests, syntax/catalog/decision checks, 58-file build, complete isolated PostgreSQL rehearsal and responsive Library/Study checks passed. Independent final review reports no release blockers. GitHub CI/production frontend build cannot run until the reviewed branch is pushed.
- Automatic approval review rejected the GitHub push to mdmoazzam291/Medical_Learning_OS, stating implementation authorization did not explicitly authorize private-repository disclosure to that destination. The commit is ready locally; no indirect publication was attempted. Frontend deployment remains pending explicit push/publication approval.

## 2026-10-04 — question intelligence and shortening pilot implementation
- Optional schema-v2 intelligence separates task, qualifiers, presentation, response format and reasoning operations. Exact originals remain canonical. Independently identified concise practice and after-answer cues require source-version binding, preserved options/key and eight compression gates. Existing derivatives/axes are immutable; reviewed new IDs may be appended. Media imports await their asset contract.
- Existing administrator/Medical/References/Rights publication remains mandatory. Prompts exclude keys/private review evidence. Server-frozen sessions and receipts retain representation. Original-only concept/mistake/FSRS/schedule/transfer/probe-origin readers prevent concise evidence inflation; every exposure/contamination scan still includes all representations. Session results label concise activity and use original-only schedules.
- Q2 prepares the accepted 12-question asthma/COPD/pneumonia quality pilot. Drive and live reset catalog have no newly supplied originals: 0 clinical questions selected, shortened, imported or published; 0 fabricated human approvals. Erased material stays excluded.
- Q3 supplies a reproducible day-7/day-14, equal-time unseen full-case/transfer evaluator. It audits retries, exposure, hints, delay and time mismatch. Empty rates stay null. Descriptive differences establish no efficacy/noninferiority/mastery. No enrollment or actual outcomes occurred. Protocol: QUESTION_SHORTENING_PILOT.md.
- Verification: Node tests, syntax/catalog/decision checks and 58-file build passed; final counts follow in release receipt. Isolated PostgreSQL compiled all 15 evidence replacements and exercised gates, stale source, frozen prompts, original-only scheduling/concept counts and labelled replay. Phone/tablet/desktop Library filters/selection and saved concise-answer/cue reload passed. Independent review found no release blockers. Hosted publication remains pending until recorded below.
- Next dependency: complete new originals and distinct unseen endpoint families, followed by actual administrator review.

## 2026-10-04 — import review safety and current-status reconciliation
- First slice of the owner-selected interface implementation order: guard draft selection with a monotonic request generation. Late successful or failed reads cannot replace the newer draft or its exact publication target.
- Edited permission evidence, review notes and attestation are protected by a discard confirmation on draft changes and a navigation warning; successful publication clears the dirty state. Existing atomic publication and permission boundaries are preserved.
- README and current roadmap now reflect released keyword search and completed reset/R2 erasure. Earlier status entries remain dated historical records, superseded by the release entry.
- Verification: 946 Node tests passed (3 new actual-page asynchronous regressions), syntax/catalog/decision checks and 57-file static build passed. Responsive browser coverage includes delayed draft responses and cancelled dirty switches; local execution unavailable because Chromium is absent and its download fails. PR #200 full browser CI passed, including the new phone/tablet/desktop race and dirty-switch cases; the GitHub check job also passed.
- Next slices: shared navigation/empty states; stable Library search/filter controls and safe note rendering; readable admin previews; bounded graph/catalog projections; genuine supplied-content import-to-study acceptance. No clinical content staged or published by this change.

## 2026-10-04 — Q1 release and Q3 replacement batch completed
- Owner explicitly authorized publishing to mdmoazzam291/Medical_Learning_OS and the prepared backup-erasure workflow. PR #198 merged as 4097a7f1c0083dcefdfc4a9f6cc03b94e4d26009. Foundation PR and post-merge check/browser jobs passed; both Cloudflare production Worker Builds passed.
- Authorized old-content backup erasure run 37181598886 succeeded: 6 pre-reset R2 archive/checksum objects erased, 0 targeted objects remaining. Fresh clean backup run 37181598896 succeeded, including service-boundary audit, logical dumps, archive/checksum upload and size/integrity verification. Pre-reset restore selections are blocked.
- Fresh live DB read confirms catalog v407 with 0 questions/concepts/sources/notes/attempts/media objects and all 3 accounts preserved. Keyword/search UI deployment is confirmed by production build success; direct served-byte inspection is unavailable from this session (HTTP 403), so byte parity is not claimed.
- FIRST_REPLACEMENT_BATCH.md organizes 12 distinct questions and 3 connected disease concepts, default respiratory system (asthma/COPD/pneumonia), assessment/section/confusion links, explicit source and keyword declarations and duplicate-occurrence acceptance. This is a plan, not fabricated clinical inventory. Newly supplied uploads and actual administrator inspection are needed for genuine import-to-publication acceptance. Private imports remain deferred.

## 2026-10-04 — authorized permanent content reset and keyword filtering
- Owner selected permanent shared-content deletion including dependent history. The digest-bound explicit 45-table reset passed a live rollback rehearsal and then committed: catalog v406 → v407; zero questions/concepts/sources/notes/attempts/sessions/mock runs/reviews/intake remain. Removed 184 question versions, 180 concepts, 43 sources, 3 notes, 27 attempts and dependent evidence. All 3 accounts, singleton admin/grants, feature/infrastructure settings and exam rule configuration preserved.
- Five private media objects deleted through Supabase Storage API; live object count is zero. Temporary token-authenticated fixed-scope maintenance function was replaced immediately with JWT-required 410 disabled code. No reusable content-erasure API added. Provider physical WAL/backups and already-downloaded device copies cannot be erased by this application; repository engineering/evaluation fixtures and Git history remain but must never repopulate the erased catalog.
- Added shared Notes/Graph free-text prompt/options/concept search and keyword filter; conservative question-pattern aliases plus explicit custom `classification.tasks` tags. Counts show unique matching canonical questions within other filters, sorted descending and alphabetical on ties. URL persists filters; filtered Study uses the same selection. No answer/explanation indexing or invented exam frequencies.
- Public review sampling supports a provisional Qbank-home policy Marrow → PrepLadder → DAMS. No sufficient sample ranks other platforms; deterministic lower-priority alphabetical fallback remains. PYQ precedence is unchanged. Evidence/limits in PLATFORM_PRIORITY.md.
- Verification: 943 Node tests and 3 Python erasure-plan tests pass; Notes/Graph/search/reload and one-action admin flows pass on phone/tablet/desktop. Pre-reset R2-copy erasure and a fresh clean backup are prepared but NOT executed. Automatic approval review twice rejected the feature-branch GitHub push as lacking explicit authorization for the personal repository destination, despite prior project context. Owner explicitly authorized this repository destination and publication on 2026-10-04 (Q1), and organized-first-batch work (Q3). Feature publication resumed; release evidence follows below. Fixed old restore drill disabled; latest restore rejects pre-reset snapshots. First replacement batch organized in FIRST_REPLACEMENT_BATCH.md: 12 distinct questions, 3 connected disease concepts, source/keyword declarations and genuine duplicate-occurrence acceptance. Real uploaded-content acceptance remains pending until the owner supplies content; no clinical reviews fabricated. Private imports remain deferred.

## 2026-10-04 — canonical library and reviewed AI/repository intake
- Implemented the binding `CONTENT_LIBRARY_CONTRACT.md`, linked first in README and AGENTS. Exclusive homes: PYQ overrides coaching platforms; repeated exam/year/session occurrences stay on one question; otherwise Marrow > PrepLadder > DAMS. Exact matching ignores option order/IDs and rejects answer/identity conflicts. Near-equivalent clinical wording remains administrator judgment.
- Added authenticated connected Notes/Graph with 19 subjects plus system/organ/domain/task facets, version-bound exact/secondary/prerequisite/confusing connections, real wrong/total counts and latest-answer colors. Filtered Study uses existing scoring/session storage; an unfinished session is explicitly offered first. Existing learner destinations and features remain available.
- Added immutable admin/repository schema-v1 intake and one attested Review & publish transaction. `content/inbox/<importId>.json` reaches the app through the main-branch workflow using the existing server credential; manual admin JSON shares the gate. Unrelated ChatGPT/AI chats cannot auto-sync without repository/API authority. Staging never publishes.
- Migration `20261003224909_canonical_content_library.sql` applied; `content-library-api` v1 active. Existing singleton admin Medical/References/Rights permissions renewed through audited grant events for the owner-authorized workflow; no clinical reviews were generated. Catalog remains 184 question versions, 3 notes, 27 attempts; shared import inbox is empty. No content deleted or learner history rewritten.
- Independent whole-branch review found six Important edge cases; all corrected with RED/GREEN regressions. A follow-up revision-link regression was also corrected and rechecked. 940 Node tests, syntax/catalog/ledger checks, the 57-file static build and all 15 responsive browser suites pass, including new Notes/Graph, source-filter, escaping, outage, one-action review and explicit unfinished-session handoff checks at 390/820/1440px. Live rollback acceptance verifies deduplication, source reuse, identity/answer conflicts, receipts and all-or-nothing publication without retaining fixtures. RLS/service privileges deny direct browser access; security advisor has no new WARN/ERROR (existing leaked-password-protection warning remains).
- Private imports remain ROADMAP ONLY. Actual medical upload → admin inspection → learner publication is the next real-content acceptance; no supplied clinical content was fabricated or approved. Old-content reset needs an export and exact archive/purge manifest. Released through PR #196, merge `3c23c55f08f07234c715ebb32600331b8340f3d3`. Main Foundation check/browser, both Cloudflare production Worker Builds and the Shared content inbox workflow all passed. The empty inbox run performed no content staging. All four deployed Edge Function source files match the repository exactly; ten shipped library/navigation files match byte-for-byte on both Cloudflare and Render with no-store headers; live unauthorized token/origin boundaries return the expected 401/403. The pre-existing Cloudflare branch-preview build still fails, while main production builds pass.

## 2026-10-04 — no-login development fallback and confidence browser acceptance
- User authorized continuing without Cloudflare dashboard login. Reconfirmed `main` at `28ab19d` has green production learner/heartbeat builds and Foundation jobs; the docs-only PR #194 branch build failed with no GitHub error text/annotations. Provider settings and the existing preview model remain unchanged; the branch-preview failure is still unresolved.
- Added a seven-day GitHub `learner-static-preview` artifact from the existing allowlisted static bundle, enabling local branch inspection without a Cloudflare credential or a new hosting service. The artifact is not a hosted preview or authenticated production acceptance. Both Foundation jobs remain necessary release checks.
- Browser acceptance of the actual built frontend reproduced two confidence bugs: an answer change erased a prior confidence choice, and the confidence controls remained editable during answer submission. The choice now stays in memory for the exact session/position/question version, survives an answer retry, clears for the next question and freezes while the answer is saving. No confidence enters scoring or recommendation requests.
- Added phone/tablet/desktop browser coverage for pre-answer ordering, required beta choice, next-question reset, same-key answer retry, confidence-delivery failure, disabled/unavailable entitlement and reload without duplicate evidence. Tests use synthetic external API responses and create no production learner data. Real hosted beta acceptance remains open.
- Verification: RED reproduced both confidence defects independently; GREEN passed the built-bundle confidence checks plus existing Study-entry and authentication-recovery suites on phone/tablet/desktop. All 914 unit tests, syntax/catalog checks, the 50-file build and diff whitespace checks pass. PR #195 Foundation `check` and all 14 browser suites succeeded on the runtime change; independent review found no issues. The downloaded 158,545-byte preview artifact matches all 50 local built files and GitHub's SHA-256 digest. Release tracking: PR #195. No sending-domain configuration or real alert email delivery is claimed; those remain separate access/domain gates.

## 2026-10-03 — release continuation and Resend acceptance correction
- Inspected `main` at `c14d0dd8a10e0e5c5640c1b6f5316712a550b39d` (merged PR #192). Foundation and both Cloudflare production builds are green. The branch-preview failure is real but its private build log is unavailable behind Cloudflare's sign-in verification error; no speculative dashboard fix is claimed. Exact continuation evidence is in `CLOUDFLARE_WORKER_STATIC.md`.
- Dedicated Resend sending-only credential created and stored only in Supabase Vault for future owner alerts. Live `GET /usage` returned `401 restricted_api_key`, contradicting the provider announcement's any-key claim. No account-management key was created. No owned sending domain is configured, and production email delivery is unverified.
- Fixed the reproduced monitor defect: credential HTTP 401/403 now produces a neutral configuration gap instead of a critical provider outage. Missing/malformed successful quota responses fail closed; uncapped limits remain null instead of fake zero, and zero allowance is exhausted. The existing alert cadence, streak/cooldown/recovery policy and learner evidence are unchanged.
- Executed the actual TypeScript probe against controlled HTTP boundaries: RED confirmed incorrect outage classification, malformed-data false health and uncapped-quota loss; GREEN covers all three plus valid quotas, either 90% threshold, zero allowance, missing credentials and real service errors. All 914 tests, syntax/catalog checks, the 50-file static build and diff whitespace checks pass. No frontend change or new runtime dependency/recurring service was introduced.
- Released as PR #193, merge `42fd22e0ffd93b8e056b11225b09d6af25225092`; post-merge Foundation check/browser and both Cloudflare production Worker Builds pass. Deployed `infrastructure-monitor` v5 with its source pinned to that exact merge commit. Fresh live run at 17:13:28 UTC reports Resend `configured / credential_permission_required` with HTTP 401, proving the correction on the hosted path. Cloudflare, Render, Supabase and R2 workflow evidence remain healthy; Sentry still lacks its read credential/org/project. No real notification delivery receipt exists.
- Next: unblock Cloudflare dashboard access and inspect the failed branch build; provide an owned sending domain for DNS verification and sender configuration; separately decide whether Resend usage merits a credential with broader access. The next product milestone is hosted beta confidence-capture acceptance and a descriptive confident-wrong review design using existing evidence, without changing scoring, Study Now or inference. Real delayed retrieval remains necessary before advancing memory/mastery models.

## 2026-10-03 — login/Home and authentication recovery fixes
- Reconciled with main at 8c48542 rather than delivering the older audit checkout. Preserved newer Account projection isolation, landing presentation, retention delivery and Cloudflare hosting changes. The original dirty checkout remains separate and untouched.
- Successful password sign-in, signed-in signup and non-recovery implicit callbacks now land on Home; bounded same-origin pending OAuth consent still takes precedence. Password recovery and deliberate authenticated Account visits stay on Account. Sign-in prevents duplicate submissions and restores its button after failure.
- Transient network, rate-limit, server and malformed refresh-response failures retain persisted credentials but reject the attempted operation. Revoked/missing tokens and 401/403 refresh rejection still clear the session. No expired-token offline authorization is introduced.
- Home catches refresh failures inside the same recovery boundary as projection failures, clears stale learner/admin presentation and offers a working Retry. Initial auth resolution no longer renders cached authenticated content before session checking.
- All browser auth entrypoints use lazy guarded storage access. Denied localStorage no longer aborts module startup; sign-in cannot claim success without persisted credentials and explains unavailable browser storage. Optional sessionStorage failure cannot derail ordinary Home landing.
- Verification: 873 automated tests passed, syntax/catalog/integrity checks passed, Cloudflare static bundle built (45 public files), all 13 browser suites passed including new phone/tablet/desktop auth recovery coverage. The shipped beta-entry suite now asserts Home before deliberately visiting Account.
- Native iOS Safari and fresh real-account hosted acceptance remain separate release checks. No production learning writes, human-review decisions, DB migration or provider-setting changes were made. Release status must be recorded after CI/deployment verification.
- Next: release this bounded fix after CI, verify served-source parity on the existing hosted origin(s), and complete native-device acceptance.

Updated: 2026-09-28 (Asia/Kolkata).

## Completed
- M00–M02: repository governance, validated learning events, canonical content/versioning and publication gates.
- M03 complete: responsive Today, Demo QBank, Progress and Study plan; editable personal countdown, dark mode and random local learner identity.
- Nonclinical demo loop: start/resume, persisted selection and answer, explanation, bookmarks, incorrect-latest queue, completion, descriptive accuracy and JSON export.
- IndexedDB transactions atomically save session and event ledger; stable submission IDs prevent duplicates; failed/corrupt storage never silently resets data.
- Project context reference rule preserved; M03 reconciliation and storage boundary documented.
- M04a implemented: separate learner-scoped local API, hashed/expiring operator credentials, SQLite event/session persistence, server scoring, eligible version selection, immutable receipts, safe retries, bookmarks, progress and export.
- M04b is DONE: real email-confirmed Auth, cross-device continuity, current-session logout, live token refresh, trusted study API reads, RLS isolation, browser Sentry capture and two-distinct-real-account hosted learner isolation are documented as verified.

## Verification
- Original M03 foundation/browser verification passed phone (390px), tablet (820px) and desktop (1440px) Chromium flows.
- M04a verification passed server authorization, learner isolation, scoring, retries, restart recovery, catalog immutability, failure rollback, payload limits and sanitized errors.
- Current main Foundation checks passed in run 36188364648 after M04b integration, including auth/cloud adapter tests and mocked browser account persistence/sign-out.
- A real email-confirmed cloud learner flow is verified. Native iOS Safari remains a later compatibility check.

## Current task
M14 production-readiness hardening is the active bounded infrastructure slice. This branch adds a production health endpoint, hosted-server security headers, graceful shutdown/timeouts, and CI verification. It does not deploy or claim production readiness by itself. Remaining M14 gates include live Render service-health audit, Auth leaked-password hardening, consolidated runtime/alert evidence, production-shaped capacity/load evidence, and a release decision after the content/review gates are confirmed.

## Next M14 step — production configuration boundary
- Production origin must be treated as an explicit Supabase Auth/CORS allow-list entry, not inferred from the preview origin.
- The Edge Function currently has the preview origin hard-coded alongside configured origins. Before production, the production web origin must be supplied through the deployed `MLOS_ALLOWED_ORIGINS` secret/configuration and the preview origin should remain only if preview access is intentionally retained.
- Supabase Auth Site URL and redirect allow-list must include the final HTTPS production origin before email/Google authentication is exposed there.
- No secret, service-role key, Resend key, Sentry auth token or AI-provider credential may be added to client code.
- This configuration work must be completed in the deployment/control plane, then verified with live unauthenticated, authenticated, CORS and OAuth callback checks.

## M14 production-readiness branch — 2026-10-02
- Branch: `prod/m14-production-readiness`.
- Added `/healthz` and `/readyz` JSON health endpoints to the Node hosted server.
- Added baseline response hardening: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and restrictive `Permissions-Policy`, while retaining the existing CSP.
- Added request/header/keep-alive timeouts and graceful SIGINT/SIGTERM shutdown handling.
- Render preview health checking now uses `/healthz`.
- Added a dependency-free hosted server health/security regression test and wired it into CI.
- Verification status: implementation committed to the production-readiness branch; GitHub CI is the next executable verification. No production deployment was performed.
- Limitation: Render control-plane service configuration is not changed by this branch. Production remains unreleased until M14 gates and release checks are explicitly satisfied.

## M04b account integration
- Supabase Auth user UUID is the canonical cloud learner ID. No duplicate account-to-learner mapping table is introduced.
- Browser receives only the project URL, publishable key and learner-owned session tokens. Passwords are not persisted. Database passwords and Supabase secret/service-role keys remain server-only.
- `/web/account.html` is linked from the learner shell. The M03 local UUID/evidence remains deliberately separate and is not silently promoted into cloud evidence.
- Deployed Supabase Edge Function `study-api` version 3 uses explicit Supabase Auth token validation with gateway `verify_jwt=false`, which is required for the current publishable/secret-key model. It independently resolves the authenticated learner.
- Cloud operations cover questions, progress, export, sessions, answer, advance, cancel and bookmarks. Learner identity, correctness, concept/event IDs and authoritative timestamps are server-derived.
- Live `study_catalog` intentionally contains zero published questions, so account work cannot expose unreviewed medical content.
- Existing study tables use learner-scoped RLS reads; trusted mutations remain server-only through atomic database functions.
- Live smoke verification passed in GitHub Actions run `36188568697` attempt 2: unauthenticated calls return 401, the local learner-app origin passes CORS preflight, and an unknown browser origin is rejected with 403. The test also confirms required Edge Function server configuration is present.
- Email-confirmation callback handling is implemented before Resend rollout: Auth fragments landing at the local site root are forwarded to the account surface, the access token is verified with Supabase Auth before persistence, callback errors create no session, and token-bearing URL fragments are immediately removed from browser history.
- Resend is connected to the workflow but currently has no verified sending domain. No real Auth confirmation email has therefore been validated.
- This is backend/account integration preparation, not a deployed learner application.

## Supabase live state
- Dedicated project: `medical_learning_os` in `ap-south-1`, project ref `iyapppmeieqhflnzslao`. It remains separate from `NEETPG2027`.
- Live migration history contains five study migrations: `study_state_v1`, `study_attempt_session_fk_index`, `study_atomic_mutations`, `shared_study_catalog`, and `answer_catalog_version_gate`.
- Live schema contains `study_sessions`, `study_attempts`, `study_bookmarks`, `study_catalog`, learner-scoped RLS reads and atomic mutation functions.
- Historical migration SQL was applied before this repository had migration files; `supabase/migrations/README.md` records provenance without inventing old SQL.
- Auth had no real learner users when last audited; Supabase Storage had no user objects.

## Infrastructure preparation
- Cloudflare R2 backup transport is private and verified end to end. The first logical Supabase backup succeeded and a disposable local restore drill verified archive/SQL integrity and study-data invariants.
- Weekly backups are scheduled Sunday 03:47 IST / Saturday 22:17 UTC with storage guards and report-only retention auditing.
- R2 and the Supabase heartbeat are infrastructure preparation only; neither implies that the learner app is deployed.
- PostHog is connected. Resend is connected but lacks a sending domain. Sentry browser error capture is operational on the Render preview; there is no ChatGPT Sentry connector.

## Not implemented / not yet verified
Two-real-account isolation testing, reviewed medical content, authenticated reviewer workflow, production app deployment, review scheduler, NeuralVault, adaptive AI, and native iOS Safari verification.

## Resume prompt
“Read AGENTS.md, docs/PROJECT_CONTEXT.md, docs/STATUS.md, docs/SUPABASE_AUTH.md and docs/CLOUD_ACCOUNT.md in Medical_Learning_OS. Consult relevant context from the ChatGPT project ‘medical learning os’. Finish the next incomplete M04b gate with meaningful verification. Keep the local demo separate from cloud learner evidence. Work only in this repository.”


## Resend Auth email preparation — 2026-09-26
- Resend is connected and a dedicated sending-only credential now exists for Supabase Auth SMTP.
- No sending domain is verified yet, so custom SMTP is not production-ready and no real learner email-confirmation flow is claimed.
- Repository documentation now defines the SMTP boundary and activation gate in `docs/RESEND_AUTH_SMTP.md`.
- Next user-owned dependency: choose a product/auth sending domain and publish Resend DNS records. After domain verification, configure Supabase custom SMTP and run one real email-confirmed account test.
- The SMTP credential remains secret and is intentionally absent from GitHub and browser configuration.


## Auth email delivery gate — 2026-09-26
- Resend is connected, but there is currently no verified sending domain.
- A sending-only key named `Medical Learning OS Supabase SMTP test` exists, but its secret was shown only at creation time and is not recoverable from the provider listing. Do not depend on that credential for deployment.
- Do not create another unrestricted production key yet. First verify a dedicated authentication sending domain, then create a domain-restricted sending-only key and configure Supabase Auth custom SMTP.
- Until then, Supabase's built-in mailer remains development-only and is not a production delivery dependency.


## No-domain development path — 2026-09-26
- No custom sending domain is currently owned, so Resend production SMTP is deliberately deferred rather than weakening email-confirmation security.
- For one controlled development E2E, Supabase's built-in mailer may be used only with a pre-authorized organization team address. This is not a production delivery path.
- Signup now requests an explicit callback to the account surface and accepts HTTPS redirects (plus localhost HTTP for development).
- A public preview deployment is the next independent step so the real confirmation callback can land on a reachable application URL. Production deployment remains a separate release gate.


## Preview deployment preparation — 2026-09-26
- Added a Render Blueprint for a free Singapore Node preview with health check and deploy-after-CI behavior.
- The application server already supports explicit `0.0.0.0` binding through `MLOS_HOST` for hosted preview use.
- Automatic service creation is currently blocked because the connected Render workspace cannot fetch the private GitHub repository. Keep the repository private; connect Render's GitHub integration to this repository instead.
- Once connected, the generated Render URL becomes the Auth callback/origin for the controlled no-domain M04b E2E test. This remains a preview, not production deployment.


## Live Render preview — 2026-09-26
- Render service `medical-learning-os-preview` is live on the free Singapore plan at `https://medical-learning-os-preview.onrender.com`.
- The service deploys the private `main` branch and runs `npm start` with `MLOS_HOST=0.0.0.0`.
- The Supabase `study-api` CORS allowlist now includes the Render preview origin.
- The Render account callback URL is allowed in Supabase Auth and the real confirmation flow has passed.
- This is a development preview, not production release.


## Real Auth E2E verified — 2026-09-26
- A real learner account was created through the live Render preview, confirmed by email, and observed as confirmed in Supabase Auth.
- Supabase Auth now has one confirmed learner user; the confirmation produced a real authenticated session and sign-in event.
- Immediately after confirmation, the browser successfully called the deployed `study-api` `/progress` and `/questions?filter=all` routes with an authenticated JWT; both returned HTTP 200 from Edge Function version 4.
- Server-side reads for the learner's attempts, bookmarks and catalog also returned successfully. No unreviewed medical questions were opened because the live catalog remains intentionally unpublished.
- This closes the first real Auth → callback → session → trusted study API path. Cross-device continuity has since been verified; M04b remains open for real refresh behavior and two-real-account isolation.


## Logout verification and correction — 2026-09-26
- Live logout reached Supabase Auth successfully and cleared the learner's server sessions.
- The test exposed that the raw logout endpoint defaults to global scope, which signs the learner out from every device.
- The learner-facing Sign out action has been corrected to use `scope=local`, matching expected per-device behavior while retaining an explicit future option for “sign out everywhere.”
- The browser now has an explicit token-refresh verification path through the Cloud study Refresh action. Remaining live gates are a successful refresh after the earlier global-logout cleanup and two-real-account isolation.


## Cross-device continuity verified — 2026-09-26
- The confirmed learner signed in from a separate browser/device context and Supabase created a distinct session for the same account.
- That session independently reached the trusted progress and question-list routes.
- This verifies account-scoped cloud continuity while the M03 local demo identity/evidence remains separate.


## Live RLS isolation verification — 2026-09-26
- A rollback-only live test inserted temporary session, attempt and bookmark rows for the confirmed learner, then evaluated the real RLS policies under two JWT principals.
- The owning principal saw exactly 1 session, 1 attempt and 1 bookmark.
- An unrelated principal saw 0 sessions, 0 attempts and 0 bookmarks.
- The transaction was rolled back, so no test study evidence persisted.
- The reusable harness is stored at `supabase/verification/rls-isolation.sql`.
- This proves the live learner-scoped read policies behave correctly, but it does not replace the final two-real-account browser test.


## Explicit refresh verification path — 2026-09-26
- The Cloud study Refresh action now forces one Supabase session refresh before reloading learner progress/questions.
- Browser CI verifies that the refresh-token exchange occurs and the refreshed token continues through the trusted cloud path.
- Refresh failure clears the unusable local session and returns the learner to sign-in instead of leaving stale authenticated UI.
- A live successful refresh-token exchange has now been observed on a fresh session, followed by successful trusted cloud-study reads.


## Live refresh-token verification — 2026-09-26
- The live learner account successfully completed an explicit Supabase refresh-token exchange from the Render preview.
- Supabase Auth returned HTTP 200 for the refresh-token grant.
- Immediately after the exchange, the same authenticated session successfully called `study-api/progress` and `study-api/questions`; both returned HTTP 200.
- The two-device logout behavior was also observed from the learner UI: the signed-out device remained signed out after reload while the other device remained connected.
- M04b's remaining live security gate is two-distinct-real-account isolation through the hosted account and study API path.


## Observability foundation — 2026-09-26
- Added a dependency-free browser error-monitoring boundary with application-side redaction for tokens, credentials, email addresses and sensitive fields.
- Local learner persistence failures and unexpected cloud/account failures now pass through the monitoring boundary without changing product behavior.
- Monitoring itself is failure-isolated and remains a no-op until a Sentry SDK/provider sink is configured.
- Sentry remains the selected provider. No Sentry project/plugin is connected yet, so DSN/provider configuration is still an operator-side gate.
- Session Replay and broad learner telemetry are explicitly deferred. The initial observability scope is operational errors only.


## Sentry browser wiring — 2026-09-26
- Connected the live Render preview to the Sentry Browser JavaScript loader using the project's public DSN/client key.
- Sentry is enabled only on the hosted Render preview; localhost/CI remain disconnected to avoid polluting the project with test noise.
- Initial scope is errors only: PII sending disabled, breadcrumbs disabled, tracing sampled at 0, transactions dropped, Session Replay/Logs/Metrics remain off.
- Application-side scrubbing still runs before provider delivery, and Sentry receives only the exact CDN/ingest origins allowed by CSP.
- A one-shot preview-only `monitoring_test=1` query trigger exists temporarily to validate the full sanitized ingestion path. Remove it after the first verified Sentry event.
- No Sentry API/auth token is stored in git or browser code.


## Sentry loader-order correction — 2026-09-26
- The first hosted verification produced no issue in Sentry.
- Root cause was the integration not following the Loader Script ordering contract closely enough.
- The Sentry configuration shim is now the first script, followed by the generated Loader Script, followed by Medical Learning OS application modules.
- The second controlled test uses a new one-shot session key so browsers that attempted the first test will send again.
- CI guards the script ordering and errors-only privacy settings.


## Sentry ingestion verified — 2026-09-26
- Sentry received the controlled Medical Learning OS browser test event from the live Render preview.
- The visible issue title showed the injected learner email/token material redacted, confirming the end-to-end privacy scrubber path.
- The temporary `monitoring_test` trigger has been removed.
- The verification also revealed that the previous static Loader Script initialized Sentry on localhost/CI, which polluted Sentry with deliberate browser-test failures. Sentry loading is now conditional on the Render preview hostname only.
- Real unexpected preview failures continue to flow through the provider-neutral monitoring adapter; Session Replay, tracing, Logs and Application Metrics remain disabled.


## Trusted-read resilience — 2026-09-26
- Sentry surfaced one real `catalog_unavailable` error from the hosted account flow.
- Supabase logs traced it to a single internal `study_catalog` Data API read returning HTTP 401 / `PGRST303`, while the same server secret key successfully read the catalog again shortly afterward.
- The trusted Edge Function now retries exactly once, after 75 ms, only when a server-side read fails with `PGRST303`.
- The retry applies only to trusted read operations. Writes/RPC mutations are never blindly retried.
- The retry emits only a sanitized operation/code warning to Supabase logs, with no learner data or credentials.
- Persistent failures still fail closed with the existing `catalog_unavailable` / `study_read_failed` responses.


## M04c authenticated review foundation — 2026-09-26
- Added the first durable M04c schema for authenticated content review without publishing any medical content.
- `content_reviewer_grants` models server-only authorization for medical/reference/rights review gates.
- `content_review_events` stores immutable review decisions with one decision per gate per question version.
- `record_content_review` is the only application mutation path and is executable only by the trusted service role.
- The database computes a SHA-256 fingerprint for the concern reviewed by each gate; current semantics are medical, references and rights-specific.
- Browser/learner roles have no table/function access, direct service-role inserts are not granted, and reviewer identity must later come from a trusted JWT-resolving `review-api`.
- No reviewer has been granted, no medical review has been recorded, and the learner catalog remains closed.


## M04c review API foundation — 2026-09-26
- The authenticated review-evidence migration is live and rollback-only verification passed without persisting grants, review events or synthetic catalog content.
- Added a dedicated `review-api` Edge Function boundary for reviewer identity, queue access and review submission.
- Reviewer identity is always derived from a verified Supabase JWT; the browser cannot submit `reviewerId`.
- `GET /queue` exposes only `in_review` content to reviewers with the matching medical/references/rights grant.
- `POST /reviews` records decisions only through `record_content_review`; it cannot publish content or alter reviewer grants.
- No reviewer grant has been assigned and no medical content has been reviewed or published.


## Atomic review projection foundation — 2026-09-26
- Hardened the M04c review model so authenticated review events are the authority and catalog review metadata is updated transactionally from those events.
- Review evidence remains immutable and catalog review/status projection remains transactional. Gate-specific fingerprints now supersede the earlier single substantive-target hash.
- A changed target invalidates prior review evidence instead of silently reusing it.
- A rejected question version is terminal for review and must be replaced by a new version.
- Three approved review gates advance content to `verified` only; nothing is published automatically.


## M04c verified publication gate — 2026-09-26
- Added a server-only verified → published database transition.
- Publication rechecks each medical/reference/rights review against its own current fingerprint and requires three approvals.
- Referenced source rights must still be resolved at publication time.
- Publishing a newer version atomically retires the prior published version and increments the catalog version.
- No browser publication endpoint exists and no medical content has been published.


## M04c live review/publication verification — 2026-09-26
- The authenticated review-evidence schema, atomic review projection and verified publication gate are live in the dedicated Supabase project.
- `review-api` is deployed and ACTIVE at version 2 with explicit JWT verification in the function body and gateway `verify_jwt=false`.
- Historical rollback-only verification proved three-gate projection and publication mechanics under the earlier shared-hash model. The later gate-specific fingerprint migration supersedes that hash semantics before any real review events existed.
- A second rollback-only verification published a synthetic verified v2, atomically retired the prior published v1, produced a canonical server publication timestamp and left the browser `authenticated` role unable to execute the publication function.
- All verification transactions were rolled back. Live state remains: 0 reviewer grants, 0 review events, catalog version 0, and 0 catalog questions.
- No medical content has been reviewed or published.


## M04c reviewer workspace — 2026-09-26
- Added a responsive authenticated reviewer workspace at `/web/review.html`.
- The Cloud account page discovers reviewer grants server-side and surfaces the workspace only to accounts with at least one granted gate.
- The workspace displays the exact in-review question version, answer key, explanation, provenance and resolved source package for the selected review gate.
- Medical/reference/rights guidance is gate-specific; notes are mandatory and approvals/rejections are one version at a time.
- Review submission contains no reviewer ID. Reviewer identity remains derived from the verified Supabase session in `review-api`.
- Browser CI covers granted access, queue rendering, review submission, queue removal and absence of browser-supplied reviewer identity.
- There is still no publication control in the reviewer UI, no reviewer grant assigned in live data, and no medical content published.


## First medical review seed — 2026-09-26
- Added one genuine source-grounded medical question package for M04c lifecycle validation.
- Topic: immediate first-line treatment of anaphylaxis after vaccination.
- The item is explicitly AI-generated, not a PYQ, and currently `in_review` with zero approvals.
- The cited CDC source's rights status is deliberately unresolved rather than overclaimed; publication is therefore blocked even if medical/reference review later passes.
- CI validates the package structure, AI provenance, review-only state and zero published questions.
- The goal is to prove one complete high-integrity content lifecycle before importing at scale.


## Live first medical review target — 2026-09-26
- The first genuine medical review package has been loaded into the live shared catalog.
- Live catalog version is now 1 with exactly one question, `emergency:anaphylaxis:first-line-drug@1`.
- The question is `in_review`, not published. Learner-visible published question count remains 0.
- Reviewer grants remain 0 and authenticated review events remain 0.
- The referenced CDC source retains `rights.status=unknown`, so the publication gate will fail closed until rights are explicitly resolved.
- The exact review package is versioned in `data/medical-seed-anaphylaxis-review.json`; live content was loaded from that canonical repository file.


## Gate-specific review and rights evidence — 2026-09-26
- Replaced the too-coarse shared review target hash with separate medical, references and rights fingerprints.
- Added immutable `source_rights_events` bound to source fingerprints.
- Added trusted `resolve_source_rights` and `review-api/source-rights` paths; browser reviewer identity remains server-derived.
- Rights approval now fails closed until every referenced source has allowed, current rights evidence.
- Publication independently rechecks medical/reference/rights fingerprints plus source-rights evidence.
- The reviewer UI can resolve source rights only inside the rights gate and disables rights approval while sources remain unresolved or restricted.
- The current live anaphylaxis seed remains `in_review`; this change does not grant a reviewer or publish content.


## Live gate-specific review verification — 2026-09-26
- The gate-specific review and source-rights migration is live in the dedicated Supabase project.
- `review-api` is ACTIVE at version 3 with source-rights resolution support.
- Rollback-only verification on the real anaphylaxis review seed produced three review events with three distinct gate fingerprints, one immutable source-rights event, a current source fingerprint match, and a `verified` catalog projection.
- The same rollback-only path then passed the trusted publication function with all three gate fingerprints matching their current targets.
- After rollback, live state remains unchanged: 0 reviewer grants, 0 review events, 0 rights events, catalog version 1, one `in_review` question, zero published questions, and the CDC source rights status remains `unknown`.
- The live Render reviewer workspace includes source-rights resolution controls only for rights reviewers; no reviewer has been authorized yet.


## Reviewer grant governance — 2026-09-26
- Added auditable grant/revoke events for medical, references and rights reviewer capabilities.
- Current reviewer grants now record granting actor, reason and optional expiry.
- `review-api` resolves only active grants through a database function; expired grants disappear from the reviewer workspace without relying on browser state.
- Review recording and source-rights resolution independently recheck active authorization at mutation time.
- Grant mutation remains service-only; there is no browser self-grant or reviewer-admin UI.
- No real reviewer grant is created by this change.


## Live reviewer grant governance verification — 2026-09-26
- Reviewer grant governance is live in Supabase and `review-api` is ACTIVE at version 5.
- A rollback-only verification granted the existing confirmed account the medical-review capability with a one-day expiry, verified that the service role could manage the grant, revoked it, and observed two immutable grant audit events inside the transaction.
- The learner/browser `authenticated` role cannot execute `set_content_reviewer_grant`.
- Rollback restored live state to 0 reviewer grants and 0 reviewer-grant events.
- The first medical review target remains `in_review`; no medical review or publication was created.


## First real medical publication and learner attempt — 2026-09-26
- The anaphylaxis item completed medical, references, and rights/provenance review.
- All three review fingerprints and the source-rights fingerprint match current targets.
- Source use is recorded as `citation_only`; protected third-party expression is not copied or adapted.
- The server-only publication transition published `emergency:anaphylaxis:first-line-drug@1` at catalog version 6.
- The authenticated medical QBank delivered the published version through `study-api`.
- The first real learner attempt persisted exactly once, selected `im-epinephrine`, was scored correct server-side, and stored a source-bearing receipt at catalog version 6.
- One confirmed learner has this attempt; the other confirmed real account has no attempts. The hosted two-account isolation proof remains open.
- The medical QBank option labels now render A/B/C/D instead of internal option IDs; CI and Render deploy passed.
- The current one-question session remains open until the learner taps Finish session.


## M04 completion — two-account hosted isolation — 2026-09-26
- Two confirmed real learner accounts completed the hosted isolation proof.
- Before Account B answered, its cloud record showed 0 attempts and 0 correct while Account A retained its own prior attempt, proving read isolation.
- Account B then completed the same published medical question through the authenticated medical QBank.
- Final database state: 2 learners with attempts, 2 total attempts, 2 total sessions, 2 closed sessions, 0 open sessions.
- Per-learner attempt counts are [1,1] and per-learner session counts are [1,1].
- Attempt-to-session learner ownership mismatches: 0.
- Duplicate learner/question attempts in this test: 0.
- M04 Core study loop and QBank is DONE. The next delivery path is M05 Revision and study planning.


## M05b revision persistence foundation — 2026-09-26
- Added `study_revision_state`, keyed by learner and exact question version, as a rebuildable scheduling projection over immutable attempts.
- Added service-only `study_rebuild_revision_state`; authenticated browser roles cannot execute it or mutate revision rows.
- Revision rebuild uses the same learner advisory lock as trusted attempt recording.
- The live migration passed rollback-only preflight, then applied successfully.
- Both existing real learners were rebuilt from their independent attempt histories: 2 projection rows for 2 learners, one row each.
- Current evidence checks show 0 arithmetic mismatches, 0 event-count mismatches and 0 policy-version mismatches.
- Both existing correct attempts are scheduled in the future under `bootstrap-binary-v1`; none are due immediately.
- `study-api` v6 exposes authenticated `GET /revision/due`. It returns published content only, strips answer keys, labels the policy provisional and keeps scheduling distinct from mastery.
- Post-answer projection refresh is fail-soft: an acknowledged attempt is never rejected because revision projection failed.
- The Medical QBank overview now has a nonblocking revision-status panel; hosted UI verification remains before M05b is marked DONE.


## M05b hosted verification and M05c Study Now start — 2026-09-26
- Hosted Medical QBank verified the authenticated revision projection end to end: 0 due now with the correct next scheduled review timestamp and explicit wording that scheduling is not mastery.
- M05b is DONE.
- Added a pure Study Now planning domain module that accepts available minutes as the primary workload input.
- Study Now currently selects only genuinely due revision items, ordered oldest-due first. It does not pull future reviews early simply to fill spare time.
- Per-item time estimates use the learner's observed prior response duration plus bounded review overhead; selection is capped by the available time budget rather than a fixed question target.
- UI presets are 10, 20, 30 and 60 minutes while the API accepts 5–120 minutes.
- If a learner already has an open session, Study Now resumes it rather than creating a competing session.
- `POST /study-now/start` is live in `study-api` v7 and derives learner identity from the authenticated session.
- Study Now returns learner-safe question payloads through the existing trusted session state; answer keys remain server-side until an attempt is recorded.
- The Medical QBank shows Study Now time controls only when revision items are actually due.
- Full GitHub checks passed and the latest Render deployment is live.
- M05c remains IN PROGRESS until a genuinely due hosted item exercises the complete Study Now start → answer → reschedule loop.


## M05c explainable Study Now v2 and evaluation evidence — 2026-09-26
- Study Now v2 is live in `study-api` v10 and the latest Render learner UI.
- Selection remains time-budgeted and explainable. Candidate reasons are `mistake-repair`, `due-revision` and `new-learning`; there is no composite mastery/recommendation score.
- Due work is considered before unseen published content. Future scheduled reviews are not pulled early merely to fill time.
- A due item whose latest answer was wrong is labelled `mistake-repair`; it is not immediately repeated before its scheduled due time.
- Study Now now exposes unseen published content as a separate new-learning class when time remains after fitting due work.
- Each newly created Study Now session is atomically bound to an immutable `study_recommendation_events` receipt containing strategy, available minutes, selected items, reasons and estimated workload.
- Authenticated browser roles can read only their own recommendation receipts and cannot create or mutate them. Session creation plus receipt persistence occurs in one service-only transaction.
- Recommendation receipts are included in learner export, preserving the rationale for future replay/evaluation.
- Added rebuildable `study_recommendation_outcomes(learner)`: completion, planned/attempted counts, initial correctness, actual answer time, candidate mix and the first later retrieval of each selected question.
- `GET /study-now/outcomes` returns these metrics from authenticated server-derived evidence and explicitly marks them descriptive/non-causal.
- Rollback-only proof produced a one-item recommendation with a correct 42-second initial response and a later incorrect 51-second retrieval; the outcome projection linked both correctly, then rollback restored live data.
- Full GitHub checks passed before the outcomes endpoint deployment. The live outcome projection currently has no real Study Now event yet because both test learners have already seen the only published question and it is not due until the scheduled review.
- M05c remains open until a genuine hosted Study Now recommendation is created and its answer/reschedule/outcome loop is observed end to end.


## M05d FSRS-compatible evidence contract — 2026-09-27
- Added a separate immutable `study_memory_judgments` evidence stream instead of changing the strict `question.answered` event contract.
- Memory ratings use the explicit four-grade `fsrs-4-v1` scale: 1 Again, 2 Hard, 3 Good, 4 Easy.
- The learner prompt is `post-answer-recall-v1`: "How did recall feel before seeing the answer?"
- Rating is optional. Skipping never blocks Next, does not change question correctness, and does not alter exam score.
- Each judgment links to the exact persisted attempt UUID; attempt correctness and duration remain independent evidence.
- One immutable judgment is allowed per attempt. Same-rating retries are idempotent; a conflicting retry is rejected rather than silently rewriting evidence.
- Browser roles may read only their own judgments through RLS but cannot insert/update/delete them or call the recorder function directly.
- Authenticated `POST /memory-judgments` is live in `study-api` v11; learner identity is derived server-side.
- Session resume now restores the saved memory judgment for the answered slot, and cloud export includes memory judgments.
- Rollback-only proof recorded Hard, returned the same immutable row on retry, rejected a conflicting Easy retry, then removed all synthetic data.
- GitHub checks, browser verification and the latest Render deployment passed.
- Real memory-judgment count remains 0 because no learner rating was fabricated for historical attempts.
- The production scheduler is still `bootstrap-binary-v1`; these ratings are not yet used to schedule reviews.


## M05d FSRS shadow-readiness layer — 2026-09-27
- Added a pure `buildFsrsShadowEvidence` domain projection over immutable attempts plus explicit memory judgments.
- Missing memory ratings remain missing. Binary correctness is never converted into Again/Hard/Good/Easy.
- Added service-only `study_fsrs_shadow_evidence(learner)` in Supabase.
- The projection reports total/rated/unrated attempts, rating coverage, rated question count, rating distribution, rating lag, correctness-rating discordance and a chronological replay log.
- Discordance is preserved as evidence: correct + Again and incorrect + Good/Easy are counted rather than coerced away.
- The projection explicitly reports `fsrsControlsDueDates=false` and `livePolicyId=bootstrap-binary-v1`.
- Authenticated `GET /revision/fsrs-shadow` is implemented with learner identity derived server-side. It returns `shadowSchedule=null` until an FSRS engine is intentionally enabled.
- The candidate implementation is `ts-fsrs`, but the dependency/engine has not been introduced into the production scheduling path.
- Current real state remains 1 attempt and 0 memory ratings per tested learner path, so rating coverage is 0 and there is no replayable real FSRS review evidence yet.
- Rollback-only proof showed that one synthetic Again rating becomes one replayable review, 100% coverage for that synthetic learner history, and one correct+Again discordance while production due-date authority remains false; rollback removed the synthetic rating.
- No arbitrary minimum-rating threshold for production FSRS authority has been invented. Readiness thresholds will be evidence-driven.


## M05d deterministic FSRS shadow scheduler — 2026-09-27
- Added a real non-authoritative FSRS shadow scheduler to `study-api`.
- Engine is pinned to `ts-fsrs@5.4.2`, which uses FSRS-6 defaults; fuzz is disabled for deterministic replay.
- Shadow engine configuration is versioned as `fsrs-shadow-default-v1` with request retention 0.9 and maximum interval 36500 days.
- `GET /revision/fsrs-shadow` now replays explicit learner ratings through the pinned engine when sufficient evidence exists.
- Output includes proposed FSRS due time, current live bootstrap due time, delta between them, stability, difficulty, scheduled days, reps, lapses, state and current retrievability.
- Shadow results remain explicitly non-authoritative: `schedulerControl=false`; live revision rows still use only `bootstrap-binary-v1`.
- Added a critical completeness gate: FSRS schedule output is produced only for exact question versions whose entire observed attempt history is rated. Partially rated histories remain visible as readiness evidence but are skipped by the scheduler.
- Added distinct shadow reasons: no real ratings, no fully rated question history, or real ratings replayed.
- Restored the already-applied shadow-readiness migration to its original immutable contents and moved the stricter per-question coverage function into a new migration, preserving migration-history integrity.
- New Supabase migration `fsrs_shadow_question_coverage` applied successfully.
- `study-api` v13 deployed successfully with the pinned npm package, confirming Edge Function npm compatibility.
- Full GitHub checks and browser checks passed before release.
- Live state remains clean: 0 real memory judgments, 2 revision rows, live policy only `bootstrap-binary-v1`, and authenticated users cannot call the shadow SQL function directly.
- No new Supabase security regression appeared; leaked-password protection remains the existing unrelated warning.


## M05d schedule-policy evaluation ledger — 2026-09-27
- Added immutable `study_schedule_decision_events` to preserve what each scheduling policy proposed at a specific learner-evidence cutoff.
- Each decision is keyed by exact attempt + policy + policy version + config version and stores authoritative/shadow role, exact question version, proposed due time and decision payload.
- Added service-only idempotent `study_record_schedule_decision`. Identical retries return the original event; conflicting rewrites are rejected.
- Current authoritative bootstrap state was backfilled only for the currently represented revision decision per question. No intermediate historical schedule decisions were invented.
- Future answer submissions record the resulting `bootstrap-binary-v1` proposal after revision projection. Policy-ledger failure is non-blocking so analytics cannot break learning.
- Future memory ratings record an FSRS shadow proposal only if the rated attempt is still the latest exposure and the exact question-version history is fully rated. Late/incomplete histories remain evidence but do not get a misleading shadow decision.
- Added `study_schedule_policy_outcomes(learner)`, which links each immutable schedule proposal to the first later real retrieval of that same exact question version.
- Outcome fields include next attempt identity/time, correctness, response duration, milliseconds early/late relative to the proposed due time, and whether retrieval occurred after the proposed due date.
- Added authenticated `GET /revision/policy-evaluation`; learner identity is server-derived and the response is explicitly descriptive/non-causal.
- Cloud export now includes schedule-decision evidence.
- Rollback proof showed two authoritative backfilled decisions plus one synthetic shadow decision, with idempotent retry/conflict behavior, then removed the synthetic decision.
- Production migration `schedule_policy_decisions` applied successfully and `study-api` v14 is live.
- Live production state after deployment: 2 authoritative decisions, 0 shadow decisions, 0 memory judgments, policy set only `bootstrap-binary-v1`.
- Authenticated browser roles cannot insert/update/delete schedule decisions or call recorder/outcome SQL directly.
- Supabase now reports one additional INFO-level `rls_enabled_no_policy` finding for the intentionally server-only schedule-decision table. Existing leaked-password-protection warning remains unchanged.


## M05d/M11 scheduler experiment-readiness framework — 2026-09-27
- Added server-only immutable scheduler experiment specs, append-only state events and immutable learner-level assignments.
- Experiment specs are SHA-256 fingerprinted and versioned. A duplicate experiment/version cannot be edited in place.
- Randomization unit is intentionally learner-level to avoid alternating scheduler policies within the same learner.
- Assignment is deterministic from experiment/version + learner ID + frozen assignment salt, mapped into a 0–9999 bucket.
- Assignment can occur only while an experiment is in the explicit `running` state and only for learners with paired authoritative + shadow scheduling evidence from the same attempt.
- State progression is guarded by immutable spec hash plus explicit `:ARM` and `:RUN` confirmations.
- State ordering uses a monotonic identity sequence, after rollback testing caught timestamp/UUID ordering as unsafe for rapid transitions.
- The first scheduler experiment template `scheduler-bootstrap-vs-fsrs-v1@1` is registered as an immutable draft with 50/50 planned allocation, learner-level randomization and the paired-scheduler-evidence eligibility contract.
- The draft metric contract names delayed retrieval correctness as the provisional primary endpoint with answer duration, retrieval timing and learner-time burden as secondary evidence; it explicitly states that causal claims require running randomization.
- The template is deliberately permanently non-armable because `minimumEligibleLearners` is null. Choosing an evidence-based population threshold later requires registering a NEW immutable spec version.
- Rollback-only proof validated a synthetic future v2 lifecycle: paired evidence → readiness → armed → running → deterministic assignment → idempotent assignment retry; all synthetic state rolled back.
- Production migration `policy_experiment_framework` applied successfully.
- Live production state: 1 draft experiment spec, 0 state events, 0 assignments, 0 eligible learners, `canArm=false`, assignments disabled.
- Authenticated browser roles cannot register experiment specs, mutate experiment state, create assignments or call the trusted experiment functions directly.
- This framework is not connected to learner scheduling authority. It is research infrastructure only.


## M06a NeuralVault foundation — 2026-09-27
- Added `src/domain/neural-vault.js` with strict canonical concept IDs, a 20 KB personal-note boundary and update-aware annotation anchor states.
- Added live `neural_canonical_note_versions`: immutable concept-linked versions with source IDs, SHA-256 fingerprint, sequential versioning and at most one published version per concept.
- Added live `neural_personal_annotations`: mutable learner-owned notes linked to stable canonical concept IDs with optional canonical-version anchor and optimistic revision control.
- Personal annotations support real deletion. Stale updates return a revision conflict rather than silently overwriting newer text.
- Canonical note draft creation validates both the concept and source IDs against the current catalog. Canonical-note publication is intentionally not implemented yet.
- Authenticated `study-api` v16 exposes NeuralVault concept index/detail plus create/update/delete personal annotation routes. Browser learner identity is server-derived.
- NeuralVault routes support URL-encoded canonical IDs and enforce the same 20,000-byte personal-note ceiling as the domain contract.
- Learner export now includes NeuralVault personal annotations.
- Added hosted `/web/vault.html` workspace with canonical-content and personal-annotation layers rendered separately.
- The account page links into NeuralVault. The concept index comes from the canonical catalog rather than QBank-local copies.
- Full GitHub checks and responsive browser checks passed; latest Render deployment is live.
- Production remains clean: 1 canonical catalog concept, 0 canonical NeuralVault notes and 0 personal annotations. No medical note or learner note was fabricated for release proof.
- Authenticated browser roles cannot mutate NeuralVault tables or trusted NeuralVault SQL functions directly.
- M06a remains IN PROGRESS only for one real authenticated hosted create → edit → reload → delete proof.


## M06c NeuralVault search and retrieval links — 2026-09-27
- Added authenticated `GET /vault/search?q=...` in `study-api` v17.
- Search spans canonical catalog concept labels, aliases and subject tags; published canonical-note title/body; and only the authenticated learner's personal annotations.
- Unpublished canonical notes are excluded at the data-query boundary. The current in-review anaphylaxis canonical note therefore cannot leak through learner search.
- Search query length is bounded to 2–120 characters and results are capped at 50.
- Search returns match-source metadata plus stable canonical `conceptId`; learner search results do not expose answer keys or review drafts.
- Added NeuralVault search UI and cloud adapter.
- Added update-aware annotation anchor states in concept detail: `current`, `canonical-updated`, `anchor-unavailable`, and `unanchored`.
- Personal note text remains escaped in learner HTML rendering.
- Added exact concept deep links from the medical answer/explanation flow to `/web/vault.html?concept=<conceptId>`.
- The link uses canonical concept identity rather than question-local labels, preserving update-safe navigation.
- Full unit/check suite passed and responsive browser verification passed before deployment.
- Render latest deployment is live and `study-api` v17 is active.
- M06c remains IN PROGRESS for one real hosted search/deep-link verification and later Study Now-to-NeuralVault retrieval integration.


## M06b first canonical note published + deep-link startup fix — 2026-09-27
- NeuralVault note version `6ac9305b-2ce1-4fdb-9705-fa22c8eefa12` for `emergency:anaphylaxis:first-line-treatment` passed all three required gates: Medical, References and Rights.
- All stored review target SHA-256 fingerprints were rechecked against the current targets immediately before publication; all three matched exactly.
- The note reached `verified` with `published_at = null`, then was published through the separate trusted `publish_verified_neural_note(uuid)` transition.
- Final note state is `published`, version 1, published at 2026-09-27T06:02:19.108546Z.
- Published content hash is `e8d1f1b5d55e6b99dd20bed0ca45149fc1dd81bf67db45b702c5eda5b1c602d2`.
- This closes M06b: the canonical note lifecycle has now been exercised end to end without collapsing review approval into publication.
- During M06c verification, a deep-link startup defect was identified: QBank generated `/web/vault.html?concept=<conceptId>`, but NeuralVault startup ignored the query parameter and merely selected the first catalog concept.
- NeuralVault startup now reads the requested `concept` query parameter and passes it through normal catalog validation before loading the detail. This preserves correct navigation as the concept catalog grows.


## M06 hosted search + personal annotation create/edit proof — 2026-09-27
- Real authenticated NeuralVault search for `anaphylaxis` returned the exact canonical concept and showed the published canonical-note indicator.
- Learner created a personal annotation for `emergency:anaphylaxis:first-line-treatment` and edited it once in the hosted UI.
- Backend verification shows exactly one annotation row for that concept, revision 2, created and updated in separate writes.
- The annotation is anchored to canonical note version 1, and that anchor currently points to the published canonical note.
- Current database state for this concept contains one personal annotation total, so no duplicate row was created by the edit path.
- Hosted create/edit persistence is therefore confirmed. M06a still retains the explicit hosted delete/reload proof before its CRUD release gate is fully closed.
- M06c search/deep-link/personal-note hosted proof is complete; later Study Now → NeuralVault retrieval integration remains.


## M06 hosted annotation refresh persistence proof — 2026-09-27
- Learner refreshed the hosted NeuralVault page after creating and editing the anaphylaxis personal annotation.
- The annotation reloaded from the server as revision 2 with the same persisted content.
- Backend verification confirms one annotation row for `emergency:anaphylaxis:first-line-treatment`, revision 2, anchored to canonical note version 1.
- The canonical anchor remains published and the learner UI correctly reports `Anchored to current canonical version`.
- This closes the hosted create → edit → refresh persistence gate. The remaining M06a CRUD proof is delete → refresh → absence.


## M06a hosted delete/reload CRUD proof — 2026-09-27
- Learner deleted the hosted anaphylaxis personal annotation from NeuralVault.
- After refresh, the learner UI showed no personal notes for the concept.
- Backend verification confirms 0 personal annotations for the learner and 0 annotations for `emergency:anaphylaxis:first-line-treatment`.
- The published canonical note remained intact as version 1 and stayed visible after deletion.
- This closes the real hosted personal-annotation CRUD lifecycle: create → edit → refresh persistence → delete → refresh absence.
- M06a is DONE.


## M06c Study Now → NeuralVault contextual retrieval handoff — 2026-09-27
- Active Study Now session state now restores recommendation context from the immutable `study_recommendation_events` receipt on every load/resume.
- Only allowlisted recommendation reasons are exposed to the learner: `mistake-repair`, `due-revision`, and `new-learning`.
- Recommendation context is shown only after the learner has answered. NeuralVault is not exposed as a pre-answer cue that could weaken retrieval practice.
- The answered Study Now flow now displays an explainable "Why Study Now sent this" block and a contextual `Review this concept in NeuralVault →` link.
- The link carries canonical `conceptId` plus allowlisted `from=study-now` and `reason=<...>` parameters.
- NeuralVault validates the reason against the same allowlist and shows a concept-specific Study Now handoff panel only when the handoff concept matches the opened canonical concept.
- The handoff is explicitly presentational: it does not modify score, personal notes, mastery state, revision state or scheduling.
- Refresh/resume preserves the recommendation reason because the API reconstructs it from immutable recommendation evidence rather than browser-only state.
- Full unit/check suite passed and responsive browser verification passed.
- Render deployment `dep-dasbmejtqb8s739kgl00` is live and `study-api` v19 is active.
- M06c is DONE. A future real due-item Study Now handoff will be observed as part of M05c's longitudinal hosted proof and does not block NeuralVault completion.
- M06 is now DONE: M06a personal annotation lifecycle, M06b canonical review/publication, and M06c search/update-safe retrieval links have all reached their release gates.


## M07a canonical-concept observation foundation — 2026-09-27
- Added service-only `study_concept_evidence(learner)`, rebuilt from immutable question attempts plus explicit memory judgments.
- The projection groups observations by stable canonical `conceptId` and reports attempts, distinct exact question versions, correct/incorrect counts, latest correctness, first/last retrieval time, mean response duration, repeated exposure count, memory-rating coverage/distribution and correctness-rating discordance.
- Added authenticated `GET /diagnostics/concepts` in `study-api` v20 and cloud adapter `conceptDiagnostics()`.
- Current catalog labels, aliases and subject tags are joined at read time rather than copied into historical evidence.
- The API explicitly returns `inferenceEnabled=false`, `knowledgeState=unestimated`, and null mastery/forgetting/confidence values.
- Explicit uncertainty reasons include single-question-version-only, no-repeat-retrieval, no-memory-self-report, partial-memory-self-report, transfer-evidence-not-modeled and concept-not-in-current-catalog.
- Two-real-account verification confirms learner-scoped isolation: one learner currently has one correct attempt with no memory rating; the other has three correct attempts, two repeat exposures and one Good rating. Both histories still cover only one exact question version.
- Therefore repeated correctness on the current anaphylaxis item is preserved as positive observed evidence but is not promoted to concept mastery or transfer competence.
- Migration `concept_evidence_projection` applied successfully.
- Full GitHub checks and responsive browser checks passed before deployment.
- `study-api` v20 is active.
- M07a is DONE.


## M07b observed Mistake Fingerprint — 2026-09-27
- Added service-only `study_mistake_evidence(learner)`, rebuilt entirely from immutable attempts plus explicit memory judgments.
- Contract `mistake-observation-v1` records exact error episodes and observable signals only.
- Observable v1 signals include `incorrect-response`, `repeat-error-same-question`, `repeat-same-distractor`, and `incorrect-with-good-easy-recall`.
- Every incorrect episode is linked, when available, to the first later retrieval of the same exact question version and marked `recovered-next-retrieval`, `repeated-error-next-retrieval`, or `awaiting-retest`.
- Added authenticated `GET /diagnostics/mistakes` and cloud adapter `mistakeDiagnostics()`.
- Current published question text is attached only when that exact version remains published; historical IDs remain usable without leaking non-current question content.
- Diagnostics explicitly return `causeInferenceEnabled=false`, `causes=[]`, and uncertainty reasons including error-cause-not-observed and transfer-error-pattern-not-modeled.
- The system does not label a wrong answer as careless, guessing, weak knowledge, poor attention or any other unobserved psychological cause.
- Rollback-only synthetic proof exercised wrong → same wrong distractor → correct. It correctly detected repeated error, repeated distractor, wrong + Good recall discordance, immediate repeated error and later recovery, then rolled all synthetic data back.
- Both real learner accounts currently return an empty Mistake Fingerprint because neither has a genuine incorrect attempt.
- Migration `mistake_evidence_projection` applied successfully.
- Full GitHub checks and responsive browser checks passed before deployment.
- `study-api` v21 is active.
- M07b is DONE.


## M08a versioned exam-rule boundary — 2026-09-27
- Added pure domain module `src/domain/exam-rules.js`.
- Exam rules are versioned independently from learner state, QBank medical content and Study Now.
- Each rule set carries stable `examId`, immutable `ruleSetId`, sequential version/supersedes history, applicability dates, verification evidence and explicit source provenance.
- Rule coverage includes delivery mode, item type, total questions, total duration, section structure, scoring and navigation constraints.
- Partial knowledge is represented as `null`; the contract does not fill missing rules by convention or memory.
- `examSimulationReadiness()` blocks simulator use unless the rule set is verified, has at least one official source, and every operational timing/scoring/navigation field is known.
- `toExamSimulationPreset()` returns a deeply immutable config pinned to the exact verified ruleset.
- Section question counts and section durations must reconcile with declared exam totals.
- Ruleset amendments must be sequential and cannot supersede a different exam identity.
- Added `data/exam-rules.json` with an intentionally empty production registry. No current NEET-PG/INI-CET preset is activated until its current rules are fully sourced and verified.
- Synthetic tests prove a complete verified rule set can become simulator-ready while draft/secondary/partial rule sets remain blocked.
- Full GitHub checks and responsive browser verification passed.
- M08a is DONE.


## M08b stable exam occurrence and PYQ evidence foundation — 2026-09-27
- Added canonical `exam_occurrences` with stable exam/session identity independent of exam mechanics.
- Seeded `neet-pg:2026` from the official NBEMS NEET-PG page as a verified occurrence identity only.
- The occurrence verification note explicitly does not claim that detailed 2026 simulator rules have been verified.
- Added immutable `question_exam_evidence_events` for PYQ provenance claims.
- PYQ evidence is attached to exact reviewed `questionVersionId` plus stable `examOccurrenceId`; it does not mutate medical question content.
- Recalled PYQ evidence is constrained to `reconstructed_item` plus `single_recall` or `corroborated_recall`.
- Licensed PYQ evidence is constrained to `exact_item` plus `licensed_primary_source` and a non-empty source reference.
- Assertions are immutable. Retraction creates a new event targeting the assertion; update/delete are blocked.
- `current_question_exam_evidence()` projects only active assertions and excludes retracted evidence.
- Browser roles cannot directly read or write the ledger; service-role functions own assertion/retraction.
- Rollback-only proof successfully exercised assert → current projection → retract → empty projection with no synthetic PYQ evidence retained.
- Production verification confirms the current AI-generated anaphylaxis item has zero active PYQ evidence.
- Migration `exam_occurrence_pyq_evidence` applied successfully after full GitHub and responsive browser checks passed.
- M08b remains IN PROGRESS until current exam mechanics are fully sourced into a simulator-ready ruleset and genuine PYQ evidence is ingested.


## NEET-PG 2026 published-scheme preset verified — 2026-09-27
- The official NBEMS NEET-PG 2026 Information Bulletin linked from the official exam page was read directly.
- Scheme clauses 5.1–5.7 specify a computer-based single-shift exam, 180 MCQs, 210 minutes total, four response options, +4 correct, -1 incorrect, 0 unattempted, and normal scoring for marked-for-review questions.
- The published scheme specifies Groups A–E, 36 questions and 42 minutes per section, no early advance, no review/modification after a section closes, and automatic transition after each section timer expires.
- The bulletin also states that the actual number of time-restricted sections may vary based on total question count and operational feasibility. This caveat is preserved in the ruleset rather than discarded.
- `data/exam-rules.json` now contains verified immutable ruleset `neet-pg:2026@1`.
- `timeCarryForwardAllowed=false` is recorded as a documented derivation from fixed section timers, the prohibition on early advance, and automatic transition after the prior timer completes, not as a verbatim bulletin field.
- The ruleset passes `examSimulationReadiness()` and converts to an immutable simulator preset.
- Full current-head GitHub checks and responsive browser checks passed.

## M08c descriptive Exam DNA — 2026-09-27
- Added service-only `exam_dna_observations(exam_id)`, contract `exam-dna-observation-v1`.
- The projection consumes only active, non-retracted PYQ evidence linked to verified exam occurrences.
- It reports active assertions, distinct exact question versions, distinct exam occurrences, canonical concepts, current subject tags and evidence strata.
- Evidence strata remain separate: licensed exact items, corroborated recalls and single recalls are never collapsed into one confidence number.
- Per-concept uncertainty includes single-occurrence-only, recalled-evidence-only and sparse-concept-sample.
- Empty evidence explicitly returns `no-pyq-evidence`.
- The contract states `predictiveInferenceEnabled=false` and records that historical evidence is not a future-exam probability.
- Rollback-only proof with one synthetic recalled PYQ produced the expected descriptive concept signal and sparse-evidence warnings; all synthetic evidence was rolled back.
- Added authenticated `GET /exam-dna?examId=...` and cloud adapter `examDna(examId)`.
- Migration `exam_dna_observations` applied successfully after all checks passed.
- `study-api` v22 is active.
- Production currently has zero active PYQ assertions; therefore the real NEET-PG Exam DNA correctly returns an empty concept list with `no-pyq-evidence`.
- M08c is DONE.


## M08d exam-simulator state machine and durable ledger foundation — 2026-09-27
- Added pure deterministic `locked-time-sections-v1` engine in `src/domain/exam-simulator.js`.
- The engine consumes the exact verified simulator preset rather than hardcoded exam constants.
- A run pins `examId`, exact `ruleSetId`, engine ID and the ruleset caveats at creation.
- For `neet-pg:2026@1`, 180 distinct immutable question versions are split into five 36-question sections with fixed 42-minute boundaries.
- Future-section writes are rejected, closed-section writes are rejected, early manual section advance is rejected, and write operations advance the authoritative clock before accepting a response so stale clients cannot answer after a deadline.
- Section closure times are deterministic scheduled boundaries; reconnecting late closes every elapsed section without carrying time forward.
- Live run state contains selected responses and marked-for-review state but never answer keys or correctness.
- Trusted scoring is allowed only after completion, is pinned to the exact ruleset marking scheme, and treats marked-for-review responses according to the verified rule field.
- Added durable `exam_runs` current projection plus append-only `exam_run_events` and immutable `exam_run_receipts`.
- Only one full exam run may remain open per learner.
- `exam_create_run` and `exam_apply_transition` are service-role-only trusted write boundaries.
- Transitions use optimistic state revisions plus request-key idempotency and a SHA-256 transition fingerprint. Same-request retries are idempotent; stale revisions and request-key payload collisions are rejected.
- Completion receipt creation is atomic with the final run transition and pinned to the run's exact ruleset.
- Event and receipt update/delete operations are blocked by immutable-ledger triggers.
- Rollback-only persistence proof verified create → answer → idempotent retry → stale revision rejection → completion → immutable receipt, then removed every synthetic row.
- Migration `exam_run_ledger` applied successfully after current-head GitHub checks and responsive browser checks passed.
- Live production sanity check: 0 exam runs, 0 exam-run events, 0 exam receipts and 0 active PYQ assertions.
- The learner-facing full mock remains intentionally unavailable because the reviewed/published medical catalog currently contains only one unique question; the system will not duplicate it to fabricate a 180-question exam.
- M08d remains IN PROGRESS.


## M08d mock readiness and assembly gate — 2026-09-27
- Added immutable runtime `exam_rule_sets` registry. The repository `data/exam-rules.json` remains the deployment source; each database ruleset row is an immutable runtime mirror with a SHA-256 fingerprint.
- Live runtime rules currently contain exactly one verified row: `neet-pg:2026@1`.
- Added service-only `exam_mock_readiness(rule_set_id)`, contract `exam-mock-readiness-v1`.
- Readiness counts distinct stable `questionId` values, not question-version rows, so multiple published versions of one item cannot inflate mock capacity.
- Eligibility requires the existing publication boundary, a non-empty published timestamp, answer key integrity, at least two options and a canonical primary concept. Publication remains the carrier of medical/reference/rights review assurance.
- Current production result for `neet-pg:2026@1`: 180 required unique questions, 1 eligible unique question, shortage 179, `ready=false`.
- Added service-only `exam_assemble_mock(rule_set_id, seed)`, contract `exam-mock-assembly-v1`.
- Assembly policy `distinct-published-randomized-v1` chooses at most one current published version per stable question, uses deterministic seeded SHA-256 ordering, and returns no answer keys.
- The assembly contract explicitly reports `examBlueprintFidelity=false` and `contentMixFidelity=unstratified-reviewed-pool`; timing/navigation rule fidelity is not presented as evidence that the content mix matches the real exam blueprint.
- Rollback-only synthetic proof with 180 stable questions plus one superseded duplicate version produced 180/180 readiness, selected the latest published version, assembled exactly 180 distinct question versions and leaked no answer key. The synthetic catalog was fully rolled back.
- Migration `exam_mock_readiness` applied after CI and browser gates passed.
- Added authenticated `GET /exam-simulator/readiness?ruleSetId=...` to `study-api`; assembly itself remains trusted/server-only and is not exposed directly to the browser.
- Added cloud adapter `examSimulatorReadiness(ruleSetId)`.
- Medical QBank overview now shows NEET-PG full-mock capacity and shortage while keeping QBank/Study Now functional if readiness is temporarily unavailable.
- The learner UI explicitly states that current content assembly does not claim exam-blueprint fidelity.
- `study-api` v23 is active and the current Render head is live.
- Production sanity check after release: 1 runtime ruleset row; 0 exam runs; 0 exam-run events; 0 exam receipts.
- M08d remains IN PROGRESS. The next slice is trusted run-start/resume/action API wiring against the existing state machine and ledger. Real full-mock launch remains blocked until content capacity reaches 180 distinct eligible published questions.

## M08d trusted run API implementation — 2026-09-27
- Added pure shared runtime core `supabase/functions/study-api/_shared/exam-runtime.js`; the domain simulator delegates its locked-section state transitions and scoring to the same implementation used by the trusted Edge API.
- Added deterministic SHA-256 seeded question ordering. This restores randomized run order after the database assembly RPC selects membership but returns its JSON array in lexical order.
- Added authenticated trusted run endpoints for start, current-run resume, specific-run read, answer mutation and marked-for-review mutation.
- Run start checks `exam_mock_readiness` before assembly and returns `exam_mock_not_ready` without creating a run when content capacity is insufficient.
- The server generates the assembly seed, learner identity and authoritative timestamps; browser payloads cannot provide learner identity, correctness, scores or answer keys.
- Run views expose only the currently open section's question content plus that section's response state. Future-section question content remains undisclosed.
- Every answer/review mutation requires `requestId` plus `expectedRevision`; identical retries are resolved against the immutable event ledger before revision rejection, while request-key reuse for different intent fails closed.
- The trusted API synchronizes elapsed section boundaries before learner mutations. Completion builds the score from exact pinned question-version answer keys and the pinned ruleset, then uses the existing atomic completion-receipt transition.
- Added cloud adapter methods for start/resume/read/answer/review and regression coverage for authentication scope, seeded ordering, revision conflicts, idempotent retries, no browser scoring claims and narrow query contracts.
- No early-section-advance API is exposed. Cancellation and GT Autopsy remain separate later work.
- Production remains intentionally blocked at 1/180 eligible unique questions, so this implementation cannot create a real full mock with current content.
- PR #50 (trusted run API) and PR #51 (self-contained Edge runtime bundle) were merged after exact-head Foundation checks and responsive browser verification passed.
- `study-api` v24 is ACTIVE in the dedicated Medical Learning OS Supabase project and contains the merged `index.ts` plus bundled `_shared/exam-runtime.js`.
- A disposable-branch live GitHub smoke passed against v24: unauthenticated `GET /progress` was rejected, unauthenticated `POST /exam-simulator/runs` was rejected, allowed local/Render origins passed CORS preflight, and an unknown origin was rejected.
- Post-smoke production verification remains `ready=false`: 1 eligible unique question / 180 required, shortage 179, with 0 `exam_runs`, 0 `exam_run_events` and 0 `exam_run_receipts`.
- Trusted run-start/resume/read/answer/review API deployment is complete. M08d remains IN PROGRESS because real full-mock launch still requires 180 distinct eligible published questions, an authenticated hosted end-to-end full-mock proof, explicit cancellation/abandon semantics and GT Autopsy.

## M02b scalable content intake foundation — 2026-09-27
- Service-only `content_intake_batches` and immutable `content_intake_events` are live.
- Candidate manifests are SHA-256 fingerprinted and bounded to 100 questions per batch.
- Intake v1 accepts only new version-1 `original` or `ai_generated` questions; recalled/licensed PYQ claims remain in the separate Exam DNA/PYQ evidence system.
- New sources enter with unresolved rights. Intake cannot manufacture rights evidence, review evidence, verified state or publication timestamps.
- Validation covers exact schema/IDs, answer-key integrity, canonical concept/source resolution, exact normalized-stem duplicates, live-catalog collisions and conflicting staged batches.
- Promotion locks and revalidates the live catalog, appends candidates only as `in_review`, increments the catalog once and records an immutable promotion event. Promotion has no publication authority.
- Staged batches can be abandoned with an auditable reason; staged payloads and intake events cannot be rewritten/deleted.
- `content_intake_pipeline_status()` reports staged/promoted/abandoned counts, catalog stage counts and outstanding Medical/References/Rights review queues without inventing a quality score.
- `review-api` v9 is ACTIVE and exposes authenticated read-only `GET /pipeline-status`; no reviewer/browser staging or promotion mutation route exists.
- Rollback-only production proof passed: synthetic stage → promotion → `in_review`, all three review backlogs increased, duplicate intake failed closed, no rights evidence appeared, then rollback restored 0 batches / 0 events / 0 synthetic questions.
- Live migration history contains `content_intake_pipeline`, `content_intake_trigger_permissions` and `internal_trigger_rpc_permissions`; trigger-only SECURITY DEFINER helpers are not exposed as application RPCs.
- First real controlled batch is now live: `pilot:rabies:20260927:01` contains 5 AI-generated, source-grounded rabies PEP questions across 5 canonical concepts and 2 Government of India NRCP sources.
- The exact merged manifest passed repository validation and the live intake validator before mutation. Staging recorded manifest SHA-256 `9f0e5b234d6695513d54a65702f338e4fffa2ec5909df90fec7c295472888248`.
- Promotion advanced the canonical catalog once, version 6 → 7, and placed all 5 questions in `in_review`.
- Post-promotion safety check: 5 pilot questions in review, 0 pilot published, 0 pilot review events, 0 pilot source-rights events, 0 exam runs.
- Review backlog is now Medical 5 / References 5 / Rights 5. Published stable inventory remains 1, so NEET-PG mock readiness correctly remains 1/180 with shortage 179.
- PR #59 added descriptive backlog metrics to the authenticated reviewer workspace; intake mutation authority remains absent from browser/reviewer code.
- Remaining M02b gate: complete independent Medical/References/Rights review of the five-question pilot, measure gate times and rejection reasons, then decide whether to scale batch size.

## M02b non-authoritative review assist — 2026-09-27
- Added `data/content-review-assist.json` for the five-question rabies pilot.
- The packet summarizes source support and conservative source-rights recommendations but has `authority=none` and cannot approve, verify or publish content.
- Reviewer cards display the preflight beside the exact target while retaining mandatory authenticated reviewer notes and decisions.
- Current source verification supports wound washing, category III RIG infiltration, IM days 0/3/7/14/28, ID days 0/3/7/28 and adult deltoid administration.
- NRCP's copyright policy supports attributed use while excluding third-party material; review-assist therefore recommends `citation_only` rather than claiming public-domain status.
- Four pilot items are straightforwardly supported. The category III RIG item carries a wording note because wound washing is also part of PEP; the reviewer decides whether to approve or require a new version.

## Rabies pilot full review/publication rollback rehearsal — 2026-09-27
- Current official NRCP material was rechecked for all five pilot claims: immediate wound washing, category III RIG infiltration, IM PEP days 0/3/7/14/28, ID PEP days 0/3/7/28 and adult deltoid administration.
- Current NRCP copyright policy supports source-attributed reuse while excluding third-party material from blanket permission; the conservative source classification remains `citation_only`.
- A production rollback-only rehearsal executed the exact intended sequence against the live five-question pilot: resolve both source-rights records → record Medical/References/Rights approvals for all five exact question versions → publish all five.
- Every trusted mutation and current-fingerprint check passed. Inside the transaction, published stable inventory reached 6 and NEET-PG mock capacity reached 6/180 with shortage 174.
- The transaction was rolled back. Post-rollback production state remains unchanged: 0 pilot review events, 0 pilot source-rights events, 0 pilot published questions and NEET-PG mock capacity 1/180 with shortage 179.
- This proves the technical path without creating a false persistent human-review audit record. Persistent review evidence still requires an authenticated reviewer action or a separately designed agent-review evidence model.

## Rabies pilot authenticated review + publication complete — 2026-09-27
- The real authenticated reviewer workflow completed all 15 immutable gate decisions: 5 Medical, 5 References and 5 Rights approvals.
- Both NRCP sources were independently resolved to `citation_only`; both persisted source-rights fingerprints match the current source records.
- All 15 review-event SHA-256 fingerprints match their current exact gate targets and all five questions reached `verified`.
- Trusted publication then ran as one atomic transaction with pre/post assertions. All five rabies questions are now `published`.
- Current learner-facing inventory is 6 distinct published stable questions / 6 published versions, with 0 in-review and 0 verified-but-unpublished questions.
- NEET-PG 2026 mock capacity is now 6/180 distinct eligible published questions; shortage is 174. Full mock remains blocked, correctly.
- The first observed authenticated review session produced 15 review decisions over a 26.6-minute first-to-last event span. Gate spans were Medical 5.9 minutes, References 6.0 minutes and Rights 8.8 minutes; 2 source-rights decisions were also recorded.
- These are operational observations from one five-question pilot, not stable throughput estimates. Rights is the current apparent bottleneck and should be measured again at larger batch size.

## M02b controlled scale pilot 02 — 2026-09-27
- Added and merged the advisory lexical-overlap preflight before scaling intake. It is service-only, non-blocking and explicitly not semantic-duplicate or medical-quality inference.
- Initial live calibration exposed a PostgreSQL whitespace-tokenization defect before any production candidate relied on the signal. The tokenizer was fixed with a follow-up migration and regression test; a deliberate rabies paraphrase now flags at 0.7647 while creating no rows.
- Batch `pilot:infectious-prevention:20260927:02` contains 25 new source-grounded AI-drafted questions across 25 canonical concepts and 5 official CDC source packages, five questions per source.
- Each concept carries `guideline-us-cdc`; the batch explicitly has `examBlueprintFidelity=false` and is a content/review-throughput experiment, not a claim about NEET-PG content mix.
- Live intake validation passed 25/25. Advisory overlap preflight found 2 within-batch lexical-overlap flags; both were inspected and retained as clinically distinct policy states rather than silently ignored.
- The exact merged manifest was staged with SHA-256 `9339331207e4ca7de5606142f2e58945b82946f8d47761e839316f15565da1ab` and then promoted atomically, catalog version 29 → 30.
- Current Batch-02 state: 25 `in_review`, 0 verified, 0 published and 0 question review events. All 5 exact Batch-02 sources remain Rights `unknown` with zero source-rights events.
- Global review backlog is now Medical 25 / References 25 / Rights 25. Published stable inventory remains 6, so NEET-PG mock capacity remains 6/180 with shortage 174.
- Review assist is being extended to all 25 items with editable note/source-policy prefills. Prefill has no review, rights, verification or publication authority.

## 2026-09-27 — Canonical architecture reconciliation

Documentation-only architecture reconciliation completed on a feature branch:
- ROADMAP now records the single evidence-ledger → Digital Twin → Study Now → intervention loop and its ownership rules.
- ARCHITECTURE now defines system ownership, source-of-truth hierarchy and the distinction between Study Now ("what next") and Adaptive Teaching ("how").
- DATA now preserves the implemented `question.answered` v1 contract while documenting planned event-family coverage, future M07c learner-state projection boundaries and intervention-outcome linkage.
- PROJECT_CONTEXT records the user's authorization and the accepted consolidation.
- ADR-044 records the no-duplicate-mastery/state rule and forward-only migration rule.

No production schema, Supabase migration, learner data, content, scoring, policy behavior or milestone status was changed. Existing timestamped migrations remain authoritative. This documentation change deliberately does not activate M07c inferred mastery before its evidence/calibration gate.

Verification for this slice is repository diff review because there is no domain/runtime change. The next implementation task remains the highest-priority open gate already recorded in ROADMAP/STATUS; this reconciliation constrains how future work is implemented rather than replacing current in-progress milestones.

## ADR-044 canonical learner replay bridge live — 2026-09-27
- Live-schema audit confirmed learner history is currently distributed across specialized stores: attempts, memory judgments, Study Now recommendation receipts, scheduler decisions and exam ledgers.
- The audit also found that several pre-ADR learner-evidence tables are application-append-only but do not yet have database UPDATE/DELETE guards. This is now an explicit integrity caveat rather than an assumed invariant.
- Added ADR-045: one canonical learner ledger means one versioned replay contract, not one premature generic physical table.
- Added service-only `study_learning_event_stream_v1`, contract `study-learning-event-stream-v1`.
- Stream v1 maps only three accepted families: `question.answered` → observation, `memory.rating` → self_report, and `study.recommendation_generated` → policy_decision.
- Every emitted event retains deterministic ordering, exact source table/id traceability, persisted/occurred timestamps and canonical concept/question/session references when the source supports them.
- Stream v1 is cursor-paginated and explicitly returns `inferenceAuthority=false` and `masteryInferenceEnabled=false`.
- Mutable sessions, NeuralVault annotations, scheduler decision events and raw exam transitions remain unmapped until explicit semantic adapters are accepted.
- Production rollback proofs replayed all 5 currently mapped source events exactly across 2 learners; cursor pagination reconstructed a 4-event learner history exactly.
- A synthetic Study Now recommendation was correctly emitted as `study.recommendation_generated` / `policy_decision`; all synthetic data was rolled back.
- Production migration `canonical_learning_event_stream` is applied. Post-deploy replay remains 5/5 mapped source events, browser roles cannot execute the function, and service_role can.
- No `learner_concept_state` table or M07c probabilistic inference was introduced.
- Supabase advisors show no new finding from this migration; existing RLS-info, leaked-password-protection warning, unindexed-FK and unused-index notices are unchanged.
- GitHub Actions remains unavailable repository-wide: main and feature jobs fail with runner_id=0 and zero executed steps. Database verification therefore used exact live rollback and post-deploy proofs.

## Future Capability foundation — 2026-09-28
- Audited current domain/adapters/server boundaries before adding future-facing abstractions.
- Existing architecture already provides provider-independent domain logic, stable concept/question/source/exam identifiers, versioned evidence/content, authenticated trusted mutation boundaries, review/publication authority separation, local persistence and the canonical learner replay stream.
- Added `src/domain/canonical-integrity.js`: deterministic JCS/RFC-8785 canonicalization, SHA-256 digest envelopes, explicit algorithm/profile metadata and digest verification.
- Added `src/domain/capabilities.js`: 7 static vendor-neutral semantic capabilities. No runtime discovery/plugin marketplace is introduced.
- Added `src/domain/action-contracts.js`: v1 ActionEnvelope/ActionReceipt validators. These are data/audit contracts only and grant no execution or database authority.
- Action metadata must itself be canonical-JSON-safe so receipts remain portable/hashable.
- Added focused tests for order-independent canonical digests, a pinned SHA-256 vector, changed-content digest divergence, malformed/unsupported values, unknown capabilities, immutable contracts, chronology and portable metadata.
- Isolated Node verification passed the foundation tests. No database migration or production data mutation is required for this slice.
- GitHub Actions remains subject to the repository-wide runner outage recorded previously; full-suite CI status must not be inferred from runner-allocation failure.
- Added ADR-046/047 and roadmap/data/architecture context. No AI SDK, agent runtime, MCP/A2A server, blockchain, ZK, DID/VC wallet, signing infrastructure or PQC runtime was added.
- Current recurring infrastructure-cost impact: approximately ₹0.

## Privacy-safe evidence immutability — 2026-09-28
- Live-schema audit found 12 current public learner-scoped tables and mapped their foreign-key/deletion order.
- Confirmed pre-change integrity gap: `study_attempts`, memory judgments, Study Now recommendation receipts, scheduler decision events and policy experiment assignments were application-append-only but service_role still held direct UPDATE/DELETE privileges.
- Confirmed the existing exam event/receipt trigger was absolutely immutable, which protected integrity but would prevent complete account erasure.
- Added migration `20260928003000_privacy_safe_evidence_immutability.sql`.
- Normal-operation UPDATE/DELETE guards now cover the five study evidence/assignment ledgers; service_role UPDATE/DELETE grants are removed.
- Existing exam ledger guard is preserved but gains one transaction-local DELETE-only exception usable by the privacy erasure function. UPDATE remains impossible.
- Added exact-schema privacy scope detection. Any new public `learner_id` table not in scope makes erasure fail with `privacy_scope_requires_update`.
- Added service-only erasure preview and atomic erasure functions.
- Durable erasure receipts contain only random receipt ID, contract/scope version, coarse reason, total rows deleted and completion time; no learner ID or learner-derived hash is retained.
- Erasure v1 deliberately excludes Auth user deletion/session revocation; those remain trusted application/admin steps.
- Full rollback proof created synthetic records across all current learner-data families, proved direct evidence mutation fails, proved an unmapped future learner table blocks the scope, erased the complete learner scope, verified zero remaining rows and then rolled the entire proof back.
- The full proof deleted 23 in-transaction rows for the probe learner (synthetic plus existing rows) before rollback, demonstrating dependency-safe deletion against real production shape.
- A second rollback proof verified missing reason fails before mutation, append-only protection remains active, valid erasure succeeds, the transaction-local bypass returns to `off`, browser/authenticated roles cannot execute erasure and the durable receipt contains no learner identifier.
- Production remained unchanged after both rollback proofs.

## Privacy erasure production deployment complete — 2026-09-28
- PR #71 merged to `main` as `cd0f8776a96b6a92171a55491d6b0463298bd10e`.
- Supabase migration `privacy_safe_evidence_immutability` is applied in production migration history.
- Production privacy scope is complete across all 12 current public `learner_id` tables; missing/unmapped lists are empty.
- `learner_privacy_erasure_receipts` is live with 0 receipts created by deployment/verification.
- Receipt schema contains only `erasure_id`, `contract_id`, `scope_version`, `reason_class`, `rows_deleted`, and `completed_at`.
- Service role can execute erasure; `authenticated` and `anon` cannot.
- Service-role UPDATE/DELETE privileges are removed from the five study evidence/assignment ledgers.
- Eight immutable guard triggers are live across study evidence, exam ledgers and erasure receipts.
- The erasure preview for a nonexistent learner returns zero rows and `authUserPresent=false`; no real learner data was erased during deployment verification.
- Post-deploy Supabase advisor baseline is unchanged: 19 existing RLS-no-policy infos, the existing leaked-password-protection warning, 6 existing unindexed-FK infos and 3 existing unused-index infos.
- Current `study-api` writes append-only study evidence through trusted RPCs; its only direct table mutations in the checked path are bookmarks, which remain intentionally mutable.
- Render deployed the exact main commit and is LIVE.
- Account-closure UI/API orchestration is still not implemented. The database erasure capability remains service-only and should not be exposed directly to learner/browser code.

## M07c inference activation gate foundation — 2026-09-28
- Added pure domain contract `src/domain/inference-activation-gate.js`.
- Gate contract: `digital-twin-inference-activation-v1`.
- Candidate models must provide a locked preregistration plan digest, observed target contract, baseline, claim scope, evidence-sufficiency criteria, offline metrics and explicit safety/validation checks.
- Evidence/metric thresholds are candidate-specific preregistered values, not platform-global constants.
- Result modes are limited to `blocked`, `shadow_only`, and `eligible_for_controlled_experiment`.
- The gate always returns `generalProductionAuthorized=false` and `policyAuthorityOwnedByModel=false`.
- Retention/transfer claims require corresponding observed outcome definitions.
- Controlled-experiment eligibility additionally requires completed prospective shadow validation, passing prospective metrics, subgroup guardrails, rollback/monitoring plans, pinned model version and intervention attribution readiness.
- Added focused regression tests for evidence insufficiency, offline calibration failure, claim/outcome mismatch, shadow-only qualification, controlled-experiment qualification, malformed preregistration and no model-owned policy authority.
- Executed the exact branch module in an isolated JavaScript runtime: blocked, shadow-only and experiment-eligible paths all behaved as specified; invalid plan digest failed closed.
- No database schema, learner-state store, mastery percentage, model training pipeline or production inference was introduced.

## M07c current evidence baseline — 2026-09-28
- Live production evidence inventory after M07c0 deployment: 2 learners with attempts, 4 total attempts, 1 distinct question version, 1 distinct concept, 1 memory-rating event, 0 Study Now recommendation receipts and 4 schedule-decision events.
- There are 2 observed same-question follow-up attempts, both correct, but 0 follow-ups at or beyond 1 day and 0 at or beyond 7 days in the current data.
- No canonical transfer event family or clinical-transfer outcome is currently available.
- These interval buckets are descriptive inventory checks only; they are not preregistered retention thresholds and do not define a production model target.
- M07c1 remains PLANNED/not started. Current data are suitable for integration/smoke validation only, not for locking a meaningful retention/transfer model preregistration.
- Do not create a learner-state table or train/activate a Digital Twin inference model merely to make progress. The next M07c move should follow naturally from real longitudinal learner evidence and an M11 research plan.

## M02b controlled scale pilot 03 — 2026-09-28
- PR #75 merged the third controlled source-grounded intake batch into `main`.
- Batch key: `pilot:acute-medicine:20260928:03`.
- Batch contains 25 AI-generated original single-best-answer questions, 25 new canonical concepts and 5 guideline source packages spanning adult BLS, sepsis/shock, asthma, COPD and diabetes diagnosis.
- Current sources: 2025 AHA adult BLS, current SCCM Surviving Sepsis Campaign adult guidance, 2026 GINA, 2026 GOLD and ADA Standards of Care in Diabetes—2026.
- Every source entered with Rights `unknown`; every question entered `in_review`; there is no PYQ/licensed provenance claim and no publication authority.
- Live intake validator passed all 25 questions. Advisory lexical-overlap preflight produced one non-blocking flag between the ADA A1C and fasting-glucose diagnostic items (0.5625 token-set Jaccard); both were retained because they test distinct diagnostic criteria.
- The merged manifest was staged and promoted with SHA-256 `f8acff6662db182f73b176906340ad59cd947c0c1fd5eb6d2488526d9032296b`.
- Promotion advanced canonical catalog version 30 → 31.
- Post-promotion verification: Batch 03 = 25 in review / 0 verified / 0 published / 0 review events / 0 source-rights events.
- Global catalog state is now 50 in-review questions and 6 published stable questions. Outstanding review queues are Medical 50 / References 50 / Rights 50.
- Review-assist now covers 55 questions across the three controlled batches and remains explicitly non-authoritative.
- Autonomous content creation does not imply autonomous publication. Independent review evidence remains a separate integrity gate.

## AI test-only review authority live — 2026-09-28
- User authorization now permits autonomous Medical/References/Rights assessment for **internal testing only** until the simulator content target is reached or the user explicitly takes review back over.
- Production migration `20260927213048_ai_test_review_authority` is applied.
- Added immutable, service-only `content_ai_test_source_rights` and `content_ai_test_review_events`.
- Added service-only `record_ai_test_source_rights` and `record_ai_test_review`; AI evidence is structurally separate from human review evidence and cannot set `verified`/`published`.
- Added `exam_mock_test_readiness` and `exam_assemble_test_mock`. These may count current AI-test-reviewed questions for engineering/simulator testing while leaving `exam_mock_readiness` unchanged.
- Browser roles have no AI-test review mutation authority. AI-test evidence is append-only.
- Post-deploy advisor verification initially exposed the trigger-only immutability helper as callable through the public RPC surface. Follow-up migration `20260927213800_ai_test_review_trigger_security` changed it to SECURITY INVOKER and revoked browser execution; anon/authenticated execution now fails closed and the advisor returned to the previous baseline.

- Added `data/autonomous-content-policy.json`: future batches are at least 25 questions and prioritize verified NEET-PG/INI-CET exam evidence when available, then coverage gaps, cross-exam/clinical transfer, source efficiency and duplication avoidance. Unverified exam-frequency claims are forbidden.
- Existing 50-question Batch 02 + Batch 03 backlog passed the current preflight consistency gate: 50/50 low-uncertainty medically supported, 50/50 direct-source support, 50/50 conservative citation-only rights recommendation.
- Recorded 10 AI-test source-rights approvals and 150 AI-test question-gate approvals (50 Medical + 50 References + 50 Rights), all labeled `ai:mlos-autonomous-reviewer-v1` / `ai-test-review-v1`.
- Internal-test readiness is now **56/180**: 6 human-published + 50 AI-test-only, shortage 124.
- Production readiness remains **6/180**, shortage 174. No AI-test event altered human review queues, publication state or learner-facing eligibility.
- Next content work should close the 124-question internal-test shortage in source-grounded batches of at least 25, stopping when the verified rule-set requirement is met. Human review can continue independently for production release.


## M02b controlled scale pilot 04 + AI-test review — 2026-09-28
- PR #78 merged `pilot:core-cross-exam:20260928:04`: 25 original AI-drafted questions, 25 new canonical concepts and 5 authoritative source clusters.
- Coverage: acute coronary syndromes, acute ischemic stroke, diabetic ketoacidosis, chronic kidney disease and postpartum haemorrhage.
- Selection used `exam-value-autonomous-intake-v1`. Genuine historical Exam DNA/PYQ evidence remains too sparse to claim observed exam-frequency fidelity, so this batch is explicitly prioritized by cross-exam core value and uncovered canonical coverage rather than invented frequency.
- Exact merged manifest passed live intake validation 25/25 and lexical overlap preflight returned 0 flags at threshold 0.55.
- Batch staged with manifest SHA-256 `d6ac684a42f7ccd2e3789b5aaebc650e16c40f43fc4db7c1af693c6796e2c177` and promoted atomically, catalog version 31 → 32.
- All 25 questions remain `in_review` for the production human-review lane. No human review or production source-rights evidence was fabricated.
- Separate `ai-test-review-v1` assessment recorded 5 source-rights decisions plus 75 question-gate approvals (25 Medical + 25 References + 25 Rights), all explicitly AI/test-only and fingerprint-bound.
- Internal-test readiness is now **81/180**: 6 human-published + 75 AI-test-only, shortage 99.
- Production readiness remains **6/180**, shortage 174.
- Autonomous expansion remains active: subsequent batches are at least 25 questions and stop once the verified internal-test inventory requirement is met, unless invalid/rejected items need replacement.


## M02b controlled scale pilot 05 + AI-test review — 2026-09-28
- PR #80 merged `pilot:india-national-programs:20260928:05`: 25 original AI-drafted questions, 25 new canonical concepts and 5 official Indian programme/source clusters.
- Coverage: National Immunization Schedule, revised NLEP leprosy classification/MDT, NCVBDC malaria strategy, NTEP drug-resistant TB and NACO HIV post-exposure prophylaxis.
- Selection follows `exam-value-autonomous-intake-v1`. Verified historical Exam DNA/PYQ frequency remains insufficient for observed-frequency claims, so the batch is explicitly heuristic by uncovered canonical coverage, cross-exam/clinical value and source-cluster efficiency.
- Before intake, the malaria target-year item was corrected to the current NSP 2023–27 statement that all States/UTs should reach Category 0 (zero indigenous cases) by 2027.
- Exact merged manifest passed live intake validation 25/25 against catalog version 32.
- Lexical overlap preflight returned 2 non-blocking flags at threshold 0.55: PB vs MB leprosy duration (0.75) and malaria relapse vs recrudescence (0.80). Both are intentional discrimination pairs and are explicitly dispositioned `retain_distinct`.
- Staged manifest SHA-256: `b93f2d7021bbcc30d2be8b17982be3468ca6c588fbac24fcc84d3b9e94989d22`.
- Promotion advanced canonical catalog version 32 → 33.
- Production state for Pilot 05 remains 25 `in_review`, 0 verified and 0 published, with 0 human review events and 0 production source-rights events.
- Separate `ai-test-review-v1` evidence recorded 5 source-rights approvals and 75 question-gate approvals (25 Medical + 25 References + 25 Rights).
- Post-write integrity proof: all 75 AI-test review fingerprints match current gate targets and all 5 AI-test source-rights fingerprints match current sources.
- Internal-test readiness is now **106/180**: 6 human-published + 100 AI-test-only, shortage 74.
- Production readiness remains **6/180**, shortage 174. AI review did not alter production publication eligibility.
- Global production human-review backlog is now Medical 100 / References 100 / Rights 100; this debt is intentionally independent from the internal-test lane.
- Next autonomous content target is the remaining 74 internal-test questions. Batch size must remain ≥25 and source-grounded, and generation stops once the verified 180-question testing requirement is satisfied except for replacement of rejected/invalid items.


## M10a multimodal foundation started — 2026-09-28
- User selected subject-breadth-first scaling for the remaining simulator content gap and immediate inclusion of image-based radiology/pathology content.
- Added `src/domain/media.js`, a provider-independent Phase-1 media contract for JPEG/PNG/WebP across radiology, pathology, dermatology, ophthalmology, anatomy and ECG images.
- Media versions bind SHA-256 byte identity, dimensions, an opaque delivery reference, source/provider/original identifier, copyright/licence/rights evidence, diagnosis evidence and explicit review state.
- Added separately versioned hotspot/bounding-box/polygon annotations with normalized geometry and exact question-media links.
- Blind-first-look learner projection excludes diagnosis evidence, source/licence/review metadata and ground-truth annotations.
- Added a synthetic nonclinical media fixture and domain tests; no medical image has been claimed as reviewed or learner-ready by this slice.
- This is the prerequisite for image-based questions, not completion of M10. Next gate is persistence/media-bound review integrity and the first sourced radiology/pathology image pilot.


## M10a hosted media persistence + review binding — 2026-09-28
- Applied production migration `20260927222051_m10a_media_persistence_review_binding`.
- Added service-only, RLS-enabled immutable tables for media asset versions, annotation versions and exact question-media links.
- Media sources now carry normalized `rightsStatus = unknown | owned | licensed | public_domain`; image Rights approval fails closed when linked media remains `unknown`.
- `current_review_target_sha256` now conditionally incorporates exact media bytes, source/provenance metadata and linked annotations. Text-only questions use the historical target shape unchanged.
- Post-migration compatibility proof: 18/18 current human review fingerprints and 300/300 AI-test review fingerprints still match.
- Browser roles have no direct SELECT access to media tables and cannot execute the media registration RPC; service-role registration remains available.
- Added service-only `content_media_prompt`, returning only learner-safe prompt metadata: exact media version, modality, MIME type, dimensions, delivery reference and blind-first-look flag.
- Added authenticated `GET /study-api/media?questionVersionId=...` and cloud adapter support. The Edge API checks that the question is currently published before returning media.
- Rollback-only live test proved: adding media changes review hashes, learner prompt projection omits diagnosis/source/rights/annotations, unresolved image rights block Rights approval, and zero synthetic rows survive rollback.
- M10a remains IN PROGRESS. The next gate is the first real licensed/public-domain radiology + pathology pilot and learner-page rendering.


## M10a learner image rendering — 2026-09-28
- Study session state now attaches the service-derived `content-media-prompt-v1` projection to the exact published question version.
- Medical QBank renders prompt media before the stem with a generic modality label and no diagnostic clue.
- Learner UI accepts HTTPS delivery only, sends no referrer, uses bounded responsive `object-fit: contain`, and exposes no diagnosis evidence, annotations or rights/provenance metadata.
- Existing text-only questions receive `media: []` and retain their current study behavior.
- The next M10a task is no longer generic UI plumbing: ingest and verify the first real permissioned radiology/pathology media assets, then exercise the full image question path.


## M10a first exact-byte asset set + private delivery — 2026-09-28
- Verified five source pages with explicit CC0 1.0/public-domain dedication: three radiology assets (expiratory pneumothorax CXR, kidney-stone CT window comparison, lobar-pneumonia CXR) and two pathology assets (clear-cell RCC grade 1 H&E, seminoma H&E).
- Exact source bytes were fetched server-side into a private Supabase Storage bucket `mlos-media`; the bucket is not public.
- Canonical media registration recomputed SHA-256 from the stored bytes and recorded five immutable `MediaAsset@1` records with dimensions, source identity, CC0 evidence and `rightsStatus=public_domain`.
- Registered SHA-256 values: pneumothorax `cdc3a924…bde5`; kidney-stone CT `b0fdb5ce…7906`; lobar pneumonia `cae983ca…6f76`; clear-cell RCC `88bc329f…2cdf`; seminoma `c50bf62b…2fed`.
- The temporary fixed-source ingestion/registration Edge Functions were immediately disabled and changed to JWT-required 410 responses after success.
- Canonical delivery references remain opaque `storage://mlos-media/...`. The learner API now converts them to 15-minute signed URLs; raw bucket paths and service credentials are not browser-facing.
- No question links or annotations have been created yet, so existing question review fingerprints and simulator eligibility are unchanged.
- Next task: Batch 06, at least 25 breadth-first questions, with these five assets linked to selected radiology/pathology questions before AI-test Medical/References/Rights review so media is included in the original review fingerprints.


## M02b/M10a controlled multimodal breadth pilot 06 — 2026-09-28
- PR #86 merged `pilot:multimodal-breadth:20260928:06`: 25 original AI-drafted questions, 25 new canonical concepts and 9 source clusters.
- Breadth coverage: neonatal resuscitation, acute pancreatitis, epilepsy evaluation, depression, radiology and pathology.
- The first 5 real multimodal questions are linked to exact immutable media versions before review: 3 radiology + 2 pathology, all prompt role with `blindFirstLook=true`.
- The five media assets are private-storage-backed, exact-byte SHA-256 identified and carry canonical `rightsStatus=public_domain` from CC0 sources.
- NICE-derived draft items were removed before intake after current NICE AI-reuse terms were checked; neurology/psychiatry items instead use NINDS/NIMH public-domain sources.
- Exact merged manifest passed live intake validation 25/25 with 0 lexical-overlap flags at threshold 0.55.
- Manifest SHA-256: `a9d3cc5b3f60a5b8996755c06c52fa460d6d23314a4ab76325ffc2635e51d45b`.
- Promotion advanced canonical catalog version 33 → 34.
- Production state remains 25 `in_review`, 0 verified and 0 published for Pilot 06; 0 human review events and 0 production source-rights events were created.
- Separate `ai-test-review-v1` evidence recorded 9 source-rights decisions and 75 question-gate approvals. All 75 question fingerprints and all 9 source fingerprints match current targets after media linking.
- Live media integrity proof: 5/5 question-media links resolve to public-domain prompt assets with blind-first-look enabled.
- Internal-test readiness is now **131/180**: 6 human-published + 125 AI-test-only, shortage 49.
- Production readiness remains **6/180**, shortage 174.
- Human production review backlog is now Medical 125 / References 125 / Rights 125.
- The next autonomous content batch should contain exactly 49 breadth-first source-grounded questions if quality permits, reaching the internal simulator requirement without unnecessary overproduction.


## M08d internal 180-question simulator lane — 2026-09-28
- Internal-test content capacity reached exactly 180/180 distinct questions: 174 AI-test-only + 6 human-published. Production readiness remains 6/180 and published-only.
- The deterministic internal assembly contract produced 180/180 distinct question versions, including all 5 currently linked radiology/pathology image questions.
- Added a separate authenticated `POST /exam-simulator/test-runs` boundary. It never replaces or widens `POST /exam-simulator/runs`.
- Internal test-run start requires server-verified Supabase Auth `app_metadata.medical_learning_os_internal_tester === true`; `user_metadata` is not used for authorization.
- The test route uses only `exam_mock_test_readiness` + `exam_assemble_test_mock`; the production route remains pinned to `exam_mock_readiness` + `exam_assemble_mock`.
- Test-run state is permanently marked `testingOnly=true` and `productionEquivalent=false`.
- Current-request authorization is rechecked when reading or mutating an existing test run, so removing the app-metadata grant cuts off access without changing immutable run history.
- Simulator question views now attach the same learner-safe signed media projection already used by the QBank; diagnosis/source/rights/annotation ground truth is not added to pre-answer payloads.
- No user account has been granted the internal-test flag by this change. This avoids guessing an operator/test identity or contaminating a real learner account.


## M08d internal-test simulator route deployed — 2026-09-28
- PR #89 merged the separate internal-test simulator start boundary.
- Supabase `study-api` version 28 is ACTIVE with the exact merged source.
- `POST /exam-simulator/test-runs` requires server-verified `app_metadata.medical_learning_os_internal_tester === true` and uses `exam_mock_test_readiness` + `exam_assemble_test_mock`.
- Existing production `POST /exam-simulator/runs` remains on `exam_mock_readiness` + `exam_assemble_mock`; production eligibility is still 6/180 published questions.
- Test-run state is marked `testingOnly=true` and `productionEquivalent=false`; production and test starts cannot silently resume each other.
- Read/write access to an existing test run rechecks the current app-metadata grant, so authorization revocation cuts off subsequent access.
- Simulator question views now attach the same signed learner-safe media projection as the QBank, enabling the five exact-byte radiology/pathology prompts without pre-answer annotation/diagnosis leakage.
- Deployed source verification confirmed route, app-metadata gate, test readiness/assembly RPCs and media attachment are present.
- No existing real learner account was automatically granted internal-test access. The remaining hosted E2E gate is to use a deliberately designated internal test identity, grant that identity the app-metadata flag, then exercise a full 180-question run without mixing engineering evidence into a real learner's longitudinal history.


## M08d explicit cancellation / abandonment semantics — 2026-09-28
- Added pure `cancelExamRun` semantics to the shared locked-section runtime.
- Learner-facing cancellation terminates an in-progress run as `cancelled`, closes the currently open section at the server timestamp, preserves prior answers/review flags, clears `currentSectionIndex`, and records a structured termination reason.
- Cancellation does **not** set `completedAt`, does not create a completion/scoring receipt, and cancelled runs cannot be scored through the completed-run scoring path.
- The authenticated learner API exposes `POST /exam-simulator/runs/:runId/cancel` with request-id idempotency and optimistic revision protection.
- Browser/learner requests are always attributed as `user_abandoned`; they cannot claim `operator_cancelled`. Operator cancellation remains reserved for a future trusted operator boundary.
- Internal-test authorization is rechecked before cancelling a testing-only run, so grant revocation still fails closed.
- The existing database ledger already supports immutable `run.cancelled` events, so no schema change is required.
- Direct pure-runtime verification passed: prior answer preserved, active section closed at cancellation time, later writes rejected, scoring rejected, and a naturally completed run cannot be retroactively cancelled.
- M08d cancellation/abandon semantics are now implemented. Remaining gates are the deliberately designated internal-test identity for hosted full-mock proof and GT Autopsy.


## M08d GT Autopsy v1 foundation — 2026-09-28
- Added a pure, provider-independent `gt-autopsy-v1` projection for **completed exam runs only**.
- The projection reconciles the immutable completion receipt against final run responses before producing analytics; a mismatch fails closed.
- V1 exposes trusted result totals, section-by-section anatomy, primary-concept observations, current visual-question performance, and exact observed answer-change behavior from the immutable run-event ledger.
- Answer-change analysis reports beneficial, harmful and wrong→wrong changes plus the exact scoring impact of those observed changes under the pinned scoring rule.
- The prescription layer is deliberately limited to up to five **descriptive remediation candidates** ranked by observed incorrect/unanswered counts. It does not claim causal root cause, mastery, exam importance or expected marks recovered.
- Unsupported inference is explicitly disabled: no mastery inference, preventable-marks inference, fatigue inference or confidence calibration.
- Added authenticated `GET /exam-simulator/runs/:runId/autopsy`. It is learner-scoped, rechecks the internal-test grant for testing-only runs, synchronizes the trusted exam clock first and rejects non-completed/cancelled runs.
- Media performance is derived from canonical prompt-media links and modality metadata without generating signed image URLs or exposing diagnosis/rights/annotation data.
- Media lookups are chunked for full 180-question runs rather than relying on a single oversized query.
- Added `examRunAutopsy(runId)` to the cloud adapter.
- Direct pure-projection verification passed result/section reconciliation, visual metrics, concept aggregation, answer-change score impact, descriptive candidate ordering, receipt mismatch rejection and cancelled-run rejection.
- Live Edge Function deployment remains the final step for this slice after merge.


## M08d GT Autopsy deployed + Exam Mode shell — 2026-09-28
- Supabase `study-api` v30 is ACTIVE with the merged `gt-autopsy-v1` route and pure projection.
- Deployed-source verification confirmed completed-run gating, internal-test access recheck, receipt reconciliation, chunked media metadata lookup and explicit disabling of mastery/preventable-marks/fatigue/confidence inference.
- Added dedicated `/web/exam.html` + `/web/exam.js` Exam Mode source rather than embedding simulator mechanics into the ordinary QBank page.
- Exam Mode is a controller/view over the trusted server state machine: production/test readiness, start/resume/read, answer autosave, mark-for-review, cancellation and GT Autopsy all go through authenticated cloud APIs.
- Current-section navigation uses a 36-question-style palette generated from the server-returned section; there is no client action for early section advance or reopening a closed section.
- Countdown is synchronized from `serverNow` + the server-scheduled section end; expiry triggers a server refresh rather than client-side advancement.
- Exact answer/review/cancel writes remain request-idempotent and revisioned.
- The learner can clear an answer, toggle review state and move freely only inside the current section.
- Prompt images reuse the signed blind-first-look media projection and do not expose diagnosis, annotations or rights metadata.
- Completed runs hand off to descriptive GT Autopsy; cancelled runs explicitly receive no completion score/autopsy.
- Internal engineering readiness is visible only when the server-authorized test-readiness route succeeds; a 403 hides that lane from ordinary learners.
- Exact-head static safety checks passed. Hosted browser deployment/viewport verification remains pending merge/deploy.


## M08d accelerated full-mock acceptance proof — 2026-09-28
- The real internal-test assembly was reloaded from production data: 180/180 distinct question versions, five sections, 36 questions/section, 2520 seconds (42 minutes)/section, 12600 seconds total.
- The verified ruleset still pins `earlySectionAdvanceAllowed=false`, `revisitClosedSectionsAllowed=false` and `timeCarryForwardAllowed=false`.
- The runtime intentionally exposes **no early-section-advance command**. Section progression occurs only through the trusted clock transition.
- A direct write into a future section was rejected with `future_section_locked`.
- After each server deadline transition, writes back into the closed prior section were rejected with `section_locked`.
- Accelerated pure-runtime execution traversed the complete real 180-question assembly and all five real section deadlines:
  - 180 distinct questions;
  - 36 questions in each section;
  - all five sections closed;
  - final status `completed`;
  - 180 correct, 0 incorrect, 0 unanswered;
  - 18 marked-for-review responses preserved;
  - trusted score 720/720.
- A rollback-only database persistence drill then used the same real 180-item run and real section deadlines, persisted one answer in each section plus all five clock transitions, created the terminal completion receipt, verified the append-only ledger/revision count, and rolled the transaction back.
- Rollback residue check: 0 `exam_runs`, 0 `exam_run_events`, 0 `exam_run_receipts` for the synthetic proof run.
- This proves the core full-length state machine + persistence path without waiting 210 wall-clock minutes and without contaminating either existing learner account.
- The remaining hosted acceptance gate is a deliberately separate internal QA Auth identity so the live browser can execute the same 180-question path end-to-end.


## M08d isolated hosted QA smoke + query-routing fix — 2026-09-28
- Created one **separate synthetic Supabase Auth QA identity** with server-controlled `app_metadata.medical_learning_os_internal_tester=true` and `medical_learning_os_test_identity=true`; neither existing learner account was repurposed.
- Hosted QA immediately exposed a real routing defect: a global `url.search` rejection sat before legitimate query-bearing routes, causing production readiness, internal-test readiness and Exam DNA query parameters to fail with `query_not_supported`.
- PR #95 fixed query validation at the route level. Supabase `study-api` version 32 is ACTIVE with the fix.
- Function-edge logs after the fix verify the isolated QA identity exercised the real hosted API:
  - `GET /exam-simulator/readiness?ruleSetId=...` → 200;
  - `GET /exam-simulator/test-readiness?ruleSetId=...` → 200;
  - `POST /exam-simulator/test-runs` → 200;
  - answer mutation → 200;
  - review mutation → 200;
  - autopsy before completion → 409 as required;
  - cancellation → 200;
  - cancelled-run readback → 200;
  - autopsy after cancellation → 409 as required.
- The QA identity currently owns only isolated simulator smoke evidence: 3 cancelled test runs from repeated smoke attempts, 3 answer events, 3 review events, 3 cancellation events, and **0 completion receipts**.
- The retries occurred because the temporary remote runner later stalled while trying to fetch Render assets; the simulator API path had already completed successfully each time.
- The temporary QA bootstrap Edge Function is now disabled: version 3 requires JWT and returns HTTP 410 only.
- The temporary database `http` extension and private `mlos_internal_http` schema used for the bootstrap were removed after the test.
- Render previously deployed the dedicated Exam Mode commit `c65bbf3...` successfully and marked it live. Subsequent main commits after that point were docs/API-query changes, not Exam Mode browser-code changes.
- M08d backend/runtime/hosted-API acceptance is now complete. Remaining browser-specific gate: visually exercise the live Exam Mode at phone/tablet/desktop widths and complete a human-driven browser interaction pass; this environment has no general webpage-rendering browser capable of that verification.


## M09a intelligence-provider boundary — 2026-09-28
- Added semantic capability `learning.teaching.render@1` for rendering a teaching action already selected by policy. The capability names the learning job, not an AI vendor/model.
- Added pure `IntelligenceTask@1`, `IntelligenceResult@1` and provider-descriptor validation in `src/domain/intelligence-provider.js`.
- Tasks bind a semantic capability, versioned instruction set, canonical structured input, explicit grounding references/mode, versioned output contract, latency/cost ceilings, request time and metadata.
- Results bind exact provider/implementation/version attribution, structured output, citations, normalized usage/cost, timestamps, normalized error state and canonical metadata.
- Required-grounding tasks cannot succeed without citations, and every returned citation must be a subset of the task's supplied grounding references.
- Exact-key validation deliberately excludes provider-owned conversation memory, hidden-reasoning fields and arbitrary unversioned payload expansion from the cross-provider contract.
- `createIntelligenceProvider` is a structural adapter only: it validates supported semantic capabilities, immutable task input, structured results and exact provider attribution.
- The provider does **not** choose Study Now/Adaptive Teaching policy, mutate canonical learner evidence, own learner state, publish content or write medical truth.
- No provider SDK, model router, prompt database, AI persistence table, network call or recurring AI/infrastructure cost was introduced.
- Direct execution verification passed capability registration, required grounding, citation containment, structured result validation, provider attribution and unsupported-capability rejection.
- Next M09 slice: define one grounded teaching-output contract plus an evaluation/fallback contract before connecting a real model provider.


## M09b grounded teaching output + fail-closed fallback — 2026-09-28
- Added `src/domain/grounded-teaching.js` as the first capability-specific contract on top of the generic M09a `IntelligenceTask@1` / `IntelligenceResult@1` envelopes.
- Scope is intentionally narrow: an upstream Teaching Policy has already selected one of `concise_explanation`, `contrastive_explanation`, `misconception_repair` or `prerequisite_remediation`. The provider may render that action but cannot select the learning target/intervention.
- `grounded-teaching-output@1` binds exact teaching action + concept, a compact headline, up to six typed claims, claim-level citation references, an optional misconception-correction mapping, the next learner prompt, and explicit ready/abstained state.
- Every ready medical claim must carry at least one citation inside the task's supplied grounding, and every claim citation must also appear in the provider result's declared citation set.
- Misconception repair must echo the exact observed learner belief and bind it to both a `correction` claim and a `discriminator` claim. Contrastive explanations require a discriminator claim; prerequisite remediation requires a prerequisite claim.
- Conservative engineering verbosity caps are 120 words for concise explanation, 160 for contrastive/misconception repair and 180 for prerequisite remediation. These are guardrails, not claims of pedagogical optimality; later experiments may version them.
- Providers may abstain only as `insufficient_grounding` or `medical_uncertainty`. Abstention never reaches the learner as an empty AI response; the delivery resolver uses the task's reviewed canonical fallback.
- `resolveGroundedTeachingDelivery` deterministically returns canonical fallback for provider absence, provider failure/rejection, abstention or any evaluation failure. Invalid provider output is never exposed.
- Executable evaluation cases cover valid grounded repair, uncited claims, claim citations missing from the provider result, misconception mismatch, missing discriminator, over-verbosity, safe abstention, provider failure and invalid-output fallback.
- Direct execution passed all evaluated paths.
- While executing M09b, a pre-existing canonical-integrity defect was discovered: the array-index regex contained a literal double backslash, causing normal arrays with indices beyond `0` to fail canonical JSON validation. The regex is corrected and a dense multi-index array regression test is added.
- No live AI provider, model SDK, model router, prompt database, AI persistence table, or recurring AI cost is introduced.
- Claim-level citation containment still does **not** prove semantic medical correctness. A curated semantic medical teaching evaluation set remains required before a learner-facing provider is connected.


## M09b learner-facing canonical teaching fallback — 2026-09-28
- Added a deterministic post-answer teaching producer at `supabase/functions/study-api/_shared/post-answer-teaching.js`.
- Incorrect answers now map to the bounded action `concise_explanation`; correct answers create no extra remediation block.
- The producer reuses the exact reviewed/published question explanation without rewriting or truncating medical content.
- Current published explanations are comfortably within the v1 concise limit (6 published questions; maximum 41 words, average 31.7 words at verification time).
- Source metadata from the exact question version is converted into claim-level `content-source` references and attached to `grounded-teaching-output@1`.
- If no canonical source identity is available or the reviewed explanation would exceed the v1 verbosity contract, the producer returns no structured teaching block rather than fabricating or truncating content.
- The immutable answer receipt now records both `teachingDecision` and `teaching`; this preserves which intervention was actually shown for later intervention→outcome analysis without creating a new learner-state store.
- The medical learner UI renders the structured canonical block for incorrect answers, including one short retrieval prompt, while old receipts and any non-conforming payload fall back to the existing reviewed explanation.
- Correct answers keep the existing reviewed feedback path and do not enter the remediation block.
- Direct cross-contract execution verified that the Edge Function producer output is accepted by the M09b domain validator. It also verified correct-answer silence, fail-soft no-source behavior, refusal to truncate overlong explanations and source-version deduplication.
- No live AI provider is used. This learner flow therefore works identically when all AI providers are absent.


## M09c semantic teaching bootstrap evaluation set — 2026-09-28
- Added `data/evaluations/grounded-teaching-semantic-bootstrap-v1.json`.
- The bootstrap set contains 6 cases and exactly covers all 6 currently human-reviewed/published question versions in the live catalog at verification time.
- Cases are derived only from reviewed canonical explanations and their exact canonical source IDs/versions.
- Every case contains an observed wrong option, reviewed canonical explanation, positive facts that must be preserved, explicit incorrect/dangerous claims that must not appear, allowed grounding, and a 120-word micro-remediation ceiling.
- Added `src/domain/teaching-semantic-evaluation.js` with strict evaluation-set, checklist and human-review record contracts.
- Five dimensions are mandatory: medical correctness, error correction, grounding, unsupported claims and verbosity.
- Medical correctness, error correction and unsupported-claim review are explicitly `human_required`; grounding is `contract_plus_human`. Automated structure/citation checks cannot substitute for semantic medical review.
- An overall pass is valid only if **every** required dimension passes; one failed dimension forces overall failure.
- The bootstrap set explicitly has `productionQualificationAuthority=false`. Passing it alone can never authorize a production provider.
- Direct execution verified schema integrity, checklist generation, all-pass review validation, rejection of inconsistent overall verdicts and exact 6/6 coverage against the live published catalog.
- No provider has been connected or qualified by this work.


## M09c non-authoritative provider evaluation runner — 2026-09-28
- Added `src/domain/teaching-provider-evaluation-runner.js`.
- The runner consumes the curated semantic teaching evaluation set plus any replaceable `IntelligenceProvider` that supports `learning.teaching.render`.
- Each evaluation case becomes a grounded evaluation-only task with the case's reviewed canonical explanation as deterministic fallback and the observed wrong option preserved in task metadata.
- Every case executes independently. A provider exception does not abort the suite; that case records `provider_error`, previews canonical fallback, and later cases continue.
- Structurally/grounding-invalid provider output becomes `blocked_before_human_review`; it cannot be laundered into a human semantic pass.
- Only deterministic passes become `awaiting_human_review` and receive the five-dimension semantic checklist.
- Finalization accepts only validated human semantic reviews whose `providerRunRef` matches the exact evaluated case.
- Bootstrap verdict is conjunctive:
  - any provider/deterministic block or human semantic failure → `fail`;
  - missing required human reviews → `pending`;
  - all cases deterministic-pass + all human-pass → `pass`.
- Regardless of bootstrap verdict, `productionQualificationAuthority=false`, `productionQualified=false`, and qualification scope remains `bootstrap_only`.
- Direct execution verified:
  - valid fake provider: 6/6 deterministic pass, all awaiting human review;
  - structurally unsafe provider: 1 deterministic block, canonical fallback for that case;
  - throwing provider: 1 provider error while later cases continue;
  - three missing reviews → pending;
  - one human semantic failure → bootstrap fail;
  - all six human passes → bootstrap pass but still no production qualification.
- No provider network call, credential, model SDK, production routing or run-cost persistence was introduced.


## M09c semantic teaching breadth v2 — 2026-09-28
- Added `data/evaluations/grounded-teaching-semantic-breadth-v2.json` as a separate development-only breadth set rather than weakening or rewriting the six-case human-reviewed bootstrap.
- The set contains 12 unique question versions across anesthesia, cardiology, critical care, dermatology, neurology, obstetrics, ophthalmology, psychiatry, asthma, COPD, adult BLS and toxicology.
- All 12 selected question versions currently retain matching AI-test Medical, References and Rights approvals under `ai-test-review-v1` (3/3 current review kinds each).
- Schema v2 adds explicit `representation` plus action-specific canonical claims and optional observed-belief evidence while preserving schema-v1 compatibility.
- All four grounded-teaching actions are now exercised: concise explanation, contrastive explanation, misconception repair and prerequisite remediation.
- Textual task representations include factual recall, clinical vignette, management decision and discrimination.
- Misconception cases must carry an explicit observed learner belief; their deterministic fallback contains both correction and discriminator claims bound to that belief.
- Contrastive cases require a discriminator claim; prerequisite cases require a prerequisite claim.
- The non-authoritative provider runner now builds valid action-specific canonical fallbacks for schema-v2 cases and carries representation into evaluation metadata.
- Direct execution with a fake replaceable provider passed all 12 deterministic contracts and routed all 12 to `awaiting_human_review`; production qualification authority remained false.
- The set is explicitly **not** human production-reviewed. Automated checks and prior AI-test content review cannot substitute for human semantic provider review.
- Visual/multimodal teaching evaluation is intentionally not smuggled into this text contract; it remains a later M09/M10 bridge requiring media-bearing provider input.


## M10b visual interaction evidence foundation — 2026-09-28
- Added `src/domain/visual-interaction.js` with a strict v1 `media.interaction.completed` contract.
- Phase-1 task types are detection, localization, description, interpretation and discrimination.
- Evidence binds the exact learner/session/attempt/question/concept/media version, server-compatible canonical timestamp, latency, learner response, trusted evaluation, help use and optional intervention reference.
- Localization records normalized learner geometry and optional IoU against a versioned annotation; IoU is rejected for non-localization tasks.
- `visualMistakeObservation` emits only descriptive visual-error evidence for non-correct outcomes. It does not infer a causal mistake phenotype or mastery state.
- `visualStudySignal` is explicitly marked `authoritativeForMastery=false`, preserving the Digital Twin boundary.
- Added executable tests for immutability, all five task types, bounded geometry, empty-response rejection, correct-answer silence in Mistake observations and non-authoritative Study Now signaling.
- No database schema, learner UI, media review state or production content was changed by this slice.
- Next M10b gate: persist the event through the canonical learner-event ledger, then exercise one authenticated image interaction end to end before adding visual-error recurrence logic.

## M09c target-bound human semantic review — 2026-09-28
- Closed an integrity gap in the semantic provider gate: a human review can no longer be attached only to a movable `providerRunRef`.
- New evaluation runs use `semantic-teaching-provider-evaluation-run-v2`.
- Every deterministic-pass case receives a canonical JCS/RFC-8785 + SHA-256 `reviewTargetDigest` over the exact evaluation case, task/provider attribution, provider teaching output and citation references.
- Semantic review schema v2 carries that digest; finalization requires an exact profile + digest match.
- A stale/substituted target or legacy unbound v1 review is rejected for a v2 run.
- Provider-error and deterministic-blocked cases receive no review target and cannot be laundered into human approval.
- Existing production authority remains unchanged: `productionQualificationAuthority=false` and `productionQualified=false`.
- Exact-head in-memory verification passed against both real fixtures: 6/6 bootstrap and 12/12 breadth cases received valid target digests; stale and legacy unbound reviews were rejected.
- GitHub Actions remains unavailable for this repository in the observed runs: both jobs fail before step 1 with zero executed steps. This is recorded separately from the exact-head domain verification.
- No model SDK, provider credential, learner-facing AI route, database migration or recurring AI cost is introduced.
- Next M09c gate remains genuine human semantic review of real provider outputs before any separately governed provider-activation policy can exist.

## Decision-ledger uniqueness guard — 2026-09-28
- Resolved the newly introduced ADR collision by assigning the M09c review-binding decision to ADR-062; M10b retains ADR-061.
- Added a repository check that rejects any new duplicate ADR number.
- Historical duplicate IDs 028, 052 and 058 are explicitly grandfathered rather than silently renumbered, because changing historical identifiers can break existing references.
- The check also fails if one of those legacy exceptions changes unexpectedly, making future cleanup deliberate rather than accidental.

## M05c real due-item backend acceptance — 2026-09-28
- Used the isolated synthetic QA Auth identity, not a real learner account.
- A genuinely overdue revision row existed for a published anaphylaxis question under `bootstrap-binary-v1`; the current learner state showed one prior incorrect attempt and `latestCorrect=false`.
- Started a live hosted Supabase recommendation session through the same canonical stored procedure used by Study Now, with strategy `due-then-new-v2` and reason `mistake-repair`.
- Recorded the correct published answer through `study_record_attempt`, rebuilt the canonical revision projection, recorded the authoritative schedule decision, and advanced/closed the one-item session.
- Resulting revision state is now 2 attempts / 1 correct / 1 incorrect / `latestCorrect=true` / `consecutiveCorrect=1` with the next due time one day after the successful retrieval.
- Integrity checks passed: recommendation question matched attempt; revision `evidence_last_event_id` matched the attempt; authoritative `proposed_due_at` exactly matched revision `due_at`; the session closed at position 1.
- This closes the live backend/RPC acceptance part of M05c. The remaining M05c gate is transport-only: execute the same real due-item cycle through the authenticated `/study-now/start` + learner answer HTTP/browser path when a callable browser/JWT path is available.

## M10b visual interaction persistence — 2026-09-28
- Applied live migrations `20260928112019 m10b_visual_interaction_ledger` and `20260928112441 m10b_visual_interaction_fk_indexes`; exact SQL is committed under `supabase/migrations/`.
- Added service-only `study_visual_interaction_events` with RLS enabled, direct client writes revoked, exact media/session/question identity columns, and append-only UPDATE/DELETE protection through the existing learner-evidence guard.
- Added idempotent `study_record_visual_interaction(uuid,jsonb)`: exact retry returns the same receipt, same event ID with changed payload is rejected, session/question ownership is checked, and the media must be a prompt-linked asset for the exact question.
- Trusted localization evidence now requires the target concept to equal the event concept; any IoU requires an explicit matched annotation version, and a supplied annotation must match the exact media asset + concept.
- Extended `study_learning_event_stream_v1` with `media.interaction.completed` as an `observation` family while preserving `inferenceAuthority=false` and `masteryInferenceEnabled=false`.
- Privacy erasure scope advanced to v2 and now includes `study_visual_interaction_events` in scope validation, preview counts, atomic deletion and post-erasure completeness checks.
- Hosted synthetic-QA proof passed with a prompt-linked pathology image: one event persisted, exact retry stayed single-row, conflicting retry was rejected, replay returned the exact payload/source, and the temporary session was closed afterward.
- Privilege proof: anon/authenticated/service_role have no direct INSERT; service_role has SELECT plus RPC execution; authenticated has no RPC execution.
- Append-only mutation proof passed: direct UPDATE hit `learner_evidence_is_append_only`.
- Supabase performance advisor initially identified two new unindexed FKs; both were fixed, and the new visual table no longer appears under the unindexed-FK lint. Fresh indexes may appear under the expected unused-index informational lint until production traffic uses them.
- The security advisor's RLS-without-policy informational notice is intentional for this service-only table because client grants are revoked and no client policy is desired.
- Pure exact-head domain verification passed target-concept mismatch rejection, IoU-without-annotation rejection, and preserved `authoritativeForMastery=false`.
- Next M10b gate: add the authenticated application write route that derives trusted evaluation server-side, then run one full image interaction through that route before any recurrence-based visual mistake inference.

## M10b authenticated server-scored detection route — 2026-09-28
- Added `POST /sessions/:id/visual-detection` to the authenticated `study-api`.
- The client does **not** submit correctness, outcome, target concept, event identity or timestamp. It submits only requestId, current position, optionId, exact mediaAssetVersionId, helpUsed and optional interventionRef.
- The server resolves the owned session/question, validates the exact prompt media, derives the canonical primary concept and answer key, computes correctness, and records the ordinary immutable `question.answered` attempt first.
- The persisted attempt receipt carries the visual-detection intent/event ID; retries reuse that receipt. Reusing the same request key with changed visual intent fails with `visual_request_key_collision`.
- The server then builds `media.interaction.completed` from the stored scored attempt. Wrong options preserve observable option text but do not invent a distractor concept ID.
- Revision rebuild + authoritative schedule receipt remain driven by the canonical question attempt, not the visual event.
- Production eligibility requires the question to be published. Internal `in_review` visual questions require the existing internal tester principal plus current Medical/References/Rights approvals under `ai-test-review-v1`, with target hashes matching the current media-bound review targets.
- Detection-only is deliberate. Localization, free-text description and interpretation remain separate evaluation problems.
- `study-api` version 34 deployed successfully with the new shared visual-detection module. Deployed artifact verification confirmed route presence, server-side answer-key scoring, no `input.correct` consumption, current AI-test gate and visual-ledger RPC wiring.
- Exact-head helper verification passed correct/incorrect derivation and rejected a forced client/server correctness disagreement.
- Full authenticated HTTP invocation remains open because this execution environment has no learner session JWT and its local container cannot resolve the Supabase host. This is a transport-proof gap, not a deployment/compiler failure.
- No new AI provider, model call, mastery inference or recurring cost was introduced.

## M10b learner visual-detection UI wiring — 2026-09-28
- Added `cloud.visualDetection(...)` to the authenticated learner adapter. Its payload contains only response intent + exact media identity; it contains no learner ID, correctness, outcome, target concept or answer key.
- The medical learner UI now checks only an explicit server-returned `question.visualInteraction` descriptor. It does not infer task type from the mere presence of an image.
- When the descriptor is exactly schema v1 + `taskType=detection` + a media version actually present in the question prompt, answer submission uses `/sessions/:id/visual-detection`; otherwise the ordinary `/answer` path remains unchanged.
- The UI accepts the attempt receipt returned by the server and never computes correctness. It renders a distinct “IMAGE RECOGNITION · SERVER SCORED” affordance and, after success, explains that visual evidence is stored separately from the scored attempt.
- The server media adapter now passes through only a validated explicit visual-interaction descriptor from the canonical media prompt. No task classification is inferred in the browser.
- `study-api` v35 deployed successfully with the descriptor pass-through while retaining the v34 server-scored visual route.
- Exact syntax checks passed for `web/medical.js` and `src/adapters/cloud-study.js`; deployed artifact verification confirmed descriptor pass-through and the visual route.
- This path is intentionally dormant today because the canonical media prompt emits no visual-interaction descriptor yet. Existing medical study behavior therefore remains unchanged.
- Next M10b gate: after human review/publishing of the first visual detection item, make its canonical media prompt emit the explicit detection descriptor and execute the full authenticated browser/JWT interaction.

## M10b media-bound human review surface — 2026-09-28
- Added a reviewer-only media inspection packet to the existing authenticated review queue.
- For media-linked in-review questions, review-api now resolves the exact gate-specific `content_media_review_target`, current target SHA-256, media identities and signed 15-minute delivery URLs.
- The reviewer UI renders the exact image before the decision form, shows role/modality/dimensions/media version, exposes the current target fingerprint, and provides the exact gate-bound metadata in an inspectable detail block.
- Medical, References and Rights each remain distinct targets; the same visual question currently has one media item in all three target sets with distinct current target hashes.
- `content_media_review_target(text,text)` remains unavailable to anon/authenticated roles and is now explicitly executable only by service_role for the authenticated review backend.
- Live privilege proof: anon=false, authenticated=false, service_role=true.
- `review-api` v10 deployed successfully; deployed artifact confirms target RPC, current-hash RPC, signed media delivery and queue attachment.
- `web/review.js` exact-head syntax verification passed.
- This closes the reviewer-surface blocker. It does **not** create or impersonate human approval; the first visual question still requires an authorized human reviewer to inspect and decide Medical, References and Rights before publication.

## M10b canonical visual interaction profile — 2026-09-28
- Added immutable service-only `content_visual_interaction_profiles` and `content_register_visual_interaction_v1`.
- A profile can be registered only while the exact question version remains `in_review` and only against an exact prompt-linked media version.
- Registered `visual:pathology:clear-cell-rcc@1` + `media:pathology:clear-cell-rcc-grade1@1` as schema-v1 `detection`.
- `content_media_prompt` now returns the explicit canonical `visualInteraction` descriptor consumed by study-api v35 and the dormant learner UI.
- `content_media_review_target` now includes the same descriptor in Medical, References and Rights targets, so task-semantic changes invalidate prior reviews.
- Live proof: learner prompt descriptor and all three review descriptors resolve to the same detection/media identity.
- Existing AI-test review hashes became stale after this semantic addition, as intended; no human review existed, so no human approval was invalidated. Internal AI-test eligibility therefore fails closed until separately re-reviewed.
- Profile table is RLS-enabled, anon/authenticated inaccessible, service-role readable; registration RPC is service-only.
- UPDATE mutation was rejected by the existing immutable-media guard.
- Supabase advisor found no new unindexed foreign key for this table; RLS-without-policy is intentional because it is service-only.
- Human review remains the next authority gate.


## M02c source-grounded verification v1 — 2026-09-28

- Added `src/domain/source-grounded-verification.js` as a pure non-authoritative source/claim review-assistance contract.
- Atomic claim candidates are bound to exact source ID, source version, structured locator and SHA-256 passage/content digest.
- Source evidence distinguishes support / partial support / contradiction / not-found / ambiguity, authority class, and rights mode.
- Deterministic authority rules require current authoritative evidence for management/dose/contraindication/screening/prevention, regulator evidence for regulatory status, official exam authority for exam rules, and PYQ evidence for historical exam answers.
- Review routing is `routine` / `focused` / `expert`; every packet still sets `productionHumanReviewRequired=true` and `publicationAuthority=false`.
- The existing provider-neutral `content.source.inspect` and `content.review.propose` capabilities are reused; no new model provider or content agent was introduced.
- The pure content-domain source-rights enum now accepts `citation_only`, aligning it with the already-live rights-review system and existing controlled pilots.
- Added focused regression tests for immutable claim evidence, routine/focused/expert routing, current-authority requirements, high-risk escalation, deterministic-failure escalation, target-digest drift, malformed evidence and historical-vs-current claim separation.
- Added `docs/SOURCE_GROUNDED_VERIFICATION.md` with the exact textbook/source ingestion workflow, PYQ handoff, rights posture, planned adjunct schema, planned internal API and validation metrics.
- ADR-065 records that source-grounded automation assembles evidence but never becomes production medical authority.
- The live Medical Learning OS Supabase project was inspected read-only. No M02c tables exist and no DDL/migration was applied in this slice. Persistence remains deliberately gated until a controlled grounding batch demonstrates review-time benefit.
- Focused executable contract checks passed for routine routing, citation-only focused routing, contradiction escalation, authority escalation, duplicate-evidence rejection and citation-only catalog publication compatibility.
- PR #113 Foundation checks were triggered, but both GitHub Actions jobs failed before executing any step (empty step lists), matching the repository's current runner-infrastructure failure pattern. This is not recorded as a code-test failure or a green CI run.

### Next M02c gate

Run a controlled source-grounding experiment on a small real question/PYQ set using registered sources. Measure manual source-search time, reviewer correction rate, claim/evidence reuse, rights-review time and packet routing. Only if the layer demonstrably reduces review burden without worsening corrections should M02c gain persistent passage/claim/packet tables or an internal ingestion API.


## M02c first real source-grounding experiment — 2026-09-28

- Added `data/evaluations/source-grounding-cdc-co-v1.json` using seven existing in-review carbon-monoxide questions that all reference the same registered CDC Clinical Guidance source.
- The current CDC page was independently inspected and visibly reports July 8, 2024, matching the catalog source version `2024-07-08`; the source-version binding therefore passes for this pilot.
- Seven material claims are bound to exact source version + semantic locator + SHA-256 digest without storing copied source passages in the repository.
- Claim coverage is 7/7 direct support from one source, demonstrating a source-evidence reuse factor of 7 across the cluster.
- Rights posture is proposed as `public_domain` from CDC's agency-material policy, but production Rights review remains authoritative because CDC explicitly notes exceptions.
- Expected M02c routing is 0 routine / 5 focused / 2 expert. The two hyperbaric-oxygen treatment claims are high-risk and therefore remain expert-routed even with direct CDC support.
- No production Medical, References or Rights review was recorded; no source rights were resolved; no question was verified or published.
- Persistence remains deferred because this experiment proves evidence reuse and conservative routing, not actual reviewer-time reduction. The next acceptance signal is measured reviewer minutes + reviewer correction rate on the same packetized workflow.
- Focused execution of the exact pilot fixture passed: all seven packets matched their expected lane, all required production human review, and all had publication authority disabled.
- PR #114 Foundation checks again failed before step execution: both `check` and `browser` jobs returned empty step lists. This is recorded as the existing GitHub runner-infrastructure failure pattern, not a green CI result and not a demonstrated code-test failure.


## Source-first Rights review compression — 2026-09-28

- The authenticated reviewer workspace now deduplicates unresolved source-rights work before question-level Rights & provenance decisions.
- Live catalog measurement before merge: 174 in-review questions currently create 174 question→source links but only 37 unique unresolved sources, averaging 4.70 pending question links per source. The source-first workflow therefore removes the repeated source-resolution surface without weakening per-question review.
- On the Rights gate for question targets, unresolved sources are grouped by canonical `sourceId`, sorted by the number of pending questions they affect, and shown once with impact count.
- Repeated source-rights forms are removed from individual question cards while the source is unresolved.
- Question-level rights cards remain intentionally hidden until every referenced source has a recorded rights status; this prevents 174 blocked question cards from overwhelming the reviewer.
- A `restricted` source is considered resolved for workflow visibility, so affected questions surface for explicit rejection while approval remains disabled.
- Source resolution still does **not** approve a question gate, verify content or publish anything. The existing authenticated question-level rights decision remains mandatory.
- This is UI/workflow compression only: no new database table, no new privileged API, no change to review fingerprints and no change to publication authority.
- Focused syntax/contract checks passed for unique-source aggregation, impact sorting, source-resolution gating and preservation of manual `review.resolveRights(...)` submission.
- PR #115 Foundation checks again failed before executing any workflow steps: both `check` and `browser` jobs returned empty step lists. This remains a runner-infrastructure failure, not a green CI result and not a demonstrated code-test failure.


## Claim-first References inspection and executable checks — 2026-09-28

- Added an inspection-only References workspace over the existing CDC CO pilot. Identical canonical claim/evidence payloads share a card, keyed by SHA-256; affected question versions and conservative risk lanes remain visible.
- Matching requires the current queue question version, primary concept and every evidence source/version. Drift or missing metadata withholds the packet. Failed loading/validation clears assistance and preserves individual review. Out-of-order queue loads cannot replace a newer gate selection.
- The pilot has seven distinct claims and seven claim/question links: source reuse is 7x, but observed claim reuse is 1x. Synthetic tests exercise shared-claim grouping without claiming measured real-world savings.
- Passage excerpts do not exist in this pilot; the workspace truthfully displays locators/digests and asks the reviewer to inspect the source. No excerpts or medical judgments were invented.
- Existing per-question human review, rights and publication controls remain authoritative. No persistent shared claim decision, database/API change, production review, or publication was introduced. Persisting reusable human claim decisions remains gated by measured reviewer effort/correction rates under ADR-065.
- Found and repaired a real check-script syntax defect: literal backslash-n sequences and over-escaped ADR regexes prevented `scripts/check.js` from parsing.
- Full local execution exposed seven stale assertions/fixtures: CDC source count scoped to the relevant batch; production exam ordering scoped after its assembly; query guard scoped outside the prior route; current testingOnly UI flag; template-generated rights text; refactored media helper; and a structurally valid digest to reach the blocked-provider gate. These corrections do not alter production approval/security logic.
- Local verification: 553/553 tests passed; `npm run check` and `npm run demo` passed on Node 24.19.0.
- Added responsive References browser checks for phone/tablet/desktop, reload, switching gates, packet-fetch failure and zero automatic writes. Browser execution remains UNVERIFIED: local Chromium is absent and its download returned invalid archives. No live authenticated reviewer flow was exercised.
- GitHub run 36427834173, jobs 108946098604 and 108946098252, failed with no steps. Both have two annotations, but the connector rejects the annotations endpoint; log retrieval returns BlobNotFound. The actual runner-start root cause is unresolved, not proven to be billing, configuration or service outage. No blind reruns, paid runner changes or disabled gates were used.
- Next: inspect GitHub's job annotations through an authorized browser/dashboard path; restore runner execution; run the new browser checks and the existing responsive suite; then measure human review time and correction rate before persistent shared decisions.

## GitHub runner-start blocker identified — 2026-09-28

- Browser inspection of run 36430506899 confirmed GitHub's billing/spending-limit start refusal, not a workflow step failure.
- Read-only account billing inspection showed 2,000 / 2,000 included Actions minutes consumed, $0 billable Actions usage, and an Actions budget of $0 with Stop usage enabled. GitHub displayed an included-usage reset in three days. No payment/spending settings were changed.
- Foundation checks now run on pull requests, main pushes and manual dispatch, avoiding duplicate feature-branch push plus PR runs. Concurrency cancels superseded runs for the same PR/ref. All existing test/browser gates remain present; operational backup workflows are untouched.
- This conserves future allowance but does not restore exhausted minutes. PR #116 stays draft until browser verification and runner checks actually execute. A free-quota reset is the current zero-cost recovery path; do not repeatedly rerun while quota is exhausted.

## M02c matched review-workflow measurement — 2026-09-28
- PR #116's repaired executable checks and claim-first References workspace are now on main.
- Live backlog contains multiple untouched single-source clusters; the first matched operational comparison is fixed at 7 CO questions vs 7 ASA preoperative-fasting questions.
- Added immutable service-only `content_review_workflow_measurements` plus idempotent `record_content_review_workflow_measurement` and descriptive summary RPC.
- Measurement rows are written only after an existing human review receipt; reviewer/question/gate/target hash are derived server-side from that immutable receipt.
- The browser exposes an explicit optional M02c pilot selector only under References → Questions: `CO claim-first` and `ASA standard`. Ordinary review stays unmeasured unless a reviewer deliberately selects a pilot arm.
- The browser records both foreground-active milliseconds and elapsed wall milliseconds. Foreground time is a lower bound when source reading occurs in another tab; wall time is an upper bound if the reviewer pauses.
- Review measurement failure never rolls back or changes the human review decision.
- Summary output is explicitly `causal=false`; rejection rate is treated only as a correction-needed proxy.
- `review-api` v11 deployed successfully with authenticated write + summary routes; browser payload never contains reviewer identity.
- Live rolled-back smoke passed exact retry idempotency, conflicting retry rejection, append-only mutation blocking and descriptive summary generation. Rollback left 0 smoke rows and the live measurement table remains empty before the real pilot.
- Privileges: anon/authenticated cannot select or record; service_role can select and execute the record RPC.
- Supabase advisor shows no new unindexed foreign key for the measurement table. RLS-without-policy is intentional because the table is service-only.
- Persistence of reusable claim/passage/verification packets remains gated. The next M02c authority signal is now actual human completion of both matched References arms and comparison of total/median timing plus rejection/correction-needed proxy.

## Post-M08d reconciliation — 2026-09-28

- PR #117 is merged. Its retry run completed green: `npm run check`, full Node tests, demo, responsive browser checks and claim-first References browser verification all passed.
- PR #118 is merged and closes the final M08d browser gate. Foundation checks passed both jobs. Exam Mode browser acceptance passed at phone 390×844, tablet 820×1180 and desktop 1440×1000.
- The Exam Mode acceptance covers production-vs-internal readiness separation, internal mock start, 36-question palette, server-owned answer autosave, mark/unmark review, in-section navigation, no answer-key reveal, reload restoration, completed-run GT Autopsy loading and cancellation without completion score/autopsy.
- A real race in the acceptance script was fixed: the test now waits for asynchronous readiness cards instead of asserting while the UI legitimately shows `Checking simulator state…`.
- M08d is therefore DONE. M08 stays IN PROGRESS only because M08b still lacks genuine historical NEET-PG/INI-CET PYQ evidence.
- Current live catalog audit: 180 total questions, 174 in review, 6 published, 180 unique primary concepts, 0 reused primary concepts. This reduces the immediate value of heavier semantic-near-duplicate infrastructure; the existing lexical-overlap preflight remains the appropriate current guard.
- Current highest-value unresolved gates are now evidence/authority limited rather than missing core plumbing: M02c needs human matched References-review measurements; M05c needs a real authenticated learner browser/JWT transport proof; M08b needs genuine historical PYQ evidence; M09c needs human semantic provider review; M10a/M10b need human visual-content review and publication.
- GitHub Actions execution is currently restored and green on the latest merged work. The earlier included-minutes billing/start refusal remains historical context, not a current execution blocker.

## M02c reviewer pilot dashboard — 2026-09-28
- The authenticated References workspace now reads the existing service-derived `content-review-workflow-measurement-summary-v1` for `m02c-references-workflow-v1`.
- Each matched arm shows measured decisions out of 7, median foreground-active time, median elapsed-wall time and rejection/correction-needed proxy.
- The dashboard uses the canonical experiment configuration for labels, source identities and expected counts; no duplicate experiment definition was introduced in the UI.
- Partial results are explicitly non-verdict evidence. Even when both arms complete, the interface does not rank them or infer a winner; it tells the reviewer/operator to consider timing and correction signals together.
- Summary payloads are accepted only when contract ID, experiment ID, workflow array and `causal=false` match the expected contract.
- Summary load/validation failure clears the summary, leaves References review usable and never reuses stale results.
- The dashboard is read-only. It adds no approval, reviewer-scoring, publication or claim-verification authority.
- Responsive browser coverage now includes dashboard rendering at phone/tablet/desktop widths while retaining the zero-automatic-write assertion.
- The remaining M02c gate is unchanged and irreducibly human: complete the two matched References arms, then assess whether measured review effort falls enough without a worse correction signal to justify persistent claim/passage/packet infrastructure.

## M14 latest-backup recoverability foundation — 2026-09-28
- Weekly Supabase → private R2 backup is operational; scheduled run 36283198880 succeeded on 2026-09-27 through dump, upload and remote-object verification.
- The previous R2 restore workflow was pinned to the 2026-09-25 archive, so it did not prove that the newest backup remained recoverable.
- The recovery drill now discovers the newest canonical `supabase/YYYY/MM/DD/YYYYMMDDTHHMMSSZ/backup.tar.gz` object automatically, downloads its checksum companion and rejects missing/noncanonical inventory.
- Recovery validates archive SHA-256, all three inner SQL SHA-256 values, source project, repository, numeric originating run/attempt, backup age <= 9 days, and a bounded prefix-start → manifest-completion interval.
- The first stricter run correctly failed because exact prefix/manifest second equality was an invalid assumption: the prefix is captured before dumps while the manifest is created afterward. The invariant was corrected to require a nonnegative <=30-minute dump window.
- Run 36449290932 then passed end to end against latest backup `supabase/2026/09/27/20260927T004033Z`, originating from backup run 36283198880. At verification time it was about 1 day 15.5 hours old.
- That backup restored into disposable local Supabase and the restored `study_catalog`, `study_sessions`, `study_attempts` and `study_bookmarks` data matched the dump exactly with RLS present.
- No live database was mutated by the recovery drill.
- Full recovery is scheduled monthly at 00:30 UTC on day 1 plus manual dispatch, while backups remain weekly. This preserves current evidence without burning weekly Actions minutes on a Docker/Supabase restore.
- Current Supabase security advisor has one actionable Auth warning: leaked-password protection is disabled. The numerous RLS/no-policy notices remain informational only for intentionally service-only tables and require continued grant-boundary discipline.
- M14 is now IN PROGRESS. Next gates are Auth hardening, consolidated runtime/alert evidence, explicit Render service-health audit after workspace selection, and production-shaped capacity/load evidence.

## M14 service-boundary privilege drift guard — 2026-09-28
- Audited every current RLS-enabled public table with zero policies. All 25 are inaccessible to both `anon` and ordinary `authenticated` for SELECT/INSERT/UPDATE/DELETE.
- Audited all public `SECURITY DEFINER` functions. None are executable by `anon` or ordinary `authenticated`.
- A broader public-function audit found one residual default grant: trigger-only `block_content_review_measurement_mutation()` was directly executable by browser roles. It was not used by the browser application and is not a normal RPC, but it violated the intended service-only boundary.
- Migration `20260928164037_m14_revoke_trigger_function_browser_execute.sql` revokes that direct browser execution and retains backend service execution.
- Post-fix live proof: 25 service-only RLS/no-policy tables, 68 SECURITY DEFINER functions and **0 browser-executable functions in the public schema**.
- Added `supabase/verification/service-boundary-audit.sql`. It fails if an RLS/no-policy table gains browser DML access or if any public function becomes browser-executable.
- The existing weekly Supabase→R2 backup now runs this live audit before creating a dump, so privilege drift blocks backup/release evidence instead of becoming silent configuration debt.
- The audit step installs `postgresql-client` only when `psql` is absent, avoiding runner-image assumptions.
- Remaining Supabase Auth warning: leaked-password protection is disabled. The connected Supabase tools expose the advisor but not an Auth-config write operation, so that dashboard/control-plane setting remains externally gated.

## Google OAuth learner entry — 2026-09-28
- Google was added as a Supabase Auth provider by the project owner.
- Before app wiring, the live Auth schema contained 0 Google identities/users and 3 email identities; provider configuration had therefore not yet been exercised by a learner.
- The existing custom Auth adapter now generates a provider-scoped hosted Supabase OAuth authorize URL for Google only.
- OAuth return URLs are restricted to HTTPS, except localhost/127.0.0.1 HTTP during development.
- No Google client secret, operator credential or provider access token is added to browser storage or application data.
- Google and email/password both resolve to the same canonical Supabase Auth user UUID. No second account/learner mapping layer was introduced.
- The account page now exposes `Continue with Google` while preserving email/password as an alternative.
- The existing callback path remains authoritative: returned Supabase access tokens are checked against `/auth/v1/user` before session persistence, then token-bearing fragments are scrubbed from browser history.
- Unit/browser coverage verifies provider scoping, redirect validation, no client-secret parameters, and correct hosted authorize URL construction.
- A temporary branch-only live smoke verifies the hosted Auth service reports Google enabled; the workflow will be removed before merge.


## Google OAuth live learner proof + Study Now resume clarification — 2026-09-28
- A real Google OAuth sign-in completed against the hosted learner account path. Live Auth now has one Google identity in addition to the existing email identities.
- The Google identity linked to the learner's existing Supabase Auth user rather than creating a duplicate learner. The canonical learner UUID therefore remained stable across email/password and Google provider entry.
- The learner then selected a 10-minute Study Now window through the real browser/JWT path.
- Study Now correctly found an older unfinished session. That session already had a persisted answer receipt, so the browser restored the previously selected/correct option and explanation instead of accepting a duplicate answer.
- The learner finished that session through the authenticated browser path; live state now shows zero open sessions for that learner.
- This proves real Google OAuth → authenticated Study Now start/resume → authenticated session completion transport. It does **not** yet prove a fresh Study Now recommendation → fresh browser answer → revision-reschedule cycle, so M05c remains IN PROGRESS.
- The resume behavior was technically correct but visually ambiguous. The learner UI now explicitly announces when Study Now resumed an unfinished session, and distinguishes the case where the current question had already been answered.
- Responsive browser verification now includes the answered-session resume state and asserts that the saved option is visibly checked/disabled rather than presented as a new unanswered item.


## M08b first genuine historical evidence pilot — 2026-09-28
- The prior M08b model exposed a provenance trap: recalled historical evidence could only attach to a learner question version. The available CPR learner versions are explicitly grounded in 2025 AHA guidance, so attaching the May 2023 INI-CET recall to those versions would have created misleading temporal provenance.
- Migration `20260928180541_m08b_historical_exam_item_evidence.sql` adds a separate append-only/retractable `historical_exam_item_events` ledger. Reconstructed historical items store a nonverbatim summary plus canonical concept links; they do not store recalled stems, options or answer keys.
- Added verified occurrence `ini-cet:2023-07`. The official AIIMS July-2023 notice identifies the written CBT date as 07 May 2023; occurrence verification does not claim official question wording.
- First live item: `ini-cet:2023-07:recall:cpr-quality@1`, evidence event `cc7a15b5-97fb-40cf-b743-db3e92061308`.
- The item maps to three existing canonical concepts: adult compression depth 5–6 cm, compression rate 100–120/min and 30:2 compression-to-ventilation ratio.
- PrepLadder, ReflexPrep and Oncourse AI publicly reproduce the same CPR recall pattern. Because their upstream recall independence is unknown, the event is deliberately classified `single_recall`, not `corroborated_recall`.
- Historical medical plausibility was checked against the official 2020 AHA CPR/ECC highlights; this validates the medical facts for that era, not the existence or exact wording of the recalled exam item.
- Exam DNA is now contract `exam-dna-observation-v2`. Live INI-CET projection: 1 active assertion, 1 historical item, 1 occurrence, 0 exact learner question versions, 1 single-recall item, 0 corroborated items, with explicit `recall-source-lineage-unverified` and sparse/single-occurrence uncertainty.
- The new table and all historical-item RPC/helper functions are inaccessible to `anon` and ordinary `authenticated` roles. Service-role read/write boundaries are preserved.
- Post-migration security advisor adds only the expected RLS-without-policy INFO for this service-only table. No new unindexed-FK finding was introduced. The pre-existing leaked-password-protection Auth warning remains unchanged.
- M08b remains IN PROGRESS. The next authority signal is breadth across real exam occurrences/years, not more schema: ingest additional defensible NEET-PG/INI-CET historical items while preserving recall-lineage uncertainty and avoiding copied PYQ text.


## M08b minimum historical baseline closed — 2026-09-29
- The user explicitly chose a minimum-sufficient ingestion strategy rather than building a large PYQ corpus before downstream product work needs it.
- Added verified occurrence `neet-pg:2024`. The official NBEMS revised-schedule notice dated 05 July 2024 states that NEET-PG 2024 was conducted on 11 August 2024 in two shifts. The occurrence record does not claim an exact shift for the recalled item.
- Added live historical item `neet-pg:2024:recall:acute-angle-closure@1`, evidence event `206959d0-be1f-4dd5-9641-cc928f307a96`.
- The item stores only a nonverbatim reconstruction: acute eye pain/visual difficulty after a dark environment with recognition and emergency pressure-lowering management of acute angle-closure glaucoma. No recalled stem, options, image or answer key is stored.
- It maps to existing canonical concepts `ophthal:glaucoma:angle-closure-emergency` and `ophthal:glaucoma:treatment-modalities`.
- Oncourse AI, a Scribd recall compilation and an Adda247 recall paper contain the same broad fact pattern, but their upstream recall independence and exact shift attribution are not established. The event therefore remains `single_recall` with `sourceLineageStatus=unknown`.
- Historical medical plausibility was checked against the American Academy of Ophthalmology 2020 Primary Angle-Closure Disease Preferred Practice Pattern, which treats acute angle-closure crisis as an urgent symptomatic high-IOP state requiring medical IOP reduction followed by definitive iridotomy.
- Live Exam DNA baseline now contains **2 active historical assertions / 2 historical items / 2 verified exam occurrences / 2 exams / 2 years**: INI-CET 2023 and NEET-PG 2024. Both are single-recall evidence; no false corroboration or frequency inference is claimed.
- This is the deliberate M08b stopping point. Bulk PYQ ingestion is not required for the next implementation steps and will resume only when a concrete Exam DNA analysis, validation experiment or learner-facing recommendation policy requires additional breadth.
- M08b is now DONE at the minimum genuine-evidence baseline. With M08a/M08c/M08d already done, M08 is DONE.


## M11a delayed retrieval measurement foundation — 2026-09-29
- M11 has started because delayed-outcome evidence is the current cross-system bottleneck for M05d scheduler validation and M07c Digital Twin inference.
- Live migration `20260928192031_m11a_delayed_retrieval_observation_projection.sql` adds service-only `study_delayed_retrieval_observations_v1(learner)`.
- The projection is rebuildable from existing immutable attempts plus optional memory ratings, Study Now recommendation receipts and schedule-policy decision events; it writes no new learner evidence.
- Each origin attempt is linked to the first later retrieval of the same exact question version with exact elapsed milliseconds, correctness and response time.
- The same origin also exposes the first later different-question attempt sharing the canonical concept as a transfer candidate, plus the number of intervening same-item attempts. Transfer is not asserted merely from concept identity.
- Summary coverage reports observed same-item follow-ups at or beyond 1/7/30/90/180 days. These are coverage counts only, never retention probabilities.
- Live beta proof for the most active learner currently shows 3 origin attempts, 2 later same-item retrievals, 2 explicitly rated origins, 0 transfer candidates and **0 follow-ups at ≥1 day**. The observed gaps were approximately 13.18 hours and 8.6 minutes.
- That zero delayed coverage is an important result: current data are insufficient to validate a forgetting model, FSRS authority or inferred mastery. M05d and M07c therefore remain correctly gated.
- Browser roles cannot execute the projection; `service_role` can. No new table, RLS policy or learner-facing authority was added.
- Supabase security advisors show no new warning from M11a. The existing leaked-password-protection warning remains the only actionable Auth warning.
- M11a is DONE. The next research step is a preregistered retention-probe/analysis protocol or naturally accumulated delayed evidence, not synthetic backfilling.


## M11b0 retention-probe readiness gate — 2026-09-29
- Live migration `20260928193141_m11b_retention_probe_readiness.sql` adds service-only `study_retention_probe_readiness_v1()`.
- The readiness projection distinguishes question identity from question version. Two versions of the same question never count as an alternate item.
- It audits published primary concepts, distinct published questions, structurally possible alternate-item pairs, and in-review alternates that target an already-published primary concept.
- Current live catalog: **6 published question versions, 6 distinct published question identities, 6 published primary concepts, 0 concepts with a published alternate, 0 published alternate-item pairs, and 0 in-review alternate candidates on those published concepts**.
- Therefore a real alternate-item retention probe is structurally blocked. The system explicitly returns `canActivateAlternateItemProbe=false`.
- The blocker is content structure, not missing scheduler code. No Study Now change or same-item early resurfacing was introduced.
- Any future alternate probe item must pass the existing Medical, References and Rights review gates before publication. The retention protocol/horizons must then be preregistered before the first assignment.
- Browser roles cannot execute the readiness projection; `service_role` can. The function is read-only and creates no learner evidence.
- Supabase security advisors show no new warning from this change. The pre-existing leaked-password-protection warning remains unchanged.
- M11b is now IN PROGRESS. M11b0 readiness is DONE; protocol activation remains correctly gated by reviewed alternate-item content.

## Connected-learning pilot 08 — 2026-09-29

- Reconciled the latest user request for gap-sized notes/concepts against current main `56f9696`, live catalog v35 and M11b0 readiness. Retrieved chat summaries did not include the full latest normal-chat transcript; no full-chat audit is claimed.
- Added **2 original alternate-question candidates** to existing anaphylaxis and rabies wound-washing concepts; added **2 original rabies note candidates** for wound washing and category-III passive prophylaxis. Reused the existing published anaphylaxis note without modification. No new concept copies or forced 19-subject clinical mappings.
- Batch `connected-learning-08` / `5f83cfc8-a3ed-41fa-9805-dfa539cefc42` passed live structural/exact-dedup validation and lexical overlap preflight (threshold 0.55, zero flags; this is not semantic equivalence/novelty validation). Promoted through the existing service-only intake function, catalog **v35 → v36**.
- Live catalog now has **182 questions, 6 published**. The two new questions are `in_review`, with zero review records. The 180-item internal-test inventory was not expanded by AI-test approvals.
- WHO Rabies guidance dated **2026-09-17** was directly checked and registered as `who:rabies-fact-sheet:2026-09-17`, rights **unknown**. Existing CDC narrative guidance was checked for the no-rash anaphylaxis scenario. NRCP fetches failed; existing NRCP content was not altered or claimed freshly reverified.
- Created notes through `neural_create_canonical_note_draft` with explicit `ai_generated_original` provenance and the existing AI-draft author principal, then submitted through the existing lifecycle. Wound note v1: `e376bc26-0592-49ac-af04-d407a435de58`; category-III note v1: `5488e1b3-aa63-47cd-91cc-dcefb51a0d2b`. Both are **in_review**, with zero review events. The existing published note remains v1 (`6ac9305b-2ce1-4fdb-9705-fa22c8eefa12`).
- Read-only live verification confirms **2 pending alternates on 2 published concepts**, **0 published alternate pairs**, `canActivateAlternateItemProbe=false`, and no automatic publication or probe scheduling. No learner history was written.
- Added dependency-free `content-connections-authoring-v1`, an authoring projection and command-line audit, plus **9 regression tests**. Tests distinguish primary versus secondary links, one-to-one/one-to-many/note-only cases, question identity versus revision, invalid anchors/provenance, retired content and synthetic 19-subject topology. They run in the existing PR/main CI via `npm test`; they do not establish clinical coverage of all 19 subjects.
- Local verification: **603 tests pass**, `npm run check`, `npm run demo`, the connection-audit command and `git diff --check` pass. No dependency, schema, privileged API, paid provider, scheduled job or recurring infrastructure cost was added.
- Hosted browser: Render homepage and Cloud Account sign-in page loaded. This browser has **no authenticated learner session**. No private account state, answering, annotations, or fresh Study Now → revision/reschedule acceptance is claimed. Existing browser CI remains the isolated regression path; no UI code changed in this slice.
- Next: independent Medical/References/Rights review and separate publication of the pilot; then preregister/evaluate alternate-item protocol suitability. The authenticated fresh Study Now browser gate also remains open. See `CONNECTED_LEARNING_PILOT.md` and `supabase/verification/connected-learning-pilot.sql`.


## Human-review bottleneck reduction — 2026-09-29
- The remaining connected-learning gate was not missing medical content or reviewer authorization; it was repetitive review mechanics. Live state before this slice had 176 in-review questions and 176 pending decisions in each of Medical, References and Rights, while the M02c References experiment still had zero measured human decisions.
- Added service-only `record_full_question_review_bundle`. For an exact unreviewed question, one reviewer who currently holds all three grants can make one explicit full-target attestation with separate Medical/References/Rights notes. The database then calls the existing canonical `record_content_review` path three times in one transaction, preserving three independent immutable target hashes/receipts. It never publishes.
- The shortcut appears only when the exact question has zero prior review events, all three grants are active, source rights are already valid and complete review-assist drafts exist. If any gate is not approvable, the existing individual reject path remains available.
- The connected-learning anaphylaxis alternate `emergency:anaphylaxis:no-rash-first-action@1` is the minimal downstream unlock candidate because its CDC source already has current citation-only rights evidence. Its Medical/References/Rights preflight now includes editable draft notes, but no human approval has been fabricated.
- Added M02c References workflow v2: each matched seven-question arm is reviewed in one human session. The reviewer still selects approve/reject and retains an editable note for every item, then one attestation atomically records all seven canonical References receipts plus one batch timing record. A failure or target drift rolls back the whole batch.
- The old v1 measurement history remains intact. V2 changes submission mechanics, not the treatment/comparator source identities or review authority.
- Both new mutation functions are service-only; reviewer identity remains derived from authenticated JWT at the review API. Browser payloads never contain reviewer UUID.
- Actual production review remains human authority. These changes reduce navigation/submission overhead; they do not let AI/source preflight become a reviewer.


## Learner correction + reviewer triage live parity — 2026-09-29
- PR #131 (`feat: add learner-private correction overlays`) is merged. Its Foundation checks passed both the full check/test/demo job and the focused responsive browser correction flow.
- Live Supabase migration history includes `m06d_personal_correction_overlay`, privacy scope v3 and `m02d_learner_report_triage`.
- `study-api` was redeployed from current main as **v38** with its existing `verify_jwt=false` configuration preserved because request authentication is enforced inside the function. The deployed `index.ts` is byte-for-byte identical to current main.
- `review-api` is live as **v14** and its deployed `index.ts` is byte-for-byte identical to current main. Learner-report triage routes/evidence are present there.
- Privacy scope v3 remains complete and explicitly covers `learner_content_issue_reports`; normal report evidence is append-only while privacy erasure retains its narrow transaction-scoped delete exception.
- No learner report exists yet in live production, so no human triage decision has been fabricated. M02d remains IN PROGRESS until one real learner report → authorized human triage lifecycle is observed.
- M06d likewise remains IN PROGRESS until one real authenticated hosted learner performs private correction → refresh persistence and optional report submission while canonical content remains unchanged.


## M11b1 preregistered retention-probe feasibility protocol — 2026-09-29
- The connected-learning anaphylaxis alternate `emergency:anaphylaxis:no-rash-first-action@1` had three current human approvals (Medical, References, Rights) and passed a rollback publication smoke through the existing server-only publication gate.
- It was then separately published. Live catalog readiness is now **7 published question versions / 7 distinct question identities / 6 primary concepts / 1 published alternate-item pair**.
- The structural blocker `no-published-alternate-item-pair` is therefore removed.
- Live migration `20260928224239_m11b1_retention_probe_preregistration` adds immutable service-only protocol registry `study_retention_probe_protocols`, preregisters `retention-probe-feasibility-v1`, and exposes read-only protocol/activation-readiness functions.
- Protocol SHA-256: `3877a0083b95481911966d2109c395f03065c7fc62381df29e4a809311ff19c9`.
- Fixed feasibility choices before any assignment: 7-day target, 6–8 day window, max 1 probe/learner/7 days, max 20 total assignments, max 56 days from first assignment, no displacement of due/mistake-repair work, explicit learner opt-in required.
- Clean descriptive analysis excludes observed same-concept contamination or prior target exposure. Outside-platform exposure remains potentially unobserved.
- Primary endpoint is alternate-item correctness inside the 6–8 day window. Response time, optional memory rating, window completion, contamination and transport failure are secondary descriptive outcomes.
- No causal claim, hypothesis-testing claim, mastery/forgetting inference or model fitting is authorized.
- Activation remains **false**. Current blockers are validated alternate-pair novelty/comparability metadata, learner opt-in path, and separate activation authorization.
- Supabase security advisor added only the expected service-only RLS/no-policy INFO for the new protocol table; leaked-password protection remains the single actionable Auth WARN.


## M11c exact-pair transfer validation foundation — 2026-09-29
- Resumed from merged PR #135 / M11b1 rather than restarting the earlier content-review pilot. The next bounded research task was M11c.
- Live migration `20260929030036_m11c_transfer_pair_validation` adds immutable, service-only exact-version pair validation plus current Medical-target SHA binding, stale-validation detection and `study_validated_transfer_observations_v1(learner)`.
- Live migration `20260929030109_m11c_transfer_pair_validator_index` adds the covering validator foreign-key index identified by the post-migration performance advisor.
- Live migration `20260929030652_m11c_refresh_structural_readiness` removes the obsolete nested `protocol-not-preregistered` blocker from the content-only readiness projection; protocol and activation state now live only in their dedicated layers.
- Pair validation records surface novelty, primary-construct alignment, reasoning alignment, difficulty comparability and cue-overlap risk. Generic descriptive transfer validity and stricter retention-probe comparability remain separate decisions.
- Bootstrap validation authority requires one human who currently holds Medical, References and Rights reviewer grants; authors cannot validate their own pair. No dedicated research-role system was added.
- A clean validated-transfer observation additionally requires no prior target-item attempt and no intervening same-concept attempt. Outside-platform exposure remains potentially unobserved.
- Browser roles cannot SELECT the pair table or execute the record/readiness/validated-transfer RPCs; service role access passed live privilege checks.
- Live pair readiness is intentionally **0 total validations / 0 current transfer-valid pairs / 0 retention-probe-comparable pairs**. No human pair judgment was fabricated.
- Retention-probe activation remains **false**. Current blockers are validated pair metadata, learner opt-in, and separate activation authorization. Study Now, FSRS authority, mastery/forgetting inference and causal claims remain disabled.
- Post-migration security advisor shows only the expected service-only RLS/no-policy INFO for the new table plus the pre-existing leaked-password-protection WARN. No new security WARN was introduced.
- The SQL passed a live rollback compile before promotion. Repository tests/CI are added in the M11c PR; the first persistent pair decision remains a separate human-review step.


## 2026-09-29 — Beta product UI + singleton content admin

- Retired the M03 local demo from the root application surface; root now opens the authenticated beta Preparation Command Center.
- Beta learner navigation is Home / Study / Exams / Vault / Account. Admin appears only after server-side admin confirmation.
- Added a singleton `content_admin_account` governance layer. Live preflight found exactly one active reviewer and that account already holds all three Medical / References / Rights grants, so no authority migration is required.
- Review API now resolves admin authority server-side before returning review grants or queues.
- Added Admin Console for content governance and M11c transfer/retention pair validation.
- Learners retain issue-reporting and personal correction paths but receive no approval controls.
- Removed demo modules from the served public allowlist.
- Study Now home links can deep-link into 10/20/30/60-minute authenticated sessions.
- No retention probe is activated by this change; learner opt-in and separate activation authorization remain required.


## 2026-09-29 — M11d retention-feasibility learner opt-in path

- Added append-only `study_retention_probe_consent_events`.
- Consent is bound to the exact preregistered protocol ID + SHA-256 and comes only from the JWT-derived learner identity through `study-api`.
- Added explicit opt-in and withdrawal UI to Account with the 7-day horizon and burden caps visible before opt-in.
- Repeating the same current decision is idempotent; withdrawal is a new immutable event.
- Browser roles cannot read/write the consent ledger or execute consent RPCs directly.
- System activation readiness now recognizes that an opt-in path exists, but `canActivate=false` and `probeSchedulingEnabled=false` remain hard-coded.
- No learner has been auto-enrolled by this implementation.


## 2026-09-29 — Unified verified-email authentication
- Confirmed live Auth has zero duplicate-email user groups.
- Confirmed an existing account already carries both email and Google identities under one Supabase user, validating Supabase automatic same-email linking in the live project.
- Account UI now explains that Google and email/password are sign-in methods on one learner account.
- Auth session normalization retains provider names only, not OAuth identity payloads or tokens.
- Google-first accounts can add password sign-in while authenticated without creating or migrating learner data.
- Password-only accounts are told that later Google sign-in with the same verified email auto-links to the same learner ID.


## 2026-09-29 — Same-account password recovery
- Added password recovery request from the signed-out Account surface.
- Recovery response is intentionally generic to avoid account enumeration.
- Recovery callback type is preserved by the auth adapter.
- A verified recovery session can set a new password through the existing authenticated user update path.
- Password recovery keeps the same Supabase user ID and therefore the same learner history.
- No separate learner record or merge workflow is introduced.


## 2026-09-29 — M11e admin research gate
- Admin transfer-pair queue now includes the canonical `study_retention_probe_activation_readiness_v1()` result.
- The admin UI promotes the currently blocking human pair validation instead of presenting all research work as equivalent.
- Readiness automatically advances from the canonical backend state after a genuine immutable pair-validation event.
- Separate activation authorization is displayed as a later gate but no activation endpoint, button or scheduler authority exists.
- This slice does not fabricate human review, activate probes, alter Study Now or create mastery/forgetting inference.


## 2026-09-29 — M11c human review packet
- The blocking transfer-pair admin surface now includes a compact evidence packet for each exact question version.
- Packet fields are descriptive only: source title/version, source rights status, provenance kind, change reason and existing Medical/References/Rights decisions.
- The packet intentionally does not preselect novelty, construct alignment, reasoning alignment, difficulty comparability, cue-overlap risk or retention-probe comparability.
- Human attestation remains required for the immutable pair decision; activation authority remains absent.


## 2026-09-29 — M11f1 activation-authorization governance
- Added append-only authorize/revoke evidence for retention-feasibility activation governance.
- Authorization is bound to the exact preregistered protocol SHA-256 and exact immutable pair-validation SHA-256.
- Only the singleton content admin may authorize or revoke; reviewer identity is derived server-side.
- Authorization refuses unless the pair is still published/current and human-validated as retention-probe comparable.
- At least one learner must currently be opted in before authorization can be issued.
- Assignment caps cannot exceed the preregistered protocol, and authorization validity cannot exceed 56 days.
- Revocation remains possible even if later eligibility deteriorates.
- Probe scheduling, Study Now authority and mastery/forgetting inference remain disabled.


## 2026-09-29 — M11f2 dormant probe scheduler kernel
- Added immutable learner-scoped `study_retention_probe_assignments`.
- Added service-only candidate selection and one-at-a-time scheduler tick functions; no cron or browser/Admin execution route exists.
- Candidate origin attempts must occur after both learner opt-in and activation authorization, keeping the feasibility pilot prospective rather than retrospectively enrolling old learning.
- Scheduler enforces the preregistered day 6–8 window, no prior target attempt, no intervening same-concept attempt, protocol/authorization caps, max one probe per learner per rolling 7 days and the 56-day feasibility horizon.
- Probe work is blocked while any overdue revision, unresolved latest-incorrect item or open Study Now session exists.
- Added delivery-readiness recheck for consent, current authorization, pair/content freshness, timing window, target exposure, contamination and workload priority immediately before any future learner exposure.
- Automatic execution remains disabled and there is still no learner delivery surface.
- Privacy scope advances to v5 and includes scheduled probe assignments in preview, erasure and residue verification.


## 2026-09-29 — M11f3 delivery-evidence kernel
- Added append-only learner-scoped `study_retention_probe_served_events` and `study_retention_probe_response_bindings`.
- Assignment, server-served delivery and answered-response evidence are now distinct states.
- Server-served receipts bind the exact learner-safe question payload, payload SHA-256, catalog version and current medical-content SHA-256.
- Idempotent replays return the exact originally served payload instead of reconstructing from a possibly changed catalog.
- “Server served” explicitly does **not** claim learner render, learner view or cognitive exposure.
- Response binding requires the exact target question and a server-timestamped answer after serve; out-of-window or intervening same-concept activity is preserved as contamination metadata rather than erased.
- Added `study_learning_event_stream_v2()` with research assignment, server-served and response-binding families while retaining zero mastery/forgetting inference authority.
- Privacy scope advances to v6 with served + response evidence covered by preview, erasure and residue verification.
- Learner delivery route, render acknowledgement and automatic execution remain disabled.


## 2026-09-29 — M11g descriptive feasibility analysis
- Added service-only `study_retention_probe_feasibility_report_v1()`.
- The report keeps assignment, server-served, response and clean-response counts separate and exposes funnel rates only when denominators exist.
- The preregistered primary outcome is reported as descriptive clean accuracy only; the current zero-evidence baseline returns `null`, not 0% or another fabricated estimate.
- Secondary outputs include response timing, optional memory-rating summaries, observed contamination rate/reasons, expired unserved assignments and expired served-without-response counts.
- Transport failure remains `null` / unavailable because nonresponse alone cannot distinguish technical failure from non-view or learner choice.
- Pair-level results retain exact validation SHA, concept, origin version and target version.
- Admin now receives the report in the canonical research gate under **FEASIBILITY EVIDENCE · DESCRIPTIVE ONLY**.
- No causal inference, hypothesis testing, mastery fitting, forgetting fitting, activation authority or learner-facing analytics are introduced.


## 2026-09-30 — M05c Study Now completion-integrity gate
- Live preflight found 3 learner accounts, 7 published questions, 10 attempts, 7 revision rows, 2 Study Now recommendations and 2 real memory ratings.
- One historical Study Now recommendation already has a complete server evidence chain: selected item attempted, session closed and authoritative schedule-decision evidence present. It predates browser-transport instrumentation, so it is not retroactively labeled a hosted-browser proof.
- A second live recommendation is currently open at 4/6 answered; all four answered items already have authoritative schedule-decision evidence. Two selected items remain unanswered.
- Added append-only `study_recommendation_transport_events`, recorded only for newly persisted attempts in Study Now recommendation sessions.
- Transport class is derived inside `study-api` from allowed Origin + `Sec-Fetch-Mode`; stored values are only `hosted-browser-cors`, `local-browser-cors` or `authenticated-api`. No user-agent, IP address, exact origin or device fingerprint is persisted.
- Idempotent answer retries cannot manufacture a browser proof because transport evidence is written only when the returned attempt event ID matches the newly proposed server event ID.
- Added service-only `study_now_completion_integrity_v1(learner)`. M05c hosted completion requires session closed + every selected item attempted + an authoritative schedule decision for every selected attempt + at least one newly persisted hosted-browser answer.
- Memory rating is explicitly optional for M05c completion and remains separate evidence for M05d.
- Learner UI reads the authenticated integrity projection after session close and can display whether the Study Now loop is fully linked.
- Privacy scope advances to v7 and includes Study Now transport evidence in inventory, preview, deletion and residue verification.
- Live-schema BEGIN/ROLLBACK verification reports privacy scope complete with zero unmapped learner tables. No production transport evidence has been fabricated.


## 2026-09-30 — M05d Memory Engine evidence-readiness
- Added service-only `study_memory_engine_evidence_readiness_v1()`; it is read-only and has no scheduler, experiment-arm, production-promotion or mastery-inference authority.
- Live evidence snapshot: 3 learners, 10 attempts, 2 explicit memory ratings, 20% rating coverage, 1 rated learner-question history, 0 fully-rated learner-question histories, 3 same-item follow-ups, 0 same-item follow-ups at or beyond 1/7/30/90/180 days.
- There are 9 authoritative bootstrap schedule decisions but 0 paired authoritative + FSRS-shadow decisions, so no learner is currently eligible under the draft paired-scheduler experiment contract.
- `scheduler-bootstrap-vs-fsrs-v1@1` remains draft, with `minimumEligibleLearners=null`, metric contract status `draft`, `canArm=false` and assignments disabled.
- Rating timing is exposed descriptively (mean/median/max lag) but no eligibility cutoff is invented. A timing rule must be preregistered before ratings are used for an experiment claim.
- The canonical blockers explicitly include missing preregistered population/metric thresholds, no fully-rated history, no paired shadow decisions and no ≥1-day/≥7-day delayed retrieval.
- Next evidence action is prospective collection, not FSRS promotion. Numeric thresholds are intentionally not invented from the current tiny sample.


## 2026-09-30 — confirmed study writes survive projection outages
- Continued the latest Task 1 checkpoint (M05c/M05d); PRs #148/#149 are already merged. Current repository also includes the separate Admin Plugin PRs #150/#151.
- Found and fixed a learner continuity defect: after `cloud.answer` acknowledged a canonical receipt, a failed `cloud.progress` read incorrectly reported that the answer was not confirmed. After `cloud.next` acknowledged closure, the same projection failure incorrectly reported that the session did not advance and skipped integrity reconciliation.
- Progress refresh after these writes now has its own failure boundary. Confirmed receipts/cursors remain authoritative, optional memory ratings and Next remain available, and completion integrity is still requested when progress is unavailable. Actual write failures retain the existing idempotent retry behavior.
- Added five executable UI-controller regression tests with synthetic in-memory adapter responses. They check accepted-answer recovery, optional rating continuity, completion/integrity reconciliation, unavailable projections, and genuine answer/advance failures. These tests write no learner data and do not manufacture browser or retention evidence.
- Verification: all 795 tests pass with loopback networking enabled for the existing HTTP test; `npm run check` and `git diff --check` pass. The initial restricted run hit `listen EPERM` in the existing HTTP test. No layout changes were made. Authenticated phone/tablet/desktop persistence acceptance is still unverified.
- Hosted browser reached the real Account sign-in page and is not authenticated in this session. No answer, recall rating, human-review approval or production evidence was submitted. The previous 4/6 recommendation checkpoint has not been independently refreshed.
- Next: authenticated hosted acceptance on an explicitly designated QA learner; keep automated transport testing separate from genuine learner recall/retention evidence. M05c remains open until its hosted completion gate is verified; M05d stays evidence-gated and FSRS shadow-only.

- Hosted authentication follow-up: secure Google sign-in reached passkey verification, then Google returned “Something went wrong” with Bluetooth/device-proximity guidance. No authenticated MLOS state or learner writes were observed. PR #152 is open and GitHub Foundation checks passed; it remains unmerged.


## 2026-09-30 — hosted resume and stale-notice correction
- Secure email/password sign-in succeeded in the hosted browser. Account UI showed 7 recorded attempts, 6 correct and 7 published questions. Study Now resumed the existing six-item session at the saved answered fourth item; an acknowledged Next transition opened unanswered Question 5.
- Completion check still shows Question 5 of 6 with a selected but unsubmitted option. The session has not finished. Automatic approval review rejected the attempted submission because the prior handoff reserved Questions 5–6 for the user. No new answer or memory rating was persisted by this continuation.
- Fixed a stale resume notice that said the new unanswered question had been answered earlier: acknowledged advancement now clears notices associated with the previous cursor. Genuine transition failures keep their retry message, and completion projection failures can still display their own notice.
- Verification: six controller regressions and the full 796-test suite pass; npm run check and git diff --check pass. Hosted observation proves resume/advance persistence, not completion or revision integrity. The new notice fix is not yet deployed or verified across device sizes.
- PR #152 remains open/unmerged. Next: user submits the last two answers and finishes; then verify hosted completion integrity without inventing recall ratings or delayed-retention evidence.


## 2026-09-30 — learner Chrome completion verified; Aperture session summary
- The learner reported submitting in Chrome. A refreshed hosted account showed 10 saved attempts and 8 correct. Read-only production completion integrity independently verifies the original recommendation `84fca121-3bc0-49e5-a37e-f783b6a350b4`: selected 6, attempted 6, closed, authoritative schedules 6, hosted-browser receipts 2, complete evidence chain and hosted M05c gate true with no blockers. The subsequent one-item mistake-repair recommendation `dcd58a41-0e2f-46de-8033-33d2a0fd5fba` is also closed with its authoritative schedule and hosted gate satisfied. No answer or rating was submitted by this verification. M05c is DONE; M05d remains evidence-gated and FSRS remains shadow-only.
- Implemented the next Aperture step: an owned-session read-only results contract, session-local answered/correct/incorrect counts, canonical NeuralVault links for concepts answered incorrectly, and current next-review timing. Accuracy is explicitly not mastery. Missing schedule reads preserve results and show timing unavailable. No schema or production evidence changes.
- Completion URLs restore results on reload. Unowned/unavailable restore cannot claim confirmed completion; acknowledged closure survives summary-read failure with a read-only retry.
- Verification: 803 tests pass; npm run check and git diff --check pass. The isolated browser suite passes, including phone (390px), tablet (820px) and desktop (1440px) summary reload persistence, no horizontal overflow, Study Now completion, singleton-admin boundaries and private-file denial. Fixtures create no production evidence.
- Release requires the frontend plus study-api endpoint; this feature is stacked on unmerged PR #152 and has not been deployed. Next: merge the prerequisite and summary changes after review, deploy both surfaces, and observe an existing owned summary without creating new learner evidence.


## 2026-09-30 — Aperture summary released and hosted acceptance verified
- User continued the stated merge/release step. Reviewed the two changes and successful GitHub Foundation runs, then merged prerequisite PR #152 at `983db71f8831b5867c4338e01e4bc1d3ecbffdec`, retargeted #153 to main, and merged the summary at `a642110f34bfae4c734e9e61cf050a271b07fc9a`. The merge tree exactly matches the tested feature tree. Main's Foundation checks also pass.
- Deployed `study-api` v41 in the dedicated Medical Learning OS Supabase project. All six deployed bundle files match the merged source. The prior v40 entrypoint matches the merged code with only the summary import/route removed; existing dependency files are unchanged. Preserved existing `verify_jwt=false` because the function authenticates bearer tokens via server-side `auth.getUser()` before all routes. Unauthenticated summary GET returns 401/unauthorized. No migration, grants, new infrastructure or recurring-cost configuration changes.
- Render's existing automatic deployment serves byte-identical merged `web/medical.js` and `src/adapters/cloud-study.js`. Manual Render controls were unavailable because the connector requires an explicitly confirmed workspace; no workspace was guessed or service configuration changed. Hosted delivery is verified directly; Render dashboard status/logs were not inspected.
- The existing authenticated learner's original completed summary visibly shows 6/6 answered, 4 correct, 2 incorrect; the rabies PEP schedule and first-line anaphylaxis concepts link to NeuralVault. It shows one session item due now under the current schedule. Reload restores the same summary and results. Captured the visible release result. No answer, memory rating or clinical-review event was submitted during acceptance.
- All 803 tests and full isolated browser checks passed before release; GitHub PR and main checks passed. Hosted observation now proves the actual summary read/reload path; responsive sizes were verified with synthetic data rather than claimed as three real devices. M05c remains DONE; M05d remains evidence-gated and FSRS stays shadow-only.
- Next best implementation: review the consolidated Aperture overview and due-review entry flow for a clear return from results to the learner's next scheduled action; collect genuine delayed retrieval prospectively rather than generating retention evidence through scripted answers.


## 2026-09-30 — Aperture UX priority and results-to-revision interface
- User requested continued UX/interface work as the ongoing focus. Recorded that preference and reconciled the retrieved Aperture direction with the existing five-destination learner navigation; detailed prior assistant proposals are not treated as new user decisions.
- Implemented a calmer Home hierarchy: one time-aware Study Now link, explicit selected duration, review schedule, compact learning snapshot and secondary Vault/Exams access. Duration is optional browser-only preference state; selecting it or reloading creates no session. Missing revision data shows an unknown count and an unavailable state; upcoming-only work offers ordinary Study browsing without early reviews.
- Session results now show evidence and next revision in a responsive layout, canonical concept links have larger touch targets, and “Plan my next session” is the primary read-only action back to Home's Study Now section. QBank browsing is secondary. Study overview puts revision before question inventory and removes several learner-facing implementation labels. Existing server policy, API/schema, answer persistence, ratings and content authority are unchanged.
- Verification: all 803 tests pass; npm run check and git diff --check pass. The isolated browser suite checks phone 390px/tablet 820px/desktop 1440px, duration selection/reload persistence, no session writes during selection or return, unavailable and upcoming-only schedules, results reload, final start/resume flow and existing admin/privacy boundaries. Inspected Home and results screenshots across the responsive layouts. Fixtures are synthetic and create no production evidence. Native Safari and real hosted UX acceptance remain unverified for this slice.
- The prior release-notes PR #154 passed checks and is merged. This new interface slice is on a focused feature branch for review and is not deployed. Preview screenshots use synthetic data.
- Next interface slice: make in-question feedback and concept handoff easier to scan, then unify the Study/Vault contextual navigation. Preserve one focused study action and topic-specific support rather than labeling learner ability.


## 2026-09-30 — Aperture answer feedback and reversible Vault handoff
- Continued the user's UX/interface priority with a focused question-feedback slice, stacked on pending Home/revision UX PR #155.
- Saved-answer feedback now separates the acknowledged result, selected/correct option labels, reasoning, source links, recommendation context and optional recall self-report. Native disclosure controls reduce competing detail, the saved result receives focus after acknowledgement, and Next/Finish remains available without a rating. Corrected an existing form-label cascade that prevented option rows from using their intended flex alignment. Canonical teaching guards and all source/medical content remain intact.
- Added a bounded internal session return from an answered question's canonical concept/correction link into Vault. The return reads the existing authenticated owned-session GET and restores the server's current cursor, receipt and memory judgment; it does not start, answer, rate or advance. Reload preserves the route. A session closed on another device reconciles to results, including safe summary-outage handling; unowned/unavailable reads render a retry state without stale question/answer content. Arbitrary return URLs are rejected.
- Verification: all 806 tests pass, npm run check and git diff --check pass. Existing study/admin/privacy and correction browser suites pass. Added a responsive feedback/handoff suite to the existing CI: 390/820/1440px layouts, post-answer focus and labels, disclosure behavior, no pre-answer feedback, Vault/reload/return persistence with no extra writes, second-device closure, failed ownership and invalid return URL. Inspected phone and desktop screenshots with nonclinical synthetic fixtures. No production learner event, rating, note or review was created.
- This slice changes frontend/controller presentation and read-only restoration only. No API/schema, scheduler, publication, auth configuration, dependency or infrastructure change. It is not merged or deployed; PR #155 must land first. Native Safari and real authenticated hosted acceptance remain pending.
- Next UX slice: simplify the Vault concept detail hierarchy and make its contextual navigation consistent with Study, while keeping personal notes/corrections separate from reviewed knowledge.


## 2026-09-30 — Aperture Vault reading hierarchy and contextual navigation
- Continued the user's UX/interface priority with a focused Vault slice stacked on pending feedback/handoff PR #156. The prior feedback PR has passed GitHub checks; pending interface PRs remain unmerged and undeployed.
- Vault now centers one canonical concept heading and its reviewed note, followed by My notes and My corrections. Read-only section links scroll and focus their headings; native disclosures keep published-version details, arrival context and optional canonical correction composition available without competing with reading. Exact question-version correction handoffs still expose their targeted composer. Home, Account and the bounded Study/session return stay accessible.
- The concept browser defaults closed on narrow screens and open in wider layouts. Concept selection closes the narrow-screen browser and focuses the selected concept; search and exact concept reload remain available. Missing reviewed content stays explicit. Canonical/personal text remains escaped, and populated edit fields receive stable accessible names. No clinical content, API/schema, backend, scheduling, publication, dependency or infrastructure change.
- Verification: all 806 tests pass; npm run check and git diff --check pass. Existing responsive Study/admin/privacy, feedback/session-return and correction/report-sharing browser suites pass. Added responsive Vault coverage to CI: 390/820/1440px reading hierarchy, section focus, browser disclosure, search and concept reload, missing-note state, text escaping, personal note create/reload/revision-safe edit/delete, and no automatic writes from reading/navigation/disclosures. Inspected phone/tablet/desktop screenshots with synthetic nonclinical fixtures. No production learner event, note, correction, rating or review was created. Native Safari and real authenticated hosted acceptance remain pending.
- Next UX slice: improve Study's session-entry and resume states so the learner can clearly distinguish continuing saved work, starting a session and browsing questions, while retaining one focused primary action.


## 2026-09-30 — Aperture Study entry and durable session reload
- Continued the user's UX/interface priority with a focused Study entry slice stacked on pending Vault PR #157. Prior interface slices remain unmerged and undeployed.
- Replaced four competing Study Now starts with one selected-duration action sharing Home's optional browser preference. The action honestly says Open because the server may resume unfinished work. A returned recommendation plan distinguishes new recommended sessions from continued saved work; ordinary QBank opening uses a neutral label because its API exposes no new/resumed flag. Question browsing stays read-only and secondary, with compact exam access and native disclosure for full-mock readiness. Added contextual Home/Vault/Account navigation and a Study-overview exit from the session.
- Both successful start paths retain a bounded session ID in the resume URL. Reload authenticates and reads the existing owned session directly, without requiring overview projections or replaying Start. Existing closure-to-summary, saved-answer/optional-rating restoration and failed-ownership behavior remain intact. Ordinary opening now ignores a duplicate invocation while busy. Failed starts retain explicit retry and cannot replay automatically on reload.
- Progress-read failure now displays unknown totals and permits successfully loaded questions; question-list read failure is a temporary outage rather than a fabricated empty catalog. Schedule outages/upcoming-only work still offer ordinary QBank browsing without early recommended reviews. No new session discovery API, browser evidence store, clinical content, backend/schema, scheduler, publication, dependency or infrastructure change.
- Verification: all 806 repository tests pass, npm run check and git diff --check pass. Existing Study/admin/privacy and feedback/Vault-return browser suites pass. Added responsive Study entry checks to existing CI: 390/820/1440px, one primary action, selected-duration persistence, read-only browsing, opening busy controls, new/resumed labels, successful recommended and ordinary Start followed by GET-only reload, saved-answer restore, second-device closure, progress/schedule/question outages, failed-start explicit retry and an empty recommendation window. Inspected synthetic phone/tablet/desktop previews. No production learner answer, rating, note or review was submitted. Native Safari and real authenticated hosted acceptance remain pending.
- Next best UX step: review the integrated Home → Study → Vault → results flow across the pending interface stack and align navigation/recovery states before release.


## 2026-09-30 — Integrated Aperture UX review and recovery fixes
- Reviewed pending PRs #155–#158 together against current main c7a0f85370b0657be6254015205e2923931f9a23. All four prior PRs are open, unmerged and passing CI; inspected the combined code paths and exercised the integrated learner journey rather than treating individual screen checks as whole-flow acceptance.
- Fixed six integration findings: completed-results concept detours now return to the same saved results; a question-loading outage offers a real Reload Study action; Home projection failures no longer suppress independent available study work/counts or reuse stale projection data on retry; late Vault reads cannot replace the latest selected concept; the completion label requires explicit summary confirmation of all selected answers; persistent Study messages have a keyboard-accessible Dismiss action that returns focus to feedback or the next result action. Ordinary question browsing now focuses the browser heading.
- Added the integrated journey to existing CI at 390/820/1440px: Home duration selection → one Start → reload → one accepted synthetic answer → Vault personal note save/reload → saved-answer return → one Finish → results → Vault detour → identical results → read-only next-session planning. The fixture records exactly Start/answer/note/advance writes and proves no rating, extra start, replayed answer or implicit advance on navigation/reload. Also exercises independent progress failure, question/schedule recovery, absent-browser safety, dismissal focus and reversed-order concept response handling. Inspected phone/tablet/desktop synthetic screenshots.
- Verification: all 806 repository tests, npm run check and git diff --check pass. Existing Study/admin/privacy, feedback/Vault-return, Study-entry and Vault note-persistence browser checks pass. Strengthened the closure-outage regression with a genuinely failed summary projection; it cannot undo acknowledged closure or claim full completion. No production learner answer, rating, note, correction or review was submitted. No backend/schema, clinical content, scheduler, publication, dependency or infrastructure change.
- The combined stack remains unmerged and undeployed. Added docs/UX_RELEASE_REVIEW.md with reviewed scope, fixed findings, validation, release order and concrete remaining limits. Native Safari and authenticated hosted acceptance of the new UI are still pending. FSRS remains shadow-only; no retention/clinical milestone was promoted.
- Next best step: review and release the verified frontend stack in dependency order, then verify deployed asset parity and read-only authenticated delivery.

## 2026-09-30 — Aperture stack released; Vault draft protection follow-up
- Merged UX PRs #155, #156, #157, #158 and #159 in dependency order, retargeting each dependent PR to main and pinning its head SHA. Final release commit is 77a97c20bf2c4bb6619f36493c5fc607b0b2aa06; its complete tree exactly matches tested head 14e5572ff7552e6886f4fa1f8f453afbbcd7c72b.
- Fresh local run: all 806 tests and npm run check pass. Main Foundation run 36686530859 passes both check and full responsive browser jobs. Live Render app.js, medical.js, vault.js and styles.css match the released Git bytes exactly. No API, schema, clinical-content or infrastructure changes were required.
- Hosted saved-summary acceptance encountered an expired learner session: summary read unavailable, then QBank/Account explicitly showed signed-out state. No learner answers, ratings, notes or reviews were submitted. Authenticated hosted acceptance and native iOS Safari remain open; deployed-byte verification is complete.
- Next UX defect found in actual code: render() destroyed unsaved Vault text during search, switching concepts and failed writes. The follow-up preserves page-memory drafts scoped to learner/concept/exact form target, shows unsaved/discard controls, retains original optimistic revisions, blocks stale-revision/anchor saves and recovers text if its target disappears. Successful writes clear only their own draft. The native exit guard is best-effort; no durable/offline draft claim, automatic write, storage dependency or learner inference is introduced.
- Follow-up validation: all 806 repository tests, npm run check and git diff --check pass. The new three-width draft suite proves failed-create/correction recovery, search and concept detours, edit conflicts, explicit discard, original-target removal recovery and a dismissible exit guard without implicit writes. Existing responsive Vault persistence, private correction/report-sharing and integrated UX suites pass. Phone/tablet/desktop screenshots inspected; Vault messages now have an explicit dismiss control. Chromium was obtained through the pinned CI Playwright installer after the preinstalled newer version download failed. No repository dependency was added.
- Follow-up is prepared on fix/vault-unsaved-drafts; release will follow successful CI. Next: authenticated read-only acceptance, then navigation/accessibility consistency on Account and Exams. Native Safari remains unverified; page-memory drafts cannot survive browser termination.


## 2026-09-30 — UX release and authenticated acceptance complete
- PR #160 merged at f033f51fa2a6c52d735db852777cd4e1241893b2. Its tree matches locally verified tree 3988f4ec375f9ea8e5c629d2e660041ee30e3bb1. PR Foundation run 36687798902 and main run 36688037103 passed all tests and all browser suites, including the new draft suite.
- Live vault.js, vault-drafts.js and styles.css are byte-identical to the merged source. The prior #155–#159 UX release remains deployed. No additional infrastructure or dependency cost was introduced.
- Secure browser sign-in succeeded after the expired session. Authenticated Home displayed 11 saved attempts, 7 reviewed questions and 1 due review. The existing completed six-item session restored 6/6 answered, 4 correct and 2 incorrect; its anaphylaxis concept opened the canonical Vault workspace, Return to study restored the identical results, and reload preserved them. This was read-only acceptance: no answer, memory rating, annotation, report or human review was submitted.
- A transient Account retention_probe_consent_unavailable message was observed immediately after sign-in; Home's independent projections and the saved-session/Vault reads succeeded. Account's independent-read recovery should be investigated in the next UI slice rather than treating that observation as a diagnosed backend outage.
- Saved a live results screenshot. Native iOS Safari remains unverified. Draft failure/recovery and responsive checks use synthetic fixtures; page-memory drafts do not claim durability across browser termination. M05d and FSRS gates remain unchanged.
- Next bounded task: Account projection failure isolation and consistent learner navigation, then the remaining Exams accessibility review. Keep production learning evidence separate from interface test fixtures.

## 2026-10-02 — Cloudflare Home data access repaired
- User screenshots show Home renders on `medical-learning-os-web.medicalos.workers.dev` but schedule/progress/question counts fail, while Render displays existing learner data. Live OPTIONS reproduced HTTP 403 `origin_not_allowed` for the Cloudflare origin.
- Added only the exact deployed learner origin to study-api, review-api and retention-probe-api allowlists. Existing origin configuration, JWT validation, learner identity, RLS and heartbeat configuration remain unchanged.
- Deployed study-api v45, review-api v25 and retention-probe-api v6. Each deployment used its retrieved live bundle with only the allowlist line added, preserving live dependency files and avoiding unrelated source-format drift.
- Verification: 866 tests pass, including nine executable real-handler origin/auth regressions; npm run check and git diff --check pass. Twelve live HTTP checks confirm Cloudflare and Render preflights return 200 with exact allow-origin, unauthenticated Cloudflare reads return 401, and another workers.dev origin returns 403 without allow-origin on all three APIs.
- Added Cloudflare preflights for all three APIs to the existing manual deployed-API smoke workflow.
- This repairs the confirmed API transport blocker. Authenticated counts on the user's iPad have not been independently reread; refresh Home to reissue failed reads. No learner answers, ratings, annotations or other evidence were changed. Google OAuth callback configuration is outside this observed failure.
