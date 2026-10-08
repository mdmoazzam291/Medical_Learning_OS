# MLOS Archive and Delivery Receipts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. Execution requires owner approval; actual external writes require separate delivery authorization.

**Goal:** Enforce verified Drive preservation before delivery and retain truthful, retry-safe archive/staging receipts.

**Architecture:** Pure receipt validation and a dependency-injected orchestration layer separate conversion from external writes. An active agent can use connected Drive to archive files and the existing admin intake/repository workflow for authorized text drafts. No Drive credentials, background watcher, direct database connection or publication capability is added to the application.

**Tech Stack:** Node >=24, ES modules, node:test, built-in crypto; current Google Drive connector for separately authorized active-task saves; existing content-library-api or content/inbox pathway for separately authorized text staging.

**Spec:** docs/superpowers/specs/2026-10-08-material-release-adapter-design.md. Prerequisites: MLOS_01_Release_Converter_Plan.md; Plan 02 if a release includes routed corrections/media.

## Global Constraints

- Archive the exact generated handoff before staging. A save failure sets persistence_pending and blocks delivery under the archive-first policy.
- A timeout after a possible upload requires receipt/target reconciliation before retry, to avoid duplicates.
- Keep receipts as separate append-only artifacts. Update the latest-release index only after the corresponding archive operation succeeds; do not rewrite earlier releases.
- Staged is not published. Never infer successful ingestion from saving files or updating a repository alone.
- Cross-service staging is not assumed to be a distributed transaction: use idempotent stages, recorded partial state and reconciliation.
- All tests use artificial material, isolated temporary folders and fake external ports. No tests contact a live Drive folder, Supabase database, admin account or learner service.
- No review-attestation/publish/retire endpoints, secrets in artifacts, learner-history mutation, automatic restoration or autonomous watcher.

## Review Focus

- A server digest can differ from the local file-byte digest even when the same JSON object was staged — Task 2.
- An upload timeout may mean the file was already saved; retries must reconcile identity, not duplicate it — Task 1.
- A draft-stage acknowledgement does not assign final canonical question/note version IDs — Task 2.
- Another writer may change the index between read and update; do not overwrite its updates — Task 3.
- Receipts can themselves contain sensitive response fields; persist an allowlist, never authentication headers or full error bodies — Tasks 1 and 2.

## File map and shared receipt types

Create src/domain/material-release/receipts.js, src/adapters/material-release-delivery.js, tests/material-release-receipts.test.js, tests/material-release-delivery.test.js and tests/material-release-index.test.js. Extend converter docs, STATUS and DECISIONS with actual implemented behavior. Do not modify the production publication endpoint or CI staging workflow in this plan.

ArchiveReceipt: {receiptId,releaseId,releaseDigest,handoffDigest,verifiedAt,state,files,receiptReference}; files are {path,sha256,bytes,driveFileId,driveUrl,verifiedBy:'byte_readback'}. receiptReference is null or an actually saved {id,url,sha256}. state is persistence_pending|portable_export_ready. Compute handoffDigest from the completed local handoff manifest's bytes; do not append receipts into its hashed payload set. Successful receipt requires every required file, correct parent and exact readback hash/size; metadata/title alone does not verify file bytes.

DeliveryReceipt: {receiptId,operationId,releaseId,handoffDigest,targetEnvironment,route,attemptedAt,items,state,persistence,receiptReference}; items are {importId,payloadSha256,targetDigest:null|string,status,targetReference:null|string,diagnosticCode:null|string}. status is not_attempted|staged|already_published|delivery_blocked|reconciliation_required. state is staged|partially_staged|delivery_blocked|reconciliation_required. persistence is saved|receipt_persistence_pending and receiptReference is null or an observed saved {id,url,sha256}. Do not invent questionVersionId, noteVersionId or target publication IDs absent from actual evidence. For local tests receipts are tagged fixture:true and cannot be used as production persistence evidence.

External interfaces are explicit ports, not secretly configured integrations:

- ArchivePort: find({parentId,path,sha256})->Promise<RemoteCandidate[]>; upload({parentId,path,localPath,sha256,bytes})->Promise<RemoteCandidate>; readBytes(fileId)->Promise<Uint8Array>; metadata(fileId)->Promise<{id,parentIds,bytes,url}>. Paths are validated before using existing folder mappings. RemoteCandidate is {id,parentIds,url}. The production port is provided by an active authorized task; if absent, archive_port_unavailable blocks archiving. A production implementation must use current connector metadata/raw-file readback; do not manufacture callbacks claiming saves succeeded.
- TextStagePort: readImport(importId)->Promise<ImportDetail|null>; stage(manifest)->Promise<StageAck>. StageAck is the current observed contract {contractId:'content-library-stage-v1',importId,digest,status,publicationAuthority:false}; ImportDetail contains import_id,manifest,digest,status,receipt. Port uses a currently authenticated authorized admin session only; tests use fakes. No service-role key lookup or credential extraction is included.
- IndexPort: read()->Promise<{version,document}>; compareAndAppend(expectedVersion,entry)->Promise<{version}|{conflict:true}>. If the provider cannot provide a true concurrency precondition, index writes must be serialized by one verified writer; re-read/check is not called atomic compare-and-swap.
- ReceiptJournal: append(receipt)->Promise<{id,url,sha256}> persists append-only companion snapshots outside hashed payloads. Inject it for progress/final receipt saves; if absent or failed, receipt persistence remains pending. Its implementation must return observed save evidence, not a planned URL.

The repository code's ports define/test orchestration, not deployment of a new Drive service. Connected-tool usage during an active task is sufficient to archive a handoff. Concrete persistent OAuth/background/API integration is explicitly a later separately scoped task.

## Task 1: Verify every archive file and reconcile uncertain uploads

**Files:** Create receipts.js, material-release-delivery.js and tests/material-release-receipts.test.js.

**Interfaces:** Consume Handoff, readRelease and digestBytes from Plan 01. Produce archiveHandoff(handoff,{releaseDirectory,localDirectory,parentId,port,journal=null,clock,priorReceipt=null})->Promise<ArchiveReceipt>; validateArchiveReceipt(receipt,handoff,{allowFixture=false}={})->void. releaseDirectory points to the original portable package; localDirectory points to generated handoff output. Verify release digest and namespace their file lists as release/ and handoff/ so both can be reconstructed. Reuse a previously verified release archive where available instead of duplicating it. clock supplies canonical UTC time; do not add nondeterministic timestamps to payloads.

- [ ] Write save_all_and_readback asserting upload+metadata+readBytes verification for every required file, exact IDs/URLs/hashes and portable_export_ready only at the end. Include original portable release manifest/schema plus generated handoff reference; release and handoff must both be preserved, not merely a report describing them.
- [ ] Write metadata_only_is_not_verified, wrong_parent_blocks and readback_hash_mismatch asserting persistence_pending. Write expired_link_is_not_asset_backup with required media bytes absent asserting no archive completeness. Store only actual observed URLs/IDs; omit auth headers and raw source text from errors.
- [ ] Write timeout_then_find_existing asserting the next run reconciles one candidate by bytes and does not upload another copy. Write ambiguous_candidates_block asserting reconciliation_required rather than choosing a random same-named file. Write saved_subset_receipt retaining successfully verified IDs after later failure.

```js
// In readback_hash_mismatch, args uses a fake ArchivePort that returns deliberately changed bytes.
const receipt = await archiveHandoff(handoff, args);
assert.equal(receipt.state, 'persistence_pending');
assert.throws(() => validateArchiveReceipt(receipt, handoff), /archive_not_verified/);
```

- [ ] Run node --test tests/material-release-receipts.test.js; expected failures before implementation.
- [ ] Implement port orchestration in serial write order. Persist per-file successes through journal.append after verification, reuse exact prior receipt entries, and reconcile unknown outcomes with find+metadata+bytes. A verified immutable file is never overwritten. archive_port_unavailable, receipt journal failure or any missing file returns pending diagnostics; it is not a completed archive. Reject fixture-tagged receipts in production gating. Save the final companion receipt without its own receiptReference, then return the observed reference alongside it; this avoids a self-referential checksum. Its successful save is a separate event, not a changed content manifest.
- [ ] Run tests; expected pass, including retry without duplicates. Commit listed files: git commit -m "feat: verify durable release archive receipts".

## Task 2: Archive-first text staging and truthful receipts

**Files:** Extend receipts.js and material-release-delivery.js; create tests/material-release-delivery.test.js.

**Interfaces:** Consume validateArchiveReceipt, Handoff and TextStagePort. Produce stageTextHandoff(handoff,{archiveReceipt,targetSnapshot,port,journal=null,authorization,clock,priorReceipt=null})->Promise<DeliveryReceipt>. authorization is supplied by the requested operation and identifies approved target/environment/release scope; no upload can supply it. Without an authorized configured port the operation returns delivery_blocked. Append progress/final receipts through ReceiptJournal; an actual target stage with failed receipt writeback remains staged with receipt_persistence_pending, not falsely unstaged or fully handoff-complete.

authorization is {approvedReleaseId,targetEnvironment,mode:'isolated-test'|'live-active-task',preflightEvidence}. Fixture-tagged evidence is accepted only in isolated-test mode with an explicitly fake port; it is never accepted for a live environment. Production permission remains determined by the real authenticated session, not this local record.

Current API facts: POST content-library-api/imports receives {manifest}; GET imports/<importId> returns manifest,digest,status,receipt. Database stage acknowledgement has contractId content-library-stage-v1 and publicationAuthority:false. The server digest hashes PostgreSQL jsonb text, not the local pretty-printed JSON bytes. Record both digests; compare parsed semantic content through stableJson when reconciling, not raw hash equality between these different representations.

- [ ] Write pending_archive_zero_stage_calls and missing_authorization_zero_stage_calls asserting port.stage is never called. Write fixture_receipt_rejected asserting synthetic save evidence cannot authorize a production call. Write stale_target_requires_preflight asserting compatibility_pending rather than trusting an old snapshot as current; this plan does not establish target freshness merely from an arbitrary age threshold.
- [ ] Write draft_ack_receipt asserting status staged only after exact importId/contract/status/readback agreement, targetDigest recorded separately, and no invented canonical IDs. Write server_digest_differs_from_file_hash asserting different hashes do not falsely fail when parsed manifest agrees. Write mismatched_remote_manifest asserting delivery_blocked even with the same import ID.
- [ ] Write retry_reads_before_post asserting an identical remote draft is reused without another stage call. Write post_timeout_then_reconcile asserting no automatic blind retry. Write remote_already_published asserting already_published with the actual publication receipt/reference, not a claim this run published it. Write partial_batch asserting successful imports retained and aggregate partially_staged; this layer offers no fake cross-service rollback.
- [ ] Write publish_route_unreachable asserting no publish, rightsDecision or attestation callback exists on TextStagePort. Reject StageAck.publicationAuthority!==false and malformed responses. Record only allowlisted fields/diagnostic codes, never full response headers/tokens.

```js
// In pending_archive_zero_stage_calls, args contains a pending archive and fake stage spy.
const receipt = await stageTextHandoff(handoff, args);
assert.equal(receipt.state, 'delivery_blocked');
assert.equal(stageSpy.mock.callCount(), 0);
```

- [ ] Run node --test tests/material-release-delivery.test.js; expected failures before implementation.
- [ ] Implement archive gating and exact semantic pre-read/readback reconciliation. Require current authorized preflight evidence for this environment/release; if the normal importer lacks a non-mutating target-level preflight, readiness remains compatibility_pending until the separately authorized staging attempt validates it, and the report must say so. Staging acceptance establishes an import draft, not final canonical publication compatibility. A repository delivery instead prepares already-archived exact content/inbox/<importId>.json files and records repository_handoff_pending; do not merge to main or infer stage completion from CI success without actual target evidence. Reused published imports require their genuine receipt. Corrections/media remain unavailable routes from Plan 02.
- [ ] Run tests; expected all pass. Commit listed files: git commit -m "feat: gate draft staging on verified archives".

## Task 3: Append-only receipt persistence, index concurrency and acceptance

**Files:** Extend receipts.js and delivery adapter; create tests/material-release-index.test.js; update docs/MATERIAL_RELEASE_ADAPTER.md, docs/STATUS.md and docs/DECISIONS.md.

**Interfaces:** Produce appendReleaseIndex({archiveReceipt,deliveryReceipt},port)->Promise<{updated:boolean,conflict:boolean}>. Entry contains only release/handoff identities, verified receipt references and separate latestPortable/latestCompatible/latestStaged/latestPublished states. Consume exact saved receipt references, never a planned filename as a successful save. Never relabel staged as published.

- [ ] Write archive_failed_does_not_move_pointer, successful_archive_moves_only_portable and staged_does_not_move_published. Assert existing source/question/learner index records remain untouched and distinct pointers are preserved.
- [ ] Write index_version_conflict_preserves_other_writer asserting conflict:true and no destructive retry. Write missing_saved_receipt_reference_blocks asserting no pointer update until receipt persistence is observed. Write repeated_receipt_is_noop asserting same IDs/hashes do not append duplicate entries.

```js
// In index_version_conflict_preserves_other_writer, the fake IndexPort returns a version conflict.
const result = await appendReleaseIndex({archiveReceipt, deliveryReceipt}, conflictingPort);
assert.deepEqual(result, {updated:false, conflict:true});
assert.equal(overwriteSpy.mock.callCount(), 0);
```

- [ ] Run node --test tests/material-release-index.test.js; expected failures before implementation.
- [ ] Implement compare-and-append with the explicit port contract. Where a Drive file update lacks true conditional version checks, keep this port unavailable unless a verified serialized-writer workflow is selected; append receipts safely and leave index_update_pending rather than asserting atomicity. Unknown write outcomes require readback/reconciliation before another mutation. Never overwrite the content release to add receipt data.
- [ ] Run node --test tests/material-release-*.test.js, npm test and npm run check. Expected no failures. Run a fully fake end-to-end case: synthetic release -> deterministic chunks -> fake byte-readback archive -> fake draft-stage receipt -> index update. Assert original bytes and learner/historical fixtures remain unchanged.
- [ ] Document actual supported operations and pending production wiring. Before any real active-task acceptance, obtain owner-supplied new material, authorized target and actual archive/delivery scope. Record exact results and limitations in STATUS and a unique ADR. Commit focused files: git commit -m "docs: record archive-first handoff verification".

## Self-review and real acceptance gate

Spec preservation, receipts, pending saves, retry conflicts, staging/publication separation and index rules are covered by Tasks 1–3. Fake-port tests verify software behavior only. A real Drive save requires completed connector operations and byte checks; a real draft import requires an authorized target acknowledgement; publication still requires genuine admin review. Live correction/media routes and a watcher stay deferred pending separate integration design/contracts.

All steps are unexecuted. This is not a claim that Google Drive monitoring, release conversion, app imports or publication now run automatically.
