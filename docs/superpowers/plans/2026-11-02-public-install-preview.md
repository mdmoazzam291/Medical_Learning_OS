# Public-only PWA preview build

> Execute inline with one final fresh read-only review.

Goal: remove live Auth/data capability from the PWA install preview without modifying production app/auth source or existing controlled-review previews. ParentPR380dc7613ce; baseline1552tests/250couplings/127filebuild and implementationCI41442351319 all3SUCCESS.

Architecture: explicit public-preview build profile. CLI auto-selects only exact WORKERS_CI_BRANCH feat/pwa-install-foundation-20261102, or explicit MLOS_PAGES_PUBLIC_PREVIEW=1 on non-main/local builds. Forbid explicit public profile on main; ordinary production/API buildPages default remains byte-compatible. Official Cloudflare Workers Builds config documents WORKERS_CI_BRANCH. Other existing feature previews retain current behavior.

Public profile contains only static landing/policy/contact pages, existing CSS/brand/install assets, and generated no-form notices at authenticated app/OAuth/checker HTML routes. Strip scripts from retained HTML, exclude all JS/cloud config/domain data, set connect/script/form none CSP with self styles/images/manifest, noindex/robots deny. No new endpoint, Auth SDK, credentials, runtime monkeypatch or storage clear. Keep manifest/root identity and icons. Existing edge preview backend remains disabled independently; verify live preview after automatic branch build.

- [x] Write failing artifact/selection tests: absent config/JS/forms, safe protected-route notices, manifest retained, restrictive CSP, explicit root-copy/production preservation, mode selection/main guard.
- [x] Implement focused preview module/build dispatch, leaving sourceHTML/auth/production output unchanged.
- [x] Add both-engine browser check for actual public artifact, visible notice, zero scripts/forms/password inputs/external requests, navigation and icon/manifest availability. Test no auth callback processing.
- [x] Local focused/full/check/build, final fresh review, save source/PR/checkpoint and inspect exact3CI/browser results. Resolve actual failures.
- [x] Observe published branch preview notice/account notice and absence of client config through browser as available; record exact source/deployment, scope/limits and owner release. No realAuth/deviceinstall/production/merge approval.

No application package/provider, live API allowlist, schema or production deployment. This profile hardens this PWA preview only, not all existing feature branches or standalone backend security. Do not claim authenticated staging acceptance.
