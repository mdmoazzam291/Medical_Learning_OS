-- M04c verified-to-published content gate.
-- Publication remains server-only and requires current, matching, approved review evidence.

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
  v_question_target jsonb;
  v_sources jsonb;
  v_target jsonb;
  v_hash text;
  v_question_id text;
  v_version integer;
  v_review_count integer := 0;
  v_approved_count integer := 0;
  v_distinct_hashes integer := 0;
  v_matching_hashes integer := 0;
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

  v_question_target := v_question - 'status' - 'reviews' - 'publishedAt';
  v_target := jsonb_build_object(
    'question', v_question_target,
    'sources', v_sources
  );
  v_hash := encode(
    extensions.digest(convert_to(v_target::text, 'UTF8'), 'sha256'),
    'hex'
  );

  select
    count(*)::integer,
    count(*) filter (where e.decision = 'approved')::integer,
    count(distinct e.target_sha256)::integer,
    count(*) filter (where e.target_sha256 = v_hash)::integer
  into v_review_count, v_approved_count, v_distinct_hashes, v_matching_hashes
  from public.content_review_events e
  where e.question_version_id = p_question_version_id;

  if v_review_count <> 3
     or v_approved_count <> 3
     or v_distinct_hashes <> 1
     or v_matching_hashes <> 3 then
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
