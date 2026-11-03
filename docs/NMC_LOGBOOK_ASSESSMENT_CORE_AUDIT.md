# Selected logbook and assessment source observations

3 November 2026. AI source observations; selected scope, not an exhaustive audit of both booklets or acceptance of current regulations.

## Scope and source versions

The 32-page 2020 Logbook Guidelines source is hash-bound to 8fa1280d3efa18d9f621d84e69f294dd2a3fa960b3c9425865ea10df7917010f. The 36-page 2019 Assessment Module source is bound to a0bfd45c9424d90b254605fc118b9c630681e7d455f37c41a3c1239d3e7e384c.

`docs/evidence/nmc-logbook-assessment-observations-v1.json` stores 22 selected observations: nine core logbook passages, eight sample-column explanations on PDF 13, three sample-template page projections on PDF 10–12, and two assessment-source markers. These are not the original 22 anomaly cases, new distinct requirements or an accepted denominator. No body wording, complete table, source PDF or example questions are exported.

The logbook passages locate institutional format discretion, portfolio alternatives, faculty entry selection, activity scope, faculty completion/remediation criteria, transfer into a record, phase organisation and administrative summary. Eight column observations preserve competency reference, activity, date, attempt, rating, faculty decision, faculty sign-off and learner feedback acknowledgement as distinct concepts. Their classification is provisional source analysis, not a mandated product schema.

## Boundaries that matter for Medical Learning OS

The selected source distinguishes a recorded activity from the full scope of a competency and allows progression across sessions/phases. A completed or signed-off activity must therefore not be represented as certain whole-concept mastery. Future integration should preserve observed activity scope, attempt/remediation, assessor decision and feedback acknowledgement separately from inferred knowledge, retention and transfer. No learning-engine change is implemented by this packet.

Faculty decisions and learner acknowledgement also have different authority. An AI source scan or self-recorded study interaction does not create a faculty attestation. Institution-dependent formatting and optional portfolio arrangements are not automatically compulsory app fields or a new required portfolio feature.

Rating-related source appearances include numerical-score language and sample grade alternatives. This batch preserves them rather than choosing a universal rubric, pass mark or mastery conversion. Administrative summary percentages are not automatically calibrated learner mastery probabilities.

The Assessment Module explicitly labels excerpts on PDF 20 and 25 as proposed GMER 2019 material. Those exact markers are recorded. This neither declares every legacy provision invalid nor makes a quoted provision a current learner-eligibility rule. Cohort applicability, later revisions and authoritative status need separate reconciliation. No exam-admission, internal-assessment threshold or current eligibility rule is implemented.

## Validation

```sh
python3 ops/nmc/validate_support_observations.py /private/Logbook-Guidelines_17.01.2020.pdf /private/Module_Competence_based_02.09.2019.pdf
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

The validator checks exact source hashes/page counts, selected-scope IDs, metadata-only classification allowlists, record digests, page/text bounds and source-body hashes. All observations remain pending with null decisions and false eligibility/approval flags. Classification/scope fields cannot carry arbitrary prose or embedded approval objects, even after recomputing a record digest. Hash validation establishes source integrity, not clinical or regulatory authority.

Packet: 9,625 bytes, SHA-256 3ed2f53ad2ba193dd32047f986e48938f5a3e9a4b3a3a4fd8437d11bec439a44. Actual-source CLI verified all 22 bodies. All 99 NMC Python tests and repository checks pass. Review found a P2 classification-field validation gap, fixed with allowlists/fixed scope and a failing-then-passing regression; re-review confirmed resolution and no new blockers. Parent PR #397 source 6d268f8b has full CI success in run 41611522410; fresh hosted CI for this implementation is not yet verified.

Remaining scope includes later illustrative activities/templates, assessment instruments/criteria, correspondence to the revised 2024 source and subsequent notices, and Alignment/Integration and Online Learning guidance. None is approved as irrelevant or zero-obligation by this selected audit. Existing frozen review package, original source cases, learner registry and runtime remain unchanged; no rule adoption, canonical/exam mapping, learner activation or deployment.
