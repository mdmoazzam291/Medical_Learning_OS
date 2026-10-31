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
