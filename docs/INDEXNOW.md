# Medretica IndexNow

Owner approved IndexNow setup on 19 October 2026 to notify participating search engines of the public homepage. This complements the existing Google Search Console sitemap; it does not guarantee indexing, ranking or inclusion in Google.

Cloudflare Crawler Hints is a native alternative, available on all plans, but account configuration cannot be inspected or changed through this session's tools. This repository therefore uses the official IndexNow protocol directly. Avoid enabling a duplicate submission mechanism without reviewing the existing workflow.

## Implementation

- A public domain-verification text file is deliberately included in the shared public asset allowlist. Its value is public ownership-verification material, not a private account credential.
- `scripts/indexnow-submit.js` checks the live key file and exact deployed homepage source against this checkout before POSTing only `https://medretica.com/` to the fixed IndexNow endpoint. No learner, admin or private URLs are submitted.
- `.github/workflows/indexnow.yml` runs on main when the homepage HTML, submission script or workflow changes; optional manual dispatch is restricted to main in the original repository. It waits for deployment, then makes one submission; it does not retry rejected/uncertain submission responses. No cron, new paid service or account secret is required.
- Readiness polling is bounded to20attempts with15-second intervals and10-second request timeouts, with a10-minute job timeout. A superseded run is cancelled. A live-source mismatch fails rather than notifying before deployment.
- A200response means the notification was processed;202means received pending validation. Neither proves indexing. Inspect failed runs before manually retrying; do not spam unchanged URLs.
- To add more public canonical URLs later, first verify their actual deployed routes and update the explicit script/tests and trigger scope. The current sitemap intentionally contains only the homepage.

## Verification and operation

`node --test tests/indexnow.test.js tests/cloudflare-pages-build.test.js`

After deployment, `node scripts/indexnow-submit.js` performs live validation and one real notification. `--wait` enables bounded deployment readiness checks. This command sends an external notification; offline tests inject a mock fetch and do not notify engines.

Sources: https://www.indexnow.org/faq and https://developers.cloudflare.com/cache/advanced-configuration/crawler-hints/ . Google remains managed separately through Search Console.
