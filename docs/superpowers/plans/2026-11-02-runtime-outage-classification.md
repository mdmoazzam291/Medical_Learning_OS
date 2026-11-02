# Session RPC exception classification repair

> Execute inline with superpowers:executing-plans; final fresh read-only review required.

Goal: a thrown session RPC/dependency failure must return runtime_access_unavailable so the self identity API responds503, rather than misclassifying it as an invalid session claim/403. Base PR379 f3e66d445afe969348504ba9759fa7d79372da0b, prior evidenceCI41430144594 SUCCESS. Existing clean linked worktree retained; user authorized continuous scoped implementation.

Root cause: one catch wraps both JWT claim parsing and awaited admin.rpc. Existing returned-error outage path is503; thrown transport failure falls through session_claim_invalid. Actual handler regressions observed RED,403!=503 for initial and final checks.

- [x] Reproduce actual handler before any mapping access and after readback/commit with thrown RPC errors, asserting503, withheld code, no initial reads/writes and preserved committed row.
- [x] Add direct helper tests pinning invalid/missing claim behavior/noRPC and returned/thrown dependency failures; split parse and RPC catches without changing allow/deny or scope. Existing caller learner-experiment-api retains its current HTTP mapping; no experimental route change/deploy.
- [x] Run focused/full/check/diff, independent final review, checkpoint exact source then inspect all5CIjobs. Do not infer real hosted exception/positiveJWT acceptance from callbacks.
- [x] Deploy only exact reviewed learner-identity staging bundle if verified and existing scoped staging access remains available; inspect source parity/repeat hosted negative HTTP checks and read-only zero-row postcheck. No Auth accounts/codes/production/release/human approvals. Otherwise record candidate-only limit honestly.
- [x] Persist exact source/test/run/deployed version or explicit unrun state, handoff/status and next genuine operator gate using expected-SHA update and remote readback.

No new package/provider; one new reviewed script coupling path and existing CI provider association for exact-SDK transport verification. existing shared helper is consumed by identity and learner-experiment sources. Production bundles remain untouched. This is error classification, no auto-retry or authorization relaxation; do not report an unexecuted hosted transport fault as observed.

Ruling: official retry guide was broader than exact SDK source; actual pinned2.118.0 POST-loss fixture passed without retry-policy changes. Keep this verification in coreCI with existing isolated lock (no app dependency). It uses actual handler/SDK and synthetic fetch; callback loss is not hosted transport evidence. No second production fix or automatic retry claim is added.
