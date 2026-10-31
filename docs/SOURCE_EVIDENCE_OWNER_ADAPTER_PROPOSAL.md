# Owner-only evidence adapter proposal

Date:31 October2026 IST. Status: proposal and disposable compatibility fixture only. No route, migration, platform configuration or real permission enabled.

## Scope and choice

Use the existing owner-api verified identity/runtime/Admin shell for private metadata staging and exact owner readback, then narrow authority by immutable package owner and current source policy. Keep actor identity server-derived. This reuses existing capability without pretending broad Admin status is a per-package grant.

Direct browser SQL/table access would create a second authority boundary; independent reviewer access under the singleton owner gate would conflict with the required author exclusion. Neither is part of this first adapter. New reviewer access needs its own typed-target contract and genuine independent identities/consent. Source archival/display and learner publication stay disabled.

## Proposed request boundary

| Proposed private operation | Exact inputs | Result after current authorization |
|---|---|---|
| POST /owner/source-evidence/packages | Existing staging candidate: requestId, packageId, packageVersion, expectedPackageDigest, cases | Minimal original staging receipt, only after durable commit and separate verified readback |
| GET /owner/source-evidence/packages/{id}/revisions/{version} | Explicit digest and actor-scoped staging requestId; no latest fallback | Bounded private metadata/receipt projection |
| Future exact case projection | Existing complete package/case version and digest selection | Selected source hash/edition and metadata, bytesVerified:false; no source URL |

These paths are design names, not implemented endpoints. POST raw UTF-8 input must be capped before parsing at16MiB; then strict ordinary-shape/case-count/canonical limits apply. Unknown query/body keys reject. A request body cannot set actor, session, feature authority, rights, current package status or reviewer grants. No protected descriptions, PDF bytes/images or tokenized links enter these records.

## Gate order

1. Enforce current origin/method rules; verify Bearer access token with the existing Auth getUser call. Do not authorize from decoded sub, user metadata or a client isOwner boolean.
2. Derive verified actor ID and session_id using the existing post-verification helper. Call current learner_runtime_access_v1 for user/session row binding, deletion and suspension, then current singleton Admin predicate. Feature capability must independently default off. No source-evidence feature key is enabled in the app by this proposal.
3. Validate/capture candidate and recompute JavaScript canonical digests. Resolve current governed metadata rights for every referenced source. Missing policy or unavailable authority fails closed. A correct source hash does not verify PDF bytes or retention/display rights.
4. Use a server-only transaction capability. Existing package ownership is immutable; new package owner/author is the verified creator, and a new Admin cannot inherit another account's package through singleton membership. No implicit ownership transfer or break-glass projection exists here.
5. Stage with exact request/revision bindings and atomic canonical metadata/cases/request/event writes. SQL prototype returns committed, not HTTP accepted.
6. After actual commit, independently recheck the current session/account/Admin/feature, exact owner/source policy and withdrawal state through protected readback; rehash bytes, receipt and case/source bindings. Only then emit accepted. Old historical receipts are not bearer capabilities.

A session change alone does not alter the actor-bound staging fingerprint. A newly authenticated session for the same actor may reconcile the original request; the revoked old session remains denied. Never store raw access/refresh tokens in package, receipt, source policy or logs.

## Failure and retry contract

- Invalid/expired token or inactive session: no evidence operation. Suspended/deleted account, off capability or missing current authority denies. Hide inaccessible target existence; sanitize SQL internals and avoid enumeration.
- Exact retries return the original receipt only after current authorization and verified readback. Changed request/revision conflicts cannot overwrite.
- Unknown commit acknowledgement/readback outcome: uncertain, no accepted receipt; retain the same requestId for reconciliation.
- Postcommit session/rights/withdrawal denial: denied, no accepted receipt, while committed audit history remains governed.
- Corrupt canonical bytes/binding: integrity failure, no projection. Error bodies/logs never include credentials, protected claims or raw database messages.
- Responses are private/no-store; no public list/view/static bundle, worker cache or source-byte serving is introduced.

## Disposable compatibility fixture

platform-gate.sql adds a default-off private fixture feature row and session-gated invoker wrappers around the existing staging/readback prototype. The script extracts the exact current repository learner_runtime_access_v1 and is_content_admin definitions, creates minimal synthetic auth.users/auth.sessions/Admin tables and verifies their behavior without rewriting those function bodies. The runtime RPC is server-only SECURITY DEFINER as existing source specifies; the wrappers remain server-only SECURITY INVOKER.

Checks cover valid owner stage/readback, missing/foreign/revoked sessions, fresh-session idempotency, account ban/deletion, missing runtime result, Admin change without package ownership transfer, source policy/withdrawal and postcommit off capability, plus browser/backend ACLs. Administrative resets are fixture operations, not a production reactivation flow. No real token signature/expiry/refresh/MFA/session lifecycle or actual deployed SQL version is verified.

## Release blockers retained

The disposable service_role deliberately retains raw stage/readback EXECUTE and table INSERT privileges for lower-level probes. It can bypass these wrapper-only session/Admin/feature gates. Default-off here is not a database-wide backend capability boundary. No production route exists. A release privilege review must either explicitly retain the existing trusted-backend threat model with locked-down route/RPC delegation and code-level enforcement, or design a narrower capability role. Revoking raw EXECUTE alone would also break SECURITY INVOKER wrappers; any elevated private bridge requires separate least-privilege/search_path/ACL analysis. Do not apply this fixture grant set as a production policy.

The prototype evidence lock serializes its private writers; actual Auth session deletion, account suspension and feature/Admin writers do not acquire that lock merely because a wrapper calls the runtime RPC. A real transaction/row-lock or equivalent protocol and independent-connection revocation tests are required. Postcommit fresh checking reduces the exposure window but is not proof that all real authority transitions are serialized or that delivered metadata can be clawed back.

The existing eight-table evidence snapshot excludes synthetic Auth, Admin membership and the new fixture feature row. It is not a platform/session backup. Production restore must reconcile current revocations and feature configuration, avoid reviving old sessions, and remain disabled until authority is independently established. Register actual schema/adapter ownership, export coverage and restore gaps before implementation.

Before any hosted route: review the concrete migration/ACL/RLS/function privilege plan; test current deployed Auth/runtime behavior with two real isolated accounts; prove exact ownership/source permission and current revocation ordering; verify origin/body limits/private caching/error privacy; validate recovery and denial after restore; resolve source rights and genuine reviewer gates. This proposal supplies none of those real approvals or production changes.

Verified disposable implementation: ce3c63f0bbee3d29627843d490d6dfad31b5e2d2, [Foundation run41173028054](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41173028054), native/platform job124454806451 SUCCESS. Local1,625 tests and repository checks passed. This verifies the fixtures above, not a hosted adapter or production privilege plan.

## Offline delegation extension —31 October2026

The later capability overlay (acbec7548b0a1f0dcc807d567d0a946ff4a25e5e) narrows a separate fixture gateway login; two private bridges use a non-login/non-bypass executor. It does not change the broad existing service_role. Synthetic Auth mutation triggers prove a fixture protocol only; current real provider writers still do not share it.

The test-only delegation closure now accepts trusted verifier/query callbacks and caller token/candidate or token/exact target, derives identity privately, and dispatches only gated prepared SQL. It verifies again after commit and withholds acceptance until canonical readback and original receipt binding pass. Synthetic tests cover malformed/unverified identity, caller authority injection, delayed mutation, concurrent actor isolation, readback corruption, unknown delivery and revoked-session reconciliation. The closure is not an actual Auth SDK verifier or production credential boundary. The [deployment gates](SOURCE_EVIDENCE_GATEWAY_DEPLOYMENT_GATES.md) record the remaining direct-login/transport/secret, provider Auth locking, HTTP privacy/body and rights requirements before exposure.
