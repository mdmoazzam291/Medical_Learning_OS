# Syllabus source and objective alignment preflight

**Status:** PR #336 is an unmerged, undeployed draft stacked on #335 → #334 → #333 → #332. This is read-only decision support for Admin; no approved baseline or additional authoritative catalog.

## Why this slice exists

The existing singleton Admin may prepare a proposal, but cannot truthfully claim an independent second-reviewer approval. Further, the current versioned Preparation Curriculum has NEET-PG and INI-CET pathway definitions but no approved objective records or mappings. A prepared checklist is not proof of exam syllabus completeness or learner readiness.

## Mechanics

- Read exact immutable baseline proposal ID/revision/digest and the latest-revision flag from the protected Admin-only database. Compare its pinned catalog version with the current catalog; derive only the member's canonical concept ID, label and existence flag, never question body, answer key, source text or private learner data.
- Bind each packet to the *exact* `data/preparation-curriculum.js` `registryVersion` and exact active `pathwayVersionId`.
- Reuse `validatePreparationCurriculum()` and only objective versions with an explicitly `approved`, reviewer-attributed pathway mapping. Never infer objective requirements from concept tags, PYQ appearances or question counts.
- For matching versions, label any exact mapping and enumerate proposed concept IDs with no approved mapping. Otherwise mark mapping counts unknown/not evaluated, including stale catalog, stale registry, unknown concept ID, empty proposal, historical draft or unavailable pathway.
- Independently sourced complete-syllabus membership remains unverified. The packet always has `checklistApproved:false`, `officialSyllabusCertified:false`, `coverageFraction:null`, and `readinessInferred:false`.
- Present the source locator/version, scope declaration, proposed membership count, exact mapping count only when comparable, blockers and exact objective version IDs in the existing Admin checklist UI. No accept, activate, publish or learner button is introduced.

## Security and test invariants

Protected `GET /syllabus-review-preflight/:baselineId?revision=N` requires existing verified singleton Admin and a service-role-only read RPC. Input cannot override actor, registry or approval status. SQL migration is additive, read-only and forward-only. The resulting packet contains metadata only; it is never stored as a new canonically authoritative syllabus record.

Unit, API, isolated PostgreSQL and Chromium/native WebKit regressions cover exact versions, stale catalog, no accidental readiness percentage, permission denial, XSS escaping and responsive layout. Passing repository CI is separate from hosted Supabase Auth/RLS, backup/restore, real independent source verification or production deployment.

## Required next human-governance work

1. Establish authorized independent human scope-review capability and source-verification evidence. Do not label a self-reviewed singleton-owner action as independent.
2. Design a signed, immutable approval receipt against a *named* baseline revision and verified source locator/digest, with expiry/version lineage and revocation. This is scope acceptance only, not clinical, rights or learner publication.
3. Extend the existing Preparation Curriculum with approved exact objective versions/mappings and evidence, without a second syllabus ontology. Treat incomplete/unmapped coverage as unknown.
4. Introduce accepted-baseline denominators only within the explicitly reviewed scope and frozen snapshot; whole-syllabus percentages require independent completeness validation.
5. Keep #326 rights/medical source incident as an independent release blocker for medical content.

**Nothing in this PR changes the current Study Now, Digital Twin, Memory Engine or learner-facing exam targeting.**
