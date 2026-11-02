# Learner mapping logical recovery fixture

2 November2026. Disposable test only. No staging/production database, backup bytes or actual learner identities accessed.

`scripts/learner-code-recovery-check.js` creates its own fresh in-memory SQL instances from the exact repository mapping migration and runtime-access parity definition. It exports two synthetic mapping rows (UUID,code,format_version,created_at) as a bounded JSON text fixture, computes SHA256, and requires a separately supplied expected digest to import. A hash calculated from an untrusted file is not proof of origin; a real operator must independently establish the trusted pin. This script is not a production restore utility or pg_dump/pg_restore acceptance.

Restore takes an exclusive mapping-table lock, requires an empty target, checks source shape/types, audits RLS/owner/precise table and column nonowner grants/no grant options/no browser policies and runtime browser EXECUTE denial, inserts in one transaction and rechecks exact row parity before commit. Missing independently provisioned Auth identities fail FK and roll back; the snapshot never creates Auth users or imports sessions. Duplicate code fails and rolls back the previously inserted row. Existing mappings are never overwritten.

Acceptance covers exact UUID/code/format/timestamp parity, same-user allocation reading original code without generation/insertion, actual browser-role SELECT denial and previous session inactive in restored runtime. Negatives cover wrong expected digest, nonempty target, missing referenced user, duplicate code, broad authenticated/unknown-role SELECT and service grant option and hidden column-only browser grants. Each fresh fixture closes on completion/failure. Script output contains only synthetic test results.

The target Auth identities are independently seeded synthetic fixtures, not recovered user records. Service role remains trusted: direct mapping SELECT still works by design; current runtime denies a restored-old session, while the HTTP route must separately verify an authentic token and current session. No Auth refresh/expiry/MFA/provider lifecycle, hosted endpoint or independently attested identity claim is supplied.

Logical JSON comparison is not native pg_dump owner/default-grant/extension/index/trigger/function parity or managed staging17.11/full-platform recovery. Applied migration ledger/source association, actual Auth ownership/deletions/revocations, private server credentials, retention/no-reuse policy, operational recovery time and restore from genuine backups remain separate gates. Do not restore production, revive sessions, invent test users in managed Auth, or deploy merely because fixtures pass.

Run locally/CI with isolated PGlite tooling using `PGLITE_MODULE_URL=... node scripts/learner-code-recovery-check.js`. No database URL input is supported. Existing operator-only genuine signed-in acceptance remains blocked on trusted credential/journal prerequisites and is not replaced by this independent test.

Final review found a column-ACL audit omission; a SELECT(learner_code) grant reproduced a missing rejection, then an explicit pg_attribute.attacl audit fixed it. No-policy RLS had still prevented row disclosure; the correction enforces the stated exact-privilege restoration boundary.
