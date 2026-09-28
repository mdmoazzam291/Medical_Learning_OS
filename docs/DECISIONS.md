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


## ADR-017 — Prove one genuine medical item before scaling content ingestion (accepted, 2026-09-26)
Use one small, clinically stable, source-grounded medical question to exercise the authenticated M04c lifecycle before importing a large QBank. The first seed is AI-generated, explicitly non-PYQ, source-linked and `in_review`; it is not learner-visible.

Preserve rights uncertainty rather than declaring a source reusable from broad assumptions. The first seed's CDC source remains `rights.status=unknown` because the agency site has public-domain defaults with exceptions and the page contains cited/adapted third-party material. Rights resolution is a real review task, and publication must remain blocked until it is cleared.

This is a validation seed, not a content-acquisition strategy. Scaling begins only after the medical, references and rights gates produce defensible evidence on a genuine item.


## ADR-018 — Review gates attest to different targets (accepted, 2026-09-26)
Replace the shared cross-gate review fingerprint with gate-specific fingerprints. Medical accuracy, reference support and usage rights are different assertions and should not invalidate each other when unrelated metadata changes.

Medical review binds to clinical question content. Reference review binds to question/source identity and version metadata while excluding rights projection. Rights review binds to provenance and complete source-rights metadata. Publication recomputes and validates all three independently.

Rights clearance becomes immutable evidence rather than a free-form mutable source field. A versioned source receives one `source_rights_events` record bound to a source fingerprint. Rights approval and publication fail closed when the event is absent, restrictive, or stale.


## ADR-019 — Reviewer authority must be auditable and time-bounded (accepted, 2026-09-26)
Do not assign review capabilities through direct table edits or durable browser role flags. Maintain a current grant projection plus immutable grant/revoke events.

Every grant records who granted it, why, and an optional expiry. Review queues and review mutations independently check active server-side grants, so revocation/expiry takes effect even in an already-open browser session.

Keep grant mutation service-only until a separate authenticated operator authorization model exists. Reviewer authorization and content review are different powers and should not share the same browser control.


## ADR-020 — Revision scheduling is a replaceable projection, not mastery (accepted, 2026-09-26)
Build M05 revision state by replaying the immutable attempt ledger per learner and exact question version. Keep schedule state rebuildable and bind every scheduling decision to an explicit algorithm/policy version.

Do not call a due date, interval, correctness streak or FSRS state “mastery.” They are scheduling signals with uncertainty, not proof of durable knowledge or transfer.

The current production event contract records binary correctness but not Again/Hard/Good/Easy. Do not silently map every correct answer to Good and incorrect answer to Again as if the richer learner judgment had been observed. Start with an explicitly provisional binary interval policy to prove the queue/persistence/workload plumbing. Later FSRS integration must either collect the evidence it needs or document and validate a deliberate mapping.

Because historical attempts remain immutable, a new scheduler can be evaluated and adopted by replaying the same evidence rather than rewriting learner history.


## ADR-021 — Study Now begins as a time-budgeted due-revision planner (accepted, 2026-09-26)
The first production Study Now policy uses learner-available time as the workload constraint rather than a fixed question quota.

The initial selector is intentionally narrow:
- only currently published items whose revision due time has arrived;
- oldest due first;
- fit items inside the declared time budget using bounded estimates from prior observed response duration plus review overhead;
- do not pull future reviews early merely to keep the learner busy;
- resume an existing open session before creating a new one.

This is not the final recommendation engine. Later versions may mix due revision, new learning, misconception repair, exam priorities and transfer exercises, but each added priority must be evidence-backed and explainable. The narrow first policy provides a measurable baseline without conflating scheduling urgency with mastery.


## ADR-022 — Study Now decisions and outcomes must be auditable evidence (accepted, 2026-09-26)
Persist every newly created Study Now recommendation as an immutable decision receipt bound atomically to the study session it creates. The receipt stores the strategy version, learner-declared time budget, selected exact question versions, candidate reasons and estimated workload.

Keep recommendation reasons categorical and explainable before considering a composite ranking model. Study Now v2 uses three explicit classes:
- `mistake-repair`: a scheduled-due item whose latest observed answer was incorrect;
- `due-revision`: other scheduled-due revision;
- `new-learning`: published content the learner has not attempted, considered after fitting due work.

Do not pull future revision early merely to consume the learner's available time. A recent mistake can be labelled for repair when due without treating immediate repetition as evidence of durable learning.

Project outcomes by joining immutable recommendation receipts to sessions and attempts. Track completion, attempted/correct counts, actual answer time and the first later retrieval of each recommended item. These are descriptive observations, not mastery and not estimates of causal treatment effect. Causal claims require controlled experiments or stronger identification designs.

This creates an evaluation loop:
learner evidence → recommendation decision → immutable receipt → learner action → later retrieval → policy evaluation.

A future policy can therefore be compared against prior policies without rewriting historical learner evidence or losing why a recommendation was made.


## ADR-023 — Collect FSRS-compatible self-report separately from correctness (accepted, 2026-09-27)
Do not mutate or reinterpret the strict binary `question.answered` event in order to adopt FSRS.

Collect an optional post-answer learner self-report on an explicit four-grade `fsrs-4-v1` scale: Again, Hard, Good and Easy. Persist it as a separate immutable judgment linked to the exact attempt.

Correctness, response time and self-reported recall difficulty are distinct observations. Preserve disagreement between them instead of coercing them into consistency. A wrong answer plus an Easy rating, or a correct answer plus Again, is potentially useful calibration/misconception evidence.

The memory rating is optional and must never block study progression or modify exam scoring. Missing ratings remain missing evidence; do not infer them from correctness.

Do not switch the production revision scheduler to FSRS merely because the event shape exists. First collect real rating coverage, measure missingness and contradictory patterns, run a shadow-policy comparison against the current scheduler, and validate delayed retrieval outcomes before allowing FSRS to control due dates.


## ADR-024 — FSRS begins as an evidence shadow, not a scheduling switch (accepted, 2026-09-27)
Before introducing FSRS scheduling authority, build a learner-scoped shadow evidence projection from immutable attempts plus explicit memory judgments.

The shadow must expose:
- rating coverage and missingness;
- rating distribution;
- exact chronological rated-review replay log;
- rating latency after answer submission;
- correctness-rating discordance;
- exact question/version identity.

Do not infer missing ratings from correctness. Do not discard discordant observations. Do not define a mastery score from FSRS state.

The live due-date policy remains `bootstrap-binary-v1`. The shadow endpoint must explicitly report that it has no scheduling authority.

Use `ts-fsrs` as the candidate implementation when a real shadow scheduler is introduced, but do not add scheduling output merely to demonstrate the library. First collect real ratings. Then instantiate the engine behind the shadow boundary, compare its proposed due dates with bootstrap and delayed retrieval outcomes, and only later consider a controlled policy experiment.

Do not hard-code a global minimum review count as scientific validation. Initial operational gates may later be introduced for safety, but promotion to production scheduling must be based on coverage, missingness, calibration/retention evidence and measured learner-time trade-offs.


## ADR-025 — FSRS shadow scheduling requires complete rated history per exact question version (accepted, 2026-09-27)
Use `ts-fsrs@5.4.2` as the pinned shadow scheduler implementation, with fuzz disabled so the same immutable history produces the same proposed schedule.

A question version is eligible for FSRS shadow scheduling only when every observed attempt for that exact version has an explicit memory rating. If an unrated exposure exists between rated reviews, do not silently omit it and pretend the remaining ratings form a complete history. Mark that question history incomplete and produce no FSRS due date for it.

The shadow response may contain proposed due dates, stability, difficulty, state and retrievability, but it has no production authority. The authoritative revision projection remains `bootstrap-binary-v1` until a later evidence-based promotion decision.

Compare shadow due dates to the live bootstrap due dates explicitly. This creates paired counterfactual policy proposals without rewriting learner history.

Do not treat FSRS difficulty, stability or retrievability as mastery. They are model state under a specific scheduler configuration.


## ADR-026 — Preserve scheduling proposals as immutable decisions before comparing policies (accepted, 2026-09-27)
A scheduler comparison must preserve what each policy actually proposed at the time, not reconstruct only the current state later.

Record each proposal as an immutable schedule-decision event linked to the exact learner attempt that forms its evidence cutoff. Store policy ID/version, config version, authoritative or shadow role, exact question version, proposed due time and policy-specific decision details.

The authoritative bootstrap proposal is recorded after each successful revision projection. An FSRS proposal is recorded only when the explicit rating history for that exact question version is complete and the rated attempt is still the latest exposure. Do not backfill missing FSRS ratings, omit intervening exposures, or let later evidence leak backward into an earlier shadow proposal.

Policy-ledger failures must not block question answering or memory-rating capture. The ledger is evaluation infrastructure, not a prerequisite for learning continuity.

For descriptive evaluation, link each decision to the first later real retrieval of the same exact question version and measure correctness, response time, and how early/late the retrieval occurred relative to the proposed due date.

These observations do not identify causal policy effects because the learner follows only one authoritative schedule. Promotion from shadow to authoritative scheduling requires a controlled experiment or another defensible identification design, not retrospective winner-picking from observational data.


## ADR-027 — Scheduler experiments must be immutable, learner-randomized and impossible to auto-start (accepted, 2026-09-27)
A future comparison between `bootstrap-binary-v1` and FSRS must not be activated by changing a feature flag or by retrospectively selecting a preferred policy.

Pre-register each experiment as an immutable, SHA-256-fingerprinted spec version containing control/treatment policy identities, allocation, eligibility contract, metric contract, guardrails, population threshold and assignment salt.

Use learner-level randomization for the first scheduler experiment. Do not alternate scheduler policies per question or per attempt within the same learner because that creates carryover, confusing schedules and ambiguous exposure.

Assignments are deterministic and immutable once created. The randomization bucket is derived from experiment ID/version, learner ID and frozen assignment salt.

An experiment may be armed only when:
- its immutable spec contains an explicit minimum eligible population;
- paired authoritative + shadow scheduling evidence satisfies that threshold;
- the expected spec hash matches;
- an explicit arm confirmation is provided.

Running requires a separate explicit confirmation after arming. The learner application has no endpoint that can perform these transitions.

The initial `scheduler-bootstrap-vs-fsrs-v1@1` spec intentionally omits the population threshold, making that version permanently non-armable. When evidence supports a threshold and finalized analysis plan, create a new immutable version rather than editing the draft.

Experiment infrastructure must not itself change scheduler authority. Authority wiring is a separate future release gate.


## ADR-028 — NeuralVault separates canonical knowledge from learner annotations (accepted, 2026-09-27)
NeuralVault must reuse the Medical Knowledge Graph's stable canonical concept identity rather than create note-specific concept copies.

Canonical notes and personal annotations have different ownership:
- canonical note versions are immutable, source-linked content that must pass content-quality/publication gates;
- personal annotations are mutable learner-owned data linked to the stable concept ID and optionally anchored to the canonical note version visible when the learner wrote the note.

A canonical content update must never silently rewrite a learner annotation. An annotation anchored to an older canonical note should remain intact and be surfaced as update-aware context.

Personal notes are subject to privacy operations, including real deletion. Canonical content retains version history.

NeuralVault must not generate medical prose merely because a concept lacks a published canonical note. An empty canonical layer is preferable to unreviewed medical content presented as authoritative.


## ADR-028 — NeuralVault search follows canonical concept identity and publication boundaries (accepted, 2026-09-27)
NeuralVault search is concept-centered rather than document-centered.

Search may match:
- canonical catalog concept label, aliases and subject tags;
- published canonical-note title/body;
- the authenticated learner's own personal annotations.

Never include draft, in-review, verified-but-unpublished, rejected or retired canonical-note prose in learner search merely because it exists in the database. Publication status is part of the search authorization boundary, not only a UI filter.

Return stable `conceptId` as the navigation identity. QBank and future Study Now links should deep-link using the exact canonical concept ID rather than copied topic names.

Personal annotations remain a distinct learner-owned layer. Search may use their text only for that learner. Canonical note updates do not rewrite annotations; instead expose anchor state explicitly as current, canonical-updated, anchor-unavailable or unanchored.

The current substring search is intentionally simple for the tiny beta corpus. Before large-scale content, replace it with an indexed search layer while preserving the same authorization and concept-identity contract.


## ADR-029 — NeuralVault handoff from Study Now occurs after retrieval and preserves the recommendation reason (accepted, 2026-09-27)
Study Now may deep-link into NeuralVault only after the learner has attempted the question and the server has recorded the answer. Do not show the canonical concept note as a pre-answer shortcut, because that would contaminate retrieval practice.

Recover the handoff reason from the immutable Study Now recommendation receipt on the server rather than browser-only state. Allow only the canonical recommendation classes `mistake-repair`, `due-revision`, and `new-learning`.

Carry the stable canonical `conceptId` plus the allowlisted reason into NeuralVault. The receiving page may explain why the learner arrived, but the handoff is contextual only: it must not mutate score, mastery, personal annotation content, revision state or scheduling.

If no immutable Study Now recommendation exists for the active session, fall back to the ordinary QBank → NeuralVault concept link with no Study Now framing.

This keeps the learning sequence explicit:
retrieval attempt → feedback → explanation of recommendation reason → canonical concept review → later re-test.


## ADR-030 — The Digital Twin starts with observations, not mastery scores (accepted, 2026-09-27)
Separate learner evidence from inferred learner state.

The first Digital Twin contract is a rebuildable, learner-scoped concept observation projection derived from immutable attempts and explicit memory judgments. It may report what happened: correctness, timing, repetition, question-version breadth, self-report coverage and signal discordance.

It must not infer mastery, forgetting, ability or confidence merely because observations exist. Those fields remain explicitly withheld until a versioned inference model has stated evidence requirements and has been validated against relevant outcomes.

Question repetition is not concept breadth. Multiple correct attempts on one exact question version are repeated retrieval evidence for that item, not independent evidence that the learner can transfer the concept to different wording, contexts or clinical presentations.

Memory self-report is complementary evidence rather than ground truth. Missing ratings remain missing, and disagreement between correctness and self-report is preserved for later calibration/misconception analysis.

Catalog labels are presentation metadata and may evolve. Historical learner evidence is keyed to stable canonical concept IDs and exact question versions rather than copied labels.

This boundary supports a future chain:
immutable observations → evidence sufficiency → versioned inference → intervention → outcome validation,
without allowing current UI pressure to create false precision.


## ADR-031 — Mistake Fingerprints classify observed error patterns, not presumed causes (accepted, 2026-09-27)
A wrong answer is an observation, not a diagnosis.

The Mistake Fingerprint may classify longitudinal facts that are directly supported by learner evidence:
- an incorrect response occurred;
- the same exact question was answered incorrectly again;
- the same distractor was selected again on that exact question;
- an explicit Good/Easy recall self-report accompanied an incorrect response;
- the first later retrieval recovered, remained incorrect, or has not yet occurred.

Do not translate those observations directly into labels such as carelessness, guessing, weak knowledge, poor attention, anxiety or failure to study. Those are possible explanations that require additional evidence and, where appropriate, explicit learner input or validated models.

Keep error episodes tied to exact immutable attempt IDs, exact question versions, selected option IDs and canonical concept IDs. This makes the fingerprint rebuildable and lets future content semantics classify distractor meaning without rewriting historical learner evidence.

A repeated distractor can become stronger misconception evidence only when the distractor itself has a reviewed semantic tag. Until then it is merely repeated selection of the same wrong option.

Recovery on a later retrieval is outcome evidence, not proof that the underlying concept is mastered. Transfer and retention remain separate questions.


## ADR-032 — Exam rules are versioned adapters, not hardcoded product behavior (accepted, 2026-09-27)
Keep exam-specific mechanics outside the canonical learner model and core medical-content model.

Represent each exam scheme as an immutable, versioned ruleset with stable `examId`, exact `ruleSetId`, sequential amendment history, effective dates, explicit source provenance and verification state.

A simulator run must pin one exact ruleset version. Never reinterpret an old exam run using today's rules.

Unknown or unverified fields remain null. Do not silently infer question counts, timing, negative marking, section locks, review behavior or carry-forward rules from previous years, coaching conventions or remembered patterns.

A ruleset becomes simulator-eligible only when:
- it is explicitly verified;
- at least one source is official;
- total questions and total duration are known;
- every section's question count and duration are known;
- scoring behavior is complete;
- navigation/locking behavior is complete.

The production exam registry may legitimately be empty. An empty verified registry is safer than a confident but stale preset.

Keep question/PYQ provenance separate from exam mechanics. M08b will normalize provenance to stable exam-occurrence identities rather than expanding the exam-rules object into another content database.


## ADR-033 — Exam occurrence identity, PYQ evidence and exam mechanics are separate objects (accepted, 2026-09-27)
Do not collapse “NEET-PG 2026 existed”, “this question appeared in NEET-PG 2026”, and “NEET-PG 2026 used these simulator rules” into one field.

Use three distinct layers:
1. exam occurrence identity: stable exam + session identity;
2. PYQ evidence: immutable, retractable claims linking exact question versions to that occurrence;
3. exam ruleset: separately versioned and independently verified operational mechanics.

A verified exam occurrence does not make a ruleset simulator-ready.

A recalled PYQ is a reconstructed item, not an exact historical question. It may use single-recall or corroborated-recall evidence, but it must never be represented as licensed/verbatim content merely because multiple people remember it.

An exact-item claim requires licensed provenance and a primary source reference. Rights review remains a separate content-governance concern.

Retractions never rewrite or delete earlier assertions. Current projections omit retracted evidence while the audit trail remains intact.

Exam DNA must later consume these evidence classes explicitly rather than assigning the same weight to recalled and licensed items.


## ADR-034 — A simulator preset represents a published ruleset, not an unconditional promise about examination-day operations (accepted, 2026-09-27)
When an examination authority publishes a concrete scheme but also reserves operational flexibility, preserve both.

For NEET-PG 2026, the NBEMS bulletin publishes a five-section A–E scheme with 36 questions and 42 minutes per section while also stating that the actual number of time-restricted sections may vary based on question count and operational feasibility.

The Medical Learning OS therefore stores the five-section structure as the verified published-scheme preset and stores the authority's operational caveat alongside it. Do not delete the caveat merely because it complicates the simulator.

A simulator run pins the exact ruleset ID and caveats used at run creation. If NBEMS later publishes an amendment, create a new ruleset version rather than mutating historical runs.

Fields that are derived rather than verbatim must be identified as such. For the current preset, no time carry-forward is derived from the fixed section timers, prohibition on early advance, and automatic transition after each allotted section time.

## ADR-035 — Exam DNA describes historical evidence before it predicts anything (accepted, 2026-09-27)
Exam DNA begins as an observation system.

It may count and group active PYQ evidence by exact question version, exam occurrence, canonical concept, subject tag and provenance stratum. It may expose breadth and sparse-evidence warnings.

It must keep licensed exact items, corroborated recalls and single recalls separate. Do not compress those evidence classes into an unexplained confidence score.

Historical frequency must not be presented as the probability that a concept will appear on a future examination. The v1 contract therefore sets `predictiveInferenceEnabled=false`.

Absence from the observed PYQ corpus is not evidence that a concept is unimportant or will not appear. Sparse corpus coverage, rights restrictions, recall bias and changing exam blueprints can all distort historical observations.

Any future predictive Exam DNA model requires a separately versioned inference layer, a defined target, historical back-testing, calibration analysis and comparison against simple baselines. Until then, the system reports evidence, not prophecy.


## ADR-036 — Exam timing locks are server-authoritative and derived from scheduled boundaries (accepted, 2026-09-27)
A browser timer is display state, not examination authority.

Every locked-section exam run pins an exact verified ruleset and absolute scheduled section boundaries at creation. Before accepting an answer or review-state mutation, the trusted simulator must first advance the run clock to the supplied authoritative time and close every elapsed section.

A late or stale client cannot extend a section. Reconnecting after several section boundaries closes all elapsed sections at their scheduled end times rather than at reconnect time.

Do not carry unused time into the next NEET-PG 2026 section. Do not permit early section advance or reopening of a closed section for the pinned published scheme.

Answer keys and correctness are absent from live run state. Scoring occurs only after run completion in the trusted layer.

## ADR-037 — Durable exam runs use immutable transitions plus an optimistic current projection (accepted, 2026-09-27)
Persist exam simulation as two complementary layers:
- an append-only transition ledger for auditability and reconstruction;
- a revisioned current-state projection for fast resume.

Every transition carries a request key, expected state revision, immutable event payload and SHA-256 transition fingerprint. Identical retries are idempotent. Reusing a request key with a different transition is an error. A stale expected revision is an explicit conflict rather than last-write-wins.

Completion is a special atomic transition that also creates exactly one immutable receipt pinned to the exact ruleset used by the run.

Browser clients do not directly mutate exam-run tables or ledgers. They act through trusted application services.

Do not start a nominal 180-question full mock unless 180 distinct eligible reviewed/published question versions can actually be assembled. Duplicating a tiny content pool to satisfy the count would create fake exam realism and corrupt subsequent analytics.


## ADR-038 — Separate exam-rule fidelity from content-mix fidelity and content capacity (accepted, 2026-09-27)
A simulator can faithfully reproduce timing, scoring and navigation while still having an unrepresentative question pool. These are different properties and must never be collapsed into one readiness label.

For every full mock, report at least:
- exact pinned ruleset identity and rule fingerprint;
- required unique question count;
- eligible unique stable-question count;
- shortage;
- assembly-policy identity;
- whether an exam-blueprint content distribution has actually been established.

Published versions of the same stable question count once toward capacity. This prevents version history from manufacturing fake inventory.

The current assembly policy may sample distinct reviewed/published questions deterministically from the available pool, but it is explicitly `unstratified-reviewed-pool` with `examBlueprintFidelity=false`.

Therefore, passing the 180-question capacity gate means only that a technically valid full-length mock can be assembled without duplicate stable items. It does not prove that the subject/topic mix mirrors NEET-PG.

Do not expose answer keys through readiness or assembly APIs. Assembly remains a trusted server operation and the browser receives only the readiness summary until a run is actually created.

## ADR-039 — Full-mock run APIs are trusted, revisioned and section-minimal (accepted, 2026-09-27)
A full-mock browser is a client of the exam state machine, not an authority over it.

Start a run only through the authenticated trusted API. The server resolves learner identity, checks the exact ruleset's capacity gate, generates the assembly seed, deterministically restores the seeded question order, creates the absolute section schedule and persists the initial run through the service-only ledger boundary. The browser cannot choose the learner, exam order, clock or answer key.

Expose only the currently open section's question content and response state. Future sections remain undisclosed through the run view, and correctness/answer keys remain absent until the run reaches trusted completion.

Answer and marked-for-review mutations require both a client request ID and expected state revision. Before accepting either mutation, synchronize the server clock so elapsed sections close at their scheduled boundaries. Identical request retries are resolved from the immutable ledger before stale-revision rejection; reusing a request ID for different intent is rejected.

A server-side completion transition derives the answer key from the pinned exact question versions, applies the pinned ruleset scoring, and atomically stores the immutable completion receipt. No client-provided correctness or score is accepted.

The assembly RPC's selected membership is not treated as sufficient ordering evidence because its returned JSON array is lexicographically aggregated. The trusted runtime reorders that selected set using the same server-generated SHA-256 seed before assigning questions to sections. Same seed means same sequence; different seeds can change sequence without changing membership.

Do not expose an early-section-advance endpoint for a ruleset that forbids early advance. Cancellation and GT Autopsy are separate later slices. The full-mock learner launch remains blocked until the content-capacity gate reaches 180 distinct eligible published questions.

## ADR-040 — Scalable content enters through service-only staging, never directly into publication (accepted, 2026-09-27)
Scaling the reviewed QBank requires a separate intake boundary before the canonical learner catalog.

Accept candidate batches into a server-only staging layer first. Staging records the exact manifest and SHA-256 fingerprint, validates structural integrity, stable IDs, exact source/concept references, answer-key integrity and exact normalized-stem duplicates, but does not make any question learner-visible.

Promotion is an explicit second transition. It revalidates against the current locked catalog and may append only:
- new canonical concepts;
- new sources whose rights state is explicitly `unknown`;
- new stable version-1 questions with empty reviews, no publication timestamp and status `in_review`.

Promotion has no publication authority. Medical, References and Rights review remain the existing immutable evidence gates, and publication remains a separate trusted transition after all three gates pass with current fingerprints.

Intake v1 deliberately accepts only `original` and `ai_generated` provenance. Recalled/licensed PYQ evidence belongs in the separate exam-occurrence/PYQ evidence ledger and must not be smuggled through bulk content intake.

Do not let reviewers become content operators merely because they hold a review grant. Intake staging/promotion remains service-role-only until a separate operator authorization model is designed. Reviewers may receive a read-only pipeline-status view so backlog pressure is visible without widening mutation authority.

Exact normalized-stem deduplication is only a mechanical first gate. It does not claim semantic near-duplicate detection, medical quality scoring or blueprint fidelity. Those require later content-quality systems and measured validation.

Use bounded batches (maximum 100 questions in v1), immutable intake events and an explicit abandon transition. This keeps failed or conflicting batches auditable without deleting history and makes throughput measurable as:
staged → promoted/in-review → gate approvals → verified → published.

## ADR-041 — AI may assist review, but only authenticated reviewers create review authority (accepted, 2026-09-27)
Content-review assistance and content-review authority are separate systems.

An AI/source preflight may summarize current source support, flag ambiguity, suggest a conservative rights classification and expose uncertainty. It must remain explicitly non-authoritative.

Preflight evidence may not:
- create or impersonate a reviewer identity;
- record a Medical, References or Rights decision;
- resolve source-rights evidence under another person's identity;
- advance content to `verified`;
- publish content;
- suppress a detected wording/source concern merely to improve throughput.

The reviewer UI may display preflight evidence next to the exact question/source target, but the reviewer must independently inspect the target and submit their own authenticated decision and notes.

If preflight finds a material wording or source problem, preserve it. Do not auto-correct an already promoted immutable question version in place. Use the normal rejection/new-version path when correction is required.

This keeps the useful loop:
AI/source checking → lower reviewer lookup cost → genuine reviewer decision → immutable evidence,
without turning AI confidence into medical truth.

## ADR-042 — Lexical overlap is a preflight signal, not semantic duplicate truth (accepted, 2026-09-27)
Before scaling candidate batches, surface suspiciously similar question stems without turning a heuristic into publication authority.

Use a deterministic token-set overlap report across:
- questions within the candidate batch;
- candidate questions versus the live catalog;
- candidate questions versus other staged batches.

The report is service-only and advisory. It may flag candidates for human/content-operator inspection, but it does not block staging or promotion by itself.

A lexical-overlap value is not:
- proof that two questions test the same concept;
- proof that two questions are medically redundant;
- a medical-quality score;
- an exam-blueprint signal;
- semantic duplicate detection.

Exact normalized-stem duplication remains a hard mechanical rejection in the intake validator. True semantic deduplication remains a later content-quality capability requiring a separately validated method.

This boundary lets the 25-question scale pilot catch obvious paraphrase clones while preserving uncertainty and avoiding an opaque similarity score as truth.

## ADR-043 — Review assist may prefill editable evidence, never the decision (accepted, 2026-09-27)
The main review bottleneck in the first real content pilot was repeated evidence entry, especially Rights review. Reduce clerical work without weakening reviewer authority.

A review-assist packet may provide:
- source-grounding summaries;
- editable draft Medical/References/Rights notes;
- editable source-policy evidence drafts;
- links to the exact source and rights-policy material.

The reviewer UI may copy those drafts into empty text fields only after an explicit click.

Review assist must never:
- choose Approved or Rejected;
- choose a source-rights outcome;
- submit either form;
- overwrite reviewer-entered text;
- create review/source-rights events;
- verify or publish content.

A prefilled note is therefore draft evidence, not a review decision. The authenticated reviewer remains responsible for inspecting the immutable question/source target, editing or discarding the draft, choosing the outcome and submitting it.

This preserves the useful automation boundary:
source-grounded preflight → lower clerical cost → independent human judgment → authenticated immutable evidence.

## ADR-044 — One replayable evidence ledger feeds one learner-state authority (accepted, 2026-09-27)

Medical Learning OS will not allow each learning subsystem to create its own authoritative mastery state.

Canonical ownership:
- canonical concepts/content/exam evidence describe the object being learned/tested;
- immutable versioned learning events describe what the learner actually did;
- the Preparation Digital Twin owns inferred learner-concept state and uncertainty as a rebuildable, versioned projection;
- Memory Engine contributes retention/forgetting estimates;
- Mistake Intelligence contributes error/misconception/confusion hypotheses with confidence;
- Study Now owns the next-action decision and its policy receipt;
- Adaptive Teaching owns intervention selection after a target is chosen;
- QBank, NeuralVault, mocks, image/clinical engines and AI are actuators/evidence producers;
- analytics is derived and cannot silently become another state authority.

Consequences:
1. No subsystem may introduce a second independent `mastery`, `weakness` or `recommended_action` truth without an explicit ADR.
2. Learner-state projections must be rebuildable from retained evidence and carry model/projection version plus uncertainty/evidence sufficiency.
3. Recommendation decisions must record enough state/policy context to be evaluated later; the recommendation itself is not evidence that the learner needed it.
4. Intervention effectiveness must be measured with later retention/transfer outcomes where feasible, not only immediate accuracy or engagement.
5. Existing `question.answered` v1 history is preserved. New event vocabulary is additive/versioned; historical events are not rewritten for naming consistency.
6. AI can assist classification, explanation, generation and teaching but cannot own durable learner state, medical truth or review authority.
7. PostgreSQL/Supabase remains the authoritative persistence boundary. Future graph/search/analytics stores are rebuildable projections unless a later ADR explicitly changes authority.
8. Database evolution is forward-only from the repository's current timestamped migrations. Old planning sketches must not renumber or replace deployed history.

This ADR does **not** authorize M07c probabilistic mastery inference before evidence-sufficiency/calibration rules and validation data exist. It also introduces no production schema change by itself; implementation remains milestone-gated.

## ADR-045 — One learner ledger means one canonical replay contract, not one giant table (accepted, 2026-09-27)
ADR-044 requires one replayable learner-history authority. Do not satisfy that requirement by prematurely collapsing every modality, policy decision and mutable application row into one generic physical table.

Introduce a versioned canonical replay surface over evidence stores that already have clear semantics. Version 1 maps:
- `question.answered` from immutable attempt receipts as `observation`;
- `memory.rating` from explicit learner self-report as `self_report`;
- `study.recommendation_generated` from Study Now recommendation receipts as `policy_decision`.

Every emitted event carries a stable event key, exact source table/id, recorded/occurred time, canonical concept/question references when available, session reference and source-specific payload.

The stream is:
- service-only;
- read-only;
- deterministically ordered by persisted record time plus event key;
- cursor-paginated;
- explicitly non-authoritative for mastery, forgetting, ability or confidence inference.

Do not force currently unmapped data into the stream merely to increase coverage. In particular:
- mutable `study_sessions` are not session events;
- mutable NeuralVault annotations are learner-owned content, not immutable learning evidence;
- scheduler decision events remain a dedicated policy-decision ledger until a canonical event-family mapping is accepted;
- raw exam-run transition events remain outside until their modality semantics are normalized.

Physical evidence stores may remain specialized. A source becomes part of the canonical learner ledger only after a versioned adapter defines its semantics, traceability and replay behavior.

Current integrity caveat: several pre-ADR evidence tables are application-append-only but do not yet have database UPDATE/DELETE guards. Do not add blanket DELETE blockers until the privacy deletion/de-identification path is defined. Source hardening and privacy purge semantics must be designed together.

## ADR-046 — Future Capability Kernel is a set of seams, not a speculative subsystem (accepted, 2026-09-28)
Medical Learning OS should maximize future optionality while minimizing present infrastructure.

The durable Learning Core remains:
- canonical medical knowledge/content;
- canonical learner evidence and replay;
- Preparation Digital Twin projections;
- Memory and Mistake systems;
- Study Now;
- Adaptive Teaching;
- QBank/NeuralVault/exam/clinical/multimodal actuators;
- analytics and validated research projections.

Technology-specific intelligence, agent, interoperability, identity, trust and cryptographic systems stay outside that core behind small semantic contracts when they earn their complexity.

The first Future Capability foundation is deliberately limited to:
- deterministic canonical serialization + digest metadata;
- a small vendor-neutral capability vocabulary;
- versioned ActionEnvelope / ActionReceipt validation.

Domain code should name stable capabilities such as `learning.study.recommend` rather than vendor/framework names.

Future actors may include humans, system services, institutions or bounded agents, but no actor gains arbitrary database-write authority. Canonical mutation must continue through authorization/policy → domain command → validation → transaction → canonical event/state → receipt.

Do not create unused provider classes merely because a future technology is imaginable. Introduce provider/runtime interfaces when a real implementation boundary exists or replacement cost is material.

Explicitly inactive today:
- commercial/frontier AI SDK dependencies;
- autonomous agent runtime, multi-agent runtime or swarms;
- MCP/A2A servers or protocol-specific internal architecture;
- blockchain/Web3/token/wallet infrastructure;
- ZK proving infrastructure;
- DID/credential-wallet infrastructure;
- production signing keys or signing service;
- post-quantum runtime/libraries.

Activation requires a concrete product, security or interoperability requirement that justifies cost, risk, operational burden and vendor dependency. Basic learning must continue if every optional provider is unavailable.

## ADR-047 — New attestable artifacts use explicit canonicalization/digest profiles; historical hashes are never rewritten (accepted, 2026-09-28)
New integrity-aware contracts may use the shared `canonical-integrity` primitive.

Current profile:
- `profileVersion=1`;
- `canonicalizationAlgorithm=JCS-RFC8785`;
- `digestAlgorithm=SHA-256`.

For supported JSON-domain values:
same logical value → same canonical bytes → same digest, independent of ordinary object property insertion order.

Digest envelopes carry the profile and algorithms with the digest. Unsupported profiles fail closed.

This does **not** migrate, recompute or reinterpret historical fingerprints already stored by content review, exam rules, intake manifests, recommendation policies, NeuralVault or other existing systems. Their historical semantics remain authoritative for those records.

Stable domain/artifact identity must remain independent of any future signature, proof or ledger witness. A later signature/proof layer may bind to a digest, but changing signing/proof technology must not change the underlying artifact identity.

No production signing key, proof system, blockchain anchor, credential system or post-quantum primitive is introduced by this ADR.

## ADR-048 — Learner evidence is append-only in normal operation but erasable through one explicit privacy transaction (accepted, 2026-09-28)
Append-only evidence and privacy rights are both invariants. Neither overrides the other.

Normal operation:
- observed learner evidence, memory self-report, Study Now recommendation receipts, scheduler decision evidence and experiment assignment evidence cannot be UPDATEd or DELETEd;
- exam transition/completion ledgers remain immutable;
- mutable application state such as sessions, revision projections, bookmarks and personal annotations remains mutable under its existing domain rules.

Privacy erasure:
- one service-only transaction may DELETE learner-scoped data across the complete registered privacy scope;
- the transaction uses a narrow transaction-local DELETE bypass that is opened only inside the erasure function and explicitly closed before receipt creation;
- UPDATE remains forbidden even during erasure;
- deletion order respects foreign-key dependencies;
- the function fails closed if any future public table with a `learner_id` column is not mapped into the current privacy scope;
- the function verifies that zero scoped rows remain before returning success.

The durable erasure receipt must not retain learner ID, learner hash/digest, subject ID or other learner-derived identifier. It stores only a random erasure receipt ID, scope/contract version, coarse reason class, total row count and completion time.

Erasure v1 deletes product data only. Supabase Auth user deletion and auth-session/token revocation are separate application/admin operations. For account closure, revoke sessions first, erase product data second, then delete the Auth user. Do not assume deleting `auth.users` first is sufficient; current foreign keys/immutable ledgers intentionally make that fail closed.

De-identification is not implemented in v1 because there is no current population-research store whose retention benefit justifies the additional privacy complexity. If de-identified research retention becomes necessary, define it separately with re-identification risk analysis and explicit retention policy.

Database evolution rule: any new learner-scoped table must update the privacy scope in the same change. A migration that introduces personal learner storage without an erasure mapping is incomplete.

## ADR-049 — Digital Twin inference activates through preregistered evidence gates, never by implementation availability (accepted, 2026-09-28)
M07c probabilistic learner-state inference must not become authoritative merely because a model can be trained or a prediction can be computed.

Every candidate model must use a locked preregistration plan before evaluation. The plan identifies:
- model/version;
- observed target contract;
- baseline comparator;
- evidence-sufficiency criteria;
- validation metrics and pass thresholds;
- claim scope (knowledge, retention, transfer);
- uncertainty/missingness/subgroup evaluation requirements.

Thresholds are **not global constants in the platform**. They are preregistered per candidate before seeing evaluation results, then evaluated deterministically. This avoids both false precision and post-hoc moving of success criteria.

The activation gate has only three outcomes:
1. `blocked` — no inferred learner-state use;
2. `shadow_only` — hidden/non-authoritative predictions may be generated for prospective validation but may not affect learner UI or Study Now;
3. `eligible_for_controlled_experiment` — a separately governed randomized/controlled policy experiment may consume the pinned model version.

The gate can never authorize general production. General production use requires a later explicit governance decision after prospective evidence. The model never owns Study Now policy authority.

Retention or transfer claims require corresponding observed outcome contracts. A model may not infer transfer from recall-only evidence merely because its internal representation supports such a score.

Prospective experiment eligibility additionally requires prospective shadow completion, preregistered prospective metrics, subgroup guardrails, rollback/monitoring plans, a pinned model version, and intervention-attribution readiness.

The gate itself introduces no learner-state table, no mastery score, no model training pipeline and no production prediction. It is a safety/validation contract only.

## ADR-050 — AI review may authorize internal testing but never production publication (accepted, 2026-09-28)

The user authorized Medical Learning OS to perform Medical, References and Rights review autonomously until enough questions exist to exercise the exam-testing path, unless the user explicitly takes review back over.

This creates a separate evidence class rather than weakening or impersonating the human-review system.

AI-test review:
- is recorded in `content_ai_test_review_events` and `content_ai_test_source_rights`;
- identifies the reviewer principal, policy, model label, notes, target/source fingerprint and timestamp;
- is immutable after recording;
- is available only through service-role trusted functions;
- may make an original/AI-generated `in_review` item eligible for **internal simulator testing** after all three AI-test gates are current and approved;
- cannot change the question to `verified` or `published`;
- cannot write human `content_review_events`;
- cannot create production `source_rights_events`;
- cannot grant itself browser or production publication authority.

Production learner content remains governed by the existing human Medical/References/Rights evidence and separate trusted publication transition.

The simulator therefore has two distinct readiness contracts:
- production readiness: human-reviewed, published content only;
- internal-test readiness: production-published content plus explicitly AI-test-reviewed content.

An internal-test-ready mock is not evidence of production content quality or exam-blueprint fidelity.

Autonomous content prioritization should target NEET-PG and INI-CET value. Verified Exam DNA/PYQ evidence has first priority when it exists. When it does not exist, use transparent heuristics such as canonical coverage gaps, prerequisite/clinical-transfer value and source-cluster efficiency, while never inventing exam frequency or PYQ provenance.


## ADR-051 — Versioned media is canonical content, not an attachment field (accepted, 2026-09-28)

The user selected breadth-first remaining content and immediate image-based radiology/pathology expansion.

Do not add arbitrary image URLs directly to question stems or create a second visual-QBank truth store. Introduce a versioned `MediaAsset` domain object and explicit question-media links.

Phase-1 assets bind exact bytes (SHA-256), dimensions, delivery reference, modality, source/provider/original identifier, copyright/licence/rights evidence, diagnosis evidence and review state. Annotations are separately versioned so corrected regions never silently rewrite prior learner interactions.

Blind-first-look is a product/content invariant: pre-answer learner payloads must not expose diagnosis evidence, source/licence metadata, review metadata or ground-truth annotations.

Start with JPEG/PNG/WebP and simple hotspot/bbox/polygon annotations. DICOM, whole-slide pathology, video and advanced imaging are deferred until measured use justifies them.

This foundation does not make an image medically verified or production publishable. Production authority remains separate from AI assistance and from the internal-test lane.


## ADR-052 — Media reuses content review authority and requires normalized image rights (accepted, 2026-09-28)

Do not create a separate medical/reference/rights authority for images. Existing question review events remain authoritative; when a question links media, each gate fingerprint expands to include the exact media material relevant to that gate.

Backward compatibility is mandatory: text-only questions keep the historical fingerprint shape exactly. Adding or changing a media link, exact image bytes, diagnosis evidence, source identity, rights metadata or linked annotation invalidates the applicable current review fingerprint rather than silently reusing old approval.

Image reuse rights must be machine-checkable. Media source records therefore carry `rightsStatus = unknown | owned | licensed | public_domain` in addition to human-readable licence/evidence text. `citation_only` is not sufficient to display/reproduce an image asset and is deliberately excluded.

Browser roles never query canonical media tables directly. Learner delivery goes through a trusted API and a narrow prompt projection that cannot expose diagnosis evidence, rights/provenance metadata or annotations before answer submission.


## ADR-052 — Internal simulator uses a separate authorization and assembly lane (accepted, 2026-09-28)

The 180-question internal simulator pool contains AI-test-reviewed content that is intentionally not production-published. Therefore the production simulator start boundary must remain published-only.

Decision:
- Keep `POST /exam-simulator/runs` on `exam_mock_readiness` + `exam_assemble_mock`.
- Add `POST /exam-simulator/test-runs` for engineering validation only.
- Authorize the test route only from server-verified Supabase Auth `app_metadata.medical_learning_os_internal_tester === true`; never use user-editable metadata.
- Mark every such run `testingOnly=true` and `productionEquivalent=false`.
- Re-check the current authorization grant on every read/mutation of a test run so revocation is effective immediately.
- A production start must not silently resume an internal-test run, and a test start must not silently adopt a production run.
- Reuse the same locked-section state machine, immutable run ledger, scoring path and safe media projection so the engineering test exercises real simulator mechanics without creating a second simulator implementation.

This is a test-access boundary, not a content publication shortcut. AI-test review remains structurally separate from human Medical/References/Rights review and cannot make learner-facing production content eligible.


## ADR-053 — Exam abandonment is a receipt-free terminal state (accepted, 2026-09-28)

A learner who intentionally exits an in-progress mock must not be represented as having completed a scored exam.

Decision:
- keep the persisted terminal status `cancelled` already supported by the exam ledger;
- represent learner-initiated exit with structured termination reason `user_abandoned`;
- close the currently open section at the trusted server timestamp and retain answers/review flags already recorded;
- set no completion timestamp and create no completion/scoring receipt;
- prohibit subsequent answer/review writes to the cancelled run;
- keep request-id idempotency and optimistic revision checks identical to other exam mutations;
- re-check internal-test authorization before allowing a testing-only run to be cancelled;
- do not let browser clients claim `operator_cancelled`; that reason is reserved for a future trusted operator boundary.

Natural timer completion wins over abandonment. Once the server clock has completed the exam, the client cannot retroactively convert it into a cancellation.

This preserves the distinction between **attempt evidence** and **exam completion evidence**, which GT Autopsy and later analytics must respect.


## ADR-054 — GT Autopsy v1 is descriptive before it is inferential (accepted, 2026-09-28)

The first GT Autopsy must use evidence the simulator actually records today rather than pretending the platform already observes active attention, confidence, calibrated item difficulty, fatigue or error causality.

V1 therefore:
- exists only for a genuinely `completed` run with an immutable scoring receipt;
- fails closed if recomputed final response totals disagree with the trusted receipt;
- reports result totals, section performance, canonical primary-concept observations and visual-question outcomes;
- reconstructs answer-change behavior from immutable `answer.set` events and reports exact score impact under the pinned scoring scheme;
- returns at most five descriptive remediation candidates based on observed incorrect/unanswered questions;
- labels those candidates as non-causal and non-inferential.

V1 must not estimate mastery, fatigue, confidence calibration, preventable lost marks or root causes. Those require new telemetry and/or validated models.

A cancelled run has no GT Autopsy because it has no completion/scoring receipt. Future partial-run analytics, if useful, must be a differently named contract rather than silently treating abandonment as a completed GT.

GT Autopsy is a read projection over canonical exam-run state/events/content. It does not own learner state. Future Digital Twin updates must consume explicitly defined exam-evidence events rather than treating an analytics report as evidence itself.


## ADR-055 — Exam Mode is a server-controlled shell, not a second exam engine (accepted, 2026-09-28)

The browser must not duplicate section-transition, timing, scoring or test-content authorization logic.

Exam Mode therefore:
- renders only the current section returned by the trusted exam API;
- allows navigation among questions inside that current section;
- has no early-next-section or reopen-closed-section command;
- derives the visible countdown from a server timestamp plus the server-scheduled section deadline, while the server remains authoritative;
- autosaves answers and review flags through revisioned, idempotent mutations;
- treats revision conflicts or expired sections by refreshing server state rather than forcing a client transition;
- uses the same signed blind-first-look media projection as the QBank;
- calls the separate test-readiness/test-start routes only for the internal engineering lane, which still requires server-side authorization;
- shows GT Autopsy only after a completed run and shows no score/autopsy after cancellation.

This keeps one exam runtime/state machine across production and engineering validation. Browser code is replaceable presentation/orchestration, not exam truth.


## ADR-056 — Intelligence providers execute bounded tasks; learning policy remains outside the provider (accepted, 2026-09-28)

M09 begins with the smallest provider boundary that protects replacement cost without turning the Learning Core into an AI framework.

Decision:
- identify work by semantic Medical Learning OS capability, not vendor/model API names;
- `learning.teaching.render` means a teaching action has already been chosen by trusted learning policy and needs bounded rendering/execution;
- bind each request to a versioned instruction set and output contract;
- pass only explicit structured input and explicit grounding references needed for the task;
- never treat provider conversation/thread memory as canonical learner state;
- require structured provider-attributed results with normalized usage/cost and error fields;
- for required-grounding tasks, returned citations must be drawn only from the grounding references supplied to that task;
- keep Study Now/Adaptive Teaching policy, medical truth, learner evidence, inferred Digital Twin state and publication authority outside the provider;
- do not add a model router, prompt database, run ledger, vendor SDK, agent runtime or fallback orchestration until an active product task and evaluation contract require them.

The v1 citation rule proves **reference containment**, not claim-level factual completeness. A provider citing an allowed source does not prove that every medical claim is supported. Grounded teaching therefore needs a separately validated output/claim contract and evaluation set before learner-facing provider execution is enabled.

Provider failure must remain fail-soft: deterministic study, scoring, revision, canonical explanations and other non-AI learning paths must continue without provider availability.


## ADR-057 — Grounded AI teaching must fail closed to canonical teaching (accepted, 2026-09-28)

A provider may render an intervention already chosen by Adaptive Teaching, but provider prose is never trusted merely because it is fluent or cites an allowed source.

Decision:
- require a capability-specific `grounded-teaching-output@1` rather than free-form tutor prose;
- bind output to the exact concept and teaching action selected upstream;
- require claim-level citations for every ready medical teaching claim;
- require misconception repair to address the exact observed learner belief through explicit correction + discriminator claims;
- impose conservative versioned verbosity ceilings so a model cannot convert a micro-remediation into an essay;
- allow explicit abstention for insufficient grounding or medical uncertainty;
- evaluate deterministically before learner delivery;
- fall back to reviewed canonical teaching content on provider absence, failure, rejection, abstention or evaluation failure;
- never expose invalid provider output as a partial success.

Reference containment is necessary but insufficient for medical correctness. A citation does not prove that the claim is supported by the cited source. Real provider activation therefore remains gated by a curated semantic medical-teaching evaluation set.

During implementation, the canonical JSON array-index validator was found to be incorrectly double-escaped. Fixing that foundational integrity bug is part of this slice because M09 contracts contain normal arrays and cannot be reliably evaluated otherwise.


## ADR-058 — Ship deterministic teaching before provider-generated teaching (accepted, 2026-09-28)

The first learner-facing use of the grounded-teaching contract is reviewed canonical content, not a live model.

Decision:
- on a server-scored incorrect answer, choose only `concise_explanation` unless stronger mistake evidence exists;
- do not infer a misconception from one wrong answer;
- reuse the exact reviewed/published explanation and canonical source identities;
- persist the teaching decision and exact structured teaching payload in the immutable answer receipt;
- render the structured block in the learner UI when valid, with legacy explanation fallback for old/non-conforming receipts;
- do not create an extra teaching block after correct answers merely to increase interaction;
- never truncate or rewrite medical content to force it under a contract limit; fail soft to the existing reviewed path instead.

This gives the future AI provider a real bounded job to improve while proving that the core teaching loop remains functional with zero AI availability.


## ADR-059 — Provider qualification requires human semantic medical evaluation (accepted, 2026-09-28)

Structured output, citation containment and schema validity are necessary but insufficient for medical tutoring.

Decision:
- maintain a curated semantic teaching evaluation set grounded in human-reviewed/published canonical content;
- include both facts that must be preserved and dangerous/incorrect claims that must not appear;
- require explicit human review of medical correctness, correction of the observed learner error and unsupported claims;
- combine deterministic grounding/verbosity checks with human semantic grounding review rather than replacing one with the other;
- make provider qualification conjunctive: one failed required dimension means the case fails;
- give bootstrap sets no production-qualification authority;
- broaden evaluation coverage across specialties, modalities and teaching actions before production provider delivery.

This prevents a fluent, well-cited but medically wrong explanation from passing merely because its JSON shape and source IDs are valid.


## ADR-060 — Provider evaluation cannot promote itself to production (accepted, 2026-09-28)

A model/provider evaluation runner is useful only if it cannot become an accidental deployment authority.

Decision:
- execute semantic teaching cases through the same provider-neutral M09a boundary used by future product calls;
- run M09b deterministic checks before any human semantic review;
- isolate provider failures per case and preview canonical fallback instead of aborting the suite;
- do not permit human pass records for a case that failed deterministic acceptance;
- bind every human semantic review to the exact evaluation-set case and provider-run reference;
- compute bootstrap verdict conjunctively, never by averaging medical failures against good cases;
- keep `productionQualified=false` even if every bootstrap case passes;
- add production qualification only in a separately versioned policy after broader specialty/modality coverage and explicit acceptance criteria are established.

This makes provider testing useful without letting the test harness become a hidden model router or deployment switch.


## ADR-058 — Broaden provider evaluation before adding a production model (accepted, 2026-09-28)

The six-case bootstrap is too narrow to justify a medical teaching provider because it is mostly one infectious-disease cluster and exercises only concise explanation.

Decision:
- preserve that bootstrap unchanged as the first human-reviewed semantic anchor;
- add a separate schema-v2 development breadth set rather than relabel AI-test content as human-reviewed gold;
- exercise every current grounded-teaching action before provider activation;
- test multiple textual task representations and specialties;
- require explicit observed-belief evidence for misconception-repair cases;
- preserve human semantic review as the authority for medical correctness, actual source support and unsupported-claim detection;
- keep all breadth-set outcomes non-authoritative for production provider qualification;
- defer visual/multimodal provider qualification until the provider input contract can carry media explicitly.

This prevents a provider from appearing safe because it performs well on a tiny homogeneous text set.


## ADR-061 — Visual performance enters the canonical evidence stream before visual inference (accepted, 2026-09-28)

M10b must not create a parallel multimodal mastery store.

Decision:
- represent a completed visual task as versioned observed evidence bound to the exact media, question and concept versions;
- distinguish detection, localization, description, interpretation and discrimination because they expose different perceptual failures;
- preserve the learner's observable response, latency and help use separately from trusted evaluation;
- allow localization overlap metrics only for localization tasks;
- project incorrect/partial/unanswered visual interactions into descriptive Mistake observations without assigning a causal error phenotype from one event;
- expose visual evidence to Study Now as a non-authoritative signal while inferred mastery remains owned by the Preparation Digital Twin after validation;
- persist through the existing canonical learner-event architecture rather than introducing a multimodal evidence database.

This keeps the multimodal loop aligned with the system rule: interaction → evidence → validated inference → policy, never interaction → invented mastery.

## ADR-061 — Human semantic review is bound to the exact provider output (accepted, 2026-09-28)

A reviewer must never approve a movable label such as a provider run ID while the actual teaching output can change underneath it.

Decision:
- new M09c provider-evaluation runs are contract v2;
- every deterministic-pass case computes a canonical JCS/RFC-8785 + SHA-256 digest over the exact evaluation case, provider attribution, provider output and citation set;
- schema-v2 human semantic reviews must carry that exact digest;
- finalization rejects stale, substituted or legacy unbound reviews for v2 runs;
- blocked/provider-error cases receive no human-review target;
- historical v1 review contracts remain parseable, but they cannot satisfy a v2 target-bound run;
- this integrity mechanism does not grant production qualification or replace human medical judgment.

This reuses the existing canonical-integrity primitive and makes the future review trail auditable without adding a signing service, blockchain, model vendor or new infrastructure.
