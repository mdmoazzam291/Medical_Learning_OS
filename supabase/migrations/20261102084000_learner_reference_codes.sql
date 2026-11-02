-- Learner Code v1: private from the browser, additive, no Auth or learner-history rewrite.
-- DEPLOYMENT STATUS: repository proposal only. Run first on isolated staging with
-- security review and read-only snapshot of existing access roles. Never use
-- this mapping as authentication, session, account-recovery or publication proof.
--
-- Canonical user identity remains auth.users(id). No signup trigger/backfill:
-- issuance requires explicit verified server-side session + runtime access.
create table public.learner_reference_codes (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  learner_code text not null unique,
  format_version smallint not null default 1 check (format_version = 1),
  created_at timestamptz not null default now(),
  constraint learner_reference_codes_shape check (
    learner_code ~ '^ML(-[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{4}){4}$'
  )
);

-- PostgreSQL RLS and explicit privileges are both necessary. On some
-- Supabase projects automatic public-schema grants exist at creation time.
alter table public.learner_reference_codes enable row level security;
revoke all on table public.learner_reference_codes from public, anon, authenticated, service_role;
grant select, insert on table public.learner_reference_codes to service_role;

-- No browser-facing RLS policies, RPC or public lookup. The server uses
-- service-role INSERT/SELECT only after authenticated session and runtime
-- access. UPDATE/DELETE are intentionally not granted to the service role.
-- Auth user deletion cascades; the reusable-code/tombstone privacy policy
-- requires separate owner approval before any live rollout.
