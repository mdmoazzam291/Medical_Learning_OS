# Reusable NMC Foundation views

Status: proposed architecture for Medretica. Draft PR #415.

## Records with independent lifecycles

| Record | What it owns | What can change independently |
| --- | --- | --- |
| NMC source reference | Edition, competency code, original subject and topic, exact PDF locator and provenance | A subsequent edition creates its own references and explicit mappings |
| Canonical concept | Stable application ID and distinct meaning | Display label, aliases, and reviewed classification can change without rekeying |
| Learning objective | An assessable action and its scope | Objective versions and reviewed links to one or more source references |
| Content | Its own stable identity and versions, including notes, cases and questions | Wording, publication state, and reviewed relationships to concepts and objectives |
| Learning evidence | Attempt or observation, timestamp and exact assessed version | Derived progress can be rebuilt by applying current views to compatible evidence |

Reuse the existing canonical concept, content and classification contracts. Keep NMC evidence and concept identity independently addressable. A competency can map to several objectives, and one objective can meet parts of several competencies. Topic headings organize the curriculum. They do not automatically create medical concepts. Apply edition changes through mappings and maintain the history of each decision.

## Views are saved queries and sequences

Keep the 19-subject NMC view as the default entry. It presents the original topic order and links from each competency to its objectives and concept pages. Integrated View groups the same concepts by system, with optional organ filters and a cross-cutting section. Basics uses an ordered list of reviewed prerequisite objectives for the selected subject or system. A future presentation view can start from a symptom and navigate through reviewed relationships. Views carry navigation context, filters and order. Concept URLs and progress use the underlying IDs.

## One home per distinct meaning

A concept page gathers relevant reviewed material through explicit relationships. Distinguish directly taught or assessed, prerequisite, comparison and associated content. Subject and organ tags make material discoverable. Shared tags alone do not make two items clinically related. Show a subject section only where meaningful material exists. Keep a missing mapped requirement visible in curriculum coverage, separate from the concept page's learning sections.

For example, a COPD page can gather linked airflow physiology, diagnostic spirometry, maintenance care and exacerbation cases. A spirometry concept can have its own canonical page and also appear on an asthma page. A relevant note or case can appear through several paths. Deduplicate the assembled list by content ID and retain the reasons and provenance for the links. A PYQ is one canonical question with separate verified exam and session occurrences. Preserve the existing exclusive PYQ and coaching QBank homes.

## Changes without recreation

- Rename a concept or move it in a view by changing labels, aliases, classification or navigation order. Preserve its stable ID and links.
- Add a system, presentation or exam view by defining a projection over existing IDs and reviewed mappings.
- Merge a confirmed duplicate through an audited redirect. Preserve old links and attempt records. Reconcile derived counts explicitly.
- Split a concept when the distinction changes what learners must understand or do. Create distinct identities where warranted. Review affected mappings and keep ambiguous historical evidence on its original target until it can be attributed.
- Separate recognition of repeated questions, independent performance on unseen cases and observed skills. A new view can present the same evidence without treating these as interchangeable.

## First implementation slice

Use the Respiratory proposals for suspected COPD spirometry, asthma maintenance and COPD exacerbation management. Begin with reviewed identities and explicit mappings. Verify that Subject, System and Search routes resolve to the same stable concept ID. Verify deduplication across multiple link paths, shared attempt history, an optional organ filter, and omission of sections with no applicable material. In fixtures, rename and reclassify an identity and confirm its links and attempts still resolve. Confirm that the official curriculum path still shows pending and unmapped objectives. Keep review and learner activation as independent gates.
