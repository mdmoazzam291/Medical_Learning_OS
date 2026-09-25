# Current status

Updated: 2026-09-25 (Asia/Kolkata)

## Completed
- M00–M02: repository governance, validated learning events, canonical content/versioning and publication gates.
- M03 complete: responsive Today, Demo QBank, Progress and Study plan; editable personal countdown, dark mode and random local learner identity.
- Nonclinical demo loop: start/resume, persisted selection and answer, explanation, bookmarks, incorrect-latest queue, completion, descriptive accuracy and JSON export.
- IndexedDB transactions atomically save session and event ledger; stable submission IDs prevent duplicates; failed/corrupt storage never silently resets data.
- Project context reference rule preserved; M03 reconciliation and storage boundary documented.
- M04a implemented: separate learner-scoped local API, hashed/expiring operator credentials, SQLite event/session persistence, server scoring, eligible version selection, immutable receipts, safe retries, bookmarks, progress and export. No real learner credentials were provisioned during implementation.

## Verification
22 local domain tests, npm run check and npm run demo passed. GitHub Actions passed the same checks plus Chromium flows at phone (390px), tablet (820px) and desktop (1440px) widths: countdown ticks, settings/theme reload, selection/answer reload, completion, queues, JSON export, quota failure recovery, concurrent submit deduplication and corrupt-data protection. No browser runtime errors were observed. See [verification run](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/36098096484); it includes responsive screenshots. Local browser installation was unavailable, so browser verification ran in GitHub Actions. Native iOS Safari remains unverified.

## Next task
Finish M04b: configure/verify a real Auth account flow and move study-state persistence to the dedicated cloud backend with recovery tests. M04c then adds authenticated reviewers and genuinely reviewed medical content. Keep the demo's evidence separate; M04a is complete, while M04 overall is only partially implemented.

## M04a verification
36 local tests passed, including 14 new server/HTTP groups for authorization, learner isolation, expiry/revocation, scoring, source receipts, restart recovery, safe retries, concurrent requests, catalog retirement/immutability, failed writes, payload limits and sanitized errors. Syntax/catalog checks and terminal demo passed. [GitHub CI](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/36100640997) passed backend checks and the unchanged phone/tablet/desktop browser regression suite. Only synthetic nonclinical catalogs were published inside temporary test databases.

## Not implemented
Real accounts, browser-to-server study integration, cloud database, cross-device sync, authenticated reviewers, reviewed medical content, review scheduler, NeuralVault, AI, learner backup restoration and deployment. Operator-only catalog import exists; learner restore does not. This is a local software preview, not a production medical study app. Native iOS Safari verification remains outstanding. No entire ChatGPT project or external master roadmap has been imported; see PROJECT_CONTEXT.md for limits.

## Resume prompt
“Read AGENTS.md, docs/PROJECT_CONTEXT.md and docs/STATUS.md in Medical_Learning_OS. Consult relevant context from the ChatGPT project ‘medical learning os’. Implement the next incomplete roadmap task with meaningful verification. Update context, status and decisions. Work only in this repository.”

## M04b local account integration — 2026-09-25
- An isolated account study page uses Supabase Auth and the existing server-owned scoring API. The server verifies the access token with the dedicated project's Auth service and derives the learner UUID from the verified response. Local operator credentials remain only for the previous development mode.
- The static preview proxies same-origin API requests to its loopback API. The account UI can sign in/create an account, view published questions, start/resume, answer, advance, bookmark and export. The nonclinical IndexedDB demo remains separate.
- The dedicated project has no verified sending domain, reviewed medical catalog or cloud study tables. Account signup and actual medical-session E2E have not been exercised. SQLite remains a local single-host persistence adapter; cross-device recovery and production deployment are not complete.
- Verification: account bundle, syntax/catalog checks and 38 tests passed, including mocked Auth verification and cross-learner HTTP isolation. See [account path](ACCOUNT_STUDY.md). M04b remains IN PROGRESS until real Auth and UI end-to-end verification; M04c remains planned.

## Infrastructure preparation — 2026-09-25
- A separate Supabase Free project named `medical_learning_os` was created in the existing organization in `ap-south-1`; project ref `iyapppmeieqhflnzslao`. The creation cost check returned $0/month. The original `NEETPG2027` project remains separate and active.
- GitHub, Supabase, PostHog, and Resend are connected to the ChatGPT workflow. PostHog has an unused default project; Resend has no configured sending domain. These connections do not imply that the learner app has been deployed or configured with provider credentials.
- No migrations, API keys, RLS policies, Auth settings, or application deployment have been applied to the new Supabase project. The M04b implementation and verification remain next. Do not point the new app at NEETPG2027 or commit secret credentials.
