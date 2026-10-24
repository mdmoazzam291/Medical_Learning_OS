# Admin Navigation Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move authorized Admin entry to the avatar and confine Admin tools to Admin workspaces.

**Architecture:** Keep the canonical navigation model and server access checks. Filter global masters and legacy Admin pins at rendering, and reuse the existing contextual menu/drawer through an Admin-only local toolbar.

**Tech Stack:** Existing JavaScript modules, CSS, Node test runner and isolated Playwright checks; no dependencies added to the repository.

**Spec:** docs/superpowers/specs/2026-10-24-admin-navigation-isolation-design.md

## Global Constraints
- Modify only Admin entry/tools and regression verification; preserve learner workspace routes and features.
- No database/API/clinical/reviewer changes and no invented authenticated production acceptance.
- Preserve authorization, independent groups, history and unsaved Admin drafts.

## Review Focus
- Legacy saved Admin pins on every learner master must remain absent from those menus.
- Phone Admin still needs a single usable tools trigger after the global Admin entry is removed.
- Revoked/failed grants remove the avatar entry and local Admin tools.
- Keyboard dismissal and orientation changes must restore focus to the local trigger.
- Normal learner shortcuts, navigation and appearance must remain unchanged.

### Task 1: Isolate Admin entry and tool navigation

**Files:** web/navigation-view.js, web/navigation.css, src/domain/app-navigation.js, web/content-import.html; tests/admin-navigation-regressions.test.js, tests/navigation-view.test.js; existing browser scripts and their Admin selectors.

**Interfaces:** navigationMarkup/workspaceMenuMarkup consume signedIn/isAdmin/master/preferences and produce the existing shell. Existing data-workspace-menu and data-rail handlers operate local Admin trigger without new authority.

- [x] Write rendering regressions for four global learner masters, authorized avatar entry, no learner Admin pins, local Admin trigger and denied states; retain learner pin checks.
- [x] Run node --test tests/admin-navigation-regressions.test.js and observe missing isolation/entry failures.
- [x] Implement rendering filters, avatar entry and local Admin toolbar. Remove only the redundant Admin intake navigation row and add its existing relationship anchor to Admin tools.
- [x] Update existing browser journeys to enter Admin through the avatar; assert no Admin controls in learner menus and preserve draft/history/denial checks.
- [ ] Run focused tests, npm test, npm run check, npm run build:pages and diff whitespace verification; expected zero failures.
- [ ] Save code/docs checkpoint remotely before hosted CI. Run existing Chromium/WebKit journeys and independent review; repair reproduced failures with RED-to-GREEN evidence.
- [ ] Merge/release authorized scoped repair after checks; verify actual delivered source and public denial, record production authentication limits and final handoff.

## Progress

Independent review: two Important findings reproduced and fixed (intake draft/history and Admin phone rotation focus); no Critical/Minor. Full1460/1460 Node tests pass after reviewer fixes. Initial local browser launch failed because Chromium was absent; isolated pinned browser installation completed. Local navigation/hosted verification pending. No production changes yet.
