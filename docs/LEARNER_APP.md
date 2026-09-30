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

## Aperture next-session interface

Home has one Study Now start link with a 10/20/30/60-minute selection. The selected duration persists only as an optional browser preference; unavailable storage falls back to 20 minutes. Selection and reload are read-only with respect to canonical learner evidence. If the schedule is loading or unavailable, Home does not display a fabricated zero due count. If only future reviews remain, Home offers ordinary Study browsing rather than an immediate scheduled-review start.

Session results place counts and canonical concept revisit links beside a next-revision card. “Plan my next session” returns to Home's Study Now section without automatically submitting an answer or starting a session. The Study overview places revision ahead of the published-question list. Existing server-owned recommendation, resume, scoring, schedule and optional rating behavior remains intact.

## Saved-answer feedback and Vault return

After an accepted answer, Study shows a distinct saved result, explicit selected/correct option labels, visible reasoning, and native disclosure controls for sources, recommendation context and the optional recall rating. The result heading receives focus after answer acknowledgement; the learner can continue without rating or opening a note.

An answered question's concept link carries only a bounded `returnSession` identifier alongside its existing canonical concept/correction context. Vault renders an internal “Return to study” link. Study's `resume` URL reads the owned session through the existing authenticated GET API and restores its current server cursor, receipt and optional rating. It never trusts a cursor, answer or receipt from the URL, never starts/answers/advances automatically, and reconciles already-closed sessions to their summary. An unavailable or unowned session shows a retry state with no stale question or answer content. An arbitrary return URL is not supported.

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


### Vault reading and personal workspace

The selected canonical concept is the single page heading. Reviewed knowledge appears before My notes and My corrections, with focusable section navigation and version details available on demand. The concept browser defaults collapsed below 801px and remains explicitly expandable; wider layouts use the existing adjacent index. Selecting another concept moves focus to its heading and preserves its concept URL for reload. Home, Study/session return and Account remain direct links.

General notes retain create/edit/delete and optimistic revision checks. Canonical-note correction composition is optional; an exact question-version handoff exposes the targeted private composer. Correction reports still require an explicit opt-in to share private text. Concept selection, search, section navigation, disclosure and reload create no learning or note writes. A missing canonical note is shown honestly; personal notes remain usable independently. No API or content authority changes.


### Study session entry and reload

Study presents a single “Open N min session” action after selecting 10/20/30/60 minutes; the optional duration preference is shared with Home. The server continues unfinished work when available and otherwise builds a recommended session. Returned plan evidence identifies new versus continued recommended work. Ordinary QBank opening uses “Session opened” because its response does not identify whether it created or resumed work. The reviewed question browser and exam readiness are secondary, with native disclosure for question stems and full-mock details. Browsing and duration selection write no learner evidence.

Both recommended and ordinary successful starts retain a bounded resume URL. Reload authenticates and restores the server cursor/receipt directly through GET, even during overview outages, without calling Start again. A failed Start leaves an explicit retry choice and cannot replay on reload. Unknown progress shows dashes while loaded questions remain usable; an unavailable question list is not called an empty catalog. Schedule outages and upcoming-only work provide QBank browsing without pulling future reviews early. Existing scoring, publication, session ownership, answer idempotency and optional ratings are unchanged.


### Integrated navigation and recovery

Completed-session concept revisit links use the same bounded return as post-answer links; returning from Vault opens that closed session's saved results. The results label says Complete only when the authenticated summary explicitly confirms every selected item was answered; during a summary outage, closure stays acknowledged while completion is not inferred.

Home keeps independent projection failures local and clears previous projections during retry. Available due work/catalog counts remain visible when progress totals are unavailable, and schedule failures remain unknown. Study's unavailable question list offers Reload Study rather than a link to a missing browser; ordinary Browse opens the read-only list and focuses its heading. Study messages can be explicitly dismissed, with keyboard focus returned to the relevant feedback or next action. Late Vault responses cannot replace a more recently selected concept or its note context.
