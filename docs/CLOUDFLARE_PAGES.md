# Cloudflare Pages static learner surface

## Goal

Move high-volume static learner delivery off the Render free web service while preserving the trusted Medical Learning OS boundaries:

- Supabase Auth remains the canonical learner identity.
- Supabase PostgreSQL remains authoritative for private learner evidence and state.
- Supabase Edge Functions remain the trusted authenticated mutation/read boundary.
- Cloudflare R2 remains private backup storage.
- Render remains temporarily available for dynamic admin MCP endpoints that cannot be represented as static Pages assets.

This is a delivery split, not a learner-data migration.

## Build contract

Run:

```sh
npm run build:pages
```

Output directory:

```text
dist-pages
```

`scripts/public-surface.js` is the single explicit public-file allowlist shared by:

- `scripts/serve.js` on Render;
- `scripts/build-pages.js` for Cloudflare Pages.

The Pages build copies only that allowlist plus:

- root `index.html`, copied from `web/index.html`;
- `_headers` containing the current static security/CSP headers;
- `_redirects` containing the existing `/oauth/consent` clean-path rewrite.

It does not copy repository documentation, Supabase functions/migrations, operations files, Render configuration, package metadata, environment files or arbitrary repository paths.

`tests/cloudflare-pages-build.test.js` enumerates the generated artifact and fails closed if the public bundle widens unexpectedly.

## Cloudflare Pages Git integration

Create one Pages project connected to `mdmoazzam291/Medical_Learning_OS`.

Use:

- production branch: `main`
- root directory: repository root
- build command: `npm run build:pages`
- build output directory: `dist-pages`
- framework preset: none

Do not add Supabase secret/service-role keys, database passwords, R2 credentials, Resend credentials or Sentry auth tokens to Pages. The browser continues to receive only the existing public Supabase URL/publishable key and its own authenticated session.

Cloudflare Pages automatically reads `_headers` and `_redirects` from the build output.

## Dynamic routes that stay on Render for now

The Node server currently owns dynamic admin/plugin endpoints:

- `/.well-known/oauth-protected-resource`
- `/mcp`
- `/mcp-readonly`

Do not claim Render can be retired while those endpoints are still required. Cloudflare Pages static redirects cannot act as an external reverse proxy to the Render origin.

The learner-facing Pages project therefore becomes the static delivery plane first. The existing Render service remains a bounded dynamic/admin origin until a separately reviewed Worker/other server migration exists.

## Release gate

Pages is not production-proven merely because this repository can build `dist-pages`.

Before changing any learner-facing canonical URL:

1. Cloudflare Pages build from `main` must succeed.
2. Open the generated `*.pages.dev` URL.
3. Verify root, account, Study/QBank, Exam, Vault, retention and review pages load.
4. Verify Google/email auth callback flow against an allow-listed Pages return URL without creating a second learner identity.
5. Verify authenticated Study API reads/writes still reach Supabase directly and preserve the same learner UUID/evidence chain.
6. Verify Sentry remains scrubbed and does not initialize on unexpected environments unless intentionally enabled.
7. Verify Render dynamic MCP endpoints remain reachable at their existing origin.
8. Only then consider moving a custom learner domain or retiring Render static traffic.

## Rollback

The migration is additive until the canonical learner URL changes. If Pages verification fails, continue serving the existing Render learner preview. No learner database, Auth identity, study evidence, R2 backup or Edge Function rollback is required because this phase changes only static delivery.
