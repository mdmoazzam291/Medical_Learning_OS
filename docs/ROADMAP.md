# Implementation roadmap

Status: DONE means implemented and checked; NEXT means the next bounded task; PLANNED means not implemented. IDs remain stable as sub-tasks are added.

| ID | Parent category and ownership | Deliverable / exit condition | Status |
|---|---|---|---|
| M00 | Project governance and memory | README, AI instructions, decision log, roadmap, working verification commands | DONE |
| M01 | Learning data foundation | Versioned attempt contract and deterministic accuracy projection with retry protection | DONE |
| M02 | Canonical knowledge and content | Concept IDs, versioned questions, references, licensing provenance and draft/review/publish workflow | DONE |
| M03 | Learner application and access | Responsive shell, learner settings, identity strategy, storage choice and accessible navigation | DONE |
| M04 | Core study loop and QBank | Start/resume, answer, explanation, bookmark, incorrect queue, persistence and end-to-end checks | DONE |
| M05 | Revision and study planning | Due queue, configurable workload, tested scheduler, interruption-friendly intern mode | IN PROGRESS |
| M06 | NeuralVault | Canonical concept notes, personal annotations, search, export and update-safe links | DONE |
| M07 | Digital Twin and diagnostics | Evidence-backed learner projections, Mistake Fingerprint, uncertainty and actionable analytics | IN PROGRESS |
| M08 | Exam adapters and simulation | Versioned exam rules, Exam DNA/PYQ provenance, mocks and GT Autopsy | IN PROGRESS |
| M09 | AI and adaptive teaching | Provider adapters, grounded explanations, evaluation set, cost limits and review gates | PLANNED |
| M10 | Multimodal and clinical learning | Licensed images, annotations, finding-first exercises, later voice/video encounters | PLANNED |
| M11 | Research and quality validation | Retention endpoints, intervention experiments, data-quality monitoring and outcome review | PLANNED |
| M12 | Community and educator platform | Moderation, verified contributions, import/API contracts and quality-controlled marketplace | PLANNED |
| M13 | Institutions and sustainable business | Privacy-scoped faculty views, entitlements, unit economics and institutional pilots | PLANNED |
| M14 | Operations and scale | Deployment, recovery drills, observability, security review and capacity evidence | PLANNED |

## Dependency rules
M00 → M01 → M02 → M03 → M04 is the first delivery path. M05 and M06 follow the persisted core loop. M07 needs sufficient longitudinal data. M08 builds on content provenance and question versions. M09 needs reviewed sources and evaluations. M10 reuses content/versioning. M12/M13 wait for a useful individual product. M11 measurement design and M14 basic security start during M03; advanced research and scale arrive later.

## Completed M02 tasks
- [x] Define concept and question-version schemas with stable IDs and references.
- [x] Add a small original content fixture, clearly marked draft until medically reviewed.
- [x] Validate answer-option IDs, concept links, provenance and review status.
- [x] Reject unpublished content from learner-facing selection.
- [x] Document the review and update workflow; preserve earlier question versions.

## M02 scale extension
- M02a — DONE: canonical concept/question versioning, provenance, review and publication gates.
- M02b — IN PROGRESS: service-only immutable batch intake, structural/exact-dedup validation, atomic promotion to `in_review`, reviewer-visible backlog status and non-authoritative review assist are live. The first real 5-question rabies PEP pilot completed the full intake → authenticated Medical/References/Rights review → trusted publication lifecycle and increased published stable inventory from 1 to 6. Remaining work is a larger measured batch, semantic near-duplicate detection and later blueprint-aware content planning.

## Completed M03 / immediate M04 task
M03 includes the responsive shell, local storage/identity contract and nonclinical study-session path, verified at phone/tablet/desktop Chromium sizes. M04 is next: authorized application services, server persistence, trusted scoring and reviewed medical content. Local demo progress is not production medical evidence.

## MVP release gate
M02–M06 minimal paths work together; progress survives reload; data export works; errors do not lose attempts; content is reviewed; responsive flows are exercised; no secrets reach clients. Later systems are not release prerequisites.

## M04 slices
- M04a — DONE: credential-scoped server API, SQLite persistence, trusted scoring, publication eligibility, immutable receipts, retries, bookmarks, export and failure/restart tests. Local and GitHub checks passed.
- M04b — DONE: Supabase Auth/session adapter, account UI, authenticated cloud adapter and JWT-gated `study-api` are live; refresh behavior and two-distinct-real-account read/write isolation passed on the hosted path. No browser-stored operator credential shortcut.
- M04c — DONE: authenticated reviewer workflow, gate-specific immutable evidence, source-rights resolution, first genuinely reviewed/published medical item, authenticated server-scored learner attempt, and live responsive medical QBank.

M04 is complete: all three slices and the authenticated medical learner flow passed their release gates, including two-distinct-real-account read/write isolation.


## M05 slices
- M05a — DONE: rebuildable per-question revision evidence and versioned due-queue policy boundary. The provisional binary bootstrap policy is test scaffolding, not mastery inference.
- M05b — DONE: persisted learner-scoped revision projection, authenticated due-queue API and hosted learner-page verification are live.
- M05c — IN PROGRESS: time-budgeted Study Now v2, explainable mistake-repair/due-revision/new-learning classes, immutable recommendation receipts and descriptive outcome projection are live; a real due-item hosted start → answer → reschedule proof remains.
- M05d — IN PROGRESS: FSRS-compatible memory evidence, deterministic shadow scheduling, immutable policy evaluation and an inert randomized-experiment framework are live; production remains bootstrap-controlled until real fully-rated histories and delayed-retrieval evidence justify a separately versioned experiment.


## M06 slices
- M06a — DONE: canonical concept-linked note storage, learner-scoped personal annotation CRUD, export and responsive hosted NeuralVault workspace are live; real hosted create → edit → refresh → delete → refresh lifecycle has passed end to end.
- M06b — DONE: the first real canonical NeuralVault note passed Medical/References/Rights review with matching immutable fingerprints and was separately published server-side; learner publication/search boundaries are live.
- M06c — DONE: learner-safe concept/note search, update-aware annotation anchor states, exact QBank concept deep links and post-retrieval Study Now → NeuralVault contextual handoff are live and tested. The next real due-item handoff observation is tracked under M05c, not as an M06 blocker.


## M07 slices
- M07a — DONE: rebuildable learner-scoped canonical-concept observation projection and authenticated diagnostics endpoint are live. Evidence breadth, repetition, timing, optional memory self-report and discordance are exposed while mastery/forgetting/confidence inference is explicitly withheld.
- M07b — DONE: rebuildable learner-scoped Mistake Fingerprint and authenticated diagnostics endpoint are live, using only observable error recurrence, distractor recurrence, explicit recall discordance and later retrieval outcomes; causal explanations are withheld.
- M07c — PLANNED: introduce versioned inferred learner-state models only after evidence sufficiency/calibration rules and validation data exist.
- Cross-cutting evidence replay bridge — DONE: `study_learning_event_stream_v1` now provides one service-only, versioned replay surface over currently accepted learner-history families without creating a competing learner-state store. This is infrastructure for future M07c/M11 work, not permission to infer mastery.


## M08 slices
- M08a — DONE: versioned exam-rule contract, sequential amendment history, source provenance, verification state and strict simulator-readiness gate are implemented. The production registry intentionally starts empty so no stale or partially verified exam pattern becomes simulator truth.
- M08b — IN PROGRESS: stable exam occurrence identities, immutable/retractable PYQ evidence, and the simulator-ready NEET-PG 2026 published-scheme preset are live and source-verified; genuine historical PYQ evidence ingestion remains the open data task.
- M08c — DONE: service-only and authenticated descriptive Exam DNA observations are live, separated by licensed exact/corroborated recall/single recall evidence with breadth and uncertainty; predictive inference is explicitly disabled.
- M08d — IN PROGRESS: deterministic locked-section state machine, durable append-only run ledger, immutable completion receipts, runtime rules mirror, authenticated mock-readiness API, distinct-question assembly gate, learner readiness UI and trusted run-start/resume/read/answer/review API are live; v24 passed deployed auth/CORS smoke verification. Remaining gates are 180-question content capacity, authenticated hosted end-to-end full-mock proof, cancellation/abandon semantics and GT Autopsy.

## Canonical learning-intelligence architecture

Accepted 2026-09-27 as a cross-cutting roadmap guardrail. This does **not** reset milestone numbering, reopen completed work, or replace the current timestamped Supabase migration history.

The durable core is:

```text
Canonical medical concepts + versioned content/exam evidence
                         ↓
              immutable learning evidence
                         ↓
              Preparation Digital Twin
             ↙          ↓          ↘
       Memory model  Mistake model  uncertainty
             \          |          /
                      Study Now
                         ↓
               Adaptive Teaching
                         ↓
          question / recall / image /
             NeuralVault / case / AI
                         ↓
              new learning evidence
                         ↺
```

Ownership rules:
- The learning/evidence ledger is the replayable historical source of learner observations.
- The Preparation Digital Twin owns inferred learner state. Its projections must remain rebuildable and uncertainty-aware.
- Memory Engine estimates retention/forgetting; Mistake Intelligence estimates error mechanisms/confusions. Neither owns a competing mastery database.
- Study Now owns **what the learner should do next**. Adaptive Teaching owns **how a selected target should be taught or remediated**.
- QBank, NeuralVault, clinical cases, image drills, mocks and AI are content/interaction actuators and evidence producers, not independent learner-state authorities.
- Exam DNA changes objective weighting and exam-specific evidence; it does not redefine canonical medical truth.
- Analytics reads canonical events/projections and must not create a parallel source of learner truth.
- AI remains behind provider-independent task contracts and may assist inference/delivery, but it does not own medical truth, learner history or durable mastery state.

### Architecture-preserving implementation sequence

Keep the current M05–M08 work moving; add the following only at the milestone where it becomes necessary:

1. **M05/M07 telemetry preservation:** continue capturing stable IDs, exact content versions, timing, answer changes, confidence/help signals when explicitly collected, intervention/recommendation IDs, and delayed/transfer outcomes.
2. **M07c inferred state contract:** when validation data are sufficient, introduce a versioned learner-concept state projection with separate knowledge, retention, reasoning/transfer, speed, calibration and uncertainty dimensions. Do not collapse these into one permanent mastery percentage.
3. **Intervention outcome linkage:** before adaptive teaching optimization, preserve state-before → intervention → immediate outcome → delayed retention → transfer so later policies can be evaluated causally rather than from click/accuracy correlations.
4. **Study Now policy history:** every generated recommendation should be attributable to a policy/model version and its candidate/constraint context so recommendation quality can be evaluated and replayed.
5. **M09+ AI/adaptation:** AI may classify, explain, generate or teach only through versioned contracts; persistent learner state stays outside provider conversation memory.
6. **M10+ clinical/multimodal:** new interaction types emit the same canonical evidence vocabulary rather than inventing separate analytics stores.
7. **Long term:** population models may learn forgetting, misconception, prerequisite and intervention-effectiveness relationships, but must remain distinguishable from canonical medical knowledge and individual observed evidence.

### Non-negotiable migration rule

All database evolution is **forward-only from the repository's existing timestamped migrations**. Do not introduce replacement "001–007" migrations, renumber history, or rebuild the live schema from an old planning sketch. New schema work must inspect the deployed/current schema first and add narrowly scoped migrations with rollback/rebuild implications documented.

## Cross-cutting Future Capability foundation
- Future Capability doctrine — ACCEPTED: maximize future optionality with minimum present infrastructure. The Learning Core must survive changes in AI vendors/models, agent frameworks, interoperability protocols, trust systems, cryptography, cloud providers and exam systems.
- Canonical integrity primitive — DONE: deterministic JCS/RFC-8785 canonicalization plus SHA-256 digest envelopes with explicit profile/algorithm metadata. Historical hashes are not rewritten.
- Semantic capability vocabulary — DONE: a small static vendor-neutral registry defines current semantic capabilities without runtime discovery, marketplace infrastructure or provider names.
- Action contracts — DONE: pure v1 ActionEnvelope/ActionReceipt validators establish actor/capability/reference/digest/policy/audit seams without changing existing APIs or granting execution authority.
- M09 intelligence-provider boundary — PLANNED: introduce the smallest provider interface only when AI/adaptive teaching actually needs a replaceable model implementation.
- Tool/agent communication/runtime providers — LATER: introduce only when an active feature needs them; MCP/A2A remain adapters rather than internal architecture.
- Signature/credential/proof/ledger providers — LATER / OPTIONAL: no implementation until a concrete trust/credential/interoperability requirement exists.
- Blockchain, ZK and PQC infrastructure — REJECT NOW: preserve crypto agility and proof-readiness through canonical IDs/digests/version metadata rather than deploying speculative infrastructure.

