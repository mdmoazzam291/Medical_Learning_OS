# ADR-134 — Staging synthetic Auth account creation, verification, and removal

**2026-11-01 · Draft #374 stacked on #373.**
**CODE PREPARED; NOT executed against managed staging.**

**Updated supported interface:** The raw-HTTP Auth admin adapter has now
been replaced by Supabase's documented server-side JavaScript SDK methods
(`auth.admin.createUser`, `getUserById`, `deleteUser` and
`auth.signInWithPassword`). These are exercised through mocked
SDK-shaped responses, **not** a hosted Admin API acceptance test.
No live creation is authorized until the operator approves an isolated
staging run, ensures cleanup, and verifies the secret is staging-only. See
`docs/INTERNAL_SOURCE_REVIEW_CONSOLIDATION_GATE.md`.


## Objective and method

The previously implemented #373 read-only hosted signed-JWT probe needs
a genuine staging-issued bearer token. The connected Supabase management
tools currently do not offer privileged Auth user creation/deletion.
**Do not insert manually into provider-managed `auth.users`, use a real
reviewer, disable email verification globally, or copy production users.**

This draft adds an **explicit opt-in** test-only lifecycle runner:
`scripts/internal-source-review-staging-test-identity-lifecycle.mjs`.

The operator must use a trusted isolated machine (NOT a pull-request
workflow), project `vwtdwafjrraptrgeshzt` only, a staging-only
`sb_publishable_...` key and a staging-only `sb_secret_...` Auth admin
key kept solely in the process environment or trusted secret store.
These API keys are **not JWT bearer tokens**. The SDK handles their
HTTP transport; no custom Authorization bearer construction remains.
Run from an isolated trusted Node environment with an exact-reviewed
`@supabase/supabase-js@2.118.0` installation (and lockfile), verified
in `node_modules` before account creation. No SDK is bundled in this
repository's production dependency list, and missing/wrong versions
**fail closed**. Actual hosted behavior must still be verified.

Only when every environment identity/credential/journal guard passes and
`--create-and-delete` is explicitly set, the runner:

1. Creates a **local 0600 exclusive, append-only** recovery journal *outside the repo*
   **before** contacting the Auth admin API. The journal contains only
   a randomly generated synthetic email marker, staging project ref,
   and (when known) the new test UUID; **no password, JWT or key**.
2. Calls hosted staging admin Auth to create **one** random, unprivileged
   synthetic account using email confirmation on creation
   (`email_confirm:true`, no outgoing confirmation message).
   The generated email ends in `@example.invalid`, with a 36-hex
   random marker. A random password is never persisted.
3. Obtains a real staging token by password sign-in, parses its claims
   as **untrusted input** to discover the new session UUID, then runs
   #373's Auth-server positive and anonymous/tampered negative
   **GET /auth/v1/user** checks.
4. **Before** attempting deletion, requests hosted Auth admin GET by UUID
   and requires the exact random synthetic email and trusted
   `app_metadata.mlos_staging_synthetic:true` marker. If this independent
   ownership check fails, **no delete is attempted** and the recovery
   journal is retained for manual review. With proven ownership, requests
   hosted Auth admin account deletion and **independently**
   requires `GET /auth/v1/admin/users/{uuid}` to return 404.
   Only after verified deletion is the local recovery journal removed. The
   creation journal's original pre-create marker is never overwritten;
   the created UUID is added as an append-only, fsynced entry.
5. Prints **status codes/booleans only**; no email, password, JWT,
   secret key, user ID, session ID, provider response body or stack.
   Any uncertain create/delete leaves a recovery journal and an
   explicit manual-reconciliation outcome. Creation and ambiguous
   write operations are **never automatically retried**.

## Manual activation contract — NOT CI

Use only a separately secured local/ops environment with ephemeral
staging-only API keys and a writable, private directory **outside the
GitHub checkout**. Environment fields:

| Name | Value |
| --- | --- |
| `MLOS_STAGING_IDENTITY_CONFIRM` | `STAGING_SYNTHETIC_CREATE_AND_DELETE` |
| `MLOS_STAGING_REF` | `vwtdwafjrraptrgeshzt` |
| `MLOS_STAGING_URL` | `https://vwtdwafjrraptrgeshzt.supabase.co` |
| `MLOS_STAGING_PUBLISHABLE_KEY` | Staging publishable key, **not production** |
| `MLOS_STAGING_ADMIN_SECRET_KEY` | Staging-only server Auth key, NEVER in Git |
| `MLOS_STAGING_IDENTITY_JOURNAL` | Absolute private journal path, outside repo |

Run the script only with
`node scripts/internal-source-review-staging-test-identity-lifecycle.mjs --create-and-delete`.

**Operator must check the actual key belongs to staging** in Supabase
dashboard and must guarantee no shared production keys. Key-prefix and
hostname checks are useful guards but cannot prove a key's project binding
before sending it; treat the environment and its owner as trusted.
No credentials can be supplied to ChatGPT or ordinary PR CI for this step.

### Recovery before starting another test

If an existing journal file is present, **do not rerun creation**. The
runner's exclusive-create call will refuse to overwrite the journal.
In the staging Auth admin interface, find the exact email marker in that
private journal, confirm its `mlos_staging_synthetic` app metadata and
creation timing, delete that **exact** synthetic user if present, then
verify the user no longer exists. Never bulk-delete or delete by guessed
UUID/email. Only after independently verified deletion should the
operator remove the journal and consider another run. If creation was
ambiguous, absence must be verified in Auth admin as well.

The script does **not** provide crash-atomic cross-service cleanup and
does not automatically sweep an uncertain creation. Even successfully
deleting a user does **not** necessarily instantly invalidate all
previously issued JWTs accepted by PostgREST. A successful `getUser`
test is still a preflight snapshot, not a database-commit authorization
guarantee.

## Actual evidence and limitations

Offline deterministic adapter tests exercise:
- Exact staging target, secret class, opt-in and journal location;
- journal creation before user provision, sign-in and read-only Auth
  checks; successful verified deletion and journal cleanup;
- create response lost, sign-in/auth failure, unverified deletion,
  journal failure, and failure with no unsafe auto-retry;
- frozen/redacted result with every source-review, clinical, rights,
  migration and learner-release authorization flag false.

**No real managed-staging Auth user was created, deleted or authenticated
during this PR**; the SDK adapter, hosted Admin calls and
`sb_secret_` acceptance on the hosted service require a separately
authorized operator-run verification. Earlier managed SQL-RLS tests
remain separate evidence and do not supply a genuine JWT.

Existing #371–#373 tests and drafts are unmerged. Production source
review, reviewer grant authority, `Review → Live` and external provider
#350 remain OFF. Two-connection managed concurrency and Auth signout
atomicity remain unresolved.

## Real SDK offline compatibility verification (2026-11-01)

The draft PR #374 exact-SDK CI check installed `@supabase/supabase-js@2.118.0`
into an ephemeral GitHub runner directory. **Credential-free** verification
using the actual library (not only injected mocks) passed: createClient
exposed Auth Admin methods, the runner could construct separate private
and public clients, both disabled persistence and refresh, and zero hosted
requests were issued on initialization. Production and staging accounts
were not contacted by the contract test.

**Update:** `ops/staging-auth-sdk/package.json` and `package-lock.json`
now contain the entire private SDK dependency tree, with npm registry
resolution URLs and package integrity hashes. CI's ephemeral staging-only
SDK contract test now runs `npm ci` from that committed lock; no
staging secrets or JWTs are supplied to CI. The operator-run version
check remains fail-closed if the reviewed SDK isn't installed.

**Trusted operator installation:** after reviewing the repo contents and
ensuring the working directory is private, run
`npm ci --prefix ops/staging-auth-sdk --ignore-scripts --no-audit --no-fund`
from repository root. Then, **only with separate staged test approval**, 
provide the staging-only settings listed above from a trusted secret
store, ensure no cleanup journal from a previous run remains unresolved,
and deliberately invoke the lifecycle with `--create-and-delete`.
No credentials are to be placed in GitHub CI. A committed lock does not
establish live hosted Auth acceptance, cleanup or signout atomicity.
