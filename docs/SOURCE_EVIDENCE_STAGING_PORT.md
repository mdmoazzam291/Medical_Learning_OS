# Metadata evidence staging and exact-package resolution

Date: 31 October 2026 IST. Status: proposed implementation contract, not a live port, migration or authorization boundary. Builds on SOURCE_ROW_EVIDENCE_DIGESTS.md, SOURCE_EVIDENCE_ACCESS_CONTRACT.md and NMC_PRIVATE_EVIDENCE_STORAGE_ACCESS.md at 9eb5354b400fc8908608d9b958f5d941c6ad44ff.

## Scope and choice

Use one application-owned transaction port for private metadata staging and exact revision resolution. Existing canonical digest functions remain provider independent; the adapter owns serialization, durable storage and current authority. This is the recommended next engineering slice. It stores citation metadata and hashes only, never PDF bytes, images or protected descriptions.

A sequence of independent writes is simpler but cannot promise atomic cases, request identity and receipt. A raw object archive adds rights and partial-object recovery requirements without solving metadata authority. Neither is the first implementation. Existing app persistence owns review metadata; Drive retains originals/governance. No service or persistence path is introduced by this document.

## Candidate and trusted inputs

An untrusted candidate contains requestId, packageId, packageVersion, expectedPackageDigest and cases in the existing digest contract. Require exact ordinary data shapes, UUIDs, versions and SHA-256 formats; reject extras, accessors, hidden/symbol fields and malformed Unicode. Limit transport to 16 MiB UTF-8 before parsing and cases to the existing 10,000 maximum. Compute the package manifest server-side and compare expectedPackageDigest. Limits are proposed defaults, not implemented defenses.

An authenticated server supplies actor identity and resolves owner, author, runtime and rights state. Never accept these from candidate JSON. Capture immutable candidate data before asynchronous work. Request fingerprint is SHA-256 of canonical {contractId:'source-evidence-stage-request-v1', actorId, requestId, packageId, packageVersion, expectedPackageDigest, claimsDigest}; claimsDigest binds the validated canonical claim list sorted by caseId. This fingerprint is distinct from packageDigest and binds request identity to exact submitted metadata.

The port's proposed operations are stageMetadata(candidate, authenticatedPrincipal) and resolveExactPackage(binding, authenticatedPrincipal, action). These are server-only capabilities, not browser APIs. A principal is verified by the host; neither method treats a UUID as proof of authentication.

## Transaction and idempotency

1. Validate/capture candidate, recompute digests and reject mismatch before writes. Acquire transaction serialization for owner/package revision and actor/requestId, with a defined consistent lock order. Re-read current account, runtime, owner and metadata rights inside that boundary.
2. Request uniqueness is (actorId, requestId). Same fingerprint returns the original stored receipt only after current access checks. A different fingerprint conflicts, including a different package or version. Do not leak another actor's request existence.
3. Revision uniqueness is (packageId, packageVersion). Changed digest or claim bytes conflict. An identical existing revision under a new request may receive a new request receipt, without rewriting claims, author or original staging time; current owner and rights are still required. A withdrawn revision cannot be restaged. Corrections need a new version; no implicit latest-version replacement.
4. Atomically persist canonical claims, manifest, immutable author/owner binding, request fingerprint, receipt and a metadata-staged event. All cases must belong to this exact revision. A failure before commit leaves no visible partial package or accepted receipt.
5. Durably read back the committed claims/manifest and recompute every appearance/case/package digest. Check fingerprint and receipt binding too. Return accepted only after verified readback. Missing or mismatched readback is integrity-failure; unavailable/timeout with unknown commit outcome is uncertain. Neither means accepted or definitely absent.
6. Recover uncertain outcomes using the same requestId and fingerprint. Do not invent a new request or silently overwrite. Resolve the journal/revision, recheck current access and verify durable readback. A receipt is historical staging evidence, never continuing access authority.

Storage durability/transaction semantics must be demonstrated by the adapter, not inferred from a successful JavaScript promise. Concurrent identical requests converge to one request receipt; concurrent conflicting requests cannot both commit. Rights withdrawal and runtime/account changes serialize with staging or cause the transaction to abort.

## State and receipt

The existing evaluator's draft state describes an unstaged candidate. Successful staging transitions that exact candidate to staged, which means immutable metadata available for scoped review, not approved content. The earlier persistence proposal's phrase 'remains draft' means editorial/publication status remains unapproved; it does not require access status draft after successful staging. Keep those two dimensions separate.

A proposed staging receipt binds contractId 'source-evidence-staging-receipt-v1', receiptId, requestId, actorId, packageId, packageVersion, packageDigest, requestFingerprint, recordedAt and receiptDigest. Server creates IDs/time. Receipt digest uses canonical domain separation and excludes its own digest field. Flags are sourceReviewOnly:true and clinicalApproved:false, rightsApproved:false, examScopeApproved:false, learnerRelease:false. Digest equality alone never authenticates receipt origin. Do not reuse source-row decision receipts or claim an independent review occurred.

Withdrawal is an append-only access state event; immutable evidence is not rewritten. Restoring access, retention or deleting audit metadata needs a separately governed policy. No silent withdrawn-to-staged transition follows from a retry or restore.

## Exact-package and source resolution

Resolve (packageId, packageVersion, packageDigest) together; no fallback to latest, caseId alone, a different digest or a caller-supplied source hash. Load canonical claims and manifest from that revision, recompute bindings, then locate the requested case by caseId plus caseVersion/caseDigest/appearanceEvidenceDigest. Reject any mismatch or missing case.

Packages may contain several sources. Resolve the source expectedSha256 and edition from the selected case, not a package-global first source. A later source-byte verifier must bind actual byte hash to that same source and case. Cached verification flags or a matching hash belonging to another package cannot satisfy resolution. Metadata-only resolution never asserts bytesVerified:true.

After integrity resolution, derive fresh rights and typed source-row-package grant for that exact revision and invoke the evaluator within the protected authorization boundary. A historical package remains addressable only with its own current permission; a newer revision does not transfer grants. Withdrawal denies ordinary package reads; any minimal audit projection requires a separate explicit policy, not a bypass in this port. Return only the allowed projection and no storage URL. Revalidate at decision time separately.

## Required adapter acceptance evidence

| Scenario | Required outcome |
|---|---|
| Exact retry, including lost response | Same request receipt after current access and readback checks |
| Same request changed candidate; same revision changed digest | Conflict, no overwrite |
| Two concurrent identical/conflicting writers | One request identity; conflicting payload cannot win twice |
| Failure between package/cases/request/receipt writes | Atomic rollback or uncertain commit reconciled by exact request |
| Tampered/missing durable claim, manifest or receipt | No accepted result or protected projection |
| Wrong case/source, mixed-source package, stale/latest substitution | Exact resolution denies mismatch |
| Revocation, withdrawal, owner/account/runtime or rights change | Fresh serialized denial, including retries |
| Export/restore | Claims, request identities, receipts, immutable authors and withdrawal events preserved; digests recomputed and denied states retained |

Next: implement a strict provider-independent staging request/fingerprint and receipt contract with synthetic tests, then a fault-injectable transaction-port conformance harness. A real persistence adapter needs separately reviewed schema/RLS/serialization, cross-account tests and restore acceptance before API wiring. No live storage, rights decision, reviewer grant, medical approval or learner activation is supplied here.
