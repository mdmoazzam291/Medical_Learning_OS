# Private connector and acknowledgement trust boundary — decision record

**Status: DESIGN ONLY / BLOCKED FOR HOSTED DEPLOYMENT.** The existing isolated PostgreSQL ledger proves at-most-one database intent and test-only reconciliation; it does not prove actual provider delivery, session revocation freshness, or a safe credential.

## Runtime boundary

1. **Public API / learner request** supplies only an access token and immutable request/digest. It must never supply actor, session, authority epoch, database connection string, provider credential, acknowledgement, or SQL.
2. **Private gateway runtime** calls the provider's network-authoritative user endpoint for each operation, then validates the actor/session binding against the signed JWT locator. It uses only a restricted PostgreSQL login, TLS with verified hostname/CA, statement/connection timeouts and a fresh transaction. The gateway role must not be `postgres`, `service_role`, table owner or a role able to SET ROLE. A provider outage denies, not a cached-allow.
3. **Private controller** updates MLOS-owned authority epoch and lease only after an independently authenticated administrative action. It has no right to stage, reserve or acknowledge. Its state is not an automatic feed of provider revocations.
4. **Trusted outbound dispatcher** may attempt delivery only after a unique committed intent and fresh authorization check. No dispatcher is implemented yet. The same attempt ID must be the provider-side idempotency key where the provider supports one. Ambiguous outcomes must never trigger a new attempt automatically.
5. **Independent confirmer** reads a durable external provider record through an isolated credential, checks exact request/attempt/digest/recipient binding and writes only the acknowledgement digest. It cannot stage, reserve, or authorize content. The current test callback is synthetic and therefore cannot satisfy this gate.

## Required acceptance tests before an endpoint

- A **disposable real TLS PostgreSQL** connection with certificate validation and explicit restricted login: reject plaintext, wrong CA, wrong hostname, wrong role, bypass-RLS, table-owner, fallback credentials and unrecognized functions. Validate after backup/restore and credential rotation; do not reuse fixture trust auth.
- A real provider verifier integration proving expected behavior on expired token, signed but revoked session, logout, refresh, MFA downgrade and network outage. If a provider cannot promise instant revocation, explicitly bound the exposure window or require stronger server-managed session checks.
- A real provider or durable test-double transport with signed/verified acknowledgement and stable idempotency key. Exercise crash after intent commit, crash before dispatch, provider commit with lost response, acknowledgement commit with lost response, duplicate callback, provider outage, conflicting acknowledgement and reconciliation after restart. **At-most-one intent is not exactly-once delivery.**
- Restore audit: private roles, schema/function ownership, public/anon grants, EXECUTE ACL, `SECURITY DEFINER` search path, RLS and credential scope must match the approved manifest. Missing/mismatched authority must fail closed.
- Source rights, medical review, learner publication and institutional authorization remain independent release gates. Never infer those from an acknowledgement.

## Non-negotiable deployment gates

- No hosted SQL or managed `auth` grants/triggers/locks; no production project ref or credentials in test configuration.
- No public PostgREST RPC or browser-accessible privileged function; no broad `service_role` fallback.
- No release on `intent`, `uncertain`, SQL success or SDK success alone.
- No automatic retry after ambiguous outbound results until an external idempotency contract and independent acknowledgement protocol are proven.

**Next safe implementation:** a self-contained disposable TLS/role-attestation and restore-negative-control harness, followed by provider-specific acknowledgement verification. Keep PR #346 draft and the gateway default OFF.
