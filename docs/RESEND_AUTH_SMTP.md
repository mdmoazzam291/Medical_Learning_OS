# Resend SMTP for Supabase Auth

## Purpose

Resend is the selected transactional provider for learner authentication email. This is specifically for signup confirmation, password reset and related Supabase Auth messages. It is not a marketing-email subsystem.

## Current state

- Resend account is connected.
- A dedicated sending-only API key has been created for the Medical Learning OS Supabase SMTP integration.
- No sending domain is verified yet.
- Supabase custom SMTP is therefore not considered production-ready.
- The API key is a secret and must never be committed to GitHub, browser code, logs or screenshots.

## Recommended sender boundary

Use a dedicated authentication subdomain when a product domain is available:

- Sending domain: `auth.example.com`
- From address: `no-reply@auth.example.com`
- Sender name: `Medical Learning OS`

Keep authentication reputation separate from future marketing or notification email.

## Supabase SMTP values

Configure these in Supabase Dashboard → Authentication → Emails → SMTP Settings:

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: the dedicated Resend sending API key
- Sender email: `no-reply@auth.example.com`
- Sender name: `Medical Learning OS`

Do not place the SMTP password in repository variables, browser configuration or application source.

## Activation gate

Before claiming auth email is ready:

1. Add and verify the chosen authentication sending domain in Resend.
2. Publish the Resend-provided DNS records with the DNS provider.
3. Verify the domain in Resend.
4. Enable Supabase custom SMTP with the values above.
5. Keep email confirmation enabled.
6. Create one real test account.
7. Confirm receipt, confirmation-link success, sign-in, session refresh and sign-out.
8. Check that the confirmed Supabase Auth UUID is the same learner ID used by server evidence.

## Failure modes

- Unverified sender domain causes delivery failure or provider rejection.
- The default Supabase SMTP is rate-limited and restricted; it is a development fallback, not the production path.
- A leaked Resend API key can send mail on the account and must be revoked immediately.
- Auth email must not be used as proof that the learner study API or application deployment is healthy.
