# Telemetry, Confidence Experiment and Alert Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate read telemetry, add beta-gated answer confidence evidence, and deliver debounced infrastructure alerts without notification spam.

**Architecture:** Extend the existing canonical owner operations and study APIs. Confidence is a separate immutable self-report event, not part of scoring; alert delivery is a side-effect layer driven by persistent provider-health state and immutable delivery receipts; provider telemetry remains owned by the existing monitor.

**Tech Stack:** Supabase Postgres/Vault/Edge Functions, plain JavaScript browser app, Node test runner, GitHub Actions, Resend API, Sentry API.

**Spec:** `docs/TELEMETRY_CONFIDENCE_ALERTS_SPEC.md`

## Global Constraints

- No browser or git secrets.
- Confidence cannot affect scoring, Study Now, revision, mastery or Digital Twin inference.
- Initial `answer_confidence_capture` audience is `beta`.
- Alert policy is 2 unhealthy / 6-hour cooldown / immediate escalation / 2 healthy recovery.
- New learner evidence must ship with export and erasure coverage.
- Provider notification failures are fail-soft and never rewrite health evidence.
- Existing 15-minute monitor cadence stays unchanged.

## Review Focus

- Duplicate/retried confidence writes must not create multiple self-reports for one attempt/request.
- Non-beta learners must be denied server-side even if they craft the confidence request manually.
- Alert counters must reset correctly when health flips before a threshold is reached.
- Delivery retries must reuse an idempotency key and not create duplicate logical notifications.
- Alert email content must remain operational-only and omit learner/medical payloads.

---

### Task 1: Confidence evidence behind beta entitlement

**Files:**
- Create: `tests/answer-confidence-beta.test.js`
- Create: `supabase/migrations/<next>_answer_confidence_beta.sql`
- Modify: `supabase/functions/study-api/index.ts`
- Modify: `src/adapters/cloud-study.js`
- Modify: `web/medical.js`
- Modify: privacy/export contracts as required by existing schema functions

**Interfaces:**
- Consumes: `learner_feature_allowed_v1(uuid,text)` and canonical accepted attempt IDs.
- Produces: `answer_confidence_capture` feature flag and immutable `confidence.recorded` self-report writes.

- [ ] **Step 1: Write failing tests** asserting beta feature registration, server entitlement enforcement, stable confidence codes, separate immutable evidence, export/erasure coverage and browser gating.
- [ ] **Step 2: Run CI and verify RED** because confidence schema/API/UI do not yet exist.
- [ ] **Step 3: Implement minimal migration/API/adapter/UI** satisfying those assertions without changing scoring or recommendation logic.
- [ ] **Step 4: Run CI and verify GREEN.**
- [ ] **Step 5: Commit task changes.**

### Task 2: Consecutive-failure alert state and delivery receipts

**Files:**
- Create: `tests/infrastructure-alert-delivery.test.js`
- Create: `supabase/migrations/<next>_infrastructure_alert_delivery.sql`
- Modify: `supabase/functions/infrastructure-monitor/index.ts`
- Modify: `supabase/functions/owner-api/index.ts` only if owner visibility needs new receipt fields

**Interfaces:**
- Consumes: provider snapshots from `owner_monitor_record_provider_v1` and Resend credential from Vault.
- Produces: thresholded alert transitions, notification intents, immutable delivery receipts and Resend delivery attempts.

- [ ] **Step 1: Write failing tests** for first-failure suppression, second-failure open+notify, 6-hour cooldown, immediate severity escalation, two-healthy recovery and idempotent delivery receipts.
- [ ] **Step 2: Run CI and verify RED.**
- [ ] **Step 3: Implement persistent provider streak state, alert-transition RPCs and fail-soft Resend delivery.**
- [ ] **Step 4: Run CI and verify GREEN.**
- [ ] **Step 5: Commit task changes.**

### Task 3: Activate provider read telemetry and live verification

**Files:**
- Modify: `docs/OBSERVABILITY.md`
- Modify: `docs/STATUS.md`
- Modify: `docs/DECISIONS.md` if a material operational decision is introduced

**Interfaces:**
- Consumes: existing Sentry/Resend monitor probes and Vault allow-list.
- Produces: truthful live telemetry state with no false healthy fallback.

- [ ] **Step 1: Verify current live state** and record missing provider credentials.
- [ ] **Step 2: Create/store a dedicated Resend monitor credential and verify `/usage` through the live monitor.**
- [ ] **Step 3: Connect Sentry read telemetry if an account-scoped read credential is available; otherwise leave explicit `credential_required` and record the exact remaining gate.**
- [ ] **Step 4: Exercise one controlled alert transition without notifying learners and verify receipt/cooldown behavior.**
- [ ] **Step 5: Run repository CI, Supabase security advisor, live monitor checks and update status/docs.**

### Task 4: Whole-branch verification and release decision

**Files:**
- Modify: `docs/STATUS.md`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: reviewed PR ready for merge only if tests and live safety checks pass.

- [ ] **Step 1: Review the whole PR diff against the spec and Review Focus.**
- [ ] **Step 2: Fix Critical/Important findings with RED→GREEN tests.**
- [ ] **Step 3: Verify full Foundation checks and relevant browser suites.**
- [ ] **Step 4: Record limitations and merge only after green checks.**
