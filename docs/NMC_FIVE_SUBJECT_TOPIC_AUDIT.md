# Five-subject official-source topic audit — 3 November 2026

AI source investigation, not an independent human source/clinical/rights/exam approval. Reproducible script: `ops/nmc/topic_count_audit.py`. Metadata receipt: `docs/evidence/nmc-five-subject-topic-count-audit-v1.json`.

## Evidence and findings

The script reads the exact official 467-page base PDF (SHA-256 aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c) and hash-pinned v1 region inventory. Across 100 defining pages of the five discrepant subjects it reconstructs and verifies all 1,118 identifier-appearance raw-cell digests against the original PDF. Source descriptions, full identifiers and PDF/rendered bytes are not exported. The subject-summary values below are retained from the existing audit, rather than newly parsed by this script.

| Subject | Published summary | Observed appearances | Distinct raw-cell fingerprints | Topic evidence |
|---|---:|---:|---:|---|
| Medicine | 525 | 532 | 529 | 29 numbered header counts sum to 531; Topic 8 is 19 vs 18 fingerprints, Topic 9 is 21 vs 17, Topic 27 is 15 vs 18 |
| Paediatrics | 406 | 253 | 253 | 32 numbered headers found; 31 closed counts sum to 248, Topic 21 count is malformed and remains null; its observed fingerprint count is 5 |
| OBGYN | 141 | 142 | 142 | 37 numbered header counts sum to 140; one unnumbered header declares 2; no numbered Topic 22 header located |
| Surgery | 133 | 132 | 132 | 28 numbered header counts sum to 122; Topic 26 is 4 vs 3; no numbered Topic 24 or 27 headers located by the method |
| Ophthalmology | 60 | 59 | 59 | All ten topic-header counts match observed topic fingerprints and sum to 59 |

Distinct hashes are method-specific raw-cell fingerprints, not adjudicated canonical competency counts. Missing numbered headers do not mean missing clinical rows: observed Topic 24/27 Surgery and Topic 22 OBGYN rows remain retained. The unnumbered OBGYN header is preserved without assigning it a topic identity; 140 + 2 = 142 is a separate arithmetic observation. For Paediatrics, 248 is a partial sum excluding the malformed count, not a new subject denominator. No substitution of 5 for that malformed printed count is made.

Official page 409 was visually inspected: Topic 26 declares four and visibly presents three labelled rows before Topic 27-labelled rows continue. Official page 414 was visually inspected for the Ophthalmology subject heading and initial topic headers. Official page 339 was visually inspected: the Topic 21 count does not form a closed parenthesized count. These are targeted AI inspections; all 100 source pages were not visually reviewed. Numbered-header absence in the script is not independently certified visual absence.

## Reproduce and verification

```sh
python3 ops/nmc/topic_count_audit.py /private/nmc-official.pdf /private/topic-counts.json
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

Requires pinned PyMuPDF 1.26.6 only for actual-source extraction; pure Python tests need no PDF dependency. Header parsing handles joined topic numbers, optional colon placement and wrapped/space-free count labels. It retains malformed/unnumbered cases, refuses duplicate numbered topic headers, and stops count search at the first defining identifier or next topic heading. The latter boundaries are candidate text-extraction assumptions, not proof of exhaustive header recognition.

Two actual runs and an independent engineering rerun are byte-identical: 43,833 bytes, SHA-256 60516bfb17e9f035531f5f161da7ab56f2cf19196b42c10ee13a5c097d016e6a. All 38 NMC tests pass, including six header-parser tests; repository check passes (13 services, 250 coupling locations). Independent review reports no actionable findings. Fresh hosted CI for this implementation is not yet verified.

Earlier PR #382 source commit 5c8d66bd7c0f511bf4168a6b2cc45f3fb274eff3 now has all three jobs green in CI run 41522409052. PR #383 package implementation remains separately under CI. Those results do not certify this follow-up source.

## Consequences

This investigation narrows the five discrepancies without inventing identifiers, definitions, corrected publisher totals or approvals. Existing case decisions, frozen package, candidate inventory and learner registry remain unchanged. All eligibility flags stay false. Supplementary/global requirements, edition/cohort applicability, later amendments, 67 legacy category differences and source/clinical/rights/exam decisions remain unresolved. No complete-coverage or production-release claim.
