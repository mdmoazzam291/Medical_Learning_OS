# Hosted learner release

## Current deployment

Medical Learning OS currently runs on the existing free Render service `medical-learning-os-preview` in Singapore at https://medical-learning-os-preview.onrender.com. The GitHub repository is currently public, so no secret or privileged configuration may rely on repository privacy. `render.yaml` configures the Node process, `npm start`, root health check, `MLOS_HOST=0.0.0.0`, and automatic deployment after repository checks pass.

A zero-cost static-delivery split is now implemented in the repository but is not yet production-proven: `npm run build:pages` creates the allow-listed Cloudflare Pages artifact in `dist-pages`. See [Cloudflare Pages static learner surface](CLOUDFLARE_PAGES.md). Until a Pages deployment and authenticated learner flow are verified, Render remains the canonical hosted learner preview.

The browser receives only the public Supabase project URL and publishable key. Privileged credentials stay inside the hosted Edge Function. The dedicated Supabase project is `iyapppmeieqhflnzslao`; the separate older project is outside this repository's scope.

## Coordinated frontend/API release

The Aperture session summary shipped from merged PR #153 on 2026-09-30 with `study-api` v41. The prerequisite confirmation/resume fix is merged as #152. The frontend, adapter and all six Edge bundle files were compared against merged source; hosted authenticated summary read and reload persistence passed.

1. Review the bounded change and successful repository/PR checks.
2. Merge prerequisites, retarget stacked PRs, and verify the resulting merge tree.
3. Deploy the Edge Function with its relative dependencies, preserving the established authentication configuration. `study-api` currently uses `verify_jwt=false` at the gateway and validates each bearer token via server-side `auth.getUser()` before route handling.
4. Allow the current static host deployment to finish. While Render remains canonical, compare its served public JavaScript with merged source; after Pages activation, perform the equivalent Pages artifact/served-output check.
5. Verify unauthenticated access is rejected and inspect the intended owned-session read using an existing authenticated account. Verify reload without submitting new learner answers or ratings.
6. Record deployed versions, byte parity, checks and limitations in `docs/STATUS.md`.

A frontend arriving before its matching summary endpoint retains confirmed closure and offers a read-only retry; it cannot invent session results. A failed revision read leaves results available and timing explicitly unavailable.

## Static/dynamic hosting split

The learner UI is eligible for Cloudflare Pages because its public files are explicit static assets that call Supabase directly for authenticated cloud operations. The Pages bundle shares the exact public-file allowlist with the Render server and carries the same CSP/no-store boundary.

Render cannot yet be fully retired because the Node server also exposes dynamic admin/plugin endpoints:

- `/.well-known/oauth-protected-resource`
- `/mcp`
- `/mcp-readonly`

Those routes remain on the dynamic origin until a separately reviewed server/Worker migration exists. Static Pages deployment must not widen their authority or expose repository-only data.

## Operational boundaries

Reuse the established Render service and free plan while the Pages migration is verified. Creating the Pages project changes static delivery only; it does not create a second learner database, change Supabase Auth identity, alter R2 backups or move Edge Function authority.

Manual Render API operations require an explicitly user-confirmed workspace. If that context is unavailable, verify the existing automatic release via hosted output and state the missing dashboard/log inspection rather than guessing a workspace.

Deployment does not confer medical-review approval, publication authority, mastery inference or FSRS production scheduling authority. Auth and content-review boundaries remain in the existing service contracts.
