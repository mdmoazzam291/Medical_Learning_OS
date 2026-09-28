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
| M09 | AI and adaptive teaching | Provider adapters, grounded explanations, evaluation set, cost limits and review gates | IN PROGRESS |
| M10 | Multimodal and clinical learning | Licensed images, annotations, finding-first exercises, later voice/video encounters | IN PROGRESS |
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
- M02c — IN PROGRESS: source-grounded verification contract v1 is implemented as a non-authoritative layer before the existing production review gates. It validates atomic claim candidates, exact source-version/locator/digest evidence, claim-specific authority requirements, deterministic QA results and routine/focused/expert review routing. `citation_only` is aligned across the pure content domain and the live rights model. Persistence/API tables for passages/claim candidates/verification packets are specified but deliberately not live until a controlled grounding batch proves measurable review-time benefit without worse correction rates. The first real seven-question CDC carbon-monoxide grounding pilot now binds seven exact claim-evidence digests to one source and expects 5 focused / 2 expert packets; persistence remains gated because reviewer-time and correction-rate benefit is not yet measured.

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
- M05c — IN PROGRESS: time-budgeted Study Now v2, explainable mistake-repair/due-revision/new-learning classes, immutable recommendation receipts and descriptive outcome projection are live. A real overdue QA item has now passed the hosted Supabase backend path end to end: recommendation session → correct answer → revision rebuild → authoritative schedule receipt → next-day reschedule → session close, with all identities/due timestamps aligned. Remaining gate is transport-only: repeat the same cycle through the authenticated Study Now HTTP/browser route.
- M05d — IN PROGRESS: FSRS-compatible memory evidence, deterministic shadow scheduling, immutable policy evaluation and an inert randomized-experiment framework are live; production remains bootstrap-controlled until real fully-rated histories and delayed-retrieval evidence justify a separately versioned experiment.


## M06 slices
- M06a — DONE: canonical concept-linked note storage, learner-scoped personal annotation CRUD, export and responsive hosted NeuralVault workspace are live; real hosted create → edit → refresh → delete → refresh lifecycle has passed end to end.
- M06b — DONE: the first real canonical NeuralVault note passed Medical/References/Rights review with matching immutable fingerprints and was separately published server-side; learner publication/search boundaries are live.
- M06c — DONE: learner-safe concept/note search, update-aware annotation anchor states, exact QBank concept deep links and post-retrieval Study Now → NeuralVault contextual handoff are live and tested. The next real due-item handoff observation is tracked under M05c, not as an M06 blocker.


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
- M08b — IN PROGRESS: stable exam occurrence identities, immutable/retractable PYQ evidence, and the simulator-ready NEET-PG 2026 published-scheme preset are live and source-verified; genuine historical PYQ evidence ingestion remains the open data task.
- M08c — DONE: service-only and authenticated descriptive Exam DNA observations are live, separated by licensed exact/corroborated recall/single recall evidence with breadth and uncertainty; predictive inference is explicitly disabled.
- M08d — IN PROGRESS: locked-section runtime, append-only run ledger, immutable completion receipts, production/test assembly separation, explicit receipt-free abandonment, descriptive GT Autopsy v1 and the dedicated Exam Mode shell are implemented. Internal-test capacity is 180/180. The real 180-question five-section runtime passed accelerated full-length acceptance, and a separate synthetic internal QA identity has now exercised the live hosted readiness/start/answer/review/cancel/readback/autopsy-gating path successfully on study-api v32. The smoke also found and fixed a global query-routing bug affecting readiness/Exam DNA. Existing learner identities remain untouched. Remaining gate is browser-only visual/interaction verification across phone/tablet/desktop widths; no backend/runtime blocker remains.

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
- M09c — IN PROGRESS: the original 6-case human-reviewed bootstrap remains intact, and a separate 12-case schema-v2 breadth set now exercises all four grounded-teaching actions across anesthesia, cardiology, critical care, dermatology, neurology, obstetrics, ophthalmology, psychiatry, asthma, COPD, resuscitation and toxicology, spanning factual recall, clinical vignette, management decision and discrimination tasks. All 12 candidates have current AI-test Medical/References/Rights evidence but are not human production-reviewed; human semantic review remains mandatory and `productionQualified=false` is structurally preserved. Visual/multimodal provider qualification remains separate until a media-bearing teaching-task contract exists. New provider-evaluation run v2 also binds every human semantic review to a canonical SHA-256 digest of the exact case + provider output + citations, so stale or substituted outputs cannot reuse approval.

## M10 slices
- M10a — IN PROGRESS: provider-independent Phase-1 MediaAsset/annotation/question-link contract plus hosted immutable persistence, normalized media-rights state, media-bound review fingerprints and authenticated learner-safe media API are live. Exact-byte private storage and signed learner delivery are implemented with five CC0 radiology/pathology assets. First sourced multimodal pilot is linked and media-bound AI-test review is verified. Remaining M10a production gate is human-reviewed/published image content plus authenticated learner rendering of such published content; internal engineering path is proven.
- M10b — IN PROGRESS: visual persistence, server-scored detection, learner UI wiring, media-bound reviewer inspection, and canonical review-bound task metadata are implemented. The first pathology image is explicitly classified as immutable schema-v1 `detection`; the same descriptor appears in learner delivery and all three human review targets. Adding the descriptor correctly invalidated the older AI-test hashes. No human review has occurred. Next gate is now purely human authority: inspect and approve Medical, References and Rights for the current target; then publish and run the full authenticated learner flow.
- M10c — LATER: DICOM/DICOMweb, CT/MRI stacks, whole-slide pathology, measurements and multi-series studies only after Phase-1 usage proves the need.
