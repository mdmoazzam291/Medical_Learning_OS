# Wider parent-name scope assessment

## Current status after batch 02

Two batches have editorially triaged **200 parent names across 205 source appearances**. There are **1,750 untouched parent names** left in the no-exact-label cohort. These are authoring dispositions, not accepted medical/canonical coverage.

| Batch | Names | Source appearances | Standalone candidates | Scoped facets | Families/contexts | Mixed scope |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | 100 | 103 | 30 | 30 | 37 | 3 |
| 02 | 100 | 102 | 17 | 35 | 42 | 6 |
| Total | 200 | 205 | 47 | 65 | 79 | 9 |

Batch 02 preserves the anaemia task contexts, broad medicine families, anatomical groups, and supervised/simulated procedure boundaries. Its six mixed cases are Applied abdominal anatomy, Applied digestive physiology, Applied pelvic anatomy, Applied respiratory physiology, Applied third-week embryology and Assessment to diet plan. They remain unsplit and scope-incomplete.

Batch 02 records the exact digest of batch 01; their parent-name and source-reference sets do not overlap. Regression tests now exercise numbered-batch exclusion and rejection of a forged predecessor digest. No existing role, home/shared link or name-reuse proposal was changed.

```sh
node ops/nmc/report-parent-scope-assessments.js --batch=02 --verify
```

Next: inspect the next untouched cohort and create batch 03 without overwriting either predecessor. All triaged facets/families/mixed cases still require their indicated decomposition or binding; NMC Foundation remains incomplete.

## Batch 01 record

Batch 01 editorially triages the first 100 remaining index names after excluding the 420 selected compound parents and 57 exact-label reuse leads. All 103 source appearances retain their exact task paths, codes, coordinates, body/task digests and assessment modes. No new teaching content or canonical identities were authored.

| Proposed disposition | Parent names |
| --- | --- |
| Standalone topic candidate | 30 |
| Source-scoped task facet | 30 |
| Broad family/context | 37 |
| Mixed scope retained for decomposition | 3 |

The mixed cases are Abdominal diagnostic modalities, Abuse recognition and Alcohol toxicology. Their task records span distinct modalities or clinical contexts; they have not been forced into a single precise concept. Family/context labels likewise do not assert an individual disease or procedure. These classifications are editorial proposals and may change with deeper source/semantic inspection.

Observation, supervised participation, assistance and simulation remain bound to their exact source-task metadata; performance-and-knowledge is not proof of independent clinical competence. No task wording is copied into the generated packet. All canonical IDs are null, semantic equivalence unverified, and mapping/scope completion false.

The batch preserves original parent labels rather than creating synonym containers. Existing component-name roles, 396 single-home links, two shared groups and 57 reuse proposals remain unchanged. The new cohort is not imported into the live registry or selected component inventory.

The decisions live in `docs/evidence/2026-11-08-nmc-parent-scope-decisions-batch-01.json`; the source-bound projection is `docs/evidence/2026-11-08-nmc-parent-scope-assessments-batch-01.json`.

```sh
node ops/nmc/report-parent-scope-assessments.js --verify
```

The reporter verifies exact deterministic cohort membership, the index digest, source versions and all generated rows/counts. It rejects changed source evidence, forged scope completion and omitted rows with adjusted totals. Later numbered batches exclude the names recorded by earlier batches and pin their projection digests; do not overwrite an earlier batch to advance the cohort.

At the end of batch 01 there were 1,850 untouched parent names; the current count after batch 02 is shown above. The 100 triaged names still need any indicated decomposition, reuse and exact objective/canonical binding; triage is not certified curriculum coverage. Next: inspect the next evidence-bound batch, then reconcile shared/family scope, 21 source exceptions and learner integration. NMC Foundation remains incomplete.
