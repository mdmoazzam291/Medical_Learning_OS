# ADR-134 — first managed staging database smoke (rollback-only)

**2026-11-01 · Draft PR #371 stacked on #370 · source-review release remains blocked.**

## Execution target and safety contract

The explicitly approved staging **identity** was verified through the
connected Supabase project API before SQL execution:

- `medical_learning_os_staging` / `vwtdwafjrraptrgeshzt`, Mumbai
  (`ap-south-1`), `ACTIVE_HEALTHY`.
- Production `medical_learning_os` / `iyapppmeieqhflnzslao` was not
  targeted. The inactive legacy `NEETPG2027` was not targeted.
- Baseline: managed PostgreSQL **17.11**, zero public tables,
  zero migrations and no application review endpoints.

The first `execute_sql` request on staging was a simple smoke transaction
using a synthetic temporary table, with explicit `BEGIN; ... ROLLBACK;`.
The second request executed a more focused synthetic `BEGIN; ... ROLLBACK;`
transaction with **three `CREATE TEMP TABLE ... ON COMMIT DROP` tables**
(session, grant, receipt). There was no Auth session read, Auth user creation,
real reviewer, medical source, actual grants or provider-side logout.

The reproducible SQL is stored in
`ops/prototypes/source-evidence/internal-review-staging-rollback-only-smoke.sql`.
The repository copy uses the same synthetic structure and checks, but the
displayed receipt field is correctly labeled `synthetic_receipt_count`,
not an unverified claim that a receipt row is immutable.

## Observed managed staging results

| Check | Observed |
| --- | --- |
| Temporary session/grant row can be selected `FOR UPDATE` | Passed within one transaction |
| Duplicate request identifier inserts only one synthetic receipt | 1 row |
| No matching grant under foreign synthetic reviewer UUID | 0 rows |
| Owned synthetic session revoked | `true` |
| Owned synthetic grant revoked | `true` |
| Provider-owned `auth.sessions` table exists | `true` |
| Permanent public application tables after rollback | 0 |
| Applied migrations after rollback | 0 |
| Public synthetic test tables after rollback | None |

After both transactions, an independent staging-only inspection returned
`list_tables(public): []`, `list_migrations: []`, and a read-only
catalog check found no permanent synthetic session, grant or receipt tables.
The tool result is recorded as observations here; it is **not** a managed
security certification.

## Explicitly NOT established

- **No cross-connection concurrency** was exercised. A `FOR UPDATE` in a
  single transaction proves syntax/managed compatibility, not revocation
  ordering under two simultaneous PostgreSQL sessions. Only earlier
  disposable *local* tests (#366) exercised two real lock orders.
- **No authenticated Supabase user JWT** was used against the managed staging
  Data API. Current `getUser`/PostgREST difference was tested only in
  disposable local GoTrue (#368), not on staging.
- `ON CONFLICT (request_id) DO NOTHING` only deduplicates the key and
  does **not** prove that a retried payload has the same case, digest,
  disposition, reviewer or authorization. Real replay handling must
  compare the entire immutable request fingerprint and reject mismatches.
- The temporary receipt table has a PK but **no immutability trigger** or
  authoritative receipt signature. A persisted protected receipt remains
  unimplemented and unverified in managed staging.
- App-owned revocation cannot be considered atomic with provider-only
  signout, account deletion, MFA changes or password reset.
- SQL editor administrator permissions are **not** a least-privileged
  reviewer/RLS acceptance. No staging SQL functions, Data API grants,
  security-definer procedures, migrations or synthetic GoTrue accounts
  were installed by this experiment.
- This cannot authorize review decisions, clinical or source-rights
  correctness, `Review → Live`, production deploy or learner publication.

## Next acceptance

Review an isolated, least-privilege staging-only Auth/DB harness with
synthetic users, scoped exact grant issuer and an explicitly staged private
RPC boundary. Before any write-bearing test migration, independently
inspect schema owner, `SECURITY DEFINER` execution grants, RLS, release
eligibility, source-package version and digest bindings, request idempotency
conflict handling, and cleanup guarantees.

Keep the application review API and external provider #350 disabled.
All PRs remain draft/unmerged until owner review. A passing static CI
check on this SQL proves only the safety of the checked-in test pattern,
not the authority of any future project connection.
