# Public-only PWA install preview

The PWA branch preview previously shipped the normal frontend cloud configuration. Its disabled edge origin did not isolate direct browser Auth/data calls. This profile removes that capability from the install preview while leaving the normal production bundle and existing controlled-review previews unchanged.

The build CLI selects the public profile only for exact `WORKERS_CI_BRANCH=feat/pwa-install-foundation-20261102`, or explicit `MLOS_PAGES_PUBLIC_PREVIEW=1` for local/non-main builds. Explicit public mode on main and invalid flag values reject before output is removed. Cloudflare Workers Builds documents the branch variable. `buildPages()` defaults to the normal production profile; tests invoke the public profile explicitly. This is bounded PWA-preview configuration, not universal isolation of every branch/environment.

The35-file profile retains the landing page, published public policies/contact/services, existing CSS/brand/install assets and manifest. It strips scripts/noscript from retained HTML and places generated notices at all account/study/Admin/OAuth/checker HTML routes. No application/domain/config JavaScript is shipped; no account credentials or learner storage are read, cleared or sent. Public pages visibly identify the build and account/study unavailability. Manifest identity/start/scope and icons remain unchanged; public links still work.

CSP denies script execution, connections and form submissions; only self styles/images/manifest are permitted. Assets retain no-store/nosniff; robots and headers deny indexing. These static guards complement the separately configured disabled edge proxy. Existing authenticated test previews keep their prior mode; live API origins/permissions are not modified. Production auth/HTML/client source and default127-file output remain intact. No new app dependency/provider, serviceworker/offline cache, session or approval is introduced.

Tests verify no JS/config/src/data, forms or handlers, protected-route notices, packaged styles/icons/manifest, root-copy equality, CSP, robots and exact mode/main guard. Both browser engines exercise the actual public artifact at390/820/1440px, public and protected paths including a synthetic callback fragment, visible notices, zero scripts/password forms and no external browser requests. No genuine credentials/accounts or production traffic is used by these tests.

Physical-device installation, standalone OS storage/session behavior and real Auth lifecycle remain unverified. This build intentionally cannot exercise sign-in. Inspect the actual published branch notice before using it for device-only install checks; the earlier36bacd9 HTTPS observation describes the prior normal bundle and is historical. No production merge or manual deployment is authorized by this profile.

Reference checked2November2026: https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#environment-variables.
