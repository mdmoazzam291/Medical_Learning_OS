# Beta learner application

## Current beta surface
The M03 three-question local demo has completed its architectural purpose and is **retired from the app entry path**. Opening Medical Learning OS now presents the authenticated beta product rather than a software walkthrough.

Learner navigation is intentionally compact:

- **Home** — Preparation Command Center + Study Now entry;
- **Study** — reviewed medical QBank, revision and Study Now;
- **Exams** — exam runtime/readiness;
- **Vault** — NeuralVault concept workspace;
- **Account** — identity/session controls.

A sixth **Admin** destination is rendered only when the server confirms the authenticated identity is the singleton beta content admin. Learner accounts never receive content-approval controls.

The beta home follows the product rule that complexity stays under the floorboards: due work, unseen reviewed material, recorded attempts and exam-content readiness feed a small number of actions instead of exposing internal engines as menus. Study Now remains the dominant learning action.

The historical local demo modules may remain in the repository for regression/reference value, but they are not in the development server's public allowlist and are not imported by the root application.

## Content authority boundary
Content governance is separate from the learner product. Learners may study, annotate and report suspected issues. Medical, References, Rights and research pair-validation decisions are available only through the authenticated Admin Console and are enforced server-side. No admin email, password, user metadata or browser flag grants authority.

---

# M03 learner application

## Scope and screen contract
A dependency-free browser application serves a device-local preview. Four working views: Today, Demo QBank, Progress and Study plan. The study session is a focused subview. Navigation uses semantic links and labelled forms; responsive rules target phone, tablet and desktop, with keyboard focus states and light/dark palettes.

Today prioritizes a live countdown, start/resume, today's demo evidence and revision priorities. The default 2027-08-29 date is the user's personal NEET-PG planning target, not an official date. Calendar grouping and the countdown use the device's local timezone. Goals are planning preferences, not scheduling logic. No fabricated patient, medical question, mastery, rank, due date or user activity is displayed.

The demo is three original nonclinical system questions in `src/domain/demo-study.js`. This module is separate from the M02 medical catalog, whose fixture stays draft. Demo answer keys are intentionally public; this is a software walkthrough, not a secure assessment. Never insert clinical content into this demo module. Production medical content must be selected and scored by the future authorized server using the M02 publication gates.

## Local identity and storage
- IndexedDB database `medical-learning-os-local-v1`, schema version 1, one `state` object store and `learner` record.
- Random local UUID; no accounts, identity verification, analytics service or personal identifiers.
- State: version, learner ID, validated settings, immutable attempt events, bookmark IDs and one resumable session (ID, question-version IDs, cursor, selected answer, approximate active timer).
- A read-modify-write transaction reads the latest state and atomically commits the event ledger and session. UI reports success only after transaction completion. Repeated submit uses `sessionId:index` and counts once. Stale cursor actions are rejected. BroadcastChannel refreshes other open tabs where supported.
- Invalid/future saved states are not replaced. Write failures keep prior persisted state and display an explicit error. No silent fallback to volatile storage.
- The current browser/origin owns this record. Clearing site data, eviction or switching origin/device can remove or hide it. JSON export includes its scope, settings, session, bookmarks and events; import/restore and migrations remain future work.
- Known pauses and visibility changes exclude interruptions from the demo timer. Sudden process termination may lose uncommitted elapsed time. Timing is approximate, never a mastery or engagement score.
- No cloud synchronization, offline service worker, backup guarantee, production authentication or medical-review service is implied.

## Running and verification
Run `npm start`, then open `http://127.0.0.1:3000`. The development server binds loopback and serves only an explicit allowlist. Draft catalogs, repository files and secrets cannot be requested through it. It is not a production hosting server.

`npm test` verifies pure transitions alongside M01/M02. `npm run check` checks app/domain syntax and the unpublished fixture. `scripts/browser-check.js` exercises phone (390px), tablet (820px) and desktop (1440px) in Chromium: countdown ticks, settings/theme reload, selected/answered session reload, completion, queue filtering, export, failed writes, concurrent submissions and corrupt-data startup. GitHub Actions installs an isolated pinned Playwright runner, starts the app, runs this check and saves screenshots. Optional local execution uses `PLAYWRIGHT_MODULE_URL` to point to an installed Playwright ES module and requires its Chromium binary. Native iOS Safari testing remains a release gate.

## Production path (M04)
Add the authorized application API and persistent server ledger, reviewer identity enforcement, server-side eligibility/scoring, real reviewed content and account isolation. Keep the local demo namespace separate during any migration. Then connect the same study interaction to published question versions and test the medical flow end to end. Scheduling and NeuralVault follow that working persisted loop.

## Authenticated visual detection handoff

The medical learner UI has a dormant M10b path for server-scored visual detection. The browser never treats “has an image” as sufficient evidence of task type. It switches from the ordinary answer endpoint only when the session question contains a server-supplied `visualInteraction` descriptor with `schemaVersion=1`, `taskType=detection`, and an exact `mediaAssetVersionId` present in the delivered prompt.

The browser submits only the selected option plus request/session position, exact media identity, help-use state and optional intervention reference. Correctness, target concept, outcome, event identity and timing remain server-owned. The returned ordinary question attempt remains the scored retrieval record; the visual receipt is an additional observation and does not become a mastery score.

Until a reviewed/published visual item has that canonical descriptor, this code path is inert and ordinary medical study behavior is unchanged.


## Unified sign-in identity
Medical Learning OS treats the Supabase Auth user ID as the learner identity. A verified email may have both Google and email/password sign-in methods attached to that one identity.

The Account surface shows linked methods. If a learner first creates the account with Google, they can add a password while authenticated. If they first create it with email/password, later Google sign-in using the same verified email is handled by Supabase automatic identity linking. The application does not create a second learner profile or copy historical learning evidence between identities.


### Password recovery
Learners using password authentication can request a recovery link from Account. The recovery link returns to the same Account surface, establishes Supabase's recovery session, and allows a new password to be set on the existing user. Google linkage, learner history and all user-ID-bound learning evidence remain unchanged.
