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
