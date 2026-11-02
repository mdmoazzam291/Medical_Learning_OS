# PWA install foundation implementation plan

> Use superpowers:executing-plans inline; final fresh read-only reviewer.

**Goal:** Implement install/launch metadata for the existing web app without offline caching or auth changes.
**Architecture:** Static same-origin manifest plus existing-brand icons and HTML metadata; narrow Node/static MIME configuration; built-bundle verification.
**Tech:** Existing Node24, HTML/JSON/SVG/PNG and isolated Playwright; no application dependency/provider.
**Spec:** docs/superpowers/specs/2026-11-02-pwa-install-foundation-design.md

Constraints: fresh isolated worktree mlos-pwa-install on main91a11aff; feature feat/pwa-install-foundation-20261102; no merge/deployment/private data, serviceworker/cache or new brand/palette. Preserve379blockedAuth and336/337source gates. Prior main baseline1548testsPASS. Use static favicon artwork raster exports, not generated replacement art.

Review focus: root and /web aliases share one app identity; no private query in launch; all served HTML can discover manifest; both192/512icons decode at declared size; runtime and static output MIME/allowlist remain safe; orientation and auth routes unchanged.

- [x] Write manifest/discovery/icon/public-serving tests; observe missing manifest/discovery RED.
- [x] Add manifest/icons/static HTML metadata, allowlist and MIME. Validate real Node HTTP and built static bundle; keep scope/startroot and standalone-only.
- [x] Extend existing brand browser checks in Chromium/WebKit; inspect manifest parsing where supported and mobile/tablet/desktop discovery/assets; no OS install claim.
- [x] Run focused/full/check/build and fresh review; checkpoint source to separate draftPR, inspect exact3jobCI. Fix real failures.
- [x] Record exact source/run and limitations in roadmap/brand/receipt/status/handoff, save evidence checkpoint with expected-head guard and remote readback. No deployment or release.
