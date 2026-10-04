# First replacement batch after the permanent reset

Owner authorized organizing the replacement batch, 2026-10-04. This is a batch plan, not clinical content, an import manifest or publication approval. New uploads are required; erased fixtures must not be reused.

## Scope and purpose

Start with 12 distinct questions and 3 connected canonical notes in one coherent system. Respiratory medicine is the default: asthma, COPD and pneumonia. The owner may substitute another system in the upload. Use relevant Medicine/Physiology/Pathology/Pharmacology/Microbiology/Pediatrics subject views; do not force a concept into all 19 subjects. Exact mechanisms, drugs and findings receive separate canonical IDs when needed instead of being collapsed into a disease.

For each disease/concept, aim for four genuinely distinct decisions:

| Slot | Pattern keyword | Required connection |
|---|---|---|
| 1 | diagnosis | Clinical discrimination and relevant differential note section |
| 2 | investigation-of-choice | Investigation section; distinguish first investigation from confirmation |
| 3 | next-best-step | Sequence/context-specific decision and its prerequisites |
| 4 | definitive-treatment or initial-treatment | Use the actual task in the uploaded stem; do not force a treatment category |

If the uploaded material does not contain these patterns, preserve its real pattern and record missing coverage. The counts above are intake targets, never fabricated question inventory. A disease note may assemble canonical mechanism/drug blocks without copying them into several subjects.

## Upload declarations

For each source bundle, supply: PYQ or platform/original; exam/year/session when PYQ; platform/course/edition when platform; book/title/edition/pages or source URL; question stem/options/correct answer/explanation where available; proposed keywords. Missing answers, provenance or references remain unresolved until supplied or grounded. User-declared PYQ origin is not independent verification.

Keywords use classification.tasks with stable IDs: diagnosis, next-best-step, definitive-treatment, initial-treatment, investigation-of-choice, gold-standard, drug-of-choice, most-common, mechanism, except, or another explicit task. Preserve other classification facets and exact source references. Keywords are decision-pattern metadata, not diseases or proof of exam recurrence.

## Deduplication checks with supplied material only

Include supported additional occurrences if the upload actually contains them:
- One same PYQ in two years → one question, two occurrences.
- Same approved PYQ also in a coaching Qbank → PYQ home only; retain platform provenance.
- Same non-PYQ in Marrow and PrepLadder → one Marrow home; retain both sources.
- Reordered options → reuse identity after answer-text mapping.
- Similar disease, different clinical decision → distinct questions.
- Conflicting correct answer or changed clinical details → review conflict, no silent merge.

Do not fabricate extra source occurrences to satisfy these checks. Synthetic browser/domain fixtures already verify these behaviors without polluting the live library.

## Connected views and acceptance

1. Connected repository agent extracts a schema-v1 manifest under content/inbox, validates it and submits it through the normal repository workflow.
2. Admin sees an immutable draft receipt with new/duplicate/conflict counts. Failed intake is distinct from an empty inbox.
3. Admin inspects source permission, exact question/notes and links, then submits Review & publish once. No agent submits a human attestation.
4. Learner sees identical unique-question counts in Notes and Graph. Concept selection shows assessed, secondary, prerequisite and explicit confusing relationships. Similarity is advisory, never a proven misconception.
5. PYQ/platform, subject/system/organ and keyword filters intersect. Keyword counts decrease from most frequent unique questions; repeated years do not inflate counts.
6. Filtered Study starts the same IDs, scoring/persistence works, and only genuine learner answers change graph colors. Do not generate test learner history in production.
7. Re-uploading the unchanged import returns the same receipt; altered content needs a new import ID. Unpublished content/answers do not leak into learner projections.

Success: one genuine upload → one inspected admin publication → coherent Notes/Graph/search/Study flow on phone/tablet/desktop. Only then expand system coverage. Private question-only imports remain roadmap-only.
