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
