# Disposable GoTrue Auth catalog compatibility — 31 October 2026

**Status: genuine local PostgreSQL catalog inspection PASS; hosted database privilege compatibility NOT ESTABLISHED.**

The actual local Auth provider stack was started via the pinned Supabase CLI with random test users. After the already-verified Auth sign-in/refresh/signout sequence, a separate `pg@8.22.0` connection inspected **system catalog metadata only** in a `BEGIN READ ONLY` transaction. It queried `pg_catalog.pg_class`, `pg_catalog.pg_namespace`, `pg_catalog.pg_attribute`, `pg_catalog.pg_policy`, `pg_catalog.pg_trigger` and `pg_catalog.pg_roles`. It then rolled back and closed the connection. No Auth user or session rows were queried; no role/table modification, trigger, grant, migration or publication occurred.

**Evidence:** [Foundation run 41194293134](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41194293134), job `auth-local-gotrue` reported both `observed_nonproduction_provider` and `local_gotrue_catalog_observed`, with job success and disposable-stack shutdown/cleanup.

| Observed property | Disposable local GoTrue result |
|---|---|
| PostgreSQL major | 17 |
| Owner of `auth.users` and `auth.sessions` | `supabase_auth_admin` |
| Row-level security | Enabled on both relations |
| Non-internal triggers | 0 each |
| Policy count | 0 each |
| `auth.sessions.not_after` | Present, timestamptz |
| `service_role` bypasses RLS | Yes |
| `evidence_gateway`, `evidence_executor`, `evidence_authority_locker` | Absent |
| Provider writer row-lock ordering | **Not tested** |
| Real restricted role grants to managed Auth | **Not tested** |
| Hosted account/session authorization | **Not tested** |
| Deployment approved | **No** |

The code contains an independent fail-closed target validation: only the exactly configured `postgres(ql)://postgres:<local secret>@127.0.0.1:54322/postgres` and the explicit `ISOLATED_LOCAL_GOTRUE_TEST_STACK` confirmation are accepted. It refuses wrong hosts, ports, databases, identities, query strings, non-PostgreSQL URLs and wrong confirmation **before any client allocation**. The SQL is fixed and catalog-only; the fake-driver unit suite validates the read-only transaction, exact queries, rollback/close, and failure when a required column/owner/role assumption is wrong. Secrets and Auth row values never appear in reports.

**Interpretation:** local GoTrue schema ownership and RLS align with the prior [hosted read-only snapshot](2026-10-31-hosted-auth-readonly-compatibility.md). This establishes a reproducible test foundation, **not** provider consent or feasibility of obtaining column-level `FOR SHARE` privileges on managed Auth objects. The catalog probe's temporary PostgreSQL administrator is an inspection-only fixture and is explicitly NOT the intended evidence gateway credential.

**Next independent blockers:** determine if an officially supportable least-privilege login can access the necessary Auth session state without unmanaged changes to provider-owned table ACLs/policies; verify actual Auth mutation lock ordering and race/deadlock behavior under GoTrue; prove authenticated transport, rotation/expiry, MFA/session lifetime, direct DB TLS and server secret lifecycle. If managed Auth row privileges are unavailable or unstable, redesign the gateway around a private authorization/revocation ledger with explicit consistency bounds rather than treating synthetic row locks as deployment evidence.

**Safety:** no hosted user, credential, permissions, project, live source, clinical rights, knowledge graph, PYQ, content publication or learner record was accessed or modified. PR #346 remains draft/unmerged; evidence gateway stays default OFF.
