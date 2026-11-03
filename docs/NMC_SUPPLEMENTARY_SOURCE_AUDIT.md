# Supplementary source audit checkpoint
Date2026-10-30. See docs/evidence/nmc-supplement-sources.json for exact10 official URLs, byte hashes, sizes/page counts, embedded scopes and open applicability decisions.

## Completed
Recovered and hashed10 PDFs linked by the current NMC UG Curriculum index: AETCOM, foundation, early clinical exposure, assessment, alignment/integration, skills, logbook, electives, pandemic management and online learning/assessment. These are individually versioned legacy supporting documents, not10 new2024-approved competency lists.
All10 local PDFs parsed and page counts matched web retrieval. No PDF bytes or protected source descriptions committed.
Visually inspected AETCOM PDF87, base2024 PDF48(annexure index) and54(foundation). AETCOM appendix declares1-39 core and40-54 desirable:54 source-declared records, not a verified effective denominator. Distinguish competency entries, learning modules and repeated appearances. This declaration and module index require separate page-level reconciliation.

## Applicability and double-counting
2024 Annexure4 specifies2 weeks/80 hours for foundation; retain this exact version rather than inherit older booklet timing. AETCOM governance PDF49-50 and family adoption PDF65-71 belong in the embedded scope register. Skills/certification and logbook evidence may repeat subject requirements: record cross-links instead of adding them blindly to2781.
2024 annexure13 is labelled draft research-facility/manpower guidance, not automatically learner competencies. Admission/PwBD assessment policy is also a separate scope from clinical competencies relating to disability. Full global-role and supplemental requirement enumeration remains incomplete.
Rights remain citation_only; source links/hashes do not confer reproduction permission. No curriculum wording or full table copied.

## Later amendments
Checked official rules index and targeted two-engine searches for2025/2026 CBME amendments. October2024 clarification remains the specifically retrieved competency amendment. UGMSR2025/2026 institutional standards and2026 PwBD admission-assessment notices surfaced and require separate classification; do not presume either revises the coded subject inventory.
This was not an exhaustive crawl or legal determination. Later-amendment audit remains open; no claim that no later notice exists. Older2023 corrigenda and withdrawn August2024 remain distinct editions.

## Validation/status
10 unique source IDs/URLs, actual64-hex SHA256 values, positive bytes/pages and per-source pending review flags validated. Total downloaded pages: 560. JSON round-trip checked. This is evidence documentation only; no runtime tests rerun or fresh CI claimed.
No ingestion, source approval, medical/rights approval, exam mapping, merge/deploy or learner activation.
Next concrete work: enumerate AETCOM appendix87 onward and module boundaries independently; reconcile39 core/15 desirable with subject overlaps and2024 governance before defining an effective supplemental denominator. Complete other supplemental requirement/page inventories and later-notice applicability afterward.

## AETCOM appendix appearance audit — 3 November 2026

Implemented `ops/nmc/aetcom_appendix.py` against the exact 94-page legacy AETCOM booklet (SHA-256 f752cfe4ef694f60f89f7e709a29c4d8167672928dd248dfb9bd34414bc13766). `docs/evidence/nmc-aetcom-appendix-locators-v1.json` freezes 54 numbered row appearances on PDF 87–91 and 14 additional unnumbered appearances on PDF 92–93. The contiguous source sequence 1–54 is verified; the note on page 87 declares 1–39 core and 40–54 non-core/desirable. These are source-declared legacy classes, not current applicability decisions.

Nine of the 14 additional appearances have exact body-text matches to numbered entries after whitespace collapse: entry 37 (source-declared core), and entries 41–47/53 (source-declared desirable). The additional list is labelled non-core, creating an explicit classification conflict for the exact match to entry 37. Pages 90 and 92 were rendered and visually inspected for that appearance/classification context; this is targeted AI source inspection, not complete visual or independent clinical review. Five additional appearances have no exact whitespace-collapsed match under this method. They are not automatically unique requirements: differences may be lexical, partial or semantic and remain unadjudicated.

The 68 total physical appearances must not become a 68-competency denominator. Nor should nine matching appearances be automatically removed to declare a corrected count. Source ordinal, local ordinal for unnumbered appearances, body coordinates, original reconstruction hashes, whitespace-collapsed comparison digests, level anchors and source-bound IDs are retained separately. Comparison normalization is only a matching diagnostic; physical identities retain the original reconstructed body hash. No body wording, full code corpus, source PDF or rendered page enters Git.

```sh
python3 ops/nmc/aetcom_appendix.py /private/AETCOM_book.pdf /private/aetcom-appendix.json
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

The source-specific level-column threshold is x >= 510 to separate level markers from the domain K/S column. Long horizontal body-column borders bracket candidate regions. The common helper now accepts that threshold with its original pandemic default unchanged; a new actual-source pandemic rerun matches the checked-in pandemic evidence byte-for-byte. This is a version-bound geometry method, not an exhaustive semantic parser.

Two actual AETCOM runs and an independent engineering rerun are byte-identical: 34,656 bytes, SHA-256 e413a8baa908f0cbe697b45d3929be1ffcfa3bc13e1ae156258d0770d8ae58ff. All 52 NMC Python tests and repository checks pass. Independent review verified the class declaration and exact-match counts; no actionable findings. Fresh hosted CI for this implementation is not yet verified.

This advances the appendix enumeration but does not reconcile module-body appearances, 2024 governance/cohort applicability, subject overlaps, clinical equivalence, rights or exam overlays. The existing AETCOM source cases and frozen review package remain unchanged and pending. No source approval, learner activation or production deployment.

## AETCOM module-to-appendix exact comparison — 3 November 2026

`ops/nmc/aetcom_modules.py` scans PDF 1–86 of the pinned legacy AETCOM source, selecting line-start module headings on pages that also contain a competency-addressed heading. It locates 44 candidate physical regions across 27 module headings. Inline references to other modules cannot select the module identity. Multiple or duplicate selected headings fail closed. This is a primary-table detection method, not proof of exhaustive module requirement coverage.

`docs/evidence/nmc-aetcom-module-appendix-comparison-v1.json` binds these appearances to the exact source hash and appendix artifact hash e413a8baa908f0cbe697b45d3929be1ffcfa3bc13e1ae156258d0770d8ae58ff. Eight module appearances exactly match numbered appendix text after whitespace collapse; all eight also share their displayed level markers. Six correspond to source-declared core entries and two to source-declared desirable entries. These are text/metadata observations, not approved clinical equivalence or mappings. Thirty-six appearances have no exact match under this method; they must not be called missing, additional unique or semantically unrelated.

Raw reconstruction hashes/coordinates/source IDs remain separate from comparison digests. Match projections preserve appendix source class and whether displayed levels match, including disagreements if encountered; they do not overwrite either appearance. No source wording, full code corpus or PDF bytes are exported.

```sh
python3 ops/nmc/aetcom_modules.py /private/AETCOM_book.pdf /private/aetcom-module-comparison.json
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

Two actual-source runs and independent engineering rerun match byte-for-byte: 26,614 bytes, SHA-256 07bdd20188acaacae5546bd969379d10fa32f09943e99fc7fbb426673bdabaf0. All 56 NMC Python tests and repository checks pass; review found no actionable findings. Four new tests cover module-heading binding, no assumed table without its heading, ambiguous headings and preservation of classification/level disagreement. Fresh hosted CI for this implementation is not yet verified.

Partial/differently worded appearances, nested objectives, module/appendix/subject semantic overlap and 2024 cohort applicability remain unresolved. Existing source cases, frozen review package, learner runtime and disabled eligibility are unchanged. No source/clinical/rights/exam approval, unique denominator, ingestion or deployment.

## Leading-list-marker formatting investigation — 3 November 2026

The previous 36 unmatched module appearances are now investigated with a narrower formatting diagnostic in `ops/nmc/aetcom_list_marker_audit.py`. It pins both prior artifacts, reconstructs and verifies all 44 module and 68 appendix body hashes against the original AETCOM PDF, and compares after removing only a leading one/two-digit list number plus dot and collapsing whitespace. Joined markers such as a number immediately followed by an uppercase word are supported; decimal forms such as 1.5 remain intact. The rule is source-context-specific, not a general clinical-text normalizer.

Thirty module appearances now have exact comparison matches: the original eight are preserved and 22 previously unmatched appearances differ only by the selected formatting rule. Fourteen remain unmatched. Spelling, case, punctuation, hyphens, negation, internal numbers and medical wording are not normalized. These 30 are formatting-match observations, not approved clinical identities or unique requirements; partial/differently worded statements remain unresolved. Removed numeric markers are stored separately; physical IDs and original hashes/artifacts are unchanged.

The literal word partial appears in none of the 44 selected module statements under a case-insensitive word-boundary search. This is not a search of all booklet prose and does not establish absence of partial relationships or qualifications elsewhere.

```sh
python3 ops/nmc/aetcom_list_marker_audit.py /private/AETCOM_book.pdf /private/list-marker-comparison.json
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

Metadata output: `docs/evidence/nmc-aetcom-list-marker-comparison-v1.json`. Two actual runs are byte-identical: 20,871 bytes, SHA-256 a702c6eb223a0ae8ee463a75021708f44c8299777bd6ab23e0aa98ffa6e30e89. All 60 NMC tests and repository checks pass. Tests explicitly preserve decimals, internal numbers, punctuation, spelling and negation. Fresh hosted CI for this implementation is not yet verified. No source wording, source correction, semantic approval, applicability decision, canonical mapping, learner activation or deployment.

Independent engineering review reproduced the list-marker diagnostic byte-for-byte, confirmed all old exact target IDs remain present and every new match has an actual removed module list marker, and found no actionable issue. This review does not approve source or clinical equivalence.

## Provisional triage of the 14 remaining variants — 3 November 2026

`docs/evidence/nmc-aetcom-variant-triage-v1.json` now records a provisional AI proposal for every one of the 14 appearances left unmatched by the formatting diagnostic. Each source and candidate appendix reference carries its physical ID, page and body hash; each case has a canonical digest. Exact byte hashes bind the module, appendix and formatting artifacts. These are detailed proposals overlapping the existing source-adjudication work, not 14 certified additional defects or decisions to add blindly to the original 22-case denominator.

| Provisional category | Appearances | Meaning of proposal |
|---|---:|---|
| Orthographic variant | 5 | Spelling/hyphenation warrants comparison; equivalence remains unapproved |
| Punctuation variant | 2 | Separation/punctuation differs; no source rewrite |
| Conjunction variant | 2 | Connecting wording differs; retain both source statements |
| Grammatical variant | 3 | Inflection/terminal punctuation differs; no automatic equivalence |
| Terminology conflict | 1 | Module 2.2 and appendix entry 3 use differing terminology; retain conflict |
| Scope/action difference | 1 | Module 4.8 wording does not simply repeat the candidate appendix action; entries 35/40 are alternatives for investigation, not a merged mapping |

Thus 12 are candidate expression variants and two require explicit terminology or action/scope analysis. This is AI interpretation of the inspected source statements. It is not a clinical judgment that all 12 are equivalent, that either source should be corrected, or that the last statement is a new requirement. A candidate list is neither an accepted canonical relationship nor a claim that every possible relationship was considered.

`ops/nmc/validate_variant_triage.py` checks the packet against current repository artifacts: complete/unique coverage of the 14 unmatched appearances, exact source/target references, case digests, pending/null decisions and strictly false approval/eligibility values. It rejects stale artifact bytes, edited cases, missing/duplicate sources, fabricated target numbers and numeric substitutes for boolean flags. Hashes bind evidence; they do not authenticate an AI actor, confer source authority or validate clinical meaning. This utility is not an approval importer or an extension of the trusted hosted review API.

```sh
python3 ops/nmc/validate_variant_triage.py
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

The metadata-only packet is 10,826 bytes, SHA-256 3659b498f775efc755fa66250e22493422c64cb53d5d90b11b8c2d42dce20c20. All 65 NMC tests pass and the validator reports 14 proposals, zero approved decisions. Fresh hosted CI for this implementation is not yet verified. Original source records, frozen package and learner runtime remain unchanged. All source/clinical/rights/exam/applicability and completeness decisions remain pending.

Independent engineering review reconstructed and hash-verified every referenced source/appendix body, found the proposals plausible and reported no actionable findings. Categories describe the dominant difference; some pairs also contain capitalization, spacing or punctuation changes. Integrity validation and AI plausibility review do not establish clinical equivalence. Repository checks pass (13 services, 250 coupling locations).

## Legacy Foundation Course physical rows and edition boundary — 3 November 2026

`ops/nmc/foundation_regions.py` now reproduces the exact 64-page 2019 source's defining table on PDF 16–18: 45 top-level appearances grouped 10/9/6/15/5. The nested disability table on PDF 54–55 contains eight further physical appearances. These nested source appearances are not automatically eight additional unique requirements. Candidate parent links resolve to the physical legacy parent appearance rather than a canonical Medical Knowledge Graph identity. Clinical parent mapping remains unapproved.

Metadata receipt `docs/evidence/nmc-foundation-legacy-regions-v1.json` stores coordinates, body/appearance digests, code-reconstruction hashes and source nesting candidates, without exporting the source code corpus or body wording. Code hashes use whitespace-stripped source-code reconstruction for enumeration comparison; they are not hashes of original PDF bytes or approved logical identities. Every reconstructed source code and page matches the older candidate enumeration. That parity does not certify clinical meaning, exhaustive source scope or current applicability.

The source-specific level-column geometry is explicit: top-level x >= 490/gap < 100 points, nested x >= 470/gap < 130. The wider nested table initially failed closed under the older layout setting; its explicit override preserves all eight rows. The shared helper's original defaults are unchanged. Fresh actual-source reruns of the existing pandemic and AETCOM appendix extractors match their checked-in artifacts byte-for-byte.

Two Foundation runs and independent engineering source rerun match exactly: 23,785 bytes, SHA-256 07a774f5043aec3b0db3c0fc8d2bcd10e2a374b4753060448e91aae4c7dd3711. Reviewer independently reconstructed all 53 body/appearance hashes, checked source codes/pages and parent references, and found no actionable findings. All 69 NMC Python tests pass; repository checks pass (13 services, 250 coupling locations). Fresh hosted CI for this implementation is not yet verified.

```sh
python3 ops/nmc/foundation_regions.py /private/FOUNDATION-COURSE-MBBS-17.07.2019.pdf /private/foundation-regions.json
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

Separately, `docs/evidence/nmc-foundation-edition-boundary-v1.json` binds exact text spans in the official 2024 base PDF, page 54 (printed52), to the two-week Foundation Course heading and total 80 teaching hours. The base SHA-256 remains aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c. Both numeric observations were checked in actual source text; the receipt contains offsets/digests rather than copied text. This records a 2024-source constraint and does not carry legacy outcomes into 2024, settle cohort applicability, or establish a cross-edition outcome mapping.

The remaining Foundation Course work includes detailed-module/appendix overlap, other nested goals and source-version applicability. No new effective denominator, source approval, rights/exam acceptance, canonical ingestion, learner activation or deployment. The frozen source-review package and its pending decisions remain unchanged.

## Early Clinical Exposure explicit sample sections — 3 November 2026

`ops/nmc/ece_examples.py` reads the pinned 44-page legacy ECE booklet (SHA-256 8683513a6ed3ec1f1e8feefafddae7756b4ca918e082b158adfcdb6b3c125545). The six earlier sample-module openings cover PDF 21–40. Annexure IV on PDF 41–42 contains a separate humanities module outside that six-opening list; its explicit competency section is now captured rather than omitted. The scope IDs are local MLOS locators, not official competency codes.

The metadata-only receipt `docs/evidence/nmc-ece-example-item-locators-v1.json` preserves 35 explicitly headed appearances: 12 sample expected competencies, 22 sample objectives and one humanities example competency. Numbered lists, source page character spans and body/source-bound identity hashes are retained without exporting the statements. Examples are not universal extra competencies, additional unique requirements or accepted graph relationships.

The shared text-span parser now accepts explicit optional heading, stopping, section-kind, method and list-marker patterns while keeping all original pandemic defaults unchanged. ECE-specific handling supports dot/parenthesis markers, optional objective headings and intro-line fallback where no Objectives heading exists. It stops before teaching experiences/sessions and explicit teaching notes; that selection boundary does not approve the omitted instructional material as irrelevant. Existing pandemic nested output was rerun against the actual source and remains byte-identical to its checked-in artifact.

```sh
python3 ops/nmc/ece_examples.py /private/Early_Clinical_Exposure-MBBS-07.08.2019.pdf /private/ece-examples.json
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

Two actual ECE runs and independent engineering rerun are byte-identical: 12,177 bytes, SHA-256 f1c67376a1f1ac12fd23e0738b853ca7d3f87b468cf0b2cde0b3b8321f57c20c. Reviewer independently reconstructed all 35 body/appearance hashes and checked character bounds; no actionable findings. All 73 NMC Python tests and repository checks pass. Fresh hosted CI for this implementation is not yet verified. Earlier PR #391 source 48dfd906 has core/Chromium/WebKit success in run 41537207424, separately.

General goals, instructional/assessment material, the clinical-vignette annexure on PDF 43–44, semantic overlaps and current-edition/cohort applicability remain outside this explicit-item extraction or unreviewed. They are not approved exclusions or zero-obligation findings. The existing source case packet/frozen package and learner registry remain unchanged; no source approval, canonical/exam mapping, activation or deployment.

## Legacy Skills Training example references and objective blocks — 3 November 2026

`ops/nmc/skills_examples.py` reads the exact 56-page legacy Skills Training booklet, SHA-256 3e267665af122cb7fd238151d73516e278eb800464836f0b19a6ee660dec0c4e. It audits the six existing sample ranges on PDF 31–56, retaining 45 coded-reference appearances representing 44 distinct whitespace-collapsed code fingerprints. Appearances remain distinct: code repetition is not a new skill, while matching code text does not establish matching descriptions, source-version identity or clinical meaning.

Reference metadata in `docs/evidence/nmc-skills-example-reference-locators-v1.json` stores page character spans, raw-span and comparison digests, source prefix and source-bound appearance IDs, without a full code corpus or source descriptions. Split first-column prefixes/codes are retained by their original text span and a separate whitespace-collapsed comparison hash. Prefixes include IM and PM as observed; no aliases or typo corrections are applied. The range-only location scope does not establish whether a reference is primary, prerequisite, related, background or assessment-linked. That role and every cross-edition mapping remain unapproved.

Five explicitly headed objective sections are located as whole blocks. Lettered/bulleted clauses are deliberately not converted to an asserted individual-objective count. Example 3 has no recognised objective heading in this method; this does not establish that the example has no objectives or obligations. Sample teaching tasks and their repeated subject references are not universal additions to the NMC competency denominator.

```sh
python3 ops/nmc/skills_examples.py /private/Skill-Module_23.12.2019.pdf /private/skills-examples.json
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

Two actual-source runs and an independent engineering rerun are byte-identical: 22,333 bytes, SHA-256 d61833c323f04b5f278258b5ec2463c61ff740e6ee15ea6893eed33c39f05b0a. Review independently verified all reference spans/code digests, five objective-section bodies and identities; no actionable findings. All 77 NMC Python tests and repository checks pass (13 services, 250 coupling locations). Parent PR #392 source aaca2ec3 has all three CI jobs passed in run 41585679796; fresh hosted CI for this implementation is not yet verified.

The detector scans standard dotted references with optional internal whitespace. Nonstandard identifiers or implicit references can remain unseen; zero-match or absence claims are not inferred for unrecognised forms. Individual objectives, certification/assessment scope, case/task details, semantic overlap and current-edition/cohort applicability remain incomplete or unreviewed. Existing source cases, frozen package, registry and learner runtime remain unchanged; no accepted source/clinical/rights/exam approval, activation or deployment.

## Skills sample objective details and heading context — 3 November 2026

`ops/nmc/skills_objective_detail.py` binds the prior reference/block artifact and original source bytes, verifies all five block hashes, and locates 19 explicit objective appearances inside them. Source forms remain separate: nine bullet items, five lettered items, four Roman-numeral items and one plain statement. Each has a source character span, original marker kind/hash, local ordinal, parent-block ID, body digest and source-bound appearance ID. No objectives are invented for Example 3, where the earlier method found no explicit heading. The local ordinals are not official competency codes or a unique-requirement count.

For all 45 coded-reference appearances, the utility records the nearest recognised source-heading span and its hash. Observed contexts are six competency, 28 background, one related, six relevant, three prior and one training heading. One context carries across a page boundary and is explicitly flagged. A nearest recognised heading is a syntactic observation: unrecognised or implicit headings and the statement's actual semantic role remain unreviewed. No primary/prerequisite/background relationship is accepted merely from this context.

```sh
python3 ops/nmc/skills_objective_detail.py /private/Skill-Module_23.12.2019.pdf /private/skills-detail.json
python3 -m unittest discover -s ops/nmc -p 'test_*.py' -v
```

The source-specific child splitter handles explicit source markers, rejects broken letter/Roman sequences and preserves a plain statement without synthetic subdivision. The current pinned five blocks occupy single page spans; a future cross-page parent block fails closed rather than silently changing reconstruction. Body offsets are Unicode character positions in pinned PyMuPDF plain page text, not PDF byte or image coordinates. No source descriptions or code corpus are exported.

Two actual runs and independent engineering rerun are byte-identical: 26,923 bytes, SHA-256 c751ead2b0afa091ef644c8d371397189c0f1f6748ea49d2b262051578f7bfa4. Review independently checked all 19 objective hashes/identities/parent bounds and 45 heading contexts, offsets and carry flags; no actionable findings. All 81 NMC Python tests and repository checks pass. Parent PR #393 source 9cf874d9 has core/Chromium/WebKit success in run 41597321585; hosted CI for this implementation is not yet verified.

A separate progress delta, `docs/evidence/nmc-source-queue-progress-2026-11-03-skills.json`, binds the original unified queue and these new receipts without mutating older frozen inputs. It leaves unlabeled skills material, semantic reference roles, certification/assessment obligations, Electives, Family Adoption, support-document detail and remaining global goals open. Those items overlap earlier queue categories and must not be added blindly to a new task denominator. Existing source/clinical/rights/exam approvals, registry and learner activation remain unchanged.

## Electives/FAP follow-up — 3 November 2026

See `NMC_ELECTIVES_FAP_SOURCE_AUDIT.md`: nine legacy Electives clauses, seven 2024 bullets, explicit edition-duration evidence, 17 FAP student-target paragraphs, ten final-report items and four embedded table images now have source locators/hashes. Local OCR receipts prevent image-only pages being treated as blank, without approving table interpretation. All 85 NMC tests pass; cohort/phase placement, table rows and FAP logbook scope remain open.

## FAP image-cell and logbook follow-up — 3 November 2026

The four image appearances now have 62 candidate raster-grid cell fragments, including six headers and six fragments without detected bottom rules. Twelve blank logbook labels and the source institute-modification note have exact locators. No cross-image rows are merged or fixed learner schema inferred. All 89 NMC tests pass; source/OCR rebuild is exact. See `NMC_FAP_TABLE_FRAGMENT_AUDIT.md`. Clinical table interpretation, continuations and accepted logbook obligations remain open.

## Selected logbook/assessment core — 3 November 2026

See `NMC_LOGBOOK_ASSESSMENT_CORE_AUDIT.md`: 22 selected observations separate activity evidence/faculty decisions/feedback and preserve institutional format discretion. Two assessment excerpt markers explicitly say proposed GMER 2019; no current eligibility rules are inferred. All 99 NMC tests pass and actual-source validation checks every selected body. This does not finish both booklets or close current-source correspondence/support scope.

## Alignment/Online selected core — 3 November 2026

The next profile binds 43 selected observations: 13 Alignment/Integration definitions/design/assessment/step records and 30 online-teaching principle/faculty-role/capability/skill-category records. These are teaching-design contexts, not extra learner competencies or graph-identity equivalences. All 102 NMC tests and both actual-source validators pass, preserving the earlier 22-body logbook profile. See `NMC_ALIGNMENT_ONLINE_CORE_AUDIT.md`; full-booklet detail and applicability remain open.


### Selected online assessment/access checkpoint — 3 November 2026

31 source bodies and a bounded 57-page literal-term diagnostic are captured in [the audit](NMC_ONLINE_ASSESSMENT_ACCESS_AUDIT.md). All observations remain pending; no learner requirements, recording permissions, accepted mappings or completeness claims were added. Semantic privacy/rights and current applicability review remain open.


### Current-source and completion reconciliation — 3 November 2026

The [consolidated completion checklist](NMC_COMPLETION_CHECKLIST.md) now records 12 open major work packages with dependency/acceptance criteria. Fresh official primary downloads match existing hashes; 18 archive pages are title-screened without exhaustive-currentness certification. Eight October clauses have exact-span observations and a local three-reference amendment projection; no live registry or accepted source state changed.
