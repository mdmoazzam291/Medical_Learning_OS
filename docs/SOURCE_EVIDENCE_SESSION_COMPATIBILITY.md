# Source evidence: existing server session compatibility audit

Date:31 October2026 IST. Repository inspection and synthetic behavior checks only; not a hosted session/identity audit. No live users, credentials or grants inspected or changed.

## Existing boundaries confirmed

| Existing code | Observed behavior | Reuse and remaining gap |
|---|---|---|
| owner-api/index.ts request gate | Validates origin/method, Bearer access token via Auth getUser, then runtime access using verified user ID, then singleton content_admin_status_v1 | Suitable starting boundary for owner-only proposal staging. No evidence route currently wired; Admin membership is not exact package authority or source permission |
| owner-api/_shared/runtime-access.ts | Extracts session_id only after caller's identity verification; invokes learner_runtime_access_v1 with separately supplied verified user ID | Reuse call order; never call helper alone as token authentication. Its decoded token claims do not verify signatures |
| 20261003153000_owner_operations_v3.sql runtime RPC | Requires undeleted Auth user, no current banned_until and matching auth.sessions ID/user; server-only EXECUTE | Useful current-state gate. No evidence package/grant/source rights or shared prototype lock is included |
| 20260929032000_single_content_admin.sql | is_content_admin reads one governed account; legacy reviewer helpers join the singleton Admin and existing review kinds | Singleton Admin cannot supply genuine independent source-row reviewer authority. Do not silently widen these helpers or reuse baseline dispositions/grants |
| review-api/index.ts | Verifies identity/runtime; protected actions use Admin/review-kind checks through current governance | Existing protected shell may be reusable, but exact source-row-package reviewer targets/independence need separately designed authorization; current singleton assumptions remain |
| syllabus-baseline-drafts request adapter | Explicit server actor passed to service-role RPC and exact input validation | Reusable delegation pattern; candidate body must never set actor/rights/grants or be treated as trusted SQL context |

The compatibility test executes the existing runtime helper with synthetic tokens/RPC fixtures. It confirms actor/session argument binding, missing/malformed session denial, account/session denials and unavailable lookup denial. These tokens are deliberately not authenticated; the test does not claim Auth getUser verification, revocation propagation, real consent or session lifecycle acceptance. Existing owner-operation tests separately assert route gate placement.

## Evidence adapter requirements still blocking release

- Map the verified server user to immutable package owner/author. Broad Admin status alone must not authorize every package; missing mapping denies.
- Recheck current account/session/runtime and exact source metadata rights at staging and postcommit readback, under a proven common serialization protocol with relevant authority writers. Existing Auth/session/suspension writers do not share the prototype advisory lock merely because both checks exist.
- Use explicit exact package ID/version/digest and case/source resolution. Keep withdrawal, clinical/rights/exam decisions and learner publication separate.
- Independent reviewer access cannot be added under an unconditional singleton owner gate. Use a separately reviewed typed-target path with genuine identity/consent/qualification/independence, author exclusion and revocation; default deny until available.
- Validate real expired/revoked/wrong-user sessions, suspended/deleted accounts, cross-account package requests, withdrawn source, unavailable authorization store, CORS/body limits, no-store/error privacy and postcommit revocation in disposable hosted-equivalent acceptance before exposure.
- Prototype authority/source-policy fixtures and crash/recovery checks do not certify current production tables, policies, settings or deployed function versions. No production migration, API enablement, new session or reviewer grant follows from this audit.

Next: a concrete owner-only hosted-adapter proposal mapping these existing boundaries to exact evidence authorization, with disposable platform/Auth fixtures first. Current source-rights and independent-reviewer gates remain unresolved; no learner activation.
