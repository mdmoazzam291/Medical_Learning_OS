# Protected medical relationship registry (#299)

The owner selected the recorded next engineering task with “Next”. Extend the accepted learner projection and existing canonical publication stack. No real clinical data, reviewer grants or review decisions are created by this work.

## Approach and constraints

Use existing PostgreSQL, content-library-api and Import & review. A separate graph database would duplicate canonical identities and rights authority; browser-authored verification flags would bypass review. Builder decision: one exact source/evidence version per assertion, matching the existing projection. Additional independently sourced assertions are separate relationship versions/identities. Direction is always fromConceptId → toConceptId. The eight types remain the projection's allowlist.

## Storage and lifecycle

Two protected tables: immutable `medical_relationship_versions` and append-only `medical_relationship_events`. Application-owned relationship IDs and version IDs, integer versions (1..1000000), exact evidenceVersionId, sourceId/sourceVersion, evidence locator (not copied source text), literal claimText (1..1500), captured source fingerprint and hashes of both canonical endpoint objects. A SHA-256 digest covers the entire exact assertion and captured bindings. Per existing ADR-097, this intake only curates externally authored assertions: require immutable provenance `{kind:"external",authorLabel,evidence}` and attest that the curator did not author the assertion. Native self-authored clinical assertions remain outside this intake. Staging records actor and creates a new immutable version; version N+1 requires the exact latest version ID and digest to prevent concurrent overwrites. Exact retries are idempotent. A staged correction immediately suppresses its predecessor, consistent with the existing learner projector.

Publication uses the existing catalog advisory lock and row lock, is atomic, requires current content Admin and all three scoped reviewer grants, a nonempty human review note and explicit exact-target attestation. It rejects stale digest, nonlatest version, endpoint drift, source drift, unresolved/restricted rights or an inactive rights reviewer. Reuse existing rights events; relationship publication cannot grant source reuse permission. Each publication event binds the exact assertion digest, rights event and reviewing human. No mutable browser booleans. Publication and retirement receipts are immutable; retirement by current Admin requires a reason and exact digest. A published/retired version cannot be republished; corrections require a new version and new review. Review history is visible only to Admin. Never infer clinical relations from question/note links.

## Trusted read feed

Extend `content_library_snapshot_v1(uuid)` preserving all existing keys. Only the latest version of each identity is returned as a safe state envelope; draft/retired/invalid state suppresses previous publication. Published fields become eligible only while current source/version/fingerprint, endpoint hashes, matching rights event/status and actual current reviewer grants remain valid. Derive the three booleans in SQL from immutable receipts. Enrich privileged catalog sources with server-derived fingerprintSha256 for the existing projector; public projection already strips it. Learner responses omit actors, review notes and rights evidence. RPC failure has no cached fallback.

## Admin interface

Extend existing Import & review rather than creating a second console. Stage a structured assertion, inspect exact saved payload, canonical endpoints, exact source and rights status, target digest and history before publishing. All three capabilities must be shown; permission-denied paths remain read-only. Publish only after a human attestation; stage never publishes. Expose retirement with reason and exact current digest. Preserve dirty edits, guard duplicate requests and stale asynchronous selection. Escape all labels/claims. Empty registry is truthful. Admin-only routes derive actor from Auth; reject extra fields and oversized bodies.

## Authority and privacy

RLS on both tables, no browser table privileges or policies, service SELECT only, mutations exclusively service-only SECURITY DEFINER RPCs with empty search_path and explicit actor checks. Functions revoke default PUBLIC execute. Immutable triggers reject UPDATE/DELETE including service role. Author/reviewer identity is governance audit data like existing content review receipts, not learner behavior; no learner_id or copied learner content. Export/restore includes both tables; existing reviewer audit retention and Auth FK restrictions are preserved. Do not broaden learner privacy erasure or restore erased data.

## Verification and release

Meaningful Node route tests plus disposable PostgreSQL tests executing the exact new migration and genuine existing grant/fingerprint helpers against minimal data-free platform shapes. Test actor spoofing, all grants, expiry/revocation, current rights, exact-target binding, staging collisions, changed endpoints/source, retired/latest suppression, immutable evidence, no direct service writes, two-learner/anon denials, idempotency and transactional rollback. Browser journey exercises stage → inspect → human approval → graph → corrected draft → retirement with nonclinical synthetic fixtures, phone/tablet/desktop, Chromium and WebKit. Existing large-neighborhood/empty/safety graph checks remain required.

All software checks and independent code review precede any release. No production DDL, edge deploy, clinical ingestion/publication or reviewer enrollment is part of the development checkpoint. Release requires a concrete reviewed migration/rollout receipt; clinical acceptance stays separate (#301).
