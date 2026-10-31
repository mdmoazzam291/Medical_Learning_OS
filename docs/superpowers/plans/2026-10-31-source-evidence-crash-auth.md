# Native crash recovery and session compatibility plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Verify immediate-shutdown/WAL recovery and audit the existing server session boundary before any hosted evidence adapter.
**Architecture:** Existing private native cluster, synchronous durability settings, acknowledged/uncommitted/lost-ack simulation and denied-state fixtures; immediate PostgreSQL shutdown followed by same-data-dir restart. No hosted data.
**Tech Stack:** Existing pinned native PostgreSQL18.6/pg8.22.0 CI tools; repository owner-api/session code.
**Spec:** docs/SOURCE_EVIDENCE_DATABASE_DESIGN.md.

## Global constraints
No real sessions, migrations, credentials, reviewer grants or production endpoints. Immediate shutdown is not physical power-loss certification. Run native test on existing non-root CI runner; local UID0-only namespace stays blocked.

## Review focus
Graceful restart falsely called a crash; uncommitted transaction surviving; policy/withdrawal state resurrected; client error/cleanup leaks; singleton Admin mistaken for exact package or independent reviewer authority.

### Task 1: Crash acceptance
- [ ] Write native crash test first and observe missing restart capability in isolated CI.
- [ ] Add controlled pg_ctl immediate shutdown/same-directory restart, verify recovery log, durable settings/receipt/history and incomplete-write rollback.
- [ ] Verify simulated lost acknowledgement retry, denied states and postcrash snapshot restore/ACL.

### Task 2: Compatibility audit and verification
- [ ] Map actual owner-api getUser/runtime-session/Admin boundary to evidence requirements; document reuse and blockers, no live Auth claim.
- [ ] Run core/syntax checks, read-only review and exact-head native CI; update handoff/PR.
