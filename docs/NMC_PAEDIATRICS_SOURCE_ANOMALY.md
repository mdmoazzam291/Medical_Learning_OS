# Paediatrics source anomaly receipt
Checked: 2026-10-30T11:07:37Z (16:37 IST). Status: unresolved source discrepancy; metadata investigation only.

## Source and method
Institutional mirror: https://medicaleducationucms.weebly.com/uploads/1/2/6/3/126364586/document__8__merged.pdf
Actual SHA-256: 9bb9e28bd33f0bb6c00ee04bce8095da9f61086f0b2f917ded6daefc16d41db4; 4,774,093 bytes; 466 pages.
Re-downloaded bytes match the prior mirror receipt. This does not authenticate official-file equivalence.

Read local pdftotext -layout output using whitespace-tolerant PE code matching. Rendered all 22 Paediatrics defining-table pages (PDF328-349, printed88-109) into three contact sheets and inspected them. Separately inspected full-page rendered PDF349, PDF350 (Psychiatry transition) and PDF258 (volume summary). This is AI-assisted inspection, not independent human review or full-resolution verification of every character.

## Finding
The subject summary and Paediatrics opening heading declare 35 topics / 406 competencies. The observed defining section runs through topic32 and PE32.1, then immediately transitions to Psychiatry at PDF350 (printed110).
The section yields 253 distinct code candidates, each appearing once under the whitespace-tolerant matcher; observed topic IDs span 1-32. Per-topic observed row counts sum to253:
3,3,4,2,4,12,8,5,7,6,4,8,4,3,4,6,1,14,17,9,5,11,21,23,6,17,14,5,5,7,14,1.
Per-page candidate counts:
PDF328-335: 5,12,14,14,12,11,12,10.
PDF336-343: 12,12,12,13,10,13,12,12.
PDF344-349: 9,13,12,11,13,9.
Both independent aggregations sum to253.
A stricter matcher without internal whitespace yields252, missing a split token in topic23. The whitespace-tolerant result reproduces the previous253, so this formatting detail does not explain the153-count gap.

## Interpretation and unresolved questions
This is an internal inconsistency in the inspected mirror: visible defining-section extent and extracted rows disagree with its headline. It is not proof that153 real competencies are missing from the official curriculum. Potential explanations include stale headline counts, missing/revised source content or compilation differences. Do not fabricate topics33-35, fill code sequences or change the406 denominator to253 to make the audit pass.
Recover official revised September2024 volumes and October clarification, compare Paediatrics boundaries and headings with this mirror, and resolve through source-supported review. Preserve both published406 and observed253 as distinct evidence until then.

## Boundaries and next actions
No competency ledger rows, approval states, exam mappings or learner recommendations changed. Existing citation_only handling retained; no PDF, protected descriptions, table reproduction or bulk code list committed.
Next: official-source comparison; GM529/525 and OG142/141 defining-row versus cross-reference reconciliation; then remaining subject prefixes/counts and supplementary inventory. Independent review remains pending. This receipt completes the mirror-section investigation, not the Paediatrics completeness gate.
