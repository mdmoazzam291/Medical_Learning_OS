# NMC foundation readiness — 2 November 2026

**Not fully prepared, not released to learners.** Current production main remains 91a11aff. The existing NEET-PG/INI-CET preference/preparation framework is not a complete NMC syllabus.

| Layer | Verified engineering state | Release state |
|---|---|---|
| Shared 19-subject/76-module scaffold | PR #343 draft; reuses existing canonical navigation | Not merged into main |
| NMC evidence proposal ledger | PR #344 draft; 8 unverified Medicine references | 0 source-approved, 0 rights-approved, 0 approved canonical/exam mappings |
| Source-row/evidence contracts | PR #349 merged into the PR #344 feature branch | Not production main; no production migration/API follows |
| NMC source audit | PR #348 draft, isolated from mixed security prototypes in #346 | 22 overlapping adjudication cases undecided; count/supplement gaps remain |
| Repeatable detailed region inventory | Follow-up to #348; 263 pages, 3,369 metadata regions, 2,634 identifier candidates | No approval or ingestion; 67 category-difference pages remain |
| Learner curriculum registry | Existing two preparation pathways; 0 objectives / 0 mappings / 0 artifacts | No verified NMC coverage or NMC-driven recommendations |

Official revised 2024 source and October clarification have been recovered and hashed; their availability is not source adjudication or reuse permission. See [repeatable inventory](NMC_ROW_REGION_INVENTORY.md), [subject reconciliation](NMC_SUBJECT_RECONCILIATION.md) and [22-case packet](NMC_SOURCE_ADJUDICATION_PACKET.md).

## Remaining path

1. Reconcile candidate boundaries and exact source rows, malformed identifiers, published-count anomalies, supplementary/global overlap and applicable later amendments. Preserve unresolved records; never fabricate missing competencies or infer completeness from arithmetic.
2. Obtain genuine qualified source/clinical review, intended-use rights and separate NEET-PG/INI-CET mapping review. AI engineering review and hash parity do not sign these decisions.
3. Bind approved source versions to accepted canonical Medical Knowledge Graph concepts and the existing preparation registry; avoid a parallel concept taxonomy or automatic competency-to-mastery equivalence.
4. Review and integrate dependency-ordered engineering candidates, stage the approved exact versions, verify real authorized Admin/learner flows, then perform a separately approved production release. Current extraction does none of these actions.

All current scanner flags remain false. PWA #380, Account #381 and learner-identity #379 are independent workstreams and do not certify this NMC foundation.


Exact source commit `6193fa9d4b136955f7088380ebd280bafde48fdd` is saved in draft PR #382. [CI run 41502715659](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41502715659) passed core, Chromium and WebKit jobs. This includes 1,568 Node tests and 13 scanner tests. The final follow-up changes documentation and evidence only.

On 3 November, the follow-up closed the deferred scanner failure-path tests and added an exact-source diagnostic for all 320 v1 empty regions (132 with intersecting words omitted by the centre rule; 188 without column intersections). No source decision, coverage certification or production status changed. See the diagnostic section in the inventory runbook.

A local frozen review-package builder/verifier is now implemented. It binds the 3,369 candidate regions, 22 pending cases and all 1,031 pending page dispositions across 12 retrieved documents to exact evidence versions. All 32 NMC tests pass locally. This closes package-preparation infrastructure only: exact-row interpretation, complete source scope, trusted reviewer identity/decisions and production integration remain unresolved. See `NMC_EXACT_ROW_REVIEW_WORKFLOW.md`.

The five discrepant subjects now have an actual-source topic audit covering 100 pages and all 1,118 identifier-appearance digests. Ophthalmology topic totals agree at 59 against a headline of 60; Medicine topic discrepancies are localized; malformed Paediatrics and missing/unnumbered OBGYN/Surgery header evidence is preserved. This is reproducible AI investigation, not approved source correction or completeness. See `NMC_FIVE_SUBJECT_TOPIC_AUDIT.md`. Local NMC suite: 38 passing tests. PR #382 source 5c8d66bd now has all three jobs green in run 41522409052; current follow-up hosted CI is not yet verified.

Legacy pandemic primary-table locators now cover all 17 candidate modules (45 physical candidate regions, 47 level anchors), with exact source/manifest binding. This is supplementary source evidence, not 2024 applicability or unique-competency approval. Nested objectives and inherited references remain incomplete. Local NMC tests: 43 pass. See `NMC_PANDEMIC_REGION_INVENTORY.md`.
