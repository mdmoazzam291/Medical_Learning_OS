# Evidence gateway deployment gates

31 October2026 IST. Design/verification record only. No credential provisioned, runtime connector selected, migration or endpoint enabled.

## Credential and identity routing

The intended server flow is authentic exact-token verification → private delegation closure → dedicated narrow database login → two gated functions. The browser never receives a database password, verified-context object or raw RPC capability. Authentication must use the existing server `auth.getUser(token)` boundary; decoded claims and user metadata cannot replace it. Verify the same immutable token again after a staging commit, then obtain separately gated readback. Keep runtime account/session and immutable package/source policy checks inside the SQL transaction even if getUser just succeeded.

Do not substitute the existing broad service_role SDK client for the narrow database connection. The disposable overlay does not revoke its old probe privileges. A real connector must log in directly as the reviewed gateway capability (or an independently proven equivalent restricted authenticated transport), never authenticate as postgres and SET ROLE afterward. Verify session_user/current_user, membership graph, function owner/search_path/ACLs, RLS policies, search-path writable schemas and role default grants at provisioning and restore. A publishable-key authenticated client cannot simply assume this private database role. PostgREST custom-role/JWT exposure needs its own schema/role/authenticator review and is not supplied here.

The prototype closure accepts trusted verifier and query callbacks only at server construction. Its input objects accept only token/candidate or token/exact target. Tokens are never SQL parameters or receipt fields. Fixed statements call stage_session and readback_session; no caller SQL, role, actor, session, feature or approval overrides. Returned statuses/errors contain no raw Auth/SQL message. Candidate capture precedes the verifier await. Delivery requires exact canonical bytes, recomputed package/manifest/request/receipt binding, current gated access and original receipt.

These are code-level controls inside the trusted server. A compromised query/verifier or stolen gateway credential can supply the real owner's actor/session parameters. The database does not cryptographically authenticate delegated parameters. Keep the credential in a private server secret boundary, restrict its process/network use, use authenticated transport, and audit rotation/revocation without logging tokens. Stronger protection from server compromise requires a separate signed-delegation/key/issuer design; no such protection is claimed.

The trusted query callback must execute each fixed statement in its own autocommit transaction and resolve only after commit acknowledgement. Do not inject a client in an open caller-managed transaction: SQL returning committed inside that transaction is not proof of durable commit. A generic callback cannot establish this property by itself; the current PGlite integration uses autocommit. A real connector must prove statement completion, pool/session cleanup, rollback and lost-acknowledgement behavior before acceptance.

The offline verifier map in scripts/source-evidence-delegation-db-check.js is synthetic, not a token signature/expiry/issuer/audience/MFA test. Unit callback tests prove delegation sequencing. Actual Auth SDK/client setup, connector lifetime/pooling/transaction semantics and safe provisioned secret names remain implementation work.

## Provider Auth ordering strategy

The global mutation triggers in the disposable fixture prove ordering only when every synthetic writer acquires the same lock. Real provider Auth does not participate. Installing those triggers onto provider-managed tables without evidence is not an acceptable implementation shortcut.

Preferred next investigation: transaction-scoped row locks on the exact account/session and Admin/feature authority rows, with a documented lock order and fresh current-state reads. FOR KEY SHARE is insufficient for non-key suspension/feature updates; FOR SHARE or an equivalent audited mechanism is needed. Account/session deletion cascades, provider session rotations/cleanup and Admin transfer may take locks in a different order, so inspect actual provider behavior and prove both writer-first and evidence-first cases plus rollback/deadlock recovery under a disposable representative schema. No row-lock SQL or Auth schema privilege changes are approved by this record.

Alternative: retain serializing writers behind an explicitly governed private authority service, provided every provider/session mutation is provably covered. A separately versioned revocation ledger must fail closed on stale/unavailable provider state and cannot silently stand in for Auth. Neither alternative currently meets hosted acceptance. Postcommit rechecks reduce exposure but do not recover already delivered metadata.

## Evidence required before hosted implementation

- Authentic expired/forged/revoked/wrong-user token cases against the actual verifier, with two isolated accounts and no source material.
- Real restricted credential routing, direct-login escalation denial, feature default off and no broad-client fallback.
- Representative provider mutation/lock-order races with current deployment PostgreSQL/Auth definitions, not just minimal fixture fields.
- Exact-source policy governance and denied-state restore reconciliation; eight-table evidence export excludes Auth/Admin/feature/roles/triggers.
- HTTP origin/method/exact-key/streaming byte limits before JSON parse, no-store/private caching, bounded sanitized failures, timeout/cancellation and retry reconciliation. Parsed-object cap is not a streaming HTTP cap.
- Independent permission/rights/reviewer governance review. These receipts grant no clinical, rights, exam or learner-release authority.

Reference: official [getUser documentation](https://supabase.com/docs/reference/javascript/auth-getuser) checked31October2026 states it contacts Auth and returns authentic user data. Repository owner-api verifies before the existing runtime helper decodes session_id; the prototype preserves that order without changing product runtime. Changelog checked: TLS cipher deprecation and PostgreSQL patch-version notices affect future connector/deployment validation, not this offline JS API.

## Disposable row-lock investigation —31 October2026

The separate authority-row-locks overlay exercises FOR SHARE on exact synthetic account/session/Admin/feature rows before metadata locking, without installing authority mutation triggers. READ COMMITTED only. A non-login, non-bypass private owner receives the minimal UPDATE-column privilege and UPDATE USING visibility required for locking, with WITH CHECK(false) to reject actual writes; gateway/executor receive no direct Auth table privileges. Exact existing runtime/Admin function bodies remain unchanged.

This is a representative minimal-schema protocol. Real provider session expiry/refresh/cleanup/MFA/cascade schema and writer lock order remain gates. Inverse writer order is deliberately tested for PostgreSQL deadlock victim rollback and same-request reconciliation; success does not mean deadlock-free. Admin hard deletion is restricted by the existing foreign key and is not demonstrated by the soft-deletion flag scenario. No production policy/role/trigger/function has been applied.


## Real hosted Supabase read-only compatibility result — 31 October 2026

See `docs/evidence/2026-10-31-hosted-auth-readonly-compatibility.md` for complete scope, safe catalog queries and exact acceptance checklist. Active MLOS Supabase is PostgreSQL **17.6** (the native disposable proof used 18.6); its provider-owned `auth.users`/`auth.sessions` tables have RLS enabled and no policies, while `public.content_admin_account` also has intentional deny-all-style RLS to assess. The hosted `evidence_gateway`/`evidence_executor`/`evidence_authority_locker` roles do not exist. `auth.sessions.user_id` cascades on hard user deletion, and `content_admin_account.admin_user_id` restricts that deletion. The current `service_role` role bypasses RLS and is not the narrow replacement.

**Decision: hosted gateway stays disabled.** Do not install the fixture's locker RLS policies or grants on provider-managed Auth tables. `FOR SHARE` synthetic ordering is proven, but provider refresh/expiry/MFA/cleanup, live GoTrue transaction semantics, actual PostgreSQL 17 credential confinement and deletion/cascade interactions are not. Supabase documents that expired session rows may remain until later cleanup: row presence is not complete evidence of an active session. No Auth rows or personal data were fetched; no live settings/rights/clinical/content changes occurred. Next safe slice is PostgreSQL 17-specific disposable compatibility and supported Auth/credential boundary evaluation, not a production migration.

## Offline trusted boundary adapters — 31 October 2026

`scripts/lib/source-evidence-private-boundary.js` now exposes two small, server-only **prototype contracts** that are not connected to the running app:

1. `createSourceEvidenceVerifiedUser({getUser})`: inject the trusted network Auth client method `token => auth.getUser(token)` from private server construction. Only `{data:{user:{id}},error:null}` with a validated UUID returns `{id}`. Invalid/missing/error/throwing responses fail closed without leaking Auth diagnostics. The existing `createSourceEvidenceOwnerDelegation` still requires the same exact input token, validates the matching JWT `sub/session_id` only **after** network identity verification, and re-verifies after commit. Tests use synthetic Auth responses; token cryptography, expiry and real revocation are **not** demonstrated.

2. `createSourceEvidencePrivateQuery({createClient})`: a trusted direct-login driver factory must produce a fresh connection for **each** one of the two exact SQL statements, `stage_session` or `readback_session`. Rejects arbitrary SQL/argument arity before connecting; checks driver login plus live catalog `session_user=current_user=evidence_gateway`, `rolcanlogin=true`, `rolbypassrls=false`, `rolsuper=false`; never switches role, substitutes a broad client, accepts caller SQL or returns raw errors. Ends the connection even on an error. It does not provision credentials or guarantee the trusted factory cannot lie. A real network-connected driver needs TLS, secrets, direct-login/ACL/grants, commit acknowledgement, cancellation and restore evidence.

New unit tests cover provider response/null/error/exception, exact token forwarding, wrong-role/bypass/fallback/SQL-injection refusals, postcommit revocation withholding and private query closure. Both pinned native 17.6 and 18.6 row-lock suites invoke these actual fixed SQL statements through fresh direct-login `pg` clients and reject an attempted privileged login, in disposable clusters only.

**Native proof:** implementation commit `f5365dbf1671089845f9f131e6ae6e3f85c37ba2`, Foundation run [41181858402](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41181858402). Both native PostgreSQL jobs and core checks were SUCCESS at last inspection; full Chromium/WebKit job status must be checked separately. Earlier 17.6 job log contains `Private query adapter PASS: fresh direct narrow login, two exact calls, broad-login denial and canonical readback.` The `--key-share` negative remains an intentionally expected failure, not a green security mechanism.

**Deployment decision: still blocked.** Host-managed Auth table ACL/policy changes, real provider refresh/session/MFA/deletion behavior, an authenticated non-production test project and a narrow production credential remain unresolved. The code does not wire any API/Edge Function, install a runtime driver dependency or enable the feature. No NMC/rights/reviewer/learner-release approval follows from this engineering proof.
