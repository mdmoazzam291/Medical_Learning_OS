-- Fix M11c current-pair projection: expand the catalog once, then join both exact
-- question versions explicitly. The prior nested lateral lookup could return NULL
-- for question B even while the immutable hashes and catalog versions were current.
-- This migration changes readiness projection only; validation evidence is untouched.

create or replace function public.study_transfer_pair_validation_readiness_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $function$
with catalog_questions as (
  select q
  from public.study_catalog c
  cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
  where c.id=1
),
classified as (
  select
    v.*,
    qa.q as question_a,
    qb.q as question_b,
    (
      qa.q is not null
      and qb.q is not null
      and qa.q->>'questionId'=v.question_a_id
      and qb.q->>'questionId'=v.question_b_id
      and public.current_review_target_sha256(v.question_a_version_id,'medical')=v.question_a_medical_sha256
      and public.current_review_target_sha256(v.question_b_version_id,'medical')=v.question_b_medical_sha256
    ) as hashes_current,
    (
      qa.q->>'status'='published'
      and qb.q->>'status'='published'
    ) as both_currently_published
  from public.study_transfer_pair_validations v
  left join catalog_questions qa
    on qa.q->>'questionVersionId'=v.question_a_version_id
  left join catalog_questions qb
    on qb.q->>'questionVersionId'=v.question_b_version_id
),
summary as (
  select
    count(*)::integer as total_validations,
    count(*) filter (where decision='validated')::integer as validated_pairs,
    count(*) filter (
      where decision='validated' and transfer_evidence_valid and hashes_current
    )::integer as current_transfer_pairs,
    count(*) filter (
      where decision='validated'
        and transfer_evidence_valid
        and retention_probe_comparable
        and hashes_current
        and both_currently_published
    )::integer as current_retention_probe_pairs,
    count(*) filter (
      where decision='validated' and not hashes_current
    )::integer as stale_validated_pairs
  from classified
)
select pg_catalog.jsonb_build_object(
  'contractId','study-transfer-pair-validation-readiness-v1',
  'scope','pair-validity-readiness',
  'summary',pg_catalog.jsonb_build_object(
    'totalPairValidations',s.total_validations,
    'validatedPairs',s.validated_pairs,
    'currentTransferEvidencePairs',s.current_transfer_pairs,
    'currentRetentionProbeComparablePairs',s.current_retention_probe_pairs,
    'staleValidatedPairs',s.stale_validated_pairs
  ),
  'readiness',pg_catalog.jsonb_build_object(
    'validatedTransferPairMetadataAvailable',s.current_transfer_pairs > 0,
    'validatedRetentionProbePairMetadataAvailable',s.current_retention_probe_pairs > 0
  ),
  'authority',pg_catalog.jsonb_build_object(
    'probeSchedulingEnabled',false,
    'studyNowAuthority',false,
    'masteryInferenceAuthority',false
  )
)
from summary s;
$function$;

revoke all on function public.study_transfer_pair_validation_readiness_v1()
  from public, anon, authenticated;
grant execute on function public.study_transfer_pair_validation_readiness_v1()
  to service_role;

create or replace function public.study_retention_probe_activation_authorization_readiness_v1()
returns jsonb
language plpgsql
stable
set search_path to ''
as $function$
declare
  v_protocol public.study_retention_probe_protocols%rowtype;
  v_opt_in_count integer := 0;
  v_current_pair_count integer := 0;
  v_current_pair_ids jsonb := '[]'::jsonb;
  v_active_authorization public.study_retention_probe_activation_events%rowtype;
begin
  select *
  into v_protocol
  from public.study_retention_probe_protocols p
  where p.protocol_id='retention-probe-feasibility-v1'
    and p.status='preregistered'
  limit 1;

  select coalesce(
    (public.study_retention_probe_current_opt_in_population_v1()
      ->>'activeOptedInLearners')::integer,
    0
  )
  into v_opt_in_count;

  with catalog_questions as (
    select q
    from public.study_catalog c
    cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
    where c.id=1
  ),
  eligible as (
    select v.id, v.validated_at
    from public.study_transfer_pair_validations v
    join catalog_questions qa
      on qa.q->>'questionVersionId'=v.question_a_version_id
    join catalog_questions qb
      on qb.q->>'questionVersionId'=v.question_b_version_id
    where v.decision='validated'
      and v.transfer_evidence_valid
      and v.retention_probe_comparable
      and qa.q->>'status'='published'
      and qb.q->>'status'='published'
      and public.current_review_target_sha256(v.question_a_version_id,'medical')=v.question_a_medical_sha256
      and public.current_review_target_sha256(v.question_b_version_id,'medical')=v.question_b_medical_sha256
  )
  select
    count(*)::integer,
    coalesce(pg_catalog.jsonb_agg(e.id order by e.validated_at, e.id), '[]'::jsonb)
  into v_current_pair_count, v_current_pair_ids
  from eligible e;

  select e.*
  into v_active_authorization
  from public.study_retention_probe_activation_events e
  where v_protocol.protocol_id is not null
    and e.protocol_id=v_protocol.protocol_id
    and e.protocol_sha256=v_protocol.protocol_sha256
  order by e.recorded_at desc, e.id desc
  limit 1;

  return pg_catalog.jsonb_build_object(
    'contractId','study-retention-probe-activation-authorization-readiness-v1',
    'protocolAvailable',v_protocol.protocol_id is not null,
    'currentRetentionComparablePairs',v_current_pair_count,
    'eligiblePairValidationIds',v_current_pair_ids,
    'recommendedPairValidationId',case
      when v_current_pair_count=1 then v_current_pair_ids->>0
      else null
    end,
    'activeOptedInLearners',v_opt_in_count,
    'currentAuthorization',case
      when v_active_authorization.id is null then null
      else pg_catalog.jsonb_build_object(
        'activationEventId',v_active_authorization.id,
        'decision',v_active_authorization.decision,
        'pairValidationId',v_active_authorization.pair_validation_id,
        'maxTotalAssignments',v_active_authorization.max_total_assignments,
        'maxAssignmentsPerLearnerPer7Days',v_active_authorization.max_assignments_per_learner_per_7_days,
        'authorizationValidUntil',v_active_authorization.authorization_valid_until,
        'recordedAt',v_active_authorization.recorded_at
      )
    end,
    'readiness',pg_catalog.jsonb_build_object(
      'canAuthorize',
        v_protocol.protocol_id is not null
        and v_current_pair_count > 0
        and v_opt_in_count > 0
        and not (
          v_active_authorization.id is not null
          and v_active_authorization.decision='authorize'
          and v_active_authorization.authorization_valid_until > pg_catalog.now()
        ),
      'canRevoke',
        v_active_authorization.id is not null
        and v_active_authorization.decision='authorize'
        and v_active_authorization.authorization_valid_until > pg_catalog.now(),
      'blockingReasons',
        (case when v_protocol.protocol_id is null
          then '["retention-probe-protocol-not-preregistered"]'::jsonb
          else '[]'::jsonb end)
        ||
        (case when v_current_pair_count = 0
          then '["validated-retention-comparable-pair-required"]'::jsonb
          else '[]'::jsonb end)
        ||
        (case when v_opt_in_count = 0
          then '["at-least-one-currently-opted-in-learner-required"]'::jsonb
          else '[]'::jsonb end)
    ),
    'authority',pg_catalog.jsonb_build_object(
      'authorizationRecordMayBeIssued',true,
      'probeSchedulingEnabled',false,
      'studyNowAuthority',false,
      'masteryInferenceAuthority',false
    )
  );
end;
$function$;

revoke all on function public.study_retention_probe_activation_authorization_readiness_v1()
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_activation_authorization_readiness_v1()
  to service_role;
