-- M04c reviewer authorization governance.
-- Reviewer capabilities are explicit, auditable, revocable and optionally expiring.

alter table public.content_reviewer_grants
  add column granted_by uuid not null references auth.users(id) on delete restrict,
  add column reason text not null check (char_length(btrim(reason)) between 1 and 1000),
  add column expires_at timestamptz null;

create table public.content_reviewer_grant_events (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  review_kind text not null check (review_kind in ('medical', 'references', 'rights')),
  action text not null check (action in ('granted', 'revoked')),
  actor_id uuid not null references auth.users(id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 1 and 1000),
  expires_at timestamptz null,
  recorded_at timestamptz not null default now()
);

create index content_reviewer_grant_events_reviewer_time
  on public.content_reviewer_grant_events (reviewer_id, recorded_at desc);

alter table public.content_reviewer_grant_events enable row level security;
revoke all on table public.content_reviewer_grant_events from public, anon, authenticated, service_role;
grant select on table public.content_reviewer_grant_events to service_role;

create or replace function public.has_active_reviewer_grant(
  p_reviewer uuid,
  p_review_kind text
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.content_reviewer_grants g
    where g.reviewer_id = p_reviewer
      and g.review_kind = p_review_kind
      and (g.expires_at is null or g.expires_at > now())
  );
$$;

revoke all on function public.has_active_reviewer_grant(uuid, text)
  from public, anon, authenticated;
grant execute on function public.has_active_reviewer_grant(uuid, text)
  to service_role;

create or replace function public.get_active_reviewer_grants(
  p_reviewer uuid
)
returns table (review_kind text)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select g.review_kind
  from public.content_reviewer_grants g
  where g.reviewer_id = p_reviewer
    and (g.expires_at is null or g.expires_at > now())
  order by g.review_kind;
$$;

revoke all on function public.get_active_reviewer_grants(uuid)
  from public, anon, authenticated;
grant execute on function public.get_active_reviewer_grants(uuid)
  to service_role;

create or replace function public.set_content_reviewer_grant(
  p_reviewer uuid,
  p_review_kind text,
  p_actor uuid,
  p_action text,
  p_reason text,
  p_expires_at timestamptz default null
)
returns table (
  event_id uuid,
  action text,
  recorded_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_id uuid := gen_random_uuid();
  v_recorded_at timestamptz := now();
begin
  if p_review_kind not in ('medical', 'references', 'rights') then
    raise exception using errcode = '22023', message = 'invalid_review_kind';
  end if;
  if p_action not in ('granted', 'revoked') then
    raise exception using errcode = '22023', message = 'invalid_grant_action';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'invalid_grant_reason';
  end if;
  if not exists (select 1 from auth.users where id = p_reviewer) then
    raise exception using errcode = '22023', message = 'unknown_reviewer';
  end if;
  if not exists (select 1 from auth.users where id = p_actor) then
    raise exception using errcode = '22023', message = 'unknown_grant_actor';
  end if;

  if p_action = 'granted' then
    if p_expires_at is not null and p_expires_at <= v_recorded_at then
      raise exception using errcode = '22023', message = 'invalid_grant_expiry';
    end if;

    if public.has_active_reviewer_grant(p_reviewer, p_review_kind) then
      raise exception using errcode = '23505', message = 'reviewer_grant_exists';
    end if;

    insert into public.content_reviewer_grants (
      reviewer_id,
      review_kind,
      granted_at,
      granted_by,
      reason,
      expires_at
    ) values (
      p_reviewer,
      p_review_kind,
      v_recorded_at,
      p_actor,
      btrim(p_reason),
      p_expires_at
    )
    on conflict (reviewer_id, review_kind) do update
    set granted_at = excluded.granted_at,
        granted_by = excluded.granted_by,
        reason = excluded.reason,
        expires_at = excluded.expires_at;

  else
    if not exists (
      select 1
      from public.content_reviewer_grants g
      where g.reviewer_id = p_reviewer
        and g.review_kind = p_review_kind
    ) then
      raise exception using errcode = '22023', message = 'reviewer_grant_not_found';
    end if;

    delete from public.content_reviewer_grants
    where reviewer_id = p_reviewer
      and review_kind = p_review_kind;

    p_expires_at := null;
  end if;

  insert into public.content_reviewer_grant_events (
    id,
    reviewer_id,
    review_kind,
    action,
    actor_id,
    reason,
    expires_at,
    recorded_at
  ) values (
    v_event_id,
    p_reviewer,
    p_review_kind,
    p_action,
    p_actor,
    btrim(p_reason),
    p_expires_at,
    v_recorded_at
  );

  return query
  select v_event_id, p_action, v_recorded_at;
end;
$$;

revoke all on function public.set_content_reviewer_grant(uuid, text, uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.set_content_reviewer_grant(uuid, text, uuid, text, text, timestamptz)
  to service_role;

create or replace function public.resolve_source_rights(
  p_source_id text,
  p_reviewer uuid,
  p_rights_status text,
  p_evidence text
)
returns table (
  rights_event_id uuid,
  source_fingerprint_sha256 text,
  reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_source jsonb;
  v_fingerprint text;
  v_event_id uuid := gen_random_uuid();
  v_reviewed_at timestamptz := now();
begin
  if p_rights_status not in ('owned', 'licensed', 'public_domain', 'restricted') then
    raise exception using errcode = '22023', message = 'invalid_rights_status';
  end if;
  if char_length(btrim(coalesce(p_evidence, ''))) not between 1 and 4000 then
    raise exception using errcode = '22023', message = 'invalid_rights_evidence';
  end if;

  if not public.has_active_reviewer_grant(p_reviewer, 'rights') then
    raise exception using errcode = '42501', message = 'reviewer_not_authorized';
  end if;

  select s
    into v_source
  from public.study_catalog c
  cross join lateral jsonb_array_elements(c.body->'sources') s
  where c.id = 1
    and s->>'sourceId' = p_source_id
  limit 1;

  if v_source is null then
    raise exception using errcode = '22023', message = 'unknown_source';
  end if;

  v_fingerprint := public.current_source_fingerprint_sha256(p_source_id);

  insert into public.source_rights_events (
    id,
    source_id,
    reviewer_id,
    rights_status,
    evidence,
    source_fingerprint_sha256,
    reviewed_at
  ) values (
    v_event_id,
    p_source_id,
    p_reviewer,
    p_rights_status,
    btrim(p_evidence),
    v_fingerprint,
    v_reviewed_at
  );

  update public.study_catalog c
  set body = jsonb_set(
        c.body,
        '{sources}',
        (
          select jsonb_agg(
            case
              when s->>'sourceId' = p_source_id
                then s || jsonb_build_object(
                  'rights',
                  jsonb_build_object(
                    'status', p_rights_status,
                    'evidence', btrim(p_evidence)
                  )
                )
              else s
            end
            order by ord
          )
          from jsonb_array_elements(c.body->'sources') with ordinality as items(s, ord)
        ),
        false
      ),
      version = c.version + 1,
      updated_at = v_reviewed_at
  where c.id = 1;

  return query
  select v_event_id, v_fingerprint, v_reviewed_at;
end;
$$;

revoke all on function public.resolve_source_rights(text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.resolve_source_rights(text, uuid, text, text)
  to service_role;

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
  v_hash text;
  v_reviews jsonb;
  v_review_id uuid := gen_random_uuid();
  v_reviewed_at timestamptz := now();
  v_approved_count integer := 0;
  v_review_count integer := 0;
  v_next_status text := 'in_review';
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

  if not public.has_active_reviewer_grant(p_reviewer, p_review_kind) then
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

  if exists (
    select 1
    from public.content_review_events e
    where e.question_version_id = p_question_version_id
      and e.decision = 'rejected'
  ) then
    raise exception using errcode = '22023', message = 'question_review_rejected';
  end if;

  if p_review_kind = 'rights' and p_decision = 'approved' and exists (
    select 1
    from public.study_catalog c
    cross join lateral jsonb_array_elements(c.body->'sources') s
    left join public.source_rights_events e
      on e.source_id = s->>'sourceId'
    where c.id = 1
      and s->>'sourceId' in (
        select jsonb_array_elements_text(v_question->'sourceIds')
      )
      and (
        coalesce(s->'rights'->>'status', 'unknown') not in ('owned', 'licensed', 'public_domain')
        or e.id is null
        or e.source_fingerprint_sha256 <> public.current_source_fingerprint_sha256(s->>'sourceId')
      )
  ) then
    raise exception using errcode = '22023', message = 'rights_not_resolved';
  end if;

  v_hash := public.current_review_target_sha256(
    p_question_version_id,
    p_review_kind
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

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'kind', e.review_kind,
          'reviewerId', e.reviewer_id::text,
          'reviewedAt', to_char(e.reviewed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'decision', e.decision,
          'notes', e.notes
        )
        order by case e.review_kind
          when 'medical' then 1
          when 'references' then 2
          when 'rights' then 3
          else 9
        end
      ),
      '[]'::jsonb
    ),
    count(*)::integer,
    count(*) filter (where e.decision = 'approved')::integer
  into v_reviews, v_review_count, v_approved_count
  from public.content_review_events e
  where e.question_version_id = p_question_version_id;

  if v_review_count = 3 and v_approved_count = 3 then
    v_next_status := 'verified';
  end if;

  update public.study_catalog c
  set body = jsonb_set(
        c.body,
        '{questions}',
        (
          select jsonb_agg(
            case
              when q->>'questionVersionId' = p_question_version_id
                then q || jsonb_build_object('reviews', v_reviews, 'status', v_next_status)
              else q
            end
            order by ord
          )
          from jsonb_array_elements(c.body->'questions') with ordinality as items(q, ord)
        ),
        false
      ),
      version = c.version + 1,
      updated_at = v_reviewed_at
  where c.id = 1;

  return query
  select v_review_id, v_hash, v_reviewed_at;
end;
$$;

revoke all on function public.record_content_review(text, text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.record_content_review(text, text, uuid, text, text)
  to service_role;
