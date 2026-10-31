# Real GoTrue session-writer / PostgreSQL FOR SHARE race — 31 October 2026

**Status: disposable local protocol OBSERVED; full provider serialization NOT demonstrated; deployment BLOCKED.**

The exact 127.0.0.1 Supabase CLI GoTrue stack was used with `pg@8.22.0`, an actual local PostgreSQL 17 database, fresh randomly generated test-only accounts and sessions, and the same pinned CLI and SDK used by the preceding genuine-provider acceptance test. No hosted Supabase project, real learner, production credential or source content was touched.

**Verified evidence:** [Foundation CI run 41197278066](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41197278066), `auth-local-gotrue` job **SUCCESS**, printed `local_gotrue_writer_race_observed` and destroyed the disposable container stack. The run's original report field `authSessionsModifiedByProbe:false` denotes *no direct test SQL DML*; subsequent code makes this explicit as `directAuthTableDmlByHarness:false`. The real GoTrue server of course performed its own normal test-account/session writes.

## Reproducible technique

- Validate exact loopback Auth URL `http://127.0.0.1:54321`, PostgreSQL URL `127.0.0.1:54322/postgres`, disposable-only confirmation and generated `+mlos-probe-` identities **before creating network clients**.
- Sign up distinct test identities; bind each test's `auth.sessions.id` to the issued JWT `session_id`, checked against the signed-in `user.id`, issuer/audience and expiration. JWT payload parsing here selects a **test-row locator only**, never authorizes the product. No tokens or identities are printed.
- In a disposable local administrator connection, `BEGIN` and `SELECT id FROM auth.sessions WHERE id=$1 AND user_id=$2 FOR SHARE`. This acquires a row lock on **only the freshly created test session**. No privileges, policies, functions or managed Auth tables are modified with SQL.
- Concurrently ask genuine GoTrue (not synthetic SQL) to `signOut({scope:'local'})` for one session or `refreshSession({refresh_token})` for another. A separate monitor connection samples `pg_blocking_pids` for up to 2.4 seconds. The holding transaction then commits, provider response completes, and a fresh query checks whether that generated session row remains.
- Time-bounded SDK/PG calls, rollback-on-error, client closure and runner-level timeout plus `supabase stop --no-backup` ensure test failures do not authorize deployment. The SQL observer has no parameterized arbitrary SQL, Auth-row enumeration or browser exposure.

## Actual result

| Provider action while FOR SHARE held | Provider blocked on holder | Session row afterward | Significance |
|---|---|---|---|
| **Local sign-out** | **Yes** | **Absent** | Real local GoTrue session deletion was serialized with the held row lock in this scenario |
| **Refresh of separate active session** | **No** | **Present** | The refresh request completed without waiting for the held session-row lock in this scenario |

Both provider operations completed successfully. `bothProviderOperationsWaitedForShare:false`. The reported `deployApproved:false`, `restrictedDatabaseLogin:not_tested`, `hostedWriterSemantics:not_tested`, `hostedGrantPath:not_established` are mandatory. The refresh outcome is **not** by itself proof of a security bypass: the provider may modify refresh-token records rather than the session row, or use separate transactions. It does establish that the **claim that every provider session lifecycle operation waits on this Auth session row is false** in the tested local setup.

## Decision and next work

**Do not authorize MLOS evidence delivery based on Auth session-row locking.** A held `FOR SHARE` lock can serialize the observed sign-out deletion in disposable GoTrue, but does not establish complete lifecycle atomicity for refresh, MFA, password changes, cleanup, expiry or hard deletion. The separate actual privilege matrix has already shown that `anon`, `authenticated` and PostgreSQL `service_role` have no table SELECT or id UPDATE privileges for this locking scheme. The privileged `supabase_auth_admin`/local `postgres` test connection is **not** a least-privilege gateway credential.

Build the next experiment around an independently owned private authorization/receipt boundary that never modifies provider-managed Auth tables and **fails closed when current provider authority cannot be verified**. Require evidence on revocation-latency bounds, outages, wrong-user/session binding, rollback and receipt reconciliation before treating any cached provider state as safe. If provider-supported restricted Auth grants are later available, separately validate hosted privileges and real writer order under approved nonproduction credentials.

**Non-claims:** no guarantee that arbitrary valid JWTs are immediately invalidated by signout, that refresh always bypasses all possible locks, that provider tables are immutable, or that actual hosted Supabase behaves identically. No NMC/rights/clinical/content release, production migration, PR merge or activation follows.
