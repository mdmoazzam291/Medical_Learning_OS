# Cloudflare Worker static learner delivery

## Status

Preferred zero-cost Cloudflare delivery path for Medical Learning OS.

Important: the existing Git-connected Cloudflare Worker named `medical-learning-os` is the Supabase heartbeat Worker. It must remain rooted at `ops/cloudflare-heartbeat` and keep its cron trigger. Do not repurpose it for learner static delivery.

The learner frontend uses a separate Worker application named `medical-learning-os-web`. Cloudflare Workers Static Assets can serve matching static requests without invoking Worker code, while the Worker script remains available only for genuinely dynamic fallback routes.

## Architecture

```text
heartbeat worker
medical-learning-os.<account>.workers.dev
  root: ops/cloudflare-heartbeat
  cron: 17 0,8,16 * * *
  purpose: Supabase keep-alive only

learner web worker
medical-learning-os-web.<account>.workers.dev
  |
  +-- matching static asset --> Cloudflare Static Assets
  |                              (does not invoke Worker code)
  |
  +-- unmatched/dynamic path --> cloudflare/edge-worker.js
                                  |
                                  v
                    medical-learning-os-preview.onrender.com
```

Supabase Auth, PostgreSQL, Edge Functions, learner evidence, publication authority and R2 backup authority are unchanged.

## Repository contract

`npm run build:pages` produces the reviewed `dist-pages` bundle from the explicit public allowlist.

Root `wrangler.jsonc` must keep:

- `name: medical-learning-os-web`, distinct from the heartbeat Worker;
- `assets.directory: ./dist-pages`;
- `assets.run_worker_first: false`, so matching static requests bypass Worker execution;
- the existing Render origin as a temporary fallback for non-static dynamic routes.

`ops/cloudflare-heartbeat/wrangler.jsonc` remains the separate heartbeat configuration with:

- `name: medical-learning-os`;
- `main: worker.js`;
- cron `17 0,8,16 * * *`.

Regression tests fail if these two Worker names collide.

## Cloudflare dashboard setup

Leave the existing `medical-learning-os` heartbeat application unchanged.

Create a second Workers application connected to `mdmoazzam291/Medical_Learning_OS` with:

- application/Worker name: `medical-learning-os-web`
- production branch: `main`
- root directory: repository root / blank
- build command: `npm run build:pages`
- deploy command: `npx wrangler deploy`

Do not reuse the heartbeat root directory `/ops/cloudflare-heartbeat` for the learner web application.

No Supabase service-role key, database password, R2 secret, Resend credential or other private runtime secret is required for the static bundle.

## Release gate

Before treating the learner Worker URL as canonical:

1. Existing heartbeat Worker remains deployed and its cron configuration is unchanged.
2. `medical-learning-os-web` builds `dist-pages` successfully from repository root.
3. Root, account, Study/QBank, Exam, NeuralVault and retention static routes load from the learner Worker URL.
4. Static requests do not depend on Render availability.
5. Google/email auth callbacks are allow-listed for the learner Worker origin and preserve the same Supabase learner UUID.
6. Study API authenticated reads/writes continue to reach Supabase directly.
7. `/mcp`, `/mcp-readonly` and `/.well-known/oauth-protected-resource` continue to work through the dynamic fallback until separately migrated.
8. Existing Render remains rollback/fallback until the above checks pass.
