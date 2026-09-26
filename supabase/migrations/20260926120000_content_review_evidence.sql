-- M04c authenticated content-review evidence foundation.
-- Review decisions are immutable audit evidence. Learner/browser roles receive no access.

create table public.content_reviewer_grants (
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  review_kind text not null check (review_kind in ('medical', 'references', 'rights')),
  granted_at timestamptz not null default now(),
  primary key (reviewer_id, review_kind)
);

create table public.content_review_events (
  id uuid primary key default gen_random_uuid(),
  question_version_id text not null
    check (question_version_id ~ '^[a-zA-Z0-9:_@.\-]{1,160}$'),
  review_kind text not null check (review_kind in ('medical', 'references', 'rights')),
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in ('approved', 'rejected')),
  notes text not null check (char_length(btrim(notes)) between 1 and 4000),
  target_sha256 text not null check (target_sha256 ~ '^[0-9a-f]{64}$'),
  reviewed_at timestamptz not null default now(),
  unique (question_version_id, review_kind)
);

create index content_review_events_reviewer_time
  on public.content_review_events (reviewer_id, reviewed_at desc);

alter table public.content_reviewer_grants enable row level security;
alter table public.content_review_events enable row level security;

revoke all on table public.content_reviewer_grants from public, anon, authenticated, service_role;
revoke all on table public.content_review_events from public, anon, authenticated, service_role;

-- The trusted review service may inspect authorization and review evidence,
-- but it cannot grant roles or mutate review rows directly.
grant select on table public.content_reviewer_grants to service_role;
grant select on table public.content_review_events to service_role;

create or replace function public.record_content_review(
  p_question_version_id text,
  p_review_kind text,
  p_reviewer uuid,
  p_decision text,
  p_notes text
)
returns table (
  review_id uuid,
  target_sha256 text,
  reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_question jsonb;
  v_sources jsonb;
  v_target jsonb;
  v_hash text;
  v_review_id uuid := gen_random_uuid();
  v_reviewed_at timestamptz := now();
begin
  if p_review_kind not in ('medical', 'references', 'rights') then
    raise exception using errcode = '22023', message = 'invalid_review_kind';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception using errcode = '22023', message = 'invalid_review_decision';
  end if;
  if char_length(btrim(coalesce(p_notes, ''))) not between 1 and 4000 then
    raise exception using errcode = '22023', message = 'invalid_review_notes';
  end if;

  if not exists (
    select 1
    from public.content_reviewer_grants
    where reviewer_id = p_reviewer
      and review_kind = p_review_kind
  ) then
    raise exception using errcode = '42501', message = 'reviewer_not_authorized';
  end if;

  select q
    into v_question
  from public.study_catalog c
  cross join lateral jsonb_array_elements(c.body->'questions') q
  where c.id = 1
    and q->>'questionVersionId' = p_question_version_id
  limit 1;

  if v_question is null then
    raise exception using errcode = '22023', message = 'unknown_question_version';
  end if;
  if v_question->>'status' <> 'in_review' then
    raise exception using errcode = '22023', message = 'question_not_in_review';
  end if;
  if v_question->>'authorId' = p_reviewer::text then
    raise exception using errcode = '42501', message = 'author_cannot_self_review';
  end if;

  select coalesce(jsonb_agg(s order by s->>'sourceId'), '[]'::jsonb)
    into v_sources
  from public.study_catalog c
  cross join lateral jsonb_array_elements(c.body->'sources') s
  where c.id = 1
    and s->>'sourceId' in (
      select jsonb_array_elements_text(v_question->'sourceIds')
    );

  if jsonb_array_length(v_sources) <> jsonb_array_length(v_question->'sourceIds') then
    raise exception using errcode = '22023', message = 'review_target_sources_missing';
  end if;

  v_target := jsonb_build_object(
    'question', v_question,
    'sources', v_sources
  );
  v_hash := encode(
    extensions.digest(convert_to(v_target::text, 'UTF8'), 'sha256'),
    'hex'
  );

  insert into public.content_review_events (
    id,
    question_version_id,
    review_kind,
    reviewer_id,
    decision,
    notes,
    target_sha256,
    reviewed_at
  ) values (
    v_review_id,
    p_question_version_id,
    p_review_kind,
    p_reviewer,
    p_decision,
    btrim(p_notes),
    v_hash,
    v_reviewed_at
  );

  return query
  select v_review_id, v_hash, v_reviewed_at;
end;
$$;

revoke all on function public.record_content_review(text, text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.record_content_review(text, text, uuid, text, text)
  to service_role;
