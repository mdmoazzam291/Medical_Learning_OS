# R2 backup storage

Status: **R2 transport verified and first Supabase logical backup succeeded; restore drill not yet completed**.

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
