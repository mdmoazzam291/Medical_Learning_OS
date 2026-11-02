# Compact signed-in Account summary

Owner root; isolated main-based workspace; independent from PWA PR380 and identity PR379.
Goal: reduce unnecessary vertical space in the authenticated learning-record panel and make its four shortcuts predictable on phones.
Files: web/account.js (signedIn markup only); web/styles.css (scoped selectors); tests/account-summary-layout.test.js; scripts/navigation-browser-check.js; STATUS/AI_HANDOFF.
- [x] RED: render real signedIn function with synthetic state; assert labelled shortcut navigation and unchanged destinations/evidence values/degraded fallback.
- [x] GREEN: scoped learning-record panel/metrics and shortcut-nav classes. Three equal metric tiles;2x2 shortcuts <=700px, fourcolumns above; minimum44px link height; labels/numbers wrap without clipping. Preserve loading/refresh/auth/identity/zero-vs-unknown semantics and frozen signedOut content.
- [x] Actual browser flow: existing fixture-sign-in→Account; awaitmetrics, measure3same-rowtiles andshortcutcolumngeometry/min44/nooverflow at existing phone/tablet/desktop layouts inbothengines. No real users/tokens/account writes.
- [ ] Full tests/check/build; independent review; newfeaturebranch/draftPR; exact-sourceCI and final evidence/readback.
Review focus:320px width; long question counts; unavailable projections vs zero; refresh/loading state and shortcut reachability; signedOut/otherworkspace CSS isolation.

Baseline1548/fullnew1550tests,16focused,check13services250couplings/124filebuildPASS. Freshreview nofindings/14testsPASS. Browserassertions/screenshotsauthored; exactCIpending. SeparatePR380/PWAunchanged.
