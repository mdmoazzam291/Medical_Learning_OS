# Tablet parity / Glass correction review

Independent read-only reviewer examined b17369d..250fccd and actual Chromium/WebKit screenshots. No blocking route, permission, phone or focus regression was found. Legacy compact renderer API is retained outside runtime use; unrelated cleanup is out of scope.

- Minor: opacity assertions omitted gradient paint. Resolved by actual computed gradient-stop alpha and conservative combined-paint bounds.
- Minor: acceptance paragraph still described PR #233 as unreleased and 1,226 tests. Resolved with current release/refinement state and 1,227 tests.
- Important: underlying text stayed sharp through menus despite computed blur. Rendered-pixel regression failed RED on run 38520061703. Composited visual verification now uses native macOS WebKit and headed Chromium; threshold unchanged. Composited Chromium passes the strict pixel check at 567dbbca/run 38521674800. Independent native WebKit control proves its snapshot path cannot render frosting, so report that limitation distinctly; retain the strict check for capable renderers. Final complete flows/normal screenshots pending.
- Important: a filtered header creates a backdrop root/containing block for nested Account/Search. Resolved in source by a separate header ::before frost layer; container remains unfiltered. Opaque fallbacks retained. Follow-up independent review approves the pseudo-layer cascade and fallback. Final complete browser flows pending.

Reviewer declined to establish optical quality, physical iPad/OS settings or live release from source alone. Production release remains pending real browser evidence. No content/backend/Auth change.

The reviewer accepted capability-gated pixel verification only with validated independent clear stripes/geometry/computed blur, distinct unavailable reporting, and unchanged app assertion on capable renderers. This is a harness limitation, not an application visual pass. Chromium rendered frosting provides supported-renderer evidence; physical iPad remains unclaimed.

## Final ruling at 25bd210e

Foundation 38523244802 passes check/Chromium/native WebKit flows. The ordinary-main Chromium pixel check (not an added fixed layer) suppresses contrast about 93% at tablet/desktop and resolves the probe coverage concern. Fresh initial Sage and final Lavender screenshots show readable menu content and suppressed interior backdrop. No Critical/Important source findings remain; ready for source release.

Residual Minor: faint sharp margin bleed persists in fresh/normal captures; source cause unproven and fullPage-only attribution is not established. It is not a global frosting failure. Native WebKit's validated independent control cannot render blur in this snapshot path. WebKit frosting, physical iPad/OS settings and hosted real-account switching remain explicitly unverified. No additional source change is justified by the remaining capture observation.
