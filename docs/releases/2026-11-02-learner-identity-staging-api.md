# Learner identity API — isolated staging deployment and negative HTTP acceptance

2 November2026 IST. Target only `medical_learning_os_staging` (`vwtdwafjrraptrgeshzt`). Production unchanged. This receipt does not authorize production deployment or claim genuine authenticated acceptance.

## Reviewed source and deployment

- Reviewed source initially byte-equal across3files at de8a4827d8669aa0d6f22bebacfee0c94bcdbb63 and bc76f6c78a87647342fb7550886e4a81a91f9e36: handler, runtime helper and offline allocation module. No browser/production API configuration used; hosted dependencies resolve the staging runtime environment.
- First deployment v1 ACTIVE, bundle71e67839eee5b26bc8d52707036b62d14018a937584076442169e2589ec7cf5a. Readback matched3files. Seven negative cases passed, but bodyless POST/ensure returned400beforeAuth because the hosted runtime exposed an empty body stream. Counts stayed0/0/0.
- Actual-handler empty-stream test reproduced RED400vs200. Fix accepts only a proven end-of-stream, rejects content-type/nonempty first chunk, bounds first read to2seconds and cancels the reader; no text/JSON buffering. Stalled and payload streams deny before Auth/storage. Final read-only review found no concrete blocker.
- Repair source63cbba64975ece41471f3f88b67e4fc46fb71d65 deployed v2 ACTIVE; exact3file readback matched, bundle `4e2f9fb3f5df264b9832ca68257e582cab441c609bea7647c47a541966dcd881`.
- Platform verify_jwt=false is deliberate because the handler authenticates the actual token with getUser and current runtime session before all privileged operations. This does not create anonymous allocation; the real forged/absent bearer cases below deny. Runtime is rechecked before delivering either response.

## Real hosted negative checks —9/9PASS

| Request | Actual status | Handler error/result |
| --- | --- | --- |
| GET/me without bearer |401|unauthorized|
| GET/me forged bearer |401|unauthorized|
| Empty POST/ensure forged bearer |401|unauthorized|
| GET/me foreign Origin |403|origin_not_allowed|
| POST/ensure supplied payload |400|body_not_supported|
| POST/ensure binary payload without content-type |400|body_not_supported|
| GET/me supplied target query |400|query_not_supported|
| GET/unknown |404|not_found|
| Allowed-origin preflight |200|allowed CORS methods/headers|

All error responses were private/no-store, emitted the expected bounded error, returned no learner code, and allowed only the exact permitted Origin. No secret/publishable key or real token was supplied by this harness; its bearer was the literal invalid.synthetic.token. Forged-token rejection is not positive JWT acceptance.

Metadata-only postcheck at2026-11-02T07:38:32.805023Z: **0Auth users,0sessions,0issued codes**. No test account, mapping, reviewer grant or clinical material created. Machine-readable sanitized receipt: [negative HTTP evidence](../evidence/2026-11-02-learner-staging-negative-http.json).

## Verification and boundaries

Local focused13/full1,572testsPASS; npm run checkPASS13services/255couplings; syntax/diffPASS. Foundation41407126752 at repair63cbba6 completed all five jobsSUCCESS: core,Chromium,WebKit,PG17.6,PG18.6. Exact run/job results were independently checked, not inferred from earlier audit runs. Later documentation-head CI is separate.

The next gate is controlled genuine staging users/sessions: GET not_assigned must not allocate, POST ensure and same-account retries must return one persisted code, another learner must not read it, revoked/suspended cases must deny, and cleanup must independently reconcile accounts, sessions, mapping cascade and any still-live tokens. Use trusted operator secret injection and an external private recovery journal; never put credentials/JWTs in chat/repo/logs. None of those positive checks were executed here. Account UX, no-reuse/retention decisions, provider linking, production rollout and human source/medical/reviewer gates remain open.

## Backout

Retain captured v1three-file source as a transport-restrictive fallback; redeploying it would create a new provider version, not rewind migration history. Stop on any unexpected unauthenticated success, nonzero row count or source mismatch; investigate before real-user tests. Keep staging isolated and do not delete mapping history or alter production/Auth permissions to bypass a failure. No source-rights/clinical/exam/learner-publication approval follows from this receipt.
