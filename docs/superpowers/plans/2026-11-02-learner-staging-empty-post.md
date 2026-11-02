# Staging learner identity transport acceptance

Use executing-plans inline, TDD and final read-only review. Current user Next continues necessary isolated staging acceptance; no production/human approval.

- [x] Verify staging target/migrations/ACL and zero users/sessions/codes, no existing function.
- [x] Deploy reviewed3files to isolated staging v1, exact committed source parity; own getUser/runtime authentication remains enforced with platform verify_jwt=false.
- [x] Execute real negative HTTP checks. Seven of8passed; forged emptyPOST returned400beforeAuth because bodyless hosted request is represented by stream. No data write.
- [x] Reproduce actual-handler empty-stream regressionRED400vs200; implement2second bounded first-read/end-of-stream guard, reject nonempty/stalled streams with cancellation. No req.text or body buffering.
- [x] Full local test/check, final review and feature checkpoint; redeploy staging fix; verify exact deployed source and repeat live negative tests and zero-row readback. Record exact CI/limits/rollback.

No synthetic hosted accounts/positiveJWT tests or code assignments here. They need controlled operator credentials/journal and exact cleanup protocol. This task cannot clear them using forged-negative results. Revert endpoint to prior captured3filebundle if unexpected authorization or transport acceptance occurs. Production target is never used.

Evidence: source63cbba64975ece41471f3f88b67e4fc46fb71d65 deployed isolated stagingv2; exact3files and providerbundle4e2f9fb3f5df264b9832ca68257e582cab441c609bea7647c47a541966dcd881matched. Nine hosted negative/CORS checksPASS, including no-contenttype binary rejection; preflight methods/headersPASS. Postcounts0/0/0 at07:38:32UTC. Local1572/full13focused/checkPASS; final read-only review no blockers. CI41407126752 core/native17+18SUCCESS, browser/WebKit pending at record. Real signedJWT/user lifecycle/issuance unexecuted.

Final code-headCI41407126752 ALL5jobsSUCCESS(core,Chromium,WebKit,PG17.6,PG18.6). Final evidence-only documentation/register commit separately triggersCI, not claimed complete. Nine hosted negatives/private responses/CORS and0/0/0postcounts verified; no realJWT/users/issuance/production action.
