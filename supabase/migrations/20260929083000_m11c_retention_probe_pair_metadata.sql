create table if not exists public.study_retention_probe_pair_assessments (
  assessment_id uuid primary key default gen_random_uuid(),
  pair_id text not null,
  concept_id text not null,
  origin_question_id text not null,
  origin_question_version_id text not null,
  alternate_question_id text not null,
  alternate_question_version_id text not null,
  rubric_version integer not null check (rubric_version >= 1),
  assessor_type text not null check (assessor_type in ('ai_research_assist','human_research_reviewer')),
  decision text not null check (decision in ('needs_human_validation','validated_for_feasibility','rejected_for_feasibility')),
  assessment_body jsonb not null,
  assessment_sha256 text not null check (assessment_sha256 ~ '^[0-9a-f]{64}$'),
  assessed_at timestamptz not null default now(),
  constraint study_retention_probe_pair_id_check
    check (pair_id ~ '^[a-z0-9][a-z0-9:_@.\-]{2,180}$'),
  constraint study_retention_probe_pair_distinct_question_ids
    check (origin_question_id <> alternate_question_id),
  constraint study_retention_probe_pair_body_object
    check (jsonb_typeof(assessment_body)='object'),
  constraint study_retention_probe_pair_human_validation_authority
    check (
      decision <> 'validated_for_feasibility'
      or assessor_type = 'human_research_reviewer'
    ),
  unique (pair_id, assessment_sha256)
);

alter table public.study_retention_probe_pair_assessments enable row level security;
revoke all on table public.study_retention_probe_pair_assessments
  from public, anon, authenticated, service_role;
grant select, insert on table public.study_retention_probe_pair_assessments
  to service_role;

create or replace function public.block_retention_probe_pair_assessment_mutation()
returns trigger
language plpgsql
set search_path=''
as $function$
begin
  raise exception using
    errcode='55000',
    message='retention_probe_pair_assessment_is_immutable';
end;
$function$;

revoke all on function public.block_retention_probe_pair_assessment_mutation()
  from public, anon, authenticated, service_role;

drop trigger if exists study_retention_probe_pair_assessments_immutable
  on public.study_retention_probe_pair_assessments;
create trigger study_retention_probe_pair_assessments_immutable
before update or delete on public.study_retention_probe_pair_assessments
for each row execute function public.block_retention_probe_pair_assessment_mutation();

with assessment as (
  select jsonb_build_object(
    'contractId','retention-probe-pair-assessment-v1',
    'purpose','M11c feasibility metadata review only; not psychometric equivalence validation',
    'constructMatch','high',
    'surfaceNovelty','moderate',
    'surfaceOverlap','moderate',
    'difficultyComparability','unknown',
    'answerKeyRelationship','same-correct-action',
    'clinicalContextDifference',jsonb_build_array(
      'origin includes urticaria plus wheeze and hypotension',
      'alternate removes urticaria while retaining respiratory and cardiovascular compromise'
    ),
    'reasoningDifference',
      'alternate specifically tests whether absence of skin findings delays immediate epinephrine treatment',
    'contaminationRisk','moderate',
    'eligibilityRecommendation','needs-human-validation-before-feasibility-use',
    'limitations',jsonb_build_array(
      'no empirical difficulty calibration',
      'no learner response data comparing the pair',
      'same answer action may permit answer-memory carryover',
      'semantic review cannot prove psychometric equivalence'
    )
  ) as body
)
insert into public.study_retention_probe_pair_assessments (
  pair_id,
  concept_id,
  origin_question_id,
  origin_question_version_id,
  alternate_question_id,
  alternate_question_version_id,
  rubric_version,
  assessor_type,
  decision,
  assessment_body,
  assessment_sha256
)
select
  'anaphylaxis-first-line-treatment-pair-v1',
  'emergency:anaphylaxis:first-line-treatment',
  'emergency:anaphylaxis:first-line-drug',
  'emergency:anaphylaxis:first-line-drug@1',
  'emergency:anaphylaxis:no-rash-first-action',
  'emergency:anaphylaxis:no-rash-first-action@1',
  1,
  'ai_research_assist',
  'needs_human_validation',
  body,
  encode(extensions.digest(convert_to(body::text,'UTF8'),'sha256'),'hex')
from assessment
on conflict (pair_id, assessment_sha256) do nothing;

create or replace function public.study_retention_probe_pair_readiness_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $function$
with questions as (
  select
    q->>'questionId' as question_id,
    q->>'questionVersionId' as question_version_id,
    q->>'status' as status,
    (
      select link->>'conceptId'
      from pg_catalog.jsonb_array_elements(q->'conceptLinks') link
      where link->>'role'='primary'
      limit 1
    ) as concept_id
  from public.study_catalog c
  cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
  where c.id=1
),
assessments as (
  select
    a.*,
    oq.status as origin_status,
    oq.concept_id as origin_concept_id,
    aq.status as alternate_status,
    aq.concept_id as alternate_concept_id,
    (
      oq.status='published'
      and aq.status='published'
      and oq.concept_id=a.concept_id
      and aq.concept_id=a.concept_id
      and a.origin_question_id<>a.alternate_question_id
    ) as current_structural_binding
  from public.study_retention_probe_pair_assessments a
  left join questions oq
    on oq.question_id=a.origin_question_id
   and oq.question_version_id=a.origin_question_version_id
  left join questions aq
    on aq.question_id=a.alternate_question_id
   and aq.question_version_id=a.alternate_question_version_id
),
summary as (
  select
    count(*)::integer as assessment_count,
    count(*) filter (
      where assessor_type='human_research_reviewer'
        and decision='validated_for_feasibility'
        and current_structural_binding
    )::integer as human_validated_current_pairs,
    count(*) filter (
      where decision='needs_human_validation'
        and current_structural_binding
    )::integer as current_pairs_awaiting_human_validation
  from assessments
)
select pg_catalog.jsonb_build_object(
  'contractId','study-retention-probe-pair-readiness-v1',
  'scope','pair-level-novelty-comparability-metadata',
  'summary',pg_catalog.jsonb_build_object(
    'assessmentCount',s.assessment_count,
    'humanValidatedCurrentPairs',s.human_validated_current_pairs,
    'currentPairsAwaitingHumanValidation',s.current_pairs_awaiting_human_validation
  ),
  'readiness',pg_catalog.jsonb_build_object(
    'validatedPairMetadataAvailable',s.human_validated_current_pairs > 0,
    'canSatisfyProtocolPairMetadataGate',s.human_validated_current_pairs > 0
  ),
  'pairs',coalesce((
    select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'pairId',a.pair_id,
        'conceptId',a.concept_id,
        'originQuestionId',a.origin_question_id,
        'originQuestionVersionId',a.origin_question_version_id,
        'alternateQuestionId',a.alternate_question_id,
        'alternateQuestionVersionId',a.alternate_question_version_id,
        'assessorType',a.assessor_type,
        'decision',a.decision,
        'assessmentSha256',a.assessment_sha256,
        'assessedAt',a.assessed_at,
        'currentStructuralBinding',a.current_structural_binding,
        'assessment',a.assessment_body
      )
      order by a.assessed_at, a.pair_id
    )
    from assessments a
  ),'[]'::jsonb),
  'limitations',pg_catalog.jsonb_build_array(
    'human feasibility validation does not prove psychometric equivalence',
    'pair-level metadata is version-bound and does not transfer automatically to revised questions',
    'empirical difficulty and transfer validity require later learner data'
  ),
  'activationAuthority',false,
  'probeSchedulingEnabled',false
)
from summary s;
$function$;

revoke all on function public.study_retention_probe_pair_readiness_v1()
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_pair_readiness_v1()
  to service_role;

create or replace function public.study_retention_probe_activation_readiness_v1()
returns jsonb
language plpgsql
stable
security invoker
set search_path=''
as $function$
declare
  v_content jsonb;
  v_protocol jsonb;
  v_pair jsonb;
  v_has_pair boolean;
  v_has_protocol boolean;
  v_has_validated_pair_metadata boolean;
begin
  v_content := public.study_retention_probe_readiness_v1();
  v_protocol := public.study_retention_probe_protocol_v1();
  v_pair := public.study_retention_probe_pair_readiness_v1();

  v_has_pair := coalesce((v_content->'readiness'->>'hasAnyPublishedAlternateItemPair')::boolean,false);
  v_has_protocol := v_protocol is not null;
  v_has_validated_pair_metadata :=
    coalesce((v_pair->'readiness'->>'validatedPairMetadataAvailable')::boolean,false);

  return pg_catalog.jsonb_build_object(
    'contractId','study-retention-probe-activation-readiness-v1',
    'contentReadiness',v_content,
    'protocol',v_protocol,
    'pairMetadataReadiness',v_pair,
    'readiness',pg_catalog.jsonb_build_object(
      'hasPublishedAlternateItemPair',v_has_pair,
      'protocolPreregistered',v_has_protocol,
      'validatedPairMetadataAvailable',v_has_validated_pair_metadata,
      'learnerOptInPathAvailable',false,
      'canActivate',false,
      'blockingReasons',
        (case when not v_has_pair
          then '["no-published-alternate-item-pair"]'::jsonb
          else '[]'::jsonb end)
        ||
        (case when not v_has_protocol
          then '["retention-probe-protocol-not-preregistered"]'::jsonb
          else '[]'::jsonb end)
        ||
        (case when not v_has_validated_pair_metadata
          then '["validated-alternate-pair-metadata-not-yet-available"]'::jsonb
          else '[]'::jsonb end)
        ||
        '["learner-opt-in-path-not-yet-implemented","separate-activation-authorization-required"]'::jsonb
    ),
    'activationAuthority',false,
    'probeSchedulingEnabled',false
  );
end;
$function$;

revoke all on function public.study_retention_probe_activation_readiness_v1()
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_activation_readiness_v1()
  to service_role;
