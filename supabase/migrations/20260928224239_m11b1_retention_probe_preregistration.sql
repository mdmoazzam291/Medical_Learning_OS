create table if not exists public.study_retention_probe_protocols (
  protocol_id text primary key,
  protocol_version integer not null check (protocol_version >= 1),
  status text not null check (status in ('preregistered','superseded','withdrawn')),
  protocol_body jsonb not null,
  protocol_sha256 text not null check (protocol_sha256 ~ '^[0-9a-f]{64}$'),
  preregistered_at timestamptz not null default now(),
  constraint study_retention_probe_protocol_id_check
    check (protocol_id ~ '^[a-z0-9][a-z0-9:_@.\-]{2,120}$'),
  constraint study_retention_probe_protocol_body_object
    check (jsonb_typeof(protocol_body)='object')
);

alter table public.study_retention_probe_protocols enable row level security;
revoke all on table public.study_retention_probe_protocols
  from public, anon, authenticated, service_role;
grant select on table public.study_retention_probe_protocols to service_role;

create or replace function public.block_retention_probe_protocol_mutation()
returns trigger
language plpgsql
set search_path=''
as $function$
begin
  raise exception using
    errcode='55000',
    message='retention_probe_protocol_is_immutable';
end;
$function$;

revoke all on function public.block_retention_probe_protocol_mutation()
  from public, anon, authenticated, service_role;

drop trigger if exists study_retention_probe_protocols_immutable
  on public.study_retention_probe_protocols;
create trigger study_retention_probe_protocols_immutable
before update or delete on public.study_retention_probe_protocols
for each row execute function public.block_retention_probe_protocol_mutation();

with protocol as (
  select jsonb_build_object(
    'contractId','retention-probe-feasibility-v1',
    'researchStage','feasibility',
    'objective',
      'Test whether Medical Learning OS can collect clean delayed alternate-item retrieval evidence with minimal learner burden. This protocol does not estimate mastery, forgetting rate, item equivalence, intervention efficacy or causal effect.',
    'primaryHorizon',jsonb_build_object(
      'targetDays',7,
      'windowStartDays',6,
      'windowEndDays',8
    ),
    'assignment',jsonb_build_object(
      'enabled',false,
      'requiresExplicitLearnerOptIn',true,
      'maxProbeAssignmentsPerLearnerPer7Days',1,
      'mayDisplaceDueOrMistakeRepairWork',false,
      'maxTotalAssignments',20,
      'maxStudyWindowDaysFromFirstAssignment',56
    ),
    'pairEligibility',jsonb_build_object(
      'samePrimaryConceptRequired',true,
      'distinctQuestionIdentityRequired',true,
      'bothQuestionVersionsPublished',true,
      'validatedPairMetadataRequired',true,
      'questionRevisionDoesNotCountAsAlternate',true
    ),
    'learnerEligibility',jsonb_build_object(
      'targetAlternateMustHaveNoPriorAttempt',true,
      'originMustBeARecordedQuestionAttempt',true,
      'authenticatedLearnerRequired',true
    ),
    'contamination',jsonb_build_object(
      'excludeFromCleanAnalysisIfObservedSameConceptQuestionAttemptOccursBetweenOriginAndProbe',true,
      'excludeFromCleanAnalysisIfTargetAlternateIsSeenBeforeProbe',true,
      'sameItemEarlyProbeForbidden',true,
      'outsidePlatformExposureMayBeUnobserved',true
    ),
    'outcomes',jsonb_build_object(
      'primary','alternate_item_correct_within_6_to_8_day_window',
      'secondary',jsonb_build_array(
        'alternate_item_response_time_ms',
        'optional_memory_rating_if_available',
        'probe_completion_within_window',
        'observed_contamination_rate',
        'probe_transport_failure_rate'
      ),
      'descriptiveOnly',true
    ),
    'analysis',jsonb_build_object(
      'unit','eligible_origin_attempt',
      'cleanAnalysisRequiresNoObservedContamination',true,
      'noCausalInference',true,
      'noMasteryOrForgettingModelFitting',true,
      'noHypothesisTestingClaim',true,
      'reportItemPairAndConceptExplicitly',true
    ),
    'stopRules',jsonb_build_object(
      'hardCapTotalAssignments',20,
      'hardCapDaysFromFirstAssignment',56,
      'pauseImmediatelyOnContentSafetyDefect',true,
      'pauseImmediatelyOnIdentityOrPairBindingViolation',true,
      'pauseImmediatelyOnLearnerOptOut',true,
      'noOutcomeBasedEarlyStopping',true
    ),
    'activationPrerequisites',jsonb_build_array(
      'at-least-one-published-distinct-alternate-item-pair',
      'validated-alternate-pair-novelty-and-comparability-metadata',
      'explicit-learner-opt-in-path',
      'separate-activation-authorization'
    ),
    'authority',jsonb_build_object(
      'probeSchedulingEnabled',false,
      'activationAuthority',false,
      'studyNowAuthority',false,
      'masteryInferenceAuthority',false
    )
  ) as body
)
insert into public.study_retention_probe_protocols (
  protocol_id,
  protocol_version,
  status,
  protocol_body,
  protocol_sha256
)
select
  'retention-probe-feasibility-v1',
  1,
  'preregistered',
  body,
  encode(extensions.digest(convert_to(body::text,'UTF8'),'sha256'),'hex')
from protocol
on conflict (protocol_id) do nothing;

create or replace function public.study_retention_probe_protocol_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $function$
select pg_catalog.jsonb_build_object(
  'protocolId',p.protocol_id,
  'protocolVersion',p.protocol_version,
  'status',p.status,
  'protocolSha256',p.protocol_sha256,
  'preregisteredAt',p.preregistered_at,
  'protocol',p.protocol_body,
  'activationAuthority',false,
  'probeSchedulingEnabled',false
)
from public.study_retention_probe_protocols p
where p.protocol_id='retention-probe-feasibility-v1'
  and p.status='preregistered'
limit 1;
$function$;

revoke all on function public.study_retention_probe_protocol_v1()
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_protocol_v1()
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
  v_has_pair boolean;
  v_has_protocol boolean;
begin
  v_content := public.study_retention_probe_readiness_v1();
  v_protocol := public.study_retention_probe_protocol_v1();
  v_has_pair := coalesce((v_content->'readiness'->>'hasAnyPublishedAlternateItemPair')::boolean,false);
  v_has_protocol := v_protocol is not null;

  return pg_catalog.jsonb_build_object(
    'contractId','study-retention-probe-activation-readiness-v1',
    'contentReadiness',v_content,
    'protocol',v_protocol,
    'readiness',pg_catalog.jsonb_build_object(
      'hasPublishedAlternateItemPair',v_has_pair,
      'protocolPreregistered',v_has_protocol,
      'validatedPairMetadataAvailable',false,
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
        '["validated-alternate-pair-metadata-not-yet-available","learner-opt-in-path-not-yet-implemented","separate-activation-authorization-required"]'::jsonb
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
