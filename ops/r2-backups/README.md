# R2 backup storage

Status: **R2 transport, first logical backup and disposable local restore drill verified; recurring backups remain disabled**.

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

This proves database dump creation and off-provider storage transfer. Recoverability of this snapshot was subsequently checked by the local restore drill below.

## Activation gate

Before enabling a schedule:

1. Perform a documented restore drill into a disposable target.
2. Validate key schemas/data and application-critical invariants after restore.
3. Define retention and deletion rules.
4. Only then enable recurring backups.

Database dumps do not contain Supabase Storage object bytes, Edge Functions, Auth settings/API keys, Realtime settings, or other provider configuration outside Postgres. Those require separate backup/configuration procedures as they become used.

Never commit database passwords, R2 credentials, service-role/secret keys, or dumps to the repository.

## Verified restore drill — 2026-09-25 UTC

Workflow run [36183482247](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/36183482247) passed using the existing backup prefix above. It verified the archive checksum, all SQL checksums and manifest, restored roles/schema/data transactionally into disposable local Supabase Postgres 17, confirmed RLS on four study tables, and compared their COPY output against the original backup data exactly (ignoring row order). Cleanup passed.

The original roles dump requires the local `supabase_admin` account to reproduce hosted role grants; the normal local `postgres` role received SQLSTATE 42501. The archive was not modified. This is evidence for local logical recovery of this snapshot, not a hosted failover, full application recovery, or exhaustive authorization audit. Storage bytes, provider settings and migration-history coverage remain separate concerns.

The restore workflow is manual-only and fixed to this verified snapshot. It reads existing R2 objects, never receives `SUPABASE_DB_URL`, and creates no hosted database. No dump artifacts are uploaded. It consumes standard GitHub runner minutes and R2 reads; remaining free allowances determine billing. The temporary branch-only push trigger used for the initial drill was removed. Define retention/deletion rules and broader recovery checks before recurring backups.
