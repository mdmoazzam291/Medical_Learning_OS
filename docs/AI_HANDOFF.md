# Current engineering handoff

Snapshot: 2026-10-14 (Asia/Kolkata). Verify remote evidence before resuming.

## Current task
- Checked 2026-10-14 Asia/Kolkata. Owner uploaded Cloudflare deployment screenshot showing **Build success (28s)** from main in the new `mlos-cashfree-sandbox` project. Deployment settings list the exact explicit command `npx wrangler deploy -c wrangler.cashfree-sandbox.jsonc`, root directory `/`, no build command, no build variables and a deployment-stage green check. Build identifier displayed `#166bcbc2` is a Cloudflare build label, not a GitHub commit SHA. No authenticated Cloudflare API inspection was available; verify target Worker name in Workers & Pages > Overview before attaching secrets.
- Previous owner screenshot verified two Workers-scoped account Secrets Store entries: `CASHFREE_TEST_APP_ID` and `CASHFREE_TEST_SECRET_KEY` Active, 2/100, no values shown. **Worker-level secret bindings still not verified/added.**
- `mlos-cashfree-sandbox` source and config merged in PR #245 (`591e841bcfb61f94ebe04bca54f7190d04c09526`), tests green in Foundation run 38565156604. The sandbox Worker config specifies `workers_dev=false`, `preview_urls=false`, no crons, flags all disabled, and HTTP fetch 404 only. This is preparation for read-only test diagnostics and does not create subscription orders, premium grants or payment collection. Cloudflare's visible “Production” label refers to **Cloudflare deployment environment**, not Cashfree production payment environment.
- **Next owner action** on iPhone: in Cloudflare Dashboard > Workers & Pages select `mlos-cashfree-sandbox` (not `medical-learning-os-web`), verify service identity and go to Settings > Bindings > Add > Secrets Store. Bind existing store secret `CASHFREE_TEST_APP_ID` to identically named variable; repeat for `CASHFREE_TEST_SECRET_KEY`; Deploy binding changes only to sandbox Worker. Do not paste/recreate secret values and do not edit public Worker. Send names-only screenshot after bindings.
- Cashfree TEST credential validity, merchant Subscriptions product entitlement and actual sandbox API behavior remain **unverified**. No separate approved controlled internal diagnostic has been invoked. Checkout, AutoPay mandates, production payment, billing state and consumer entitlements remain disabled. PhonePe is design-only backup and institution work deferred.
- Preserve Cloudflare auth/nav work, PYQ intake, legal/rights gates, and unrelated PRs. No Cloudflare connector/API keys in chat; deployment screenshot is user-provided evidence only.

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
