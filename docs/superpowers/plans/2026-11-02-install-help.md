# Installation help implementation plan

> **For agentic workers:** Use superpowers:executing-plans. Owner requests autonomous execution.

**Goal:** Make installation instructions reachable in the normal app and improve preview troubleshooting.
**Architecture:** A script-free allowlisted HTML guide with explicit Home navigation; ordinary menu links. Keep preview identity and account restrictions separate.
**Tech Stack:** Existing static HTML/CSS, Node tests and both-engine CI.
**Spec:** docs/PWA_INSTALL_FOUNDATION.md; owner request 2 November 2026.

## Global constraints
Keep root identity, existing icon geometry, existing sign-in content hashes and authorization unchanged. No serviceworker, offline cache, forced reload, dependencies or production publication.

## Review focus
Embedded browsers may omit installation controls; explain opening Safari/Chrome.
A standalone guide needs its own Home link, independent of browser Back.
A signed-in learner and a guest both need a discoverable install link.
Preview instructions must not invite authentication or claim session acceptance.
Long instructions and official links must fit phone/tablet/desktop.

### Task 1: Discoverable installation help
Files: web/install.html, scripts/public-surface.js, web/navigation-view.js, scripts/public-install-guide.js, tests/pwa-install-help.test.js, scripts/brand-browser-check.js, scripts/public-install-preview-browser-check.js.
Interface: /web/install.html (canonical hosted /web/install) serves script-free guidance in both profiles; preview retains its distinct body and name.
- [x] Add tests for normal build guide, manifest/head metadata, no scripts/forms, Home route, both guest/signed-in menu access and profile separation. Run for expected missing-guide failure.
- [x] Implement static guide/menu links and preview troubleshooting; preserve all account routes and install identity.
- [x] Extend actual built-bundle browser checks across three widths and guide/Home navigation, without treating browser rendering as OS installation proof.
- [x] Run focused tests, full npm test, npm run check and both build profiles; review changes independently, save source checkpoint and inspect exact source CI.
- [x] Update STATUS/AI_HANDOFF with source, verification limits and physical-device next action; persist and read back remote files.

Pre-flight: one task; no shared task interfaces.

Validation: RED missing normal guide/menu; GREEN focused17/full1557/check13services250couplings/normal128/public36 builds. Fresh review13testsPASS; browser assertion-order finding corrected. Exact sourceCI and final evidence pending.

CI correction: source1d29507 Chromium guide/previewPASS, later public-navigation exact-label assertion retained pre-feature menu; update only expected labels to include InstallMedretica. Physical/media-emulation proof remains excluded.

Complete: correctedsource dd82ad3 / Foundation41457816652 all3SUCCESS; core1557tests/normal128build, both-engine guide/publicpreview/publicmenu/fullnavigation PASS. Cloudflarepreview3f0c7bda build/deploySUCCESS andguideobserved; physicalinstall/authenticatedreopen pending. Evidence-only checkpoint CI separate. No unresolved review findings or deferred minors.
