# Disposable learner mapping process-crash recovery

Source `4cfe66c08f1778f9103433806c6796dd854d2af3`, [Foundation41428742901](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41428742901). Both native jobs passed. Exact logs show the intended skip-crash failure and cleanup followed by positive recovery/rollback/ACL/cleanup PASS. All five source-head jobs passed: core, Chromium, WebKit and both native versions. Final evidence-only head CI is separate.

`scripts/learner-code-native-crash.js` creates only a fixed private disposable PostgreSQL server with synthetic Auth UUIDs and exact repository mapping migration. It verifies default fsync/full_page_writes/synchronous_commit remain on. A checkpoint occurs before mapping writes. Independent service-role connections then create two committed mappings (one callback deliberately loses the response after actual SQL commit) and hold one inserted mapping in an open transaction. Owner reads see only the two committed mappings; the writing connection sees all three.

The existing helper performs immediate shutdown and starts a new PostgreSQL process on the same private data directory. The fixture requires an interrupted-system message, WAL redo start and a changed process ID. Old client queries must fail; new clients compare exact UUID/code/format/microsecond timestamp rows, owner/table/column ACL, RLS, constraints and policy inventory. Committed codes must be returned by the real allocator without generation or insertion. The uncommitted identity must be absent and get a fresh code with exactly one insert. Actual primary-key and browser/service permission denials are checked after restart. The skip-crash fault must fail with `learner_crash_recovery_not_observed`; CI requires that marker and private-cluster cleanup before the positive run.

## Native evidence

| Server | CI job | Result |
| --- | --- | --- |
| PostgreSQL17.6 | 125221666391 | Skip-crash assertion RED and cleanup; actual WAL recovery, rollback/ACL and cleanup PASS |
| PostgreSQL18.6 | 125221666818 | Skip-crash assertion RED and cleanup; actual WAL recovery, rollback/ACL and cleanup PASS |

## Limits

Immediate PostgreSQL process shutdown is not power loss, storage corruption, disk loss, multi-node failover, managed provider recovery, real Auth/JWT/session acceptance, or full-platform recovery. It retains one local data directory and independently seeded synthetic Auth rows; it creates no real users or learner codes. The deliberate lost acknowledgement is a callback fault after actual commit, not an observed provider network loss. No durability settings, application runtime, hosted schemas/data/functions, dependencies, human review or release decisions change. The existing archive fixture remains a separate table-only restore proof.

Local1,581 tests and checks (13services/261coupling locations) passed; fresh read-only review found no issue. The local UID0-only namespace cannot initialize native PostgreSQL, so native success must be established from exact CI logs, never inferred from syntax or callback tests. Trusted-operator signed-in/revoked/suspended/cleanup and qualified human gates remain open.
