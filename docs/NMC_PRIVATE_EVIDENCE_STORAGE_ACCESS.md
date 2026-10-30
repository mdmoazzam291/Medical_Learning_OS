# Private source-evidence persistence and access design
Date:2026-10-30. Status:PROPOSAL; no migration,storage adapter,upload,grant or API deployed.
Evidence inspected:PR346 head6ace6d3a84ea247183e7f74992bf32700b8c46f6; SERVICE_PORTABILITY.md,services.json,CONTENT_LIBRARY_CONTRACT.md and MATERIAL_RELEASE_ADAPTER.md.

## Recommended first release
Metadata-first private packages. Store immutable validated source-row claims/manifests,computed digests and server-bound review/access events as protected governed app metadata. Keep source originals at official external locators until exact retention/display rights are resolved. citation_only does not authorize rehosting full PDFs or showing copied descriptions to reviewers.
No live package import or raw PDF storage is authorized here. A rights-reviewed private evidence capability can be added later using current archive/storage boundaries,not a new storage vendor.

## Alternatives and existing capability
|Approach|Benefit|Limitation/decision|
|---|---|---|
|Protected metadata plus external official sources|Smallest implementation;exact claim/version binding|Official links may change;must preserve observed source hashes and mark reviewer re-fetch mismatch|
|Private authorized original archive plus authenticated evidence streaming|Stable exact bytes and granular current access|Requires explicit retention/display rights,implemented storage and access policy,restore tests|
|Client-visible public or long-lived signed object links|Simple downloads|Cannot promise immediate revocation;unsuitable default for restricted evidence|

Agent recommendation is the first approach; the second remains a conditional extension. This is not owner authorization to upload copyrighted materials or buy/provision services.
Existing material-release ArchivePort find/upload/readBytes/metadata is an injected interface with no completed live implementation. It may support future archival work but is not an existing reviewer endpoint. Drive owns material originals/governance; app review records belong to existing protected application persistence. Provider-owned identifiers remain adapter metadata,not canonical claim IDs. Backup locations must not silently become serving buckets.

## Data ownership and exact versions
- Application owns packageId,packageVersion,caseId,caseVersion,source/appearance/case/package digests and source-edition lineage.
- Sources retain official locator,retrieval provenance,rights state and amendment lineage. Claimed SHA256 is distinct from independently verified source bytes.
- Private package JSON contains metadata only: no protected competency descriptions or PDF/page images. Apply exact schema allowlists and byte/count limits before hashing/import.
- Source-row identities preserve raw token evidence hashes and physical locators. Do not convert uncertain normalized identities into accepted canonical concepts.
- Database/storage receipt links bind source package,verified actor/grant,request identity and server time; no client status flag grants approval.

## Proposed persistence sequence
1. Authenticated owner prepares private draft package via existing runtime authority; source-row grants are not implied by baseline grants.
2. Validate exact claim/package contract and compute canonical digests server-side; supplied digests are comparisons,not authoritative replacements.
3. In a protected transaction,write immutable package revision,case/appearance references and request fingerprint. Duplicate exact request returns same revision;changed payload conflicts. Same version/different digest conflicts.
4. Confirm durable readback/recomputed manifest digest before returning an accepted-staging receipt. Timeout/partial outcome stays uncertain,not accepted.
5. Publication/review status remains draft. A stored package does not approve source,clinical teaching,rights,exam scope or learner release.
6. Access events and decisions append-only; corrections produce a new version. Full raw-row completeness and independent adjudication remain separate requirements.

For any later object archive extension: content-addressed application references,expected byte digest,size and MIME type;conditional create/readback;quarantine partial or mismatched writes. Do not expose a storage URL as a publication outcome. Reconcile an object/database partial failure through a durable staging journal before a package becomes reviewable.

## Access requirements
Every metadata/evidence request checks verified account,current runtime state,exact typed source-row target grant,requested package revision and source-rights access policy. Author/self-review exclusions apply to actual decisions; identity/consent/qualification verification is distinct from account existence.
Owner can inspect their drafts;assigned reviewer sees only explicitly scoped exact-package projection. Unrelated authenticated users and ordinary learners are denied. Revocation blocks subsequent protected reads,writes and streams;decision-time checks revalidate under serialization. Do not copy any source-row package into the public learner catalog.

If source bytes are later served,prefer an authenticated stream that checks current rights/grant before each new request/range;private,no-store responses and no public CDN/static/service-worker caching. An already downloaded or buffered response cannot be clawed back. Long-lived signed bearer links cannot provide immediate revocation;do not claim otherwise. Logs must exclude tokenized URLs,credentials,protected source text and unnecessary reviewer details.

## Retention and erasure
Metadata audit history and source/object retention are distinct policies. Set an explicit rights-reviewed retention basis and lifecycle policy before enabling archival bytes;no indefinite retention default inferred. Revoking access does not automatically erase governed decision history. Withdrawing source retention/display permission immediately disables new byte delivery and starts the applicable deletion/backup-retention process;retain minimal non-content provenance only where permitted.
Document treatment of cached copies,backups,legal holds and correction lineage. No deletion,backup change or legal-policy determination performed here.

## Recovery and portability
Export metadata schemas,all immutable versions,claim/manifest bytes,algorithm profile,typed grant/revoke/decision events and separately authorized source objects plus digest manifest. Reconstruct application identity mappings without provider IDs becoming logical identities.
Disposable restore must recompute digests,prove actor isolation/revocation and reproduce rights-denied outcomes. Old revocations and source withdrawals must not become active on restore. A hash check alone is not a tested restore. Current production backups do not cover proposed tables/adapters until implemented and registered.
No services.json/coupling change made for a proposal;update both with actual data paths when implementation introduces them.

## Acceptance before persistence/API release
- Plain/offline contracts,negative authorization tests and meaningful typed-target isolation tests.
- Size/schema/canonical-digest mismatch,version conflict,exact retry,partial failure,unavailable storage and uncertain-readback coverage.
- Real cross-account scoped access,revocation/range handling,rights withdrawal and no public caching/exposure.
- Immutable decisions,concurrent access/revocation,restore/export parity and prior known rights gates.
- Genuine competent reviewer,explicit consent and source rights;no synthetic identity substitution.

Next bounded implementation: pure access/staging eligibility contract with explicit caller-supplied verified context and fail-closed state,clearly not a substitute for trusted server enforcement. It should deny missing rights/role/exact-version/typed-grant context and never issue URLs or mutate storage. Database/API work follows separately reviewed schema/authorization design.
