# Spinal cord NMC mapping pilot — 4 November 2026

Source edition: 12 September 2024, pinned PDF SHA-256 `aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c`. The source rows were inspected using the existing rotated row-region reconstruction. These are candidate objectives for concept intake. Each row remains pending source-alignment review.

| Reference | Page | Original draft learning task | Concept and coverage disposition |
| --- | ---: | --- | --- |
| AN57.1 | 140 | Orient a spinal cord specimen and identify its external landmarks. | Candidate: spinal cord external anatomy. Needs a practical identification artifact. |
| AN57.2 | 140 | Compare the lower extent of the cord at two ages on labelled diagrams and explain one implication of the difference. | Candidate: spinal cord extent and termination. Needs separate age context and clinical application. |
| AN57.3 | 141 | Sketch and label mid-cervical and mid-thoracic cord sections, then identify features that distinguish them. | Candidate: spinal cord sectional anatomy. Needs a drawing and labelling task. |
| AN57.4 | 141 | List the main ascending and descending pathways represented at mid-thoracic level and sort them by direction. | Candidate: spinal cord pathways. Use one shared identity across Anatomy and Physiology where scope matches. |
| AN57.5 | 141 | Use the existing Brown-Sequard localization objective for the hemicord example. | Partial proposed coverage. The row names several additional grey- and white-matter disorders that need separate objectives. |
| PY10.10 | 158 | Use the same Brown-Sequard localization objective for the hemisection example. | Partial proposed coverage. Complete and incomplete transection patterns require additional coverage. |

Candidate names are review labels. No catalogue IDs have been allocated in this packet. The live NMC pack retains its single proposed objective. Each new canonical identity needs a catalogue lookup and scope review before creating a source binding.

| Reference | Reconstructed row SHA-256 |
| --- | --- |
| AN57.1 | `88c1f736c95af01b2e0f8b974e90297b4be99cbfc5cf2e35980b52f2808a880a` |
| AN57.2 | `0040a5f10e4b131222931743b90bfd7ded8cb296ed290ecd3966ecd707ac7390` |
| AN57.3 | `053f35153e54dff65cefd628a51ff3cde43d07a63f4bacc2dc619578e8d9a481` |
| AN57.4 | `c2fa91d368ecb576c484d6f3943d96a157afc607a1b9bc57d266050a20637193` |
| AN57.5 | `50b901195e93c68aa2412d752f98e8b78f0662483bf346ca57c56012d00dd887` |
| PY10.10 | `56693cca483516cc1eccdd7a4e094ebf1a657a1aa022166a8abf09a8c80cfe3f` |

## Foundation baseline

Run `node ops/nmc/report-foundation-coverage.js` from the repository. On pack @3 it reports 2,634 source appearances across 19 subjects, with two proposals, 21 source exceptions and 2,611 standard appearances without a proposal. Zero approved mappings. An appearance with a proposal can have uncovered tasks, as both linked rows demonstrate. The catalogue covers the pinned core reference scope. Supplementary or amended curricula require separate source disposition before claiming complete NMC coverage.

Next batch: review the four candidate identities and split the remaining tasks in AN57.5 and PY10.10. Continue by subject and retain practical or skill-based assessment requirements as distinct tasks. PYQ intake remains deferred.

## Catalogue identity check and intake packet

Live catalogue v448 contained Brown-Sequard syndrome with the aliases Brown Sequard syndrome and Hemicord syndrome. The thirteen candidate labels have no match in that catalogue. The accompanying JSON contains thirteen validated create-draft payloads and original tasks: four for AN57.1–AN57.4, seven for the remaining named items in AN57.5, and two for the complete and incomplete transection tasks in PY10.10. The existing Brown-Sequard objective remains shared by both references.

Review classification and scope before accepting any identity. In particular, confirm how the source groups ALS under the motor neuron disease item, retain paraplegia as a presentation, and check whether complete and incomplete transection should be separate concept identities or objective variants under one concept. Keep the hemisection objective linked to the existing identity. No new IDs or review decisions are asserted here.

Owner /root. PR414, branch feat/nmc-spinal-cord-pilot-20261104, stacked on PR413. Verified the live identity inventory and ran the existing concept-draft validator for all thirteen payloads. Next action: stage the candidate payloads through the authenticated Admin intake workflow after identity review and reuse accepted IDs when creating objective bindings.
