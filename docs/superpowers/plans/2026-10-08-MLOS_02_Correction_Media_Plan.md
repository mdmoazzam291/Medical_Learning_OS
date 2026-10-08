# MLOS Correction and Media Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. Execute only after the owner approves this scoped plan.

**Goal:** Produce reviewable, version-bound correction and image packages without forcing them through an incompatible importer or publishing them.

**Architecture:** Consume the converter's routed records and an authorized target snapshot. Build immutable proposals and validated media packages using existing pure domains. Real mutation/storage bridges remain disabled until their exact contracts, authorization and acceptance tests are established in a separate integration plan.

**Tech Stack:** Node >=24, ES modules, node:test, built-in crypto/filesystem; existing src/domain/content.js and src/domain/media.js.

**Spec:** docs/superpowers/specs/2026-10-08-material-release-adapter-design.md. Prerequisite: MLOS_01_Release_Converter_Plan.md, including its shared types.

## Global Constraints

- Same question ID, new immutable content version for a correction to the same task. A materially different task requires explicit identity review, not automatic merge.
- Historical attempts retain their actual question-version references and historical answer keys. No silent rescoring.
- Stage a new draft with no inherited human approvals. This plan produces local proposals, not a live staged draft.
- New source versions, media versions and annotation versions preserve predecessors and exact bindings.
- Media-dependent presentation types are rejected by the normal portable importer with media_import_requires_asset_contract. Do not remove their media classification to bypass this restriction.
- Do not put patient identifiers, private bytes or expiring signed URLs in public repository content.
- Faculty opinions are proposals, not medical verification or licensing evidence.
- Automated fixtures must be synthetic, nonclinical and isolated from live databases. Do not resurrect erased seed material.
- No retire/publish/review-attestation API calls. No automatic learner-record changes or storage deployment.

## Review Focus

- An unchanged question with only new exam provenance must be routed as provenance, not unnecessarily rewritten — Task 1.
- A changed answer can be a disputed key, not proof of a legitimate new question identity — Task 1.
- A stale derivative must not be rebound to a corrected original automatically — Task 1.
- A valid media bundle can still contain unsafe filenames, identifying metadata or unsupported actual bytes — Task 2.
- An asset review or stored delivery reference does not prove the question/media binding was reviewed — Task 3.

## File map and integration boundary

Create src/domain/material-release/corrections.js, media-package.js and capabilities.js; scripts/lib/material-media-files.js; tests/material-release-corrections.test.js, material-release-media.test.js and material-release-capabilities.test.js. Extend tests/helpers/material-release.js for new synthetic cases. Extend converter output/report orchestration only after its existing route contract is preserved. Update docs/MATERIAL_RELEASE_ADAPTER.md, docs/STATUS.md and docs/DECISIONS.md for actual work.

Current observations: appendQuestionVersion validates sequential draft versions and requires predecessors. validateMediaBundle validates assets/annotations/links and requires earlier versions within the supplied bundle. toLearnerMediaPrompt omits diagnosis evidence and annotations, but does not itself inspect filename/URL content or image bytes. review-api has signed review-media retrieval; that does not establish an authenticated release media-upload/correction route. The plan must not invent one.

Shared proposal type: {proposalId,kind,questionId,expectedQuestionVersionId,expectedContentSha256,sourceReleaseId,sourceReleaseDigest,changeReason,evidence,proposedContent,affectedDerivativeIds,requiredGates,status}. kind is correction|provenance; status is correction_delivery_blocked|provenance_delivery_blocked|conflict. proposedContent contains exact supported original question fields and origins, not reviews or publication flags. Evidence entries are {sourceId,locator,statement}; a claim is not declared true by this shape.

MediaPackage: {packageId,sourceReleaseId,bundle,assetFiles,questionBindings,diagnostics,status}. assetFiles are {mediaAssetVersionId,path,sha256,bytes}; questionBindings are {questionVersionId,expectedQuestionSha256,bindingSha256}; status is media_delivery_blocked|conflict. Portable privacy records additionally contain {mediaAssetVersionId,status,evidence}, with status pending|cleared|failed; only actual supplied evidence supports cleared. Binding hash covers exact question content/version, asset/annotation content/version, link role/order and privacy/right scope. These portable fields do not get injected into the media validator's exact asset shape.

## Task 1: Correction/provenance proposals and stale-base checks

**Files:** Create corrections.js and tests/material-release-corrections.test.js; extend synthetic fixtures.

**Interfaces:** Consume Release, Mapped.routes, TargetSnapshot and existing appendQuestionVersion. Produce questionContentDigest(question)->hex; buildCorrectionProposals(release,mapped,target)->Proposal[]; assertProposalBase(proposal,target)->void. questionContentDigest covers questionId, questionVersionId, stem, options, key, explanation, conceptLinks, sourceIds and provenance with Plan 01 stable serialization; no mutable review flags/timestamps. Runtime write authorization is not implied.

- [ ] Write correction_retains_id with same task/new explanation asserting same questionId, expected old version, new evidence and status correction_delivery_blocked. Write answer_conflict_requires_review asserting no generated second identity. Write provenance_only asserting kind provenance and no changed original content.
- [ ] Write stale_base_rejected asserting stale_question_version when current version or content digest differs; use the same version with changed bytes as a negative case. Write corrected_source_new_identity asserting the proposed changed source has a new source ID/version rather than overwriting prior source bytes.

```js
// In stale_base_rejected, proposal binds to target before this immutable test mutation.
const changed = structuredClone(target);
changed.catalog.questions[0].stem += ' Changed';
assert.throws(() => assertProposalBase(proposal, changed), /stale_question_version/);
assert.equal(proposal.status, 'correction_delivery_blocked');
```

- [ ] Write historic_catalog_unchanged and derivatives_not_rebound. Build a synthetic preview draft with a supplied fictional test author, sequential version, empty reviews and null publishedAt; appendQuestionVersion must preserve the full old version unchanged. Assert affected derivatives are named for fresh review, not attached to the new source automatically. This preview is test-only; proposal does not fabricate live author/reviewer identities.
- [ ] Run node --test tests/material-release-corrections.test.js; expected failures until interfaces exist.
- [ ] Implement signatures with exact base identity checks. Proposals include source release digest, proposed facts, reasons and evidence. A target-null route yields a blocked diagnostic, not a guessed version. A different task remains identity_review_required until the owner supplies an identity decision. A media change is handed to Task 2; correction proposals list required medical/references/rights/media gates without declaring them passed.
- [ ] Run tests; expected all pass and no mutation of input target, prior versions or attempts. Commit only listed files: git commit -m "feat: prepare immutable correction proposals".

## Task 2: Media-byte verification and exact-version packages

**Files:** Create media-package.js, scripts/lib/material-media-files.js and tests/material-release-media.test.js; extend synthetic fixture helper with generated nonclinical test images, not old clinical seed assets.

**Interfaces:** Consume validateMediaBundle/toLearnerMediaPrompt, safe release paths and digest helpers. Produce inspectImageFile(path)->Promise<{mimeType,width,height,sha256,bytes}>; prepareMediaPackage(release,{target,assetFacts,privacyEvidence})->MediaPackage. assetFacts is the measured map returned by inspectImageFile, never an uploaded declaration assumed to be measured. Produce mediaBindingDigest(question,bundle,privacyEvidence)->hex.

- [ ] Write missing_asset_blocks, byte_hash_mismatch, actual_mime_mismatch and declared_dimensions_mismatch. Assert explicit codes missing_media_asset, file_hash_mismatch, media_mime_mismatch and media_dimensions_mismatch. Test PNG/JPEG/WebP signatures/dimensions using tiny new artificial fixtures. A fake PNG extension alone must fail.
- [ ] Write metadata_privacy_pending and unknown_rights_blocks asserting no readiness or safe-publication claim. Require a privacy evidence record even for an otherwise valid bundle; the package is blocked for cleared=false/missing evidence. Header/EXIF inspection is not a claim that visible image content is deidentified.
- [ ] Write missing_predecessor_blocks and changed_asset_changes_binding. Assert assets/annotations version 2 require version 1; same bytes with changed annotation or question content changes binding. New/changed media does not inherit a reviewer flag; preserve actual historic review data separately, and new objects remain unverified unless independently supplied genuine review evidence is validated by the authorized workflow.
- [ ] Write prompt_projection_no_evidence_or_annotations asserting the exact allowlist mediaAssetVersionId,modality,mimeType,width,height,deliveryRef,blindFirstLook. Test answer-bearing delivery references/captions/labels route to prompt_leakage_review_required rather than accepting an automated keyword filter as proof of no leakage.

```js
// In prompt_projection_no_evidence_or_annotations, bundle is the new synthetic validated media fixture.
const prompt = toLearnerMediaPrompt(bundle, questionVersionId)[0];
assert.deepEqual(Object.keys(prompt).sort(), ['mediaAssetVersionId','modality','mimeType','width','height','deliveryRef','blindFirstLook'].sort());
assert.equal(Object.hasOwn(prompt, 'diagnosisEvidence'), false);
```

- [ ] Run node --test tests/material-release-media.test.js; expected behavioral failures.
- [ ] Implement signatures: stream hashes; inspect bounded image headers to validate supported JPEG/PNG/WebP actual format/dimensions, rejecting corrupt/unsupported inputs. Do not transform clinical image bytes. Use opaque relative asset references in portable packages; runtime delivery references need separate verified storage receipts. Verify source rights and privacy evidence separately from structural media validation. Require real target question version and digest for bindings; for new questions without an assigned target version, output binding_pending and retain the unchanged question package outside the normal importer.
- [ ] Run tests; expected pass. Commit listed files: git commit -m "feat: prepare validated version-bound media packages".

## Task 3: Capability gates and mixed-release acceptance

**Files:** Create capabilities.js and tests/material-release-capabilities.test.js; extend converter orchestration, CLI tests and docs/MATERIAL_RELEASE_ADAPTER.md; update STATUS/DECISIONS after verification.

**Interfaces:** Produce deliveryCapabilities()->{textDraftStage:true,correctionStage:false,provenanceUpdate:false,mediaStage:false,publication:false}; mergeRoutedPackages(handoff,{corrections,media})->Handoff. textDraftStage identifies the known contract, not granted permission or a successful call. Generated output adds proposals/corrections.jsonl, proposals/provenance.jsonl and media/package.json when applicable, all covered by the handoff manifest.

- [ ] Write unavailable_route_cannot_be_enabled_by_upload asserting uploading capabilities or stage/publish fields has no effect. Write mixed_release_counts_and_states asserting text chunk status is scoped, correction/media states remain blocked, and the aggregate cannot be app_ingestion_ready when required items are incomplete.

```js
test('unavailable_route_cannot_be_enabled_by_upload', () => {
  assert.deepEqual(deliveryCapabilities(), {textDraftStage:true,correctionStage:false,provenanceUpdate:false,mediaStage:false,publication:false});
});
```

- [ ] Write mismatched_binding_cannot_be_reviewed asserting no package is called reviewed based on an asset-only review or a stored reference. Write corpus_and_history_unchanged asserting serialization leaves original/intelligence/historical version records byte-identical except explicitly proposed new package artifacts.
- [ ] Run node --test tests/material-release-capabilities.test.js; expected failures before implementation.
- [ ] Implement fixed capabilities in code, not imported from user content. Wire local package generation, preserving explicit route errors. Document the next live-integration gate: inspect actual authenticated mutation/storage endpoints, transaction/idempotency and version-hash checks; add a separate reviewed plan with isolated integration tests and a deployment approval point. If those routes do not exist, building them is a new scoped task, not an excuse to weaken the importer.
- [ ] Run node --test tests/material-release-*.test.js, npm test and npm run check. Expected all pass; record actual outcomes and supported/blocked capabilities. Commit focused files: git commit -m "feat: enforce release route capability boundaries".

## Self-review and deferred work

Spec correction/media identity, historical attempts, fresh reviews, safe prompts and blocked missing assets are covered by Tasks 1–3. This plan intentionally ships useful local proposal packages; it does not claim live correction/media storage bridges. The spec's explicit unavailable-route behavior is fulfilled by blocked capability states. Live bridges require a separate integration plan after real endpoint/migration contracts and permissions are verified. Media display, distributed staging recovery and admin publication cannot be certified by these local tests.

All steps are unexecuted. No clinical content, reviewer identity, live image delivery or publication is manufactured.
