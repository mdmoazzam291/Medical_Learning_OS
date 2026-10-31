# Remaining-subject extraction and prefix register
Checked2026-10-30; official base SHA256 aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c.
Source https://nmc.org.in/rules-regulation-nmc/33/file. Metadata only; no runtime normalization or approval.

## Count observations
Counts below are strict line-start whitespace-tolerant standard dotted-ID extraction, NOT verified complete source rows. Expected counts retain September published summary. PDF ranges are one-based official download.
|Subject|Published|Strict unique candidates|Defining PDF pages|
|---|---:|---:|---|
|Anatomy|413|413|108-148|
|Physiology|136|136|150-160|
|Biochemistry|84|82|162-172|
|Pharmacology|92|92|174-185|
|Pathology|182|181|187-204|
|Microbiology|74|73|206-213|
|Forensic Medicine|158|157|215-234|
|Community Medicine|136|136|269-279|
|Medicine|525|529|281-327|
|Paediatrics|406|253|329-350|
|Psychiatry|17|17|352-354|
|Dermatology|48|48 DR|356-362|
|Surgery|133|132|403-412|
|Ophthalmology|60|59|414-418|
|ENT|63|63|420-425|
|OBGYN|141|142|427-442|
|Orthopaedics|40|39|444-450|
|Anaesthesia|52|51|452-456|
|Radiodiagnosis|21|21 RD|457-459|

Global line-start scans also encounter PY1.1 outside the Physiology defining section (PDF95 and391); those are not extra defining competencies. Exact counts matching published summaries do not establish full verification.

## Prefix evidence
Contents legends on PDF80/81,247/248,376/377 use DE/RT. Dermatology section title on PDF355,printed114 explicitly uses DR;48 defining candidates use DR. Radiodiagnosis opening PDF457,printed87 visibly uses RD1.1 and subsequent RD rows;21 candidates.
Visually inspected PDF355 and457. Proposed edition-specific handling: preserve observed DR/RD source identity, separately record DE/RT as conflicting contents legends. Do not globally rewrite other editions or claim runtime aliases are implemented.

## Malformed-code triage
- Pathology PDF200: text shows PA.29.1 (extra dot before topic number). Candidate intended identity PA29.1; pending visual character review.
- Forensic PDF217: text shows FM2:12. Candidate intended identity FM2.12; pending visual character review.
- Anaesthesia PDF454: text shows ASS.4 between AS5.3/AS5.5 context. Candidate AS5.4 is an interpretation, not verified source spelling; pending visual review.
- Microbiology PDF212: code cell text split/malformed as MI 8. followed by continuation; inspect original cell before assigning MI8.3.
- Biochemistry PDF172: BC and14.24 are separated by source-description text in layout extraction, so a normal code regex misses the row. Do not join unrelated text globally. The separate BC14.1 gap remains unresolved.
- Orthopaedics PDF445: extracted cell OR2. 2.9 yields false OR2.2 under standard regex. Rendered page visibly shows the malformed cell OR2. 2.9; proposed OR2.9 needs explicit anomaly adjudication. This is not established duplicate clinical content. Strict extraction reports OR2.2 twice, one occurrence attributable to this malformed cell.
- Surgery and Ophthalmology one-code differences remain unclassified.

## Limits and next action
Targeted source inspection only, not all-row independent review. No complete code list, source PDF or descriptions committed. No changes to source ledger, runtime validators, denominator targets, clinical/rights approval, exam mappings or learner eligibility.
Next: visually adjudicate malformed cells and remaining BC/SU/OP gaps; produce raw-token plus proposed-normalization records with exact pages and unresolved status, then implement/test narrowly scoped parsing if justified. Apply October PS9.2 deletion and PY9.1/PE6.4 revision separately; audit supplementary requirements and later notices. No full-coverage claim.
