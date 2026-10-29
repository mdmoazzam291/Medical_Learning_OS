# Draft Syllabus Checklist — First Implemented Increment

**Engineering state:** stacked feature branch based on PR #334 (then #333, #332). Not merged, not deployed, and not an approved syllabus.

## Why this boundary exists

The current indexed concepts and content cannot prove completeness of an exam syllabus. The existing `data/preparation-curriculum.js` exposes NEET-PG/INI-CET pathways with **zero** approved objectives, mappings and artifacts. Do not infer required objectives from PYQs or subject tags. The new checklist is a private Admin proposal of *candidate scope*, not an approved exam curriculum.

## Implemented

- Proposed member IDs may reference either a concept already in the learner-shared canonical catalog **or** an immutable Admin-accepted private concept identity from PR #334. Unaccepted concept drafts and unknown IDs are rejected. Accepted-private membership pins the exact `accepted_identity_digest` in the immutable syllabus revision's `private_identity_bindings`; identity acceptance is not medical, rights, exam, or publication approval. Empty proposed membership is allowed, but never produces a claimed 0% or 100% completion.
- Explicit pathway version, source kind (`official`, `expert`, `historical`, all unverified declarations), source locator, source edition/version, declared partial/complete-*proposed* scope and change reason.
- Immutable baseline ID, monotonically increasing exact revisions, previous digest, source-backed membership digest, actor/time, pinned registry version and observed catalog version, idempotent request fingerprints.
- Existing server-side owner authentication/runtime and singleton Content Admin authorization. Browser `anon` and `authenticated` roles have no draft table or RPC access. Input cannot claim status, actor, approved scope or learner release.
- Admin Coverage Index houses a separate checklist form and revision history. Its saved drafts do not overwrite concept drafts or existing inventory filters. Pending uncertain saves reuse the same request identity and require exact readback.
- `src/domain/syllabus-baseline-drafts.js` includes an optional *synthetic-only* same-catalog-version, complete-snapshot inventory preview that clearly reports missing direct published assessments and notes. It always reports `coverageFraction:null` and `readinessInferred:false`; this preview is not a published API or approved syllabus measurement.
- New isolated PostgreSQL CI covers exact actor, retries, immutability, unknown/unaccepted IDs, exact accepted-private identity digest persistence, learner-catalog isolation, and no activation.

## Explicitly not implemented

No accepted/active syllabus baseline, official syllabus certification, objective authoring or approval, preparation-registry mutation, new PYQ evidence, exam-scope changes, learner analytics, medical rights review, concept/question/notes publication or production deployment. Existing source-rights governance issue #326 is unaffected. Existing-concept revisions remain held by PR #334's separate release boundary.

## Follow-on acceptance sequence

1. Review and integrate the prerequisite PR stack safely, with migrations and hosted Auth/role-denial checks.
2. Verify current official/expert scope evidence with a human and record explicit approval of a **named** baseline version; preserve provenance and scope limitations. Do not activate the existing preparation registry merely by accepting a checklist.
3. Reuse `preparation-pathways.js` exact objective versions and official/expert/historical mapping review for objective-specific relevance, teaching/assessment bindings and honest denominator calculations.
4. Add source-versioned, actor-bound accepted baseline snapshots to the Admin inventory; ensure one consistent snapshot/version for all paginated rows and totals; support exports and retired comparisons.
5. Measure discrepancies against independently verified syllabus scope and evidence; test that no learner readiness or exam suitability is inferred from checklist completeness.

**Never use question-count-derived topics as the authoritative checklist.**

## Explicit private identity dependency (PR #334)

This change depends on PR #334's **private** `content_concept_acceptances` ledger. A syllabus draft may cite its accepted concept ID and frozen identity digest, but **must not** copy that identity into `study_catalog`, expose it in a learner API, or infer completeness. The catalog version remains pinned independently. The SQL save procedure shares the catalog-publisher lock while resolving IDs; only service-role RPCs can read the accepted-private bindings.

A proposed checklist preview cannot rely on a published-catalog-only Coverage Index to assess private IDs. The existing conservative preview returns unavailable for IDs absent from its canonical snapshot and never computes a syllabus denominator. Later preflight must explicitly validate immutable private identity bindings and official syllabus scope before claiming a named baseline. PR #336/#337 must be reviewed against this new binding rather than assuming all proposed members are already learner-visible.
