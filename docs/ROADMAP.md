# Implementation roadmap

## 2026-10-04 user-directed canonical library extension
- M02e — IMPLEMENTED; real-content acceptance pending: exclusive PYQ-first homes; repeated exam-year occurrences; non-PYQ platform priority Marrow → PrepLadder → DAMS; deduplicated repository/admin imports; one atomic authorized Review & publish action. Contract: `CONTENT_LIBRARY_CONTRACT.md`.
- M06e — IMPLEMENTED; real-content acceptance pending: Notes/Graph views over one canonical concept library; subject/system/organ/domain/task facets; exact/secondary/confusing question links; private learner observed-state overlays without mastery claims.
- M02f — LATER, DO NOT IMPLEMENT NOW: separate administrator/learner private-import sections, question-only graph, no canonical concept connections, owner isolation/export/erasure and no shared publication.
- Content reset — LIVE DATABASE/MEDIA DONE: owner authorized permanent deletion including dependent history; catalog v407 empty, accounts/admin preserved. Bounded pre-reset R2-copy erasure is prepared, not executed; GitHub publication blocked by automatic approval review. Repository engineering fixtures are not reimportable content.
- M02g — IMPLEMENTED LOCALLY, RELEASE BLOCKED: shared Notes/Graph keyword and prompt-text search, unique-question frequency descending, custom upload pattern tags through classification.tasks. Public-review-informed source priority remains Marrow → PrepLadder → DAMS; other platforms unranked.

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
- M02b — IN PROGRESS: service-only immutable batch intake, structural/exact-dedup validation, atomic promotion to `in_review`, reviewer-visible backlog status and non-authoritative review assist are live. The first real rabies pilot completed the full production lifecycle; the internal-test inventory reached 180/180 without publishing AI-test content. The live catalog currently has 180 questions mapped to 180 distinct primary concepts, so heavier semantic-near-duplicate infrastructure is not an immediate blocker; the existing advisory lexical overlap preflight remains active. Next production work is measured human review throughput and later concept-aware duplicate detection when repeated primary concepts/question families actually appear. Rights operations remain source-first while per-question approval stays separate.
- M02c — IN PROGRESS: source-grounded verification, the seven-question CDC CO pilot, source-focused inspection and non-authoritative review assist are live. The original 14-submit References workflow has been superseded operationally by `m02c-references-workflow-v2`: the same matched 7 CO claim-first vs 7 ASA standard comparison is completed as two human review sessions, with seven independent per-item decisions/notes submitted atomically per arm and one session-level timing receipt. No item is automatically approved, and publication authority remains separate. Persistent passage/claim/verification-packet tables remain gated until real human completion of both v2 arms demonstrates lower review burden without a worse correction signal. A separate full-question review bundle can reduce one exact unreviewed question with valid source rights to one explicit human attestation while still producing three immutable Medical/References/Rights receipts; it is disabled inside the measured M02c arms.
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
- M05d — IN PROGRESS: FSRS-compatible memory evidence, deterministic shadow scheduling, immutable policy evaluation and an inert randomized-experiment framework are live. A service-only `study-memory-engine-evidence-readiness-v1` projection now makes promotion blockers explicit without inventing thresholds. Earlier readiness snapshot (before the subsequently verified Chrome completion) was **3 learners / 10 attempts / 2 explicit memory ratings (20% coverage) / 0 fully-rated learner-question histories / 3 same-item follow-ups / 0 follow-ups ≥1 day / 0 paired bootstrap-vs-FSRS shadow decisions**. The current experiment remains draft with no preregistered minimum population and a draft metric contract. Rating-timing eligibility is also not preregistered; one observed rating lag is many hours after its attempt, so timing quality cannot be silently assumed. Production remains `bootstrap-binary-v1`; FSRS remains shadow-only and cannot be armed or promoted from this evidence.


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
- M08b — DONE (minimum evidence baseline): stable exam occurrence identities and immutable/retractable historical evidence are live. The baseline now contains one INI-CET 2023 reconstructed recall and one NEET-PG 2024 reconstructed recall, spanning two exams, two years and two verified exam occurrences. Both remain conservatively `single_recall` because independent upstream recall lineage is not established. This is sufficient to prove genuine multi-exam/multi-year ingestion and unblock downstream work; bulk historical ingestion is no longer a milestone gate and resumes only when a specific Exam DNA analysis, validation experiment or learner-facing policy requires more breadth.
- M08c — DONE: Exam DNA v2 descriptively unifies active question-version PYQ evidence with historical reconstructed-item evidence, separates licensed exact/corroborated recall/single recall classes, exposes historical-item breadth and source-lineage uncertainty, and keeps predictive inference explicitly disabled.
- M08d — DONE: locked-section runtime, append-only run ledger, immutable completion receipts, production/test assembly separation, explicit receipt-free abandonment, descriptive GT Autopsy v1 and the dedicated Exam Mode shell are implemented. Internal-test capacity is 180/180; hosted API acceptance passed on a separate synthetic QA identity. Responsive browser acceptance also passes at 390×844, 820×1180 and 1440×1000, covering readiness separation, start, 36-question palette, server autosave, mark/unmark review, navigation, reload restoration, completed-run GT Autopsy resume, cancellation-without-score and horizontal-overflow checks. With the minimum genuine historical evidence baseline now spanning INI-CET 2023 and NEET-PG 2024, M08 is DONE.

## M11 slices
- M11a — DONE: service-only `study-delayed-retrieval-observations-v1` now links every exact question attempt to its first later same-item retrieval, exact elapsed delay, optional memory rating, originating Study Now recommendation, and schedule-policy decisions. It separately exposes first later different-question/same-concept attempts as transfer candidates with intervening same-item exposure count. Delay coverage at ≥1/7/30/90/180 days is descriptive data availability only; mastery, forgetting-rate and causal inference remain disabled.
- M11b — IN PROGRESS: M11b0 structural readiness and M11b1 protocol preregistration are DONE. The reviewed anaphylaxis alternate `emergency:anaphylaxis:no-rash-first-action@1` is separately published, giving live readiness **7 published questions / 6 primary concepts / 1 published alternate pair**. Immutable `retention-probe-feasibility-v1` preregisters a 7-day target with a 6–8 day window, contamination rules, descriptive outcomes, hard feasibility caps, explicit learner opt-in requirement and zero activation authority. Probe scheduling remains disabled.
- M11c — IN PROGRESS: immutable exact-version pair validation, current-target hash binding, stale-validation detection and service-only `study_validated_transfer_observations_v1()` are live. Pair metadata separates surface novelty, construct alignment, reasoning alignment, difficulty comparability and cue-overlap risk; generic transfer validity is distinct from stricter retention-probe comparability. A clean observed transfer also requires no prior target attempt and no intervening same-concept attempt. No pair decision has been fabricated or persisted; the immediate gate is one authorized human validation of the published anaphylaxis pair.
- M11d — DONE: learner-controlled retention-feasibility opt-in/withdrawal is live, bound to the exact preregistered protocol SHA-256 and included in canonical privacy erasure. Creating the opt-in path does not enroll learners automatically, schedule probes, change Study Now or alter mastery/forgetting inference.
- M11e — DONE: the singleton Admin console now exposes a canonical, fail-closed research-gate dashboard derived from `study_retention_probe_activation_readiness_v1()`. It promotes pending M11c human pair review as the blocking admin action and explicitly exposes that separate activation authorization is still absent. There is no activation control or scheduler authority.
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
- M09c — IN PROGRESS: the original 6-case human-reviewed bootstrap remains intact, and a separate 12-case schema-v2 breadth set now exercises all four grounded-teaching actions across anesthesia, cardiology, critical care, dermatology, neurology, obstetrics, ophthalmology, psychiatry, asthma, COPD, resuscitation and toxicology, spanning factual recall, clinical vignette, management decision and discrimination tasks. All 12 candidates have current AI-test Medical/References/Rights evidence but are not human production-reviewed; human semantic review remains mandatory and `productionQualified=false` is structurally preserved. Visual/multimodal provider qualification remains separate until a media-bearing teaching-task contract exists. New provider-evaluation run v2 also binds every human semantic review to a canonical SHA-256 digest of the exact case + provider output + citations, so stale or substituted outputs cannot reuse approval.

## M10 slices
- M10a — IN PROGRESS: provider-independent Phase-1 MediaAsset/annotation/question-link contract plus hosted immutable persistence, normalized media-rights state, media-bound review fingerprints and authenticated learner-safe media API are live. Exact-byte private storage and signed learner delivery are implemented with five CC0 radiology/pathology assets. First sourced multimodal pilot is linked and media-bound AI-test review is verified. Remaining M10a production gate is human-reviewed/published image content plus authenticated learner rendering of such published content; internal engineering path is proven.
- M10b — IN PROGRESS: visual persistence, server-scored detection, learner UI wiring, media-bound reviewer inspection, and canonical review-bound task metadata are implemented. The first pathology image is explicitly classified as immutable schema-v1 `detection`; the same descriptor appears in learner delivery and all three human review targets. Adding the descriptor correctly invalidated the older AI-test hashes. No human review has occurred. Next gate is now purely human authority: inspect and approve Medical, References and Rights for the current target; then publish and run the full authenticated learner flow.
- M14a — IN PROGRESS: weekly private R2 backups, freshness-gated latest-backup recovery, and live Supabase service-boundary drift checks are operational. Run 36449290932 restored the newest 2026-09-27 backup successfully; the database audit now proves all 25 RLS/no-policy tables are browser-inaccessible and all 68 SECURITY DEFINER functions are backend-only, with 0 browser-executable public functions after revoking one residual trigger-function grant. Weekly backup fails closed on future privilege drift. Remaining M14 gates are Auth leaked-password hardening, consolidated service/alert evidence, explicit Render health re-audit and production-shaped capacity/load evidence.
- M10c — LATER: DICOM/DICOMweb, CT/MRI stacks, whole-slide pathology, measurements and multi-series studies only after Phase-1 usage proves the need.

## Beta application / governance transition
- Beta root UI — DONE IN BRANCH: replace demo-first landing with Preparation Command Center and compact learner navigation.
- Demo public surface — RETIRE: legacy local-demo modules remain non-production scaffolding only and are no longer served from the app root/runtime allowlist.
- Singleton content admin — DONE IN BRANCH: one server-authorized beta admin owns Medical / References / Rights review authority; learners cannot approve content.
- Admin Console — DONE IN BRANCH: content review entry plus M11c exact-pair validation, with immutable human attestation and no inference/probe activation authority.
- Multi-reviewer / institutional governance — LATER: expand the same grant/event substrate only when real organizational workflows require it.
