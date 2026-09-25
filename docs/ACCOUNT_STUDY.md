# M04b account study path — local integration

This is an authenticated, loopback-only integration of Supabase Auth with the
server-owned study service. Cloud study storage is an explicit server mode,
but no real-account cloud run is claimed. The dedicated Supabase project is
`iyapppmeieqhflnzslao` (`medical_learning_os`); the older NEETPG2027 project
must not be used here.

## Run

Install pinned dependencies with `npm ci`. Set `MLOS_AUTH_MODE=supabase`,
`MLOS_SUPABASE_URL=https://iyapppmeieqhflnzslao.supabase.co`, and
`MLOS_SUPABASE_PUBLISHABLE_KEY` to the dedicated project's publishable key in
the local environment. To use cloud learner-state storage, also set
`MLOS_STUDY_STORE=supabase` and `MLOS_SUPABASE_SECRET_KEY` to a dedicated
server-only secret key in the API process. Without that mode, study data stays
in local SQLite. The server refuses cloud mode without verified Auth, the
dedicated project URL and a server secret. Never place the secret in a browser
bundle, repository, log or public configuration. Start `npm run start:api` with
the server-only secret in its environment; start `npm start` separately with
only the shared Auth URL/publishable settings. Open
`http://127.0.0.1:3000/web/account.html`.

Email/password account creation is a development path. The project's built-in
email provider has tight limits, and no verified Resend domain is configured.
Google OAuth is not enabled without its provider credentials and redirect
configuration. Neither provider is represented as ready for public signup.

## Ownership

The browser uses the official Supabase JS client to authenticate and maintain
its account session. The UI sends an access token to the same-origin local
proxy; it does not send a learner ID, answer key, correctness or timestamp.
The study API calls Supabase Auth `getUser(token)` on each request, using the
returned UUID as the learner identity. It rejects missing, invalid or
unverifiable credentials. The old operator-issued credential path remains
available only when `MLOS_AUTH_MODE` is not `supabase`, for local M04a tests.

The account UI lists only published versions, starts/resumes a session,
submits a stable per-session-slot idempotency key, displays the saved receipt,
advances, bookmarks and exports the account-scoped server record. The source fixture is
still a draft, so a real account sees an empty QBank until M04c reviewers
publish genuinely approved content. The M03 nonclinical demo remains a
separate IndexedDB record and is never imported as medical evidence.

In cloud mode, the API stores learner state in the dedicated project's
RLS-protected tables through server-only transactional functions. Its shared
catalog lives in the same project and is empty by default. The operator-only
cloud import accepts drafts, not approvals or published content. No medical
content is published. Account recovery across service instances was simulated, and the
database functions were tested in a rolled-back transaction, but a real
account on two devices has not yet been exercised. The API and static preview
bind to 127.0.0.1 and must not be published as a production service. Deletion,
independent backups, rate limits, reviewer authentication, verified medical
content and deployment remain.

## Verification

`npm run build:account`, `npm run check`, `npm test` validate the browser
bundle, syntax, server identity boundary and cloud-adapter recovery with fakes.
The account smoke route can be checked locally without creating users or
sending email. A real email confirmation/sign-in and a browser study flow
require configured Auth delivery and reviewed content; those are not claimed.
