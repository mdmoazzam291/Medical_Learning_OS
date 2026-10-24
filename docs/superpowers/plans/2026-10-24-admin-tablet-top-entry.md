# Responsive Admin Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the authorized Master Admin entry to tablet/desktop top navigation while preserving phone avatar entry and tool isolation.

**Architecture:** Adjust existing navigation rendering only. Keep Admin canonical routes, local toolbar, authorization and saved-pin filters. Reuse current responsive boundary and existing browser journeys.

**Tech Stack:** Existing JavaScript/CSS, Node tests, Chromium and WebKit; no new dependencies.

**Spec:** docs/superpowers/specs/2026-10-24-admin-tablet-top-entry-design.md

## Global Constraints
- Top entry above700px; avatar entry at700px and below.
- One authorized entry per responsive layout; no Admin tool disclosure inside learner menus.
- Preserve denied/revoked behavior, independent groups and drafts; no backend/content changes.

## Review Focus
- iPad narrow widths must fit the fifth master without overflow.
- Phone/tablet rotation must relocate one Admin entry, retaining local Tools focus behavior.
- Revocation removes the entry in both placements.
- Legacy Admin pins remain invisible in learner menus.
- Feature map describes implemented behavior and limits without promising live readiness.

### Task1: Placement and source-backed feature map

Files: web/navigation-view.js; tests/admin-navigation-regressions.test.js, tests/navigation-view.test.js; scripts/navigation-browser-check.js, scripts/browser-check.js; Admin map/design/status docs.

- [ ] Update responsive entry regression first; observe tablet top-entry failure.
- [ ] Render authorized Admin destination in top row without a tools disclosure; omit duplicate wide avatar link and preserve phone entry.
- [ ] Update browser entry discovery and verify both layouts, fits, drafts and denial.
- [ ] Run focused/full Node, check/build, Chromium/WebKit; independent review, then scoped release and receipt.
- [ ] Deliver complete Admin map and prioritized suggestions; do not implement broader suggestions.
