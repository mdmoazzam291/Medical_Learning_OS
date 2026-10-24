# Protected attempt review — first delivery boundary

Owner direction: preserve exact attempted versions and past results while keeping all data in Supabase. Implement the first read-only boundary now; never infer archive permission from a successor version.

GET /attempts/:attemptId/review uses authenticated learner identity, queries one owned recorded attempt before reading the catalog, rejects query overrides, and returns no-store responses. Original attempts may expose an allowlisted exact-version prompt and stored answer/explanation only while that exact version is published and its sources have resolved rights. Missing, retired, unresolved-rights and non-original representations return attempt metadata with null prompt/receipt. Retired versions remain denied until a separate explicit medical/rights authorization mechanism exists. Scores are never recalculated. No media URL is minted by this initial text boundary.

1. Add executable tests for ownership, closed-session independence, exact-version matching, receipt integrity, withdrawal redaction, rights checks, representation mismatch and read failures.
2. Add a bounded read helper and wire the authenticated route plus cloud adapter method. No new storage, grants or production migration.
3. Run focused and full tests/check/build, inspect diffs, checkpoint to a feature PR. This is backend readiness, not a deployed UI or a complete archived-version migration rehearsal.

## Learner-facing follow-up

Connect Recent Activity original-attempt links to the read-only endpoint. Preserve activity offset and exact attempt through URL/reload and return; render stored results without response controls. Restriction/outage keeps the activity list and hides protected content/provider diagnostics. Guest cannot query attempts. Test source escaping, unavailable states, controller reload/error/guest behavior, and real Chromium/WebKit phone/tablet/desktop/iPad flows including no writes. Archive authorization and media/non-original retrieval remain separate; production runtime deployment must precede the website release.
