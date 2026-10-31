# Dual-exam syllabus advancement and release gates
Date: 2026-10-30 (Asia/Kolkata). Status: PROPOSED policy; source investigation performed, implementation not authorized by this document. Owner request: prepare the best practical path to full NMC inventory and NEET-PG/INI-CET syllabus development, then continue necessary source checks.

## Recommendation and alternatives
Continue source reconciliation and private draft mapping in parallel. Gate completeness claims, medical publication and learner recommendations independently. Reuse PR343/344/346, the 19 canonical subjects/76 modules and the existing Knowledge Graph. Do not build a duplicate syllabus registry.
- Waiting for the entire curriculum before any draft mapping prevents useful progress without improving source verification.
- Activating the whole proposed scope from a count match would conflate enumeration, clinical competence and exam relevance.
- Recommended: versioned source inventory plus explicitly partial exam overlays; only independently reviewed, evidence-backed subsets may later become eligible for a controlled recommendation pilot. This is a proposal, not current activation permission.

## Three different coverage questions
1. Source inventory: have all requirements in a precisely declared edition and scope been enumerated with zero unresolved omissions, duplicates or extras?
2. Concept/assessment mapping: which requirements have reviewed mappings to accepted canonical identities, original teaching and suitable assessments?
3. Learner evidence: what has this learner demonstrated, with uncertainty and modality limits?
A complete code inventory establishes none of the latter two. MCQ performance does not certify bedside skills, procedures, communication or professional behaviour.

## Gate A: authentic source inventory
- Build a manifest of official revised September 2024 Volumes I-III, October clarification and any relevant later amendments. Track withdrawn and older editions separately, including applicability by cohort. Do not silently substitute 2024 for all current aspirants.
- For each document record official locator, retrieval time, actual byte SHA-256, size/page count, edition, effective scope, supersession and rights state. A mirror hash is explicitly a mirror hash.
- Enumerate every source page: subject-coded competencies; global IMG requirements; AETCOM; foundation/ECE and other curricular supplements/skills/appendices. Record whether each is in scope, cross-referenced, separately counted or excluded with justification. Avoid double-counting skills already attached to a code.
- Give each source item an edition-qualified ID, exact PDF/printed page, section, observed code and immutable provenance. Unnumbered requirements need stable local locators, not invented NMC codes.
- Run independent extraction/checking methods; inspect every relevant table page visually. Separate defining rows from cross-references. Never infer missing IDs by filling numeric sequences.
- Reconcile exact sets and per-subject totals, not only grand totals. Log source anomalies, code aliases and count disagreements with evidence and resolution; never alter expected counts merely to make CI pass.
- Require a distinct competent reviewer to inspect the frozen manifest, discrepancies and page evidence. AI/source inspection is assistance, not independent human sign-off.
- Freeze a versioned evidence digest and review record. Changed source bytes/scope/mapping invalidate affected approvals and claims; retain historical receipts.

## Gate B: defensible claims
Only after Gate A, allow a scoped statement such as: "All numbered subject competencies in the reviewed September 2024 source set are indexed, as of [date], manifest [digest]."
The statement must expose its denominator, edition, supplements included/excluded, review and unresolved limitations. Do not use an unqualified "100% NMC coverage" for the 2,781 subject total alone. Full curricular inventory requires reviewed supplementary inventories too.
Report source-indexed, source-reviewed, concept-mapped, assessment-covered and learner-evidenced counts separately. Unknown denominators produce unknown coverage, never 0% or 100%. Never label an MLOS proposal an officially certified NEET-PG or INI-CET syllabus.

## Gate C: two exam overlays and recommendations
- Bind each exact source item to accepted canonical concept IDs/digests; support many-to-many relations and partial/unsupported mappings. Preserve unmapped requirements visibly.
- Prepare separate versioned NEET-PG and INI-CET inclusion decisions: exam source edition/session, inclusion evidence, rationale, confidence, reviewer and unresolved scope. Undergraduate inclusion alone is not exam-specific certification. Keep PYQ frequency/weights in Exam DNA.
- Rights and clinical/content review apply to exact content versions. Retain citation_only source handling unless documented permission is reviewed. Do not bundle source PDFs, full NMC tables or copied descriptions in static assets.
- Before any activation require approved scope/content, real restricted reviewer authorization/revocation and immutable-decision acceptance (PR337), existing rights/publication gates (#326/#330), account isolation, recoverability, and explicit owner release authorization.
- Pilot only a separately approved limited scope. Eligibility must be checked server-side against exact current versions; fail closed on withdrawn permission, revoked approval, changed source or unavailable assessment. Provide a kill switch and rollback/rebuild path.
- Study Now may use appropriate question/retention evidence with uncertainty. Do not infer practical competence from an MCQ. The Digital Twin must show unsupported dimensions as unknown.
- Evaluate delayed retention/transfer, recommendation eligibility errors and lost/duplicated events before wider rollout; inspect calibration only where sample size supports it. No promised rank or precise mastery from an unvalidated model.
Full inventory is required for a full-coverage claim. A future approved partial pilot need not wait for a full-curriculum claim, but it requires all its own exact-scope safety/release gates. No pilot is activated here.

## Source investigation receipt (performed this turn)
Branch at investigation: feat/nmc-complete-competency-audit-20261030, code head 5df017dcaae9ea8f07e7cb98e9170900c03743c9, PR346 (draft, stacked on PR344).
- GitHub readback: core, Chromium, WebKit and Cloudflare checks all completed successfully for that head. This is engineering evidence, not content approval.
- Downloaded institutional mirror locally: https://medicaleducationucms.weebly.com/uploads/1/2/6/3/126364586/document__8__merged.pdf
- Actual mirror bytes: 4,774,093; 466 pages; SHA-256 9bb9e28bd33f0bb6c00ee04bce8095da9f61086f0b2f917ded6daefc16d41db4. Producer metadata says iLovePDF. No assertion of byte equality with NMC original.
- Rendered and inspected mirror PDF pages 257-259 (printed 17-19): volume subject-count totals visually agree with 1,139 + 1,132 + 510 = 2,781. This narrows the earlier approximate printed 17-20 reference; it is not a full-page inventory review.
- Applied the existing scanner's conservative regex to local pdftotext output: 2,626 unique candidate tokens across all prefixes; 2,624 have expected/observed subject prefixes, with CNS and IM one each needing classification. Paediatrics PE has 253 versus published 406; GM has 529 versus 525; OG 142 versus 141. No inference that missing tokens equal missing competencies. Cross-references/formatting and source discrepancies must be checked.
- Rendered and inspected mirror PDF page 280: GM1.1-GM1.8 occur in the defining Medicine table, printed page 40. This corrects the earlier chat's suggested printed page 44 for the opening Medicine records. Observed on a mirror only; no official-source or independent-review status promoted.
- Official current NMC index lists September 12 and October 10 records: https://nmc.org.in/page/rules-regulations-rules-regulations-nmc
- Official compendium index distinguishes withdrawn August and revised September sections: https://nmc.org.in/MCIRest/open/getDocument?path=%2FDocuments%2FPublic%2FPortal%2FE_Compendium_of_NMC_2024%2F0.+Index.pdf
- Previously recorded direct official PDF locator returned 404 through web retrieval. Official compendium fallback also returned HTTP 404 locally; its successful download/authenticity is not established by this receipt.
No original PDF, rendered page, extracted protected prose or full code corpus is committed. No new competency ledger entries, medical/rights decisions, independent reviewer, exam approval or learner activation.

## Ordered next work and acceptance
1. Recover current official PDF(s), establish edition/clarification provenance and compare with mirror structurally; differing container hashes require page/content comparison, not automatic rejection or equivalence.
2. Reconcile Paediatrics first (largest observed extraction discrepancy), then GM/OG extras and all subject shortfalls. Inspect DR/DE and RD/RT defining rows and legends before proposing aliases. Maintain unresolved IDs/pages explicitly.
3. Produce a complete metadata-only exact set and page-review ledger; preserve a source anomaly register. Continue only private mappings supported by reviewed source records.
4. Audit supplements separately, obtain genuine independent review, then freeze the source manifest.
5. Seek separate exam-overlay, content/rights and controlled-activation approvals with concrete reviewable evidence.
Completion of this proposal does not close issue345, approve PR337, or merge PR343/344/346.
