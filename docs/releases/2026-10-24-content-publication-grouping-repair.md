# Content import publication grouping repair

## Production repair verified

Checked 24 October 2026, 03:32 IST. PR312 code636ecc60db55e4ccdd2a45cbde4cc3901975d6fb merged asad9c618e87821e389f55c347ac2fbb795419dbce; merged tree69bde69f6c688b2ada5e18887d4a622abb3a0413 equals the tested feature tree. [Foundation40029990672](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/40029990672) passed core, all six disposable PostgreSQL checks, Chromium and WebKit.

The committed SQL was applied through apply_migration under provider ledger20261023220111/content_import_intelligence_grouping. Its single stored SQL body SHA256be29169925d676a5200e6d8946078bd177164a9262f245232af1b15a8194d2bb equals the exact reviewed file. Full live pg_get_functiondef byte-matches the prior definition with only the grouped extraction change. Wrapper OID24165/ownerpostgres, SECURITY DEFINER, empty search_path, and service-only EXECUTE are unchanged. Anon/authenticated execution remains denied. Legacy authority delegate OID23533/MD5b4eb4a30b179e281fd5eb6ed666314c4 is unchanged. Advisors match pre-repair findings. No API/static source or provider setting changed.

Fresh live readback confirms the same draft/digest/no receipt and catalog407/questions0/notes0/review-events0/existing rights-events12. No hosted publication RPC was invoked to test the repair. Genuine signed-in Admin can retry Review & publish; unsaved form values survive the failure while the current page stays open. Source/clinical review authority remains real. The blank relationship editor is separate and can remain empty. No successful clinical publication or populated production acceptance is claimed; issue301 remains open.

Checked 24 October 2026, 03:28 IST. Engineering owner: Codex. Branch: fix/content-import-publication-20261024; base main09a0b596159cd42b3c5672c0c8e1f538b6cc33a7.

A genuine Admin publication attempt failed with import_publication_failed. Live PostgreSQL logs identify SQLSTATE42725, ambiguous unknown-minus-unknown, in the intelligence wrapper. PostgreSQL parses the ungrouped JSON expression incorrectly. The new forward migration groups the extracted intelligence JSONB before subtracting the derivatives key.

Only that executable expression changes. The existing legacy authority delegate, advisory lock, row lock, retry/conflict behavior, SECURITY DEFINER, empty search path and service-only EXECUTE remain. No historical migration, clinical content, source-rights decision, reviewer identity or attestation is rewritten.

Migration: supabase/migrations/20261023214659_content_import_intelligence_grouping.sql. SHA256: be29169925d676a5200e6d8946078bd177164a9262f245232af1b15a8194d2bb. The Supabase CLI generated the UTC filename. Provider ledger mapping is pending deployment.

Validation: regression reproduced the exact SQLSTATE42725 before the replacement. Corrected PGlite test passes first publication with empty derivatives, retry, two derivative appends, immutable metadata conflicts/removals, rollback, schema1/no-intelligence delegation, delegated attestation/digest failures and anon/authenticated denial. The legacy publisher is a clearly stated component fixture. Full1453/1453 Node tests, npm run check (13services/230coupling locations) and git diff --check passed. Independent reviewer reports no Critical/Important/Minor findings and independently verified RED/GREEN/check/diff. Full platform migration-chain replay and actual human content acceptance are unverified.

Pre-deployment readback: import NEETPG26-CORE6-20261024-v1 remains draft with digestf65956bc03fac780f8539e86033b5a93542c63857c5743a95ba47fd3650c6112; no receipt; catalog407/questions0/notes0/clinical-review-events0; existing rights-events12. Failed publication transactions rolled back. Private source material and screenshots stay outside Git.

Pre-deployment plan (now completed above): save reviewed source remotely, pass exact-head CI, merge, apply only this committed SQL, verify provider ledger body SHA/function identity and privileges, and confirm the draft remains unchanged. Do not call hosted publication to test the repair. Genuine signed-in Admin must retry the review form; source reuse and clinical/reference authority remain actual gates. The separate blank relationship editor does not block ordinary question/note publication.

Rollback: no new data shape or rows are introduced. Restoring the previous wrapper reintroduces the proven publication failure; prefer a reviewed forward correction. Disable publication access temporarily if an unexpected integrity/security regression is observed rather than weakening gates.
