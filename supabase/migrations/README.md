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

These files are the canonical repository copies for all M04c DDL applied after the historical five-migration baseline.
