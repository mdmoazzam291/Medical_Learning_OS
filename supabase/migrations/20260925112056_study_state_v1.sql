-- M04b learner state. Auth users and content review are separate concerns.
-- The trusted study API will own writes; browser clients may only read their own rows.
create table public.study_sessions (
  id uuid primary key,
  learner_id uuid not null references auth.users(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  question_version_ids jsonb not null check (
    jsonb_typeof(question_version_ids) = 'array'
    and jsonb_array_length(question_version_ids) between 1 and 50
  ),
  question_started_at timestamptz not null,
  closed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint study_sessions_position_in_range check (position <= jsonb_array_length(question_version_ids)),
  constraint study_sessions_owner_key unique (id, learner_id)
);

create unique index study_sessions_one_active_per_learner
  on public.study_sessions (learner_id) where closed = false;
create index study_sessions_learner_created
  on public.study_sessions (learner_id, created_at, id);

create table public.study_attempts (
  id uuid primary key,
  learner_id uuid not null references auth.users(id) on delete cascade,
  request_key text not null check (request_key ~ '^[a-zA-Z0-9:_@.\-]{1,160}$'),
  session_id uuid not null,
  position integer not null check (position >= 0),
  option_id text not null check (option_id ~ '^[a-zA-Z0-9:_@.\-]{1,160}$'),
  event jsonb not null check (jsonb_typeof(event) = 'object'),
  receipt jsonb not null check (jsonb_typeof(receipt) = 'object'),
  recorded_at timestamptz not null default now(),
  constraint study_attempts_session_owner foreign key (session_id, learner_id)
    references public.study_sessions (id, learner_id) on delete cascade,
  constraint study_attempts_idempotency unique (learner_id, request_key),
  constraint study_attempts_one_per_slot unique (session_id, position)
);
create index study_attempts_learner_recorded
  on public.study_attempts (learner_id, recorded_at, id);

create table public.study_bookmarks (
  learner_id uuid not null references auth.users(id) on delete cascade,
  question_version_id text not null check (question_version_id ~ '^[a-zA-Z0-9:_@.\-]{1,160}$'),
  created_at timestamptz not null default now(),
  primary key (learner_id, question_version_id)
);

alter table public.study_sessions enable row level security;
alter table public.study_attempts enable row level security;
alter table public.study_bookmarks enable row level security;

create policy study_sessions_read_own on public.study_sessions for select to authenticated
  using ((select auth.uid()) = learner_id);
create policy study_attempts_read_own on public.study_attempts for select to authenticated
  using ((select auth.uid()) = learner_id);
create policy study_bookmarks_read_own on public.study_bookmarks for select to authenticated
  using ((select auth.uid()) = learner_id);

-- Default grants vary by project. Explicitly disallow client writes even if
-- future RLS policies are changed. Only a server-held service role may write.
revoke all on public.study_sessions, public.study_attempts, public.study_bookmarks from public, anon, authenticated;
grant select on public.study_sessions, public.study_attempts, public.study_bookmarks to authenticated;
grant all on public.study_sessions, public.study_attempts, public.study_bookmarks to service_role;
