# Split-branch handoff reconciliation — 2 November 2026

**Status:** documentation-only review candidate; no publication, hosted write, migration, deployment, source-rights clearance, or learner activation. Tracks [issue #351](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/351).

## Why this document exists

Original draft [#346](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/346) contains two *mixed-scope, append-only historical* files: `docs/STATUS.md` (448 additional lines ahead of its upstream suffix) and `docs/AI_HANDOFF.md` (354 additional lines ahead of the same upstream suffix). Their upstream content is unchanged. Do **not** replay the entire prefixes into either the NMC or security review branch. Old checkpoints saying “pending” or “next” describe their **historical time**, not the current release state. The original files remain intact on #346, which stays draft.

This note summarizes current **scope ownership and decision boundaries**, not every intermediate test. Detailed evidence belongs to the already separated review documents below.

## NMC CBME 2024 source-audit handoff — #348

- Canonical review: [#348](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/348), draft, based on the source-evidence feature branch. Refer to `docs/reviews/2026-11-01-nmc-audit-handoff.md`, `docs/NMC_CONSOLIDATED_INVENTORY.md`, `docs/NMC_SOURCE_ADJUDICATION_PACKET.md`, and the topic-specific source-audit files **on #348**, not on released `main`.
- Original audit [#346](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/346) describes a retrieved set of 12 source PDFs/1,031 pages and a published-base subject-count summary of 2,781; 2,634 geometry-extracted identifier appearances and 2,631 distinct raw tokens are **method-dependent observations**, not a validated effective competency denominator. The five subject-level discrepancies and 29 ambiguous regions require true source-row adjudication. Do not sum AETCOM, ECE, Foundation, FAP, pandemic, or global-goal counts as extra independent core competencies.
- At the snapshot, 22 source-adjudication cases have **no human disposition**. Existing eight Medicine proposals remain **unverified**; the 19-subject navigation scaffold is not official exam-specific mapped coverage. Do not infer NEET-PG or INI-CET inclusion, approved syllabus completeness, learning readiness, or accepted canonical concepts from source appearances.
- Correct next gate: independently confirm definitive source versions, page/code and amendment applicability, source permissions, independent adjudicator decisions and exact already-accepted concept identity. Keep the two exam proposal baselines *separate, partial, and unapproved* until supported by exam-specific evidence and genuine reviews. [Issue #345](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/345) tracks this.

## Canonical source-row and staging foundation — #349

- [#349](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/349) is **merged into feature branch** `feat/dual-exam-competency-evidence-20261030` (the head of [#344](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/344)); this does **not** imply integration into `main` or a live source-review service.
- It owns canonical source row/case/package identities, domain-separated digests, exact evidence binding, staged metadata contracts, synthetic conformance and withdrawal/recovery fixtures. These establish structure, **not a verified source review**, source-reuse rights, clinician acceptance, or permission to publish.

## Private external authority/security experiment — #350 (deferred)

- [#350](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/350) remains **draft and unmerged**. Its disposable local Auth, restricted role, PostgreSQL 17/18 concurrency/WAL, private gateway, signing-key, and synthetic acknowledgement proofs **must not** be presented as an integrated, hosted, or independently attested provider.
- The experiment exposed negative boundaries: supported app roles cannot assume direct managed-Auth row locks; some refresh operations do not serialize with a session `FOR SHARE` lock; a database delivery-intent receipt is **not** an external recipient acknowledgement. The gateway stays **OFF**. There is no verified independent provider identity/key owner, production credential, durable remote transport, legitimate source-use license, or production deployment. [Issue #347](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/347) records the optional external-provider gate; external delivery is **not planned** for the current internal-review scope.
- Keep detailed findings in `docs/reviews/2026-11-01-private-authority-security-handoff.md` and `docs/SOURCE_EVIDENCE_GATEWAY_DEPLOYMENT_GATES.md` on #350; do not copy its private gateway runtime into the NMC branch.

## Current internal Admin source-review path — #352, #354–#374

- Owner-selected **ADR-134 internal source-row review** replaces external evidence delivery for the present workflow. [#352](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/352) is a draft metadata-only preflight: every case is `unverified`, every verified decision count unknown, and it creates **no** reviewer authorization, clinical approval, or release.
- [Issue #353](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/353) owns authenticated independent reviewer grants, real exact-target immutable decision receipts, protected readback/recovery, Admin queue, and required independent safety review. The associated stacked drafts [#354–#374](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/374) remain review-only, not production authorization.
- On **2 November 2026**, #374's actual GitHub PR head was `821e8d22d21d7cc07e5b3b1168045ce95a81c6ea`; its associated Foundation run **41352604436** reported `completed/success`. Its PR body still cites an earlier code head `823e6170bbd8067b94aa6e4c5667e07a74bb0206` and older run; prefer **live head + matching run** in subsequent acceptance work. Green test jobs prove the tested fixture, **not** real signed hosted JWT acceptance or qualified reviewer approval.
- Still missing: a *separately authorized* synthetic staging Auth create/sign-in/delete lifecycle with positive hosted JWT verification; independent qualified reviewer; server-bound active grant and author exclusion; persisted immutable decision readback; managed staging revoke-versus-commit races; rights/medical/security/exam review. No operator should infer general permission from a generic “continue” instruction. The release gate remains `BLOCKED_REVIEW_ONLY`; no production migration, source-review write, merge, or learner publication is authorized.

## Separation and integration rules

| Stream | Canonical place | Review status | May reach learners now? |
|---|---|---|---|
| Navigation / preflight | #343 → #344 | Draft upstream dependency | No approved topic coverage |
| NMC source-page/source-row audit | #348 | Draft; independent adjudication outstanding | No |
| Canonical source metadata contract | #349 | Merged only into #344 feature branch | No |
| Optional external authority/transport | #350 | Draft; deferred; gateway OFF | No |
| Internal Admin reviewer/evidence | #352 and #354–#374, tracked #353 | Draft/stacked; hosted positive and human governance missing | No |
| Shared historical notes | #346 | Preserved unchanged; **not** a release train | No |

Normal independent **Medical / References / Rights** and explicit **Review → Live** gates continue to control medical content. A source-row interpretation, SHA-256 match, SQL receipt, or green test cannot substitute for any of those gates.

## Release and verification notes

- Exact-head CI was observed completed/success for #346 (`d9d012ef53d366119a61a2ec3c8eee224468da11`, run `41244418134`), #348 (`71ca1d0dec126a7f5075cf28a962be20c5cb087c`, run `41245603203`), and latest #374 head above. These results **do not** supply independent clinical, rights or security reviewer signoffs and are not approval to merge or deploy.
- **This reconciliation must remain an independent doc-only PR** targeting the feature branch that already contains #349. Do not alter or close #346, #348, #350, or the internal reviewer stack; do not promote #344/343 to main just to ship the memo.
- Before any eventual release: verify *new exact-head* tests after final edits, independent role/rights/security review, a clean dependency/rollback plan, and explicit owner approval for the specific merge or deployment. Current release status stays **blocked**.

## Completion criterion for issue #351

The mixed shared prefixes have been classified by owning branch and their evidence limitations documented without cherry-picking, changing, or deleting them. The documentation task can be reviewed; **independent CI/approvals and any final integration remain separate open gates**. Do not close #351 automatically merely because this memo or its draft PR exists.
