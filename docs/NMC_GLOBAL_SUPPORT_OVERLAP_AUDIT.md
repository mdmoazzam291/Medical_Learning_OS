# Global goals and supplementary overlap audit

3 November 2026. Package #2 selected mechanical investigation; source/semantic acceptance remains pending.

## Source-bound goal appearances

The pinned 467-page NMC source now yields 427 explicit goal appearances with exact page/character spans, marker hashes, body hashes and whitespace-only comparison fingerprints. Fourteen appearances cross pages. Source folios and their blank header whitespace are excluded with original character offsets retained; numbered section headings are excluded from preceding goals.

| Source scope | Appearances |
|---|---:|
| National goals: opening plus three volume copies | 20 |
| Institutional goals: opening plus three volume copies | 45 |
| Nested institutional items retained within their parents | 32 |
| Subject goals across the existing 19-subject scaffold | 185 |
| Opening global bullets across seven roles | 40 |
| Numbered global items across three volume copies | 105 |
| Total explicit source appearances | 427 |

This is not 427 unique requirements. Nested bodies remain included in parent bodies; repeated volumes remain source appearances. All 185 subject markers and first-body pages are checked against the existing goal locator manifest. Each volume's 35 global marker identities are checked against the existing framework manifest.

Whitespace-only comparison produces 275 fingerprints, including 59 groups with repeated appearances. Neither number is an accepted competency denominator. Punctuation, hyphenation, spelling and medical words are not normalised or synonym-matched. Non-matches therefore do not prove that requirements are different. Exact text identity does not by itself establish a valid learner mapping, scope or independent outcome.

Six candidate compound relationships bind the two previously identified combined opening bullets to pairs of numbered items in each of the three volumes. The volume-II institutional k/l fragment remains a two-appearance candidate join. No semantic equivalence or logical merge is approved. Compound paragraphs remain intact; atomic medical actions have not been exhaustively semantically enumerated.

## Supplementary evidence

All ten existing supplementary PDF source hashes were checked against the pinned catalog. Availability/hash parity is not clinical review, current-cohort applicability or reuse rights.

All 45 selected Skills 2019 reference spans were reverified against the actual source. Thirty-two have literal whitespace-collapsed identifier matches among observed 2024 defining cells; thirteen are unmatched. Candidate links retain source appearance and base-region IDs, including repeated source regions where present. No DE/DR, RT/RD or other aliases are applied, and no legacy reference becomes a universal additional competency. Same identifiers across editions do not prove unchanged medical meaning. This comparison is limited to the selected Skills samples and observed base identifiers.

The existing AETCOM module/appendix formatting comparison was rebuilt from the pinned PDF and matched exactly: 44 module appearances, 30 formatting matches and 14 unmatched appearances. Earlier variant proposals and the core/non-core conflict remain pending. Other existing supplementary evidence is bound rather than silently reinterpreted: examples, policies, faculty/institution guidance, templates and timing observations are not unioned into a new learner competency count. Full supplementary-content semantic enumeration is still incomplete.

## Reproduce

```sh
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -q
python3 ops/nmc/goal_overlap.py /private/nmc-official.pdf /private/nmc-supplements --verify docs/evidence/nmc-global-support-overlap-investigation-v1.json
```

The CLI first rebuild-verifies the frozen defining-region inventory and full-body audit, then reconstructs the goal spans, supplementary source hashes, Skills links and AETCOM comparison. PyMuPDF 1.26.6 is required. No source prose, PDF, image, OCR or full defining-code corpus is committed.

## Completion boundary and #3 handoff

The selected mechanical goal-body/literal-overlap investigation is complete and independently engineering-reviewed. Package #2's full semantic/source acceptance is not complete: compound action interpretation, complete supplementary enumeration, accepted overlap and applicable cohort versions remain unresolved. Its acceptance flag and the original twelve-package register remain unchanged. These limitations must not be converted into a completeness percentage.

Package #3 (source versions, newer notices and cohort applicability) is independently executable under the existing dependency graph and is now the active engineering task. Applicability must be resolved before legacy supplementary material can be treated as current learner requirements. Carry the unmatched references, combined clauses, institutional fragment and source-row exceptions forward; do not restart verified source enumeration without changed evidence.
