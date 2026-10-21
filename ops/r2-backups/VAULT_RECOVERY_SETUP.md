# Private Vault recovery setup

The source database contains live Vault configuration. Standard SQL backups exclude it, and its platform root key is stored outside the database. The prepared v3 path exports named secrets read-only, encrypts the JSON with pinned age 1.3.2, and archives only `vault.json.age`. During an isolated restore, the supported `vault.create_secret` API encrypts those values with the target's own root key. All names, descriptions and values must match before the transaction commits. No source root key is changed or extracted.

Configuration was completed on 2026-10-21 under explicit owner delegation; a private recovery kit was preserved and independently retrieved for a synthetic cryptographic check. Actual v3 backup/restore acceptance is still pending. Configuration alone does not certify recovery. Missing public recipient leaves the existing v2 SQL backup working; the full Vault recovery gate still fails. Missing/wrong private identity or modified ciphertext also fails.

## One-time owner configuration

On a trusted machine with [age installed](https://github.com/FiloSottile/age#installation), generate a dedicated key:

```sh
umask 077
age-keygen -o mlos-recovery-identity.txt
age-keygen -y mlos-recovery-identity.txt > mlos-recovery-recipient.txt
```

Keep `mlos-recovery-identity.txt` in an encrypted password manager or offline recovery location independent of the Supabase, Cloudflare and GitHub accounts. Keep a second recoverable copy. Its `AGE-SECRET-KEY-...` line is private; do not paste it into chat, Git, an issue or a repository variable. Losing every copy makes these encrypted exports unrecoverable.

Configure only this repository:

- [Repository Actions variables](https://github.com/mdmoazzam291/Medical_Learning_OS/settings/variables/actions): `MLOS_RECOVERY_AGE_RECIPIENT` = the public `age1...` line in `mlos-recovery-recipient.txt`.
- [Repository Actions secrets](https://github.com/mdmoazzam291/Medical_Learning_OS/settings/secrets/actions): `MLOS_RECOVERY_AGE_IDENTITY` = the private identity file contents. This permits automatic recovery drills; the separately held owner copy remains essential if the GitHub account is lost.

The backup producer receives only the public recipient. The recovery identity is scoped to the isolated verification step, after archive SQL has run with networking disconnected and cron disabled. No new paid service/account is required. On 2026-10-21 the owner delegated this setup: a dedicated key was generated, the private owner recovery kit saved and independently retrieved/verified, and both repository settings configured. The private key is absent from this repository and chat. Owner download/offline retention has not been observed. See current handoff for actual acceptance status.

## Acceptance before declaring recovery complete

1. Create a fresh backup and confirm its manifest is `supabase-cli-sql-vault-v3`, with five inner checksums including the ciphertext.
2. Run the owner-authorized isolated restore drill. Its synthetic fixture must first prove real target Vault encryption/decryption and exact adversarial-value recovery using a temporary test identity.
3. Require actual application data, Auth, FK and access checks, then actual encrypted Vault provisioning/value comparison, all on that snapshot. A synthetic pass cannot replace the real-secret acceptance.
4. Record the workflow, exact snapshot and code revision, plus cleanup. Do not mark a v2 snapshot verified for Vault or remove strict coverage checks.
5. Test retrieval with the separately retained owner identity, outside reliance on the GitHub secret, before accepting account-loss recovery.

Vault recovery is by **unique name**. Source Vault row UUIDs and timestamps are not retained; unnamed/duplicate-name settings fail closed. The current application looks up monitoring secrets by name. Any future UUID references require a separate mapping/compatibility change; do not silently translate application IDs. Source settings may change across separate export/dump connections, so this is not a consistent cross-service snapshot or zero-RPO claim.

The fixture runs only against `supabase_db_mlos-local-restore`, with no Docker networks and cron launching off, and removes its own synthetic entries before the source dump is restored. Production values are never used for the fixture. Keep the target disconnected after provisioning: outbound endpoints, cron commands, Auth/OAuth/JWT/SMTP configuration, Storage bytes, and application runtime/provider acceptance remain separate checks.

References: [Vault API and key location](https://supabase.com/docs/guides/database/vault), [age usage and key generation](https://github.com/FiloSottile/age), [pinned release](https://github.com/FiloSottile/age/releases/tag/v1.3.2).
