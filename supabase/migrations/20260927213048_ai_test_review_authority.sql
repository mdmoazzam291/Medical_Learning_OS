create table public.content_ai_test_source_rights (
  id uuid primary key default gen_random_uuid(),
  source_id text not null,
  decision text not null check (decision in ('approved','rejected')),
  recommended_use text not null check (recommended_use in ('citation_only','public_domain','licensed','owned','restricted')),
  reviewer_principal text not null check (char_length(btrim(reviewer_principal)) between 1 and 200),
  policy_id text not null default 'ai-test-review-v1' check (char_length(btrim(policy_id)) between 1 and 120),
  model_label text check (model_label is null or char_length(btrim(model_label)) between 1 and 200),
  notes text not null check (char_length(btrim(notes)) between 1 and 4000),
  source_fingerprint_sha256 text not null check (source_fingerprint_sha256 ~ '^[0-9a-f]{64}$'),
  reviewed_at timestamptz not null default now(),
  unique (source_id, policy_id),
  check (
    (decision = 'approved' and recommended_use in ('citation_only','public_domain','licensed','owned'))
    or (decision = 'rejected' and recommended_use = 'restricted')
  )
);

create table public.content_ai_test_review_events (
  id uuid primary key default gen_random_uuid(),
  question_version_id text not null,
  review_kind text not null check (review_kind in ('medical','references','rights')),
  decision text not null check (decision in ('approved','rejected')),
  reviewer_principal text not null check (char_length(btrim(reviewer_principal)) between 1 and 200),
  policy_id text not null default 'ai-test-review-v1' check (char_length(btrim(policy_id)) between 1 and 120),
  model_label text check (model_label is null or char_length(btrim(model_label)) between 1 and 200),
  notes text not null check (char_length(btrim(notes)) between 1 and 4000),
  target_sha256 text not null check (target_sha256 ~ '^[0-9a-f]{64}$'),
  reviewed_at timestamptz not null default now(),
  unique (question_version_id, review_kind, policy_id)
);

alter table public.content_ai_test_source_rights enable row level security;
alter table public.content_ai_test_review_events enable row level security;

create policy content_ai_test_source_rights_deny_browser
on public.content_ai_test_source_rights
for all to anon, authenticated
using (false) with check (false);

create policy content_ai_test_review_events_deny_browser
on public.content_ai_test_review_events
for all to anon, authenticated
using (false) with check (false);

revoke all on table public.content_ai_test_source_rights from public, anon, authenticated;
revoke all on table public.content_ai_test_review_events from public, anon, authenticated;
grant select on table public.content_ai_test_source_rights to service_role;
grant select on table public.content_ai_test_review_events to service_role;

create or replace function public.prevent_ai_test_review_mutation()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  raise exception using errcode = '55000', message = 'ai_test_review_evidence_immutable';
end;
$$;

create trigger content_ai_test_source_rights_immutable
before update or delete on public.content_ai_test_source_rights
for each row execute function public.prevent_ai_test_review_mutation();

create trigger content_ai_test_review_events_immutable
before update or delete on public.content_ai_test_review_events
for each row execute function public.prevent_ai_test_review_mutation();

create or replace function public.record_ai_test_source_rights(
  p_source_id text,
  p_decision text,
  p_recommended_use text,
  p_reviewer_principal text,
  p_policy_id text,
  p_model_label text,
  p_notes text
)
returns table(event_id uuid, source_fingerprint_sha256 text, reviewed_at timestamptz)
language plpgsql
security definer
set search_path = 'public', 'extensions', 'pg_temp'
as $$
declare
  v_event_id uuid := gen_random_uuid();
  v_reviewed_at timestamptz := now();
  v_fingerprint text;
begin
  if p_decision not in ('approved','rejected') then
    raise exception using errcode = '22023', message = 'invalid_ai_test_rights_decision';
  end if;
  if p_recommended_use not in ('citation_only','public_domain','licensed','owned','restricted') then
    raise exception using errcode = '22023', message = 'invalid_ai_test_rights_use';
  end if;
  if (p_decision = 'approved' and p_recommended_use = 'restricted')
     or (p_decision = 'rejected' and p_recommended_use <> 'restricted') then
    raise exception using errcode = '22023', message = 'invalid_ai_test_rights_combination';
  end if;
  if char_length(btrim(coalesce(p_reviewer_principal,''))) not between 1 and 200
     or char_length(btrim(coalesce(p_policy_id,''))) not between 1 and 120
     or char_length(btrim(coalesce(p_notes,''))) not between 1 and 4000
     or (p_model_label is not null and char_length(btrim(p_model_label)) not between 1 and 200) then
    raise exception using errcode = '22023', message = 'invalid_ai_test_rights_metadata';
  end if;

  v_fingerprint := public.current_source_fingerprint_sha256(btrim(p_source_id));

  insert into public.content_ai_test_source_rights(
    id, source_id, decision, recommended_use, reviewer_principal, policy_id,
    model_label, notes, source_fingerprint_sha256, reviewed_at
  ) values (
    v_event_id, btrim(p_source_id), p_decision, p_recommended_use,
    btrim(p_reviewer_principal), btrim(p_policy_id),
    nullif(btrim(coalesce(p_model_label,'')), ''),
    btrim(p_notes), v_fingerprint, v_reviewed_at
  );

  return query select v_event_id, v_fingerprint, v_reviewed_at;
end;
$$;

create or replace function public.record_ai_test_review(
  p_question_version_id text,
  p_review_kind text,
  p_decision text,
  p_reviewer_principal text,
  p_policy_id text,
  p_model_label text,
  p_notes text
)
returns table(review_id uuid, target_sha256 text, reviewed_at timestamptz)
language plpgsql
security definer
set search_path = 'public', 'extensions', 'pg_temp'
as $$
declare
  v_question jsonb;
  v_hash text;
  v_review_id uuid := gen_random_uuid();
  v_reviewed_at timestamptz := now();
begin
  if p_review_kind not in ('medical','references','rights') then
    raise exception using errcode = '22023', message = 'invalid_ai_test_review_kind';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception using errcode = '22023', message = 'invalid_ai_test_review_decision';
  end if;
  if char_length(btrim(coalesce(p_reviewer_principal,''))) not between 1 and 200
     or char_length(btrim(coalesce(p_policy_id,''))) not between 1 and 120
     or char_length(btrim(coalesce(p_notes,''))) not between 1 and 4000
     or (p_model_label is not null and char_length(btrim(p_model_label)) not between 1 and 200) then
    raise exception using errcode = '22023', message = 'invalid_ai_test_review_metadata';
  end if;

  select q into v_question
  from public.study_catalog c
  cross join lateral jsonb_array_elements(coalesce(c.body->'questions','[]'::jsonb)) q
  where c.id = 1
    and q->>'questionVersionId' = btrim(p_question_version_id)
  limit 1;

  if v_question is null then
    raise exception using errcode = '22023', message = 'unknown_question_version';
  end if;
  if v_question->>'status' <> 'in_review' then
    raise exception using errcode = '22023', message = 'question_not_in_review_for_ai_test_review';
  end if;
  if coalesce(v_question->'provenance'->>'kind','') not in ('original','ai_generated') then
    raise exception using errcode = '22023', message = 'ai_test_review_provenance_not_allowed';
  end if;

  if exists (
    select 1
    from public.content_ai_test_review_events e
    where e.question_version_id = btrim(p_question_version_id)
      and e.policy_id = btrim(p_policy_id)
      and e.decision = 'rejected'
  ) then
    raise exception using errcode = '22023', message = 'ai_test_question_already_rejected';
  end if;

  if p_review_kind = 'rights' and p_decision = 'approved' and exists (
    select 1
    from jsonb_array_elements_text(coalesce(v_question->'sourceIds','[]'::jsonb)) source_id
    where not exists (
      select 1
      from public.content_ai_test_source_rights r
      where r.source_id = source_id
        and r.policy_id = btrim(p_policy_id)
        and r.decision = 'approved'
        and r.recommended_use in ('citation_only','public_domain','licensed','owned')
        and r.source_fingerprint_sha256 = public.current_source_fingerprint_sha256(source_id)
    )
  ) then
    raise exception using errcode = '22023', message = 'ai_test_rights_not_approved';
  end if;

  v_hash := public.current_review_target_sha256(btrim(p_question_version_id), p_review_kind);

  insert into public.content_ai_test_review_events(
    id, question_version_id, review_kind, decision, reviewer_principal, policy_id,
    model_label, notes, target_sha256, reviewed_at
  ) values (
    v_review_id, btrim(p_question_version_id), p_review_kind, p_decision,
    btrim(p_reviewer_principal), btrim(p_policy_id),
    nullif(btrim(coalesce(p_model_label,'')), ''),
    btrim(p_notes), v_hash, v_reviewed_at
  );

  return query select v_review_id, v_hash, v_reviewed_at;
end;
$$;

create or replace function public.exam_mock_test_readiness(p_rule_set_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rule public.exam_rule_sets%rowtype;
  v_catalog_version integer;
  v_required integer;
  v_human integer;
  v_ai integer;
  v_eligible integer;
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

  select c.version into v_catalog_version from public.study_catalog c where c.id = 1;
  if v_catalog_version is null then
    raise exception using errcode = '55000', message = 'study_catalog_unavailable';
  end if;

  with questions as (
    select q
    from public.study_catalog c
    cross join lateral pg_catalog.jsonb_array_elements(coalesce(c.body->'questions','[]'::jsonb)) q
    where c.id = 1
      and nullif(q->>'questionId','') is not null
      and nullif(q->>'questionVersionId','') is not null
      and nullif(q->>'answerOptionId','') is not null
      and pg_catalog.jsonb_typeof(q->'options') = 'array'
      and pg_catalog.jsonb_array_length(q->'options') >= 2
      and exists (
        select 1
        from pg_catalog.jsonb_array_elements(coalesce(q->'conceptLinks','[]'::jsonb)) link
        where link->>'role' = 'primary' and nullif(link->>'conceptId','') is not null
      )
  ),
  candidates as (
    select q,
      case
        when q->>'status' = 'published' and nullif(q->>'publishedAt','') is not null
          then 'human_published'
        when q->>'status' = 'in_review'
          and (
            select count(*)
            from public.content_ai_test_review_events e
            where e.question_version_id = q->>'questionVersionId'
              and e.policy_id = 'ai-test-review-v1'
              and e.decision = 'approved'
              and e.target_sha256 = public.current_review_target_sha256(q->>'questionVersionId', e.review_kind)
          ) = 3
          and not exists (
            select 1 from public.content_ai_test_review_events e
            where e.question_version_id = q->>'questionVersionId'
              and e.policy_id = 'ai-test-review-v1'
              and e.decision = 'rejected'
          )
          then 'ai_test_only'
        else null
      end as eligibility_class
    from questions
  ),
  ranked as (
    select q, eligibility_class,
      row_number() over (
        partition by q->>'questionId'
        order by
          case eligibility_class when 'human_published' then 0 else 1 end,
          case when (q->>'version') ~ '^[0-9]+$' then (q->>'version')::integer else 0 end desc,
          q->>'questionVersionId' desc
      ) as rn
    from candidates where eligibility_class is not null
  )
  select
    count(*) filter (where rn=1 and eligibility_class='human_published')::integer,
    count(*) filter (where rn=1 and eligibility_class='ai_test_only')::integer,
    count(*) filter (where rn=1)::integer
  into v_human, v_ai, v_eligible
  from ranked;

  v_required := v_rule.total_questions;
  v_shortage := greatest(0, v_required - v_eligible);

  return pg_catalog.jsonb_build_object(
    'contractId','exam-mock-test-readiness-v1',
    'ruleSetId',v_rule.rule_set_id,
    'examId',v_rule.exam_id,
    'catalogVersion',v_catalog_version,
    'requiredUniqueQuestions',v_required,
    'humanPublishedUniqueQuestions',v_human,
    'aiTestOnlyUniqueQuestions',v_ai,
    'eligibleUniqueQuestions',v_eligible,
    'shortage',v_shortage,
    'ready',v_shortage=0,
    'testingOnly',true,
    'productionReadinessUnaffected',true,
    'productionPublicationRequiresHumanReview',true,
    'blockers',case when v_shortage>0
      then pg_catalog.jsonb_build_array('insufficient-internal-test-eligible-questions')
      else '[]'::jsonb end
  );
end;
$$;

create or replace function public.exam_assemble_test_mock(p_rule_set_id text, p_seed text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rule public.exam_rule_sets%rowtype;
  v_catalog_version integer;
  v_required integer;
  v_ids jsonb;
  v_count integer;
  v_ai_count integer;
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

  select c.version into v_catalog_version from public.study_catalog c where c.id=1;
  if v_catalog_version is null then
    raise exception using errcode = '55000', message = 'study_catalog_unavailable';
  end if;
  v_required := v_rule.total_questions;

  with questions as (
    select q
    from public.study_catalog c
    cross join lateral pg_catalog.jsonb_array_elements(coalesce(c.body->'questions','[]'::jsonb)) q
    where c.id=1
      and nullif(q->>'questionId','') is not null
      and nullif(q->>'questionVersionId','') is not null
      and nullif(q->>'answerOptionId','') is not null
      and pg_catalog.jsonb_typeof(q->'options')='array'
      and pg_catalog.jsonb_array_length(q->'options')>=2
      and exists (
        select 1 from pg_catalog.jsonb_array_elements(coalesce(q->'conceptLinks','[]'::jsonb)) link
        where link->>'role'='primary' and nullif(link->>'conceptId','') is not null
      )
  ),
  candidates as (
    select q,
      case
        when q->>'status'='published' and nullif(q->>'publishedAt','') is not null
          then 'human_published'
        when q->>'status'='in_review'
          and (
            select count(*)
            from public.content_ai_test_review_events e
            where e.question_version_id=q->>'questionVersionId'
              and e.policy_id='ai-test-review-v1'
              and e.decision='approved'
              and e.target_sha256=public.current_review_target_sha256(q->>'questionVersionId',e.review_kind)
          )=3
          and not exists (
            select 1 from public.content_ai_test_review_events e
            where e.question_version_id=q->>'questionVersionId'
              and e.policy_id='ai-test-review-v1'
              and e.decision='rejected'
          )
          then 'ai_test_only'
        else null
      end eligibility_class
    from questions
  ),
  ranked as (
    select q, eligibility_class,
      row_number() over (
        partition by q->>'questionId'
        order by
          case eligibility_class when 'human_published' then 0 else 1 end,
          case when (q->>'version') ~ '^[0-9]+$' then (q->>'version')::integer else 0 end desc,
          q->>'questionVersionId' desc
      ) rn
    from candidates where eligibility_class is not null
  ),
  chosen as (
    select q->>'questionVersionId' question_version_id, eligibility_class
    from ranked
    where rn=1
    order by
      pg_catalog.encode(
        extensions.digest(
          pg_catalog.convert_to(btrim(p_seed)||':'||(q->>'questionVersionId'),'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      q->>'questionVersionId'
    limit v_required
  )
  select
    count(*)::integer,
    count(*) filter (where eligibility_class='ai_test_only')::integer,
    coalesce(pg_catalog.jsonb_agg(question_version_id order by question_version_id),'[]'::jsonb)
  into v_count, v_ai_count, v_ids
  from chosen;

  if v_count < v_required then
    return pg_catalog.jsonb_build_object(
      'contractId','exam-mock-test-assembly-v1',
      'ruleSetId',v_rule.rule_set_id,
      'examId',v_rule.exam_id,
      'catalogVersion',v_catalog_version,
      'policyId','human-published-plus-ai-test-reviewed-v1',
      'ready',false,
      'testingOnly',true,
      'productionEquivalent',false,
      'requiredUniqueQuestions',v_required,
      'assembledQuestions',v_count,
      'shortage',v_required-v_count,
      'questionVersionIds','[]'::jsonb,
      'blockers',pg_catalog.jsonb_build_array('insufficient-internal-test-eligible-questions'),
      'examBlueprintFidelity',false
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','exam-mock-test-assembly-v1',
    'ruleSetId',v_rule.rule_set_id,
    'examId',v_rule.exam_id,
    'ruleSetSha256',v_rule.rule_set_sha256,
    'catalogVersion',v_catalog_version,
    'policyId','human-published-plus-ai-test-reviewed-v1',
    'ready',true,
    'testingOnly',true,
    'productionEquivalent',false,
    'productionPublicationRequiresHumanReview',true,
    'requiredUniqueQuestions',v_required,
    'assembledQuestions',v_count,
    'aiTestOnlyQuestions',v_ai_count,
    'shortage',0,
    'questionVersionIds',v_ids,
    'examBlueprintFidelity',false,
    'contentMixFidelity','exam-priority-planned-not-yet-validated'
  );
end;
$$;

revoke all on function public.prevent_ai_test_review_mutation() from public;
revoke all on function public.record_ai_test_source_rights(text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.record_ai_test_review(text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.exam_mock_test_readiness(text) from public, anon, authenticated;
revoke all on function public.exam_assemble_test_mock(text,text) from public, anon, authenticated;

grant execute on function public.record_ai_test_source_rights(text,text,text,text,text,text,text) to service_role;
grant execute on function public.record_ai_test_review(text,text,text,text,text,text,text) to service_role;
grant execute on function public.exam_mock_test_readiness(text) to service_role;
grant execute on function public.exam_assemble_test_mock(text,text) to service_role;
