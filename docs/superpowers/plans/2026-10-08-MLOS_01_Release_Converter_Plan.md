# MLOS Release Converter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. Execution method and implementation approval have not yet been selected.

**Goal:** Convert a verified portable material release into deterministic app import files without staging or publishing anything.

**Architecture:** Separate release file reading from pure validation, mapping and packing. Reuse the application's validators instead of weakening them. Unsupported corrections and media become explicit routed items for Plan 02; archive and delivery evidence belongs to Plan 03.

**Tech Stack:** Node >=24, ES modules, node:test, node:assert/strict, built-in filesystem/path/crypto; no new packages initially.

**Spec:** docs/superpowers/specs/2026-10-08-material-release-adapter-design.md. Drive copy: https://drive.google.com/file/d/1m8M2MMRUB2tEjWuBmjZ7hq2vnWPNyyVc/view

**Companion plans:** MLOS_02_Correction_Media_Plan.md; MLOS_03_Archive_Receipt_Plan.md. Each is a separately reviewable deliverable. Start with this plan; do not turn one approval into unattended deployment.

## Global Constraints

- Work only in Medical_Learning_OS; do not access NEETPG2027 or restore erased catalog/test seed material.
- Current app schemaVersion is 1 or 2; exact fields are schemaVersion, importId, concepts, sources, questions, notes, noteQuestionLinks.
- Current limits are 200 concepts, 200 sources, 100 questions, 100 notes, 500 note-question links, and a 1 MiB payload.
- Preserve original question text, option order/text/IDs, answer key, clinical units, negatives and provenance; no clinical shortening is performed by this converter.
- The proposed portable contract is mlos-material-release@1. Its releaseSchemaVersion is independent of the app's schemaVersion.
- Do not remove their media classification to bypass this restriction.
- Dry-run produces reports only. No release adapter writes review attestations, published flags, learner events or private learner data.
- Reuse identical releases. Never overwrite completed Drive releases; archive exact handoff bytes before separately authorized delivery.
- Passing tests is structural verification, not medical review, rights clearance, deployment or learner efficacy.

## Review Focus

- Escaped duplicate JSON keys such as id and \u0069d must be detected before ordinary JSON parsing loses the conflict — Task 1.
- Valid UTF-8 multibyte text must be measured in serialized bytes, not characters — Task 3.
- Unknown PYQ years, recalled appearances or differing historical keys must not be promoted to verified app origins — Task 2.
- A shared concept/source or identical question appearing in different chunks must not hide a conflict or inflate counts — Tasks 2 and 3.
- A retry after a partially written output directory must not overwrite or mark an incomplete handoff complete — Task 4.

## Repository grounding and preflight

Inspected 2026-10-08: package.json requires Node >=24; scripts/stage-content-inbox.js validates files then optionally stages through content_library_stage_v1; src/domain/content-library.js validates schema 1/2 and rejects unsupported media; content-library-api offers admin POST /imports but publication is a separate attested action. No app tests were run while writing this plan.

At execution start read AGENTS.md, README.md, docs/PROJECT_CONTEXT.md, docs/STATUS.md, docs/ROADMAP.md, docs/CONTENT_LIBRARY_CONTRACT.md and the spec. Inspect current content-library.js and inbox tests again. If contract limits/fields have changed, update this plan and its pinned contract tests before proceeding. Work on a feature branch/worktree and preserve unrelated edits. Never run --stage during verification.

## File responsibilities and shared types

Create src/domain/material-release/contract.js (portable shape/reference validation and deterministic Markdown), mapping.js (exact app mapping and identity conflict detection), packing.js (dependency-preserving batches), scripts/lib/material-release-files.js (strict JSON and safe file I/O), scripts/convert-material-release.js (local CLI), tests/material-release-*.test.js, tests/helpers/material-release.js, docs/MATERIAL_RELEASE_ADAPTER.md and docs/material-release-schema-v1.json. Modify docs/STATUS.md and docs/DECISIONS.md only to record actual implementation and verification. Keep current import/publication validators unchanged.

The following are proposed interfaces, not existing code. Use JSDoc typedefs in contract.js so all modules agree:

- Diagnostic: {code:string, recordId:string|null, path:string|null}; no raw source text in console errors.
- Release: {manifest:Manifest, records:{concepts:Record[],sources:Record[],questions:Record[],notes:Record[],occurrences:Occurrence[],relations:Relation[]}, markdown:Object<string,string>, assetsManifest:object|null}.
- Record: {recordId:string,recordVersion:positiveInteger,contentFile:string|null,app:object,archive:object}. recordId equals the app entity ID. archive retains evidence, historical keys, rights/eligibility and source locators; it is never copied wholesale into app payloads. archive.gates is an array of {gate,status,evidenceRefs}, with status passed|failed|pending|not_applicable and source/locator references for every passed gate. Question gates are extraction,medical,key,provenance,options,image,rights,identity,learning-utility. Missing/failed/pending required gates exclude the record; not_applicable must include a reason in archive. This validates evidence presence, not the truth of an uploaded claim.
- Occurrence: {occurrenceId,questionId,sourceId,locator,verification,origin,historicalKey}; verification is verified|recall|unverified, origin is the exact app PYQ/platform object when representable, otherwise null. Keep incomplete raw metadata in source archive. A nonverified occurrence is not added to app origins.
- Relation: {relationId,kind,fromId,toId,section}; kind includes explains|contrasts|prerequisite for a note-to-question link, or archive-only related|variant-of|redirect. Roles for question-concept edges remain inside question.app.conceptLinks.
- Manifest: {releaseId,releaseSchemaVersion:1,createdAt,priorReleaseId,ruleVersion,files,counts,eligibility}; files are {path,sha256,bytes,kind}, counts name the six datasets above; eligibility is {intendedUse:'private_study'|'app_publication',includedIds:string[],excluded:Array<{recordId,reason}>}. Private-study readiness never establishes publication eligibility. Dates are canonical UTC ISO. manifest.json excludes itself from files. schema.json and required human documents are included and hashed.
- TargetSnapshot: {contractId:'content-library-inbox-v1',capturedAt,environment,catalog,questionMetadata,conceptMetadata}. catalog is validated by validateCatalog; metadata retains classifications/origins/intelligence. This must come from an authorized full target snapshot, never the answer-free learner projection. null means target compatibility remains pending.
- Mapped: {releaseId,releaseDigest,adapterVersion:'1',concepts,sources,questions,notes,noteQuestionLinks,routes,excluded,diagnostics,compatibility}. routes entries contain {recordId,kind:'correction'|'provenance'|'media',reason,expectedVersionId:null|string}; nothing is silently discarded.
- Handoff: {releaseId,releaseDigest,adapterVersion,chunks,files,routes,excluded,diagnostics,state}; chunks have {importId,manifest,bytes,sha256,recordIds}. files list generated relative paths, exact bytes and SHA-256. state is compatibility_pending|app_ingestion_ready|delivery_blocked, scoped to text chunks; archive status remains separate until Plan 03.

Dataset wrappers preserve portable archive information while app contains the exact supported shape. For questions, retain supplied app origins only if they agree with verified occurrences; reject mismatches, then build a deduplicated exact union. Notes use app.bodyMarkdown as authoritative prose. Question/concept Markdown is generated deterministically. A schema migration must be explicit; older ad hoc JSONL is not guessed into this contract. A concept may exist with no publishable note; do not invent note provenance or a question link to force it into the app.

## Task 1: Safe release reader and portable contract

**Files:** Create scripts/lib/material-release-files.js, src/domain/material-release/contract.js, docs/material-release-schema-v1.json, tests/helpers/material-release.js, tests/material-release-contract.test.js and tests/material-release-files.test.js.

**Interfaces:** Produce parseStrictJson(text,path)->JSON; readRelease(directory)->Promise<Release>; validateRelease(release)->Release; renderQuestionMarkdown(record,occurrences)->string; renderConceptMarkdown(record)->string. Produce fixture factories makeRelease(overrides={}), makeTarget(overrides={}), makeQuestion(id,overrides={}), makeNote(id,questionIds,overrides={}) and writeFixtureRelease(directory,release)->Promise<void>. Factories use new artificial names, fictional nonclinical stems and explicit test-only provenance; no previous medical seed records.

- [ ] Write tests named escaped_duplicate_keys, unsupported_schema, unsafe_paths, symlink_escape, incomplete_manifest, hash_mismatch, invalid_utf8, markdown_disagreement and valid_synthetic_release. Assert throws with codes duplicate_json_key, release_schema_unsupported, unsafe_release_path, manifest_incomplete, file_hash_mismatch, encoding_invalid, markdown_mismatch respectively; valid release IDs/options/keys survive unchanged. Test actual escaped key spelling, not two already parsed JS properties.

```js
test('escaped_duplicate_keys', () => {
  assert.throws(() => parseStrictJson(String.raw`{"id":1,"\u0069d":2}`, 'manifest.json'), /duplicate_json_key/);
});
```

- [ ] Run node --test tests/material-release-contract.test.js tests/material-release-files.test.js. Expected first run: missing module/export failure; after stubs exist each behavioral test must fail for its intended assertion.
- [ ] Implement the specified signatures. Use strict JSON token parsing that detects duplicate decoded keys at each object depth; JSON.parse alone is insufficient. Decode UTF-8 with fatal=true. Validate safe relative POSIX paths, reject absolute/dot traversal/backslash paths, symlinks and nonregular files using lstat and realpath containment. Stream asset hash checks; never execute uploads. Read applicable datasets from manifest paths; reject duplicate record IDs/versions and undeclared payloads. Define schema.json from the published schema and verify the declaration matches version 1. Required documents: changes.jsonl, validation.md, INGESTION.md, schema.json; applicable data/media companions only. Reject partial deltas in v1 with release_base_reconstruction_required rather than pretending they are complete.
- [ ] Validate wrappers, positive versions, byte counts, source/concept/question/relation references and explicit eligibility/gate coverage. IDs must not collide across entity types in this portable v1; reject a collision rather than remapping existing identity. Render structured question/concept companions and compare exact UTF-8 bytes. Compare note companions to app.bodyMarkdown; source evidence/history stays in archive. No implicit Unicode clinical-text normalization.
- [ ] Run both test files again. Expected all pass, with malformed inputs failing before any writes or network access.
- [ ] Commit only the listed files: git commit -m "feat: validate portable material releases".

## Task 2: Lossless mapping, occurrence deduplication and routing

**Files:** Create src/domain/material-release/mapping.js and tests/material-release-mapping.test.js; extend fixture factories only for newly needed synthetic cases.

**Interfaces:** Consume validateRelease, TargetSnapshot and existing validateImport/questionSignature/questionAnswer from src/domain/content-library.js. Produce mapRelease(release,{target=null,adapterVersion='1'}={})->Mapped. No I/O.

- [ ] Write original_mapping_preserves_facts with assert.deepEqual(out.questions[0].options,inputOptions), unchanged answerOptionId and unchanged stem. Write one_pyq_two_years_one_platform asserting one canonical question, two evidenced PYQ origins, retained platform origin, and questionHome returns only PYQ presentation. Write unknown_year_is_not_invented asserting excluded diagnostics and no guessed origin.

```js
test('original_mapping_preserves_facts', () => {
  const input = makeRelease();
  const out = mapRelease(input);
  assert.deepEqual(out.questions[0].options, input.records.questions[0].app.options);
  assert.equal(out.questions[0].answerOptionId, input.records.questions[0].app.answerOptionId);
  assert.equal(out.compatibility, 'compatibility_pending');
});
```

- [ ] Write same_signature_conflicting_answer asserting answer_conflict across the entire release; near_match_not_auto_merged asserting two distinct IDs survive. Write existing_changed_question_routes_correction asserting zero new-import rows for that ID and an expected-version route. Write same_id_different_concept_or_source asserting identity_conflict. Write changed_existing_note_is_blocked asserting note_correction_route_unavailable; do not send it as a new note.
- [ ] Write note_provenance_not_invented, missing_primary_concept and unsupported_media_routes_only. Assert invalid note provenance is rejected; media intelligence remains intact in routed source records and never appears in normal text chunks. Write unsupported_archive_field_is_retained asserting preserved archive data but no added app fields. Write failed_critical_gate_not_averaged and private_study_not_publication asserting blocked/excluded record state irrespective of other passed gates. Test target=null yields compatibility_pending.
- [ ] Run node --test tests/material-release-mapping.test.js; expected failures until mapRelease exists and follows these assertions.
- [ ] Implement mapRelease with explicit key allowlists from current importer. Compare identities across the complete input, not within individual batches only. Union only proven compatible duplicate appearances; answer conflicts and concept conflicts block the connected records. Include keyword classifications unchanged. Use schema 2 only for supported intelligence; validate derivative gates via existing code, never generate or mark equivalent derivatives here. Unmapped facts remain in archive/report. Resolve target comparisons using exact current content/version and metadata; absent snapshot never means target empty. Existing unchanged items become no-op mappings; new provenance becomes its own routed proposal, not a false correction publication.
- [ ] Run test file again; expected pass. Commit listed files: git commit -m "feat: map releases without changing canonical facts".

## Task 3: Dependency-aware deterministic packing

**Files:** Create src/domain/material-release/packing.js and tests/material-release-packing.test.js.

**Interfaces:** Consume Mapped. Produce stableJson(value)->string, digestBytes(bytes)->hexString and packMapped(mapped)->Handoff. Serialization orders object keys by code-point order, preserves array order unless the array is explicitly a set, uses two-space formatting and one final newline. Deterministic IDs use mlos- plus a SHA-256 digest of the release digest, adapter version and sorted component identities; IDs must fit the existing 160-character grammar.

- [ ] Write repeat_run_identical asserting byte-for-byte same chunks/IDs after input record-order permutation, while option order remains untouched. Assert changed release bytes or adapterVersion changes identity. No timestamps from the current clock in deterministic outputs.

```js
test('repeat_run_identical', () => {
  const mapped = mapRelease(makeRelease());
  assert.deepEqual(packMapped(mapped), packMapped(structuredClone(mapped)));
  for (const chunk of packMapped(mapped).chunks) {
    assert.ok(Buffer.byteLength(chunk.bytes, 'utf8') <= 1048576);
    assert.ok(chunk.manifest.questions.length <= 100);
  }
});
```

- [ ] Write limits_100_101_questions, limits_100_101_notes, limits_200_201_concepts, limits_200_201_sources, limits_500_501_links and exact_utf8_1mib. Assert every emitted chunk obeys all count limits and Buffer.byteLength(bytes,'utf8')<=1048576. Assert an atomic component that cannot fit yields component_too_large, never truncation. Verify equality at 1048576 is accepted and 1048577 rejected by the size predicate; include multibyte characters in fixtures.
- [ ] Write linked_note_questions_stay_complete, dependent_source_conflict_across_chunks and unsupported_empty_import. Assert each chunk has all required referenced concepts/sources/questions; linked new note/question components remain whole; repeated dependency definitions are identical; no question/note-free chunk is emitted. Existing target dependencies are not externalized in v1: include validated definitions or block a conflicting dependency.
- [ ] Run node --test tests/material-release-packing.test.js; expected behavioral failures.
- [ ] Implement union-find connected components for new note-question links. Attach required concepts/sources, deduplicating identical definitions; sort components by opaque ID, then greedily pack with exact serialized size including the real importId. Repeated dependencies across chunks are allowed only with verified identical app definitions. Validate each finished chunk using validateImport and a supplemental reference check, because validateImport alone does not establish every cross-record/target reference. No drop-to-fit strategy. Record all excluded/routed IDs, ID mappings and hashes.
- [ ] Run packing tests and node --test tests/material-release-*.test.js; expected all pass. Commit listed files: git commit -m "feat: pack deterministic validated intake batches".

## Task 4: Local-only CLI and immutable handoff output

**Files:** Create scripts/convert-material-release.js, tests/material-release-cli.test.js and docs/MATERIAL_RELEASE_ADAPTER.md; extend scripts/lib/material-release-files.js with output writing.

**Interfaces:** Consume readRelease/mapRelease/packMapped. Produce runConverter({releaseDir,outDir:null|string,targetFile:null|string})->Promise<Handoff>; writeHandoff(directory,handoff)->Promise<{reused:boolean}>. CLI: node scripts/convert-material-release.js --release <directory> --dry-run [--target <snapshot.json>] or --release <directory> --out <new-directory> [--target <snapshot.json>]. --dry-run cannot combine with --out. No --stage, --publish or credential flags.

- [ ] Write dry_run_zero_writes and dry_run_zero_network with spies asserting no mkdir/writeFile/fetch/spawn calls. Write unsupported_stage_flag asserting exit 2. Write safe_console_codes asserting no source stems, tokens or private metadata appear in stderr.

```js
// In dry_run_zero_writes, fixtureDir is the temporary release created by writeFixtureRelease.
const result = await runConverter({releaseDir: fixtureDir, outDir: null, targetFile: null});
assert.equal(result.state, 'compatibility_pending');
assert.equal(writeSpy.mock.callCount(), 0);
assert.equal(networkSpy.mock.callCount(), 0);
```

- [ ] Write deterministic_output_reuse and interrupted_output_conflict. Assert existing complete byte-identical output is reused; differing or incomplete directories yield output_conflict without deleting anything. Assert a write failure never leaves a completion marker or claims archive saved.
- [ ] Run node --test tests/material-release-cli.test.js; expected fail before implementation.
- [ ] Implement local output in a new same-parent temporary directory; write imports/<importId>.json, routes.jsonl, exclusions.jsonl, mapping.json, validation.md, INGESTION.md, handoff-manifest.json and COMPLETE.json last. handoff-manifest hashes payloads, excluding itself and COMPLETE.json; COMPLETE contains its hash. Rename without overwrite after checking the exact target. Reuse only after verifying all declared bytes/hashes. Keep incomplete temp artifacts identifiable for safe manual reconciliation; never recursively erase arbitrary directories. No output goes into content/inbox automatically.
- [ ] Run CLI tests; expected pass. Docs explicitly state that local output is persistence_pending until verified Drive receipt, target-null is compatibility_pending, and a valid local manifest is not a staged/published item. Commit listed files: git commit -m "feat: add non-mutating material release converter CLI".

## Task 5: Whole-converter acceptance and implementation record

**Files:** Create tests/material-release-acceptance.test.js; modify docs/MATERIAL_RELEASE_ADAPTER.md, docs/STATUS.md and docs/DECISIONS.md.

**Interfaces:** Consume runConverter and synthetic fixtures. Produce a verified converter deliverable and explicit route/exclusion report; no new runtime API.

- [ ] Write synthetic_release_to_valid_chunks asserting generated JSON passes current validateImport, record totals reflect canonical IDs rather than occurrences, all file hashes agree and reruns are identical. Write incomplete_or_mixed_release_reports_subset asserting text-ready subset is explicitly scoped and media/correction exclusions prevent whole-release readiness. Create target snapshot only from artificial fixtures.

```js
test('synthetic_release_to_valid_chunks', () => {
  const result = packMapped(mapRelease(makeRelease()));
  assert.ok(result.chunks.length > 0);
  for (const chunk of result.chunks) {
    assert.doesNotThrow(() => validateImport(chunk.manifest));
    assert.equal(digestBytes(chunk.bytes), chunk.sha256);
  }
});
```

- [ ] Run node --test tests/material-release-acceptance.test.js and confirm initial failures, then implement missing orchestration only; do not relax earlier assertions to pass.
- [ ] Run npm test and npm run check. Expected zero test failures and the current check script's success output. Record actual results/counts; do not copy historic test totals. Run CLI dry-run against the synthetic temporary release and verify no production calls.
- [ ] Document exact supported v1 schema, migration rejection, limits, routes, repeat behavior, no staging/publication and next Plan 02. Record actual work and limitations in STATUS; add a unique ADR number in DECISIONS. Commit only changed task files: git commit -m "docs: record verified release converter boundaries".

## Self-review and coverage

Spec sections 1–6: Tasks 1–5. Correction/media requirements: explicit routing in Task 2 plus Plan 02. Archive-first and actual receipts: Plan 03; local converter never satisfies Drive persistence by itself. Spec acceptance conditions map to the named tests across all three plans. Delta reconstruction is deliberately unsupported in v1 and fails clearly, rather than weakening the durable contract. Live correction/media integration and a continuous watcher require separate verified contracts and authorization; they are not hidden implementation tasks.

This document is a plan. Its checkbox steps are unexecuted; no test outcome, code change or app import is claimed.
