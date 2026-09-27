-- Advisory lexical near-duplicate preflight for content intake.
-- This does not block intake and does not claim semantic equivalence.

create or replace function public.content_intake_token_set(
  p_value text
)
returns text[]
language sql
immutable
strict
set search_path = ''
as $function$
  select coalesce(
    pg_catalog.array_agg(token order by token),
    array[]::text[]
  )
  from (
    select distinct token
    from pg_catalog.regexp_split_to_table(
      pg_catalog.lower(
        pg_catalog.regexp_replace(p_value, '[^a-zA-Z0-9]+', ' ', 'g')
      ),
      '\\s+'
    ) as token
    where pg_catalog.char_length(token) >= 3
      and token <> all (array[
        'the','and','for','with','which','what','when','where','who','why','how',
        'this','that','from','into','under','according','following','person',
        'patient','patients','adult','child','children','recommended'
      ]::text[])
  ) distinct_tokens
$function$;

revoke all on function public.content_intake_token_set(text)
  from public, anon, authenticated, service_role;

create or replace function public.content_intake_lexical_overlap(
  p_left text,
  p_right text
)
returns numeric
language sql
immutable
strict
set search_path = ''
as $function$
  with
  left_tokens as (
    select token from pg_catalog.unnest(public.content_intake_token_set(p_left)) token
  ),
  right_tokens as (
    select token from pg_catalog.unnest(public.content_intake_token_set(p_right)) token
  ),
  token_union as (
    select token from left_tokens
    union
    select token from right_tokens
  ),
  token_intersection as (
    select token from left_tokens
    intersect
    select token from right_tokens
  )
  select case
    when (select count(*) from token_union) = 0 then 0::numeric
    else pg_catalog.round(
      (select count(*) from token_intersection)::numeric
      / (select count(*) from token_union)::numeric,
      4
    )
  end
$function$;

revoke all on function public.content_intake_lexical_overlap(text, text)
  from public, anon, authenticated, service_role;

create or replace function public.content_intake_overlap_report(
  p_manifest jsonb,
  p_threshold numeric default 0.55
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_validation jsonb;
  v_flags jsonb;
  v_max_overlap numeric;
begin
  if p_threshold < 0 or p_threshold > 1 then
    raise exception using errcode = '22023', message = 'content_overlap_threshold_invalid';
  end if;

  v_validation := public.content_validate_intake_manifest(p_manifest, null);

  with
  candidates as (
    select
      q->>'questionVersionId' as question_version_id,
      q->>'stem' as stem
    from pg_catalog.jsonb_array_elements(p_manifest->'questions') q
  ),
  within_batch as (
    select
      a.question_version_id as candidate_question_version_id,
      'candidate_batch'::text as comparison_scope,
      b.question_version_id as other_question_version_id,
      null::text as other_batch_key,
      public.content_intake_lexical_overlap(a.stem, b.stem) as overlap
    from candidates a
    join candidates b
      on a.question_version_id < b.question_version_id
  ),
  live_catalog as (
    select
      c.question_version_id as candidate_question_version_id,
      'live_catalog'::text as comparison_scope,
      q->>'questionVersionId' as other_question_version_id,
      null::text as other_batch_key,
      public.content_intake_lexical_overlap(c.stem, q->>'stem') as overlap
    from candidates c
    join public.study_catalog catalog on catalog.id = 1
    cross join lateral pg_catalog.jsonb_array_elements(
      coalesce(catalog.body->'questions','[]'::jsonb)
    ) q
  ),
  staged_batches as (
    select
      c.question_version_id as candidate_question_version_id,
      'staged_batch'::text as comparison_scope,
      q->>'questionVersionId' as other_question_version_id,
      b.batch_key as other_batch_key,
      public.content_intake_lexical_overlap(c.stem, q->>'stem') as overlap
    from candidates c
    join public.content_intake_batches b on b.status = 'staged'
    cross join lateral pg_catalog.jsonb_array_elements(b.manifest->'questions') q
  ),
  all_pairs as (
    select * from within_batch
    union all
    select * from live_catalog
    union all
    select * from staged_batches
  ),
  flagged as (
    select *
    from all_pairs
    where overlap >= p_threshold
      and overlap < 1
    order by overlap desc, candidate_question_version_id, comparison_scope, other_question_version_id
    limit 100
  )
  select
    coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'candidateQuestionVersionId', candidate_question_version_id,
          'comparisonScope', comparison_scope,
          'otherQuestionVersionId', other_question_version_id,
          'otherBatchKey', other_batch_key,
          'lexicalOverlap', overlap
        )
        order by overlap desc, candidate_question_version_id, comparison_scope, other_question_version_id
      ),
      '[]'::jsonb
    ),
    coalesce(max(overlap), 0::numeric)
  into v_flags, v_max_overlap
  from flagged;

  return pg_catalog.jsonb_build_object(
    'contractId', 'content-intake-overlap-report-v1',
    'signalType', 'token-set-jaccard-v1',
    'threshold', p_threshold,
    'blocking', false,
    'semanticDuplicateDetection', false,
    'medicalQualityInference', false,
    'validatedQuestionCount', coalesce((v_validation->>'questionCount')::integer, 0),
    'flagCount', pg_catalog.jsonb_array_length(v_flags),
    'maxFlaggedOverlap', v_max_overlap,
    'flags', v_flags,
    'interpretation',
      'Flags indicate lexical token overlap only. They are review prompts, not proof of semantic duplication or medical-quality judgments.'
  );
end
$function$;

revoke all on function public.content_intake_overlap_report(jsonb, numeric)
  from public, anon, authenticated;
grant execute on function public.content_intake_overlap_report(jsonb, numeric)
  to service_role;
