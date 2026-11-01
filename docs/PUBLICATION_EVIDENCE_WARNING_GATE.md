# Core6 publication-evidence warning audit (issue #326)

**Status:** implementation candidate on a feature branch; no current production change, no source-rights clearance, no medical approval, no publication decision.

## Problem

Issue [#326](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/326) documents six *published* canonical notes with immutable staging-language in title/body/provenance, and eight sources with rights-status evidence that may contradict permissive `public_domain` assertions. Existing approval events and matching digests prove transaction/history consistency but **do not establish human inspection, medical correctness, copyright rights, or lawful reuse**. Do not silently rewrite, withdraw, or republish versions based on keyword matching.

## Shipped in this candidate

- `src/domain/publication-evidence-warnings.js`: reusable **advisory** scan of note status/title/body/provenance and source rights status/evidence; outputs *only identifiers, stable warning codes, and action*, never clinical text, source excerpts, or a permission verdict.
- `auditCanonicalCatalog` now attaches a separately named `publicationEvidenceScan` object to the existing **owner-authorized read-only** `/content-integrity` response, without changing the existing structural `findings`, `byCode`, `contractId` or `evidenceScope`. Existing server-side access checks and no-store behavior remain unchanged.
- **Corrected audit input gap:** The original owner integrity endpoint selected only note IDs/status, so the wording scan could not actually inspect six Core6 note titles/bodies/provenance. The private owner-only API now selects those three fields for server-side analysis, bounded to 6 MB of note evidence, while still returning **only warning IDs/codes** (never the text) and retaining owner Auth, runtime guard, catalog readback and no-store response rules. If a published note lacks inspectable text or provenance, it now emits a warning rather than falsely reporting zero. Missing/unknown source-rights status is also flagged; this does not establish source permission.
- The scan returns `approvalGranted: false`, `publicationDecision: 'not_evaluated'` even with zero findings. If malformed data prevents scanning, status is `unavailable` and `warningCount: null`, never a fabricated green zero.
- Synthetic unit/integration regressions cover six-note-style draft phrases, unapproved provenance, public-domain/owned/licensed contradiction, absent public-domain evidence, benign clinical “pending” language, deterministic metadata ordering, no sensitive text leakage and malformed/duplicate identifiers.

## Simple Admin workflow (one screen, three independent checks)

| Admin question | What to check | Meaning of success |
| --- | --- | --- |
| **1. Permission — may we use it?** | Source ownership/license, exact material type (ordinary citation versus copied passage, recalled MCQ, commercial screenshot), allowed display scope, and recorded source-rights decision. | The qualified, authorized decision covers the **exact source version and use**. A publicly downloadable file is not automatically public-domain content. |
| **2. Medical accuracy — is it correct?** | Exact question/note version, answer and explanation, current clinical guidance and applicable limitations, reviewed by an authorized qualified clinician. | Real reviewer disposition with identity, reason, version binding and timestamp. A previous generic approval sentence is not independent clinical evidence. |
| **3. References — does the source support it?** | Actual cited passage/page/edition/version, accurate interpretation, and whether the source applies to the claim. | Exact-version References review is documented, distinct from source permission and medical correctness. |

**Workflow:** Import privately → show all three checks in existing Content Review → record genuine independent human decisions in the existing review system → confirm exact-version evidence is still current → use the existing **Review → Live** publication action. If any check is pending, unknown, contradicted or withdrawn, it stays **Not verified/Needs review**, not “ready.” No extra approval type, reviewer impersonation, reviewer record reconstruction or second content-review system is needed.

**Current UI increment:** In owner-only **Catalog Integrity**, click **Run read-only audit** to see “Before publishing: three checks” plus metadata-only warnings with exact IDs and clear explanations. This view **does not implement a Verified state**, because the existing read-only scan has no authority to authenticate clinician/reference/rights decisions. No warnings means “no matching phrases,” **not** rights cleared. If the API is old/malformed, it displays unavailable rather than green. The Admin must open existing Content Review for decisions; nothing is published or changed by the scan.

### Core6 triage in the simplest terms

- **8 sources:** inspect the evidence for actual reuse permissions, starting with any commercial recall screenshots; record authorized source-specific rights decisions, not assumed public-domain labels.
- **6 published notes + 6 linked questions:** independently check their exact medical content and references, as well as rights implications for copied material.
- **Owner release decision:** preserve the current versions and learner history; decide via authorized governance whether to retain or withdraw existing publication while review is pending. If remediated, create six *new* reviewed note versions rather than erasing old history.

## Known limitations

This is **not** a legal classifier, human reviewer, credential verifier, publication gate, or source-rights database reconciliation. It does not inspect independent `source_rights_events`, the actual publisher license, commercial screenshots, reviewer qualifications, source-byte reuse, PDF pages, claim accuracy, the current content catalog, or private learner notes. Heuristic phrases can be missed or yield false positives. A source status of `citation_only` must still not be used as permission to reproduce passages.

The check is **additive** to existing owner-only read-only catalog audit. The true pre-publish Review → Live transaction is *not* yet wired to this warning contract. Do not claim issue #326 fully closed. Before a future enforcement gate, bind exact note/source versions, the source-rights event trail and genuine independent rights/medical/References decisions under a separate reviewed change; this must be transactionally current and must fail closed if evidence is unavailable.

## Human decisions still outstanding

1. Independently verify eight source permissions and all twelve item versions (six notes + six linked questions), with item-specific evidence and dated reviewer identity.
2. Decide whether the currently published Core6 should remain live or be withdrawn under existing authorized governance; this memo grants neither action.
3. Correct draft-language only in six **new** reviewed note versions after rights/medical approval. Preserve originals and learner anchors.
4. Validate exact hosted owner audit response and learner visibility without leaking clinical/source bytes. Require exact-head CI, independent code review and distinct owner approval for integration/deployment.

**Release boundary:** This PR intentionally changes only a pure domain utility, existing owner-only read-only structural audit projection, tests and documentation. No migration, Auth grant, public route, content write, source status or live deployment.
