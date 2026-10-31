# Provider-managed Auth privileges — real local GoTrue read-only feasibility (31 October 2026)

## Result: as-is narrow session row-lock route BLOCKED

Real disposable GoTrue, PostgreSQL 17, **only metadata queries** in a read-only transaction. The already-pinned CI job used `pg_catalog.has_schema_privilege`, `has_table_privilege` and `has_column_privilege` for the exact built-in roles and `auth.users`/`auth.sessions`; no account or session row was read or locked, no DDL/grant/policy was written, and no production provider was accessed.

**Evidence:** [Foundation #41196030994](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41196030994), job `auth-local-gotrue`: **SUCCESS**. Its `local_gotrue_catalog_observed` output included all eight role/table permission records. Existing unit tests also check fixed SQL/read-only transaction and fail closed on duplicate/missing/malformed permissions.

| Local role | Auth schema USAGE | Auth users SELECT / id UPDATE | Auth sessions SELECT / id UPDATE | Session user_id and not_after SELECT |
|---|---|---|---|---|
| `anon` | Yes | No / No | No / No | No |
| `authenticated` | Yes | No / No | No / No | No |
| `service_role` (PostgreSQL role) | Yes | No / No | No / No | No |
| `supabase_auth_admin` | Yes | Yes / Yes | Yes / Yes | Yes |

Note: `service_role` may bypass RLS but does not automatically own direct SQL privileges on provider Auth tables; a `service_role` **SDK/API key** must not be confused with a legitimate least-privilege PostgreSQL login. `supabase_auth_admin` is provider-owned and privileged; borrowing its credentials would violate the target isolation design. Other users/roles have different privileges only if the provider changes its configuration. These results say nothing about live/hosted effective grants.

### Engineering decision

**Reject an implicit as-is Auth row-lock gateway.** `FOR SHARE` requires the relevant table/column privileges (including UPDATE privilege for row locking, subject to RLS). Without provider-managed grants, an unprivileged gateway cannot safely assume an atomic `auth.sessions` lock. Even if future grants existed, RLS, policy interactions, live provider transaction order, credential rotation, and writer race/deadlock results would still require demonstration.

- **Path A — provider-supported managed-Auth access:** pursue only if Supabase officially supports stable least-privilege direct DB access to the necessary managed Auth rows (without broad-role fallback), then test real local lock ordering and a separately approved hosted sandbox. No such support has yet been established; do not install custom Auth ACLs/policies on hosted projects.
- **Path B — independent MLOS private authority:** a dedicated non-exposed, strongly ACL-protected session/receipt authority stores monotonic gate epochs and denials. Every sensitive action still validates the exact token with network Auth before staging and before delivery, checks expiry/role/owner state and a recent private authority version **inside** an atomic local transaction. Provider revocations or failures that are not observable in real time must **fail closed** (or explicitly have a bounded consistency window, if independently accepted). A cache or ledger alone cannot prove GoTrue signout/expiry and cannot promise instant global revocation; no equivalent guarantee follows from this design today. This path remains **experimental**, not deployed.
- **Path C — default-off:** maintain the blocked evidence gateway until either A or B is independently demonstrated. This is the current safe state.

### Next acceptance experiment

Use only disposable local GoTrue with generated test identities to observe genuine Auth refresh/signout/delete database writer interactions under controlled, read-only or test-only row locks on those disposable user/session records. Explicitly separate (1) provider writer transaction order under an isolated administrator lock, which is **not a production credential design**, from (2) an independently validated narrow-credential route. Test writer-first, reader-first, rollback, timeouts, deadlock recovery and token-validity gap with no hosted operations. If A proves infeasible or unsupported, reject managed-table locking and focus on a private authority design with measurable stale-state tolerance.

### What is not proven

Hosted Supabase role grants, safe restricted-login credential provisioning, managed Auth RLS/policy compatibility, provider-owned writes under locks, provider MFA/session lifetime and password-change semantics, direct TLS/rotation, source rights, clinical review and learner release. **No deployment, migration, GitHub merge or content publishing is approved.** PR #346 remains draft/unmerged and gateway default OFF.

Reference: [Supabase Auth user/session model](https://supabase.com/docs/guides/auth/users), [session lifetime](https://supabase.com/docs/guides/auth/sessions), [PostgreSQL RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), existing `docs/evidence/2026-10-31-local-gotrue-auth-catalog-compatibility.md`.
