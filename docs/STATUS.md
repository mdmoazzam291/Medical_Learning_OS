# Current status

Updated: 2026-09-25 (Asia/Kolkata)

## Completed
- M00–M02: repository governance, validated learning events, canonical content/versioning and publication gates.
- M03 complete: responsive Today, Demo QBank, Progress and Study plan; editable personal countdown, dark mode and random local learner identity.
- Nonclinical demo loop: start/resume, persisted selection and answer, explanation, bookmarks, incorrect-latest queue, completion, descriptive accuracy and JSON export.
- IndexedDB transactions atomically save session and event ledger; stable submission IDs prevent duplicates; failed/corrupt storage never silently resets data.
- Project context reference rule preserved; M03 reconciliation and storage boundary documented.
- M04a implemented: separate learner-scoped local API, hashed/expiring operator credentials, SQLite event/session persistence, server scoring, eligible version selection, immutable receipts, safe retries, bookmarks, progress and export. No real learner credentials were provisioned during implementation.
- M04b in progress: isolated Supabase Auth account UI, opt-in transactional learner-state adapter and shared draft-only scoring catalog on a separate project. No real account or reviewed medical catalog has been exercised.

## Verification
22 local domain tests, npm run check and npm run demo passed. GitHub Actions passed the same checks plus Chromium flows at phone (390px), tablet (820px) and desktop (1440px) widths: countdown ticks, settings/theme reload, selection/answer reload, completion, queues, JSON export, quota failure recovery, concurrent submit deduplication and corrupt-data protection. No browser runtime errors were observed. See [verification run](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/36098096484); it includes responsive screenshots. Local browser installation was unavailable, so browser verification ran in GitHub Actions. Native iOS Safari remains unverified.

## Next task
Finish M04b with a real Auth/REST account flow and cross-device recovery. M04c then adds authenticated reviewers and genuinely reviewed medical content to the shared catalog. Keep demo evidence separate; M04 overall is only partially implemented.

## M04a verification
36 local tests passed, including 14 new server/HTTP groups for authorization, learner isolation, expiry/revocation, scoring, source receipts, restart recovery, safe retries, concurrent requests, catalog retirement/immutability, failed writes, payload limits and sanitized errors. Syntax/catalog checks and terminal demo passed. [GitHub CI](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/36100640997) passed backend checks and the unchanged phone/tablet/desktop browser regression suite. Only synthetic nonclinical catalogs were published inside temporary test databases.

## Not implemented
Real account/browser study verification, actual cross-device recovery, authenticated reviewers, reviewed medical content, review scheduler, NeuralVault, AI, learner backup restoration and deployment. The cloud database and adapter exist but no real account has written study data. Operator-only catalog import exists; learner restore does not. This is a local software preview, not a production medical study app. Native iOS Safari verification remains outstanding. No entire ChatGPT project or external master roadmap has been imported; see PROJECT_CONTEXT.md for limits.

## Resume prompt
“Read AGENTS.md, docs/PROJECT_CONTEXT.md and docs/STATUS.md in Medical_Learning_OS. Consult relevant context from the ChatGPT project ‘medical learning os’. Implement the next incomplete roadmap task with meaningful verification. Update context, status and decisions. Work only in this repository.”

## M04b local account integration — 2026-09-25
- An isolated account study page uses Supabase Auth and the existing server-owned scoring API. The server verifies the access token with the dedicated project's Auth service and derives the learner UUID from the verified response. Local operator credentials remain only for the previous development mode.
- The static preview proxies same-origin API requests to its loopback API. The account UI can sign in/create an account, view published questions, start/resume, answer, advance, bookmark and export. The nonclinical IndexedDB demo remains separate.
- At this stage, the dedicated project had no verified sending domain, reviewed medical catalog or cloud study tables. Account signup and actual medical-session E2E were not exercised. SQLite was the only persistence adapter; later entries record cloud work.
- Verification: account bundle, syntax/catalog checks and 38 tests passed, including mocked Auth verification and cross-learner HTTP isolation. See [account path](ACCOUNT_STUDY.md). M04b remains IN PROGRESS until real Auth and UI end-to-end verification; M04c remains planned.

## M04b cloud schema — 2026-09-25
- Applied migrations `20260925112056_study_state_v1` and `20260925112441_study_attempt_session_fk_index` on the dedicated `medical_learning_os` project. Three empty learner-state tables cover sessions, versioned attempts/receipts and bookmarks with unique retry/slot constraints and Auth-user foreign keys. The follow-up index resolves the performance advisor's missing-FK-index notice; security advisor has no findings.
- Confirmed RLS, owner-only SELECT policies, no anonymous table reads and no authenticated writes. No key, learner record or content was imported. See [cloud study contract](CLOUD_STUDY.md).
- At this stage the study API still wrote local SQLite; the subsequent cloud adapter is recorded below. Local verification: 38 tests, syntax/catalog check and account-route smoke passed. The smoke-test path now respects SQLite `:memory:` and waits for both local servers to be ready.

## M04b cloud adapter — 2026-09-25
- Added opt-in `MLOS_STUDY_STORE=supabase` for account-mode learner state. The Auth-verified server scores against its local reviewed catalog and uses a server-only secret key for Supabase reads/writes. SQLite remains the default for local development. Missing or incompatible cloud credentials fail at startup.
- Applied migration `20260925113131_study_atomic_mutations`: service-role-only, security-invoker RPCs serialize start/answer/advance/cancel by learner. Unique DB keys still protect exact retries and slots. The account UI now reuses a stable session-slot request ID after a lost response.
- Verified real database transitions and two simulated RLS identities inside rolled-back transactions; the cloud tables remain empty. The security advisor reported no findings. Automated fake-backed API tests exercise restart recovery, owner isolation, receipts and export. Real Auth + REST + browser on two devices and a genuinely reviewed catalog remain unverified. The API still binds to loopback, and catalog sharing, deletion and independent backups remain release work.
- Verification: 40 local tests, syntax/catalog check and account smoke passed. [GitHub CI](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/36130791410) passed those checks plus synthetic account-browser lost-response retry and receipt recovery at phone (390px), tablet (820px) and desktop (1440px) widths. These browser scenarios used mocked Auth/API responses; they do not verify live Supabase REST credentials or native iOS Safari.

## M04b shared scoring catalog — 2026-09-25
- Applied `20260925114912_shared_study_catalog` and `20260925115339_answer_catalog_version_gate` to the dedicated project. The single server-only catalog is empty at version 0. Cloud mode now reads it for scoring, so no local SQLite file determines question eligibility on that path. The operator import command accepts drafts only and compares versions to prevent stale overwrites; no content was imported.
- Extracted shared immutable-history validation for local and cloud imports. An answer carries its scoring catalog version; the database verifies and locks that version until the attempt commits. Stale versions leave no evidence, while saved retries keep their original receipt.
- Verified live SQL import conflicts and stale-answer behavior inside rolled-back transactions. The learner tables remain empty. Authenticated and anonymous roles have no catalog privileges or import-function access. Supabase's security advisor has one informational no-policy notice for this intentionally server-only RLS table. Local verification: 42 tests, syntax/catalog check and account smoke passed. Real account/REST and native iOS Safari remain unverified.

## Next task
Exercise a real Auth account and cloud REST flow without fake medical content. Do not claim M04b complete until actual account UI, cross-device recovery and deletion/backup gates are verified; M04c handles authenticated review before publication.

## M04b account recovery and configuration guard — 2026-09-25
- The dedicated project is active and has zero Auth users. Added password-reset request and recovery-completion UI to the separate account workspace. The callback requires the exact account page in the Auth redirect allowlist, and the current unverified email sender means real delivery remains untested.
- The local `/auth-config` endpoint now exposes only the exact dedicated project URL paired with a publishable key. A mistakenly supplied server secret returns `account_setup_required` without revealing the key. Added browser-contract coverage for reset requests at phone/tablet/desktop sizes, plus a local negative smoke check for secret-key exposure.
- Local build, syntax/catalog check, 42 tests and account smoke passed. Browser CI and a genuine email/callback still remain; no test user, mail or learning evidence was created. M04b remains in progress.

## Infrastructure preparation — 2026-09-25
- A separate Supabase Free project named `medical_learning_os` was created in the existing organization in `ap-south-1`; project ref `iyapppmeieqhflnzslao`. The creation cost check returned $0/month. The original `NEETPG2027` project remains separate and active.
- GitHub, Supabase, PostHog, and Resend are connected to the ChatGPT workflow. PostHog has an unused default project; Resend has no configured sending domain. These connections do not imply that the learner app has been deployed or configured with provider credentials.
- At project creation, no migrations, API keys, RLS policies, Auth settings, or application deployment had been applied. Subsequent entries record migrations. Do not point the new app at NEETPG2027 or commit secret credentials.

## Provider integration preparation — 2026-09-25
- Added an isolated Cloudflare Cron Worker config and tested heartbeat query for the dedicated project's server-only catalog. It has no public health endpoint and requires a new named Supabase secret in Cloudflare before deployment. No Cron is currently running.
- Confirmed no Cloudflare, Sentry or Gemini plugin is available to connect in this session. Documented exact account handoff, R2 billing/subscription requirement, Sentry payload boundary, Gemini Free privacy boundary, and dependency adoption in [provider setup](PROVIDER_SETUP.md). R2, monitoring and AI remain inactive; do not claim backup or anti-pause protection yet.
- Next: deploy the Worker after Cloudflare account login/secret entry and verify a live scheduled query; configure an independent failure alert. Then build a consistent R2 backup and restore drill if the user activates R2 billing. Continue real Auth/REST M04b verification and M04c review gates before public beta.
