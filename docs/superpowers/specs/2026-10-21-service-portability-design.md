# Service portability foundation

Owner request: make the present and future Medical Learning OS replaceable across services while preserving content, learner data and behavior. This is an architectural foundation, executed within the owner's instruction to create or modify the repository. It does not authorize a production migration.

## Design
Use the existing domain/adapters separation, PostgreSQL migrations and backup workflows. Add a versioned, non-secret service register with data ownership, integration locations, export/restore procedures, blockers and evidence. Preserve existing identifiers and exact versions; provider-specific identity mappings belong at adapters. No replacement vendor or universal ORM is introduced.

Add two offline controls: (1) a checked-in baseline of existing provider coupling, enforced by npm run check, requiring review when known providers appear in new implementation locations; (2) a local migration-pack seal/verify tool that streams SHA-256 over an operator-prepared export directory and refuses symlinks, incomplete manifests, changed/missing/extra files and invalid paths. Pack integrity does not establish backup completeness, authenticity or recoverability. Private exports stay under ignored .local/migrations; no dump bytes, accounts or secret values enter git.

Future integrations require an adapter boundary, service register entry, export/restore procedure, contract tests and recorded exit limitations. This includes new databases, storage, identity, email, payment, analytics, AI, search and deployment services. Reuse current contracts; do not move domain truth into telemetry or provider-specific IDs.

## Limits and acceptance
No runtime, database, DNS, Auth, SMTP, provider settings, paid resources or clinical publication changes. Test guard failures on new coupling and stale entries; validate register references and migration packs against tampering and filesystem escapes. Run full Node tests, check and static build. Keep PR290's baseline/grants repair separate: its recovered SQL/full-platform replay status must be reconciled before a real migration. Full production export, cross-provider restore, authentication transfer and an independent second backup location remain outstanding operational work. The guard recognizes registered markers, not arbitrary unknown network services or computed dependencies; review policy covers those.
