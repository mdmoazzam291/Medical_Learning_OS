# Learner session RPC exception classification repair

2 November2026. Reviewed source `2d1ad972579ed52c5359e8f41a398e65b47245ac`; [Foundation41434806577](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/41434806577). All five source-head jobs passed: core, Chromium, WebKit, nativePG17.6/18.6. Final evidence-only headCI is separate.

A single catch previously covered JWT claim parsing and awaited session RPC execution. A thrown RPC/dependency failure therefore produced `session_claim_invalid`, and the identity handler returned403. Returned RPC errors already produced503. Handler regressions reproduced initial/final thrown failures as RED403!=503, then passed after splitting parse and dependency catches. Invalid/missing claim reasons remain unchanged; RPC exceptions and malformed missing RPC responses are unavailable. Initial failure stops mapping reads/writes; final failure withholds the code while preserving a committed mapping. No automatic application retry or access relaxation was added.

Local13 focused handler/helper tests, full1,584tests and check13services262locations passed; fresh reviewer independently ran focused and pinned-SDK checks without a finding. Actual pinnedSDK2.118.0 + actual handler with synthetic fetch already stopped one ambiguous insert, returned503/no code, and made no implicit retry/readback; no retry-policy production change was necessary. This transport verification passed on its first run and is an additional behavior audit, not a RED/GREEN regression. CI installs the existing isolated exact package/lock, without a new app dependency.

The helper source is consumed by learner-identity and learner-experiment. The experiment's existing401 mapping remains unchanged except its dependency reason becomes accurate on a future deployment; this task must deploy only the identity function. No other runtime helper copy or production function is changed.

Read-only predeployment observation: staging `vwtdwafjrraptrgeshzt`, identity API ACTIVEv3, bundle42d1b5d8a07a8f55581815fb7c7150fe4ad9c0b22196b14e6f1ff24ab26e742d; exact3files match basef3e66d4. At2026-11-02T11:09:20.572664Z there are0Authusers/0sessions/0codes. All9actual v3 negative/CORS/preflight cases passed at2026-11-02T11:16:50.407535Z. No real identity/session/token was supplied or created.

Callback-injected RPC faults are not observed hosted outages. Negative HTTP acceptance does not establish genuine signed-in/two-user/revoked/suspended/cleanup or provider account lifecycle behavior. No production, medical/rights/reviewer/privacy/retention/merge/learner release gate is cleared. Trusted operator credentials/private journals remain required for live positive acceptance.

## Isolated staging deployment

- Target only `vwtdwafjrraptrgeshzt`, `learner-identity-api` ACTIVEv4.
- Provider bundle `4214bd0c73126b4537345687f1f59a4d303959bc96d5a4d3635ad71424867b6b`.
- All3deployed source files match tested source2d1ad972 exactly. Handler and domain allocator unchanged; only imported shared helper separates parse/dependency failure reasons.
- Platform `verify_jwt=false` preserved because handler performs mandatory getUser/current-session verification, including final pre-delivery check; no anonymous allocation or alternate target introduced.
- Fresh predeployment check2026-11-02T11:43:33.403939Z:0Authusers/0sessions/0codes. All9postdeployment negative/CORS/preflight cases PASS at2026-11-02T11:44:59.846828Z: anonymousGET401,forgedGET401,emptyforgedensure401,foreignOrigin403,JSONpayload400,binarypayload400,targetquery400,unknown404,preflight200. Error responses are private/no-store with expected CORS; preflight has expected method/header allowances. Read-only postcheck2026-11-02T11:45:12.041549Z:0Authusers/0sessions/0codes.

The captured priorv3 metadata/bundle42d1b5d8a07a8f55581815fb7c7150fe4ad9c0b22196b14e6f1ff24ab26e742d and exact3sourcefiles match parentf3e66d4. On regression stop positive probes and review the captured exact-pinned source for scoped redeployment. Redeployment creates another version; no binary rollback or identical managed transitive/runtime reconstruction is certified. No production or learner-experiment function was deployed.

Sanitized machine evidence: [staging v4 verification](../evidence/2026-11-02-learner-runtime-outage-staging.json). Actual hosted negative tests never exercise the repaired RPC exception branch; that branch is verified by actual-handler tests with synthetic backend exceptions.
