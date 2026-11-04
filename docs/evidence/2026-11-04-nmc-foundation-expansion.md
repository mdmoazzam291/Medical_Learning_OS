# NMC foundation expansion checkpoint — 4 November 2026

Owner /root. Branch feat/nmc-foundation-review-queue-20261104, based on main 763e9db006cd167dde2a88c1f4b9eed5d630cfb5. The live Admin preview at the start of this work is pack @4 with 16 draft objectives and 17 proposed links across eight reference appearances.

## Source accounting

Reconstructed the entire pinned core catalogue from the 12 September 2024 PDF and frozen region inventory. The regenerated catalogue matched the checked-in catalogue. The review queue adds an exact locator and a reconstructed row digest to each of 2,634 appearances across 19 subjects. All existing proposed links matched their row evidence. The output contains metadata and hashes only.

```sh
python ops/nmc/build_foundation_review_queue.py /path/to/pinned.pdf \
  --inventory /path/to/nmc-row-region-inventory-v1.json \
  --output /tmp/nmc-foundation-review-queue.json
```

The PDF and inventory are pinned by the existing catalogue builder. The queue is derived from the pack and is intended as a local review aid. Its states do not mark approved mappings. Supplementary programmes and cohort applicability have separate source records.

## Draft tasks prepared

- `2026-11-04-nmc-anatomy-opening-draft-tasks.json` covers all 35 source appearances in AN1–AN7, including five with a performance component.
- `2026-11-04-nmc-neurophysiology-draft-tasks.json` adds 19 drafts for PY10.1–PY10.20. PY10.10 stays in the spinal cord pilot. PY10.7 and PY10.9 add the sensory and motor application components to the existing pathway proposals. PY10.19 and PY10.20 preserve observed examination performance as the assessment mode.

The 54 new tasks touch 52 previously unproposed appearances and two appearances with existing partial proposals. Across the pinned scope, eight appearances have app proposals, 52 additional appearances have offline draft tasks, 2,553 have neither and 21 need source resolution. Accepted source mappings remain zero. These figures are a workload ledger. They cannot establish a unique competency denominator or full task coverage.

Review labels are candidate scopes. The batch needs identity matching before canonical IDs are allocated. AN5.8 needs separate pathology identities for the named processes. AN7.1 and PY10.1/2 should be checked together for shared organization scopes. AN7.7 and PY10.4 should share a synapse identity where their scope matches. Performance drafts require an observed assessment and rubric. Combined rows can require multiple objectives.

## Next action

Review the identity scopes and split compound rows, then submit supported identities through Admin intake and bind objectives to exact acceptance receipts. Continue Anatomy from AN8 and extend Physiology alongside it. Track the 21 source exceptions separately, then reconcile amendments, supplementary requirements and cohort scope. Completion requires reviewed dispositions for the full intended scope, with partial rows kept open. PYQ intake stays deferred.

Verification: queue generator executed against the pinned PDF and reproduced all 2,634 rows. Both task packets were checked for exact source-row membership, unique codes within each batch and preserved performance tasks. No live records were written. Hosted checks are pending.
