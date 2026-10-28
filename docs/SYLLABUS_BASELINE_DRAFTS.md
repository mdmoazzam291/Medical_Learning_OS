# Draft Syllabus Checklist — First Implemented Increment

**Engineering state:** stacked feature branch based on PR #334 (then #333, #332). Not merged, not deployed, and not an approved syllabus.

## Why this boundary exists

The current indexed concepts and content cannot prove completeness of an exam syllabus. The existing `data/preparation-curriculum.js` exposes NEET-PG/INI-CET pathways with **zero** approved objectives, mappings and artifacts. Do not infer required objectives from PYQs or subject tags. The new checklist is a private Admin proposal of *candidate scope*, not an approved exam curriculum.

## Implemented

- A single source of canonical concept IDs; every proposed member must already exist in the canonical catalog. Empty proposed membership is allowed, but never produces a claimed 0% or 100% completion.
- Explicit pathway version, source kind (`official`, `expert`, `historical`, all unverified declarations), source locator, source edition/version, declared partial/complete-*proposed* scope and change reason.
- Immutable baseline ID, monotonically increasing exact revisions, previous digest, source-backed membership digest, actor/time, pinned registry version and observed catalog version, idempotent request fingerprints.
- Existing server-side owner authentication/runtime and singleton Content Admin authorization. Browser `anon` and `authenticated` roles have no draft table or RPC access. Input cannot claim status, actor, approved scope or learner release.
- Admin Coverage Index houses a separate checklist form and revision history. Its saved drafts do not overwrite concept drafts or existing inventory filters. Pending uncertain saves reuse the same request identity and require exact readback.
- `src/domain/syllabus-baseline-drafts.js` includes an optional *synthetic-only* same-catalog-version, complete-snapshot inventory preview that clearly reports missing direct published assessments and notes. It always reports `coverageFraction:null` and `readinessInferred:false`; this preview is not a published API or approved syllabus measurement.
- New isolated PostgreSQL CI coverage tests exact actor, retry, immutability, unknown IDs, and unchanged catalog.

## Explicitly not implemented

No accepted/active syllabus baseline, official syllabus certification, objective authoring or approval, preparation-registry mutation, new PYQ evidence, exam-scope changes, learner analytics, medical rights review, concept/question/notes publication or production deployment. Existing source-rights governance issue #326 is unaffected. Existing-concept revisions remain held by PR #334's separate release boundary.

## Follow-on acceptance sequence

1. Review and integrate the prerequisite PR stack safely, with migrations and hosted Auth/role-denial checks.
2. Verify current official/expert scope evidence with a human and record explicit approval of a **named** baseline version; preserve provenance and scope limitations. Do not activate the existing preparation registry merely by accepting a checklist.
3. Reuse `preparation-pathways.js` exact objective versions and official/expert/historical mapping review for objective-specific relevance, teaching/assessment bindings and honest denominator calculations.
4. Add source-versioned, actor-bound accepted baseline snapshots to the Admin inventory; ensure one consistent snapshot/version for all paginated rows and totals; support exports and retired comparisons.
5. Measure discrepancies against independently verified syllabus scope and evidence; test that no learner readiness or exam suitability is inferred from checklist completeness.

**Never use question-count-derived topics as the authoritative checklist.**
