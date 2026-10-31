# Source-evidence canonical foundation — isolated reviewer handoff

**Status: DRAFT, metadata-only, no hosted adapter or publication.** Scope: [PR #349](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/349), based on the existing dual-exam competency evidence branch. The private-security PR [#350](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/350) is stacked on this foundation and **must not** be mistaken for part of the canonical contract.

## Supplied technical evidence

The isolated foundation contains canonical source-row and version identifiers, exact-source binding and digest logic, source access/resolution/staging contracts, original-request receipts, conformance harnesses and disposable metadata database/withdraw/restore prototypes. Primary documents: `docs/SOURCE_ROW_REVIEW_CONTRACT.md`, `docs/SOURCE_ROW_EVIDENCE_DIGESTS.md`, `docs/SOURCE_EVIDENCE_STAGING_CONFORMANCE.md`, `docs/SOURCE_EVIDENCE_DATABASE_DESIGN.md`, `docs/SOURCE_EVIDENCE_RESOLUTION.md`.

The conformance fixtures explicitly distinguish **committed evidence**, **lost acknowledgement / uncertain outcome**, **current authority denial**, and **verified protected readback**. Synthetic actor identities and mock rights decisions are not authenticated users or clinically/legally approved source material. The disposable SQL and stored receipts are **not** real independent reviewer approval, provider delivery, production authorization or a durable backup guarantee.

The first split exact-head core run [41244828381](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41244828381) showed **1,615 tests passing, zero failing**; browser/WebKit remained underway. Re-verify this document commit at the new exact head before review completion.

## Review acceptance and dependencies

1. Inspect canonical ID, version, digest and source-rights invariants and their negative tests. No duplicate or modified source bytes may inherit an older review decision.
2. Separate the staging contract from the optional private external-delivery implementation in #350. An internal committed receipt is **not** an external delivery acknowledgement.
3. Review transaction/rollback, exactly scoped source authorization, denied-state readback and offline restore evidence. Managed Auth integration, hosted grants, private credentials and production backups remain separate.
4. Require independent qualified source, clinical, copyright and exam adapter review before any learner exposure. Do not merge or deploy based on the offline conformance suite.

Original draft #346 and its cross-cutting `docs/AI_HANDOFF.md` / `docs/STATUS.md` are preserved intact. This concise handoff does **not** copy their interleaved historical status claims. Reconcile the historical two-file log separately under [issue #351](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/351).

**Next accountable action:** code review and exact-head CI, then an explicit separate decision on whether a real provider-delivery system is needed at all.
