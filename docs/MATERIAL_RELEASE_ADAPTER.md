# Material release adapter

## Integration status — 8 October 2026

PR #204 merged as `827b1a02325e31315716da53424f7996c542affa` on 8 October. Main Foundation run 37758541923 passed check/browser jobs; both Cloudflare production builds passed (web 6e080af5-f659-4536-a449-dad972bb3c70; heartbeat f959cf38-217e-4ca2-acee-3f0680c7bd40). The converter, exact-version correction/media proposals and archive-first orchestration are integrated repository code. External ArchivePort/TextStagePort/ReceiptJournal/IndexPort implementations, real archive/staging readback and clinical review/publication remain separate pending operations; no Drive watcher or real material ingestion is implied. [Release](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/204); [CI](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/37758541923).

Current content input: final polished PYQs; fixed respiratory intake cancelled. The catalog is empty after the permanent reset. Conversion validation is separate from genuine clinical/rights review and target ingestion.

The local converter reads a complete portable `mlos-material-release@1` package. Use `docs/material-release-schema-v1.json` plus the current content-library validator for the exact format; legacy/ad hoc JSONL requires an explicit migration. Each row keeps its original archive evidence and a separate exact app payload. Original questions are not shortened or clinically rewritten by conversion.

```sh
node scripts/convert-material-release.js --release /absolute/release --dry-run
node scripts/convert-material-release.js --release /absolute/release --out /absolute/new-handoff
```

An optional `--target /absolute/authorized-snapshot.json` supplies a full canonical catalog/metadata snapshot for identity comparisons. It is not a target-level dry run, and the converter never declares live app compatibility merely from that file. Include canonical note records in `target.notes` to compare notes; missing note coverage blocks new note mapping in a supplied target snapshot.

No API credentials, AI provider, package installation or network is needed. There is no stage/publish flag. Output does not automatically enter `content/inbox`. Dry-run writes nothing; output mode exclusively creates a new directory, seals it with `COMPLETE.json` last, and reuses only a fully verified byte-identical directory. Incomplete/different output is retained and rejected, never overwritten or recursively deleted.

Required payloads are Markdown, applicable JSONL datasets, pinned `schema.json`, `changes.jsonl`, `validation.md`, `INGESTION.md`, required authorized assets and a manifest with actual file hashes/counts. Duplicate decoded JSON keys, unsafe paths/symlinks, undeclared files, invalid UTF-8, mismatched hashes, relationships or Markdown are rejected. Nonasset metadata is bounded to 16 MiB per file and 64 MiB total; manifest is bounded to 1 MiB. Asset hashes are streamed. Partial delta reconstruction is not supported in v1.

Batching uses exact UTF-8 serialization within 1 MiB and the current limits: 200 concepts/sources, 100 questions/notes, 500 links. New note-question components stay together. Oversized components are explicitly excluded, with no truncation. Canonical repeats preserve separate provenance; conflicts need review.

Local output remains `persistence_pending` until exact files and the original portable release are verified in Drive. `compatibility_pending` is distinct from `delivery_blocked`, `staged` and `published`. Routed corrections/media and unresolved items block whole-release readiness even when a separately reported text subset is valid. Passing gates recorded in an upload is evidence metadata, not an independent clinical or human review.

Corrections and media cannot go through normal text manifests. Their live routes remain disabled until separately verified. The converter preserves routed originals and emits `routes.jsonl`; it never changes keys, strips images, copies review approvals or changes learner history. See the approved companion plans for proposal packages and archive-first receipts.

## Local correction and media proposals

Correction/provenance proposals retain the question ID, bind the current version and content hash, list disputed-key/identity/fresh-review gates and affected derivative IDs. They do not contain author/reviewer identities or change historical attempts. Applying a proposal requires an independently verified authenticated version-checked route; those capabilities are disabled.

Optional assets-manifest.json contains exactly bundle, assetFiles, privacyEvidence and promptEvidence. bundle uses the existing exact media domain contract. assetFiles binds version IDs to opaque assets/<sha256>.<extension> paths and measured hashes/lengths. privacyEvidence records are {mediaAssetVersionId,status,evidence}; promptEvidence records bind {questionVersionId,bindingSha256,status,evidence}. Inspector streams hashes, limits files to 128 MiB and inspects at most 64 KiB of supported PNG/JPEG/WebP headers for format/dimensions. It is not a full pixel decoder or deidentification proof. Independent privacy, rights and exact question/asset/annotation binding review remain required. New questions without target versions remain binding_pending. Signed URLs are not preserved image bytes.

Generated proposals and media metadata are covered by the sealed handoff. Source bytes remain in the immutable original release. Live mutation/storage endpoints, transaction/idempotency checks and isolated integration acceptance require a separate reviewed integration plan. The known text draft contract does not grant permission, readiness or publication authority.

## Archive and draft delivery ports

The handoff seal covers sourceFiles (raw original manifest and every portable file), generated payloads, deterministic chunk identities and states. archiveHandoff verifies both local trees, namespaces files under release/ and handoff/, reconciles candidates before uploads, checks actual parent/length/readback SHA-256, and saves append-only per-file/final companion receipts. Missing ports, ambiguous candidates, absent bytes or receipt persistence leave persistence_pending. Receipt hashes cover a snapshot with receiptReference:null; the observed reference is returned separately. Receipt payloads retain only allowlisted fields and diagnostic codes.

External services are injected ports, never configured by uploaded content: ArchivePort find/upload/readBytes/metadata; TextStagePort readImport/stage; ReceiptJournal append; IndexPort read/compareAndAppend. The repo supplies no Drive OAuth service, storage upload bridge or watcher. A real port requires an active authorized task and observed connector/API evidence. Fixture-tagged ports/receipts can operate only in isolated-test mode; they cannot authorize a live target or production index.

Draft staging requires approvedReleaseId, targetEnvironment, mode and preflightEvidence. The latter binds kind:authorized-stage-validation, releaseId, handoffDigest, targetEnvironment and targetSnapshotDigest. This records explicit authorization for the target staging validation; it does not manufacture a non-mutating preflight endpoint or establish target freshness from a timestamp. Compatibility stays pending until an actual stage/readback agrees. Staging acceptance establishes a draft only. readImport precedes every post; after uncertainty, reconcile target evidence before another mutation. Server jsonb digest is recorded separately from local payload byte SHA-256, and parsed semantic manifests must agree. No publication method is called, and no final question/note versions are guessed. An existing publication requires its observed publication receipt.

prepareRepositoryHandoff returns exact already-archived content/inbox files with repository_handoff_pending; it performs no git operation. appendReleaseIndex consumes saved companion references, preserves separate portable/compatible/staged/published pointers, uses the explicit compare-and-append contract, and reconciles timeout outcomes by readback. Drive index mutation stays unavailable without a true concurrency precondition or verified serialized writer. A re-read is not atomic compare-and-swap. LatestCompatible is intentionally unset: no target non-mutating compatibility contract has been established.

All acceptance uses new synthetic material and fake external ports. Real-content acceptance requires new supplied originals and separately authorized archive/target scope. Historical/learner data, review/publication endpoints, production migrations and CI staging workflows remain untouched.

## Final review safeguards

Corpus-wide key conflicts are detected before route/eligibility selection. Differing duplicate explanations block every member of that family for review; no lexical winner is chosen. Verified PYQ occurrences require an evidenced option key matching the canonical key; disputed historical keys stay preserved and excluded until a separate supported resolution exists. Later-version intelligence is validated against the actual current source version and never rebound to @1. Verified occurrence-source additions with unchanged question facts are provenance proposals; unsupported source removals remain corrections.

A new note depending on an unchanged existing target question is explicitly excluded as existing_question_dependency_requires_integration. Other eligible content continues. This version never guesses the dependency's current publication/version compatibility or silently duplicates an existing question into a new draft. A future integration contract can enable those note links after verifying current dependency state.

Archive receipts now persist uncertainOperations (path, SHA-256, bytes, parentId, operationId, candidateId) before upload. Failed intent persistence causes zero uploads. A retry with an unresolved intent and empty lookup stays reconciliation_required; it cannot infer authoritative absence from a search. A returned candidate identity is retained for exact readback, and uncertainty is removed only after verification. Fixture status propagates from every contributing port, journal and explicitly tagged source record.