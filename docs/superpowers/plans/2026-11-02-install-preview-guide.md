# Public install preview guide and identity

> Inline execution with final fresh read-only review; continuous owner next-task authorization.

Goal: make the pending physical-device install check discoverable and avoid confusing an installed preview with the live app. Parent PR380f4ef553c; production/source auth remain untouched.

Approach: generate a static preview-only /web/install.html guide, link it in public banners and protected-route notices, and use preview-only manifest/Apple/browser naming. Stable rootid/start/scope, icons, noJS/CSP/network/data boundaries stay unchanged. Normal manifest/name/127fileproduction output stays unchanged; public profile grows35→36files. No install prompt, device detection, auto pass, account form, offline/cache or session claim.

- [x] Add failing preview-route/identity/default-profile preservation test; do not test prose wording beyond route identity/safety.
- [x] Add static guide with iPhone/iPad Safari and Android/desktop Chrome steps from official Apple/Google docs, manual checklist and explicit online/public-only limits. No third-party resources load; references are ordinary links.
- [ ] Extend existing both-engine public-artifact check for guide discovery/navigation and preview manifest name at3viewports; full/check/bothbuilds/freshreview/checkpoint/exactCI.
- [ ] Observe actual guide on the automatic preview, save exact source/deployment/evidence/handoff. Actual device installation remains pending and cannot be inferred from rendered instructions.

References checked2November2026: Apple iPhone/ipad open-as-web-app guides; Google Chrome answer9658361. Current schema/production/security controls and other controlled previews unchanged.
