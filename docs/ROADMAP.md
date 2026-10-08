# Implementation roadmap

## Current-state precedence — 2026-10-08

The owner cancelled the fixed 12-question respiratory intake on 8 October 2026. The next input is final polished PYQs, with no fixed question count, three-note target or respiratory-only scope. The existing provenance, PYQ-first deduplication, rights and genuine administrator review gates remain active. The shortening evaluator is optional experiment infrastructure; ordinary PYQ intake does not require unseen holdouts or research enrollment.

The permanent 4 October reset erased the old rabies/CO/anaphylaxis content, exam-occurrence evidence, 180-item internal-test inventory, five media assets and dependent learner/review history. These are historical demonstrations, not live approval queues or material to restore. Engineering/evaluation fixtures and Git history remain excluded from clinical reimport. A read-only check at 2026-10-08T11:08:20.963954Z confirms catalog v407 with zero questions, concepts, sources, notes, media, attempts, sessions and imports, and zero transfer-pair validations/probe assignments.

PR #204 merged as `827b1a02325e31315716da53424f7996c542affa` on 8 October. Main Foundation run 37758541923 passed check/browser jobs; both Cloudflare production builds passed (web 6e080af5-f659-4536-a449-dad972bb3c70; heartbeat f959cf38-217e-4ca2-acee-3f0680c7bd40). The converter, exact-version correction/media proposals and archive-first orchestration are integrated repository code. External ArchivePort/TextStagePort/ReceiptJournal/IndexPort implementations, real archive/staging readback and clinical review/publication remain separate pending operations; no Drive watcher or real material ingestion is implied. [Release](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/204); [CI](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/37758541923).

DONE tracks implementation/history, not current reviewed-content inventory or research eligibility. Old capacity/pilot counts cannot be used as live readiness. M02e/M06e real supplied-content acceptance remains pending.

## 2026-10-04 user-directed canonical library extension
- M02e — IMPLEMENTED; real-content acceptance pending: exclusive PYQ-first homes; repeated exam-year occurrences; non-PYQ platform priority Marrow → PrepLadder → DAMS; deduplicated repository/admin imports; one atomic authorized Review & publish action. Contract: `CONTENT_LIBRARY_CONTRACT.md`.
- M06e — IMPLEMENTED; real-content acceptance pending: Notes/Graph views over one canonical concept library; subject/system/organ/domain/task facets; exact/secondary/confusing question links; private learner observed-state overlays without mastery claims.
- M02f — LATER, DO NOT IMPLEMENT NOW: separate administrator/learner private-import sections, question-only graph, no canonical concept connections, owner isolation/export/erasure and no shared publication.
- Content reset — COMPLETE: owner authorized permanent deletion including dependent history; catalog v407 empty, accounts/admin preserved. PR #198 released; 6 targeted pre-reset R2 objects erased, none remaining; fresh clean backup verified. Repository engineering fixtures are not reimportable content.
- M02g — RELEASED (PR #198): shared Notes/Graph keyword and prompt-text search, unique-question frequency descending, custom upload pattern tags through classification.tasks. Public-review-informed source priority remains Marrow → PrepLadder → DAMS; other platforms unranked.

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
| M08 | Exam adapters and simulation | Versioned exam rules, Exam DNA/PYQ provenance, mocks and GT Autopsy | DONE |
| M09 | AI and adaptive teaching | Provider adapters, grounded explanations, evaluation set, cost limits and review gates | IN PROGRESS |
| M10 | Multimodal and clinical learning | Licensed images, annotations, finding-first exercises, later voice/video encounters | IN PROGRESS |
| M11 | Research and quality validation | Retention endpoints, intervention experiments, data-quality monitoring and outcome review | IN PROGRESS |
| M12 | Community and educator platform | Moderation, verified contributions, import/API contracts and quality-controlled marketplace | PLANNED |
| M13 | Institutions and sustainable business | Privacy-scoped faculty views, entitlements, unit economics and institutional pilots | PLANNED |
| M14 | Operations and scale | Deployment, recovery drills, observability, security review and capacity evidence | IN PROGRESS |

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
- M02b — IN PROGRESS: immutable intake, structural/exact-dedup validation, promotion to in_review and review-assistance infrastructure are implemented. The prior rabies lifecycle and 180-question internal-test capacity are historical pre-reset evidence; the current catalog is empty. Next: genuine polished-PYQ intake and measured human review throughput. Concept-aware near-duplicate infrastructure follows demonstrated need; rights review stays source-first and approvals per item.
- M02c — IN PROGRESS: source-grounded verification contracts, source-focused inspection and non-authoritative review assistance are implemented. The seven-question CDC CO/ASA comparison and its old review targets were erased; they are not pending live approvals. Any new burden/correction comparison must use new supplied eligible originals and actual human decisions. Persistent claim/passages/verification tables remain gated on real measured benefit; review assistance never publishes.
- M02d — IN PROGRESS: learner-originated possible-error reports now have a privacy-safe triage foundation and are wired into the existing authenticated reviewer workspace. The triage migration is live; `review-api` v14 matches current main exactly and the isolated reviewer browser acceptance is green. Human triage may close a report or flag correction required, but it has no canonical/publication/learner-model authority; actual fixes still require a new normal content version and the existing review lifecycle. The remaining gate for DONE is one real learner report followed by one real authorized human triage decision on the hosted path.

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
- M05c — DONE: Study Now v2 hosted completion was independently verified on 2026-09-30 after the learner submitted in Chrome. The original recommendation is closed with 6/6 selected items answered, 6 authoritative schedule receipts and 2 hosted-browser transport receipts; its complete evidence chain and hosted gate both pass. The subsequent one-item mistake-repair session also closes with a complete hosted evidence chain. Memory ratings remain optional; this proves the operational learning loop, not delayed retention or mastery.
- M05d — IN PROGRESS: FSRS-compatible evidence, deterministic shadow scheduling and readiness/experiment foundations are implemented. Prior learner/attempt/rating counts were pre-reset snapshots, not current evidence. The catalog and learning histories are now empty. Production remains bootstrap-binary-v1; FSRS stays shadow-only until a new preregistered population, rating-timing/metric contract and genuine delayed retrieval evidence justify comparison and promotion.


## M06 slices
- M06a — DONE: canonical concept-linked note storage, learner-scoped personal annotation CRUD, export and responsive hosted NeuralVault workspace are live; real hosted create → edit → refresh → delete → refresh lifecycle has passed end to end.
- M06b — DONE: the first real canonical NeuralVault note passed Medical/References/Rights review with matching immutable fingerprints and was separately published server-side; learner publication/search boundaries are live.
- M06c — DONE: learner-safe concept/note search, update-aware annotation anchor states, exact QBank concept deep links and post-retrieval Study Now → NeuralVault contextual handoff are live and tested. The next real due-item handoff observation is tracked under M05c, not as an M06 blocker.
- M06d — IN PROGRESS: learner-private correction overlays now extend the existing NeuralVault annotation layer. Corrections bind exact canonical-note/question versions and never replace canonical content. A separate immutable possible-error report can share correction text only by explicit learner opt-in and has no canonical/learner-model authority. Database, `study-api` v38 and responsive correction browser acceptance are live; repo↔live entrypoint parity is exact. The remaining gate for DONE is one real authenticated hosted learner lifecycle: create private correction → confirm canonical remains unchanged → optionally submit possible-error report → refresh and re-observe the learner-only overlay.


## M07 slices
- M07a — DONE: rebuildable learner-scoped canonical-concept observation projection and authenticated diagnostics endpoint are live. Evidence breadth, repetition, timing, optional memory self-report and discordance are exposed while mastery/forgetting/confidence inference is explicitly withheld.
- M07b — DONE: rebuildable learner-scoped Mistake Fingerprint and authenticated diagnostics endpoint are live, using only observable error recurrence, distractor recurrence, explicit recall discordance and later retrieval outcomes; causal explanations are withheld.
- M07c — PLANNED: introduce versioned inferred learner-state models only after evidence sufficiency/calibration rules and validation data exist.
  - M07c0 — DONE: `digital-twin-inference-activation-v1` pure activation gate enforces preregistration, evidence thresholds, offline validation, claim/outcome alignment, prospective shadow validation and operational guardrails. It can permit shadow-only or controlled-experiment eligibility but never general production.
  - M07c1 — PLANNED: preregister the first real candidate model/target/baseline and its evidence/metric thresholds only when the platform has enough delayed-outcome evidence to justify a power/calibration plan.
  - M07c2 — PLANNED: run the pinned candidate in hidden shadow mode and collect prospective calibration/subgroup evidence.
  - M07c3 — PLANNED: only after M07c2 passes, consider a separately governed controlled Study Now experiment; production inference requires a later explicit ADR.
- Cross-cutting evidence replay bridge — DONE: `study_learning_event_stream_v1` now provides one service-only, versioned replay surface over currently accepted learner-history families without creating a competing learner-state store. This is infrastructure for future M07c/M11 work, not permission to infer mastery.


## M08 slices
- M08a — DONE: versioned exam-rule contract, sequential amendment history, source provenance, verification state and strict simulator-readiness gate are implemented. The production registry intentionally starts empty so no stale or partially verified exam pattern becomes simulator truth.
- M08b — DONE (implementation and historical ingestion acceptance): occurrence identities, immutable/retractable historical evidence and conservative recall classes are implemented. The former INI-CET 2023/NEET-PG 2024 baseline was erased by the reset; there is no current live baseline to reuse. New supplied PYQs populate actual evidenced exam/year/session occurrences; bulk breadth is added only for a concrete learner/Exam DNA need.
- M08c — DONE: Exam DNA v2 descriptively unifies active question-version PYQ evidence with historical reconstructed-item evidence, separates licensed exact/corroborated recall/single recall classes, exposes historical-item breadth and source-lineage uncertainty, and keeps predictive inference explicitly disabled.
- M08d — DONE (runtime and historical acceptance): locked sections, append-only run ledger, immutable receipts, production/test separation, abandonment and GT Autopsy/Exam Mode are implemented with responsive acceptance. The former 180/180 testing corpus and historical exam baseline were erased. Current production mock readiness is zero eligible questions; new reviewed supplied content is needed, not reconstruction from engineering fixtures.

## M11 slices
- M11a — DONE: service-only `study-delayed-retrieval-observations-v1` now links every exact question attempt to its first later same-item retrieval, exact elapsed delay, optional memory rating, originating Study Now recommendation, and schedule-policy decisions. It separately exposes first later different-question/same-concept attempts as transfer candidates with intervening same-item exposure count. Delay coverage at ≥1/7/30/90/180 days is descriptive data availability only; mastery, forgetting-rate and causal inference remain disabled.
- M11b — IN PROGRESS: readiness/protocol foundations are implemented. The old 7-question/6-concept/anaphylaxis-pair readiness snapshot was pre-reset; its published targets are gone. New eligible exact-version families, actual consent and independent activation gates are required before research execution. The cancelled respiratory shortening intake is not an ordinary-PYQ prerequisite.
- M11c — IN PROGRESS: exact-version pair validation, target hashes, stale checks and validated-transfer projections are implemented. The former anaphylaxis pair was erased and must not be restored for approval. The next gate is actual authorized validation of a newly supplied eligible pair, with explicit novelty/construct/reasoning/difficulty/cue-overlap evidence and genuine exposure history.
- M11d — DONE: learner-controlled retention-feasibility opt-in/withdrawal is live, bound to the exact preregistered protocol SHA-256 and included in canonical privacy erasure. Creating the opt-in path does not enroll learners automatically, schedule probes, change Study Now or alter mastery/forgetting inference.
- M11e — DONE (dashboard foundation): the singleton Admin research-gate dashboard exposes current pair/authorization readiness fail-closed. The prior anaphylaxis-pair action is obsolete after erasure; any displayed blocking action must derive from current newly supplied targets. No automatic activation authority follows.
- M11f — IN PROGRESS: M11f1 adds immutable, revocable activation-authorization evidence bound to the exact preregistered protocol SHA-256, exact current human-validated retention-comparable pair and singleton content admin. M11f2 adds a dormant scheduler kernel and immutable learner-scoped assignment ledger. M11f3 adds a service-only delivery-evidence kernel that keeps **assigned → server-served → answered/bound** as separate evidence states, binds the exact learner-safe question payload/hash at server serve time, preserves contaminated outcomes instead of deleting them, and introduces canonical learning-event stream v2 with explicit research-event families. Privacy scope advances to v6. No learner delivery route, render acknowledgement, cron, or automatic execution exists. A later learner-route slice must call the delivery kernel atomically and must not reinterpret “server served” as “learner saw.”
- M11g — DONE (analysis foundation): service-only `study_retention_probe_feasibility_report_v1()` projects the preregistered assignment → server-served → response → clean-response funnel, descriptive clean accuracy, timing, optional memory ratings and explicit contamination counts. Zero denominators return `null` rather than synthetic rates. Nonresponse is **not** labeled transport failure because server-served is not confirmed learner view and render acknowledgement is not yet available. Reporting remains pair-explicit, descriptive-only, with no causal inference, hypothesis testing, mastery fitting or forgetting fitting. The singleton Admin sees this report as research evidence, not as learner analytics.

M11 is now IN PROGRESS because the measurement foundation is live. The current beta evidence correctly reports insufficient true delayed coverage; that insufficiency blocks M07c/M05d promotion rather than being hidden.

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
- M09 intelligence-provider boundary — DONE: `IntelligenceTask@1` / `IntelligenceResult@1` plus a structural `IntelligenceProvider` adapter provide the smallest replaceable execution boundary. Tasks use semantic capabilities, versioned instructions/output contracts, explicit grounding and cost/latency ceilings; results are structured, provider-attributed and citation-bounded. No vendor SDK, router, persistence or provider-owned learner memory is introduced.
- Tool/agent communication/runtime providers — LATER: introduce only when an active feature needs them; MCP/A2A remain adapters rather than internal architecture.
- Signature/credential/proof/ledger providers — LATER / OPTIONAL: no implementation until a concrete trust/credential/interoperability requirement exists.
- Blockchain, ZK and PQC infrastructure — REJECT NOW: preserve crypto agility and proof-readiness through canonical IDs/digests/version metadata rather than deploying speculative infrastructure.

## Cross-cutting privacy and evidence integrity
- Privacy-safe evidence immutability — DONE: normal learner-evidence ledgers are append-only at the database layer while `privacy_erase_learner_data` provides one service-only atomic erasure path.
- Privacy scope completeness — DONE: current erasure scope v2 covers every public table containing `learner_id`, including visual interaction evidence, and fails closed if a future learner table is added without updating the scope.
- Non-identifying erasure receipts — DONE: persistent receipts contain no learner ID/hash; transient per-table counts are returned only to the trusted caller.
- Auth account closure orchestration — LATER / APPLICATION LAYER: trusted backend must revoke sessions/tokens, execute product-data erasure, verify completion, then delete the Supabase Auth user. No learner/browser self-service route is added by this database slice.
- De-identified research retention — LATER / EXPERIMENTAL: do not implement until M11 has a concrete research use, retention policy and re-identification-risk review.

### M02b autonomous content expansion rule
- Autonomous source-grounded drafting/intake may proceed without repeated user intervention.
- New autonomous batches use **25 questions as a floor**, with a maximum of 100 under the existing intake contract; choose the smallest batch that meaningfully closes coverage/testing gaps.
- Prioritize verified NEET-PG/INI-CET Exam DNA/PYQ evidence when available, then canonical coverage gaps, cross-exam/clinical-transfer value, prerequisite value, source-cluster efficiency and duplication avoidance. Never invent exam frequency or PYQ provenance.
- Prefer source-clustered batches because source review can be amortized across multiple original questions.
- AI may perform Medical/References/Rights review under the separate `ai-test-review-v1` contract **only for internal testing** until the verified simulator question requirement is reached or the user takes review over.
- AI-test evidence never becomes human review evidence and cannot set `verified` or `published`.
- Production publication still requires the accepted human review + source-rights contracts.
- Stop autonomous inventory expansion once internal-test readiness meets the verified rule-set requirement, except for replacement of rejected/invalid items.



## M09 slices
- M09a — DONE: provider-neutral intelligence execution boundary with `learning.teaching.render@1`, versioned structured task/result contracts, explicit grounding/citation containment, usage/cost metadata and structural adapter verification. Policy selection and canonical learner/medical state remain outside the provider.
- M09b — DONE: `grounded-teaching-output@1` provides claim-level source binding, action/concept matching, explicit misconception-repair structure, conservative verbosity ceilings, safe abstention and deterministic canonical fallback. The first learner-facing use is also wired: incorrect server-scored QBank answers persist and render a reviewed canonical `concise_explanation` teaching block with exact source references, while correct answers avoid extra remediation. No provider is required.
- M09c — IN PROGRESS: provider-evaluation cases, structured grounded-teaching contracts and exact-output/citation semantic-review digests remain engineering/evaluation artifacts. Their prior human/AI-test counts are historical and are not a current clinical corpus or production-qualified provider. New real provider outputs require authentic semantic review and measured qualification; productionQualified=false remains enforced for AI-test candidates. No erased content is reimported.

## M10 slices
- M10a — IN PROGRESS: versioned media/annotation/link contracts, persistence and learner-safe rendering foundations are implemented. The five old radiology/pathology assets were erased; current media inventory is zero. New permissioned assets, exact byte/version bindings, genuine review/publication and authenticated learner rendering are required for real post-reset acceptance. Portable media delivery integration remains separate.
- M10b — IN PROGRESS: visual persistence, scoring, learner UI and media-bound reviewer task inspection are implemented. The old pathology detection target was erased and is not awaiting approval. Use new permissioned supplied image content, current exact task/asset bindings and genuine Medical/References/Rights decisions, then verify the authenticated learner flow.
- M14a — IN PROGRESS: weekly private R2 backups, freshness-gated latest-backup recovery, and live Supabase service-boundary drift checks are operational. Run 36449290932 restored the newest 2026-09-27 backup successfully; the database audit now proves all 25 RLS/no-policy tables are browser-inaccessible and all 68 SECURITY DEFINER functions are backend-only, with 0 browser-executable public functions after revoking one residual trigger-function grant. Weekly backup fails closed on future privilege drift. Remaining M14 gates are Auth leaked-password hardening, consolidated service/alert evidence, explicit Render health re-audit and production-shaped capacity/load evidence.
- M10c — LATER: DICOM/DICOMweb, CT/MRI stacks, whole-slide pathology, measurements and multi-series studies only after Phase-1 usage proves the need.

## Beta application / governance transition
- Beta root UI — RELEASED: Preparation Command Center and compact learner navigation replace the demo-first production landing.
- Demo public surface — RETIRE: legacy local-demo modules remain non-production scaffolding only and are no longer served from the app root/runtime allowlist.
- Singleton content admin — RELEASED: server-authorized beta admin owns Medical/References/Rights review authority; learners cannot approve.
- Admin Console — RELEASED: content review and current exact-pair validation surfaces exist with immutable human attestation; empty/erased targets create no review or activation authority.
- Multi-reviewer / institutional governance — LATER: expand the same grant/event substrate only when real organizational workflows require it.
