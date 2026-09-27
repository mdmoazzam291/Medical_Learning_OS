# Medical Learning OS — context register

Last reconciled: 2026-09-28 (Asia/Kolkata).

## Standing user instruction
Take reference/context from the ChatGPT project named **“medical learning os”** when deciding or implementing the next step. Work only in Medical_Learning_OS. The older NEETPG2027 repository is excluded unless explicitly authorized.

## Sources and limits
This register combines the current user's instructions, the project's visible conversation excerpts and targeted personal-context retrieval on 2026-09-25. Retrieval returned summaries of prior conversations, not a verified export of the whole ChatGPT project. Project membership and the current contents of any XMind/Drive roadmap were not independently verified. No canonical source file was returned. Do not claim a full project audit or invent file IDs/links.

| Source topic / date | Evidence type | Implication for this implementation |
|---|---|---|
| Master categorization and implementation request, 2026-09-24 | User constraint visible in conversation | Distinct canonical owners, dependency-based build order, no unnecessary duplication; exclude older repository |
| Master reconstruction prompt, 2026-09-22 | Retrieved user preference | Medical reality is canonical; MBBS subjects are views; preserve OBSERVE → DIAGNOSE → MODEL → PRIORITIZE → PRESCRIBE → TEACH/TEST → RETRIEVE → VERIFY → UPDATE |
| NeuralVault 2.0, 2026-09-23; related architecture proposal, 2026-09-22 | User questions plus prior assistant proposal | Store canonical knowledge separately from personal annotations/evidence; shared concept IDs are implemented now; notes remain planned |
| Content Quality, 2026-09-23 | User design requirements | Source references, review/publication/update/retirement, correction traceability |
| Marketplace/platform, 2026-09-23 | User questions plus prior assistant proposal | Educator content maps to canonical concepts; preserve author, reviewer, sources and revisions |
| Multi-exam strategy, 2026-09-23 | User design requirements plus prior assistant proposal | Shared graph and learner profile; exam-specific rules belong in adapters; original content must not claim PYQ provenance |
| Project folder instructions, option 3, 2026-09-24 | Retrieved user selection; implementation details were assistant proposals | Drive + ChatGPT knowledge workflow; GitHub as implementation truth; do not imply Drive/XMind were created or synchronized |
| Next-best-step instruction, 2026-09-25 | Direct current user instruction | Consult named project context and retain this workflow in repository instructions |

## Decisions applied now
- One canonical concept can have subject tags and multiple question roles; no concept copies per exam.
- Question identity and question-version identity are distinct. Learning events retain exact version IDs.
- Source records carry their own version and rights evidence. Original, AI-generated, recalled-PYQ and licensed-PYQ provenance are distinct.
- Publication requires recorded medical, reference and rights review approvals. These are workflow records, not automated proof of clinical truth or legal rights.
- New versions start as drafts and inherit no approvals. Personal learner evidence remains separate.

## Proposals not treated as accepted configuration
No specific frontend, database, hosting, local model or AI provider is selected by this milestone. Earlier assistant stack suggestions are not deployment authorization or evidence of existing infrastructure. UI navigation alternatives and broader taxonomy need reconciliation when M03 is specified.

## Continuity procedure
1. Read AGENTS.md, this register, STATUS.md and the relevant implementation documents.
2. Retrieve only relevant Medical Learning OS context when a prior decision is missing; inspect identified canonical files before relying on their old descriptions.
3. Distinguish user decisions, assistant proposals, implementation choices and verified code behavior.
4. Record source topic/date, any unresolved conflict and the resulting bounded decision here or in DECISIONS.md.
5. Update implementation status after verification. Keep planning documents in Drive authoritative for planning if available; GitHub records actual code and its current implementation state. Do not silently create a competing planning master.

## M03 reconciliation — 2026-09-25
Current project instructions emphasize maximum durable mastery per learner minute, canonical ownership and uncertainty. The supplied conversation context also records countdown-first dashboard preferences, start/resume, compact progress, revision priorities and dark mode from the user's earlier app. These inform the M03 interface without accessing the separate repository. Four working destinations are sufficient for this milestone; the earlier approximate eight-item ceiling is not a requirement to invent screens. The 2027-08-29 countdown is a user-selected planning target, not a verified official exam date. No broader project retrieval was needed to make a conflicting architecture decision; full-project/XMind/Drive reconciliation remains unclaimed.

M03 chooses a device-local preview with explicit storage limits; this is an implementation choice, not a prior user mandate for local-only production. Reviewed clinical content, authentication, cloud persistence and server-side scoring remain M04 requirements.

## M04a reconciliation — 2026-09-25
The user's continuation authorizes the next implementation slice. The visible project doctrine and current repository are sufficient for server-side evidence ownership, source/version preservation and uncertainty requirements. No new retrieval claims are made. M04a is a bounded implementation choice, not completion of accounts, cloud sync, reviewer verification or reviewed medical content. Its default-empty published catalog prevents scaffolding tests from becoming false clinical evidence. See ADR-007 and SERVER_STUDY.md.

## Canonical architecture reconciliation — 2026-09-27

The user asked to incorporate the latest Medical Learning OS architecture/moat discussion into the durable project roadmap and authorized cautious direct repository work.

Accepted consolidation:
- one canonical medical concept model;
- one versioned/replayable learner evidence ledger;
- one Preparation Digital Twin as owner of inferred learner state;
- Memory and Mistake systems as specialized inference/evidence layers rather than competing mastery stores;
- Study Now as the "what next" policy layer;
- Adaptive Teaching as the "how to teach/remediate" layer;
- QBank, NeuralVault, mocks, multimodal/clinical interactions and AI as actuators/evidence producers;
- analytics as derived/read-only with respect to canonical learner truth;
- provider-independent AI with no ownership of durable learner state;
- intervention → immediate outcome → delayed retention → transfer linkage as the long-term data-moat target.

This reconciliation is architectural guidance, not a claim that M07c inference, all planned event families, intervention-effectiveness models or clinical/multimodal systems are implemented. It also does not reset existing milestones or migration history. New database work must extend the current timestamped Supabase migrations forward after inspecting the live/current schema.

## Future-proofing reconciliation — 2026-09-28

The user authorized direct incorporation of a long-horizon future-proofing doctrine into the existing Medical Learning OS repository.

Accepted governing principles:
- maximum future optionality, minimum present infrastructure;
- future-proof against technological change itself rather than one predicted technology;
- Learning Core semantics outlive AI vendors/models, agent frameworks, MCP/A2A or successors, cloud providers, blockchains/proof systems and cryptographic generations;
- deterministic code remains preferred where it solves the problem correctly;
- provider-owned AI memory is never canonical learner/medical truth;
- future agents cannot bypass authorization/domain validation or receive arbitrary database write authority;
- blockchain, ZK, DID/VC and post-quantum systems remain optional adapters and are not current dependencies;
- personal learner evidence remains private, portable and deletable/de-identifiable despite any future trust technology;
- approximately zero new recurring infrastructure cost is the default acceptance criterion for this architectural preparation.

Implementation is intentionally smaller than the full conceptual technology list: shared canonical integrity, a semantic capability vocabulary and pure action/audit contracts. Model/agent/tool/trust provider runtimes are deferred until an active milestone requires them.

## Privacy/evidence integrity reconciliation — 2026-09-28

The canonical evidence-ledger architecture now explicitly reconciles append-only history with learner privacy rights.

Accepted rule:
- ordinary learning evidence is append-only;
- privacy erasure is a separately authorized destructive operation;
- no subsystem may use append-only/audit requirements as a reason to retain learner-identifying evidence after a valid erasure request;
- no subsystem may use privacy deletion as permission for routine history rewriting;
- new learner-scoped storage must ship with an erasure mapping;
- durable erasure receipts must avoid learner identifiers/derived fingerprints;
- account closure requires auth-session revocation and Auth-user deletion outside the product-data erasure transaction.

Current implementation is erasure-only. De-identification/research retention is deliberately deferred until there is a concrete M11 research requirement and explicit re-identification-risk review.

## M07c inference-governance reconciliation — 2026-09-28

The project now has an explicit rule for when probabilistic Preparation Digital Twin inference may begin.

A model's existence is not evidence of readiness. Candidate-specific evidence and validation thresholds must be preregistered before evaluation. Offline success permits hidden shadow inference only. Prospective shadow success plus operational guardrails may make a pinned model eligible for a controlled policy experiment. Neither state authorizes general production.

Study Now continues to own next-action policy. A Digital Twin model may provide validated state estimates but cannot grant itself recommendation authority.

No fixed sample-size/calibration thresholds are treated as universal truth. Production thresholds must be justified and locked by each future model's research/validation plan.

## Autonomous medical-question intake authorization — 2026-09-28

The user explicitly authorized Medical Learning OS to create and add source-grounded medical-question batches without requiring repeated user intervention.

Interpretation:
- autonomous drafting, source verification, duplicate/overlap preflight, repository integration, staging and promotion into `in_review` are authorized;
- this authorization does not permit fabrication of human review events, rights decisions, or publication approvals;
- batch size should be chosen by the system according to quality/review capacity rather than maximizing raw question count;
- review debt, concept coverage, source reuse, medical uncertainty and measurable learner value should determine when another batch is worthwhile.

