# Supabase migration provenance

The live `medical_learning_os` project already has migration history. The historical SQL bodies were applied before this repository contained a `supabase/migrations` directory, so this repository must not fabricate those old files after the fact.

Live migration versions observed on 2026-09-26:

- `20260925112056 study_state_v1`
- `20260925112441 study_attempt_session_fk_index`
- `20260925113131 study_atomic_mutations`
- `20260925114912 shared_study_catalog`
- `20260925115339 answer_catalog_version_gate`

The resulting live schema includes `study_sessions`, `study_attempts`, `study_bookmarks`, `study_catalog`, learner-scoped RLS reads, server-only write privileges, and atomic study mutation functions.

## Rule from now on

All future DDL must be committed as a migration in this directory before, or in the same change as, applying it to the live project. Do not rewrite the five historical versions unless their original SQL is recovered exactly.

The project status must describe the live schema as existing. "No migrations" was an obsolete statement.


## Committed migrations added after the historical baseline

- `20260926120000_content_review_evidence.sql` — server-only reviewer grants, immutable review events and trusted review recording function.
- `20260926123000_atomic_review_projection.sql` — stable substantive target hashing and transactional catalog review projection.
- `20260926124000_fix_review_hash_ambiguity.sql` — qualifies the review hash column after live rollback verification exposed a PL/pgSQL output-name collision.
- `20260926130000_verified_publication_gate.sql` — server-only verified → published transition with review/hash/rights/version checks.
- `20260926133000_gate_specific_review_and_rights.sql` — gate-specific review fingerprints, immutable source-rights evidence, trusted rights resolution, and per-gate publication revalidation.
- `20260926140000_reviewer_grant_governance.sql` — auditable grant/revoke events, grant actor/reason/expiry, and active-grant enforcement for review queues and mutations.

These files are the canonical repository copies for all M04c DDL applied after the historical five-migration baseline.

## Content-intake live migration mapping — 2026-09-27

Repository dependency order:

- `20260927173000_content_intake_pipeline.sql`
- `20260927174500_content_intake_trigger_permissions.sql`
- `20260927175500_internal_trigger_rpc_permissions.sql`

The dedicated live project recorded the same changes under deployment-time versions:

- `20260927102048 content_intake_pipeline`
- `20260927102558 content_intake_trigger_permissions`
- `20260927103229 internal_trigger_rpc_permissions`

The two follow-up SQL bodies were recovered from `supabase_migrations.schema_migrations`. Repository filenames intentionally remain after the intake foundation so a fresh lexical migration replay cannot reference trigger helpers before they exist.

## M10b visual interaction persistence — 2026-09-28

The live project and repository now share these exact forward-only migrations:

- `20260928112019_m10b_visual_interaction_ledger.sql` — service-only append-only visual interaction evidence, idempotent write RPC, canonical replay integration, and learner-privacy scope v2.
- `20260928112441_m10b_visual_interaction_fk_indexes.sql` — covering indexes for the new media and session-owner foreign keys after the Supabase performance advisor identified them.

The migration body for `20260928112019` was recovered directly from `supabase_migrations.schema_migrations` after deployment so the repository copy matches the live applied SQL.

## M10b canonical visual interaction profile — 2026-09-28

- `20260928120011_m10b_canonical_visual_interaction_profile.sql` adds immutable service-only visual task metadata, emits the descriptor through learner media prompts, and binds it into all media-aware review fingerprints.
- The first profile is the in-review clear-cell RCC pathology item classified as `detection`.
- Task metadata must be declared before review/publish; later semantic reclassification requires a new version rather than mutation.
