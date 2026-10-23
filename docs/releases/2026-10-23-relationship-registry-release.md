# Relationship registry production release — 23 October 2026

The owner explicitly approved PR309 merge, production database migration and API/static deployment with “Ok I approve you”. This is software release authorization, not a clinical review or permission to publish real medical assertions.

## Released source and database

PR309 merged as `4c6f3771935a60b46fee03eedf3d09f3437555c2`. Its tree `7505022f93674c958750c8e9f5149f0d5c541430` equals the reviewed feature head3660aa7 exactly; the difference from fully tested3f9c112 is Markdown only.

The committed migration `20261023091436_medical_relationship_registry.sql` was applied through the migration API under provider-ledger version `20261023095946`, name `medical_relationship_registry`. The provider's single stored SQL statement body has SHA-256 `69493ff4704ca3488b87c6a4ae8f09eb7f0ccb9ed2ccae87269a3fb7491ae74b`, exactly the committed reviewed SQL. No SQL body or original filename was rewritten.

Live post-migration verification:

- Catalog remains version407, concepts0/sources0/questions0. New relationship versions0/events0; trusted feed and snapshot medicalRelationships are empty arrays.
- Both new tables have RLS enabled, zero browser policies, no anon/authenticated SELECT and no service INSERT/UPDATE/DELETE/TRUNCATE. Service SELECT works. Each has its immutable UPDATE/DELETE trigger.
- Five external relationship RPCs and the existing snapshot are service-executable; internal helpers are not. Every new function has an empty search_path; anon/authenticated execute is denied. SECURITY DEFINER is used only at the guarded service boundary.
- Service-side current-Admin inspection returns an empty inbox with the existing Medical/References/Rights capability set. No actor UUID or learner data was exported. This is an operational SQL read, not authenticated browser acceptance or a human attestation.
- Privacy scope remains v10, complete=true, no missing/unmapped tables. No learner behavior was copied into the governed-content ledgers.
- Security advisor adds only the two expected INFO “RLS enabled/no policy” entries for service-only ledgers. Existing leaked-password-protection WARN is unchanged; no auth settings changed. See [advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) and [password-security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Performance advisor reports no new unindexed FK; the three new covering indexes are unused while the registry is empty.

## API and static delivery

`content-library-api` v7 is ACTIVE. Readback of all8source files is byte-identical to merged source; only its handler changed from v6. Existing verify_jwt=false is preserved because the handler performs Auth.getUser plus runtime access verification. The Study API and its deployment were unchanged.

The existing Git integration deployed main automatically. GitHub's exact-merge Cloudflare checks show:

| Service | Build ID | Result |
| --- | --- | --- |
| medical-learning-os-web | `64fda0cd-f124-43a4-99f5-b4fe2cb1111e` | SUCCESS |
| medical-learning-os heartbeat | `cd07dc94-7160-4097-8261-a925f916155f` | SUCCESS |
| mlos-cashfree-sandbox | `2fa31988-f353-48ec-92c8-45f29d7f6ea4` | SUCCESS |

The sandbox was automatically rebuilt by its existing repository integration; no billing flags, credentials, payment configuration or transactions changed. No manual deployment or provider setting change was needed. Cloudflare Dashboard showed an ordinary signed-out page; no credential entry or authentication attempt was performed because the verified Git-triggered build completed the release.

Canonical live `/web/content-import` and `/web/medical-relationship-admin.js` returned200 with bytes identical to merged files. The `.html` URL's307 canonical redirect was followed before comparing HTML. Guest cloud Chromium displayed the new relationship section with disabled staging and “Sign in to continue.” Anonymous Library/relationship endpoints returned401; direct anon table reads returned401/42501 permission denied. No broad browser SELECT grant was added in response to PostgREST's generic permission hint.

## Verification boundary and follow-up

Feature Foundation39933609853 passed1453Node tests, six disposable PostgreSQL scripts, Chromium and WebKit across phone/tablet/desktop plus adjacent workflows; final screenshots were inspected and the110-file hosted bundle matched local bytes. Fresh independent review's one Important save-state issue was fixed by four failing-then-passing regressions; no Critical/Minor findings. See [development acceptance](2026-10-23-relationship-registry-development-acceptance.md).

Post-merge Foundation39935853125: core check and WebKit SUCCESS. Chromium attempt1 job120355092788 was cancelled at the15-minute boundary after dependency installation took about9m38s; the new relationship journey and adjacent preparation/content-workspace journeys passed before cancellation. No product assertion failed. On owner continuation, only that cancelled job was retried once: attempt2 browser job120458461843 is IN PROGRESS at this checkpoint. Retained core/WebKit successes were not rerun. No runtime/CI configuration was changed for the retry.

No real clinical assertions, source imports, grants, review attestations, research enrollments or learner responses were created. There is no signed-in populated production acceptance in this release. That remains301 and requires genuine expert review. Pagination300, deeper graph exploration302, real multi-connection contention and full hosted restore of the newly extended schema remain separate. Backups must include the new governance ledgers/dependencies; fail-closed rollback remains documented in [registry operations](../MEDICAL_RELATIONSHIP_REGISTRY.md).
