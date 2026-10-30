# Disposable evidence database prototype implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Exercise real disposable SQL transactions and role privileges for owner-only metadata staging/readback.
**Architecture:** Nonmigration SQL fixture in ops/prototypes, standalone PGlite check script with synthetic authority and canonical JavaScript envelope preparation; no hosted client/adapter.
**Tech Stack:** Existing JS canonical contracts, SQL/PLpgSQL, scratch-pinned PGlite 0.5.13.
**Spec:** docs/SOURCE_EVIDENCE_DATABASE_DESIGN.md

## Global constraints
No migration filename, deployment, app dependency, source text, real grant or production connection. SQL byte hashing is not JCS validation; existing JS recomputation remains mandatory.

## Review focus
Partial inserts rollback; exact retry unchanged; conflicting identity/digest; direct browser role denial; stale authority and mixed-source rights. Disposable script asserts each.

### Task 1
Files: ops/prototypes/source-evidence/schema.sql, scripts/source-evidence-db-check.js, ops/prototypes/source-evidence/README.md.
- [x] Write executable assertions against empty prototype function, observe missing behavior.
- [x] Implement owner-only SQL revision/case/request/event and source policy/authority fixtures, strict canonical envelope binding checks, fault-injected rollback, protected exact readback.
- [x] Run disposable check, npm test and npm run check; review remaining limitations and privilege boundaries.
- [x] Record actual results, update handoff/status, persist draft PR #346. No real adapter acceptance or hosted release.

Execution record: placeholder positive commit assertion failed before SQL implementation. PGlite0.5.13 disposable script PASS for canonical readback, mixed-source selection, exact retry/conflict, four write rollback boundaries, browser ACLs, two enabled owner isolation, byte/approval tamper, policy/account denial. Full npm test1,621PASS/0FAIL; repository checkPASS (13 services/250 coupling locations). Reviewer identified second-owner coverage gap; correct authenticated synthetic-owner assertions added and disposable script rerun PASS. Reduced-prototype limitations explicitly recorded.
