# Source-review staging-target isolation — fail-closed inventory gate

**2026-11-01 • ADR-134 / issue #353 • Draft PR #369 stacked on #368.**
This is a metadata-only environment selection guard, not a deployment
manifest, managed DB migration, security approval, staging project creator
or user/clinical content release.

## Observation

The connected Supabase project list was checked again on 2026-11-01:

| Existing project | Observed state | Approved for source-review staging? |
| --- | --- | --- |
| `medical_learning_os` | `ACTIVE_HEALTHY` | **No — current production; protected** |
| `NEETPG2027` | `INACTIVE` | **No — older unrelated project** |
| A separately named `medical_learning_os_staging` | Not found | **No target exists** |

No project was created or revived, and no Auth session, learner data,
grant, table, migration, provider setting or production secret was read or
changed. Previous #365 permission-only inventory remains the basis for
not locking provider-managed `auth.sessions` in production.

## Guard contract

`ops/prototypes/source-evidence/internal-review-staging-policy.json`
pins the **observed** production project ref, explicitly excludes the old
legacy project ref, requires an `ACTIVE_HEALTHY` and correctly named
separate staging target in the same organization, and deliberately sets
`approvedStagingProjectRef: null`.

`scripts/internal-source-review-staging-target-gate.mjs` classifies
read-only project-list metadata. It must reject malformed data, aliases,
duplicate IDs, swapped production identity, inactive or differently named
targets, unknown legacy approval, inherited/accessor values, forged policy
fields and unexpected project ownership. The classifier only matches
documented metadata; its input is **not** independently authenticated by
the code. It never calls Supabase or any network service.

`tests/internal-source-review-staging-target-gate.test.js` uses a
synthetic/statically captured model of the current two-project inventory
and negative cases, plus a hypothetical separate staging project. It does
**not** establish a real staging environment.

**Even if a future named staging target matches metadata**, the only
positive field is `isolatedStagingMetadataMatched`. The following remain
false in *every* result:

- `trustedProviderInventoryVerified`, `stagingIdentityVerified`
- `stagingAuthAcceptanceApproved`, `stagingDbWriteApproved`
- `managedMigrationApproved`, `productionSourceReviewApproved`
- `reviewerGrantAuthorityVerified`, `learnerRelease`

A matching name or ID is not a trustworthy source of authorization.
The pinned policy can itself be edited in Git and is not a secret or
tamper-proof authority. It requires independent repository review.

## Next operational prerequisite

1. Explicitly approve/provision a **new** separate Supabase project intended
   only for synthetic security acceptance. Confirm the plan's actual cost
   or capacity before creation; do not repurpose the inactive legacy project.
2. Independently verify the production/staging project refs, organization,
   Data API settings, and security boundaries through an authenticated
   management interface. Update the approved staging ref only after
   owner review in a separate PR; do not put service keys or JWTs into Git.
3. Obtain specific authorization for **staging-only** test migrations and
   synthetic reviewers. Run least-privilege current provider-session
   verification and application-owned grant/revocation races, including
   provider-only signout, ambiguity and backup/restore.
4. Independently review isolation, RLS, revocation semantics, protected
   receipt readback, qualification/independence and source rights. Keep
   real source-review writes, Admin UI and learner publication blocked
   until owner-approved production release.

This guard does not prove review authority, availability of project quota
or any claim of transactionally immediate provider logout. Existing
review PRs remain DRAFT and unmerged. External provider PR #350 remains OFF.
