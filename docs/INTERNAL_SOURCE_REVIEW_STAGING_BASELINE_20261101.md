# ADR-134 — dedicated staging established and catalog-only acceptance

**2026-11-01, draft PR #370, stacked on #369.**
The operator authorized a separate source-review staging project in the
existing `Medical ORG` Supabase organization, region `ap-south-1`
(Mumbai). Supabase quoted **$0/month** for **project creation** and
returned a required cost-confirmation token before the project could
be created. Creation succeeded. This is a project-creation quote, **not**
an assertion that all future operations, upgrades, or usage are free.

## Observed project identity

| Purpose | Project | Ref | Status |
| --- | --- | --- | --- |
| Protected existing MLOS production | `medical_learning_os` | `iyapppmeieqhflnzslao` | `ACTIVE_HEALTHY` |
| New synthetic-test staging | `medical_learning_os_staging` | `vwtdwafjrraptrgeshzt` | `ACTIVE_HEALTHY` |
| Excluded inactive legacy | `NEETPG2027` | `ueuguguoladoqvtxkumt` | `INACTIVE` |

All were reported in organization `ltvogluubibhqvtxbegg`. The
staging database was reported as PostgreSQL **17.11** on read-only SQL
inspection; production's earlier baseline reported PostgreSQL 17.6.
**Differences in versions must be included in parity testing.**

## Non-destructive verification already performed

On the **new staging project only**:

1. `get_project` returned `ACTIVE_HEALTHY`, correct name/region/org.
2. `list_migrations` returned **no application migrations**.
3. `list_tables(schemas:['public'])` returned **no public tables**.
4. `get_advisors(type:'security')` returned **no current lint notices**.
   No findings on an empty environment are **not security certification**.
5. A catalog/ACL-only SQL `SELECT` returned:
   - `auth.sessions` exists.
   - Both `authenticated` and `service_role` have `USAGE` on the
     `auth` schema but **no direct SELECT or UPDATE** privilege on
     `auth.sessions`.
   - `public` contained **zero user tables**.
   - No user, session, permission grant, or source-review records were
     selected. No schema modifications, data writes, or migrations ran.

No production SQL was executed during this creation/validation step,
no production content/users/backups were copied, and no public app was
changed.

## Repository contract

`ops/prototypes/source-evidence/internal-review-staging-policy.json`
now pins `approvedStagingProjectRef` to the newly verified ref.
**Approved means an explicitly selected isolated *identity* for future
security acceptance, not approval for database writes**.

`scripts/internal-source-review-staging-target-gate.mjs` remains
metadata-only. Even a perfect target identity match yields:
`stagingDbWriteApproved:false`,
`stagingAuthAcceptanceApproved:false`,
`managedMigrationApproved:false`,
`productionSourceReviewApproved:false`,
`learnerRelease:false`, and
`stagingIdentityVerified:false` (because the classifier itself cannot
authenticate external metadata provenance). No credentials are embedded
in the repository and the project ref is not a secret.

## Gate before write-bearing acceptance

- Obtain separate explicit authorization for synthetic-only staging SQL
  fixtures and disposable user accounts; review precise migrations and
  least-privilege RPC exposure first.
- Verify trusted project identity at the actual connection boundary, not
  just from a caller-supplied `projectRef` or hostname string.
- Review schema-owner and SECURITY DEFINER privileges, Data API exposure,
  RLS, exact grant issuance/revocation writers, and backup/restore.
- Test provider session validity and JWT time-of-check/time-of-use races;
  previous #368 local `getUser` tests **do not establish atomic Auth/DB
  signout consistency**.
- Keep production `Review → Live`, clinical/rights approvals, Admin
  source-review endpoints, external provider #350, and learner publication
  OFF until independent security and human authority approval.

No staging SQL fixture, Auth user, migration, privileged RPC, or secret
was created in this step. This draft is review-only; do not merge/deploy
automatically.
