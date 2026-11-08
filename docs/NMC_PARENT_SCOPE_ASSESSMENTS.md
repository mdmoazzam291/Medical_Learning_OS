# Wider parent-name scope assessment

Eight batches have editorially triaged **1,400 parent names across 1,509 source appearances**. There are **550 untouched parent names** left in the no-exact-label cohort. These are authoring dispositions, not accepted medical/canonical coverage.

| Batch | Names | Source appearances | Standalone candidates | Scoped facets | Families/contexts | Mixed scope |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | 100 | 103 | 30 | 30 | 37 | 3 |
| 02 | 100 | 102 | 17 | 35 | 42 | 6 |
| 03 | 200 | 206 | 51 | 81 | 60 | 8 |
| 04 | 200 | 202 | 55 | 77 | 59 | 9 |
| 05 | 200 | 223 | 57 | 65 | 71 | 7 |
| 06 | 200 | 238 | 48 | 81 | 69 | 2 |
| 07 | 200 | 204 | 50 | 66 | 79 | 5 |
| 08 | 200 | 231 | 58 | 64 | 67 | 11 |
| Total | 1,400 | 1,509 | 366 | 499 | 484 | 51 |

Batch 08 runs from National programme for older adults through Peripheral IV catheter. Its 11 mixed cases are Neonatal surgical conditions, Normal radiographs, Obstetric haemorrhage simulation, Obstetric procedures, Obstructive airway diseases, Operative obstetrics practice, Organ function panels, Orthopaedic infection procedures, Paediatric imaging integration, Pathology terminology and Perinatal forensic assessment. All prior mixed cases remain open.

Obstructive airway diseases retains 26 separate task records. The two GM14.2 obesity-aetiology appearances retain distinct source references even though their task text matches; they are not counted as two demonstrated competencies. Neonatal and paediatric resuscitation, assigned assistance and performed skills remain source-specific. Patient preparation retains its imaging context, and overlapping peripheral-IV labels are not automatically merged into accepted identities.

Family/context labels do not assert a single disease, medicine or procedure. Observation, supervised participation, assistance and simulation remain bound to their exact task references and modes, and do not prove independent clinical competence. No task prose or teaching content is copied into the generated packets. All canonical IDs are null, semantic equivalence unverified, and mapping/scope completion false.

The original parent labels are retained without creating synonym containers. Existing component-name roles, 396 single-home links, two shared groups and 57 reuse proposals remain unchanged. The new cohorts have not been imported into the live registry or selected component inventory.

Each numbered decisions file has a corresponding source-bound assessment projection under `docs/evidence/2026-11-08-nmc-parent-scope-*-batch-NN.json`.

```sh
node ops/nmc/report-parent-scope-assessments.js --verify
node ops/nmc/report-parent-scope-assessments.js --batch=02 --verify
node ops/nmc/report-parent-scope-assessments.js --batch=03 --verify
node ops/nmc/report-parent-scope-assessments.js --batch=04 --verify
node ops/nmc/report-parent-scope-assessments.js --batch=05 --verify
node ops/nmc/report-parent-scope-assessments.js --batch=06 --verify
node ops/nmc/report-parent-scope-assessments.js --batch=07 --verify
node ops/nmc/report-parent-scope-assessments.js --batch=08 --verify
```

The reporter verifies deterministic cohort membership, index digests, source versions and all generated rows/counts. It rejects changed source evidence, forged scope completion and omitted rows with adjusted totals. Later batches exclude names recorded by predecessors and pin their exact projection digests. The eight actual cohorts have disjoint names and source references; their source-task paths, codes, coordinates, body/task hashes and modes are retained.

Next: inspect the next untouched cohort and create batch 09 without rewriting predecessors. The 1,400 triaged names still need their indicated decomposition, semantic reuse and objective/canonical binding; triage is not certified curriculum coverage. All 51 mixed cases remain open. Shared/family target scope, 21 source exceptions and learner integration also remain unfinished. NMC Foundation is incomplete.
