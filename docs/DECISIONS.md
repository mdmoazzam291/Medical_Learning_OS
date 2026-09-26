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

## ADR-011 — Disposable local restore verification (accepted, 2026-09-25)
Validate the first existing R2 backup on a standard GitHub runner with local Supabase Postgres 17, rather than provisioning a hosted project. The user authorized included free R2 reads and Actions minutes with zero additional spending intended. The workflow receives R2 credentials only during download, no live database URL, restores original SQL as the local internal administrator, checks study data against the dump and RLS flags, and removes temporary data. Keep manual-only operation after the one-time branch trigger; do not equate this snapshot drill with complete hosted disaster recovery or guaranteed zero billing when free quotas are exhausted.

## ADR-012 — Preserve recovery while bounding backup growth (accepted implementation, 2026-09-26)
User authorized the next retention/storage step after the successful restore drill. Use a read-only retention plan retaining 30 days, the newest seven complete snapshot pairs, and the explicitly restore-tested snapshot. Unknown/incomplete objects remain retained. Avoid blanket age-based expiration because extended inactivity could otherwise erase all recovery points. No deletion is implemented.

Before upload, inventory the entire private backup bucket with bounded pagination and fail closed if incomplete. Count the incoming archive/checksum against a 7 GB stop threshold, report from 5 GB, and cap an archive at 250 MB. Force Standard storage. Share the backup concurrency group. These are conservative bucket controls, not enforcement of account-wide free allowances. Keep schedules off pending billing/frequency decisions.

## ADR-013 — Weekly development backups (accepted, 2026-09-26)
Explicit user instruction enables one weekly backup at Sunday 03:47 IST, away from the top of the hour. Reuse the verified backup pipeline and existing storage guard. Manual dispatch remains available. No automatic deletion, extra restore schedule, or billing changes are introduced. A weekly interval permits up to a week of changes since the previous successful snapshot; revisit when real learner data is used.


## ADR-014 — Authenticated review evidence before medical publication (accepted, 2026-09-26)
Persist reviewer authorization separately from immutable review decisions. `content_reviewer_grants` is current server-only authorization state; `content_review_events` is append-only audit evidence. Learner/browser roles receive no access.

Bind each decision to a database-computed SHA-256 hash of the exact question-version JSON plus all referenced source records. This prevents a review from being silently reused after the reviewed target changes. The trusted database function `record_content_review` verifies reviewer grant, review stage, source completeness and self-review rules before inserting one decision per gate/version.

Do not let review evidence directly publish content. M04c must first prove authenticated reviewer identity and review capture through a trusted `review-api`; publication remains a separate transition with its own checks.


## ADR-015 — Review events are authority; catalog review state is a transactional projection (accepted, 2026-09-26)
Do not maintain two independently mutable sources of review truth. Persist authenticated review decisions in `content_review_events` and update the question's catalog `reviews`/status in the same database transaction that records the event.

Fingerprint only the substantive review target: the question version excluding workflow metadata (`status`, `reviews`, `publishedAt`) plus all referenced source records. This lets medical, references and rights reviewers independently attest to the same target while the workflow metadata changes between decisions.

A rejection permanently blocks that question version from additional review; corrections require a new version. Three approved gates advance the catalog only to `verified`. Publication remains a separate explicit transition.


## ADR-016 — Separate review authority from publication authority (accepted, 2026-09-26)
Three authenticated review approvals make a question version `verified`; they do not make it learner-visible. Publication is a separate trusted transition.

At publish time, recompute the same substantive question/source fingerprint and require all three immutable review events to match it. Re-check source rights and version ordering, then atomically publish the target and retire the previous published version. This prevents stale reviews, changed references or reviewer actions alone from silently opening content to learners.

Keep the publication function service-only until an explicit publisher authorization model and admin surface exist.
