# Google OAuth localhost redirect troubleshooting

## Intended production flow

1. The browser opens Google sign-in from the deployed MLOS origin.
2. Supabase handles the provider round-trip at
   `https://iyapppmeieqhflnzslao.supabase.co/auth/v1/callback`.
3. Supabase returns the browser to the explicitly requested account callback,
   `/web/account.html`, on the same origin that initiated sign-in.
4. The account page validates the callback and stores the resulting session.

The account page constructs its callback from `window.location.origin`; it must
not hardcode a development hostname. Unit coverage in `tests/supabase-auth.test.js`
checks adapter URL construction, while `tests/account-oauth-redirect.test.js`
guards the account-page integration.

## Dashboard checks for a deployed environment

A code change cannot override a stale hosted Auth/OAuth allowlist. In the
Supabase project used by `web/cloud-config.js`, inspect **Authentication → URL
Configuration**:

- Set **Site URL** to the canonical deployed MLOS origin that users actually open.
- Add the exact deployed account callback URL (origin plus
  `/web/account.html`) to **Redirect URLs**.
- Keep a localhost URL only as a separate development entry if local testing is
  still required. Do not use it as the production Site URL.

In the Google Cloud OAuth client, the authorized redirect URI for the Supabase
provider is the Supabase callback above, not the MLOS browser callback and not
`localhost:3000`. Verify that the client ID/secret configured in Supabase
belongs to that same Google OAuth client.

## Release verification

After saving dashboard settings, run Google sign-in on the exact deployed
origin, verify the browser returns to `/web/account.html` (never
`localhost:3000`), confirm a session is present, then verify sign-out and a
second sign-in. CI tests validate application behavior but cannot inspect or
change private Supabase/Google dashboard settings and do not prove live OAuth
without an authenticated browser test.
