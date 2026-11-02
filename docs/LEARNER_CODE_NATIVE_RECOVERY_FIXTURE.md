# Disposable native learner mapping recovery

Tested source: `eb9ec21a79caa374dfe1846d0f872cac8aa1948c`, Foundation run [41423355774](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41423355774).

The fixture uses official PostgreSQL18 archive clients against fresh private PostgreSQL17.6 and18.6 servers. All five source-head jobs passed (core, Chromium, WebKit and both native versions), including the deliberate omitted-column-audit failure and subsequent cleanup. Source archive has only `public.learner_reference_codes`; synthetic Auth identities and global roles are independently provisioned and runtime SQL separately installed. No real learner identities or hosted database connections are used.

The custom archive preserves exact UUID/code/format/microsecond timestamps, owner, table/column privileges, RLS, absence of policies, indexes and constraints. Restored code reads cannot regenerate or insert a new code. Independent browser logins cannot select mappings or invoke the runtime function; an old source session is absent and denied. Actual native constraints reject duplicate user/code, invalid code/format and missing referenced user. Synthetic Auth deletion demonstrates the mapping FK cascade only.

A mismatched SHA256 pin and pre-existing mapping table reject before restore. A genuine missing-Auth FK restore failure rolls back the table creation and all imported mappings while preserving the target Auth fixture. Restore uses `--single-transaction --exit-on-error`; private temporary archive is mode0600 and removed with the cluster. The injected column-only browser grant must fail audit. Disabling that audit must fail the negative control, and CI requires both the named rejection failure and cleanup marker.

## Limits

This is same-major table-only disposable recovery using client18, not managed Auth or full-platform recovery certification. Global roles share one disposable cluster, target Auth data is synthetic, runtime code is separately installed, and the locally computed expected hash is a fixture integrity check rather than provenance attestation. No rolegraph/default-schema/extension/TLS/encryption/concurrent-write/crash/managed provider lifecycle/retention/no-reuse acceptance is established. Do not use this fixture as an operational restore procedure or permission to restore staging or production.

Local1,581 tests and repository checks (13services;260coupling locations) passed; final read-only review found no actionable issue. Local root-only namespace cannot initialize PostgreSQL; native proof comes from the exact CI source above. Whole-workflow completion is recorded separately in the handoff/status evidence. Genuine trusted-operator JWT/session and qualified human source/medical/reviewer/privacy release gates remain open. This task changed no hosted resources or data.
