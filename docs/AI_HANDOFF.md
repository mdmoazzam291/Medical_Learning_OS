# Current engineering handoff

Snapshot: 2026-10-14 (Asia/Kolkata). Verify remote evidence before resuming.

## Current task
- Checked 2026-10-14 Asia/Kolkata. Task: complete Cashfree merchant onboarding and obtain sandbox credentials. **External merchant account action remains blocked** because no Cashfree account-identity connection or authenticated dashboard session is available. Gmail search found no Cashfree merchant/onboarding email (only a repo notification). No credentials obtained. Do not claim merchant signup/approval.
- Canonical code choice remains Cashfree primary, PhonePe alternative, retired Razorpay; last merged engineering PR #240, receipt #241. Cashfree server-only sandbox adapter remains disconnected, checkout disabled and grants Free by default.
- This docs-only branch `docs/cashfree-onboarding-readiness-20261014` is based on current main. New `docs/CASHFREE_MERCHANT_ONBOARDING.md` gives official signup link, exact private KYC/dashboard steps, verified sandbox availability, public legal site deficiencies, security handling, and allowed education software description. README and STATUS link this external dependency.
- Next action: the owner must use official Cashfree signup/login and personal OTP/KYC to obtain test App ID and Secret, confirm Subscriptions product enabled, keep keys strictly in an encrypted server secret manager. Afterwards, a trusted developer can connect keyless integration via secret-store-backed server adapter, run real sandbox tests, independently verify sign-up status and only later seek paid release authorization.
- There is no merchant identity, legal business type, bank account, email ownership, production pricing approval, or public legal policy approval that may safely be invented. **No user/patient data, API secrets or OTPs in GitHub, Drive or chat.** Site's internal technical privacy doc is not a public merchant-facing privacy notice.
- Verify documentation PR status before resuming. Do not modify unrelated Cloudflare auth/preview, content intake, PARSE brand proposals or institution scope.

## Latest product state from repository evidence
- Sage Precision default; Lavender Precision selectable; independent light/dark appearance. STATUS records PR #224 / merge 9891df556aca22e634e42d87cf05fd21e407124d, passing Node/check/build/browser CI and production build evidence. This handoff does not independently verify hosted authenticated switching.
- Server-authorized Admin master remains top-level. Each tool has its own workspace; Overview is a summary. Preserve latest owner choices rather than earlier Account-child proposals.
- Genuine polished-PYQ intake is the next product input. Supplied final material, source/rights evidence and actual authorized review remain required. Do not manufacture a replacement batch or resurrect erased pilots.
- Material release adapter code exists; actual external archive/staging ports and real-material acceptance remain pending as recorded in README/PROJECT_CONTEXT/STATUS.
- Open PR snapshot: #203, docs/parse-brand-identity-20261008, proposes PARSE branding. It is unrelated; do not merge, reject or rename the product as part of continuity. Recheck open PRs because this inventory may change.

## Access and verification limits
An outgoing AI's GitHub, Drive, cloud, Library and browser sessions do not transfer automatically. Configure authorized access separately; use AI_ENVIRONMENT.md. The local synthetic loop needs Node >=24 and no API keys. Content-review/publication authority is unchanged. No background watcher, cross-provider memory sync or atomic task lock is installed.

## Next handoff fields
Replace the current-task section for each new task: objective/acceptance, owner or released ownership, date, branch, base/head commit, PR, touched files, unfinished work, exact test results/time, blockers, authorization/release state and next action. Record uncertain operations as uncertain and reconcile before retrying. Push WIP on the feature branch before provider transfer; stop the outgoing remote job first.
