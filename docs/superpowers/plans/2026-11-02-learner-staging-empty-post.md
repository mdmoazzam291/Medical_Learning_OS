# Staging learner identity transport acceptance

Use executing-plans inline, TDD and final read-only review. Current user Next continues necessary isolated staging acceptance; no production/human approval.

- [x] Verify staging target/migrations/ACL and zero users/sessions/codes, no existing function.
- [x] Deploy reviewed3files to isolated staging v1, exact committed source parity; own getUser/runtime authentication remains enforced with platform verify_jwt=false.
- [x] Execute real negative HTTP checks. Seven of8passed; forged emptyPOST returned400beforeAuth because bodyless hosted request is represented by stream. No data write.
- [x] Reproduce actual-handler empty-stream regressionRED400vs200; implement2second bounded first-read/end-of-stream guard, reject nonempty/stalled streams with cancellation. No req.text or body buffering.
- [ ] Full local test/check, final review and feature checkpoint; redeploy staging fix; verify exact deployed source and repeat live negative tests and zero-row readback. Record exact CI/limits/rollback.

No synthetic hosted accounts/positiveJWT tests or code assignments here. They need controlled operator credentials/journal and exact cleanup protocol. This task cannot clear them using forged-negative results. Revert endpoint to prior captured3filebundle if unexpected authorization or transport acceptance occurs. Production target is never used.
