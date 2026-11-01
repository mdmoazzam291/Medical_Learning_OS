# Core6 publication-evidence warning audit (issue #326)

**Status:** implementation candidate on a feature branch; no current production change, no source-rights clearance, no medical approval, no publication decision.

## Problem

Issue [#326](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/326) documents six *published* canonical notes with immutable staging-language in title/body/provenance, and eight sources with rights-status evidence that may contradict permissive `public_domain` assertions. Existing approval events and matching digests prove transaction/history consistency but **do not establish human inspection, medical correctness, copyright rights, or lawful reuse**. Do not silently rewrite, withdraw, or republish versions based on keyword matching.

## Shipped in this candidate

- `src/domain/publication-evidence-warnings.js`: reusable **advisory** scan of note status/title/body/provenance and source rights status/evidence; outputs *only identifiers, stable warning codes, and action*, never clinical text, source excerpts, or a permission verdict.
- `auditCanonicalCatalog` now attaches a separately named `publicationEvidenceScan` object to the existing **owner-authorized read-only** `/content-integrity` response, without changing the existing structural `findings`, `byCode`, `contractId` or `evidenceScope`. Existing server-side access checks and no-store behavior remain unchanged.
- The scan returns `approvalGranted: false`, `publicationDecision: 'not_evaluated'` even with zero findings. If malformed data prevents scanning, status is `unavailable` and `warningCount: null`, never a fabricated green zero.
- Synthetic unit/integration regressions cover six-note-style draft phrases, unapproved provenance, public-domain/owned/licensed contradiction, absent public-domain evidence, benign clinical “pending” language, deterministic metadata ordering, no sensitive text leakage and malformed/duplicate identifiers.

## Known limitations

This is **not** a legal classifier, human reviewer, credential verifier, publication gate, or source-rights database reconciliation. It does not inspect independent `source_rights_events`, the actual publisher license, commercial screenshots, reviewer qualifications, source-byte reuse, PDF pages, claim accuracy, the current content catalog, or private learner notes. Heuristic phrases can be missed or yield false positives. A source status of `citation_only` must still not be used as permission to reproduce passages.

The check is **additive** to existing owner-only read-only catalog audit. The true pre-publish Review → Live transaction is *not* yet wired to this warning contract. Do not claim issue #326 fully closed. Before a future enforcement gate, bind exact note/source versions, the source-rights event trail and genuine independent rights/medical/References decisions under a separate reviewed change; this must be transactionally current and must fail closed if evidence is unavailable.

## Human decisions still outstanding

1. Independently verify eight source permissions and all twelve item versions (six notes + six linked questions), with item-specific evidence and dated reviewer identity.
2. Decide whether the currently published Core6 should remain live or be withdrawn under existing authorized governance; this memo grants neither action.
3. Correct draft-language only in six **new** reviewed note versions after rights/medical approval. Preserve originals and learner anchors.
4. Validate exact hosted owner audit response and learner visibility without leaking clinical/source bytes. Require exact-head CI, independent code review and distinct owner approval for integration/deployment.

**Release boundary:** This PR intentionally changes only a pure domain utility, existing owner-only read-only structural audit projection, tests and documentation. No migration, Auth grant, public route, content write, source status or live deployment.
