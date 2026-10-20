# Authentication acceptance — 20 October 2026

Baseline: main `1df61bfd68252f924d7d28618799963d499e9cbc`. Owner requested tasks1/2: release reconciliation and real authentication checks. Checked 20October2026,12:17UTC (17:47IST).

## Verified engineering and live public state

- 1336/1336 Node tests; syntax/decision checks;96-file Pages build pass.
- Chromium authentication regression suite passes: durable/tab-only storage choice, reload/fresh-tab/refresh/signout, transient failures/revocation, blocked storage and signup/recovery callbacks. Provider responses are simulated.
- Guest suite21viewport/return cases plus direct registration, and6public-home script/viewport combinations with simulated signup/recovery/sign-in pass.
- Live `/web/account.html`, `/web/account.js`, `/web/account-landing.js`, `/src/adapters/supabase-auth.js`, `/web/cloud-config.js` and `/web/auth-return.js` match main byte for byte.
- Cloud browser displays the current public Account header and expected Google/email sign-in, Keep me signed in, recovery and registration controls. No real account submitted.
- Public Supabase `/auth/v1/settings` returned200; Google and email enabled, signup enabled, `mailer_autoconfirm=false` (confirmation required). This is public configuration, not proof of private SMTP or redirect configuration.
- An attempted authorize metadata request returned a non-JSON response. No full Google exchange was performed; this result is inconclusive, not evidence that login fails.

No reproducible runtime defect found in these checks. No runtime change required on current evidence.

## Real account acceptance still to complete

| Journey | Required observed result | Current evidence |
|---|---|---|
| Google login | Google completes; fresh Medretica page visibly signed in; no localhost redirect | Pending owner secure sign-in |
| Existing email/password | Valid account signs in; correct section returns; reload stays signed in when chosen | Fixture only |
| New email confirmation | Owner-controlled new address receives confirmation; link establishes usable session | Fixture callback only; real delivery pending |
| Password recovery | Email received; owner sets password; new password works; same account remains | Fixture request/callback only; real delivery/reset pending |
| Return context | Same-tab login returns to selected section/filter; callback URL no longer contains token fragment | Fixture only |
| iPad Safari | Real iPad completes chosen login, reload and signout without overflow or redirect failure | Not yet performed; Chromium/WebKit simulation does not replace it |

Use secure browser authentication for existing credentials. Never place passwords, OTPs, access tokens, provider state or confirmation/reset URLs in this record or chat. The owner must complete creation or password-change steps themselves. Test signup needs an owner-controlled address; do not invent an address or mutate the primary account to manufacture evidence.

## Exact continuation

1. Request secure method selection from the current live Account form (Google or email/password). Observe actual result before claiming login success.
2. Check intended-destination return, reload/persistence, then signout; avoid creating study attempts or changing private learner content.
3. With an owner-controlled test account, verify confirmation delivery and recovery. Record timestamp, browser/device and outcome without secrets. Password changes are owner actions.
4. Ask owner to verify iPad Safari with the same journeys. If a defect appears, record the visible error and safe path, reproduce and fix its actual cause. Do not change Supabase/Google/SMTP settings based only on passing fixtures.

Release reconciliation is complete in the accompanying handoff/status update. Real authentication acceptance remains pending; source readiness and release success must not be reported as email delivery or Google acceptance.
