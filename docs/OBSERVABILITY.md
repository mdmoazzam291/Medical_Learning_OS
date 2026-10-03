# Observability and failure monitoring

## Objective

Catch product failures early without turning learner telemetry into a second copy of the learning record.

Observability is operational infrastructure. It must not become an analytics side channel for mastery, medical answers, clinical content, or learner identity.

## Current foundation

The browser has a dependency-free error-monitoring boundary:

- `src/adapters/error-monitoring.js` normalizes and scrubs captured failures.
- `web/monitoring.js` is the provider bridge.
- Caught persistence and unexpected account/cloud failures pass through that boundary.
- Monitoring failure can never break the learner workflow.
- The bridge is currently a no-op unless a supported Sentry browser SDK is present as `globalThis.Sentry`.

This keeps the current dependency-light preview working while making the eventual Sentry connection a provider configuration step rather than a rewrite of product error handling.

## Data minimization

Never send these values to an error-monitoring provider:

- access or refresh tokens
- Authorization headers or cookies
- passwords, API secrets, service-role keys, database credentials, SMTP credentials
- learner email address
- raw learner UUID when a non-identifying correlation tag can be used instead
- question answer keys or selected option payloads
- medical question stems/explanations when they may contain licensed or sensitive content
- clinical notes, patient details, uploaded records, prompts containing personal/medical data
- request/response bodies by default

The adapter scrubs common secret/token/email patterns and sensitive field names before any provider sink receives an event. Provider-side data scrubbing remains a second layer, not a substitute for application-side minimization.

## Sentry rollout

Sentry is now connected for the hosted browser preview using the project public DSN/client key. No Sentry API/auth token is stored in the repository or browser.

When the operator creates the Sentry project:

1. Use one project initially for Medical Learning OS and distinguish `runtime=browser` and later `runtime=edge` with tags.
2. Keep Session Replay off initially.
3. Keep default PII sending off and enable Sentry data scrubbing plus IP-address scrubbing.
4. Start with error events only. Performance tracing can be evaluated later after privacy and quota behavior are measured.
5. Configure environments as `preview` and later `production`.
6. Add the browser SDK/loader only after the project DSN exists and update CSP for the exact Sentry hosts required by that DSN.
7. Add the Edge Function SDK separately using a server-side environment variable. Do not place Sentry auth tokens in browser code or git.
8. Send one deliberate test error per runtime, verify redaction, then remove the test path.

## Event contract

Useful tags:

- environment
- runtime
- component
- operation
- stable error code
- HTTP status when applicable
- release/commit after deployment injection exists

Do not attach learner content merely because it may help debugging. Prefer stable identifiers for code paths and reproducible state transitions.

## Alerting policy

### Resend runtime configuration and acceptance

The application uses `mlos_resend_api_key` in Supabase Vault (or `RESEND_API_KEY` in the Edge Function environment). Alert sending also requires `MLOS_ALERT_FROM` with a verified owned sending domain. The recipient is the singleton content admin's Auth email; it is not a learner mailing list.

Live check on 2026-10-03: the dedicated sending-only credential is stored server-side, but `GET /usage` returns `401 restricted_api_key`. Resend's [Account Usage API announcement](https://www.resend.com/changelog/account-usage-api) says any key works; the live permission response takes precedence. Do not expand the runtime credential to full account-management access merely to hide this configuration gap. Usage telemetry remains unconnected until an approved credential with usage access is provided.

The monitor represents HTTP 401/403 as `configured / credential_permission_required`, not a provider outage. Successful usage reads must contain valid nonnegative integer usage and numeric-or-null limits for both daily and monthly windows. Missing/malformed quota data cannot produce synthetic zero usage or a healthy state. A null quota is uncapped; zero allowance is exhausted. Genuine HTTP/service failures remain unavailable.

At the current acceptance checkpoint, Resend has no sending domain and there are no real notification delivery receipts. Connector account access and a saved key do not prove application read telemetry or email delivery. After DNS verification, configure the sender, exercise a controlled owner alert and recovery using the existing debouncing policy, and independently verify the provider delivery status. No learner/medical content may enter the alert payload.

Alert on failures that can corrupt or block learning evidence:

- persisted answer write failure above an agreed threshold
- cloud study API 5xx increase
- authentication/refresh outage
- catalog/version invariant failure
- backup/restore failure
- content publication-gate failure

Do not page on ordinary invalid credentials, user mistakes, expected 4xx responses, or transient noise unless rates indicate a systemic problem.

## Success metric

Observability is successful when meaningful failures are detected quickly, diagnosed with minimal learner data, and prevented from silently corrupting the learner model.


## Current Sentry browser configuration

The hosted Render preview loads the Sentry Browser JavaScript Loader only on `*.onrender.com`.

Privacy constraints:

- errors only
- `sendDefaultPii: false`
- zero breadcrumbs
- zero trace sampling and transactions dropped
- no Session Replay
- no structured Logs
- no Application Metrics
- no learner identity set on the Sentry scope
- request bodies/headers/cookies removed before send
- query strings removed from request URLs
- application-side token/email/credential scrubbing remains active

CSP permits only the Sentry loader/bundle CDNs and this project's exact US ingest host.

The temporary controlled-ingestion trigger has been removed after successful verification.


### Loader ordering correction

The first browser ingestion test produced no Sentry issue. The integration was then aligned with Sentry's Loader Script requirement: the local configuration shim now defines `window.sentryOnLoad` before the Sentry Loader Script, the Loader Script is emitted before any application module, and the full SDK is loaded eagerly with `data-lazy="no"`.

The provider-neutral `web/monitoring.js` module no longer inserts the Sentry script dynamically. It only sends already-sanitized failure envelopes through the Sentry API stub/SDK exposed by the early loader.


### Verified ingestion and local-noise correction

The controlled browser event was received by Sentry with the learner email/token material redacted in the issue title, confirming the application-side scrubber and provider path.

The same verification also exposed an implementation flaw: the static Sentry Loader Script was loading in localhost/CI despite documentation saying preview-only. That caused deliberate browser-test failures such as quota and unsupported-data simulations to appear as Sentry issues.

The loader is now inserted only when the hostname ends in `.onrender.com`. Localhost and CI no longer initialize Sentry. The temporary controlled test trigger has been removed.
