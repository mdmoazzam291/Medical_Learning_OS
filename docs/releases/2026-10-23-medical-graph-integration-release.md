# Reviewed medical graph integration release

Checked 23 October 2026 (Asia/Kolkata). This is a software read/display release; no clinical relationship has been approved or published by it.

## Source and integration

- PR303 runtime: `dd5424eddcba97587f0b2c2032ccb62b1a315e58`.
- Merged to main as `ff46e6d9207d5fc0766246b8b88c7ff5b19324a5`.
- Tested and merged trees both equal `94bfad145755f7a83422ecc02ce549eb79cd2411`.
- Current preparation and inactive-retention releases were merged into the original PR history without force-pushing. Three documentation conflicts retained both newer main receipts and prior graph history.

Medical relationships remain directed assertions with exact source version/fingerprint and evidence identities. Missing review/rights, stale or ambiguous identities, reused immutable versions, newer unapproved revisions and retirement fail closed. Educational co-links do not become clinical assertions.

The integration also fixes preparation behavior: retain relationships only when both endpoints survive the selected scope, retain their referenced source metadata, and clear them in empty/invalid/unmapped scope. The shared graph boundary now applies scope when given the original API inventory, so callers cannot bypass it. Explore all keeps the published context; no new curriculum mappings or learner history are created.

## Verification

- Six new integration tests. Three initially failed; endpoint repair then exposed the independent missing-source assertion. Independent review found one Important raw-renderer bypass; two additional reproductions failed before its minimal boundary fix.
- Final root verification: **1,441/1,441 Node tests**, 35 focused tests, syntax/decision/portability checks (13 services / 226 locations), and a 109-file static build passed.
- Independent read-only review found no Critical or Minor issues. Its Important finding was fixed through failing-first regressions and the full suite; no second independent review is claimed.
- Feature Foundation run **39926198142**: check, Chromium and WebKit all completed SUCCESS. New five-width actual-controller checks cover goals/foundations/all and Back/reload in addition to reviewed/revoked/retired claims, escaping, direction, 60→200 edge bounds, draft isolation and zero browse writes. Phone, iPad landscape and desktop graph screenshots were visually inspected.
- The downloaded hosted static artifact contains 109 files, all byte-identical to the local build. ZIP SHA-256: `a3978574ee002fb356d4f2a1903bef78df49484080423f95ff289c16a199a363`.
- Initial local Chromium installation failed with an invalid downloaded archive. No local browser pass is claimed. An earlier 1,399-test command overlapped merge exploration and is not used as an isolated baseline. A staged merge whitespace check flagged an extra EOF blank line already present in main's earlier retention receipt; the diff against current main passed and that unrelated file was preserved.

Main Foundation **39927285345** independently reran the same runtime tree: check, Chromium and WebKit all completed SUCCESS.

## Production readback

- Website build `61fe2600-5f9a-4a99-84f9-a2cf6dc89230`: SUCCESS.
- Heartbeat build `d0828e0d-ac27-44bc-9c41-72812f9ce9fd`: SUCCESS.
- Library API **v6**, ACTIVE: all eight source files match merged source, including the newly imported medical-relationships module.
- Study API **v52**, ACTIVE: all ten source files match merged source; the only bundle change from v51 is the shared preparation domain file.
- Existing `verify_jwt=false` settings and in-function token/runtime checks were preserved. No Auth/origin/privilege configuration changed.
- Anonymous Library and retention-consent reads returned **401 unauthorized**. An initial direct static-source request returned403; subsequent curl readback returned200 and matched all five changed runtime assets exactly. No cause for the earlier response is inferred.
- A fresh cloud-Chromium guest visit/reload retained the Medical graph URL and sign-in return target. The previous authenticated tab/session was no longer available. Signed-in and populated real-content acceptance is not newly claimed; issue301 remains open.
- Read-only SQL confirmed catalog v407 with zero concepts, sources and questions, and no medical-relationship snapshot feed. No content restoration, publication, clinical attestation, research enrollment or learner response occurred.

## Remaining work

Issue299 still owns protected relationship/version storage, actual reviewer grants, source-rights-bound evidence, immutable publication/retirement, Admin controls, PostgreSQL authority tests and the service-owned feed. The live graph correctly remains empty until those requirements and genuinely reviewed content are present. Server pagination (#300), populated authenticated acceptance (#301) and deeper clinical exploration (#302) remain separate.

PR308 reconciles already-archived private material with repository instructions and carries this docs-only release receipt. Its clinical originals, private review packets and file identifiers remain outside Git. A documentation merge changes no deployed runtime bytes.
