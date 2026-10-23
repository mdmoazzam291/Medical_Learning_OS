# Supabase migration provenance

The live `medical_learning_os` project already has migration history. The five historical SQL bodies were recovered exactly from the provider migration ledger on 2026-10-21. Their filenames retain the original versions and names; no inferred SQL was added. SHA-256 provenance tests pin their recovered bytes. Do not rewrite applied history.

Live migration versions observed on 2026-09-26:

- `20260925112056 study_state_v1`
- `20260925112441 study_attempt_session_fk_index`
- `20260925113131 study_atomic_mutations`
- `20260925114912 shared_study_catalog`
- `20260925115339 answer_catalog_version_gate`

The resulting live schema includes `study_sessions`, `study_attempts`, `study_bookmarks`, `study_catalog`, learner-scoped RLS reads, server-only write privileges, and atomic study mutation functions.

## Rule from now on

All future DDL must be committed as a migration in this directory before, or in the same change as, applying it to the live project. The five recovered historical files are now present and immutable.

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

## M02c review workflow measurement — 2026-09-28

- `20260928145039_m02c_review_workflow_measurement.sql` adds append-only, service-only workflow measurement receipts linked one-to-one with immutable question review receipts.
- Metrics are explicitly non-authoritative and descriptive. They cannot alter review, verification, publication or reviewer grants.
- A service-only summary RPC reports counts, rejection proxy and total/median foreground/wall timing by workflow mode for a named experiment.

## Explicit Data API access — 2026-10-21

New public tables must declare intended role grants alongside their creation and enable RLS. Do not rely on Supabase's automatic defaults or grant browser access to server-only tables. Writes through existing authorized SECURITY DEFINER RPCs do not require granting direct table writes. Preserve ledger immutability.

`20261021041935_explicit_service_read_grants.sql` supplies explicit service SELECT for 14 tables whose committed sources depend on historical defaults. It changes neither browser access nor service write privileges, RLS, function execution or defaults. It is a forward migration, not a rewrite of applied history.

Run `scripts/data-api-grants-db-check.js` with the CI-pinned PGlite runtime to replay supported explicit table ACL/RLS statements with automatic grants absent. It builds 69 data-free table shapes, executes the new migration in full twice, and verifies missing-grant, browser-write, browser-exposure, RLS and future-table failures. `supabase/verification/data-api-grants.sql` is the corresponding read-only live catalog audit. Views, sequence grants, function execution, full constraints, Auth and end-to-end PostgREST behavior remain separate checks. The ACL extractor covers conventional schema-qualified explicit SQL; dynamic DDL or nonstandard naming needs dedicated database fixtures.

This is NOT a complete fresh-reset acceptance test. The five exact baseline files are now recovered; `scripts/baseline-migrations-db-check.js` executes them unmodified with a minimal Auth fixture and tests real baseline constraints/RPCs/two-learner RLS. The ACL test now derives baseline names/grants from those files. A separate disposable full-source replay applied 19 migrations before stopping at `20260927114500_policy_experiment_framework.sql`: this PGlite runtime does not provide `extensions.digest(text,text)` from pgcrypto. Complete Supabase platform/extension setup and remaining migration replay are unverified. No source SQL was bypassed or shimmed to claim success; production was not reset.

Recovery note: the original 18-table ACL gap included four tables whose explicit grants were in the missing historical baseline. Recovery proved those four already declare grants; the new forward migration therefore covers the remaining 14 only. Baseline recovery inserts only an empty initial catalog in the disposable test, never historical medical content or real accounts.

## Protected medical relationship registry — development only, 2026-10-23

`20261023091436_medical_relationship_registry.sql` adds immutable governed relationship versions/lifecycle receipts, service-only Admin RPCs and a trusted extension to the existing Library snapshot. See `docs/MEDICAL_RELATIONSHIP_REGISTRY.md` for current source/reviewer rights, privacy/export and fail-closed rollback. No clinical rows, grants or attestations are seeded. Disposable PostgreSQL verification is not proof of a live migration; deployment remains pending explicit release authorization. The Supabase CLI was unavailable in this workspace, so this forward filename uses the observed UTC creation timestamp.
