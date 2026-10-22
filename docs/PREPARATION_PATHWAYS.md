# Preparation pathways over canonical knowledge

Owner-approved direction: NEET-PG + INI-CET first, other exams later. This extends the existing Library, Study Now and Account; no duplicate catalog, exam database or learner history.

## Current behavior

Account → Preparation goals offers NEET-PG, INI-CET or Both, plus a primary goal. No existing learner is silently assigned a goal. A narrow Auth adapter stores `mlos_preparation_profile` as learner-editable account metadata; reads/saves verify the returned identity and validate only the application contract. Other metadata is neither copied nor exposed. This preference is never used for authorization, review, entitlements or exam eligibility. Existing Auth export/erasure carries the preference; changing the Auth provider must migrate it through the same application schema. No new data store or service.

Library → Content scope offers For my goals, Needed foundations, Explore all knowledge. Notes, Questions, Overview, Graph, Subjects and saved bookmarks use the same scope. Concept identity, scope and meaningful filters survive view changes, Back/Forward and reload. Explore all keeps published material with missing mappings accessible. Drafts and unpublished answers are never added to this projection.

Study Now scopes only NEW plans using the same trusted registry and current authenticated preference. An existing session resumes before applying a changed goal. The normal due-then-new policy creates one queue across selected goals; each exact question appears once. Goal changes never delete old revision rows, attempts, notes or exam runs. Explicit Library practice and existing due/history tools remain available for intentional work outside the selected focus. Primary goal is retained as planning context; no unvalidated primary-goal weighting or score prediction is introduced.

The scope does not change simulator presets, timings, scoring, eligibility or pinned run snapshots. Active *preparation* identities do not imply simulator readiness. Real historical occurrences stay separate from suitability, and PYQ-first exclusive homes are unchanged.

## One versioned registry

`data/preparation-curriculum.js` is the only initial curriculum registry. It contains two active preparation identities and **zero clinical objectives, requirement mappings and artifact bindings**. No official syllabus completeness, future supported exam, fabricated review evidence or medical content is claimed. The empty initial state is intentional: content ingestion must not silently invent curricula.

`src/domain/preparation-pathways.js` validates and resolves:

| Record | Required meaning |
|---|---|
| Pathway | Stable ID, exact pathway-version ID, label, active/planned/retired |
| Objective | Stable ID, exact objective-version ID, canonical concept, observable task, depth, jurisdiction/population/setting, prerequisite-version IDs |
| Requirement mapping | Unique mapping ID, exact pathway/objective versions, draft/approved/retired, source ID/version, official/expert/historical evidence kind, accountable reviewer |
| Artifact binding | Exact artifact version, objective versions, teaching/assessment role, review state/reviewer, optional question-family ID |
| Preparation profile | Schema version, selected active pathway IDs, primary selected pathway ID |

Duplicate/ambiguous identities, broken references and prerequisite cycles fail validation. Only approved requirements and bindings qualify material. Current renderers count available exact published question/note versions; reserved media/case kinds require their own availability/runtimes before being counted. A replacement note/question version does not inherit an old binding. Question origin or a shared subject never grants suitability automatically.

Combined preparation unions direct objectives and their transitive prerequisites. Coverage remains separate per exam: mapped objectives, teaching availability, assessment availability, missing objectives and assessment-family count. An unmapped requirement set has unknown coverage, not 100%. Inventory does not establish mastery, adequate sampling, blueprint completeness or exam readiness.

## Adding reviewed curricula

1. Verify official requirements for the intended exam/component/session. Keep expert interpretation and historical evidence labeled separately.
2. Reuse canonical concepts and objectives where capability/task/context/depth are genuinely shared; create exact new objective versions for changed requirements. Add deeper specialist objectives without replacing foundational history.
3. Add mappings with source/version and real accountable review; never fabricate a reviewer. Proposed records remain draft and cannot affect recommendations.
4. After normal human publication, bind exact published note/question versions to the relevant objective versions. Teaching and assessment are independent roles. Keep question families, provenance and PYQ occurrences distinct.
5. Test real publication/readback, gaps and exact-version behavior before release. The Content Placement Inspector explicitly flags preparation mappings as unresolved in manifest-only drafts; this first foundation does not add curriculum-editing or medical-approval authority to import payloads.
6. Increment registry/pathway/objective versions as needed; retain historical records in Git and pinned recommendation receipts. Deploy the same registry version with the Library and Study APIs so their projections agree.

New pathways start planned and remain absent from learner choices. Activate only after requirements, reviewed content, assessment/runtime and acceptance exist. FMGE, USMLE components, PLAB/MLA and superspecialty additions may need new contexts, objective depths and non-MCQ runtimes; they are not exposed or implemented now. A new pathway is not promised as a configuration-only change.

## Compatibility and release

Older Library APIs show existing published content and an honest focus-unavailable message. Missing preference retains the original unscoped Study Now behavior. Invalid preferences never grant authority and produce an update-needed focus state, with Explore all accessible. A selected but unmapped goal produces no unrelated new Study Now recommendation and points the learner to coverage/exploration. No erased content is restored.

Frontend assets, `content-library-api` and `study-api` require coordinated normal deployment for full behavior. Source/PR checks are not a production rollout or authenticated live acceptance. No SQL migration is required. The small public curriculum contains reviewed structural metadata only; do not store private review evidence or answer keys in it. Large-scale curriculum indexing/server pagination and a protected curriculum-authoring workflow remain future work.

Acceptance combines pure behavioral tests, authenticated API-handler tests, adapter isolation/failure tests and responsive synthetic Chromium/WebKit journeys. Synthetic fixtures are not published medical content or observed learner results.
