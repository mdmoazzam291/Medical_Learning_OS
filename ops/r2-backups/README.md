# R2 backup storage

Status: **R2 transport verified, first Supabase logical backup succeeded, and a no-paid-infrastructure local application-data restore drill passed**.

The private Cloudflare R2 bucket is reserved for Medical Learning OS backups. GitHub Actions holds the S3 credentials as encrypted repository secrets and the non-sensitive bucket/endpoint values as repository variables. Public access stays disabled.

## GitHub configuration

Required repository secrets:

- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `SUPABASE_DB_URL` for database backups only

Required repository variables:

- `R2_BUCKET`
- `R2_ENDPOINT`

Keep the R2 token scoped to Object Read & Write on only the backup bucket.

## Verified R2 transport

`.github/workflows/r2-smoke-test.yml` is manual-only. It writes a non-sensitive canary object, reads it back and byte-compares the result.

The GitHub Actions → R2 path passed on 2026-09-25 in workflow run:
https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/36147165531

That proves the configured repository secrets, endpoint, bucket write and bucket read path. It does **not** prove database backup or restore.

## Supabase logical backup

`.github/workflows/supabase-r2-backup.yml` is manual-only until its first successful backup and restore drill.

It uses the official Supabase CLI dump pattern and creates:

- `roles.sql`
- `schema.sql`
- `data.sql`
- `SHA256SUMS`
- `manifest.json`

These are packaged into one `backup.tar.gz`, checksummed, uploaded under a UTC date/timestamp prefix, then size-verified in R2.

Use a **Session pooler** PostgreSQL connection string for `SUPABASE_DB_URL` because GitHub-hosted runners need reliable IPv4 connectivity. Store the complete connection string only as an encrypted GitHub repository secret.

The current Supabase project is `iyapppmeieqhflnzslao`. Never point this workflow at the older NEETPG2027 project.

## First successful database backup

GitHub Actions run 36178061717, attempt 2, completed successfully on 2026-09-25 UTC. It created the Supabase CLI logical dump set, uploaded the archive and checksum to R2, and verified the remote archive size.

Verified R2 prefix:

`supabase/2026/09/25/20260925T191515Z`

This proves database dump creation and off-provider storage transfer. It still does not prove recoverability.

## Activation gate

Before enabling a schedule:

1. Perform a documented restore drill into a disposable target.
2. Validate key schemas/data and application-critical invariants after restore.
3. Define retention and deletion rules.
4. Only then enable recurring backups.

Database dumps do not contain Supabase Storage object bytes, Edge Functions, Auth settings/API keys, Realtime settings, or other provider configuration outside Postgres. Those require separate backup/configuration procedures as they become used.

Never commit database passwords, R2 credentials, service-role/secret keys, or dumps to the repository.


## Zero-cost restore drill

Workflow: `.github/workflows/restore-drill.yml`

Verified run: https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/36182059722

The drill:
- downloads the archived backup and checksum from private R2;
- verifies the archive SHA-256 and the per-file checksums;
- starts a disposable local Supabase stack on the GitHub runner;
- restores the dumped application schema and application data;
- verifies the restored `public.study_catalog` invariant against the source snapshot;
- destroys the disposable local stack afterward.

The original `roles.sql` and full `data.sql` remain preserved and checksum-verified in the backup archive. The local drill deliberately excludes provider-managed Auth/Storage COPY blocks and does not apply managed role settings because the local Supabase stack already owns those objects and protects some internal tables/settings. Therefore this proves recoverability of the application's Postgres schema/data, not a byte-for-byte recreation of every Supabase-managed service.

No paid Supabase branch was created for this drill.

## Verified restore drill — 2026-09-25 UTC

Workflow run [36183482247](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/36183482247) passed using the existing backup prefix above. It verified the archive checksum, all SQL checksums and manifest, restored roles/schema/data transactionally into disposable local Supabase Postgres 17, confirmed RLS on four study tables, and compared their COPY output against the original backup data exactly (ignoring row order). Cleanup passed.

The original roles dump requires the local `supabase_admin` account to reproduce hosted role grants; the normal local `postgres` role received SQLSTATE 42501. The archive was not modified. This is evidence for local logical recovery of this snapshot, not a hosted failover, full application recovery, or exhaustive authorization audit. Storage bytes, provider settings and migration-history coverage remain separate concerns.

The restore workflow is manual-only and fixed to this verified snapshot. It reads existing R2 objects, never receives `SUPABASE_DB_URL`, and creates no hosted database. No dump artifacts are uploaded. It consumes standard GitHub runner minutes and R2 reads; remaining free allowances determine billing. The temporary branch-only push trigger used for the initial drill was removed. Define retention/deletion rules and broader recovery checks before recurring backups.

## Retention and upload limits — 2026-09-26 IST

Implemented in `ops/r2-backups/storage_guard.py` and checked immediately before either backup upload.

| Control | Policy |
| --- | --- |
| Recent backups | Keep every snapshot from the last 30 days |
| Recovery floor | Keep the newest seven complete archive/checksum pairs, even when older |
| Restore-tested snapshot | Always retain `supabase/2026/09/25/20260925T191515Z` |
| Unknown/incomplete objects | Retain for manual review |
| Recently modified objects | Retain until both creation and modification are older than 30 days |
| Storage notice | Projected bucket usage at least 5,000,000,000 bytes |
| Upload stop | Projected usage at least 7,000,000,000 bytes |
| Single archive ceiling | 250,000,000 bytes; checksum maximum 4,096 bytes |
| Storage class | Explicit Standard uploads |
| Cleanup execution | Report-only; no deletion API or bucket lifecycle change |
| Recurring backup/audit | Disabled; manual dispatch only |

The inventory counts every object in this bucket, follows pagination and blocks uploads on incomplete/error responses. The gate includes the incoming archive and checksum, and does not subtract hypothetical cleanup savings. Backup and audit workflows share one concurrency group. Other writers can still race this check.

Verified read-only audit: [36184446054](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/36184446054). Result: 11,808 bytes, five objects, two complete archive/checksum pairs, pinned snapshot present, zero cleanup candidates. Eight synthetic tests passed, including pagination/error handling, exact upload boundary, newest-seven protection and pinned retention. A pair's existence is not proof of recoverability; the restore drill provides that evidence for the pinned snapshot.

This is a bucket-specific upload control, not an account-wide billing cap. Other buckets, monthly operations, in-flight multipart storage and other upload paths are outside it. The read-only audit consumes listing operations and standard runner minutes. R2's Standard free allowances are account usage allowances, not a guaranteed zero invoice. See [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

No age-only R2 expiration rule is installed: such a rule could remove the last recoverable backup after a prolonged outage. Before enabling cleanup, review exact candidate objects and ensure a newer restore-tested snapshot exists. Before scheduling backups, review account usage/billing controls and agree on frequency.
