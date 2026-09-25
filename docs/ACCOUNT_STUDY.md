# M04b account study path — local integration

This is an authenticated, loopback-only integration of Supabase Auth with the
existing server-owned study service. It is not a public deployment or cloud
learning-state store. The dedicated Supabase project is
`iyapppmeieqhflnzslao` (`medical_learning_os`); the older NEETPG2027 project
must not be used here.

## Run

Install pinned dependencies with `npm ci`. Set `MLOS_AUTH_MODE=supabase`,
`MLOS_SUPABASE_URL=https://iyapppmeieqhflnzslao.supabase.co`, and
`MLOS_SUPABASE_PUBLISHABLE_KEY` to the dedicated project's publishable key in
the local environment. Do not commit the key or use a service-role/secret key.
Start `npm run start:api` and `npm start` in separate terminals with the same
environment. Open `http://127.0.0.1:3000/web/account.html`.

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
submits an idempotency key per answer, displays the saved receipt, advances,
bookmarks and exports the account-scoped server record. The source fixture is
still a draft, so a real account sees an empty QBank until M04c reviewers
publish genuinely approved content. The M03 nonclinical demo remains a
separate IndexedDB record and is never imported as medical evidence.

Study data is currently stored in local SQLite. The dedicated project has
empty cloud learner-state tables with RLS, but the API has not connected them.
An account on another device does not yet recover its study record. The API
and static preview bind to 127.0.0.1 and must not be published as a production
service. Production work still needs trusted cloud writes, recovery, deletion,
rate limits, reviewer authentication, verified medical content and deployment.

## Verification

`npm run build:account`, `npm run check`, `npm test` validate the browser
bundle, syntax and server identity boundary with a simulated Auth service.
The account smoke route can be checked locally without creating users or
sending email. A real email confirmation/sign-in and a browser study flow
require configured Auth delivery and reviewed content; those are not claimed.
