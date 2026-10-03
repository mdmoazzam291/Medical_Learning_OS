# Current status

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
