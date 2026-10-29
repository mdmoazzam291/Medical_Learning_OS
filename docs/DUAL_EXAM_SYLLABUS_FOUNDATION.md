# Dual-exam MBBS syllabus foundation — NEET-PG + INI-CET

**Status:** 30 October 2026, editorial **scaffold only**, source-backed exam-reference register, no approved exam curriculum. This is an additive branch proposal, not a live learner release. There is no independent external reviewer and no actual approved syllabus baseline.

## Key decision

One **Medical Knowledge Graph**, one shared MBBS subject/domain navigation scaffold, and **two exam-specific scope overlays** using the existing pathway IDs `neet-pg:preparation@1` and `ini-cet:preparation@1`. Do not duplicate notes, concepts, mastery state, or spaced-repetition schedules across exams. Reuse the existing private Admin Syllabus Checklist for source-backed, versioned candidate membership. Do not add another authoritative syllabus writer.

The static `data/dual-exam-syllabus-foundation.js` records 19 familiar **editorial subject buckets** and coarse navigational domains, not a complete official exam syllabus or verbatim CBME competence list. They are navigation candidates, not canonical concept IDs. The 2024 NMC CBME guideline is an undergraduate competency reference (implemented for MBBS batch 2024-25 onward); it does **not** individually certify NEET-PG 2027 or INI-CET 2027 topic inclusion or weightage.

## External sources, claims and limitations

1. **NMC 12 Sept 2024 modified CBME** — [NMC official guideline](https://www.nmc.org.in/wp-content/uploads/2026/02/12bCompetencyBasedMedicalEducationCBMECurriculum12092024.pdf); undergraduate medical competency reference; subject/domain scaffolding is our editorial grouping, **not extracted official topic IDs**.
2. **NBEMS NEET-PG 2026** — [official bulletin index](https://natboard.edu.in/viewnbeexam?exam=neetpg); examination scope refers to undergraduate medical education regulations. This index does **not** individually verify every editorial domain or subject-specific question weight.
3. **AIIMS INI-CET January 2027** — [AIIMS official examination portal](https://www.aiimsexams.ac.in/) lists the January 2027 session; [official earlier Part-A prospectus, July 2025](https://docs.aiimsexams.ac.in/sites/2_PROSPECTUS%20PART-A%20INI-CET%20JULY%202025%20SESSION%20-%20UPDATED%2002.04.2025.pdf) supplies examination context, **not a complete verified topic list**. A January 2027 session-specific topic-by-topic directive was not verified here.
4. **PYQ and exam DNA** — later distinct, appropriately rights-checked evidence, explicitly labelled inferred/trend-based and subject to sampling uncertainty; **never** official syllabus certification by question counts.

Always use provenance on each real proposed concept or objective: **authority → document/edition → page or competency locator → claim type → canonical concept → pathway version → status → reviewer receipt**, retaining uncertainty. A supplied coaching list can be a proposal source, not proof of official coverage.

## Repository artifacts

- `data/dual-exam-syllabus-foundation.js`: single shared editorial subject+domain scaffold; 2 separately sourced pathway overlays; empty concept/objective/mapping bindings by design.
- `src/domain/dual-exam-syllabus-foundation.js`: fail-closed schema and pathway validations, no automatic activation or coverage fraction.
- `web/syllabus-baseline-editor.js`: **Admin-only read-only summary** in the existing Coverage Index → Proposed syllabus checklist. Existing authoring and immutable revision workflow remain unchanged.
- `tests/dual-exam-syllabus-foundation.test.js`: subject/domain uniqueness, exam pathway binding, no fake approvals, no target leakage to Study Now or learner content.

## How to convert scaffold into real reviewed syllabus, without making a duplicate system

1. As Admin, select NEET-PG or INI-CET in **Proposed syllabus checklist**, add exact source locator/version and existing canonical or Admin-accepted private **concept IDs** to a **partial** proposed draft. Add one authoritative competency/citation at a time, not generic domain names. Never submit blank source evidence, invent concept IDs, or mark the complete proposed scope without verified breadth.
2. Through the **existing** private revision ledger, pin catalog version, source evidence and concept identities; use the existing read-only preflight to detect unknown, stale or unpublished identity bindings.
3. For each exam, propose exact **objective** versions (knowledge, diagnosis, investigation, management, reasoning, etc.) linked to **one canonical concept** and contextualized by target setting/population. Different exams may have different reviewed mapping **status**, but not duplicate concept identities. `data/preparation-curriculum.js` continues to be the sole canonical registry for approved objective mappings and artifact versions. Do not populate it from this scaffold.
4. A distinct, consenting qualified reviewer, when available, signs an exact proposal revision/digest and evidence declaration through #337 after its hosted Auth/security release. Even a `scope-reviewed` receipt is **not** official syllabus-completeness certification, clinical/source-rights approval, or learner publication.
5. After separate clinical/rights/medical publication checks (#326/#330), use only approved objective mappings for learner suitability, Digital Twin and Study Now. Topic/domain counts are not official denominators; do not show 0%/100% or readiness based on this scaffold.

## Next prioritized batch

**Build now:** shared subject/domain scaffold and read-only Admin visibility (this change), source ingest register, and two **separate partial** proposal revisions after real source mapping.

**Foundation:** NMC competency-code/edition parser with human provenance confirmation, canonical concept identity mapping, existing immutable private checklist receipts, source/version comparison, PYQ evidence tagged to exact exam and year.

**Later:** reviewed objective mappings, exam-specific assessment evidence and difficulty; an evidence-based Exam DNA overlay.

**Blocked:** independently certified official-completeness baseline, automatic mastery/revision weighting and learner-facing exam-readiness; these require reviewed sources, approved objective mappings, and genuine independent governance.

This gives a dual-exam foundation without fabricating a validated topic list, changing published medical content, granting reviewer access or feeding unreviewed categories into learner interventions.
