# Protected saved-attempt review release

25 October 2026 (IST). PR324 merged as `a2a1436ae9b58fe8ab84d1ce7aea795e681cafe1`. Original PR322 is superseded and closed; its history is retained. The release preserves PR321's learner-content fallback from main90aaacdc.

## Behavior

Home → Recent Activity → Review saved attempt opens an owned original text attempt independently of whether its study session is closed. The page shows the exact still-published version and stored selected/correct options, explanation and safe source fields. It never rescores, substitutes a successor or creates a learning event. Reload/return preserve the activity page and attempt URL. Restriction and retrieval errors preserve the list and do not expose protected content or provider diagnostics.

Retired, missing, unresolved-rights and unsupported presentations return result metadata with no prompt or receipt. Explicit medical/rights authorization for retired versions, frozen non-original/media retrieval and a complete cross-provider migration rehearsal remain unfinished. This release does not infer archive permission from supersession.

## Verification

- Exact source0e59653: Foundation40142407864 check, Chromium and native WebKit all SUCCESS. Combined1484Node tests, portability/check and110-file build passed locally. Browser journeys include phone/tablet/desktop/iPad review/reload/return, restricted/outage and no-write assertions. Phone/tablet/desktop screenshots were inspected.
- Supabase study-api version54 ACTIVE: all11deployed files match the intended bundle. Existing v53 dependencies, preparation fallback and verify_jwt=false setting are preserved; auth.getUser and runtime-session authorization still run before owned-attempt access. Real anonymous GET to the new review route returned401 unauthorized with Cache-Control:no-store. No database, schema, grant, credential or clinical/learner data changes.
- Main merged tree80ec05e7 retains identical runtime files to tested source0e59653; later differences are checkpoint documentation only. Post-merge Foundation40143194134 is separate: core passed; Chromium/WebKit were still running during release verification.
- Cloudflare heartbeat buildda870b92 succeeded. Web buildd09a5406 also succeeded. CLI reads of workspace.js, workspace-view.js and cloud-study.js returned403, so served-asset equality is unverified. Genuine signed-in production acceptance is not claimed; no production learner record was manufactured for testing.

## Remaining

Perform genuine signed-in learner acceptance when available. Implement separately governed retired-version review and non-original/media history before claiming complete historical migration readiness. Alert-email sender configuration remains unrelated unfinished operational work. All content and learner data remain in Supabase.
