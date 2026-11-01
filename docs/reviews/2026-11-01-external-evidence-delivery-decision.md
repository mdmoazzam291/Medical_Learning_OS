# Decision required — Does MLOS need external source-evidence delivery?

**Status: decision proposal, NOT accepted ADR or implementation authorization.** 1 November 2026. Security prototype [PR #350](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/350) remains DRAFT/unmerged, outbound gateway OFF.

## Observed application requirement

The existing learner/admin system already represents a local **Admin action inbox** with medical, references and rights review counts; `src/domain/admin-action-inbox.js` explicitly treats queue counts as triage rather than evidence of correct medical content or approval. The [merged evidence foundation #349](https://github.com/mdmoazzam291/Medical_Learning_OS/pull/349) defines source-row identity, metadata staging and controlled readback. It is merged into a **feature branch**, not deployed to production. Source-row adjudication, rights, clinical and exam-scope approvals remain independent.

The optional private-prototype ledger defines **staged → intent/uncertain → acknowledged** for a *hypothetical external delivery provider*. The `/v1/receipts/lookup` path and `mlos.delivery.ack.v1` signature scheme are **MLOS design contracts**, not verified endpoints or capabilities of a real vendor. A local Ed25519 signature proves only which local key signed it; it cannot establish external provider ownership, receipt semantics, recipient delivery or content approval. No actual outbound use case, receiving organization, retention agreement or independent provider is specified in [issue #347](https://github.com/mdmoazzam291/Medical_Learning_OS/issues/347).

## Options and recommendation

| Option | When justified | What to implement | What not to claim |
|---|---|---|---|
| **A. Internal source-review queue (recommended default)** | Source evidence is reviewed by MLOS's own Admin, source/rights and medical review workflow | Keep exact source metadata/version/digests in restricted storage; add or connect internal, immutable review-event IDs only after authority/rights review; treat notification/queue presence as UX and not delivery proof | No external provider, no `delivery_attempt`, no externally signed receipt, no `acknowledged external delivery` claim |
| **B. External organization/provider receipt** | A named recipient must durably receive evidence outside MLOS, and its independent receipt changes an operational decision | First establish provider, exact recipient, transport contract, independent key provenance, read-only receipt semantics, restricted credential, legal retention and remote sandbox; then implement a provider-specific adapter behind a separate reviewed flag | Passing fixture CI is not remote delivery, recipient acceptance, or clinical/source approval |
| **C. Internal async jobs/notifications** | MLOS needs eventual processing/notification without external proof | Use an internal idempotent task/event state and recovery protocol; only build once queue reliability requirements are measured | Internal job completion is not recipient acknowledgement or approval |

**Proposed owner decision:** Choose **A** unless a concrete independently operated recipient and contract exists. Do **not** infer a need for an external provider merely because the security experiment has implemented a receipt protocol. Leave the non-deployable #350 experiment as a draft until a verified business requirement justifies it; do not merge optional provider machinery as an accidental dependency of the already-merged foundation.

## Approval needed before additional external-provider engineering

If choosing B, the owner must specify what is being delivered (metadata only vs licensed source bytes; default metadata-only), **who** independently receives it, and **why** independent durable receipt is required. No provider, credentials, live infrastructure or legal rights should be selected or asserted before that decision. After owner approval, issue #347 demands separately collected endpoint and provider-key documentation, authorized sandbox identities and supported receipt semantics. A production rollout additionally requires fresh Auth/SQL/transport/backup/rights/clinical reviews, explicit feature flag, monitoring, rollback and separate merge/deploy approval.

## Non-negotiable cross-system boundaries

An Admin queue, internal task completion, outbound HTTP 200, provider signature, or remote acknowledgement **never** promotes content into an approved NMC competency mapping, correct medical explanation, cleared copyright status, or learner-facing publication. Keep `sourceReviewOnly=true` and all four release/approval flags false until their respective qualified reviewers and policy gates decide otherwise.

**No accepted decision recorded here; no code path, provider, production route or hosted data has been changed.**
