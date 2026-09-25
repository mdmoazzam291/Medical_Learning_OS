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
