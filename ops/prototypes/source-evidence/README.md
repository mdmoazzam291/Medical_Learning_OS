# Disposable source-evidence SQL prototype

**NOT A MIGRATION. Never apply schema.sql to a hosted database or expose evidence_probe.** The standalone script creates a new in-memory PGlite instance, uses synthetic owners/policies/claims and closes it in finally. It has no URL, credentials or hosted-database option. No app dependency is added.

Run with an externally installed pinned PGlite package (tested 0.5.13):

```sh
PGLITE_MODULE_URL=file:///absolute/scratch/tooling/node_modules/@electric-sql/pglite/dist/index.js node scripts/source-evidence-db-check.js
```

The prototype stages canonical package/manifest bytes, per-case JSON projections, actor-scoped request receipts and events in one SQL function transaction. SQL verifies manifest and receipt-payload byte hashes and binding consistency. Existing JavaScript strict/JCS preparation is mandatory before this trusted server-only call; SQL byte hashing does not validate JCS or independently recompute case/appearance/request fingerprints. The script independently rehashes stored claims and resolves a selected mixed-source case after a separate readback. SQL returns **committed**, never accepted; this is not the final staging adapter.

Checks exercise exact receipt retry; changed request/same revision conflict; exact older revision read after a new version; wrong version/digest/actor denial, including a second enabled owner attempting existing revisions, retries and new versions; rollback after revision, cases, request and event insertion; immutable-record write privileges; anon/authenticated direct table/function denial; missing owner authority; manifest/receipt byte tampering and recomputed approval-flag rejection; selected second-source rights denial on full-package operations; authority denial on retry/readback. The first positive check was observed failing against a function returning an empty result before implementation.

The private schema revokes browser usage and function EXECUTE, enables RLS, and grants backend SELECT/INSERT only for immutable evidence records. Authority/source-policy fixtures are seeded/changed by the disposable administrator, never by the backend role. SECURITY INVOKER functions have empty search_path. Actor arguments are synthetic delegated server identities; this does not authenticate sessions or prove real account membership. Backend credentials remain trusted; unrelated browser users cannot call these RPCs.

This is a reduced prototype of SOURCE_EVIDENCE_DATABASE_DESIGN.md, not its complete implementation. Packages/owner lineage are represented by revision records; no independent package row, real runtime/source-policy event history, reviewer grants, withdrawal/erasure lifecycle, retention or export/restore exists. Authority/policy fixtures mutate directly for sequential tests; they do not implement the design's required serialized authority writers. Missing policy/authority denies. Fault injection is intentionally callable only in this disposable fixture, and must never enter a production API.

SQL does not yet independently enforce all domain schema/key/UUID/timestamp/approval receipt constraints, JCS byte canonicality, profile details or case/manifest derivation. Those remain enforced by JavaScript in this probe and must receive database/adapter parity checks before release. No check here certifies malicious/compromised backend callers. Full real Auth/RLS integration, multi-connection races/crash durability, lost network acknowledgement, postcommit uncertainty mapping, protected readback corruption, actual reusable driver conformance, immutable policy/grant history, source rights and full export/restore remain pending. PGlite uses real PostgreSQL semantics in one embedded instance, not the hosted platform or a cross-provider acceptance result.

Next: tighten the prototype's SQL/domain envelope parity and immutable package/authority lifecycle, then implement a disposable driver for the existing transaction conformance harness. Keep hosted migrations, API wiring, reviewer grants, source bytes and learner publication disabled until required authorization/concurrency/recovery checks pass.
