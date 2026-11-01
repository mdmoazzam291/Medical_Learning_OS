# Core6 reviewer evidence worksheet — pending, not an approval

**2 November 2026 | Issue #326 | Status: REVIEW REQUIRED / ALL DECISIONS UNVERIFIED**

This is an **intake/triage worksheet**, not a source-rights determination, medical sign-off, publication receipt or readback of the live database. Its starting facts come from issue #326's **read-only 25 October 2026** production audit of `study_catalog` v446. The data may be stale; verify the present versions, fingerprints, rights history and publication state using the existing authenticated Admin and Content Review workflows **before** any human disposition. No source bytes, clinician names, authenticated credentials or reviewer approvals are fabricated.

## One-pass human workflow

1. **Rights first, per exact source version (8 sources).** A qualified authorised Rights reviewer opens the original document/permission evidence and decides whether the *actual use* (factual citation, copied text, screenshot, derivative item) is allowed. Record the source ID, exact version and fingerprint, real rightsholder/permission or legal reuse basis, allowed uses, limitations, identity, timestamp and immutable event receipt. A public URL, publication in a book, screenshot or PDF upload is **not** proof of public domain. A past `rights.status=public_domain` is **not** itself sufficient when historical evidence says decisions were pending.
2. **Check each exact item (6 notes + 6 linked questions).** The authorised **Medical** reviewer verifies the correct answer, explanation, clinical content, scope and date-sensitive guidance; the **References** reviewer confirms the source actually supports each linked assertion/page/edition; the **Rights** reviewer checks each item's use and provenance. Store separate exact-version decisions and real reviewer identity with item-specific rationale. A shared source can be inspected once but cannot substitute for per-item medical/reference decisions.
3. **Owner resolves current publication risk.** Authorized governance decides whether existing Core6 publication remains or is withdrawn during remediation. Do **not** auto-withdraw. When decisions permit, create **six new immutable note versions**, using draft → submit → reviewed → verify → Review → Live; remove outdated draft labels only from the new versions and retain source/version links, study history and NeuralVault anchors.

## Exact note versions — known from issue #326

All six rows below remain **UNVERIFIED**. Do **not** assume that an historical stored `approved` event, hash match, or label conclusively proves a real qualified review.

| Note topic | Original immutable note-version ID | Current verified ID/hash and timestamp | Medical decision | References decision | Item-level Rights decision |
| --- | --- | --- | --- | --- | --- |
| Brown-Sequard syndrome | `b1a1bcf5-4d51-4033-97d1-d26367cb4ed2` | **Obtain** | **Pending real reviewer** | **Pending real reviewer** | **Pending real reviewer** |
| Case fatality | `f5c6013c-d62b-425d-bd8b-7523907c443c` | **Obtain** | **Pending real reviewer** | **Pending real reviewer** | **Pending real reviewer** |
| Marfan phenotype/FBN1 | `7656021e-10ce-4366-ae98-78fa3b19d200` | **Obtain** | **Pending real reviewer** | **Pending real reviewer** | **Pending real reviewer** |
| Opioid toxicity | `1406298d-2dd2-4e83-a72e-d5748195dce2` | **Obtain** | **Pending real reviewer** | **Pending real reviewer** | **Pending real reviewer** |
| OTC deficiency | `cd1d1661-7f7d-4886-ab64-c865028f23d3` | **Obtain** | **Pending real reviewer** | **Pending real reviewer** | **Pending real reviewer** |
| Acute aortic dissection imaging | `accaa555-2be9-44f7-929f-55cd7f3d37a3` | **Obtain** | **Pending real reviewer** | **Pending real reviewer** | **Pending real reviewer** |

### Linked questions — do not fabricate IDs

Issue #326 confirms **six linked published questions**, but does not list their exact question IDs/versions. Obtain all **six** current exact question-version IDs through the authenticated canonical catalog, confirm note-question edges, and record for each:

`questionId` · `questionVersionId` · question-content digest · exact linked `note_version_id` · source IDs/versions/fingerprints · qualified Medical decision/receipt · References decision/receipt · item Rights/provenance decision/receipt · review time and permissible use. **All six are pending actual inspection.** Do not infer the IDs from note titles, student answers, PYQ similarity, or stale database exports.

## Source rights — eight distinct sources

Issue #326 reports **eight** sources historically set to `public_domain`; their evidence may contradict that status. Only these two exact IDs were recorded in the issue; retrieve the remaining six from a fresh authenticated owner catalog and verify their exact version/fingerprint. Never count placeholder slots as actual known sources.

| Source ID | Recorded concern | Fresh exact version and fingerprint | Verified rights basis / permitted uses | Qualified reviewer disposition |
| --- | --- | --- | --- | --- |
| `SRC-be6ce72162b7a18d92bf` | Described as commercial recall screenshots/annotations with unknown rights despite a public-domain label | **Obtain** | **Not established** | **Pending** |
| `REF-GR-OTC-NBK154378` | Historical audit could not verify full passage; separate support and reuse checks required | **Obtain** | **Not established** | **Pending** |
| Six remaining source IDs — **unknown** | Must be enumerated from actual current catalog; do not assume identities or rights | **Obtain** | **Not established** | **Pending** |

### Minimum evidence per source

- Immutable `sourceId`, source version or edition, exact fingerprint and date captured; describe which content used it and **how** (fact, quotation, translated/paraphrased expression, table, image, screenshot, copyrighted recalled item).
- Primary rights basis: actual ownership, license URL/file and covered terms, written permission, demonstrably lawful public-domain status, or **citation-only** with no protected expression reused. Keep limitations, attribution terms, territory/use scope, expiry and withdrawal.
- Independent authorised reviewer identity + active grant; dated inspection of actual materials; **specific** rationale and disposition, not reused generic text.
- Exact-event receipt and current-state revalidation before new publication. A policy draft, automated keyword warning or matching old status does not make the source rights-verified.

## Minimum evidence per medical/reference item

- Identity: immutable note/question version ID, digest, source link versions and retrieved date.
- Medical: diagnosis/management accuracy, applicable guidelines, contraindications if relevant, question stem/answer consistency and reasoned reviewer limitations.
- References: real page/section, exact claims covered, conflicting evidence and scope of support.
- Rights/provenance: copyrighted expression reuse audit (including any screenshots), author declaration and source disposition.
- Each **real** approval or rejection must carry qualified reviewer identity and immutable exact-version receipt. Owner publication must remain separate.

## Release decision gate

`NO CONFIRMED HUMAN REVIEW` → `UNDER REVIEW` → only after independent Medical + References + Rights verified for exact versions, original rights evidence resolved, authorised owner decision and authenticated readback → `ELIGIBLE FOR OWNER REVIEW→LIVE`. **No automatic transition and no permission granted by this document.**

**Current facts versus actions:** This document is a review plan built from issue #326's historical audit, not a new authenticated observation. Nothing here changes `study_catalog`, note text, source status, reviewer grants, learner visibility, exam suitability or learning-state evidence. The real Admin audit warning contract under draft PR #376 is separate and likewise non-authoritative.
