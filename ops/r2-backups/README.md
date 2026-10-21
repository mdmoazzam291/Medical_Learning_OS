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

`.github/workflows/supabase-r2-backup.yml` runs weekly on Sunday at 03:47 IST (Saturday 22:17 UTC), with manual dispatch available.

It uses the official Supabase CLI dump pattern and creates:

- `roles.sql`
- `schema.sql`
- `data.sql`
- `access.sql` (v2: exact public owners, grants, column privileges and defaults)
- `SHA256SUMS`
- `manifest.json`

These are packaged into one `backup.tar.gz`, checksummed, uploaded under a UTC date/timestamp prefix, then size-verified in R2. Format `supabase-cli-sql-access-v2` includes four SQL checksums. The read-only access exporter runs before and after the dump and rejects metadata drift; this does not make separate dump connections a single transactional snapshot.

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
| Recurring backup/audit | Backup weekly Sunday 03:47 IST; audit manual-only |

The inventory counts every object in this bucket, follows pagination and blocks uploads on incomplete/error responses. The gate includes the incoming archive and checksum, and does not subtract hypothetical cleanup savings. Backup and audit workflows share one concurrency group. Other writers can still race this check.

Verified read-only audit: [36184446054](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/36184446054). Result: 11,808 bytes, five objects, two complete archive/checksum pairs, pinned snapshot present, zero cleanup candidates. Eight synthetic tests passed, including pagination/error handling, exact upload boundary, newest-seven protection and pinned retention. A pair's existence is not proof of recoverability; the restore drill provides that evidence for the pinned snapshot.

This is a bucket-specific upload control, not an account-wide billing cap. Other buckets, monthly operations, in-flight multipart storage and other upload paths are outside it. The read-only audit consumes listing operations and standard runner minutes. R2's Standard free allowances are account usage allowances, not a guaranteed zero invoice. See [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

No age-only R2 expiration rule is installed: such a rule could remove the last recoverable backup after a prolonged outage. Before enabling cleanup, review exact candidate objects and ensure a newer restore-tested snapshot exists. Before scheduling backups, review account usage/billing controls and agree on frequency.

## Weekly activation — 2026-09-26 IST
User explicitly authorized weekly backups. Cron `17 22 * * 6` runs on the default branch; first scheduled slot is 2026-09-27 03:47 IST. GitHub may delay scheduled execution. Existing upload limits and concurrency remain active. Cleanup remains report-only: backups accumulate until manually reviewed or upload limits stop new backups. Account billing settings have not been changed or verified. To disable recurrence, remove only the `schedule` block; retain `workflow_dispatch`.


## Full database restore gate — 2026-10-21 (partial verification; Vault blocked)

The encrypted Vault recovery implementation is now prepared. Follow [private key setup and acceptance](VAULT_RECOVERY_SETUP.md). With a configured public age recipient, the producer creates `supabase-cli-sql-vault-v3` and includes `vault.json.age` with its fifth inner checksum. Without a recipient, the existing v2 SQL backups continue and strict Vault recovery remains blocked. The private recovery identity is supplied only to the isolated verification step. Target provisioning uses the supported Vault API and compares every unique name, description and value; Vault row UUIDs/timestamps are regenerated. Real encrypted production recovery remains unverified until owner key configuration and a passing actual v3 drill. Synthetic fixtures never substitute for this acceptance.

The expanded latest-backup drill uses pinned CLI 2.121.0 and the real local Supabase Postgres 17 image. It restores the original roles/schema/data archive unmodified, with no production connection supplied to the restore step. Before any archive SQL runs, its disposable database is disconnected from every Docker network and cron job launching is disabled and checked. The archive keeps its existing post-reset, nine-day freshness and checksum gates. Private logs/dumps are removed and never uploaded as artifacts.

`verify_restore.py` requires every public application table declared in the repository (currently 69), compares every COPY block in every dumped schema using order-independent, duplicate-sensitive SHA-256 row fingerprints, checks public/Auth/Storage foreign keys, requires Auth users/identities/sessions in the backup, requires actual Vault backup coverage and successful decryption, and rechecks disabled cron. Table rows, hashes, identities and decrypted secrets are not printed. The read-only role/RLS audit runs against the restored database, followed by an exact comparison of source and restored public access metadata. Owner-authored same-repository PR validation first invokes the existing private backup producer for a fresh v2 archive; fork/non-owner PRs cannot run its credentialed jobs. Monthly/manual drills use the latest archive. No new remote project is created.

The first real PG17 probe (run39603974776) restored the original post-reset roles/schema/data but failed the access audit: destination platform grants survived restoration. The v2 access manifest explicitly removes destination public grants/defaults and restores the source owners and permissions. Do not weaken the audit to accept the destination defaults.

Full recovery remains blocked: CLI2.121.0 excludes Vault from its normal data dump. Encrypted Vault rows alone would also require a tested key recovery strategy. The gate deliberately rejects missing Vault coverage; a successful data/access stage is partial evidence. Current code does not export decrypted secrets. Before implementing a secrets backup, establish a separately recoverable encryption recipient/key and private provisioning process. Alternatively, explicitly adopt and test replacement credential provisioning; changing the acceptance contract must be documented rather than treating an empty Vault as a restore. Repository source names five monitoring settings in `20261003153000_owner_operations_v3.sql`; this source list is not a live secret inventory. Keep cron and outbound networking disabled until target secrets/endpoints and application authorization are independently validated. No secret values belong in Git, logs or CI artifacts.

A pass proves the specified checks for the selected snapshot, not live failover, zero data loss since that snapshot, external Storage object recovery, JWT/OAuth/SMTP configuration recovery or end-to-end Auth/PostgREST/Edge Function behavior. The receipt must retain its actual backup date. A fresh export and separately tested cutover are still required before replacing a provider.

Blank historical migration replay is a different operation: old source files include one-time content-dependent calls and a cron modification before its source creator. Do not restore erased pilot material or silently skip/shim historical statements to label that replay successful. Use a current post-reset logical snapshot for recovery; a clean-install schema baseline requires separate reconciliation.


### Actual v2 restore receipt

Draft [PR292](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/292), tested source `637807749bc9f9cb0dcbb91312740ecaea046a6b`, workflow [39606903113](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/39606903113): snapshot `supabase/2026/10/21/20261021T131907Z` was created and verified, then restored into isolated PG17. The 69-table public access/RLS audit passed and exported source/restored public access metadata matched exactly. All 69 required public tables and all 102 dumped COPY tables matched, Auth coverage passed and public/Auth/Storage foreign-key checks passed. The strict final gate failed `vault_backup_coverage_missing`. Cleanup succeeded. This receipt establishes the completed data/access checks only; full recovery remains incomplete. No production SQL or erased content was restored.


### Corrected mechanism acceptance and remaining owner gate

On tested code `12cbafe87cde162872370e29d2aa9d613ffbda62`, [workflow39619055185](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/39619055185) verified snapshot `supabase/2026/10/21/20261021T144629Z`. The real isolated PG17 synthetic fixture passed age encryption, target-key Vault provisioning, exact value/description comparison and refusal to overwrite existing secrets. Source restoration then passed exact public access, all69required public/all102COPY tables, Auth coverage and FK checks. Final strict gate still failed `vault_backup_coverage_missing`: the actual archive is v2 while the owner recipient is unconfigured. Cleanup passed. Foundation39619055184 core, Chromium and WebKit all passed on that code. This receipt proves the mechanism and specified data/access checks; actual-secret v3 and independent-key acceptance remain required. Follow [private owner setup](VAULT_RECOVERY_SETUP.md); do not mark full recovery complete or merge the draft on synthetic evidence alone.
