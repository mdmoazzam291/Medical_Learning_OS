# R2 backup storage

Status: **transport configured, database backup not active yet**.

The private Cloudflare R2 bucket is reserved for Medical Learning OS backups. GitHub Actions holds the S3 credentials as encrypted repository secrets and the non-sensitive bucket/endpoint values as repository variables.

## GitHub configuration

Required repository secrets:

- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Required repository variables:

- `R2_BUCKET`
- `R2_ENDPOINT`

Keep the R2 token scoped to Object Read & Write on only the backup bucket. Public access stays disabled.

## Smoke test

`.github/workflows/r2-smoke-test.yml` is intentionally manual-only. It writes a non-sensitive canary object to `smoke-tests/github-actions-r2.json`, reads it back, and byte-compares the result. This verifies GitHub Actions → R2 credentials → bucket write/read without touching learner or medical data.

Run it from GitHub **Actions → R2 backup storage smoke test → Run workflow** after this branch is merged.

## Database backup gate

Do not call the system "backed up" yet. A real Supabase logical backup still needs a server-only database connection secret, then a separate scheduled `pg_dump` workflow with dump validation and a documented restore drill.

Planned next credential:

- `SUPABASE_DB_URL` as a GitHub repository secret, using a Supabase connection string suitable for an external GitHub-hosted runner.

Never commit database passwords, R2 credentials, service-role/secret keys, or dumps to the repository.
