# Service portability and exit procedures

Owner direction recorded 21 October 2026: current and future infrastructure must remain replaceable. This contract applies to humans and development AIs through AGENTS.md, CLAUDE.md and GEMINI.md. It prepares migrations; it does not claim every existing integration is provider-independent or authorize a live move.

## Authoritative records

- [Service register](../ops/portability/services.json): data held, current source evidence, boundary, export/restore path and unresolved gaps for each service.
- [Coupling baseline](../ops/portability/coupling-baseline.json): acknowledged existing implementation locations, not an architectural endorsement or a live resource inventory.
- [Architecture](ARCHITECTURE.md), [data contracts](DATA.md), [content contract](CONTENT_LIBRARY_CONTRACT.md) and [AI continuity](AI_CONTINUITY.md): application truth.
- Current [backup operations](../ops/r2-backups/README.md) and actual workflow/source versions: snapshot recovery evidence must be reconciled with the current database before use. Earlier historical restore receipts do not prove recovery of today's full platform.

The register distinguishes configured source, optional designs, disabled sandbox work, fallback code and owner-reported mailbox use. It contains no credential values or actual learner exports. Account settings, active plans, resources and volumes were not audited live in this change.

## Rule for all future development

Before adding or changing an external service:

1. Identify the application-owned capability and canonical data owner. Keep medical knowledge, exact content versions/review evidence, immutable learning events, personal overlays and derived analytics distinct.
2. Use a narrow adapter/port. Domain algorithms must not depend on vendor SDKs, HTTP endpoints, cloud bindings or provider-only IDs. Reuse existing capability, storage, AI and payment contracts. Existing debt must not spread into new domain files.
3. Preserve application IDs, question/event versions, idempotency keys, timestamps/time semantics, learner ownership and publication/research/rights states. Map external issuer/subject and customer IDs separately. Do not remap historical evidence silently.
4. Add/update the service register with data held, source files, export and restore procedures, exit gaps and current verification evidence. A new tool also needs privacy, deletion, cost and failure behavior appropriate to its use.
5. Test adapter behavior without a live account: failures, retries/idempotency, authorization, exact-version behavior and side effects. For durable data, demonstrate export/import round trips and a disposable restore before declaring migration-ready.
6. Keep deployment/binding metadata in source where possible. Keep secret **names and provisioning instructions**, never values, in source. Record dashboard-only settings privately with dated receipts. Re-provision credentials at the destination.
7. Review the coupling diff and run `npm run check:portability`, `npm test` and `npm run check`. New integrations must update the PR portability declaration. Do not auto-refresh a baseline merely to make CI green.

A provider-specific feature is allowed when useful, with an explicit exit cost and tested alternative or documented gap. Do not add an abstraction for an imagined provider, create a second canonical catalog or pretend PostgreSQL SQL/RLS/RPC is portable to SQLite/D1 unchanged.

## What is checked automatically

`npm run check` invokes the service-register/coupling check, so existing Foundation CI runs it. `npm run check:portability` runs only this check. It rejects missing exit fields/references, duplicate service IDs, new path/provider pairs and stale exceptions. It scans implementation/configuration in src, web, cloudflare, supabase, ops, scripts and .github, plus root code/config files, including SQL and workflows. Source, dependency manifests and HTML are included; test fixtures, docs and material data are excluded.

The checker matches registered provider markers case-insensitively, including in comments. It does not prove runtime isolation, inspect dashboards, understand computed imports/URLs or automatically discover every unknown vendor. Reviewers must register new providers/markers and inspect new network/SDK/binding dependencies. A new endpoint or behavior inside an already registered file also needs human review. CI detects drift; it is not an automatic migration engine or a security boundary against a contributor changing the checker itself.

To review changes, inspect `detectCoupling(implementationFiles(), services)` from `scripts/lib/service-portability.js`, compare its result with the checked-in JSON and manually approve only justified additions/removals. No automatic baseline-refresh command is provided. Existing source debt is inventoried, not refactored wholesale here.

## Current service exit map

| Service | Export or recreate | Critical migration distinction |
|---|---|---|
| Supabase database | SQL schema/data, roles/grants/RLS/RPCs, extensions, migration history and consistency metadata | Full compatible platform replay is still required; another database engine needs translation |
| Supabase Auth | Users/identities/hash compatibility, issuer mappings, OAuth/SMTP settings, redirects, MFA/session behavior | Preserve learner ownership and separate admin authority; sessions may require sign-in again |
| Supabase Storage | Bucket/policy metadata **and actual object bytes** | SQL backup does not transfer the bytes |
| Cloudflare frontend/Workers | Built static assets, runtime source, routes, headers/rewrites, bindings, schedules and DNS/TLS configuration | Web, heartbeat and sandbox are different applications; replacing static hosting does not replace APIs |
| Cloudflare R2 | Every required object/key, bytes, checksums, MIME/custom metadata and access/retention policy | S3 compatibility is useful but feature behavior must be checked on target |
| GitHub | Git branches/tags/history; issues/PRs/releases/controls and CI metadata separately | Git bundle/mirror excludes secret values and platform metadata |
| Render fallback | Runtime/config and inventory of any actual persistent disk/state | Source still routes unmatched requests here; verify usage before removal |
| Resend | Templates, sender/domain settings, suppression records and delivery semantics | Mailbox hosting and automated application delivery are different capabilities |
| Sentry / optional PostHog | Necessary telemetry/config, or explicit accepted history loss | Learning truth remains in canonical application evidence |
| AI providers | Application-owned schemas, grounded inputs, prompt/model versions, outputs as retained and evaluation sets | A model replacement requires re-evaluation; outputs need not be equivalent |
| Cashfree / planned PhonePe | App entitlements, billing ledger, reconciliation/webhook receipts, external ID mapping | Do not assume existing mandates can transfer or paid grants can be recreated from client data |
| Google OAuth | Issuer/subject mappings, verified callbacks and client configuration | Never merge accounts using only an unverified matching email |
| Google Drive | Originals, folder/index metadata, releases, rights, permissions and native-document exports | Preserve immutable source/release lineage before switching intake |
| Zoho mailboxes | Mail/folders/contacts/aliases and domain settings as required | Owner-reported mailbox use; no transactional suitability or live export verified |

No D1, KV, Durable Object, Queue or vector-store adoption is inferred from Cloudflare use. Register each stateful product before introducing it. No inactive hosting alternative is listed as a current deployment.

## Offline migration packs

Prepare a **consistent completed export** first using the relevant provider's supported tools. The pack utility does not contact providers, export data, import SQL, change DNS or prove completeness.

Use a new private folder beneath ignored `.local/migrations/`. Put operator-prepared exports there; never put real dumps into content/, data/, test fixtures, Actions artifacts, git or public static assets.

```sh
mkdir -p .local/migrations/REPLACE_WITH_NEW_PACK
# Copy completed private export files into this directory.
npm run migration:pack -- seal .local/migrations/REPLACE_WITH_NEW_PACK supabase
npm run migration:pack -- verify .local/migrations/REPLACE_WITH_NEW_PACK
```

Use a service ID from services.json. Sealing records format version, service ID, UTC creation time and each relative filename/byte count/SHA-256 in migration-manifest.json. Hashing streams file bytes; nested binary assets are supported. The tool rejects empty packs, symbolic/hard links, missing/extra/modified files, duplicate/traversing paths, invalid manifests and silent resealing. Private CLI paths must remain beneath .local/migrations with no symlinked parent. Success prints counts only and always `restoreTested: false`; filenames/payloads are not printed. Run from the repository root.

An existing file can be empty; an empty directory is not a valid export. The tool does not enforce service-specific mandatory files or validate SQL, medical content or authorization. The manifest is a checksum record, **not a signature**: maliciously changing both bytes and manifest defeats an integrity-only check. Preserve an independently trusted manifest digest/receipt. Freeze the export during sealing/verification; concurrent writers and hostile filesystem races are outside the offline operator model. Files are not encrypted by this tool: keep restrictive access and encrypt private packs before storage/transfer, with key recovery outside the same account. Sealing does not change permissions on operator-supplied files.

## Migration execution checklist

Use this for every actual replacement; copy the concrete receipt template below into a private operational record. Do not store real counts/identities/keys in this public repository.

1. Inventory live source resources and dependents: database schemas/RPCs/extensions, Auth, Storage, functions, scheduled jobs, DNS, webhooks, secrets, mail, telemetry and client-local state. Record source/target versions, scope, estimated cost and a data-loss/downtime budget. Confirm authorization for the actual move and target resources.
2. Reconcile all migrations and exact deployed function versions. **PR #290** currently contains recovered historical baseline SQL and grant repair, separate from this feature. Check its current state. Its documented full disposable replay stopped at a pgcrypto/platform dependency; do not mark full portability verified from partial checks. Never reapply recovered historical migrations to production.
3. Exclude data erased under the permanent 4 October reset and any later erasure. Enforce the deletion/tombstone policy and current allowed backups. Do not restore an old pinned snapshot just because a historical drill passed.
4. Take a consistent snapshot across database/content/objects, recording commit, catalog version, migration set, export time and event watermark. Capture app-managed secrets only through private provisioning. Export provider configuration and storage bytes separately from SQL.
5. Seal/verify the private pack. Retain a recoverable independent copy outside the source provider/account failure domain. R2 protects against a Supabase-only failure but is not independent of a Cloudflare account failure. Existing recurring backup/restore schedules are unchanged by this task.
6. Restore into a disposable target. Validate row counts **and** exact values/checksums where feasible, FK/link integrity, stable IDs, latest event watermark, complete attempts and server-marked results, privacy scope, rights/review states, erasure exclusions and rebuilding projections.
7. Test real target APIs: two learners cannot access one another, anonymous/browser roles cannot read private data or drafts, reviewer/admin grants do not widen, server scoring/publication gates persist, duplicate requests are idempotent, and interrupted sessions restore exact question/rule versions. Test database grants/RLS/RPCs; do not weaken them to make a restore pass.
8. Test Auth separately: email/password and Google linking, recovery, redirect/CORS/CSP allowlists, token issuer/expiry/revocation, private ID mapping, optional MFA and re-authentication plan. Password hashes may transfer only to a compatible system; another auth provider may need an explicit reset/relink workflow. No passwords are exported in plaintext.
9. Plan cutover with a bounded write freeze or a tested change-capture protocol and watermark reconciliation. One writer stays authoritative. Do not introduce untested dual writes, lose late events or resume using stale client configuration. Browser preferences, bookmarks and drafts that remain local need their own explicit export/sync or accepted-loss decision.
10. Switch traffic/config only after target acceptance. Monitor errors, auth/recovery, saves, mail and event reconciliation. Keep the source recoverable for an agreed window. If the target accepted new writes, rollback requires returning those writes safely or stopping writes first; changing DNS back alone loses data.
11. Revoke old credentials/webhooks and close accounts only after the acceptance window and verified retained recovery copy. Keep lawful financial retention and erasure obligations. Update register, evidence, status and handoff with actual outcomes and remaining gaps.

## Private migration receipt template

```text
Migration ID / capability / owner:
Source and target (including versions):
Approved scope and source-of-truth writer:
Git commit / migration versions / deployed function versions:
Snapshot consistency method / UTC time / event watermark:
Export coverage and excluded/erased data:
Pack location (private) / independent digest receipt / encrypted backup location:
Restore tests and authorization checks (actual results):
Auth/session/local-state implications:
Cost / downtime / data-loss budget and achieved result:
Cutover time / monitoring / rollback reconciliation plan:
Acceptance window / source retirement authorization:
Unverified gaps / exact next action:
```

## Known remaining work

This foundation is implemented as repository governance, inventory, drift checks and offline integrity tooling. It has not migrated any service or made the existing Supabase APIs vendor-neutral. Full current-platform restore, private configuration inventory, independent backup location, cross-provider Auth transfer and target acceptance require a specific migration task. No background backup/export automation was added.

Official references checked for this design:
- [Supabase platform-to-self-hosted restore](https://supabase.com/docs/guides/self-hosting/restore-from-platform): SQL restoration is separate from objects, functions and service configuration; check current version compatibility.
- [Supabase Auth migration](https://supabase.com/docs/guides/troubleshooting/migrating-auth-users-between-projects): identity/hash and token considerations depend on compatible target configuration.
- [Cloudflare R2 S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/) and [rclone](https://developers.cloudflare.com/r2/examples/rclone/): compatible transport does not imply every feature transfers.
