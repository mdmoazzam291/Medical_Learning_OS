-- M04c review target normalization and atomic catalog projection.
-- Review hashes exclude workflow metadata so multiple independent gates review the same substantive target.

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
  v_question_target jsonb;
  v_sources jsonb;
  v_target jsonb;
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
    from public.content_review_events
    where question_version_id = p_question_version_id
      and decision = 'rejected'
  ) then
    raise exception using errcode = '22023', message = 'question_review_rejected';
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

  -- Workflow metadata is intentionally excluded. Review decisions should bind to
  -- the substantive question/source target, not to status/review fields that this
  -- function itself advances.
  v_question_target := v_question - 'status' - 'reviews' - 'publishedAt';
  v_target := jsonb_build_object(
    'question', v_question_target,
    'sources', v_sources
  );
  v_hash := encode(
    extensions.digest(convert_to(v_target::text, 'UTF8'), 'sha256'),
    'hex'
  );

  if exists (
    select 1
    from public.content_review_events
    where question_version_id = p_question_version_id
      and target_sha256 <> v_hash
  ) then
    raise exception using errcode = '22023', message = 'review_target_changed';
  end if;

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
