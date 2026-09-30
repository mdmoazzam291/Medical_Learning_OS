# Hosted learner release

## Current deployment

Medical Learning OS runs on the existing free Render service `medical-learning-os-preview` in Singapore at https://medical-learning-os-preview.onrender.com. The repository remains private. `render.yaml` configures the Node process, `npm start`, root health check, `MLOS_HOST=0.0.0.0`, and automatic deployment after repository checks pass.

The browser receives only the public Supabase project URL and publishable key. Privileged credentials stay inside the hosted Edge Function. The dedicated Supabase project is `iyapppmeieqhflnzslao`; the separate older project is outside this repository's scope.

## Coordinated frontend/API release

The Aperture session summary shipped from merged PR #153 on 2026-09-30 with `study-api` v41. The prerequisite confirmation/resume fix is merged as #152. The frontend, adapter and all six Edge bundle files were compared against merged source; hosted authenticated summary read and reload persistence passed.

1. Review the bounded change and successful repository/PR checks.
2. Merge prerequisites, retarget stacked PRs, and verify the resulting merge tree.
3. Deploy the Edge Function with its relative dependencies, preserving the established authentication configuration. `study-api` currently uses `verify_jwt=false` at the gateway and validates each bearer token via server-side `auth.getUser()` before route handling.
4. Allow the existing Render automatic deployment to finish. Compare served public JavaScript with merged source; confirm the root or requested learner page loads.
5. Verify unauthenticated access is rejected and inspect the intended owned-session read using an existing authenticated account. Verify reload without submitting new learner answers or ratings.
6. Record deployed versions, byte parity, checks and limitations in `docs/STATUS.md`.

A frontend arriving before its matching summary endpoint retains confirmed closure and offers a read-only retry; it cannot invent session results. A failed revision read leaves results available and timing explicitly unavailable.

## Operational boundaries

Reuse the established Render service and free plan; no new service, database or billing change is needed for this release. Manual Render API operations require an explicitly user-confirmed workspace. If that context is unavailable, verify the existing automatic release via hosted output and state the missing dashboard/log inspection rather than guessing a workspace.

Deployment does not confer medical-review approval, publication authority, mastery inference or FSRS production scheduling authority. Auth and content-review boundaries remain in the existing service contracts.
