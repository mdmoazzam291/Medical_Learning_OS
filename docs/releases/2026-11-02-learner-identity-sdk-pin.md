# Staging learner identity SDK top-level pin

2 November2026. Isolated staging only, no production target or Auth identity/data mutation.

The Edge handler previously imported `npm:@supabase/supabase-js@2`, while the reviewed operator manifest and lock pinned2.118.0. npm registry metadata confirmed2.118.0 availability. A new guard failed on the moving import, then passed after changing the Edge import to exact2.118.0. It also checks exact-semver syntax and the operator lock entry. No root/app dependency added; operator package/lock unchanged.

This aligns the **top-level SDK version only**, not the complete Node/Edge transitive graph or runtime environment. Provider deployment bundle hashes identify the recorded artifacts; this does not establish independently reproducible third-party builds. The platform-managed runtime declaration remains outside this SDK-version assertion.

- Tested source: `8bc1ada00763372f72489049a7cdb919f6d5574e`.
- Isolated staging project: `vwtdwafjrraptrgeshzt`, function `learner-identity-api`, ACTIVEv3.
- Provider bundle SHA256: `42d1b5d8a07a8f55581815fb7c7150fe4ad9c0b22196b14e6f1ff24ab26e742d`.
- Readback: all3deployed source files match the committed source exactly.
- Actual hosted negative cases9/9PASS: anonymousGET401,forgedGET401,emptyforgedensure401,foreignOrigin403,JSONpayload400,binarypayload400,targetquery400,unknown404,preflight200. Expected bounded errors/private no-store/exact CORS and allowed preflight methods/headers; no learner code returned.
- Postcheck2026-11-02T08:51:18.40852Z:0Authusers,0sessions,0issuedcodes.
- Local focused14/full1,581testsPASS; npmcheck13services259locationsPASS; diffPASS; read-only review no blocker. Exact code-head Foundation41415880983 completed all five jobsSUCCESS(core,Chromium,WebKit,PG17.6,PG18.6); job results independently checked. Later evidence/register-only headCI is separate.

Sanitized machine receipt: [SDK pin evidence](../evidence/2026-11-02-learner-staging-sdk-pin.json). Preserve capturedv2/source63cbba64975ece41471f3f88b67e4fc46fb71d65/bundle4e2f9fb3f5df264b9832ca68257e582cab441c609bea7647c47a541966dcd881 for historical comparison only. Its moving @2 source is not a deterministic rollback artifact: a later redeploy can resolve different dependencies. Stop further positive tests on a regression and require an independently reviewed exact-pinned recovery bundle; no binary rollback was certified by this pin exercise. Redeployment creates a new provider version rather than rewinding migration history. Auth getUser/current-session/self-only/no-store and bounded body guards remain unchanged, including preserved platform verify_jwt=false with mandatory handler-side authentication.

No genuine signed-in JWT, two-user, revocation/suspension, lifecycle/cleanup, retention/no-reuse or managed backup/restore acceptance was executed. Trusted operator credentials remain unavailable. No real/synthetic hosted identities, codes, reviewer grants, source/medical/rights/exam approvals, production change or merge. The earlier v2 negative receipt remains historical evidence; v3 is the current deployment after this pin.

Read-only npm advisory audit of the isolated operator lock reported0known vulnerabilities at this check. Its manifest/lock were not modified. This is registry advisory metadata for that lock only, not an audit of the Edge dependency graph, software correctness or a security certificate.
