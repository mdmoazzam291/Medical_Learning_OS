# Public installed-preview polish

Owner: root; PR380; base680646d. User requests next task after recorded iPhone installation.
Goal: remove inherited top gaps and misleading account entry only in the static preview; record observed installation honestly.
Files: scripts/public-install-preview.js; tests/public-install-preview.test.js; scripts/public-install-preview-browser-check.js; evidence, STATUS, AI_HANDOFF and PWA receipt.
- [x] RED: built preview has no account action links/onboarding prompts, ships scoped preview stylesheet; normal app retains auth CTA and existing styles.
- [x] GREEN: generate preview-only stylesheet/body scope, replace account CTA and first-steps copy with install-check guidance. Keep restrictive CSP, no scripts/forms, root install identity and normal app unchanged.
- [x] Browser: assert actual banner-to-content gap <=32px and no overflow at390x1000,820x390,820x1000,1440x1000; check preview homepage and guide before navigating Home.
- [x] Full tests/check/build; independent review; source checkpoint and exact-source CI; final evidence/readback.
Review focus: preview protected-route notices need same scope; landscape touch scrolling; same-origin normal app retains sign-in; no credential-bearing URLs in evidence; recording proves only iPhone portrait install/launch and guide navigation, not reopen/auth/rotation/offline.

Local verification:18focused/full1558tests;check13services250couplings;normal128/public37builds PASS. Fresh reviewer no findings,14testsPASS. Browser assertions authored; exactCI pending.

Final verification:2bfa197 / Foundation41463083751 all3SUCCESS; publicpreview4viewport checksPASS inbothengines; core1558tests/normal128buildPASS. Providerpreview4ac579fd build/deploySUCCESS; liveguide/homegap16px and0accountlinks/scripts/forms confirmed. No unresolved findings. Final evidence-only checkpoint separate.
