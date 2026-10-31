# MLOS private delivery-intent and acknowledgement reconciliation — 31 October 2026

**Status:** Experimental native PostgreSQL ledger prototype; **NOT an outbound delivery integration**, production authority, source/clinical approval, or proof of external content delivery.

## Problem and replacement

The earlier disposable `evidence_private.receipts.delivered_at` marker was misleading: a SQL commit did not mean any medical content, evidence metadata or response bytes actually reached an external recipient. If the provider rejected authentication after that commit, the old marker could still have been set. This milestone **removes the marker and old `deliver` function from the prototype**. The replacement separates staging, a one-shot dispatch intent and an independent externally observed durable acknowledgement.

This design never calls Supabase-managed `auth.users`/`auth.sessions` from SQL and never installs roles, policies, triggers, grants or migrations on provider-owned relations. It is not connected to an API route, mailer, learner page or real outbound provider.

## Explicit state machine

| State | Durable evidence in MLOS-owned database | Meaning |
|---|---|---|
| `staged` | Immutable `receipts` record: exact request, actor, session, subject epoch, digest | A source-review metadata request has been staged, **not sent** |
| `intent` | Exactly one `delivery_attempts` row per request, generated `attempt_id`, timestamp | A trusted server may consider a single outbound operation; **no bytes are sent by this prototype** |
| `uncertain` | Same attempt and ID; `mark_uncertain` may annotate an ambiguous result | Outbound response or commit cannot be inferred; **no automatic redrive** |
| `acknowledged` | Same attempt and an externally correlated acknowledgement digest/time | A separate trusted confirmer asserted a **durable external acknowledgement**. The test oracle is synthetic; no actual delivery proved |

`reserve_intent` runs under an MLOS-owned subject row lock and the existing epoch/lease check, then atomically inserts **at most one** attempt for that exact request. A second reservation returns only `reconciliation-required`, never another attempt ID. This is **at-most-one database intent**, not exactly-once provider delivery. The same request ID cannot bind a different actor/session/digest/epoch.

The confirmer role is separate from gateway/controller and cannot read private tables or invoke the reserve/stage functions. Only it may call `inspect_intent` and `record_ack`. `inspect_intent(request_id,digest)` recovers the generated attempt ID after a committed intent response is lost; it **cannot create a new intent**. The internal reconciler uses that attempt ID to query a trusted outbound provider for a durable record bound to request ID, attempt ID and digest. A negative, missing, mismatched or unavailable answer remains denied/uncertain; no success is inferred from a timeout, SDK return, private timestamp or JWT alone.

`record_ack` stores only the digest of the independent acknowledgement and is idempotent with the same digest. A different acknowledgement conflicts. It can record an **audit fact after private revocation** without granting dispatch rights; it does not reauthorize the original staging session or turn a receipt into learner-visible content. A compromised/confused confirmer could still assert a false receipt. Production requires verified provider-specific proof, credential isolation and authenticated callbacks.

## Failure and concurrency experiments

The native PostgreSQL 17.6 and 18.6 scripts plus unit suites cover:

- Provider unavailable/revoked token before SQL: fail closed without reserving intent.
- Provider denial after intent SQL commit: caller sees denied, but the durable intent remains unresolved; retry cannot dispatch again.
- Two concurrent reservation calls: one generated attempt, one `reconciliation-required`; row lock barrier observed, no duplicate attempts.
- Correct binding and replay: exact same staged request idempotent, altered digest conflicts, stale actor epoch remains invalid after re-enable.
- Negative external acknowledgement or lookup timeout: stays unresolved; `mark_uncertain` does not authorize a new attempt.
- Lost acknowledgement **database response after commit**: caller sees uncertain; a later independent lookup recovers and records the already durable acknowledgement idempotently.
- Lost intent **database response before the caller knows attempt ID**: trusted confirmer recovers the committed ID without redispatch; no provider acknowledgement means no completion assertion.
- Unauthorized access to private tables, controller or confirmer RPCs by wrong roles is denied; expired private leases still deny stage/reserve.
- Native cluster cleanup and identical tests on PostgreSQL 17.6 and 18.6.

**Evidence:** [Exact-head Actions CI](https://github.com/mdmoazzam291/Medical_Learning_OS/actions) under draft PR #346; the successful native test log must contain `Private authority delivery ledger PASS` and `Private authority acknowledgement PASS`. Do not promote this report to full exact-head green until both native jobs and the remaining CI matrix have finished successfully.

## Unresolved acceptance gates

1. **Real transport/provider:** No external provider, delivery channel, immutable receipt signature, provider idempotency contract, recipient confirmation, or actual payload streaming is implemented. Synthetic positive callbacks must not count as external delivery evidence.
2. **Verifier atomicity:** Network `getUser(token)` and MLOS SQL are not one transaction. Post-commit rejection can leave an intent that requires reconciliation. A stale yet still accepted JWT and provider-side revocation timing need independent security controls.
3. **Safety of retries:** Deliberately **no automatic new attempt** after an ambiguous commit/ack. Later compensation or manual review needs a measured operational protocol and verified provider-side idempotency key semantics, not a generic exponential retry.
4. **Least-privilege deployment:** Fixture PostgreSQL roles authenticate through a disposable native cluster only. Authenticated transport, secret rotation, role grants, ownership, RLS, restored ACLs and private cloud runtime remain unverified. `SECURITY DEFINER` cannot be exposed via public/anon RPC.
5. **Source, clinical, rights:** These synthetic digests confer **no** source-use permission, NMC competency mapping completeness, qualified medical review, exam publication or learner release.

**Decision:** Keep PR #346 DRAFT/unmerged; evidence gateway OFF, production Auth and learners untouched. The next meaningful design gate is an authenticated narrow connector and trusted external acknowledgement verifier with a reproducible restart/restore replay test—not a new UI feature.


## 1 November 2026 — signed external-ack adapter prototype (not a provider integration)

`scripts/lib/source-evidence-private-signed-ack.js` now exposes an **offline** server-only adapter, `createSourceEvidenceSignedAckLookup`, for use as the reconciler's `lookupDurableAck`. This does **not** contact or authenticate to any real provider. Its caller supplies an authenticated private `fetchSignedReceipt` implementation and an **out-of-band pinned Ed25519 provider public key**.

The detached signature covers a version-separated canonical field sequence: protocol, provider ID, expected recipient ID, request ID, one-shot attempt ID, original content digest, provider receipt ID, durable status, and UTC occurrence timestamp. It rejects mismatched destinations, provider identity, request/attempt/content bindings, unsupported or malformed key/signature material, extra/accessor fields, non-durable states and malformed time formats. No unsigned or SDK-success fallback is permitted; unverifiable/unavailable receipt lookup returns no proof. A valid signed assertion yields an exact request/attempt/digest-bound SHA-256 digest, not the provider signature or payload, for the existing restricted SQL audit. The `record_ack` SQL result is also constrained to an exact data-only `status` field before it can be reported as acknowledged.

**Limitations and gates:** A signature proves only that the **configured** private key signed the assertion. The fixture key pair is not a real provider's public key and offers no independent proof of actual message transfer, recipient receipt, clinical/source approval, or authorization revocation. A production adapter additionally needs provider identity and key pinning established independently, authenticated private read-only transport, key rotation/revocation protocol, provider-defined semantics for `durable` and receipt ID, recipient delivery contract, replay retention, audit and crash/restore testing, and independent review. Never accept a browser-uploaded signature, recipient configuration or trust anchor. Keep gateway OFF and PR draft until these requirements and exact-head CI are satisfied.


## 1 November 2026 — fixed-origin, credentialed receipt lookup contract (offline tests only)

`scripts/lib/source-evidence-private-receipt-http.js` adds `createSourceEvidencePrivateReceiptHttpLookup` as a **not-connected** transport adapter for the existing Ed25519 verifier. An explicit server-side caller must supply a fixed `https://<trusted-provider>/v1/receipts/lookup` endpoint, an independent `getCredential` secret source, and a fetch implementation. Configuration rejects HTTP, alternate ports, URLs containing credentials/query strings, loopback/IP hostnames and local/private-looking hostname suffixes. The operation sends exactly one fixed-path request with the original attempt and payload digest in its JSON body, no browser-provided URL or headers, no redirects, no cache and no retries. Server credentials are never returned to the caller. Non-200 responses, mismatched media types, malformed UTF-8/JSON, oversized responses (8 KiB), credential outages and transport errors yield no durable proof.

**Important contract qualification:** the HTTP lookup uses POST **only as a read-only query by hypothetical provider contract**; the provider must independently certify that this endpoint is read-only, cannot dispatch, and is idempotent. The current `fetchImpl` and credential source are supplied by tests only: no real remote endpoint, secret, live TLS peer identity, certificate pinning, key ownership, or transport authentication has been established. Fixed URL validation is not a complete defense against DNS rebinding or a compromised privileged fetch implementation; a production connector needs egress allowlisting, provider-controlled DNS, audited TLS/mTLS or equivalent authenticated channel, isolated server credentials, rotation, and signed provider semantics.

The new unit suite `tests/source-evidence-private-receipt-http.test.js` exercises method/origin/header constraints, zero-secret-use on bad input, network and content failures, and **simulated** loss of a database commit response followed by in-memory new-instance reconciliation using the same signed receipt, without re-dispatch. This is **not** a database crash/restart test or a real external-delivery proof. Only a provider-specific deployment/test environment and native DB recovery run can satisfy those pending acceptance gates.

**Decision unchanged:** PR #346 stays draft; gateway disabled, no release/publish or live Auth changes. CI must pass at the exact new head before even a test-only readiness claim.


## 1 November 2026 — native immediate-shutdown/WAL replay for private intent ledger

The existing `scripts/source-evidence-private-authority-pg-check.js` now uses the repository's disposable `crashAndRestart()` native PostgreSQL helper **on the private `evidence_private` schema itself**. The separate pre-existing `evidence_probe` crash test was insufficient evidence for this different schema. This regression is exercised by both existing PostgreSQL 17 and 18 CI jobs, with no new hosted connection or migration.

The added case asserts PostgreSQL `fsync`, `synchronous_commit`, and `full_page_writes` enabled, commits one `uncertain` intent and one `acknowledged` intent, leaves a third reservation uncommitted in an open gateway transaction, and executes `pg_ctl -m immediate` against the fixture. After automatic WAL recovery it requires a changed postmaster PID plus interruption/replay log markers, the original request/attempt IDs and states unchanged, the uncommitted attempt absent, and no second attempt returned on retries. It separately verifies a missing external receipt stays unresolved, a duplicate matching acknowledgement is idempotent, gateway direct table read remains denied, and private revocation survives subsequent role requests. Clients and the entire cluster are cleaned in the existing finally block.

**Scope:** This is a process-level immediate-shutdown durability test on synthetic MLOS-owned tables, not physical host/power loss, independent R2 backup/restore, real recipient delivery, external provider credential/TLS validation, or actual Supabase session revocation. The `acknowledged` record is still created by a synthetic confirmer assertion and does not prove a real provider signature or delivery. Do not infer safety of new outbound attempts from an absent intent when a separate real provider may have seen an untracked dispatch. The source/rights/medical review and provider identity/authorization gates remain unchanged.

Validation at the new exact PR head must include the `Private authority WAL recovery PASS` log marker **in both native jobs**; the existing older successful core/browser jobs cannot substitute. Keep the PR in DRAFT and outbound gateway OFF.


## 1 November 2026 — private Ed25519 key authorization and revocation-epoch gate (synthetic)

`scripts/lib/source-evidence-private-trust-gated-ack.js` composes the prior pinned Ed25519 signed-ack verifier with a separate, **mandatory for this wrapper**, private `getTrustState` decision. The adapter computes the exact SHA-256 SPKI DER fingerprint of its configured public Ed25519 key, and asks the injected authority for a data-only record binding `providerId`, `recipientId`, `keySha256`, strictly positive integer `epoch` and `enabled:true`. An unknown, unavailable, revoked or malformed decision fails closed **before any provider lookup**. The adapter then verifies a signed receipt and repeats authorization; the same key and epoch must still be positively authorized after the network operation. A revocation/rotation/re-enable epoch change prevents the receipt from being reported durable. The request tuple is snapshotted before either asynchronous call to prevent request/attempt mutation races; getter-backed, extra or malformed fields are rejected.

The `tests/source-evidence-private-trust-gated-ack.test.js` suite covers valid signatures with identical pre/post authorization epochs, revoked/foreign/wrong-key trust, invalid fields, unavailable authority, midflight key disable/rotation/epoch bump, and mutation of input after awaiting the first trust decision.

**Critical limitation:** This is still a disposable code contract and synthetic trust oracle, **not** real provider key ownership, online revocation propagation, cryptographic timestamp freshness, atomicity with a remote provider, or even an implementation of `getTrustState`. A dishonest/stale source could falsely report unchanged authorization. Actual integration must select and independently authenticate the provider, establish out-of-band key provenance, define epoch monotonicity and revocation consistency in an authoritative store, and verify private transport/egress controls; otherwise no production `durable` acknowledgement can be inferred. Key rotation must not re-authorize a revoked old key. The existing ungated prototype remains test-only; production must not bypass the trust gate.

**Decision:** PR #346 remains DRAFT, evidence gateway OFF. Source, rights and medical approval controls remain separate; this changes no clinical content, production DB, learner access or hosted authorization.


## 1 November 2026 — MLOS-owned provider signing-key registry with separated native roles

The test-only overlay `ops/prototypes/source-evidence/provider-key-trust.sql` adds a private provider/recipient signing-key registry, retired-key history and dedicated `evidence_private_key_controller` and `evidence_private_key_reader` logins to the disposable `evidence_private` PostgreSQL schema. **Never apply this overlay to hosted or production Supabase.** The key controller alone can explicitly enroll a new provider key, rotate to a distinct one or revoke; a revoked/rotated fingerprint cannot be silently re-enrolled for the same provider and recipient. Every actual transition increments a positive, safe-integer authority epoch; repeated revocation is idempotent. The key reader has only a fixed `key_state(provider,recipient,fingerprint)` EXECUTE privilege, no raw table access, and no key-writer privileges. Gateway, confirmer, subject controller and browser/public roles gain no new access.

`scripts/lib/source-evidence-private-key-trust-reader.js` is a fail-closed, fixed-statement, exact-value reader suitable as the trust-gated signed-ack prototype's injected `getTrustState`; its separate private connection cannot create or rotate provider authority. `scripts/source-evidence-provider-key-trust-pg-check.js` uses actual distinct native PostgreSQL role connections and signed synthetic Ed25519 acknowledgements to verify unconfigured key denial, exact key fingerprints and role isolation, credentialless test signing, revoked-key rejection, mid-flight revocation suppression before SQL acknowledgement, authorized new-key rotation, old-key retirement, and a real `FOR SHARE`/writer lock barrier. CI runs this new fixture against both isolated PostgreSQL 17.6 and 18.6 under draft PR #346.

**Security boundaries not satisfied:** This registry is only MLOS-owned *claimed* key authorization, not independently established real provider ownership or correctness of the signer. An authorized controller can register a fraudulent new key; production needs out-of-band key provenance, key custody/rotation review and independent approval. A statement-scoped `FOR SHARE` plus two pre/post reads does **not** make external network lookup and eventual SQL `record_ack` one atomic operation: a key may be revoked after the second check and before the acknowledgement audit write. Record-ack must therefore be redesigned to enforce the appropriate key/epoch authority within its own transaction or equivalent serializable private barrier before a real integration; do not count a positive prototype result as production-safe evidence. No public transport, hosted Auth change, real payload delivery, learner content or medical/source/rights approval is performed.

**Acceptance:** Both native jobs must show `Private provider key trust PASS` and `Private key trust disposable PostgreSQL cleanup PASS` at the latest exact-head commit. Keep the PR DRAFT, gateway OFF.


## 1 November 2026 — signer-epoch authorization locked inside audit transaction

The disposable `provider-key-trust.sql` overlay now defines `evidence_private.key_record_ack(request,attempt,digest,ackDigest,provider,recipient,keyFingerprint,epoch)`. This SECURITY DEFINER routine locks the exact MLOS-owned provider+recipient signing-key trust row **FOR SHARE** and requires the exact enabled fingerprint and epoch **inside the same SQL transaction** as the existing immutable request/attempt/digest acknowledgement write. A concurrent revoke/rotation writer updates that same row and must wait for an acknowledgement-first transaction, or an acknowledgement must fail after a revoker-first commit. The old four-argument `record_ack` EXECUTE privilege is explicitly **revoked from the confirmer role** by this overlay, preventing its direct bypass through the restricted test login. The owner remains a privileged fixture authority; this is not a production grant plan.

`scripts/lib/source-evidence-private-trust-locked-ack.js` composes the existing Ed25519 verification + pre/post key-epoch gate with a final direct trust read, then calls **only** the guarded eight-argument SQL statement. It delegates exact request/proof validation and recovery behavior to the established private reconciler. The latest trust state is captured as exact data-only fields; a transient denial, revoked key, malformed state, lost commit response or failed SQL guard cannot report a positive acknowledgement. `tests/source-evidence-private-trust-locked-ack.test.js` covers correct eight-argument binding, revocation after the final JS read, malformed/unsigned/unknown outcomes and inspection-based recovery.

The native `scripts/source-evidence-provider-key-trust-pg-check.js` now asserts raw-audit denial by confirmer and guarded-audit denial by gateway/reader, exercises a **real** key revocation after the final JavaScript check but before SQL writes (persisted intent remains unresolved), and verifies an ACK-first `FOR SHARE` lock forces the key-controller's concurrent revocation to wait until audit commit. Both independent PG17/PG18 CI jobs must pass, log `Private key atomic ack PASS`, and complete cleanup. The transaction's linearization order—not a later current authorization status—determines whether the historical audit was valid at write time.

**Still not proof of real delivery or end-to-end authority:** The private table is MLOS-owned and fixture-seeded, not a verified provider identity/receipt source. External cryptographic key ownership, actual provider-defined durable semantics, TLS/egress/credential security, genuine production Auth revocation and source/clinical/rights approval remain independent blockers. An authorized but malicious signing-key controller, compromised fixture confirmer or fraudulent pinned signer can still manufacture evidence. No hosted migration or production endpoint is enabled. PR #346 stays DRAFT and gateway OFF.
