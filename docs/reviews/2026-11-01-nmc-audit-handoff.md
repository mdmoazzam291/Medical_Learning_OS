# NMC CBME 2024 audit — isolated reviewer handoff

**Status: DRAFT; source reconciliation incomplete, no learner/exam release.** Review scope: [PR #348](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/348), based on the existing dual-exam competency evidence branch. Source snapshot was split non-destructively from original draft [#346](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/346) at `d9d012ef53d366119a61a2ec3c8eee224468da11`. Original history, branches and shared `docs/AI_HANDOFF.md` / `docs/STATUS.md` are retained unchanged there.

## What the checked-in evidence supports

- The source's **published base subject-count summary** is **2,781** numbered entries across **19 subjects**, not an independently verified, corrigenda-adjusted denominator.
- The raw identifier snapshot reports **2,634 appearances**, **2,631 distinct whitespace-stripped raw tokens**, **3 repeated Medicine appearances** and **14 arithmetic-matched / 5 discrepant subjects**. These are extraction/appearance observations, not 2,631 approved unique competencies.
- Paediatrics has **253 extracted tokens vs 406 published**; Medicine **529 vs 525**, OBGYN **142 vs 141**, Surgery **132 vs 133**, Ophthalmology **59 vs 60**. The net −150 is **not** 150 independently established missing competencies. See `docs/NMC_SUBJECT_RECONCILIATION.md`.
- `docs/NMC_SOURCE_ADJUDICATION_PACKET.md` contains **22 overlapping decision cases**, with **no assigned reviewer and no fabricated decision**. Full source-page, malformed-cell, global/supplemental curriculum and corrigenda adjudication is still outstanding.
- The upstream eight Medicine code references remain unverified; neither NMC undergraduate curriculum nor this audit is an official exhaustive NEET-PG or INI-CET syllabus.
- Keep copyright mode **citation_only**. Do not publish or rehost raw copyrighted curricular prose, source PDFs or whole tables from this review branch. Exact rights and qualified clinical/source review are independent gates.

## Review sequence

1. Verify the official revised 2024 source version, October clarification, exact file/receipt hashes and all used page locators, without assuming a matching count proves a complete extraction.
2. Reconcile every discrepancy, duplicate appearance, prefix conflict and malformed/uncoded source cell; bind each accepted or rejected interpretation to a reviewer, role, source version and rationale.
3. Review global curriculum supplements/AETCOM, amended effective scope and the canonical graph mapping separately; leave unresolved rows as unknown.
4. Only after source identity, rights, clinical and exam-scope reviews can an approved versioned coverage projection be considered for learners.

## Verification and release limits

The split PR's first exact-head core run [41244826835](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41244826835) showed **1,567 tests passing, zero failing**; browser/WebKit checks were still running at the review checkpoint. A new documentation commit requires rechecking the **new** exact head. No production ingestion, signed source approval, merged PR, learner-facing release, graph coverage %, predicted ranks, or exam syllabus-completeness claim is authorized.

**Next accountable action:** independent source/adjudication review of the existing 22-case packet and the remaining raw-row gaps. A reviewer decision is not invented by engineering.
