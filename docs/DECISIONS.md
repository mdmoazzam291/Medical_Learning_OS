# Decision log

## ADR-001 — Separate product repository (accepted, 2026-09-25)
Medical_Learning_OS is independent of NEETPG2027. Existing exam preparation is a use case, not a migration instruction.

## ADR-002 — Foundation before framework (accepted, 2026-09-25)
Use dependency-free JavaScript and Node's built-in test runner for the first domain module. This allows a verified starting point without choosing hosting, database or AI provider prematurely. A web framework and TypeScript remain options for M03.

## ADR-003 — Evidence before personalization (accepted, 2026-09-25)
Store versioned events and show descriptive accuracy first. Digital Twin, Memory Debt and mastery estimates remain planned until their methods and validity are established.

## ADR-004 — Source and license decisions (pending)
No license selected, no paid content imported and no AI vendor configured. Resolve software distribution and content permissions explicitly before public distribution.

## ADR-005 — Context-backed canonical content (accepted implementation choice, 2026-09-25)
Use the named Medical Learning OS project as design context and GitHub as implementation evidence. Record source topics, user decisions versus assistant proposals, and retrieval limitations in PROJECT_CONTEXT.md. Do not treat unseen Drive/XMind plans as reconciled.

Implement a minimal shared concept/source/question catalog before the UI. Subject tags are views, question versions preserve history, and provenance distinguishes original/generated content from recalled/licensed PYQs. Domain review gates model medical/reference/rights approval; authentication and actual medical review remain outside the pure functions. New versions require fresh reviews. Publishing a replacement retires the prior published version without changing its content. This supports future NeuralVault links and version-specific learning evidence without duplicating medical curricula.

## ADR-006 — Device-local M03 preview (implementation choice, 2026-09-25)
Build M03 in existing dependency-free ES modules, keeping domain transitions outside DOM/storage code. Choose IndexedDB transactions for a local learner preview and a random device-local identity; defer accounts/cloud storage selection to M04. This delivers a runnable interface without prematurely claiming production medical study readiness. The local demo is explicitly separate from medical evidence and never bypasses M02 review gates. JSON export gives an inspectable record; data restoration remains planned.

Use four functioning navigation destinations instead of filling eight slots with unimplemented systems. Countdown-first, start/resume, compact daily progress and revision priorities follow the user's visible UI preferences; those preferences arose in the older project and are adopted as bounded design guidance, not a migration of its code or data. NeuralVault and advanced scheduling are not simulated. The personal target date is editable and explicitly unofficial. No hosting provider or public deployment is introduced by M03.

## ADR-007 — Trusted local server before cloud accounts (implementation choice, 2026-09-25)
Split M04 into a verified server foundation (M04a), account/UI integration (M04b), and authenticated content review plus genuine medical-loop verification (M04c). Use Node 24 built-in SQLite for a dependency-free single-host backend; preserve provider-independent domain logic. Resolve learner identity through hashed, expiring operator-issued credentials for development. This is not a selected production identity provider or cloud architecture.

Keep M03 untouched. Do not automatically move demo results into medical evidence. The server owns eligibility, scoring, timestamps and event identity. Exact question versions, unique submission/slot constraints, transactions, replayable projections and immutable saved receipts support safe retries and restart recovery. Operator catalog import is trusted; structural review records are not authenticated clinical approval. Default catalog is empty. No paid service, deployment or unreviewed clinical content is introduced.

## ADR-008 — Isolated Free cloud project (accepted setup, 2026-09-25)
Create a dedicated `medical_learning_os` Supabase project in the user's existing Free organization, after a $0/month project cost check, rather than reusing the `NEETPG2027` database. Keep distinct project URL, Auth tenant, database, RLS policies, API keys, migrations and deployments. The creation was verified as active; it is otherwise unconfigured. Free-plan pausing and lack of automatic backups remain operational risks. This setup does not authorize migration of older app data or a production release.

## ADR-009 — Verified account identity before cloud study storage (implementation choice, 2026-09-25)
M04b first uses the official Supabase browser Auth client and server-side `getUser(token)` validation with the dedicated project, preserving the existing trusted scoring boundary. Only the Auth-verified UUID becomes a learner ID. The same-origin loopback proxy avoids browser-stored operator credentials and public exposure of the SQLite API. The account page is separate from the M03 local demo. This is a bounded local integration, not cross-device sync or production hosting. Do not mark M04b complete until a real account/browser flow, durable cloud persistence and recovery are verified.

## ADR-010 — Owner-readable cloud learner state, trusted writes (implementation choice, 2026-09-25)
Use the dedicated project's Postgres for session, attempt and bookmark state, with Auth-user foreign keys and per-user RLS SELECT policies. Browser roles cannot write directly: correctness, timestamps, receipt and eligible content must come from the trusted study API. Keep one active session per learner and unique retry/slot keys in the database. The schema migration is applied and empty; the API has not switched from SQLite. Server credentials, transactional mutation design, real-account recovery, deletion and backups remain to be completed before cloud study is claimed.

## ADR-011 — Explicit cloud adapter with atomic server writes (implementation choice, 2026-09-25)
Keep domain scoring and the reviewed catalog on the trusted API. Use a separate server-only Supabase secret client for learner-state storage, while Auth identity checks use the publishable client. Cloud mode is opt-in and rejects missing secrets or a different project. Start, answer, advance and cancel run as `SECURITY INVOKER` service-role-only database functions, serializing per learner and retaining unique retry/slot constraints; direct browser writes remain denied. The local catalog means multiple application hosts cannot yet be deployed safely. No real account or medical content was created for this implementation.
