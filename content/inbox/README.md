# Shared content inbox

Read `docs/CONTENT_LIBRARY_CONTRACT.md` first. Save each validated manifest here as `<importId>.json`. Use a new import ID for changed content. Do not put uploads, answer-bearing JSON or credentials in the public static allowlist.

When the user provides content through the connected ChatGPT/Codex repository workflow, extract it into schema version 1, preserve their explicit exam/platform/book declarations, resolve existing canonical IDs and validate with `node scripts/stage-content-inbox.js`. Publish the repository change through its normal review flow. Main-branch inbox changes are staged automatically in the app by the content-inbox GitHub Action. The administrator then inspects the draft in **Admin → Import & review** and submits **Review & publish** once.

An unrelated ChatGPT conversation cannot automatically write to this app. Use the connected repository agent or upload the manifest JSON directly in the admin inbox. The agent must not invent page numbers, exam years, licenses or medical approvals. Ask for missing source evidence when it cannot be recovered from the supplied material.

The workflow uses the existing repository `SUPABASE_DB_URL` secret and never publishes content. Staging is idempotent. A changed payload under an existing ID fails. A validation/database failure rolls back the entire inbox run. Published files may remain as immutable provenance; no deletion is propagated to the catalog. Private imports are deferred.
