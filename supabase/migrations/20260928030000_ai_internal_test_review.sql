create table if not exists public.ai_content_review_events (
  id uuid primary key default gen_random_uuid(),
  question_version_id text not null,
  review_kind text not null check (review_kind in ('medical','references','rights')),
  reviewer_model text not null check (char_length(btrim(reviewer_model)) between 1 and 200),
  policy_id text not null check (char_length(btrim(policy_id)) between 1 and 200),
  decision text not null check (decision in ('approved','rejected')),
  notes text not null check (char_length(btrim(notes)) between 1 and 4000),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  target_sha256 text not null check (target_sha256 ~ '^[0-9a-f]{64}$'),
  authority_scope text not null default 'internal_testing_only' check (authority_scope = 'internal_testing_only'),
  reviewed_at timestamptz not null default now(),
  unique (question_version_id, review_kind)
);

alter table public.ai_content_review_events enable row level security;
revoke all on table public.ai_content_review_events from public, anon, authenticated;
grant select on table public.ai_content_review_events to service_role;
revoke insert, update, delete on table public.ai_content_review_events from service_role;

create or replace function public.block_ai_content_review_event_mutation()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  raise exception using errcode = '55000', message = 'ai_review_event_immutable';
end;
$$;

revoke all on function public.block_ai_content_review_event_mutation() from public, anon, authenticated, service_role;

drop trigger if exists ai_content_review_events_immutable on public.ai_content_review_events;
create trigger ai_content_review_events_immutable
before update or delete on public.ai_content_review_events
for each row execute function public.block_ai_content_review_event_mutation();

create or replace function public.record_ai_content_review(
  p_question_version_id text,
  p_review_kind text,
  p_reviewer_model text,
  p_policy_id text,
  p_decision text,
  p_notes text,
  p_evidence jsonb
)
returns table(
  review_id uuid,
  target_sha256 text,
  reviewed_at timestamptz,
  authority_scope text
)
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare
  v_question jsonb;
  v_hash text;
  v_review_id uuid := gen_random_uuid();
  v_reviewed_at timestamptz := now();
begin
  if p_review_kind not in ('medical','references','rights') then
    raise exception using errcode = '22023', message = 'invalid_review_kind';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception using errcode = '22023', message = 'invalid_review_decision';
  end if;
  if char_length(btrim(coalesce(p_reviewer_model,''))) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'invalid_ai_reviewer_model';
  end if;
  if char_length(btrim(coalesce(p_policy_id,''))) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'invalid_ai_review_policy';
  end if;
  if char_length(btrim(coalesce(p_notes,''))) not between 1 and 4000 then
    raise exception using errcode = '22023', message = 'invalid_review_notes';
  end if;
  if p_evidence is null or jsonb_typeof(p_evidence) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_review_evidence';
  end if;

  select q into v_question
  from public.study_catalog c
  cross join lateral jsonb_array_elements(coalesce(c.body->'questions','[]'::jsonb)) q
  where c.id = 1
    and q->>'questionVersionId' = p_question_version_id
  limit 1;

  if v_question is null then
    raise exception using errcode = '22023', message = 'unknown_question_version';
  end if;
  if v_question->>'status' <> 'in_review' then
    raise exception using errcode = '22023', message = 'question_not_in_review';
  end if;
  if exists (
    select 1 from public.ai_content_review_events e
    where e.question_version_id = p_question_version_id
      and e.decision = 'rejected'
  ) then
    raise exception using errcode = '22023', message = 'question_ai_review_rejected';
  end if;

  v_hash := public.current_review_target_sha256(p_question_version_id, p_review_kind);

  insert into public.ai_content_review_events (
    id, question_version_id, review_kind, reviewer_model, policy_id,
    decision, notes, evidence, target_sha256, authority_scope, reviewed_at
  ) values (
    v_review_id, p_question_version_id, p_review_kind, btrim(p_reviewer_model), btrim(p_policy_id),
    p_decision, btrim(p_notes), p_evidence, v_hash, 'internal_testing_only', v_reviewed_at
  );

  return query
  select v_review_id, v_hash, v_reviewed_at, 'internal_testing_only'::text;
end;
$$;

revoke all on function public.record_ai_content_review(text,text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.record_ai_content_review(text,text,text,text,text,text,jsonb) to service_role;

create or replace function public.exam_mock_internal_test_readiness(p_rule_set_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_rule public.exam_rule_sets%rowtype;
  v_catalog_version integer;
  v_required integer;
  v_eligible integer;
  v_published integer;
  v_ai integer;
  v_shortage integer;
begin
  if char_length(btrim(coalesce(p_rule_set_id,''))) < 1 then
    raise exception using errcode = '22023', message = 'exam_rule_set_required';
  end if;

  select * into v_rule
  from public.exam_rule_sets
  where rule_set_id = btrim(p_rule_set_id)
    and verification_status = 'verified';
  if v_rule.rule_set_id is null then
    raise exception using errcode = '22023', message = 'exam_rule_set_not_available';
  end if;

  select c.version into v_catalog_version
  from public.study_catalog c where c.id = 1;
  if v_catalog_version is null then
    raise exception using errcode = '55000', message = 'study_catalog_unavailable';
  end if;

  v_required := v_rule.total_questions;

  with questions as (
    select q
    from public.study_catalog c
    cross join lateral jsonb_array_elements(coalesce(c.body->'questions','[]'::jsonb)) q
    where c.id = 1
  ), candidates as (
    select
      q,
      q->>'questionId' as question_id,
      q->>'questionVersionId' as question_version_id,
      case
        when q->>'status' = 'published' and nullif(q->>'publishedAt','') is not null then 'human_published'
        when q->>'status' = 'in_review'
          and (
            select count(*)
            from public.ai_content_review_events e
            where e.question_version_id = q->>'questionVersionId'
              and e.decision = 'approved'
              and e.target_sha256 = public.current_review_target_sha256(q->>'questionVersionId', e.review_kind)
          ) = 3
          and not exists (
            select 1 from public.ai_content_review_events e
            where e.question_version_id = q->>'questionVersionId'
              and e.decision = 'rejected'
          ) then 'ai_internal_test'
        else null
      end as assurance
    from questions
    where nullif(q->>'questionId','') is not null
      and nullif(q->>'questionVersionId','') is not null
      and nullif(q->>'answerOptionId','') is not null
      and jsonb_typeof(q->'options') = 'array'
      and jsonb_array_length(q->'options') >= 2
      and exists (
        select 1
        from jsonb_array_elements(coalesce(q->'conceptLinks','[]'::jsonb)) link
        where link->>'role' = 'primary' and nullif(link->>'conceptId','') is not null
      )
  ), ranked as (
    select *, row_number() over (
      partition by question_id
      order by
        case assurance when 'human_published' then 0 else 1 end,
        case when (q->>'version') ~ '^[0-9]+$' then (q->>'version')::integer else 0 end desc,
        question_version_id desc
    ) rn
    from candidates
    where assurance is not null
  )
  select
    count(*)::integer,
    count(*) filter (where assurance = 'human_published')::integer,
    count(*) filter (where assurance = 'ai_internal_test')::integer
  into v_eligible, v_published, v_ai
  from ranked where rn = 1;

  v_shortage := greatest(0, v_required - v_eligible);

  return jsonb_build_object(
    'contractId','exam-mock-internal-test-readiness-v1',
    'ruleSetId',v_rule.rule_set_id,
    'examId',v_rule.exam_id,
    'catalogVersion',v_catalog_version,
    'requiredUniqueQuestions',v_required,
    'eligibleUniqueQuestions',v_eligible,
    'humanPublishedUniqueQuestions',v_published,
    'aiInternalTestUniqueQuestions',v_ai,
    'shortage',v_shortage,
    'ready',v_shortage = 0,
    'testOnly',true,
    'learnerFacing',false,
    'productionPublicationAuthority',false,
    'productionReadinessContract','exam_mock_readiness',
    'assurancePolicy','human-published-or-three-current-ai-test-gates-v1',
    'examBlueprintFidelity',false
  );
end;
$$;

revoke all on function public.exam_mock_internal_test_readiness(text) from public, anon, authenticated;
grant execute on function public.exam_mock_internal_test_readiness(text) to service_role;

create or replace function public.exam_assemble_internal_test_mock(p_rule_set_id text, p_seed text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_rule public.exam_rule_sets%rowtype;
  v_catalog_version integer;
  v_required integer;
  v_count integer;
  v_published integer;
  v_ai integer;
  v_ids jsonb;
begin
  if char_length(btrim(coalesce(p_rule_set_id,''))) < 1 then
    raise exception using errcode = '22023', message = 'exam_rule_set_required';
  end if;
  if char_length(btrim(coalesce(p_seed,''))) < 8 or char_length(p_seed) > 200 then
    raise exception using errcode = '22023', message = 'invalid_exam_assembly_seed';
  end if;

  select * into v_rule
  from public.exam_rule_sets
  where rule_set_id = btrim(p_rule_set_id)
    and verification_status = 'verified';
  if v_rule.rule_set_id is null then
    raise exception using errcode = '22023', message = 'exam_rule_set_not_available';
  end if;

  select c.version into v_catalog_version from public.study_catalog c where c.id = 1;
  if v_catalog_version is null then
    raise exception using errcode = '55000', message = 'study_catalog_unavailable';
  end if;
  v_required := v_rule.total_questions;

  with questions as (
    select q
    from public.study_catalog c
    cross join lateral jsonb_array_elements(coalesce(c.body->'questions','[]'::jsonb)) q
    where c.id = 1
  ), candidates as (
    select
      q,
      q->>'questionId' as question_id,
      q->>'questionVersionId' as question_version_id,
      case
        when q->>'status' = 'published' and nullif(q->>'publishedAt','') is not null then 'human_published'
        when q->>'status' = 'in_review'
          and (
            select count(*)
            from public.ai_content_review_events e
            where e.question_version_id = q->>'questionVersionId'
              and e.decision = 'approved'
              and e.target_sha256 = public.current_review_target_sha256(q->>'questionVersionId', e.review_kind)
          ) = 3
          and not exists (
            select 1 from public.ai_content_review_events e
            where e.question_version_id = q->>'questionVersionId'
              and e.decision = 'rejected'
          ) then 'ai_internal_test'
        else null
      end as assurance
    from questions
    where nullif(q->>'questionId','') is not null
      and nullif(q->>'questionVersionId','') is not null
      and nullif(q->>'answerOptionId','') is not null
      and jsonb_typeof(q->'options') = 'array'
      and jsonb_array_length(q->'options') >= 2
      and exists (
        select 1
        from jsonb_array_elements(coalesce(q->'conceptLinks','[]'::jsonb)) link
        where link->>'role' = 'primary' and nullif(link->>'conceptId','') is not null
      )
  ), ranked as (
    select *, row_number() over (
      partition by question_id
      order by
        case assurance when 'human_published' then 0 else 1 end,
        case when (q->>'version') ~ '^[0-9]+$' then (q->>'version')::integer else 0 end desc,
        question_version_id desc
    ) rn
    from candidates
    where assurance is not null
  ), eligible as (
    select question_version_id, assurance
    from ranked where rn = 1
  ), chosen as (
    select question_version_id, assurance
    from eligible
    order by
      encode(extensions.digest(convert_to(btrim(p_seed)||':'||question_version_id,'UTF8'),'sha256'),'hex'),
      question_version_id
    limit v_required
  )
  select
    count(*)::integer,
    count(*) filter (where assurance='human_published')::integer,
    count(*) filter (where assurance='ai_internal_test')::integer,
    coalesce(jsonb_agg(question_version_id order by question_version_id),'[]'::jsonb)
  into v_count, v_published, v_ai, v_ids
  from chosen;

  if v_count < v_required then
    return jsonb_build_object(
      'contractId','exam-mock-internal-test-assembly-v1',
      'ruleSetId',v_rule.rule_set_id,
      'examId',v_rule.exam_id,
      'catalogVersion',v_catalog_version,
      'policyId','distinct-human-or-ai-test-randomized-v1',
      'ready',false,
      'requiredUniqueQuestions',v_required,
      'assembledQuestions',v_count,
      'humanPublishedQuestions',v_published,
      'aiInternalTestQuestions',v_ai,
      'shortage',v_required-v_count,
      'questionVersionIds','[]'::jsonb,
      'testOnly',true,
      'learnerFacing',false,
      'productionPublicationAuthority',false,
      'examBlueprintFidelity',false
    );
  end if;

  return jsonb_build_object(
    'contractId','exam-mock-internal-test-assembly-v1',
    'ruleSetId',v_rule.rule_set_id,
    'examId',v_rule.exam_id,
    'ruleSetSha256',v_rule.rule_set_sha256,
    'catalogVersion',v_catalog_version,
    'policyId','distinct-human-or-ai-test-randomized-v1',
    'ready',true,
    'requiredUniqueQuestions',v_required,
    'assembledQuestions',v_count,
    'humanPublishedQuestions',v_published,
    'aiInternalTestQuestions',v_ai,
    'shortage',0,
    'questionVersionIds',v_ids,
    'testOnly',true,
    'learnerFacing',false,
    'productionPublicationAuthority',false,
    'examBlueprintFidelity',false,
    'contentMixFidelity','unstratified-test-pool'
  );
end;
$$;

revoke all on function public.exam_assemble_internal_test_mock(text,text) from public, anon, authenticated;
grant execute on function public.exam_assemble_internal_test_mock(text,text) to service_role;
