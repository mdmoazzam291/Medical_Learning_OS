# Source-first CBME competency proposals for NEET-PG + INI-CET

**Current state, 30 October 2026:** additive, stacked draft PR after the shared 19-subject / 76-module editorial foundation. The real competency ledger starts **empty**; this is intentional because an official NMC topic-by-topic source could not be reliably retrieved and page/codes independently verified during this implementation. Do not invent competency codes or substitute coaching/timetable schedules for a primary source.

## Evidence chain and responsibility

NMC's official September 12, 2024 notice says the modified CBME guidelines include separate **Topics and Competencies Volumes I–III** and supersede earlier guidelines for the MBBS 2024–25 intake onward (source reference already in `data/dual-exam-syllabus-foundation.js`). The notice is **not** an itemized NEET-PG or INI-CET examination syllabus; AIIMS and NBEMS pathway source references remain separate.

Required chain for each **candidate** competency:
`sourceId=NMC 2024` → exact publication/volume and PDF page → exact source code → independently written analyst summary → one of the existing 76 canonical navigation module IDs → optional existing canonical concept ID **only if a matching catalog snapshot is passed** → 0–2 distinct exam-pathway editorial hypotheses, each explicitly **unverified**.

The source page and competency code are authored declarations until the original document has been inspected and independently checked. There is **no** source-verified state, no rights-approved state and no exam-approved mapping in this PR. A SHA-256 of a source document must be computed from actual source bytes in a separate verified ingest, not invented from a URL or copied from a third party. Record source/version provenance without bulk reproducing copyrighted curriculum text. Do not transform any NMC competency into an NEET-PG/INI-CET official mandate merely because it is undergraduate curriculum material.

## Implementation

- `data/competency-evidence-proposals.json`: authoritative **local proposal exchange format**, empty by design. It is not imported by `data/preparation-curriculum.js`, Study Now, Digital Twin or any learner API.
- `src/domain/competency-evidence.js`: rejects unknown/duplicate source codes, invalid source pages/locators, conflicting exam hypotheses, nonexistent module IDs, forged approved flags, unverified canonical concept IDs and stale catalog references. The existing `data/dual-exam-syllabus-foundation.js` and `src/domain/subject-index.js` supply source/pathway/subject/module registries; no duplicated taxonomy.
- `scripts/competency-evidence-preflight.js`: read-only, JSON report; default `node scripts/competency-evidence-preflight.js` or candidate file argument. Does not mutate Supabase, upload material, grant roles, create reviewer receipts, or publish learner content.
- `tests/competency-evidence.test.js`: synthetic fixture covers exact declarations, dedup, no false completion, dual-pathway hypotheses, catalog identity version checks and denial.
- `docs/CBME_COMPETENCY_EVIDENCE.md`: this governance and ingestion guide.

## Do not conflate source or exam authority

**Source evidence (NMC CBME)** establishes what a primary undergraduate competency document says after page/code verification. **Exam scope (NBEMS or AIIMS)** may be referenced or separately reviewed, but the same CBME code does not prove the two exams test it identically or assign the same weight. **PYQ Exam DNA** is observed historical exam evidence and does not create a new legal syllabus. **Canonical concept identity acceptance**, **medical/source-rights review**, **independent syllabus-scope attestation** (#337), and **clinical learner publication** are separate gates.

## Operational next intake

1. Retrieve the primary NMC CBME 2024 **Topics and Competencies** Volumes I–III from an official or directly authenticated institutional source; confirm source edition, code, PDF page and actual content. The official notice is insufficient for row-level validation.
2. Start with a handful of one-subject competency records (e.g. Medicine) only after the actual pages are inspected; write **original short summaries**, not lifted copyrighted table text. Keep `canonicalConceptId:null` until an accepted exact concept snapshot is supplied.
3. Attach a distinct proposed pathway rationale for NEET-PG and INI-CET as needed. Both remain unverified until supported by independent, exam-relevant sources.
4. Run `node scripts/competency-evidence-preflight.js [candidate.json]`. Only private Admin review (existing syllabus-draft/preflight flow) may eventually use the validated IDs; no write API or Admin UI intake added here. Never copy the local dossier into a public Pages bundle.
5. After source-rights and identity checks, obtain the genuine independent reviewer/release gate before approving any scope and before adding verified, exact objective mappings to the existing Preparation Curriculum.

**Release posture:** source-only contract plus tests; no migration, secrets, API routes, learner data, content publication, or scope activation. Keep #343 and #337 gating independent.
