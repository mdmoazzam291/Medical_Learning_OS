# Medical Learning OS heartbeat

This is a separate Cloudflare Worker for the dedicated Supabase project
`iyapppmeieqhflnzslao`. It does not deploy the learner app or touch
NEETPG2027. Its scheduled handler reads the server-only `study_catalog`
row, already present in the dedicated project, at 00:17, 08:17 and 16:17
UTC. Ordinary HTTP requests return 404.

## Cloudflare Git import

Connect `mdmoazzam291/Medical_Learning_OS` on `main` with Worker name
`medical-learning-os`, root path `/ops/cloudflare-heartbeat`, no build
command and deploy command `npx wrangler deploy`. Disable preview builds.
This is the heartbeat Worker; deploy the learner app separately when ready.
Add a **runtime Secret** named `MLOS_SUPABASE_SECRET_KEY` using a new named
`sb_secret_` key from the dedicated Supabase project. Never put it in
GitHub, client code or chat.

The Worker sends the key in the `apikey` header only. Confirm successful
Cron Events and Supabase API activity after deployment. A saved Worker
configuration is not evidence that the scheduled job ran. This is neither
an independent backup nor an uptime alert.
