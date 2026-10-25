# Admin-owned intake and per-item learner publication

Status: proposed design for owner approval; no product code or production visibility has changed.

## Owner request and intended outcome

Imports remain private to Admin until the administrator releases each item from its own Library. Learners initially receive questions (PYQ, QBank and originals) plus question attempts, results, explanations after submission, revision and progress. Admin retains full content access. Each item has one canonical Publish to learners action in its Admin Library detail/card and a green Published to learners status after successful server readback. Future imports never publish automatically.

The owner authorizes current available questions to be learner-visible. A read-only check on25October2026 found catalog446, six questions all published, ten concepts, six published canonical notes and one published import. Therefore no current question needs blind republishing. On rollout, preserve the six existing published question versions as learner-released, recording this as a carry-forward of existing distribution and the owner's retention request, not a newly fabricated clinical/rights approval. The six existing notes become Admin-only in the new visibility layer, without deleting or retiring them or changing any IDs, approvals, question receipt or learner evidence. No erased historical fixtures may be reintroduced.

## Existing review discrepancy — not resolved by a visibility badge

Issue326 records contradictory pending/unapproved draft text and source-rights evidence in the current six-question/six-note set despite saved publication/review statuses. Some source material is described as commercial recall annotations of unknown rights while its saved status says public domain. This design does not settle those contradictions, create source permissions, clean immutable evidence or manufacture human review. Keep an independent Review reconciliation required warning alongside distribution status. The owner's current request to retain all available questions supplies distribution intent, not a new rights or medical attestation. New publication/release actions with unresolved conflicting evidence remain blocked pending genuine exact-version reconciliation. Existing notes become Admin-only because the owner now requests that visibility policy, not as an automatic response to the issue.

## Approach

Extend the existing canonical intake/review/publishing service with a single per-item learner-release boundary. Do not copy catalogs into separate Admin/learner databases. Do not implement privacy using hidden navigation alone. Keep Supabase authoritative.

Alternatives considered: independent Admin/learner content copies would split identity and evidence; frontend-only hiding would leak private content through APIs. A shared canonical store with server-enforced release projections preserves current versions, existing review gates and future provider portability.

The owner requested the shared-store, Admin-controlled workflow. Exact implementation details below are engineering proposals, not claims that the owner chose a schema or that the feature is already built.

## Two independent states

1. Review lifecycle: draft, in review, verified, published/retired, with current exact medical, references and rights evidence.
2. Learner distribution: Admin-only, released to learners, or withdrawn from learners.

An internal review-approved object is not automatically learner-released. A release must also satisfy the existing safety/rights gates for the exact content version. Existing rights or safety withdrawal overrides distribution permission immediately. An Admin-only distribution change is not retirement and does not delete historical evidence.

One visible Publish to learners action is not a bypass: it opens the exact item's confirmation/review context, shows missing checks, and uses the existing authenticated publication authority. Where necessary reviews are incomplete, it explains the blockers and cannot fabricate approval. Already-approved items can be released with one final administrator action. The administrator may fill the existing required attestations in that same context; no parallel review record or batch-wide auto-approval is introduced.

## Admin experience

- All staged/reviewed/released content is discoverable in an authenticated Admin Library using the existing singleton Admin authority.
- Library filters include content kind, collection, publication state and canonical concept/case links. The Admin view may include protected answer and review detail that learner responses never expose.
- One canonical publication control per item in the respective Admin Library detail/card: questions, notes, supported concept resources, graph resources and cases. Intake stages and inspects imports, then links to these items; remove competing learner-release controls from intake/global navigation rather than adding more publish buttons.
- A graph publication unit must be an explicitly versioned reviewed graph resource or relationship set. Do not place a meaningless global Publish button on a derived graph visualization. Existing medical relationship publication/review remains authoritative; graph distribution must not grant clinical review authority.
- Cases and reusable mixed-concept resource bundles need explicit versioned records if not already supported. Do not advertise a working case publisher for an unimplemented data type.
- Badges: Admin only (neutral), Review required (amber), Published to learners (green plus text/icon), Withdrawn (clearly labeled). Green requires successful persisted release and effective eligibility, not an optimistic click or stale catalog status.
- Show content/version, approved title, released by/at, current review blockers, connected IDs and safe learner preview. Repeated identical release requests return the existing receipt.
- Future content changes create new versions which default to Admin-only. Existing PostgreSQL question/note publication retires the previous version, so keep a new reviewed revision at verified until its final atomic learner-release operation publishes it, retires the old eligible version and switches effective release together. Do not call the old publication function merely to establish an Admin-only reviewed revision. An existing released version stays active during draft/review preparation unless explicitly withdrawn for safety/rights. A new import or correction cannot inherit learner release automatically.

## Learner experience and API boundary

Initially learners can browse/practice the released question collections and use attempts, saved review, revision and progress. Preserve the submission-before-answer boundary and the newly released exact-attempt review restrictions. Scores and original versions do not change.

Unreleased Notes, Graph resources, cases and other full learning content are unavailable in learner navigation and all learner APIs. Imports/reviewer notes/rights evidence remain Admin-only. Existing authentication/account/privacy actions remain available. An Admin can preview learner mode without losing Admin authority or creating another account.

Audit exposed RLS policies, grants, direct database reads and RPCs as well as HTTP handlers; service-role checks alone do not secure another exposed path. Enforce release in the existing learner projections and all alternative retrieval paths: Library, Study Now, direct question/session selection, exam assembly/scoring, Vault canonical notes/search, graph feeds, media URL issuance, source-resource delivery, related items, canonical-note anchors, receipt source citations and exports. Inventory outstanding signed media URLs and cache TTLs: blocking new URL issuance does not revoke an already-issued URL; define revocation/expiry behavior before claiming immediate withdrawal. Personal learner annotations/exports remain learner-owned; do not hide or delete them because their canonical note is not released. Prevent shared caching of private projections.

Questions may retain learner-safe topic labels and canonical references required for progress while full concept/note/case resources are Admin-only. A Related content link appears only when its target is effectively released. Publishing a question never releases its notes, sources, graphs or case package as a side effect. Internal references to Admin-only targets remain valid and must resolve when those exact targets are later published.

## Canonical identity and mixed concepts

Question, concept, note, case and graph records each keep their own stable ID. Their IDs must be linked, not forced to be identical:

- questionId Q-001 and questionVersionId Q-001@1;
- conceptIds C-ACS and C-ECG, retaining exact IDs already assigned during intake;
- noteVersionId N-010@1 references conceptId C-ACS and explicit note-question links;
- caseVersionId CASE-003@1 references question versions and ordered/labeled concept membership;
- graph resource version references reviewed nodes and exact relationship versions.

A question assessing two, three or four concepts retains its existing primary/secondary/prerequisite/distractor concept links. Do not invent a new concept merely because a combination is new. A named case or reusable combination has its own case/bundle identity with those concept IDs. One concept can link many questions, and one question can link many concepts.

Record supplied display names, aliases, canonical IDs, role, exact content/version references and provenance at import time, even before full teaching content exists. Resolve later notes/cases against that registry. Ambiguous matches remain an Admin review task; never silently merge by similar names or require matching a question ID to a concept ID. Existing version-bound question intelligence and medical relationship contracts remain intact.

## Backend/data proposal

Use one provider-neutral per-item release contract and authenticated Admin adapter over existing canonical content/version storage. Release evidence is append-only and binds kind, canonical ID, exact version/content digest, actor, time, idempotency key and operation. Current effective release is a rebuildable projection of that evidence. Preserve clinical-review and rights evidence separately.

Validate existence, exact content digest, current review/rights eligibility, object dependencies, admin authority and expected state on the server. Publishing an item and its effective release state/receipt must be atomic within PostgreSQL. The current content_library_review_publish_v1 reviews and publishes an entire import; it cannot be called unchanged from an item button. Add exact candidate-to-canonical mapping and a genuinely scoped item transaction while preserving shared source rights, deduplication and immutable import evidence; a question action must not publish sibling questions or notes. Client retries cannot duplicate or widen a release. Unknown or unsupported kinds fail closed. Keep draft/import objects separate from learner-safe projections.

For first rollout, explicitly seed carry-forward distribution evidence only for the six exact currently published question versions; other full resources default Admin-only. Re-read their IDs, exact content digests, current review hashes, source bindings and recorded eligibility immediately before the cutover transaction. Abort on changed or unknown identity/digest instead of broadly releasing everything with a published flag. Preserve the known issue326 reconciliation warning without treating imported publication history as fresh review evidence. Keep enforcement behind a cutover flag until the explicit seed and rollback are verified, so a failed seed cannot unexpectedly hide every question. Import history marked published remains historical evidence, not an instruction to re-release every child. Do not mutate stored historical attempt receipts to remove or add unrelated teaching resources. Emergency rights/safety withdrawal remains higher precedence than any visibility event; apply equivalent restrictions to old review endpoints.

## Build sequence

1. Inventory every learner/Admin content projection and supported object type; document current grants and baseline counts/IDs. Confirm exact question releases and six-note visibility transition.
2. Add migration, atomic per-item release evidence/contract, exact authority and PostgreSQL tests. Use the established clinical/references/rights gates; no actual human attestations may be generated by the agent.
3. Add authenticated Admin full-library projections and per-item controls/status readback. Reconcile old intake publication so release is not duplicated across surfaces.
4. Apply release filters to every learner path and navigation, preserving question practice, personal annotations and original history.
5. Add canonical-name/ID link inspection and deferred-target handling. Implement only actually supported kinds; cases/graph bundles require explicit resource contracts before activation.
6. Rehearse on disposable data: imports private, one-item release, independent dependencies, rollback/withdrawal, old version history and Admin/learner isolation. Run domain/full checks and real phone/iPad/desktop flows.
7. Deploy backend before frontend, install the explicit current-question releases and hide existing notes only at the approved cutover. Verify anonymous/learner/Admin API behavior and effective release badges. Save a rollback that restores visibility, not erased content or modified scores.

## Acceptance and failure cases

- Import any new question/note/case/graph resource: visible only to Admin until explicitly released; anonymous/learner direct requests fail.
- Exactly the six current question IDs/versions remain playable; attempts, marks and progress remain byte-preserved. Current notes cease learner delivery through direct/search/related routes without being deleted or retired.
- Publish one approved item: only that exact item/version becomes learner-visible; Admin green status appears after persisted readback. New versions or linked targets remain private.
- Insufficient rights/review or stale digest: release fails without partial state. A network timeout/retry returns one release receipt. A non-Admin cannot publish even by invoking the API directly.
- A safety/rights withdrawal takes effect across delivery, saved review and caches without rewriting old scores. Ordinary distribution withdrawal must have an explicit historical-review policy before cutover; conservative default is metadata-only review while hidden.
- Mixed-concept question IDs and concept roles remain unchanged after late note/case import and publication. Ambiguous names cannot attach the wrong concept. Unreleased target payloads and private source documents are never exposed.
- Plain note publication does not invent clinical graph edges; graph publication does not make unreleased notes/cases visible.
- Admin preview and learner mode have distinct server authorization; restoring a bookmark or using an old direct URL cannot bypass release.

## Decisions awaiting owner review

Approve this concrete release model before implementation changes learner access. Default interpretation: question explanations and approved topic labels remain part of questions; the six existing full notes/graph teaching resources become Admin-only until individually released. This document does not claim that that visibility transition has already happened.
