# M04b cloud learner-state schema

The dedicated `medical_learning_os` Supabase project (`iyapppmeieqhflnzslao`)
has migration `20260925112056_study_state_v1`. Keep this migration with the
application code; do not apply it to the separate NEETPG2027 project.

`study_sessions` freezes a question-version queue and holds the current slot.
`study_attempts` stores the versioned event and immutable scoring receipt; a
per-learner request key and per-session slot are unique. `study_bookmarks`
stores learner/question-version links. All three tables reference `auth.users`
with cascading deletion. A learner can have only one open session. The tables
start empty; no medical content, existing app data or accounts were imported.

RLS is enabled on each exposed table. An authenticated client can select only
rows for its `auth.uid()`. The `anon` role has no table access, and the
`authenticated` role has no INSERT, UPDATE or DELETE grant. The future trusted
study API must verify the bearer token, derive the user ID from Auth, score
against reviewed server-owned content, and write using a server-held secret;
the secret must never reach browser bundles, logs, GitHub or public responses.
The schema alone does not make this flow live: the current API still persists
to local SQLite. Do not expose it publicly or promise cross-device recovery.

Next integrate a cloud persistence adapter with transactional answer and
advance operations. Preserve exact retry receipts, one answer per slot,
versioned event history, catalog retirement behavior and account-scoped export.
Verify multi-device recovery and cross-learner isolation using actual Auth
accounts before switching hosting. Deletion and independent backups are
separate release gates.

On 2026-09-25 the applied migration was confirmed on the dedicated project.
All three tables were empty and had RLS enabled; the catalog check confirmed
one owner-only SELECT policy per table, authenticated SELECT grants, no
authenticated write grants and no anon SELECT grants. This is a schema/grant
verification, not a real-user end-to-end test.
