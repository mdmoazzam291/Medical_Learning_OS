# Protected medical relationship registry

Development extension of issue299, based on the accepted [learner projection](MEDICAL_RELATIONSHIP_PROJECTION.md). This implementation does not seed, clinically approve or publish any assertion. Until the migration/API/static release is explicitly performed, production continues on the previous empty-feed release.

## Authority and ownership

`medical_relationship_versions` stores exact assertions and captured canonical source/endpoint bindings. `medical_relationship_events` stores immutable publication and retirement receipts. Neither has browser grants or policies; service role can SELECT but cannot INSERT/UPDATE/DELETE. Service-only SECURITY DEFINER RPCs check actual singleton Admin and scoped reviewer grants, use an empty search path and share the existing `content-library-publication` advisory/catalog row locks. No Auth user metadata or caller verification flag grants authority.

Assertions have application-owned relationshipId, deterministic `relationshipId@version`, version1..1000000, from/to canonical concept IDs, a bounded relation type, literal claimText, exact sourceId/sourceVersion/evidenceVersionId and evidenceLocator. Evidence identifiers name the reviewed assertion's source location; they are not a claim that a separate evidence repository verified the source. The human must inspect the original evidence. Versioned source fingerprints and endpoint hashes bind the exact review target. A digest includes the assertion, provenance, predecessor and those bindings.

This intake follows ADR-097's external-curator workflow: provenance requires `kind: external`, a nonempty authorLabel and evidence. The Admin's attestation explicitly says they curated externally authored material. It does not permit native author self-review. Provenance declarations remain untrusted until genuine human review; an agent must never make the attestation or invent an external author.

## Lifecycle and API

All routes use the existing `content-library-api`, authenticated runtime access and Admin checks. Query strings and extra top-level fields are rejected. The actor always comes from Auth.

| Route | Body / result |
| --- | --- |
| GET `/relationships` | Latest100 saved version summaries and current reviewKinds |
| POST `/relationships` | `{assertion}`; stage receipt with exact version ID/digest |
| GET `/relationships/:versionId` | Exact assertion, bindings, source/endpoints, current gates and immutable history |
| POST `/relationships/:versionId/publish` | `{digest,reviewNotes,attested:true}` |
| POST `/relationships/:versionId/retire` | `{digest,reason}` |

A first assertion requires null previousVersionId/previousDigest. VersionN+1 requires N's exact ID/digest. Identical staging retries reuse the original stage receipt, even if its current lifecycle state has since changed; inspect the version for current state. A changed payload under the same ID/version conflicts. Preparing a correction in Import & review preserves predecessor metadata. Staging a correction immediately suppresses the older version in the learner graph. Retiring a newer draft never revives an earlier publication.

Publication requires all three current Medical, References and Rights grants, exact-target attestation, current source/version/fingerprint and endpoint hashes, and an existing eligible matching source-rights event whose rights reviewer remains authorized. It reuses the existing source-rights authority; this UI cannot grant or alter source permissions. Citation-only status permits factual grounding without copied expression. Publication is atomic and records reviewer/digest/rights event/attestation version; retries reuse the receipt. Retired versions cannot be republished. Retirement requires current Admin, exact digest and a reason; a new reviewed version is the correction path.

## Learner feed and privacy

The existing snapshot RPC preserves existing keys and adds the latest state of each relationship plus current privileged source fingerprints. It derives booleans from immutable receipts and current grants/rights. The domain projection only emits currently eligible published assertions and exact source/evidence versions. Draft/retired/invalid states never promote question co-occurrence into medical causality. Revocation, expiry, Admin rotation or semantic source/endpoint change hides dependent edges on a fresh read. A failed RPC has no cached clinical fallback. Source restoration to the exact same content/authority can make an unretired exact publication eligible again; permanent withdrawal requires retirement.

Only the existing public allowlist reaches learners: relationship identity/version, endpoints/direction/type, claim, exact source/evidence version and review timestamp. Actor IDs, review notes, provenance evidence, rights evidence, source fingerprints and raw drafts remain protected. Reviewer/curator identity is governance audit data, not learner behavior. New tables have no learner_id or copied learner event. Audit identity retention and restrictive Auth FKs match existing content-review ledgers; no new learner erasure exception is added.

## Verification and release boundary

`PGLITE_MODULE_URL=... node scripts/medical-relationship-db-check.js` executes the exact new migration and genuine current grant/fingerprint helpers against a minimal data-free Auth/catalog shape, with PostgreSQL role/RLS/immutability checks. This is not a replay of the entire hosted platform. Existing privacy and chronological ACL checks remain separate. Node API tests cover authentication/identity injection, strict envelopes, exact RPC arguments, authority/conflicts and sanitized errors. Browser fixtures exercise human review, errors, graph display, correction, retirement, rights/grant denial, escaping and responsive layouts; no genuine reviewer or clinical source is simulated as production acceptance.

Review and authorize the committed migration first. Apply it transactionally, inspect new table RLS/ACL/function execute permissions and security advisors, verify current catalog counts are unchanged and the registry is empty. Then release the content-library-api with its existing exact8-file bundle (only its handler changed), and the110-file static bundle. Preserve Auth/runtime access checks and verify anonymous denial, learner projection and Admin empty/unauthorized paths. Real claim publication remains a separate genuine human act; populated acceptance remains issue301.

Fail-closed rollback preserves audit history: revoke service execution of `medical_relationship_publish_v1(text,uuid,text,text,boolean)` and replace `medical_relationship_feed_v1()` with a service-only empty-array implementation, then restore the previous API/static bundle if needed. Do not drop tables, delete receipts, restore erased catalog data or turn an old publication current by removing a correction. Re-enable only after a reviewed forward repair. Standard database export/restore must include both new tables, constraints, RPCs, grants and source/reviewer dependencies; a full hosted restore of this new schema is not claimed by disposable fixture tests.
