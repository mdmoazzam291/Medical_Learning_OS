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
