# ADR-134 — Managed staging RLS receipt readback (simulated identities)

**2026-11-01; draft #372 stacked on #371. NOT a production authorization or deployment.**

## Current observation

The previously created, isolated `medical_learning_os_staging`
(`vwtdwafjrraptrgeshzt`) was confirmed healthy, empty of public
application tables/migrations, and running managed PostgreSQL 17.11.

A **single SQL-editor PostgreSQL transaction** was executed against that
exact staging project. It uses three application-owned **temporary**
session, exact-grant and protected receipt tables, RLS policies and
`GRANT SELECT ... TO authenticated` confined to the temporary tables.
No `public` objects, provider-managed `auth.sessions` rows, identities,
real reviewer grants or medical content were queried or altered.

The SQL editor, as an administrator, temporarily switches to database role
`authenticated` using `SET LOCAL ROLE authenticated`, and injects
**untrusted simulated** `request.jwt.claims` to exercise the same
`auth.uid()` and `auth.jwt()->>'session_id'` expressions used by a
PostgREST session.

**Crucial limitation:** SQL-editor claims are intentionally fabricated.
They are NOT a cryptographically signed token, GoTrue identity, or
provider-session validation. Actual remote HTTP/JWT reviewer acceptance
and provider logout race remain untested on managed staging. Do NOT
use this SQL as a hosted migration or API endpoint.

## Exact executed test and results

Stored exact passing SQL:
`ops/prototypes/source-evidence/internal-review-staging-rls-readback.sql`.

| Check | Verified managed staging outcome |
| --- | --- |
| `authenticated` with no identity claims | 0 visible receipts |
| Synthetic reviewer A with matching session | Exactly 1 of 2 receipts |
| Reviewer A with wrong session ID | 0 visible receipts |
| Synthetic reviewer B with matching session | Exactly 1 of 2 receipts |
| Revoke application-owned session A | A's readback becomes 0 |
| Revoke application-owned grant B | B's readback becomes 0 |
| `anon` granted direct receipt SELECT | No |
| `authenticated` granted receipt INSERT/UPDATE/DELETE | No |
| Managed PostgreSQL accepted role/RLS policies | Yes |
| Test-only synthetic receipt rows before rollback | 2 |
| Permanent public tables / applied migrations after rollback | **0 / 0** |

The post-transaction independent inspection again reported no public
application tables and no persistent test receipt; no DB migrations.

## What this means

This is meaningful hosted PostgreSQL authorization **policy-behavior**
evidence under a database role. It supports a requirement that protected
receipt readback depend on all three of reviewer identity, session identity,
and current application-owned grant state.

It is NOT proof of:
- Real signed Supabase JWT signature/issuer/audience/session validity
  in the managed staging Data API;
- Cross-connection concurrency and transaction ordering of a decision
  racing app revocation or provider-only logout;
- A private, transactionally authoritative receipt or immutable event
  with entire request fingerprint parity and independent human rights;
- Proven authorization of issuer, reviewer qualification or publication.

**Security nonclaim:** the example temporarily grants SELECT on all three
temporary tables, including synthetic session/grant status, only for this
isolated SQL test. It is NOT approval to expose real grant ledgers to
browser users or to publish a `SECURITY DEFINER` function. Production
should use independently reviewed private objects and least-privilege,
server-bound authenticated reads; avoid default/public function EXECUTE.

The internal source-review stack remains **draft and unmerged**,
publication and production source-review writes **OFF**, and external
provider #350 deferred/OFF. Next gate is explicitly controlled synthetic
GoTrue users + authentic signed JWT against managed staging, with
least-privilege server/DB identity binding and secure cleanup.
