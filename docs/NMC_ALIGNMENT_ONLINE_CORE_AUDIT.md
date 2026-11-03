# Selected Alignment/Integration and Online Learning guidance

3 November 2026. Source-context observations only; neither an exhaustive audit nor adoption of learner requirements.

## Sources and selected scope

The 34-page Alignment/Integration booklet is bound to SHA-256 e5cf0a04271ee77f126ee2d991509b6a3481019eda81c3206abda6fa46eb07c9. The 57-page Online Learning/Assessment booklet is bound to cf1e82b77aca65c3e4f8b3c6bdee048120616722dc01a78f520984c4dc313c35.

`docs/evidence/nmc-alignment-online-observations-v1.json` records 43 selected source appearances: 13 alignment-related observations and 30 online-teaching observations. All have source-page character bounds, body hashes, fixed provisional classifications and record digests; no source wording, curriculum table, image or example question is exported.

| Selected source category | Appearances |
|---|---:|
| Alignment/integration/linker definitions | 3 |
| Legacy curriculum-design guidance | 3 |
| Legacy subject-assessment context | 1 |
| Curriculum-design steps | 6 |
| Online teaching principles | 12 |
| Teacher roles | 8 |
| Teacher capabilities | 5 |
| Online-teaching skill categories | 5 |

Nested clauses and individual attributes inside these passages are not fully enumerated. Counts describe selected source organisation; they are not 43 additional learner competencies.

## Implications for Medical Learning OS

The alignment source distinguishes temporal coordination, integrated learning sessions and linking experiences. A teaching-session grouping is not a proof that clinical concepts are identical. Future adapters should keep source requirements, lesson/session organisation and canonical medical concepts distinct, with explicit mappings. The same clinical concept may participate in several source requirements or teaching contexts without creating duplicate canonical nodes; conversely, a shared session must not collapse genuinely different meanings. This packet implements no mappings.

The legacy proportion/phase and subject-assessment statements remain edition-bound observations. They do not set current timetable quotas, exam adapters or personal study-time limits. Six curriculum-design steps are preserved as teaching-planning guidance rather than medical learner competencies.

Online teaching roles and capabilities explicitly concern faculty/instructional delivery. They must not become extra dimensions of medical learner mastery merely because the source uses the word competency. The selected teaching principles include feedback, interactivity and learner differences; their presence in a guide is not experimental validation of a particular product algorithm. In particular, no fixed learning-style assignment or preference-based mastery/recommendation rule is introduced. Evidence of learning benefit, intended use and applicability would need separate assessment.

## Validation and regression

```sh
python3 ops/nmc/validate_alignment_online.py /private/Alignment-and-Integration_03.10.2019.pdf /private/Module-8-Online-learning-and-assessment-17-11-20-version-final-for-uploading-converted.pdf
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

The metadata validator shares strict record validation with the earlier logbook/assessment profile, while source sets, IDs, kinds, roles, packet kind and selection scope remain separate. Cross-profile packets are rejected; free-form classification payloads and learner-competency substitutions cannot enter the teaching-guidance profile. No trusted approval API or source decision importer is implemented.

Packet: 18,050 bytes, SHA-256 d2dada03ba3464f47dceea5cc2e10d2ff304fc321b74c8680404c4251a74dc32. Actual-source validation verifies all 43 bodies, and the earlier 22-body logbook/assessment validator still passes. All 102 NMC Python tests and repository checks pass. Parent PR #398 source 95ad0f72 has core/Chromium/WebKit success in run 41614408709; hosted CI for this implementation is not yet verified.

Remaining scope includes detailed examples, supporting appendices, later online-assessment/technical/access/privacy guidance, full institutional-versus-learner obligations, current-source correspondence and cohort applicability. These selected omissions are not approved exclusions or zero-obligation findings. Original frozen source queue/review package and learner registry/runtime remain unchanged. No accepted source/clinical/rights/exam mapping, learner activation or deployment.

Independent engineering review verified all 43 new source bodies and the unchanged 22-body profile, found classifications supported by the selected passages and no actionable findings. This is source-integrity/provisional-context review, not approval of teaching claims, learner policy or cohort applicability.
