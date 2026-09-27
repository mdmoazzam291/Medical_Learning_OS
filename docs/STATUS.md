# Current status

Updated: 2026-09-26 (Asia/Kolkata)

## Completed
- M00–M02: repository governance, validated learning events, canonical content/versioning and publication gates.
- M03 complete: responsive Today, Demo QBank, Progress and Study plan; editable personal countdown, dark mode and random local learner identity.
- Nonclinical demo loop: start/resume, persisted selection and answer, explanation, bookmarks, incorrect-latest queue, completion, descriptive accuracy and JSON export.
- IndexedDB transactions atomically save session and event ledger; stable submission IDs prevent duplicates; failed/corrupt storage never silently resets data.
- Project context reference rule preserved; M03 reconciliation and storage boundary documented.
- M04a implemented: separate learner-scoped local API, hashed/expiring operator credentials, SQLite event/session persistence, server scoring, eligible version selection, immutable receipts, safe retries, bookmarks, progress and export.
- M04b is substantially verified: real email-confirmed Auth, cross-device continuity, current-session logout, live token refresh, trusted study API reads, RLS isolation and browser Sentry capture have passed. The remaining live gate is two-distinct-real-account isolation.

## Verification
- Original M03 foundation/browser verification passed phone (390px), tablet (820px) and desktop (1440px) Chromium flows.
- M04a verification passed server authorization, learner isolation, scoring, retries, restart recovery, catalog immutability, failure rollback, payload limits and sanitized errors.
- Current main Foundation checks passed in run 36188364648 after M04b integration, including auth/cloud adapter tests and mocked browser account persistence/sign-out.
- A real email-confirmed cloud learner flow is verified. Native iOS Safari remains a later compatibility check.

## Current task
Keep the remaining two-real-account M04b isolation gate explicit until a second confirmable learner account is available. Meanwhile harden the trusted study path and prepare M04c authenticated review/content publication work. Production Resend SMTP remains deferred until an owned sending domain exists.

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
