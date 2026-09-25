# Provider setup and account handoff

The GitHub repository and dedicated Supabase project are connected. The
Medical Learning OS project ref is `iyapppmeieqhflnzslao`. Do not use the
NEETPG2027 project. Cloudflare, Sentry and Gemini have no connected account
tools in this workspace. No production app, R2 backup or AI route is deployed.

## 1. Cloudflare Worker heartbeat — prepared, not running

`ops/cloudflare-heartbeat/` contains a scheduled Worker. Its cron expression
fires at 00:17, 08:17 and 16:17 UTC. It reads one row from the dedicated
server-only `study_catalog` through Supabase REST and fails on non-200 or
unexpected data. Its public request handler always returns 404. This is
database activity, but it is not an availability guarantee or a backup.

Account handoff in the Cloudflare dashboard/CLI:

1. Create/sign into a Cloudflare account on its Free Workers plan. Install
   Wrangler, log in with `wrangler login`, and work from this folder.
2. In the **dedicated Medical Learning OS** Supabase project, create a new
   named `sb_secret_` key for this Worker under **Settings → API Keys**. Keep
   this key separate from the application server key.
3. Run `wrangler secret put MLOS_SUPABASE_SECRET_KEY` in
   `ops/cloudflare-heartbeat/`. Enter the key at the prompt. Do not paste it
   into GitHub, `wrangler.jsonc`, a browser environment variable or chat.
4. Run `wrangler deploy` from that folder. Verify the three UTC scheduled
   executions and their status in **Workers & Pages → medical-learning-os-heartbeat**.
   Check Supabase API logs for the catalog query. A failed Cron needs an
   independent alert; deployment alone does not provide one.

Cloudflare Cron runs on UTC. The Worker currently has no R2 dependency, so
its deployment need not wait for an R2 subscription. The `sb_secret_` key is
sent only in the `apikey` header; modern keys are not JWT bearer tokens.

## 2. R2 — account setup only

R2 requires an account-level subscription/checkout even when usage fits its
free monthly allowance. That is a billing decision, so no bucket is created
here. When enabled, create **private Standard** bucket
`mlos-private-backups` with no public development URL/domain. Enable budget
alerts and inspect R2 usage. Do not call the heartbeat or an operational
canary a database backup. A real backup needs a consistent export of learner
state, Auth recovery data where permitted, versioned catalog, retention,
encryption/access control, and a tested restore. Build and test that before
relying on this bucket for recovery. Large media can use a separate bucket
with explicit access policy once M10 needs it.

## 3. Sentry — no DSN or project yet

Create a JavaScript project for the learner app and a separate Worker/server
project when deployed. Keep the project DSNs in environment configuration.
The browser DSN is public configuration, but event payloads must strip email,
Auth tokens, question/answer text, private notes and URLs containing query
tokens. Set up one external uptime check for the eventual critical API path
and one Cron check-in for this Worker, then confirm alerts actually reach you.
Install the SDK and wire `beforeSend` when a deployed endpoint and DSN exist;
an unused SDK or untested monitor gives no coverage today.

## 4. Gemini — no key or AI path yet

Create an API key in Google AI Studio only when M09's reviewed-source AI
route is implemented. Store it in the server or Worker secret store, not in
Vite public variables, a frontend bundle or GitHub. Free-tier prompts may be
used by Google to improve products; only public/nonconfidential source and
question material is eligible. Private notes, learner history, uploads and
identifiable clinical material must not enter that route. Give the route a
request limit and an explicit disabled state when the key is absent.

## 5. App dependencies — deliberate adoption

The current app uses browser ES modules, IndexedDB, Node 24, esbuild and
`node --test`. React, TypeScript and Vite would replace the current frontend
build, not connect an account. Plan that migration before public beta if the
final UI needs it, preserving the tested demo and account paths. Add Dexie
when the offline repository is migrated, FSRS when M05 has a tested revision
contract, and a browser testing package in `devDependencies` when it becomes
part of that build. Do not install unused packages or claim that these tools
are already integrated. Pin versions and commit the lockfile when adopted.

## Verification boundary

The heartbeat's request and failure behavior are covered by local tests.
Cloudflare deployment, actual Supabase REST activity, R2 provisioning,
monitor delivery and Gemini calls require the respective account steps.
