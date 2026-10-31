# Malformed-cell visual adjudication checkpoint
Date2026-10-30. Source: official revised September2024 PDF, SHA256 aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c. Follow-up to NMC_REMAINING_SUBJECT_REGISTER.md.

## Results
Rendered/visually inspected official PDF169,172,200,212,217,454,409,417; prior checkpoint inspected PDF445.
- Biochemistry: PDF169 printed95 shows raw14.1 without BC prefix under topic14; PDF172 printed98 shows BC and14.24 wrapped in one defining code cell. These two physical rows explain strict82 versus published84. All14 topic-header counts sum84. Proposed identities BC14.1/BC14.24 remain independently unreviewed.
- Pathology PDF200 printed126 confirms PA.29.1, proposed PA29.1.
- Forensic PDF217 printed143 confirms FM2:12, proposed FM2.12.
- Microbiology PDF212 printed138 visibly lacks the numeric suffix in MI8.; MI8.3 is inferred from position between8.2 and8.4, not an actually printed full identifier.
- Anaesthesia PDF454 printed84 confirms ASS.4; AS5.4 is context-supported interpretation, not an official erratum.
- Orthopaedics PDF445 printed75 visibly has OR2. 2.9. Correct the earlier receipt's intermediate suggestion of a genuine repeated OR2.2: this cell is malformed and causes the parser's second OR2.2 match. Proposed OR2.9 requires adjudication.
- Surgery PDF409 printed39 visibly jumps SU26.1 toSU26.3 thenSU26.4. Topic26 header says4; three rows observed. No fabricated SU26.2 definition is added.
- Ophthalmology ten topic-header counts sum59 (5+8+7+10+2+4+5+6+5+7), agreeing with59 unique observed IDs. Subject heading on PDF414 says60. This is an aggregate source discrepancy, not a located missing code.

## Durable metadata
docs/evidence/nmc-2024-source-anomalies.json records9 findings with observed tokens, exact PDF/printed pages, proposed identities where meaningful and unresolved review status. It contains no source descriptions or tables. No runtime parser consumes this file. Proposed normalized identities are explicitly not applied.
A source row can be accounted for while its identifier remains uncertain. Do not equate candidate count84 with reviewed Biochemistry completeness or auto-approve other subjects after these repairs.

## Validation and boundaries
Checked all9 anomaly IDs unique; pages in1-467; exact official source hash bound; every record normalizationApplied=false; clinicalApproval/learnerEligible=false. JSON round-trip checked. Runtime tests not rerun: documentation/evidence only, no runtime implementation. Fresh CI remains unverified.
No copied protected descriptions, full code corpus, ledger ingestion, clinical/source-rights approval, exam mapping, merge/deploy or learner activation.
Next: consolidate exact source inventory using distinct raw-row identities and proposed normalized code identities, preserve ambiguous/missing/deleted states, then perform supplement/later-amendment audit and obtain independent adjudication. A general regex rewrite would lose evidence and is not justified by this checkpoint.
