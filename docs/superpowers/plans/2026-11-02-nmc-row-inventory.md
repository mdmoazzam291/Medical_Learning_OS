# Reproducible NMC defining-column region inventory

Owner root; isolated snapshot PR348 head71ca1d0; independent follow-up, preserve existing NMC/security branches.
Goal: replace transient-only detailed extraction with a reproducible, metadata-only region inventory bound to actual official PDF bytes and the existing263-page candidate manifest. No completeness or approval claim.
Files: ops/nmc/codecell_inventory.py; ops/nmc/test_codecell_inventory.py; CI Python unittest step; metadata-only inventory and comparison under docs/evidence; NMC runbook/readiness/handoff.
- [x] RED: synthetic geometry tests for deterministic physical region IDs, wrapped/malformed identifiers, empty/header preservation, no raw text leakage, strict manifest/page/hash/coordinate bounds and fail-closed eligibility.
- [x] GREEN: pure scanner plus lazy pinnedPyMuPDF1.26.6 local PDF adapter. Pin actualsourcehash/pagecount beforeprocessing, exclusive JSONoutput, no raw source prose/code corpus/PDF export. Never normalize source identities or infer missing codes.
- [x] Actual source: rehash official467-page PDF, run263 selected pages, compare every page's categories with frozen receipts, persist row bbox/raw-cell hashes and discrepancies. Preserve all mismatches rather than fit old counts. Render/inspect representative pages locally; no source images/prose inGit.
- [ ] Full Node/Python/check/build, independent review, featurebranch/draftPR stacked on348, exactsourceCI and final evidence/readback.
Review focus: historical page scope is incomplete; same counts do not prove identical or complete competency sets; boundary/empty/header changes remain review gaps; no raw wording leaks; no exam/rights/clinical/learner approval or source acquisition completeness.

Local13Python/full1568Node/check13services250couplings/126filebuildPASS. ActualtwoidenticalPDFscans plusindependentengineeringrebuild exact. No blocker. Final:minor(deferred): single/duplicate-onlyboundary anddirectCLI version/page/exclusive-outputnegative tests; do notclaimtheyran. SourceCIpending.
