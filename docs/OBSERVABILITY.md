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

A temporary preview-only `?monitoring_test=1` trigger sends one sanitized controlled event per browser session. It is strictly a verification mechanism and must be removed immediately after the event is confirmed in Sentry.


### Loader ordering correction

The first browser ingestion test produced no Sentry issue. The integration was then aligned with Sentry's Loader Script requirement: the local configuration shim now defines `window.sentryOnLoad` before the Sentry Loader Script, the Loader Script is emitted before any application module, and the full SDK is loaded eagerly with `data-lazy="no"`.

The provider-neutral `web/monitoring.js` module no longer inserts the Sentry script dynamically. It only sends already-sanitized failure envelopes through the Sentry API stub/SDK exposed by the early loader.
