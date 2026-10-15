# One Cashfree sandbox GET through GitHub, without Codespaces

This is the alternative selected after the owner encountered terminal/token paste
errors. It reuses the reviewed `scripts/cashfree-probe-once.sh`; it does not move
Cashfree key values out of Cloudflare. It is preparation, not a completed provider
test. Cloudflare Secrets Store access from remote development is still unverified.

## 1. Retire the exposed temporary token

In Cloudflare My Profile > API Tokens, delete `mlos-cashfree-one-shot-3` if its
value appeared in a shell error. Do not delete `mlos-web-builds` or other build
tokens. Revocation is required even if the terminal has been cleared. Earlier
`unset CLOUDFLARE_API_TOKEN` only removed a terminal environment value.

You can leave Codespaces closed. Preserve unrelated work, including the untracked
`package-lock.json`. Do not paste another token into its terminal.

## 2. Wait for repository review and separate merge approval

Prepared files:
- `.github/workflows/cashfree-sandbox-once.yml`
- `scripts/cashfree-actions-once.sh`
- `tests/cashfree-actions-once.test.js`

The workflow must exist on `main` before GitHub displays its manual Run workflow
button. The feature-branch preparation does not authorize a main merge or
production promotion. PR #257 also contains prior runner repairs and the approved
Preview configuration; merging it may trigger existing main deployment builds.
Review that complete scope before approving its merge. This manual Cashfree
workflow never runs automatically on that merge, push, pull request, or schedule.

Do not create another one-hour token until the workflow is merged and ready.

## 3. Create a fresh temporary Cloudflare token

Open https://dash.cloudflare.com/profile/api-tokens > Create Token > Create
Custom Token. Use a fresh name such as `mlos-cashfree-actions-once`.

| Scope | Permission | Access |
| --- | --- | --- |
| Account | Workers Scripts | Edit |
| Account | Account Settings | Read |
| Account | Secrets Store | Edit |

Include only the MLOS account. Set its start to now and expiry about one hour
later, checking the displayed timezone/date. Leave IP restrictions empty for the
GitHub-hosted runner. Review, then Create Token. Keep the one-time value page open.
Secrets Store Edit permits binding existing account secrets and is broader than
metadata Read; the runner does not create or edit stored secrets.

## 4. Add the token through GitHub's web form

Open https://github.com/mdmoazzam291/Medical_Learning_OS/settings/secrets/actions
in Safari. You may need the repository's Settings tab, then Secrets and variables
> Actions. Select New repository secret.

- Name: `MLOS_CASHFREE_PROBE_CF_TOKEN`
- Secret: only the newly created Cloudflare token value.

Use the Copy button beside the token value on Cloudflare's final page. Do not
copy the example verification request, `curl`, `-H`, `Authorization:`, `Bearer`,
quotes, or multiple lines. Paste into GitHub's Secret text field and select Add
secret. This is a normal web field; there is no terminal command to execute.

The GitHub secret name and Cloudflare token name are different. Never put the
token in repository files, Actions inputs, issues, chat, or screenshots. Do not
copy Cashfree TEST keys: their two existing encrypted bindings remain in Cloudflare.

## 5. Deliberately authorize one attempt

Only after the owner approves the actual provider execution:

1. Open https://github.com/mdmoazzam291/Medical_Learning_OS/actions .
2. Select **Cashfree sandbox - one manual GET**.
3. Select **Run workflow**; branch must be **main**.
4. Change the confirmation from **CANCEL** to **YES_TEST_ONLY**.
5. Select **Run workflow** once. This click with YES_TEST_ONLY authorizes the
   actual attempt; adding the secret alone does not execute it.
6. Open the newly created run, job **probe**, then step **Attempt one sandbox GET
   and close temporary preview**.

The job rejects non-main runs, a different repository, missing/malformed tokens,
and run attempts greater than one. Its six-minute timeout bounds the job. It
reuses a temporary remote-dev preview and one manual localhost scheduled test;
it does not install a Cloudflare Cron Trigger or deploy the production Worker.
Normal exit/cancellation triggers the existing runner cleanup. Forced runner loss
or a provider request already in flight cannot be undone by that cleanup.

## 6. Report only the sanitized result

Copy only `Cashfree TEST response classification: ...`, or the fixed generic
failure message. A green GitHub job alone does not prove valid credentials: the
runner can complete with an inconclusive result. A skipped job did not execute.

| Result | Interpretation |
| --- | --- |
| `unauthorized` | HTTP 401; authentication rejected |
| `forbidden_or_product_restricted` | HTTP 403; permissions/product restrictions possible |
| `not_found_auth_inconclusive` | HTTP 404; does not prove successful authentication |
| `bad_request_auth_inconclusive` | HTTP 400/422; inconclusive |
| `unexpected_plan_found_investigate` | Unexpected 2xx for the fixed nonexistent plan; investigate |
| `rate_limited` / `provider_unavailable` | Provider throttling or server problem |
| `transport_failed` / `invalid_response` | Transport problem; not credential proof |
| No verified provider result captured | Execution/result not established; do not automatically retry |

Do not use Re-run jobs; the gate blocks it. Do not start another fresh workflow
without reviewing the first result and deliberately authorizing another attempt.
No plans, subscriptions, checkout, mandates, payment writes, or paid learner grants
are created by this test.

## 7. Clean up after the first attempt

Delete the temporary `mlos-cashfree-actions-once` token in Cloudflare. Then delete
only `MLOS_CASHFREE_PROBE_CF_TOKEN` from the GitHub Actions secrets page. Do not
delete existing CI/build credentials. The dedicated deployed Worker's network and
enable flags remain false, run mode disabled, and Cron list empty because this
workflow only uses process-level remote-dev overrides.

## References

- https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- https://developers.cloudflare.com/secrets-store/access-control/
