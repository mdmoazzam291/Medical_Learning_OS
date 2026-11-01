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
- [x] Write native crash test first and observe missing restart capability in isolated CI.
- [x] Add controlled pg_ctl immediate shutdown/same-directory restart, verify recovery log, durable settings/receipt/history and incomplete-write rollback.
- [x] Verify simulated lost acknowledgement retry, denied states and postcrash snapshot restore/ACL.

### Task 2: Compatibility audit and verification
- [x] Map actual owner-api getUser/runtime-session/Admin boundary to evidence requirements; document reuse and blockers, no live Auth claim.
- [x] Run core/syntax checks, read-only review and exact-head native CI; update handoff/PR.

Execution evidence: expected missing-hook RED at95b2378/run41171677157/job124450852230; implemented pg_ctl immediate/same-directory restart, GREEN atcf4c33d/run41171957291/job124451684840. Original races/negative control plus WAL/committed/uncommitted/denial/postcrash restore/cleanup PASS. Four existing runtime helper behavior tests/full1,625 suite and repository checks PASS; static review no blocker. No hardware-power-loss or hosted Auth certification.
