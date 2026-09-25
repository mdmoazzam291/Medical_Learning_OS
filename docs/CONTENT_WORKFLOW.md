# Canonical content lifecycle (M02)

## Implemented boundary
`src/domain/content.js` validates a version-1 catalog with `concepts`, `sources` and `questions`. It exposes pure functions returning deeply frozen copies. There is no database or review/admin UI yet. `data/content-draft.json` is an original **nonclinical software fixture**, never learner-ready medical content. Review identities in tests are synthetic and only exist in memory.

## Records
| Record | Required fields / constraints |
|---|---|
| Concept | conceptId, label, aliases[], subjectTags[]; ID unique across the catalog; subjects are tags, not separate ownership trees |
| Source | sourceId, title, URL or null, version, rights.status and rights.evidence; statuses unknown/owned/licensed/public_domain |
| Question version | questionId, questionVersionId (`questionId@version`), sequential version, supersedes, authorId, changeReason, stem, options, answerOptionId, explanation, conceptLinks, sourceIds, provenance, status, reviews, publishedAt |
| Concept link | Existing conceptId and primary/secondary/prerequisite/distractor role; exactly one primary assessed concept |
| Provenance | original/ai_generated/recalled_pyq/licensed_pyq; evidence required; PYQs also require exam and year; original/generated questions have null exam/year |
| Review | medical/references/rights kind, reviewerId, reviewedAt, approved/rejected decision, notes; cannot be the author; at most one recorded decision per kind per version |

All records reject missing/extra fields. UTC timestamps use canonical ISO form with milliseconds. A source change receives a new source ID/version; do not mutate an old source record in storage. A future persistence layer must enforce source immutability and authorized reviewer identities/roles; this pure validator cannot establish who actually performed a review.

## Lifecycle
1. `appendQuestionVersion`: starts an initial or sequential revised draft. Existing versions remain; new drafts have no reviews/publication timestamp.
2. `submitForReview`: draft → in_review.
3. `recordReview`: append one decision for each gate. All three approvals yield verified. One rejection blocks progression; create a new corrected draft version and review again. Decisions are not overwritten.
4. `publishQuestion`: verified → published, only with resolved source rights and a timestamp at/after all reviews. A newer published version automatically retires the previous published version of the same question.
5. `retireQuestion`: remove reviewed/verified/published content from eligibility while retaining its content and review history. Retired versions cannot be republished directly. A new version is required.

A new draft does not hide an existing published version. A retired version never resurfaces as a fallback. Only one version per question can be published at a time. Drafts, in-review, verified and retired content are excluded by `selectPublishedQuestions`.

## Consumer contract
Use `validateCatalog` at a trusted import boundary, then `selectPublishedQuestions`. Use `toLearnerQuestion` on the selected validated objects to return only the stem/options/version ID before answer submission. This small projection is not itself an authorization boundary; never expose the full catalog to clients. Future server scoring must load the stored version rather than accept a client answer key or correctness flag.

Learning events continue to reference `questionVersionId` and the primary `conceptId`. M02 adds content identity and eligibility, not a scoring endpoint or persistent ledger. Already-recorded attempts keep their historical version even after retirement.

## Review/update process
For a correction or guideline change: identify source and affected question versions; retire unsafe published versions; append corrected drafts citing the updated source version; request fresh reviews; publish after approval. Update eligibility in storage atomically. The domain functions preserve question content while updating lifecycle metadata; production needs transactional writes and an audit log of actor/operation/timestamp.

Still planned: automated affected-content search, verified clinical content, authenticated reviewers, claim-level citations, graph edges/competencies, jurisdiction/expiry policies, psychometric calibration, exam blueprints, annotation anchors and durable import/export. A “verified” record is a workflow state, not a measured claim of medical accuracy.
