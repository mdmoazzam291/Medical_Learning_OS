# Tablet parity / Glass correction review

Independent read-only reviewer examined b17369d..250fccd and actual Chromium/WebKit screenshots. No blocking route, permission, phone or focus regression was found. Legacy compact renderer API is retained outside runtime use; unrelated cleanup is out of scope.

- Minor: opacity assertions omitted gradient paint. Resolved by actual computed gradient-stop alpha and conservative combined-paint bounds.
- Minor: acceptance paragraph still described PR #233 as unreleased and 1,226 tests. Resolved with current release/refinement state and 1,227 tests.
- Important: underlying text stayed sharp through menus despite computed blur. Rendered-pixel regression failed RED on run 38520061703. Composited visual verification now uses native macOS WebKit and headed Chromium; threshold unchanged. Final GREEN/screenshots pending.
- Important: a filtered header creates a backdrop root/containing block for nested Account/Search. Resolved in source by a separate header ::before frost layer; container remains unfiltered. Opaque fallbacks retained. Final browser acceptance pending.

Reviewer declined to establish optical quality, physical iPad/OS settings or live release from source alone. Production release remains pending real browser evidence. No content/backend/Auth change.
