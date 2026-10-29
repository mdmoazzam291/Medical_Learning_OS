# Syllabus source and objective alignment preflight

**Status:** PR #336 is an unmerged, undeployed draft stacked on #335 → #334 → #333 → #332. This is read-only decision support for Admin; no approved baseline or additional authoritative catalog.

## Why this slice exists

The existing singleton Admin may prepare a proposal, but cannot truthfully claim an independent second-reviewer approval. Further, the current versioned Preparation Curriculum has NEET-PG and INI-CET pathway definitions but no approved objective records or mappings. A prepared checklist is not proof of exam syllabus completeness or learner readiness.

## Mechanics

- Read the exact immutable baseline proposal ID/revision/digest and latest-revision flag from the protected Admin-only database. Compare pinned and current catalog versions. For each member, explicitly classify `canonical` (learner-visible catalog identity), `accepted-private` (Admin-only immutable acceptance), or `missing` (unknown). Private members require an exact digest match to the checklist's frozen `private_identity_bindings`. Derive only Admin-visible identity metadata; never question body, answer key, clinical source text or private learner records.
- Bind each packet to the *exact* `data/preparation-curriculum.js` `registryVersion` and exact active `pathwayVersionId`.
- Reuse `validatePreparationCurriculum()` and only objective versions with an explicitly `approved`, reviewer-attributed pathway mapping. Never infer objective requirements from concept tags, PYQ appearances or question counts.
- Exact approved objective mappings may be compared **only when every member is a currently published canonical concept**, the immutable identity bindings are valid and all registry/catalog/revision constraints match. An accepted-private identity can be included for Admin scope review, but **does not make the checklist comparable for approved objective mapping** or expose the concept to learners. Missing IDs, stale private identity bindings, stale catalog/registry, empty/historical drafts and unavailable pathways yield unknown/not-evaluated mapping totals, never an invented zero or percentage.
- Independently sourced complete-syllabus membership remains unverified. The packet always has `checklistApproved:false`, `officialSyllabusCertified:false`, `coverageFraction:null`, and `readinessInferred:false`.
- Present source locator/version, scope declaration, proposed membership count, **Admin-private membership count**, distinct unknown-ID/stale-binding blockers, exact mapping totals only when comparable and exact approved objective IDs in the existing Admin checklist UI. No accept, activate, publish or learner button is introduced.

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

## Private identity compatibility boundary (parent PR #335)

The original review packet treated every concept missing from `study_catalog` as nonexistent. This is no longer correct after PR #334 introduced the Admin-only accepted-identity registry and PR #335 allowed exact private IDs in immutable draft membership. The repaired review RPC reads the **service-only** accepted identities and verifies their digest against the saved `private_identity_bindings`, returning `kind`, `bindingMatches` and `identityDigest` only on the Admin-authorized route. No learner APIs or shared catalog are altered. The review domain reports `privateAcceptedConcepts`, `identityResolved` and explicit `private-identities-not-learner-published` blockers; objective mapping counts remain unknown until the private IDs have a separate governed learner-publication state and exact registry evidence.

This private preflight must remain read-only. It is not a way to activate, certify, import or indirectly expose a medical concept. CI must validate exact private binding readback, source/role denial, non-publication and the independent preparation-registry denominator boundary.
