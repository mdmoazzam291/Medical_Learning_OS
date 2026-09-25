# M04b cloud learner-state schema

The dedicated `medical_learning_os` Supabase project (`iyapppmeieqhflnzslao`)
has migrations `20260925112056_study_state_v1`,
`20260925112441_study_attempt_session_fk_index`, and
`20260925113131_study_atomic_mutations`. Keep these with the
application code; do not apply it to the separate NEETPG2027 project.

`study_sessions` freezes a question-version queue and holds the current slot.
`study_attempts` stores the versioned event and immutable scoring receipt; a
per-learner request key and per-session slot are unique. `study_bookmarks`
stores learner/question-version links. All three tables reference `auth.users`
with cascading deletion. A learner can have only one open session. The tables
start empty; no medical content, existing app data or accounts were imported.

RLS is enabled on each exposed table. An authenticated client can select only
rows for its `auth.uid()`. The `anon` role has no table access, and the
`authenticated` role has no INSERT, UPDATE or DELETE grant. The four
`SECURITY INVOKER` mutation functions can execute only as `service_role`;
they serialize transitions per learner and commit one operation per call.
The API verifies a bearer token with Auth, derives the learner UUID, scores
against its server-owned catalog, and writes with a server-held secret when
`MLOS_STUDY_STORE=supabase`. Without that flag it uses local SQLite. The
secret must never reach browser bundles, logs, GitHub or public responses.

The cloud adapter preserves exact retry receipts, one answer per slot,
versioned event history, content retirement behavior and account-scoped export.
Its catalog remains in one local SQLite file; multiple application hosts need
a shared, reviewed catalog before deployment. Verify actual authenticated
multi-device recovery, full account UI and cross-learner isolation before
switching hosting. Deletion and independent backups remain separate gates.

On 2026-09-25 the applied migration was confirmed on the dedicated project.
All three tables were empty and had RLS enabled; the catalog check confirmed
one owner-only SELECT policy per table, authenticated SELECT grants, no
authenticated write grants and no anon SELECT grants. This is a schema/grant
verification, not a real-user end-to-end test. The Supabase security advisor
returned no findings. Its foreign-key index notice was resolved by the second
migration; unused-index notices are expected while the tables have no rows.
The mutation functions passed start/answer/retry/advance/owner checks with
synthetic users inside a rolled-back transaction. RLS SELECT visibility was
checked under two simulated authenticated identities, then rolled back. All
three tables remained empty. This does not replace a real Auth/REST run.
