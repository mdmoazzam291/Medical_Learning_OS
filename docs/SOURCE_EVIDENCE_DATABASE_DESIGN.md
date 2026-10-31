# Private source-evidence database and authorization design

Date: 31 October 2026 IST. Status: PROPOSAL, implementation specification only. No SQL migration, project configuration, database query/write or hosted resource change performed.

## Intent and existing boundaries

Persist the metadata-only source evidence contracts without widening learner access or confusing staging with review approval. Application-owned IDs, exact versions, canonical digest profiles and receipts stay independent of storage providers. Existing app persistence owns review metadata; Drive owns material originals/governance. Raw PDFs, copied descriptions and images remain outside this slice.

Inspected branch 767f9bfe08e1411a2c384aed77ccdf259ec7782c: source-row-evidence, source-evidence-staging, source-evidence-access and source-evidence-resolution; transaction conformance fixtures; admin concept-acceptance/baseline migrations and owner-api handlers. Existing concept RPCs use SECURITY INVOKER with explicit server-role privileges, actor checks and advisory transaction locks. Their JSONB-text fingerprints are not the canonical source-evidence digest format. Independent baseline review is a different typed target; do not extend its dispositions or reuse its grants implicitly.

Recommended: server-only transactional metadata RPC plus protected tables, following the current app capability. Direct browser table/RPC exposure adds another authorization boundary with no current requirement. An object archive adds rights and storage recovery work while leaving transaction authority unsolved. Neither alternative is the first implementation. This is an agent-proposed design, not a new owner decision or deployment authorization.

## Proposed records and constraints

Names below are logical application records; implementation should select a non-exposed private schema and verify its actual Data API exposure. Do not assume a schema's name alone makes it private.

| Record | Identity and required binding | Write behavior |
|---|---|---|
| evidence_packages | package UUID; immutable original owner/author identities and lexical package ID | Create once; ownership transfer unsupported in first slice |
| evidence_revisions | (package UUID, version); exact digest/profile, canonical claims and manifest bytes, staged timestamp/actor | Insert only, unique version; same version/different bytes conflicts |
| evidence_cases | (package UUID, version, caseId); case version/digests, source hash/edition, canonical claim | Insert with revision in same transaction; composite FK to exact revision |
| evidence_stage_requests | (actor UUID, requestId UUID); fingerprint, exact revision/digest, canonical receipt bytes/digest | Insert only; exact retry returns original receipt after current checks |
| evidence_access_events | event UUID and ordered per-package sequence; exact target, actor, state/reason, server timestamp | Append-only; metadata-staged and withdrawn states, no implicit reactivation |
| evidence_source_policies | source hash plus edition and policy version; metadata/retention/display permissions and governed basis | Append-only policy versions, deny by default; current projection derived from latest ordered policy version |
| evidence_package_grants | grant/event identity; reviewer, typed source-row-package target ID/version/digest, consent/qualification/independence evidence and revocation lineage | No grants created in initial owner-only staging slice; explicit governed grant/revoke operations later |

Grant changes are append-only events; current grant state is a derived projection, not a destructive delete. Source policy versions are unique per source hash/edition with monotonically ordered versions; a deny cannot be bypassed by reading an older policy.

All identifiers/versions/hashes/claim shapes must satisfy existing domain constraints. Composite foreign keys bind case/request/grant to the full revision identity, including digest through a unique revision reference. No cascade from Auth user deletion into evidence history: use stable actor references and a governed erasure/tombstone process. Index exact request lookup, package revision, case selection and current grant lookup; no unbounded reviewer list endpoint.

Canonical package UUID spellings are preserved in canonical documents. PostgreSQL UUID keys normalize case; reject a later alias spelling for an existing logical package instead of silently rewriting digest-bound strings. Actor IDs originate from the verified server identity mapping. SQL UUID equality alone does not establish exact lexical binding for a previously hashed document.

## Canonical bytes and integrity

Persist authoritative UTF-8 canonical claims, manifest and receipt documents as text/bytea, with their algorithm profile and digests. JSONB projections are derived lookup aids. Never compute these digests from JSONB::text or substitute a database serialization algorithm. SQL should verify SHA-256 of supplied canonical manifest/receipt bytes and parse/projection equality; the server must additionally run existing strict capture/JCS computation and independently recompute every case/appearance/request digest. SQL hashing bytes alone does not prove they are canonical or correctly related.

For claims, preserve the sorted claim array used by request fingerprinting as well as per-case canonical documents. Preserve the exact request envelope inputs: actor, requestId, package ID/version, expected package digest and claimsDigest. The receipt excludes its own digest when hashing and retains the existing contractId/false approval flags. Database checks reject missing/extra receipt keys and flags that imply publication. Server-generated timestamps use UTC millisecond representation matching the offline contract.

Transport caps raw input at 16 MiB before parsing, then applies canonical-size and case-count limits. No client-supplied digest, actor, permission flag or computed context becomes authority. Stored projections must reconcile to canonical records during readback and restore; no silent repair of corrupted claims.

## Privileges and trusted actor boundary

Enable RLS as defense in depth on every new table. Explicitly revoke table/sequence/function privileges from PUBLIC, anon and authenticated and remove inherited/default exposure. Do not add permissive authenticated policies, public views, Realtime publication or storage buckets. Grant only the internal role's required SELECT/INSERT and narrowly scoped state-projection changes; immutable-record triggers reject update/delete. Catalog/publication tables receive no new privileges.

Prefer SECURITY INVOKER RPCs with empty search_path and fully qualified references, consistent with inspected code. Revoke default function EXECUTE in the migration transaction and grant only the intended backend role. Do not add SECURITY DEFINER to bypass a failing permission test. If an implementation requires elevated helpers, that changes this design and needs explicit privilege analysis.

The server validates the session through existing authentication, derives actor identity, checks current account/runtime/content-owner authority and supplies p_actor internally. Ordinary clients never choose p_actor or call these internal RPCs directly. The database also verifies current owner/actor authority rather than trusting an isOwner boolean. Service credentials remain backend-only. A service-role RPC argument is trusted delegation, not database proof of the original browser session; test both layers. User-editable metadata or stale token claims cannot be the sole review/rights authority.

Initial adapter supports owner staging/inspection only, with reviewer reads denied until exact typed grant, real consent/qualification/independence and author exclusion are implemented. Broad content-admin status alone must not mean every admin owns every package. Runtime/owner scope must be resolved from current governed app authority; missing mapping denies. None of this grants clinical, rights, exam or learner release approval.

## Transaction, denial and concurrency

For the first low-volume private capability, use one documented source-evidence transaction lock for all state-changing and protected read operations. Acquire it before authoritative context reads, then lock exact package/revision and request records. Unique constraints remain mandatory for initially absent rows. This trades throughput for a simpler linear order; do not claim large-scale throughput from this design.

All rights, grant, withdrawal and owner/runtime/account mutation paths affecting this capability must participate in the same lock or an equivalent proven serialization mechanism. Existing unrelated authority writers do not automatically do so. Until they are integrated and tested, immediate serialized revocation is an unimplemented requirement, not a property supplied by the offline evaluator or a second SELECT.

Inside the transaction, re-read authority and metadata permission for every source referenced by the staged package, reject withdrawn revisions, validate request/revision conflicts and atomically insert package/revision/cases/request/receipt/staging event. Conflicts never overwrite. A new request for identical revision metadata may add its own request receipt/event without changing original author or staging time. Request uniqueness remains actor-scoped; conflicting actors cannot infer another actor's request existence.

After commit, perform a separate authoritative readback through the same protected boundary, recomputing canonical bindings. Return accepted only if readback and current access succeed. Lost acknowledgement or unavailable readback is uncertain; corruption is integrity-failure; new authority denial is denied. No failure exposes a receipt as current staging acceptance. Retry the same request identity; never silently allocate a replacement request. A committed historical receipt is not an access capability.

Protected inspection resolves the full package ID/version/digest plus selected case version/digests using the existing resolver. It loads canonical metadata from that revision and selects source hash/edition from that case. No latest fallback or package-global source shortcut. Current source metadata permission applies before returning content: full-package inspection requires permission for every referenced source; a separately scoped case projection checks its selected source and cannot expose other claims. No source bytes or verification flag is asserted. Public responses use private/no-store and sanitized errors; deny/not-found behavior must not enumerate inaccessible packages.

## Recovery, portability and acceptance

Export all canonical bytes/profiles, immutable revision/case/request records, receipts, actor mappings, source policy history, grants/revocations and access events at one consistency watermark. Restore to disposable storage, recompute all bindings and reproduce withdrawn/denied outcomes. Never restore an erased pre-reset catalog or use this data to publish learner content. No old backup is assumed to cover proposed records.

Implementation must update service ownership/export/gaps and reviewed coupling evidence with actual schema/adapter paths, without introducing a vendor. SQL/RLS/RPC portability requires compatible Postgres or explicit translation; domain digest parity alone is not a migration result.

Before API release require actual role/ACL tests (anon, authenticated, unrelated account, owner, reviewer, backend), protected function denial, two-connection retry/conflict and revocation races, faults between every write and commit/readback, exact mixed-source reads, policy withdrawal, immutable author/history, and complete disposable export/restore parity. Run the reusable conformance driver against actual committed records; memory-fixture success is not storage acceptance.

Next bounded task: a disposable-only schema/RPC prototype and database checks for owner staging and exact readback. Keep hosted deployment, reviewer grants, source archival bytes and learner publication disabled. If canonical SQL/server parity or authority-writer serialization cannot yet be demonstrated, record the gap and keep API wiring blocked.

## Documentation consulted

- Supabase database functions: https://supabase.com/docs/guides/database/functions — invoker/definer, search_path and function privileges.
- Supabase API security: https://supabase.com/docs/guides/api/securing-your-api — grants, RLS and default exposure.
- Supabase changelog: https://supabase.com/changelog — checked 31 October 2026 IST; no new feature is required by this proposal. Markdown index retrieval failed content-type handling; HTML page used instead. No live project version or configuration verified.
