# Source-first CBME competency proposals for NEET-PG + INI-CET

**Current state, 30 October 2026:** additive, stacked draft PR after the shared 19-subject / 76-module editorial foundation. The real competency intake now has **eight restricted, unverified GM1.1–GM1.8 metadata proposals** based on the searchable text of a University College of Medical Sciences-hosted September 2024 revised CBME compilation. Visual page rendering, official NMC binary hash, rights permission and independent review are **not** confirmed; the metadata are NOT approved medical content or NEET-PG/INI-CET topics. Do not invent competency codes or substitute coaching/timetable schedules for a primary source.

## Evidence chain and responsibility

NMC's official September 12, 2024 notice says the modified CBME guidelines include separate **Topics and Competencies Volumes I–III** and supersede earlier guidelines for the MBBS 2024–25 intake onward (source reference already in `data/dual-exam-syllabus-foundation.js`). The notice is **not** an itemized NEET-PG or INI-CET examination syllabus; AIIMS and NBEMS pathway source references remain separate.

Required chain for each **candidate** competency:
`sourceId=NMC 2024` → exact publication/volume and PDF page → exact source code → independently written analyst summary → one of the existing 76 canonical navigation module IDs → optional existing canonical concept ID **plus its exact accepted identity SHA-256 digest and current catalog version**, checked against a trusted source-provided ID → digest snapshot → 0–2 distinct exam-pathway editorial hypotheses, each explicitly **unverified**.

The source page and competency code are authored declarations until the original document has been inspected and independently checked. There is **no** source-verified state, no rights-approved state and no exam-approved mapping in this PR. A SHA-256 of a source document must be computed from actual source bytes in a separate verified ingest, not invented from a URL or copied from a third party. Record source/version provenance without bulk reproducing copyrighted curriculum text. Do not transform any NMC competency into an NEET-PG/INI-CET official mandate merely because it is undergraduate curriculum material.

## Implementation

- `data/competency-evidence-proposals.json`: protected **local proposal exchange format** with eight unverified citation-only code/index rows (zero approved exam mappings). It is not imported by `data/preparation-curriculum.js`, Study Now, Digital Twin or any learner API.
- `src/domain/competency-evidence.js`: rejects unknown/duplicate source codes, invalid source pages/locators, conflicting exam hypotheses, nonexistent module IDs, forged approved flags, unverified canonical concept IDs, mismatched private identity digests and stale catalog references. The existing `data/dual-exam-syllabus-foundation.js` and `src/domain/subject-index.js` supply source/pathway/subject/module registries; no duplicated taxonomy.
- `scripts/competency-evidence-preflight.js`: read-only, JSON report; default `node scripts/competency-evidence-preflight.js` or candidate file argument. Does not mutate Supabase, upload material, grant roles, create reviewer receipts, or publish learner content.
- `tests/competency-evidence.test.js`: synthetic fixture covers exact declarations, dedup, no false completion, dual-pathway hypotheses, catalog identity version checks and denial.
- `docs/CBME_COMPETENCY_EVIDENCE.md`: this governance and ingestion guide.

## Do not conflate source or exam authority

**Source evidence (NMC CBME)** establishes what a primary undergraduate competency document says after page/code verification. **Exam scope (NBEMS or AIIMS)** may be referenced or separately reviewed, but the same CBME code does not prove the two exams test it identically or assign the same weight. **PYQ Exam DNA** is observed historical exam evidence and does not create a new legal syllabus. **Canonical concept identity acceptance**, **medical/source-rights review**, **independent syllabus-scope attestation** (#337), and **clinical learner publication** are separate gates.

## Operational next intake

1. Obtain/verify **source bytes** for the official NMC 2024 CBME volumes, confirm their SHA-256, and visually reconcile the UCMS-hosted compilation's Medicine codes GM1.1–GM1.8 (PDF viewer page 280, printed p.41). The current remote text inspection does **not** verify the PDF visually or establish that the mirror matches official NMC bytes.
2. Start with a handful of one-subject competency records (e.g. Medicine) only after the actual pages are inspected; write **original short summaries**, not lifted copyrighted table text. Keep `canonicalConceptId:null` until an accepted exact concept snapshot is supplied.
3. Attach a distinct proposed pathway rationale for NEET-PG and INI-CET as needed. Both remain unverified until supported by independent, exam-relevant sources.
4. Run `node scripts/competency-evidence-preflight.js [candidate.json]`. Only private Admin review (existing syllabus-draft/preflight flow) may eventually use the validated IDs; no write API or Admin UI intake added here. Never copy the local dossier into a public Pages bundle.
5. After source-rights and identity checks, obtain the genuine independent reviewer/release gate before approving any scope and before adding verified, exact objective mappings to the existing Preparation Curriculum.

**Release posture:** source-only contract plus tests; no migration, secrets, API routes, learner data, content publication, or scope activation. Keep #343 and #337 gating independent.

## NMC copyright protection: enforced intake policy (30 Oct 2026)

NMC explicitly labels its undergraduate curriculum **copyright-protected** on its official UG curriculum page (https://www.nmc.org.in/information-desk/for-colleges/ug-curriculum/1000/). Its disclaimer (https://oldnmc.nmc.org.in/disclaimer/) provides only conditional non-commercial copying and requires written permission for broad reproduction/adaptation/republication; the 2019 Volume I front matter additionally describes copyright registration. **Do not assume the 2019 grant transfers unchanged to 2024, or that public availability is a commercial republication license.**

The new `data/nmc-cbme-rights-register.json` cross-references the existing M02c `citation_only` rights category for the separate 2019, 2023, and 2024 editions. `src/domain/nmc-cbme-rights.js` refuses invented permission, PDF hashes without inspected bytes, raw-file storage and publication. This **does not create a second clinical rights approval system**: real learner publication continues to require the existing Rights gate and appropriate NMC written license where reproduction or adaptation is proposed. The register is source citation metadata, not authorization.

University College of Medical Sciences medical education unit lists a **revised Sep 2024** PDF separately from the withdrawn August 2024 PDF: https://medicaleducationucms.weebly.com/cbme-implementation.html. The indexed September revision mirror is https://medicaleducationucms.weebly.com/uploads/1/2/6/3/126364586/document__8__merged.pdf. A read-only searchable-text check located Volume II Medicine GM1.1–GM1.8 around PDF page 280 (zero-based 279), printed page 41. **Screenshot/visual verification failed in this session**, and the source PDF could not be downloaded to compute its SHA-256. Hence these are eight unverified private *candidate code references* with short independently written index notes, no full descriptions/tables, no known approved concept, and **no exam-inclusion hypothesis**. The original NMC file is linked, not committed, mirrored or rehosted by MLOS.

Neither the 2019 version, the 2023 guidelines/corrigenda, nor the 2024 revised version is automatically the official NEET-PG/INI-CET topic list. Track separate applicability by admission cohort; never substitute the August 2024 withdrawn curriculum for September 2024 revised guidance.
