# Environment and service access for any development AI

## Local checks
Requires Node.js >=24, as declared in package.json. The repository has no npm dependencies; the basic local loop does not require API keys.

```sh
node --version
npm test
npm run check
npm run build:pages
npm start
```

Run the server in a separate session and open http://127.0.0.1:3000. npm run demo is a synthetic demonstration, not medical content or learner evidence. Browser acceptance uses the existing .github/workflows/ci.yml jobs and their pinned browser runtimes. Local Node results are not proof that Chromium/WebKit or hosted authenticated flows passed.

## Configuration
.env.example documents MLOS_SUPABASE_URL and MLOS_SUPABASE_PUBLISHABLE_KEY for browser-safe configuration. Follow the actual build/config scripts rather than assuming every service reads .env automatically. Production secrets belong in the provider's environment/secret storage; record names and purposes, never values, in a handoff.

## Access matrix
| Surface | New AI needs | Current procedure |
|---|---|---|
| GitHub | Repository read access; branch/PR write access for implementation | AGENTS.md, AI_CONTINUITY.md and existing CI |
| Cloudflare | Authorized provider connection or CLI credentials for live operations | CLOUDFLARE_WORKER_STATIC.md, CLOUDFLARE_PAGES.md, OPERATIONS.md; verify current deployment source/branch |
| Supabase | Authorized project connection and operation-specific access | SUPABASE_AUTH.md, migrations/ and current API contracts; no automatic migration or service-role grants |
| Google Drive | Its own authorized connection to the existing material master | workflows/ and live Drive governance; private folder bindings are resolved separately |
| Resend | Authorized connection only when SMTP/email operations are needed | RESEND_AUTH_SMTP.md; development AI switching does not reconfigure SMTP |
| PostHog/Sentry/Gemini and other configured services | Separate authorized access only for the assigned task | Inspect actual integration/config and current operations records; never infer access from a chat subscription |
| ChatGPT Library/private chats | Optional owner-provided export or shared source | They are not a prerequisite for engineering continuity; approved relevant decisions belong in repository records |

Changing the development AI does not change the runtime AI provider, hosting, account data or publication authority. The current STATUS.md/README.md and provider evidence supersede older historical deployment proposals. Do not restore erased pilots, change credentials, redeploy APIs or publish material just to test a handoff.

Claude Code/browser agents can resume repository work when repository access and environment capabilities are present. A plain chat with uploaded files may lack a shell, PR access, service connections or browser tests; report those capability gaps exactly.
