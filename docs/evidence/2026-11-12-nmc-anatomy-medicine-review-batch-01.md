# NMC Anatomy/Medicine review batch 01 — source-bound handoff

Checked 2026-11-12T10:20:06Z. Parent: [PR #415](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/415) at `a8da95296e1a738a90b2a438985420af39ec19c2`. Work saved on separate branch `docs/nmc-am-scope-batch-01-20261112` to avoid competing writes to the active parent draft.

## Completed this checkpoint
- Indexed and provisionally dispositioned exactly **80 distinct Medicine draft names** from two existing 40-row source-linked packets. All 80 appear in the existing 797-name Anatomy/Medicine expansion queue. Retained 80 distinct reference IDs, 80 source-body digests, PDF page and bounding box, draft task, mode and source packet per row.
- Independently crosschecked `GM5.5` and `GM16.6` against the official 12 Sep 2024 NMC CBME competency tables. The other 78 are **source-linked triage only**, not independently verified curriculum interpretations.
- `GM5.5`: cirrhosis and portal hypertension includes complications; retain educational compound scope, do not create one forced medical concept.
- `GM16.6`: clinical distinction between diarrhoea and dysentery; retain as discrimination competency. Predominant domain K/level KH while suggested assessment includes short case/OSCE and viva, so do not infer independent procedural performance.
- All proposed identities and objective bindings remain **null**. No canonical mapping, content publication, production DB write or learner activation.

## Evidence and checks
- [Official NMC compendium — September 2024 curriculum](https://www.nmc.org.in/MCIRest/open/getDocument?path=%2FDocuments%2FPublic%2FPortal%2FE_Compendium_of_NMC_2024%2F10.+Curriculum.pdf). PDF mirrors/repackaging are not proof of exact bytes matching the parent source digest.
- Parent source-hash audit: `docs/evidence/2026-11-12-nmc-anatomy-medicine-source-hash-audit.json` reports 944/944 rows verified across 797 names and 103 pages; no independent fresh source-hash rebuild was run in this checkpoint.
- Crosschecked packet membership: 80/80 names in frozen queue, no duplicate name keys/references, source SHA consistent between both 40-row packets and queue.
- Full repository tests, UI CI, hosted source readback and authenticated staging **not run** in this checkpoint.

## Exact next action
1. Check each of the other 78 records against its actual official source row and existing identity scope. Upgrade only evidence-supported dispositions, preserve assessment modes and reference provenance.
2. Process the next 60–100 Anatomy/Medicine names, preferably sorted by unresolved semantic ambiguity rather than by code alone.
3. Carry 12 accepted-identity preview candidates and all 21 exception cases separately. Do not infer acceptance from names-only triage.
4. Revalidate against the latest parent PR #415 head before merging or applying the batch. No automatic merging.

## Reconciliation
Parent audit baseline: 2,427 indexed names, 121 preview labels, 81 exact matches, 2,346 not exact-matched; Anatomy 401 + Medicine 396 = 797, other subjects 1,549. This 80-row packet is not a claim that the remaining 2,346 has been reduced by 80.
