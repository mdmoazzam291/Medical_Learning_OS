# Centered navigation and optional Glass - production release

Date: 2026-10-14. Owner selected the recommended existing GitHub -> Cloudflare automatic production release route after dashboard sign-in failed.

## Released code and provider evidence

- PR #233 merged as `6913872a2222650fbfd1ef4cfc0887bee91741df`, from reviewed head `bdafa8627ae68d53aed984cb8ebc0c515510e2b2`.
- Main Foundation run [38516083659](https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/38516083659): check, Chromium browser and iPad WebKit jobs all completed SUCCESS.
- Fresh local merged-tree verification: 1,226 Node tests pass, zero failures. Earlier reviewed runtime tree also passed repository checks and the 77-file build; main check job independently repeats those checks.
- Cloudflare learner web production build `bc235da1-128d-4e7f-99e3-66c634e29fcc`: SUCCESS on the merge commit.
- Cloudflare heartbeat production build `e5708e62-a369-4ff2-8487-b4568702a72f`: SUCCESS on the merge commit. No heartbeat root/cron changes.
- Existing Git integration performed deployment. No Cloudflare dashboard setting, token, authentication policy, preview model or backend/schema was changed.

## Live public acceptance

Observed [live learner origin](https://medical-learning-os-web.medicalos.workers.dev/) in the cloud browser after deployment:

- New centered top workspaces and individual tools disclosures appear; no permanent contextual sidebar reserves learner width.
- Library tools open/close. Subjects & Topics -> Subject Index lists all 19 subjects. Anatomy and Physiology groups remain expanded independently; their module destinations appear together. Expanded groups survived subsequent page navigation.
- Search icon reveals the named search input. Dark appearance survives reload/navigation; the verification browser was restored to Light.
- Signed-out Home and Library preserve the existing authentication gates. Unauthorized Admin does not appear. The Account route loads the actual sign-in form.
- Actual signed-out Standard/Sage navigation screenshot captured on the live origin. It contains no private learner data.

## Verification limits and remaining work

Main CI verifies portrait/landscape/split-screen, all eight Standard/Glass x Sage/Lavender x Light/Dark combinations, reload equality, catalog/focus/permission boundaries and existing synthetic learning flows. This is synthetic browser acceptance, not physical iPad verification.

Hosted real-account Glass switching remains unverified: the secure browserAuth handoff returned `locator_invalid` even after targeting the visible live form. No live app credential entry, authenticated session, answer or learner mutation was created. Do not substitute synthetic state or assume the hosted authenticated flow passed.

Non-production preview repair remains open in Issue #211. Its provider root cause is unconfirmed. GitHub OAuth approval was followed by Cloudflare's generic sign-in failure; direct Cloudflare email/password attempts returned login API HTTP 403. These messages do not establish an invalid password or bot-detection cause. Production success does not fix preview builds.

Next: verify Glass/Standard and saved palette/appearance in an existing authorized learner/admin account, plus physical iPad Safari as needed. For preview repair, use authorized provider log/config access or the documented Builds API; do not change deployment settings speculatively. Genuine material ingestion remains governed by the existing review/reset contract.
