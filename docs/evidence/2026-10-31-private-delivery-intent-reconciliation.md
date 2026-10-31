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
