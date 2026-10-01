# Cloudflare Worker static learner delivery

## Status

Preferred zero-cost Cloudflare delivery path for Medical Learning OS.

The Cloudflare account already contains a Git-connected Worker named `medical-learning-os`. Cloudflare Workers Static Assets now provides free and unlimited static asset requests, so a second Pages project is not required for the learner frontend.

## Architecture

```text
learner
  |
  v
medical-learning-os.<account>.workers.dev
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

`wrangler.jsonc` must keep:

- `name: medical-learning-os` to match the existing Git-connected Cloudflare Worker;
- `assets.directory: ./dist-pages`;
- `assets.run_worker_first: false`, so matching static requests do not consume Worker invocations;
- the existing Render origin as a temporary fallback for non-static dynamic routes.

## Cloudflare dashboard build settings

Open:

`Workers & Pages > medical-learning-os > Settings > Builds`

Use:

- Git repository: `mdmoazzam291/Medical_Learning_OS`
- production branch: `main`
- root directory: repository root
- build command: `npm run build:pages`
- deploy command: `npx wrangler deploy`

No Supabase service-role key, database password, R2 secret, Resend credential or other private runtime secret is required for the static bundle.

## Why this replaces a separate Pages project

Cloudflare currently recommends Workers as its primary application platform. Worker Static Assets can serve matching static requests for free and without the Workers request quota, while the Worker script remains available only for routes that genuinely need dynamic behavior.

This keeps one Git-connected Cloudflare application and avoids duplicating deployment configuration across Pages and Workers.

## Release gate

Before treating the Worker URL as the canonical learner URL:

1. The Cloudflare build must run `npm run build:pages` successfully.
2. Root, account, Study/QBank, Exam, NeuralVault and retention static routes must load from the Worker URL.
3. Static requests must not depend on Render availability.
4. Google/email auth callbacks must be allow-listed for the Worker origin and preserve the same Supabase learner UUID.
5. Study API authenticated reads/writes must continue to reach Supabase directly.
6. `/mcp`, `/mcp-readonly` and `/.well-known/oauth-protected-resource` must continue to work through the dynamic fallback until separately migrated.
7. Existing Render remains rollback/fallback until the above checks pass.
