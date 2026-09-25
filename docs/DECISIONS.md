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


## ADR-009 — External logical backup before cloud data migration (accepted, 2026-09-25)
Use a private Cloudflare R2 bucket as an independent backup destination for the dedicated Medical Learning OS Supabase project. Keep R2 public access disabled and scope its service token to Object Read & Write on only the backup bucket. GitHub Actions is the orchestration boundary; credentials remain repository secrets.

Verify transport separately before treating the system as backed up. The R2 canary round trip passed from GitHub Actions. For database backups, prefer Supabase CLI logical dumps of roles, schema and data rather than raw `pg_dump`, because the CLI applies Supabase-specific filtering for managed schemas and roles. Use the Session pooler connection string for IPv4-compatible CI access. Start manual-only, validate archive/checksum upload, complete a restore drill, and only then enable a recurring schedule and retention policy. Storage object bytes and provider configuration outside Postgres require separate backup paths if those services are later adopted.


## ADR-010 — Local application-data restore drill before paid disaster-recovery environments (accepted, 2026-09-25)
Validate backup recoverability without creating a paid Supabase branch by restoring the R2 archive into a disposable local Supabase stack in GitHub Actions. Preserve and checksum the complete logical backup, but for this local drill do not mutate local managed roles and do not replay provider-managed Auth/Storage COPY blocks, because the local stack already owns those objects and protects some internal tables/settings. Treat this as proof of recoverability for Medical Learning OS application schema/data, not proof that every Supabase-managed service can be recreated identically. Use a full isolated provider/self-hosted recovery test later when Auth, Storage or other managed services hold material production state.
