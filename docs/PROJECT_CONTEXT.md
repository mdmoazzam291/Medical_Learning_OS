# Medical Learning OS — context register

Last reconciled: 2026-09-25 (Asia/Kolkata).

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
