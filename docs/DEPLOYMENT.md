# Preview deployment

## Goal

Create a public development preview for the learner-account surface without claiming production readiness. The preview exists to complete the M04b real Auth callback and authenticated-study verification.

## Render blueprint

`render.yaml` defines one free Node web service in Singapore:

- service: `medical-learning-os-preview`
- start command: `npm start`
- health check: `/`
- host bind: `MLOS_HOST=0.0.0.0`
- auto-deploy: only after repository checks pass
- no application secrets are required by the preview web process

The browser still receives only the public Supabase project URL and publishable key. Supabase privileged credentials remain inside the hosted Edge Function.

## Current blocker

The repository is private. The connected Render workspace currently cannot fetch this GitHub repository, so the service cannot be created from ChatGPT yet.

Do not make the repository public to bypass this. Connect Render's GitHub integration to the private `Medical_Learning_OS` repository instead.

After Render can fetch the repository:

1. Sync/create the service from `render.yaml`.
2. Record the generated `*.onrender.com` URL.
3. Add exactly `https://<render-host>/web/account.html` to Supabase Auth allowed redirect URLs.
4. Add `https://<render-host>` to the `study-api` allowed origins configuration and redeploy the Edge Function.
5. Use one pre-authorized Supabase organization-team email for a controlled built-in-mailer confirmation test.
6. Verify confirmed sign-in, token refresh, logout, and authenticated `progress/questions` calls.
7. Repeat with a second test account before claiming learner isolation.

## Boundaries

This preview is not the production learner application. Custom SMTP remains blocked until an owned sending domain exists. Medical content remains closed until M04c review gates pass.
