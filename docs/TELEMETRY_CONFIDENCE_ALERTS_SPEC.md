# Telemetry, confidence experiment and alert delivery specification

Date: 2026-10-03

## Goal

Complete three linked operational/experimental capabilities without creating duplicate sources of truth:

1. Read Sentry and Resend operational telemetry through the existing infrastructure monitor.
2. Add a second genuinely experimental learner feature, confidence capture, behind the canonical beta entitlement system.
3. Deliver infrastructure alerts only after meaningful repeated failure, with cooldown and recovery rules that prevent notification spam.

## Constraints

- Keep observability outside learner evidence and medical truth.
- Keep secrets server-side in Supabase Vault or provider control planes; never expose service credentials to browser code or git.
- Confidence is observed learner self-report, not mastery, correctness, ability or causal diagnosis.
- Confidence collection must not change scoring, Study Now selection, revision timing, Digital Twin inference or content publication.
- Feature access is enforced server-side using `learner_feature_allowed_v1`.
- New learner-scoped evidence must be included in export and privacy-erasure scope before production rollout.
- Alert delivery state must be idempotent and auditable.
- A single transient provider failure must not notify.
- Default alert policy: notify after 2 consecutive unhealthy observations; suppress repeats for 6 hours; notify immediately on warning→critical escalation; resolve and send one recovery after 2 consecutive healthy observations.
- Alert payloads contain operational metadata only. No learner identity, questions, answers, tokens, medical content or request bodies.
- Resend is the first alert-delivery channel. Delivery must fail soft: a failed notification cannot corrupt provider-health state.
- Existing 15-minute infrastructure-monitor cadence remains unchanged.

## Q1 telemetry

The existing `infrastructure-monitor` continues to own provider probes. Resend reads account usage from `GET /usage`. Sentry reads unresolved issues and recent event volume. Missing provider credentials remain an explicit `configured / credential_required` state, not a false healthy state.

Secrets:
- `mlos_resend_api_key`
- `mlos_sentry_auth_token`
- `mlos_sentry_org`
- `mlos_sentry_project`

## Q2 confidence experiment

Feature key: `answer_confidence_capture`

Initial audience: `beta`.

Learner options, stored as stable codes:
- `guess`
- `unsure`
- `fairly_sure`
- `certain`

The learner may answer without confidence if the feature is disabled. When enabled, confidence is requested before answer submission and persisted as a separate immutable self-report event bound to the accepted attempt, exact learner, exact question version and server timestamp.

Confidence evidence must not be embedded into `question.answered@1`.

## Q3 alert delivery

Provider health evaluation maintains consecutive-unhealthy and consecutive-healthy counters per provider. The state machine emits delivery intents only on:

- second consecutive unhealthy observation opening an alert;
- severity escalation from warning to critical, even inside cooldown;
- an open alert that remains unhealthy after a 6-hour notification cooldown;
- second consecutive healthy observation resolving an open alert.

Each intent has a deterministic idempotency key and an immutable delivery receipt recording attempted/sent/failed status and provider response identifier when available.

Recovery notification is sent once per alert lifecycle. A delivery failure leaves the alert open/resolved according to health evidence and can be retried using the same idempotency key.

## Success criteria

- Resend read telemetry reaches `healthy` when the monitor credential is present and account usage is below thresholds.
- Sentry read telemetry reaches `healthy` only after its read token/org/project are present and API reads succeed.
- Beta learner receives confidence UI and can submit one confidence self-report bound to one accepted answer attempt; non-beta learner does not receive that capability.
- Confidence export/erasure coverage is complete.
- One unhealthy monitor result creates no notification.
- Two consecutive unhealthy results open and notify once.
- Repeated unhealthy checks inside 6 hours do not notify again.
- Warning→critical escalation notifies immediately.
- Two healthy checks resolve and send one recovery notification.
- Full repository checks remain green before merge.
