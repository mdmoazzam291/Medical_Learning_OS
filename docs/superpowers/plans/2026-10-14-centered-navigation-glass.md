# Centered Navigation and Glass Appearance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for direct execution, or superpowers:subagent-driven-development if the owner chooses that method. Follow tasks in order; steps use checkbox syntax.

**Goal:** Implement the owner-selected centered top navigation for tablet/desktop, with opt-in palette-following Glass in Preferences and opaque learning surfaces.

**Architecture:** Reuse the canonical route catalog and existing preference store; add one validated `surfaceStyle` field. Replace larger-screen sidebar reservations with a single top-anchored contextual disclosure for the selected workspace; use the same navigation DOM and controller in Standard and Glass. Preserve the released <=700px phone menu, authorization checks, and all in-page learner/admin content.

**Tech Stack:** Existing dependency-free ES modules, CSS, Node >=24 tests and existing Playwright Chromium/WebKit CI. No new runtime dependency or backend/schema change.

**Spec:** `docs/FINAL_NAVIGATION_APPEARANCE.md` / ADR-113. Owner confirmed all three refinements in Q1/Q2/Q3 on 2026-10-14.

## Global Constraints

- Color palette: existing Sage Precision / Lavender Precision, using their canonical existing tokens.
- Surface style: Standard (option 1, default) / Glass (option 2, opt-in).
- Appearance: existing Light / Dark.
- No permanent tablet/desktop navigation rail or sidebar; preserve released phone behavior from PR #232.
- Preserve ALL registered Library/Study/Exams/Admin routes and nested subject/module/reference groups from `src/domain/app-navigation.js`.
- One outer menu open at a time; nested disclosures open independently.
- Navigation controls aim for at least 44 CSS px touch targets; fit takes precedence over mathematical centering.
- Opaque note/question/explanation surfaces; tint Glass from the selected permanent palette, with no white navigation-panel backgrounds.
- Preferences remain device-local with page-memory fallback; do not alter answers, drafts, filters, pins, groups, sessions, exam locks or authorization.

## Review Focus

- A near-threshold authorized-admin header must fit without changing master order or losing destinations (Tasks 2/4).
- Resize/rotation while a menu is open must dismiss stale geometry, return focus and retain preference data (Tasks 2/4).
- Admin role revocation while its menu is open must close it and remove gated links; stored pins cannot grant access (Tasks 2/4).
- Long nested subject/reference disclosures must scroll inside the viewport and remain independently open (Tasks 2/4).
- Appearance edits with blocked storage must retain pins/groups and unsaved learner forms while accurately reporting page-memory persistence (Tasks 1/3/4).

## File map

- `src/domain/app-navigation.js`: validation, migration and mutation of `surfaceStyle`; route catalog remains authoritative.
- `web/navigation-view.js`: centered master/disclosure markup and complete contextual menu using existing `childrenMarkup`/section rendering.
- `web/navigation.js`: menu state, trigger anchoring, dismissal/focus, breakpoint adaptation and preference attributes.
- `web/navigation.css`: centered header, contextual popover, narrow fallback and navigation-only glass rules.
- `web/workspace-view.js`: Surface style selector; remove obsolete visible left-rail preference for larger screens without deleting stored legacy preference data.
- `web/workspace.js` / `web/navigation-preferences.js`: existing `mlos:preferences` synchronization; change only if behavioral tests demonstrate a need.
- Existing `tests/app-navigation.test.js`, `tests/navigation-view.test.js`, `tests/navigation-preference-sync.test.js`, `tests/workspace-view.test.js`, `tests/navigation-overlay-regressions.test.js`, `tests/navigation-actions-regressions.test.js`, `tests/admin-navigation-regressions.test.js`: affected behavioral tests.
- `scripts/navigation-browser-check.js`: actual browser fit, menu reachability, appearance/persistence and screenshots. Update shared-shell assertions in other browser scripts only where the old sidebar requirement was superseded.
- `README.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/AI_HANDOFF.md`: final runtime evidence and handoff.

### Task 1: Validated independent surface preference

**Interfaces:** Keep `validatePreferences(value)`, `changePreference(value, action)` and `preferenceStore(storageAccess)` signatures. Produce `surfaceStyle: 'standard' | 'glass'` in validated v1 preferences; add action `{ type: 'surfaceStyle', value }`. Keep storage key `mlos-navigation-v1` and all old fields.

- [ ] Add tests: absent/invalid style defaults to `standard`; `glass` survives JSON reload; unknown fields are discarded; theme/palette actions retain style; style edits retain valid pins/groups/expanded. Existing pre-style records migrate without dropping data.
- [ ] Add blocked-storage synchronization test using both navigation/editor stores: group/pin edits followed by Glass/palette/theme edits stay coherent and `persistence === 'session'`.
- [ ] Run `node --test tests/app-navigation.test.js tests/navigation-preference-sync.test.js`; confirm new assertions fail before implementing.
- [ ] Implement the field/action allowlist and adjust existing exact-object expectations for the additional validated field.
- [ ] Rerun those tests; commit only changed domain/sync tests and implementation.

### Task 2: Complete top contextual navigation without permanent side width

**Interfaces:** Preserve `navigationMarkup(options)`, `childrenMarkup(...)`, `flyoutMarkup(...)` and `accountMarkup(...)` callers. For widths >700px render each real master link with a separate button `data-workspace-menu="<id>"`, labelled `Open <workspace label> tools`, `aria-expanded`, `aria-controls="mlos-workspace-menu"`. Render a hidden top-anchored contextual container `#mlos-workspace-menu`, using expanded existing sections and pins from the selected menu's master. Keep the phone branch unchanged.

- [ ] Add markup tests that each visible master has its independent link/disclosure, Admin is server-gated, Account stays in avatar, and no permanent sidebar is exposed for larger screens. Compare every unique rendered route against `navigationFor(master, {isAdmin:true})`, including all nested leaves; do not hardcode the mockup's five rows.
- [ ] Add controller tests for selecting a workspace menu without navigating, switching outer menus, independent group persistence, outside/Escape/route dismissal with focus return, and role revocation removing an open Admin menu.
- [ ] Add regression tests for Library URL-filter ownership and Admin hash transitions preserving the already-mounted workspace/draft DOM. Retain existing exact route matching and access-error behavior.
- [ ] Run affected navigation tests and confirm new behavior fails before implementation.
- [ ] Implement `openWorkspaceMenu(master, trigger)`, `closeWorkspaceMenu(restoreFocus = false)` and `positionWorkspaceMenu()` inside `web/navigation.js`. Reuse real catalog rendering; anchor fixed positioning below the trigger, clamp within 12px viewport gutters, and limit height to the visible viewport. Open only one outer menu; keep nested groups/pins in the existing preference store.
- [ ] On resize/route/role changes dismiss stale menus; opening account/search closes workspace menus. Do not inert learning content for the nonmodal popover; maintain the existing phone drawer focus behavior. Keep selector focus stable when pin/style mutations redraw the shell.
- [ ] Implement the larger-screen single header in `navigation-view.js` and larger-screen CSS: zero body left padding, 56px header, equal flexible outer regions for centering, compact labeled masters and separate 44px chevron targets. Start compact fallback at 1000px: labeled current-workspace launcher opens the same canonical masters/tools with no sidebar; verify the threshold in Task 4 and increase it if admin labels do not fit. At <=700px retain the existing phone DOM/behavior.
- [ ] Rerun affected tests and commit the complete controller/view/layout change.

### Task 3: Preferences control and navigation-only tinted glass

**Interfaces:** `preferencesContent(prefs, persistence)` gains select `aria-label="Surface style" data-preference="surfaceStyle"`, options `standard` / `glass`, labels Standard / Glass. `applyAppearance()` sets `document.documentElement.dataset.surfaceStyle`. Existing change-event and `mlos:preferences` channel handles the field without inventing a second store.

- [ ] Add rendering tests for both style choices and retained Sage/Lavender + Light/Dark controls. Assert obsolete left-navigation UI does not imply a permanent tablet/desktop sidebar; old `expanded` data remains stored for phone compatibility.
- [ ] Add controller/sync tests proving style changes preserve palette/theme/groups/pins/search and do not rebuild the page's question/private-note/admin root. Run targeted tests to confirm new assertions fail.
- [ ] Implement the selector and root attribute; keep existing preference-store page-memory reporting.
- [ ] Add glass navigation variables from existing tokens: opaque fallback uses palette `--soft` in light mode and `--sidebar` in dark; backdrop-supported glass derives a semiopaque tint from those same values plus accent, with a restrained border/shadow. Scope blur to header, master capsule, contextual/account/search menus only, above 700px. Default Standard has no blur. Respect reduced transparency and reduced motion; no moving gradient behind study text.
- [ ] Keep reading cards/questions/notes/explanations on existing opaque `--surface`/`--card`; do not change global palette color definitions or clinical semantic colors. Standard and Glass share geometry and routes.
- [ ] Rerun preference/view/controller tests; commit the complete settings/style change.

### Task 4: Real responsive acceptance, release-ready checkpoint

**Interfaces:** Extend existing `scripts/navigation-browser-check.js`; reuse authenticated synthetic fixture/role gates and `BROWSER_ENGINE` / `PLAYWRIGHT_MODULE_URL` hooks. No real learner/content writes.

- [ ] Update old sidebar-specific tablet/desktop assertions to top-menu behavior; keep phone acceptance. Exercise all canonical leaf destinations through the new disclosure at 820x1180, 1180x820, 1440x1000 and narrow 701/999/1000px authorized-admin headers. Keep 320/390/620px phone checks and test rotation across compact/full boundaries with a menu open.
- [ ] Verify all 8 combinations Standard/Glass x Sage/Lavender x Light/Dark. Change styles in Preferences, reload and navigate to Home/Study/Library/Admin; assert preference equality, no horizontal overflow, and zero sidebar reservation for tablet/desktop.
- [ ] Assert computed backdrop filter disabled for reading surfaces and Standard; Glass navigation tint differs from white, with opaque fallback/reduced transparency. Verify pointer/touch, keyboard Tab/Enter/Escape, outside click, focus return, same-route links and nested menu scrolling. Test independent sibling groups and role denial/revocation.
- [ ] Exercise unsaved private-note/admin draft preservation, Back/Forward with Library filters, query/fragment access boundaries, successful/failed signout and existing locked-section exam flows. Retain reportable synthetic-versus-physical-device limits.
- [ ] Run `npm test`, `npm run check`, `npm run build:pages`. Run Chromium and iPad WebKit navigation jobs with the existing CI runtime. If local browsers are unavailable, push a WIP checkpoint and use existing CI; do not claim browser success from static tests.
- [ ] Inspect screenshots of Home, active Study, Library menu/nested indexes, Preferences and authorized Admin in both palettes; correct demonstrated fit/contrast failures and rerun only affected checks.
- [ ] Update README/spec status/STATUS/DECISIONS/AI_HANDOFF with actual code SHA, PR, exact results and remaining limits; review focused diff, push and verify remote head. No automatic production merge or publication is part of this plan.

## Plan review and execution

Plan self-reviewed against the saved owner spec. Await owner review of this concrete plan and execution-method choice. Direct execution is recommended: tasks share a single navigation shell/controller and preference model, making sequential work economical. No runtime changes have been made while preparing this plan.
