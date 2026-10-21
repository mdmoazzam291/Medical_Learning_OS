# Explicit Data API grants implementation plan

Goal: remove existing server-read dependence on automatic grants while preserving access boundaries.

Scope: forward SQL read grants, isolated ACL regression, read-only live audit and CI. Historical migrations remain immutable; full schema reconstruction and provider-default changes are excluded.

- [x] Inspect current repository, ownership, migrations and live role privileges.
- [x] Reproduce missing service reads using actual explicit table ACL/RLS statements without automatic defaults.
- [x] Add forward SELECT-only grants for the affected tables; execute the real migration twice in isolation and compare browser/write/RLS permissions.
- [x] Verify missing-grant, anonymous exposure, learner writes, missing RLS and future-table negative controls.
- [x] Add the isolated database check to existing CI and document incomplete baseline/full-rebuild coverage.
- [x] Persist reviewed code, test results and resumable handoff to the task branch; open a review PR.

Acceptance: all existing Node and database checks pass; live catalog audit passes without writes. No claim of full-reset or PostgREST acceptance.

## Baseline follow-up — 2026-10-21
- [x] Recover all five original baseline statements and verify exact bytes; pin hashes.
- [x] Execute actual baseline DDL/RPCs with synthetic Auth identities and verify row isolation and retry/version behavior.
- [x] Remove invented baseline ACL fixtures and remove four redundant forward grants proved by recovered sources.
- [x] Attempt broader unmodified source replay; stop at the first missing platform dependency.
- [ ] Complete replay in a disposable environment with the real Supabase extensions/platform schemas. PGlite stopped after 19 migrations at missing pgcrypto digest.
