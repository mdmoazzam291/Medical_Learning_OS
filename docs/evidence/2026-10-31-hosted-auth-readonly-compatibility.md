# Hosted Supabase Auth compatibility — read-only evidence (2026-10-31)

**Scope:** Active Medical Learning OS Supabase project, ap-south-1. Metadata/catalog inspection only; no user identifiers, session tokens, source text, SQL mutations, migrations, configuration changes, staging, or learner release. This is **not** provider acceptance or release authorization. Evidence collected from live management SQL/catalog APIs and reviewed against the existing disposable PR #346 proof.

## Observed hosted facts

| Surface | Observed | Meaning / limitation |
|---|---|---|
| Project | `ACTIVE_HEALTHY` | Management status, not Auth functional/security certification |
| PostgreSQL | `17.6` | Disposable native concurrency proof was on `18.6`; version-specific acceptance is not established |
| `auth.users` | 35 columns; `id uuid`, `deleted_at timestamptz` | Provider-owned table; no write changes authorized |
| `auth.sessions` | 15 columns; `id uuid`, `user_id uuid`, `aal`, `not_after`, `refreshed_at` | Session row presence alone does not prove current authorization/expiry/MFA |
| Auth relation ownership | `supabase_auth_admin` owns both; `relrowsecurity=true`, `relforcerowsecurity=false`, currently zero table policies | Do not copy the fixture's locker policies into provider-managed Auth |
| Session deletion | `auth.sessions.user_id → auth.users.id ON DELETE CASCADE` | Provider hard-delete cascade/order must be tested, not inferred from synthetic deleted flags |
| Admin identity | `public.content_admin_account.admin_user_id → auth.users.id ON DELETE RESTRICT` | Admin hard delete can be restricted; fixture's soft-delete flag does not prove hard-delete behavior |
| Installed roles | `service_role` exists with `rolbypassrls=true` and `rolcanlogin=false`; `supabase_auth_admin` login exists; no `evidence_gateway`, `evidence_executor` or `evidence_authority_locker` | No hosted narrow connector, launcher role, or locking privilege is installed |
| Auth triggers | No non-internal triggers on `auth.users` or `auth.sessions` in the inspected catalog | Does not prove GoTrue's external writer behavior or absence of internal FK actions |
| `auth.sessions` primary key | Unique btree on `id` | Suitable exact-row locator in principle; no lock/latency proof on hosted writers |
| Security advisor | `rls_enabled_no_policy` info notices on private/backend tables (including Admin) | May reflect intentional deny-all posture; do not add public policies to silence info notices |

**Observed at:** 2026-10-31 UTC/IST. Metadata can change after this audit. No query read email, password, token, IP, client UA, session record, personal learning data, or medical content.

## Architecture decision

**Status: BLOCKED for hosted execution.** The disposable implementation's `FOR SHARE` locks under a private non-login `evidence_authority_locker`, `UPDATE USING(true) WITH CHECK(false)`, and separate executor/gateway roles must **not** be installed on `auth.users` or `auth.sessions` solely on the basis of PostgreSQL 18.6 synthetic tests.

Reasons:
1. The actual hosted database is PostgreSQL 17.6 with provider-owned Auth tables. We have no provider approval to add the fixture's policies/role grants or a way to assume those permissions remain valid after managed migrations.
2. Auth session lifetime, timeout, refresh, MFA, password-change, soft/hard deletion, cleanup and OAuth/SSO semantics are not fully encoded by a synthetic `id/user_id` row. Supabase's own docs explain that expired sessions are not immediately deleted and JWTs can remain valid until expiration.
3. The existing `service_role` is broad and bypasses RLS. It is **not** an acceptable substitute for the dedicated restricted gateway. `service_role` being a no-login DB role also does not mean an API secret with that role is safe to expose.
4. A fabricated `WITH CHECK(false)` policy is not a substitute for proving that every other policy/grant/owner path denies mutation. Permissive RLS policies can combine; recheck the entire effective policy/ACL context, including provider changes.
5. An Auth-row lock can serialize cooperative PostgreSQL row writes but cannot by itself prevent a separate token-verifier or identity service from changing its decision. Atomic authority semantics must include the authentic verifier, live session checks and denied-state reconciliation.

**Conservative option:** preserve default-off evidence gateway and use a private, bounded, independently owned authorization/receipt boundary *without modifying managed Auth tables* until provider writers and role constraints are demonstrated in a disposable or approved separate environment. Any revocation ledger or authority service needs explicit freshness/failure semantics and cannot be silently treated as equivalent to live Auth.

## Remaining exact acceptance gates

- [ ] Verify authentic token signature/issuer/audience/expiration and `auth.getUser(token)` behaviour; forged, revoked, expired, wrong-user, absent/old/new session and MFA-sensitive flows with isolated, consented test identities.
- [ ] Show PostgreSQL 17-compatible restricted-role provisioning on a disposable environment; test the actual session table's `not_after`/`refreshed_at` behavior without inventing an interpretation of provider semantics.
- [ ] Inspect/measure Auth refresh, sign-out, password-change, user deletion/cascade, MFA and provider cleanup lock order under genuine provider operations; include both commit orders, deadlocks, rollback and retry. If current Auth cannot be serialised by a safe supported route, choose a different authority strategy.
- [ ] Demonstrate direct-login minimal-privilege connector, isolated credentials, encrypted transport, secret rotation, no `service_role` fallback, no raw SQL/role switching, and true autocommit/commit acknowledgement.
- [ ] Verify request streaming limits, origin/method, sanitized errors, private/no-store cache headers, cancellation, idempotent uncertain delivery and exact audit/readback after restart/restore.
- [ ] Secure independent source-rights review and qualified medical/curriculum reviewer; do not infer NMC competency completeness or activate NEET-PG/INI-CET mappings from synthetic metadata.
- [ ] Run final exact-head CI, security/advisor and restore review only after any real implementation exists; separately authorize production operations.

**Safe next engineering slice:** reproducible **PostgreSQL 17** disposable compatibility test of the minimal locking protocol plus non-mutating Auth-provider schema/contract verification. Do not test provider session revocation against production identities. Follow with a credential/HTTP design only after its feasible authority boundary is independently established.

## Read-only reproducibility

These are catalog-only queries. They do not prove semantic/auth compatibility and should be rerun before design sign-off. Never copy `auth.users` / `auth.sessions` row contents into public artifacts.

```sql
SELECT current_setting('server_version') AS postgres_version;

SELECT n.nspname AS schema_name, c.relname AS table_name,
       pg_get_userbyid(c.relowner) AS owner_name,
       c.relrowsecurity, c.relforcerowsecurity,
       (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE (n.nspname = 'auth' AND c.relname IN ('users','sessions'))
   OR (n.nspname = 'public' AND c.relname = 'content_admin_account');

SELECT rolname, rolcanlogin, rolbypassrls
FROM pg_roles
WHERE rolname IN ('supabase_auth_admin','service_role','evidence_gateway',
                  'evidence_executor','evidence_authority_locker');

SELECT con.conname, pg_get_constraintdef(con.oid, true) AS definition
FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE (n.nspname = 'auth' AND c.relname IN ('users','sessions'))
   OR (n.nspname = 'public' AND c.relname = 'content_admin_account');
```

Reference documents:
- Supabase User Sessions: https://supabase.com/docs/guides/auth/sessions
- Supabase User Management: https://supabase.com/docs/guides/auth/managing-user-data
- Supabase schema protection changelog: https://supabase.com/changelog?tags=auth
- Existing `docs/SOURCE_EVIDENCE_GATEWAY_DEPLOYMENT_GATES.md` and draft PR #346.

**Non-authority:** this report makes no rights, clinical, curriculum, learner visibility, GitHub merge or deployment approval. The full CBME source-adjudication work remains incomplete.

## PostgreSQL 17.6 disposable acceptance — 31 October 2026

**Implemented and verified**, but not hosted-provider acceptance. Draft PR #346 commit `7034fe5def1fbc85694860e46c882499b491cac7` adds a separately isolated `evidence-native-postgres17` GitHub Actions job running `@embedded-postgres/linux-x64@17.6.0-beta.15` plus `pg@8.22.0`. The existing concurrency harness now supports an opt-in `EXPECTED_NATIVE_PG_VERSION=17.6` assertion against the actual server's `server_version_num` before fixture setup, with its original PostgreSQL 18 test left intact.

[Exact-head Foundation run 41181017264](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41181017264), `evidence-native-postgres17` job `124478302267`: **SUCCESS**. Logs explicitly report `Authority native PostgreSQL version PASS: 17.6`, five writer-first and five evidence-first plain authority mutations, rollback/no-orphan and same-request reconciliation, unrelated-user independence, inverse-order `40P01` victim rollback and retry, and fixture cleanup. The intentionally unsafe `--key-share` run failed with `row_authority_barrier_not_observed` as required; the workflow explicitly validated expected failure and cleanup. This does **not** mean the positive test failed.

**Boundary:** same PostgreSQL version and representative synthetic schema, **not** the live Supabase `auth.users`, `auth.sessions`, actual `supabase_auth_admin` ownership, provider-managed policies/credentials, real session TTL/MFA/cleanup/refresh, or production mutation ordering. The prior discrepancy `PG18-only test` is resolved at the engine-version layer. Provider/Auth semantics remain a blocker. Do not deploy `authority-row-locks.sql` into Supabase or grant locking access on managed Auth tables. No production writes or confidential material used.

**Next:** determine whether Supabase supports a restricted, provider-compatible nonproduction authorization boundary that can reconcile provider Auth operations without mutating managed Auth ACLs. Real token handling and credential lifecycle require independent approval and nonproduction isolated identities; continue treating the gateway as disabled.
