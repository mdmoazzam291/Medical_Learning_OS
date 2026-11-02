# Core6 reviewer evidence worksheet — pending, not an approval

**2 November 2026 | Issue #326 | Status: REVIEW REQUIRED / ALL DECISIONS UNVERIFIED**

This is an **intake/triage worksheet**, not a source-rights determination, medical sign-off or publication receipt. A later metadata-only production readback establishes identities and stored state only. Its starting facts come from issue #326's **read-only 25 October 2026** production audit of `study_catalog` v446. The data may be stale; verify the present versions, fingerprints, rights history and publication state using the existing authenticated Admin and Content Review workflows **before** any human disposition. No source bytes, clinician names, authenticated credentials or reviewer approvals are fabricated.

## One-pass human workflow

1. **Rights first, per exact source version (8 sources).** A qualified authorised Rights reviewer opens the original document/permission evidence and decides whether the *actual use* (factual citation, copied text, screenshot, derivative item) is allowed. Record the source ID, exact version and fingerprint, real rightsholder/permission or legal reuse basis, allowed uses, limitations, identity, timestamp and immutable event receipt. A public URL, publication in a book, screenshot or PDF upload is **not** proof of public domain. A past `rights.status=public_domain` is **not** itself sufficient when historical evidence says decisions were pending.
2. **Check each exact item (6 notes + 6 linked questions).** The authorised **Medical** reviewer verifies the correct answer, explanation, clinical content, scope and date-sensitive guidance; the **References** reviewer confirms the source actually supports each linked assertion/page/edition; the **Rights** reviewer checks each item's use and provenance. Store separate exact-version decisions and real reviewer identity with item-specific rationale. A shared source can be inspected once but cannot substitute for per-item medical/reference decisions.
3. **Owner resolves current publication risk.** Authorized governance decides whether existing Core6 publication remains or is withdrawn during remediation. Do **not** auto-withdraw. When decisions permit, create **six new immutable note versions**, using draft → submit → reviewed → verify → Review → Live; remove outdated draft labels only from the new versions and retain source/version links, study history and NeuralVault anchors.

## Exact note versions — historical IDs corroborated by read-only metadata on 2 November

All six rows below remain **UNVERIFIED**. Do **not** assume that an historical stored `approved` event, hash match, or label conclusively proves a real qualified review.

| Note topic | Original immutable note-version ID | Observed version/stored hash (2 November; not review) | Medical decision | References decision | Item-level Rights decision |
| --- | --- | --- | --- | --- | --- |
| Brown-Sequard syndrome | `b1a1bcf5-4d51-4033-97d1-d26367cb4ed2` | v1 · `c5e389ffa0a8c2cfd6690f8d3558ae7112c3b17c3d593d048112fe39558acf5e` | **Pending real reviewer** | **Pending real reviewer** | **Pending real reviewer** |
| Case fatality | `f5c6013c-d62b-425d-bd8b-7523907c443c` | v1 · `b0752624c2ef340c93ae4c02c2867980cb410f423d9130ce7d4d9bea5309f220` | **Pending real reviewer** | **Pending real reviewer** | **Pending real reviewer** |
| Marfan phenotype/FBN1 | `7656021e-10ce-4366-ae98-78fa3b19d200` | v1 · `6e352e79d3414d51a1c8ddf2f339f3ef0aa8af63e77f8a7bb947a5bb6cbd7254` | **Pending real reviewer** | **Pending real reviewer** | **Pending real reviewer** |
| Opioid toxicity | `1406298d-2dd2-4e83-a72e-d5748195dce2` | v1 · `9ee48bf10837fd07cb0992aa025f97b51b7be160de1ad36812cd6f24a9c65f46` | **Pending real reviewer** | **Pending real reviewer** | **Pending real reviewer** |
| OTC deficiency | `cd1d1661-7f7d-4886-ab64-c865028f23d3` | v1 · `d1f5ffaa082c8148315d1ca3a0023812c9bafb93bea879ce6445ccfc6c1430b4` | **Pending real reviewer** | **Pending real reviewer** | **Pending real reviewer** |
| Acute aortic dissection imaging | `accaa555-2be9-44f7-929f-55cd7f3d37a3` | v1 · `fff5ac078a2a86374a9c5149eed8e15da7e3801c8a1546e1e9205796242a6c4a` | **Pending real reviewer** | **Pending real reviewer** | **Pending real reviewer** |

### Linked questions — exact live metadata enumerated

A read-only query at **2026-11-02T07:13:13.609571+00:00** observed catalog **v446**, six original published v1 notes and these six linked published question versions. No stems, answers, explanations, source passages or author/learner identities were retrieved. All human decisions remain **pending**. Full metadata receipt: [Core6 ID inventory](../evidence/2026-11-02-core6-id-inventory.json).

| Exact question-version ID | Linked immutable note version | Stored state | PostgreSQL JSONB-record SHA256 |
| --- | --- | --- | --- |
| `Q-38941e7ca54ca59b2882@1` | `7656021e-10ce-4366-ae98-78fa3b19d200` | published; human decisions pending | `73e3962e11f27cc6addfeafe154ba4ba58ab24c6ab52e44a6820ca8489f06b30` |
| `Q-467605f7db6bcd36ea4c@1` | `f5c6013c-d62b-425d-bd8b-7523907c443c` | published; human decisions pending | `f33146630eec93f4c55ade52bf6eee98882308d4f94eb0ba21263e7e96f6ca70` |
| `Q-8e473691761d87c98b08@1` | `accaa555-2be9-44f7-929f-55cd7f3d37a3` | published; human decisions pending | `8ce827b901d339e3ba931cea5f33c59b9bed5ca209b6fe5773b54b1180f718cb` |
| `Q-a625bf5ef324eb626f77@1` | `cd1d1661-7f7d-4886-ab64-c865028f23d3` | published; human decisions pending | `654b81886c007ffa98cd12ed4f74a5e8891a96f4338e253ed27d196e3cb00387` |
| `Q-deca3e2b2fe91cbc5d37@1` | `b1a1bcf5-4d51-4033-97d1-d26367cb4ed2` | published; human decisions pending | `984133dbf7beefa4a1061e73f5411da9cf57e97a924ee38f5abc7480444b28a1` |
| `Q-fc64d829499fde015469@1` | `1406298d-2dd2-4e83-a72e-d5748195dce2` | published; human decisions pending | `07c821f328e7e7a20caf9963ccf8d0c5d695effdeeb6e5ba9d2b469ca7215740` |

Question/source hashes fingerprint PostgreSQL JSONB serialization of complete stored records, calculated server-side. They are **not** the domain canonical/JCS digest or proof of medical/source-byte correctness. Note hashes above are stored content_sha256 values, not independently recomputed. Revalidate exact versions and fingerprints before any decision.

## Source rights — eight distinct sources

The 2 November read-only snapshot enumerated all **eight** sources. Each still stores `public_domain`; this is an **unverified stored claim**, not a confirmed legal determination. Historical commercial-recall/source-support concerns remain open. Exact recorded editions and JSONB fingerprints are in the metadata receipt.

| Exact source ID | Recorded version/edition | Stored rights claim | Qualified rights disposition |
| --- | --- | --- | --- |
| `REF-AHA-AORTA-2022` | 2022; accessed 2026-10-24 | `public_domain` — unverified | **Pending real reviewer** |
| `REF-CDC-CFR-L3S3` | Archived lesson 3 section 3; accessed 2026-10-24 | `public_domain` — unverified | **Pending real reviewer** |
| `REF-DM-NALOXONE-b1303f15` | setid:b1303f15-c48b-a44d-b28a-72f370094e02; accessed 2026-10-24 | `public_domain` — unverified | **Pending real reviewer** |
| `REF-GR-OTC-NBK154378` | indexed excerpts accessed 2026-10-24 | `public_domain` — unverified | **Pending real reviewer** |
| `REF-NLM-MARFAN` | accessed 2026-10-24 | `public_domain` — unverified | **Pending real reviewer** |
| `REF-NLM-MESH-D018437` | MeSH 2026; accessed 2026-10-24 | `public_domain` — unverified | **Pending real reviewer** |
| `REF-NLM-OTC` | accessed 2026-10-24 | `public_domain` — unverified | **Pending real reviewer** |
| `SRC-be6ce72162b7a18d92bf` | sha256:be6ce72162b7a18d92bf0a2e821261e7ce8b44374cdadd467393a63618f91d1b | `public_domain` — unverified | **Pending real reviewer** |

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

**Current facts versus actions:** This document combines the historical review plan with the 2 November metadata-only authenticated production readback. Identifiers/state/fingerprints are observed; human verification remains pending. Nothing here changes `study_catalog`, note text, source status, reviewer grants, learner visibility, exam suitability or learning-state evidence. The real Admin audit warning contract under draft PR #376 is separate and likewise non-authoritative.
