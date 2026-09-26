-- M04c gate-specific review fingerprints and immutable source-rights resolution.
-- Different review gates attest to different concerns, so one shared hash is too coarse.

create table public.source_rights_events (
  id uuid primary key default gen_random_uuid(),
  source_id text not null
    check (source_id ~ '^[a-zA-Z0-9:_@.\-]{1,200}$'),
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  rights_status text not null check (rights_status in ('owned', 'licensed', 'public_domain', 'restricted')),
  evidence text not null check (char_length(btrim(evidence)) between 1 and 4000),
  source_fingerprint_sha256 text not null check (source_fingerprint_sha256 ~ '^[0-9a-f]{64}$'),
  reviewed_at timestamptz not null default now(),
  unique (source_id)
);

alter table public.source_rights_events enable row level security;
revoke all on table public.source_rights_events from public, anon, authenticated, service_role;
grant select on table public.source_rights_events to service_role;

create or replace function public.current_review_target_sha256(
  p_question_version_id text,
  p_review_kind text
)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_question jsonb;
  v_sources jsonb;
  v_question_core jsonb;
  v_target jsonb;
begin
  if p_review_kind not in ('medical', 'references', 'rights') then
    raise exception using errcode = '22023', message = 'invalid_review_kind';
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

  if p_review_kind = 'medical' then
    v_question_core := jsonb_build_object(
      'questionId', v_question->'questionId',
      'questionVersionId', v_question->'questionVersionId',
      'version', v_question->'version',
      'supersedes', v_question->'supersedes',
      'stem', v_question->'stem',
      'options', v_question->'options',
      'answerOptionId', v_question->'answerOptionId',
      'explanation', v_question->'explanation',
      'conceptLinks', v_question->'conceptLinks'
    );
    v_target := jsonb_build_object('medical', v_question_core);

  elsif p_review_kind = 'references' then
    v_question_core := (v_question - 'status' - 'reviews' - 'publishedAt' - 'authorId' - 'changeReason' - 'provenance');
    v_target := jsonb_build_object(
      'question', v_question_core,
      'sources',
      (
        select coalesce(jsonb_agg(source_without_rights order by source_without_rights->>'sourceId'), '[]'::jsonb)
        from (
          select s - 'rights' as source_without_rights
          from jsonb_array_elements(v_sources) s
        ) stripped
      )
    );

  else
    v_target := jsonb_build_object(
      'question',
      jsonb_build_object(
        'questionId', v_question->'questionId',
        'questionVersionId', v_question->'questionVersionId',
        'sourceIds', v_question->'sourceIds',
        'provenance', v_question->'provenance'
      ),
      'sources', v_sources
    );
  end if;

  return encode(
    extensions.digest(convert_to(v_target::text, 'UTF8'), 'sha256'),
    'hex'
  );
end;
$$;

revoke all on function public.current_review_target_sha256(text, text)
  from public, anon, authenticated;
grant execute on function public.current_review_target_sha256(text, text)
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
  v_source_core jsonb;
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

  if not exists (
    select 1
    from public.content_reviewer_grants
    where reviewer_id = p_reviewer
      and review_kind = 'rights'
  ) then
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

  v_source_core := v_source - 'rights';
  v_fingerprint := encode(
    extensions.digest(convert_to(v_source_core::text, 'UTF8'), 'sha256'),
    'hex'
  );

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
    where c.id = 1
      and s->>'sourceId' in (
        select jsonb_array_elements_text(v_question->'sourceIds')
      )
      and coalesce(s->'rights'->>'status', 'unknown') not in ('owned', 'licensed', 'public_domain')
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

create or replace function public.publish_verified_content(
  p_question_version_id text
)
returns table (
  question_version_id text,
  published_at timestamptz,
  catalog_version bigint
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_question jsonb;
  v_sources jsonb;
  v_question_id text;
  v_version integer;
  v_review_count integer := 0;
  v_approved_count integer := 0;
  v_matching_count integer := 0;
  v_published_at timestamptz := now();
  v_published_text text;
  v_catalog_version bigint;
begin
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
  if v_question->>'status' <> 'verified' then
    raise exception using errcode = '22023', message = 'question_not_verified';
  end if;

  v_question_id := v_question->>'questionId';
  v_version := (v_question->>'version')::integer;

  select coalesce(jsonb_agg(s order by s->>'sourceId'), '[]'::jsonb)
    into v_sources
  from public.study_catalog c
  cross join lateral jsonb_array_elements(c.body->'sources') s
  where c.id = 1
    and s->>'sourceId' in (
      select jsonb_array_elements_text(v_question->'sourceIds')
    );

  if jsonb_array_length(v_sources) <> jsonb_array_length(v_question->'sourceIds') then
    raise exception using errcode = '22023', message = 'publication_sources_missing';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_sources) s
    where coalesce(s->'rights'->>'status', 'unknown') not in ('owned', 'licensed', 'public_domain')
  ) then
    raise exception using errcode = '22023', message = 'publication_rights_unresolved';
  end if;

  select
    count(*)::integer,
    count(*) filter (where e.decision = 'approved')::integer,
    count(*) filter (
      where e.target_sha256 = public.current_review_target_sha256(
        p_question_version_id,
        e.review_kind
      )
    )::integer
  into v_review_count, v_approved_count, v_matching_count
  from public.content_review_events e
  where e.question_version_id = p_question_version_id;

  if v_review_count <> 3
     or v_approved_count <> 3
     or v_matching_count <> 3 then
    raise exception using errcode = '22023', message = 'publication_review_evidence_invalid';
  end if;

  if exists (
    select 1
    from public.study_catalog c
    cross join lateral jsonb_array_elements(c.body->'questions') q
    where c.id = 1
      and q->>'questionId' = v_question_id
      and (q->>'version')::integer > v_version
      and q->>'publishedAt' is not null
  ) then
    raise exception using errcode = '22023', message = 'newer_version_already_published';
  end if;

  v_published_text := to_char(
    v_published_at at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  );

  update public.study_catalog c
  set body = jsonb_set(
        c.body,
        '{questions}',
        (
          select jsonb_agg(
            case
              when q->>'questionVersionId' = p_question_version_id
                then q || jsonb_build_object('status', 'published', 'publishedAt', v_published_text)
              when q->>'questionId' = v_question_id and q->>'status' = 'published'
                then q || jsonb_build_object('status', 'retired')
              else q
            end
            order by ord
          )
          from jsonb_array_elements(c.body->'questions') with ordinality as items(q, ord)
        ),
        false
      ),
      version = c.version + 1,
      updated_at = v_published_at
  where c.id = 1
  returning c.version into v_catalog_version;

  return query
  select p_question_version_id, v_published_at, v_catalog_version;
end;
$$;

revoke all on function public.publish_verified_content(text)
  from public, anon, authenticated;
grant execute on function public.publish_verified_content(text)
  to service_role;
