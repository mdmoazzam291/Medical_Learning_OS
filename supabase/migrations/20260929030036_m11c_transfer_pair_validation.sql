
create table if not exists public.study_transfer_pair_validations (
  id uuid primary key default gen_random_uuid(),
  contract_version integer not null default 1 check (contract_version = 1),
  primary_concept_id text not null check (primary_concept_id ~ '^[a-zA-Z0-9:_@.\-]{1,200}$'),
  question_a_id text not null check (question_a_id ~ '^[a-zA-Z0-9:_@.\-]{1,160}$'),
  question_a_version_id text not null check (question_a_version_id ~ '^[a-zA-Z0-9:_@.\-]{1,160}$'),
  question_a_medical_sha256 text not null check (question_a_medical_sha256 ~ '^[0-9a-f]{64}$'),
  question_b_id text not null check (question_b_id ~ '^[a-zA-Z0-9:_@.\-]{1,160}$'),
  question_b_version_id text not null check (question_b_version_id ~ '^[a-zA-Z0-9:_@.\-]{1,160}$'),
  question_b_medical_sha256 text not null check (question_b_medical_sha256 ~ '^[0-9a-f]{64}$'),
  decision text not null check (decision in ('validated','rejected')),
  surface_novelty text not null check (surface_novelty in ('low','moderate','high')),
  construct_alignment text not null check (construct_alignment in ('same_primary_construct','related_construct','mismatch')),
  reasoning_alignment text not null check (reasoning_alignment in ('comparable','bounded_difference','materially_different')),
  difficulty_comparability text not null check (difficulty_comparability in ('comparable','bounded_difference','unknown','materially_different')),
  cue_overlap_risk text not null check (cue_overlap_risk in ('low','moderate','high')),
  transfer_evidence_valid boolean not null,
  retention_probe_comparable boolean not null,
  validator_id uuid not null references auth.users(id) on delete restrict,
  notes text not null check (char_length(btrim(notes)) between 20 and 4000),
  validation_sha256 text not null check (validation_sha256 ~ '^[0-9a-f]{64}$'),
  validated_at timestamptz not null default now(),
  constraint study_transfer_pair_distinct_question_ids check (question_a_id <> question_b_id),
  constraint study_transfer_pair_canonical_order check (question_a_version_id < question_b_version_id),
  constraint study_transfer_pair_validated_semantics check (
    (
      decision = 'validated'
      and transfer_evidence_valid
      and construct_alignment = 'same_primary_construct'
      and surface_novelty in ('moderate','high')
      and reasoning_alignment in ('comparable','bounded_difference')
      and cue_overlap_risk in ('low','moderate')
    )
    or
    (
      decision = 'rejected'
      and not transfer_evidence_valid
      and not retention_probe_comparable
    )
  ),
  constraint study_transfer_pair_retention_semantics check (
    not retention_probe_comparable
    or (
      decision = 'validated'
      and transfer_evidence_valid
      and difficulty_comparability in ('comparable','bounded_difference')
      and cue_overlap_risk in ('low','moderate')
    )
  ),
  unique (question_a_version_id, question_b_version_id)
);

create index if not exists study_transfer_pair_validations_concept
  on public.study_transfer_pair_validations (primary_concept_id, validated_at desc);

alter table public.study_transfer_pair_validations enable row level security;
revoke all on table public.study_transfer_pair_validations from public, anon, authenticated, service_role;
grant select on table public.study_transfer_pair_validations to service_role;

create or replace function public.block_transfer_pair_validation_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception using errcode='55000', message='transfer_pair_validation_is_immutable';
end;
$function$;

revoke all on function public.block_transfer_pair_validation_mutation()
  from public, anon, authenticated, service_role;

drop trigger if exists study_transfer_pair_validations_immutable
  on public.study_transfer_pair_validations;
create trigger study_transfer_pair_validations_immutable
before update or delete on public.study_transfer_pair_validations
for each row execute function public.block_transfer_pair_validation_mutation();

create or replace function public.record_transfer_pair_validation_v1(
  p_question_version_1 text,
  p_question_version_2 text,
  p_validator uuid,
  p_decision text,
  p_surface_novelty text,
  p_construct_alignment text,
  p_reasoning_alignment text,
  p_difficulty_comparability text,
  p_cue_overlap_risk text,
  p_retention_probe_comparable boolean,
  p_notes text
)
returns table (
  validation_id uuid,
  validation_sha256 text,
  validated_at timestamptz,
  transfer_evidence_valid boolean,
  retention_probe_comparable boolean
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_q1 jsonb; v_q2 jsonb; v_a jsonb; v_b jsonb;
  v_q1_concept text; v_q2_concept text;
  v_a_id text; v_b_id text; v_a_version text; v_b_version text;
  v_a_hash text; v_b_hash text;
  v_transfer_valid boolean; v_retention_comparable boolean;
  v_id uuid := gen_random_uuid();
  v_at timestamptz := now();
  v_validation_body jsonb; v_validation_hash text;
begin
  if p_question_version_1 is null
     or p_question_version_2 is null
     or p_question_version_1 = p_question_version_2 then
    raise exception using errcode='22023', message='distinct_question_versions_required';
  end if;
  if p_decision not in ('validated','rejected') then
    raise exception using errcode='22023', message='invalid_transfer_pair_decision';
  end if;
  if p_surface_novelty not in ('low','moderate','high') then
    raise exception using errcode='22023', message='invalid_surface_novelty';
  end if;
  if p_construct_alignment not in ('same_primary_construct','related_construct','mismatch') then
    raise exception using errcode='22023', message='invalid_construct_alignment';
  end if;
  if p_reasoning_alignment not in ('comparable','bounded_difference','materially_different') then
    raise exception using errcode='22023', message='invalid_reasoning_alignment';
  end if;
  if p_difficulty_comparability not in ('comparable','bounded_difference','unknown','materially_different') then
    raise exception using errcode='22023', message='invalid_difficulty_comparability';
  end if;
  if p_cue_overlap_risk not in ('low','moderate','high') then
    raise exception using errcode='22023', message='invalid_cue_overlap_risk';
  end if;
  if char_length(btrim(coalesce(p_notes,''))) not between 20 and 4000 then
    raise exception using errcode='22023', message='invalid_transfer_pair_notes';
  end if;

  if (
    select count(distinct review_kind)
    from public.content_reviewer_grants
    where reviewer_id = p_validator
      and review_kind in ('medical','references','rights')
  ) <> 3 then
    raise exception using errcode='42501', message='transfer_pair_validator_not_authorized';
  end if;

  select q into v_q1
  from public.study_catalog c
  cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
  where c.id=1 and q->>'questionVersionId'=p_question_version_1
  limit 1;

  select q into v_q2
  from public.study_catalog c
  cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
  where c.id=1 and q->>'questionVersionId'=p_question_version_2
  limit 1;

  if v_q1 is null or v_q2 is null then
    raise exception using errcode='22023', message='unknown_transfer_pair_question_version';
  end if;
  if v_q1->>'status' <> 'published' or v_q2->>'status' <> 'published' then
    raise exception using errcode='22023', message='transfer_pair_requires_published_questions';
  end if;
  if v_q1->>'questionId' = v_q2->>'questionId' then
    raise exception using errcode='22023', message='question_revision_is_not_transfer_item';
  end if;
  if v_q1->>'authorId' = p_validator::text or v_q2->>'authorId' = p_validator::text then
    raise exception using errcode='42501', message='author_cannot_validate_transfer_pair';
  end if;

  select link->>'conceptId' into v_q1_concept
  from pg_catalog.jsonb_array_elements(v_q1->'conceptLinks') link
  where link->>'role'='primary'
  limit 1;

  select link->>'conceptId' into v_q2_concept
  from pg_catalog.jsonb_array_elements(v_q2->'conceptLinks') link
  where link->>'role'='primary'
  limit 1;

  if v_q1_concept is null or v_q2_concept is null or v_q1_concept <> v_q2_concept then
    raise exception using errcode='22023', message='transfer_pair_requires_same_primary_concept';
  end if;

  if p_question_version_1 < p_question_version_2 then
    v_a := v_q1; v_b := v_q2;
  else
    v_a := v_q2; v_b := v_q1;
  end if;

  v_a_id := v_a->>'questionId';
  v_b_id := v_b->>'questionId';
  v_a_version := v_a->>'questionVersionId';
  v_b_version := v_b->>'questionVersionId';
  v_a_hash := public.current_review_target_sha256(v_a_version,'medical');
  v_b_hash := public.current_review_target_sha256(v_b_version,'medical');

  v_transfer_valid := (
    p_decision='validated'
    and p_construct_alignment='same_primary_construct'
    and p_surface_novelty in ('moderate','high')
    and p_reasoning_alignment in ('comparable','bounded_difference')
    and p_cue_overlap_risk in ('low','moderate')
  );

  if p_decision='validated' and not v_transfer_valid then
    raise exception using errcode='22023', message='validated_pair_fails_transfer_semantic_gate';
  end if;

  v_retention_comparable := (
    v_transfer_valid
    and coalesce(p_retention_probe_comparable,false)
    and p_difficulty_comparability in ('comparable','bounded_difference')
  );

  if coalesce(p_retention_probe_comparable,false) and not v_retention_comparable then
    raise exception using errcode='22023', message='retention_comparability_gate_failed';
  end if;

  if p_decision='rejected' then
    v_transfer_valid := false;
    v_retention_comparable := false;
  end if;

  v_validation_body := pg_catalog.jsonb_build_object(
    'contractId','study-transfer-pair-validation-v1',
    'contractVersion',1,
    'primaryConceptId',v_q1_concept,
    'questionA',pg_catalog.jsonb_build_object(
      'questionId',v_a_id,'questionVersionId',v_a_version,'medicalSha256',v_a_hash
    ),
    'questionB',pg_catalog.jsonb_build_object(
      'questionId',v_b_id,'questionVersionId',v_b_version,'medicalSha256',v_b_hash
    ),
    'decision',p_decision,
    'surfaceNovelty',p_surface_novelty,
    'constructAlignment',p_construct_alignment,
    'reasoningAlignment',p_reasoning_alignment,
    'difficultyComparability',p_difficulty_comparability,
    'cueOverlapRisk',p_cue_overlap_risk,
    'transferEvidenceValid',v_transfer_valid,
    'retentionProbeComparable',v_retention_comparable,
    'validatorId',p_validator::text,
    'notes',btrim(p_notes),
    'validatedAt',to_char(v_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  v_validation_hash := encode(
    extensions.digest(convert_to(v_validation_body::text,'UTF8'),'sha256'),
    'hex'
  );

  insert into public.study_transfer_pair_validations (
    id, contract_version, primary_concept_id,
    question_a_id, question_a_version_id, question_a_medical_sha256,
    question_b_id, question_b_version_id, question_b_medical_sha256,
    decision, surface_novelty, construct_alignment, reasoning_alignment,
    difficulty_comparability, cue_overlap_risk,
    transfer_evidence_valid, retention_probe_comparable,
    validator_id, notes, validation_sha256, validated_at
  ) values (
    v_id, 1, v_q1_concept,
    v_a_id, v_a_version, v_a_hash,
    v_b_id, v_b_version, v_b_hash,
    p_decision, p_surface_novelty, p_construct_alignment, p_reasoning_alignment,
    p_difficulty_comparability, p_cue_overlap_risk,
    v_transfer_valid, v_retention_comparable,
    p_validator, btrim(p_notes), v_validation_hash, v_at
  );

  return query
  select v_id, v_validation_hash, v_at, v_transfer_valid, v_retention_comparable;
end;
$function$;

revoke all on function public.record_transfer_pair_validation_v1(
  text,text,uuid,text,text,text,text,text,text,boolean,text
) from public, anon, authenticated;
grant execute on function public.record_transfer_pair_validation_v1(
  text,text,uuid,text,text,text,text,text,text,boolean,text
) to service_role;

create or replace function public.study_transfer_pair_validation_readiness_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $function$
with rows as (
  select v.*, qa.q as question_a, qb.q as question_b
  from public.study_transfer_pair_validations v
  left join lateral (
    select q from public.study_catalog c
    cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
    where c.id=1 and q->>'questionVersionId'=v.question_a_version_id limit 1
  ) qa on true
  left join lateral (
    select q from public.study_catalog c
    cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
    where c.id=1 and q->>'questionVersionId'=v.question_b_version_id limit 1
  ) qb on true
),
classified as (
  select
    r.*,
    (
      r.question_a is not null
      and r.question_b is not null
      and r.question_a->>'questionId'=r.question_a_id
      and r.question_b->>'questionId'=r.question_b_id
      and public.current_review_target_sha256(r.question_a_version_id,'medical')=r.question_a_medical_sha256
      and public.current_review_target_sha256(r.question_b_version_id,'medical')=r.question_b_medical_sha256
    ) as hashes_current,
    (
      r.question_a->>'status'='published'
      and r.question_b->>'status'='published'
    ) as both_currently_published
  from rows r
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

create or replace function public.study_validated_transfer_observations_v1(
  p_learner uuid
)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $function$
with origins as (
  select
    a.id as origin_attempt_id,
    a.learner_id,
    a.session_id,
    a.event->>'questionVersionId' as origin_question_version_id,
    a.event->>'conceptId' as concept_id,
    (a.event->>'occurredAt')::timestamptz as origin_occurred_at,
    a.recorded_at as origin_recorded_at,
    (a.event->>'correct')::boolean as origin_correct
  from public.study_attempts a
  where a.learner_id=p_learner
    and a.event->>'type'='question.answered'
    and a.event->>'schemaVersion'='1'
),
linked as (
  select
    o.*,
    t.transfer_attempt_id,
    t.transfer_question_version_id,
    t.transfer_occurred_at,
    t.transfer_recorded_at,
    t.transfer_correct,
    t.transfer_duration_ms,
    t.pair_validation_id,
    t.validation_sha256,
    t.surface_novelty,
    t.reasoning_alignment,
    t.difficulty_comparability,
    t.cue_overlap_risk,
    t.retention_probe_comparable,
    case
      when t.transfer_attempt_id is null then null
      else floor(extract(epoch from (t.transfer_occurred_at - o.origin_occurred_at)) * 1000)::bigint
    end as transfer_delay_ms,
    case
      when t.transfer_attempt_id is null then null
      else (
        select count(*)::integer
        from public.study_attempts prior_target
        where prior_target.learner_id=o.learner_id
          and prior_target.event->>'type'='question.answered'
          and prior_target.event->>'schemaVersion'='1'
          and prior_target.event->>'questionVersionId'=t.transfer_question_version_id
          and (prior_target.recorded_at, prior_target.id) < (o.origin_recorded_at, o.origin_attempt_id)
      )
    end as prior_target_attempts,
    case
      when t.transfer_attempt_id is null then null
      else (
        select count(*)::integer
        from public.study_attempts between_concept
        where between_concept.learner_id=o.learner_id
          and between_concept.event->>'type'='question.answered'
          and between_concept.event->>'schemaVersion'='1'
          and between_concept.event->>'conceptId'=o.concept_id
          and (between_concept.recorded_at, between_concept.id) > (o.origin_recorded_at, o.origin_attempt_id)
          and (between_concept.recorded_at, between_concept.id) < (t.transfer_recorded_at, t.transfer_attempt_id)
      )
    end as intervening_same_concept_attempts
  from origins o
  left join lateral (
    select
      a.id as transfer_attempt_id,
      a.event->>'questionVersionId' as transfer_question_version_id,
      (a.event->>'occurredAt')::timestamptz as transfer_occurred_at,
      a.recorded_at as transfer_recorded_at,
      (a.event->>'correct')::boolean as transfer_correct,
      case
        when (a.event->>'durationMs') ~ '^[0-9]+$'
          then (a.event->>'durationMs')::bigint
        else null
      end as transfer_duration_ms,
      v.id as pair_validation_id,
      v.validation_sha256,
      v.surface_novelty,
      v.reasoning_alignment,
      v.difficulty_comparability,
      v.cue_overlap_risk,
      v.retention_probe_comparable
    from public.study_attempts a
    join public.study_transfer_pair_validations v
      on v.decision='validated'
     and v.transfer_evidence_valid
     and v.primary_concept_id=o.concept_id
     and (
       (v.question_a_version_id=o.origin_question_version_id
         and v.question_b_version_id=a.event->>'questionVersionId')
       or
       (v.question_b_version_id=o.origin_question_version_id
         and v.question_a_version_id=a.event->>'questionVersionId')
     )
    where a.learner_id=o.learner_id
      and a.event->>'type'='question.answered'
      and a.event->>'schemaVersion'='1'
      and a.event->>'conceptId'=o.concept_id
      and a.event->>'questionVersionId'<>o.origin_question_version_id
      and (a.recorded_at, a.id) > (o.origin_recorded_at, o.origin_attempt_id)
      and public.current_review_target_sha256(v.question_a_version_id,'medical')=v.question_a_medical_sha256
      and public.current_review_target_sha256(v.question_b_version_id,'medical')=v.question_b_medical_sha256
    order by a.recorded_at, a.id
    limit 1
  ) t on true
),
summary as (
  select
    count(*)::integer as origin_attempts,
    count(*) filter (where transfer_attempt_id is not null)::integer as validated_transfer_followups,
    count(*) filter (
      where transfer_attempt_id is not null
        and prior_target_attempts=0
        and intervening_same_concept_attempts=0
    )::integer as clean_validated_transfer_followups
  from linked
)
select pg_catalog.jsonb_build_object(
  'contractId','study-validated-transfer-observations-v1',
  'learnerId',p_learner,
  'scope','validated-pair-descriptive-transfer-evidence',
  'inferenceAuthority',false,
  'masteryInferenceEnabled',false,
  'causalEffectClaimed',false,
  'summary',pg_catalog.jsonb_build_object(
    'originAttempts',s.origin_attempts,
    'validatedTransferFollowups',s.validated_transfer_followups,
    'cleanValidatedTransferFollowups',s.clean_validated_transfer_followups
  ),
  'observations',coalesce((
    select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'origin',pg_catalog.jsonb_build_object(
          'attemptId',r.origin_attempt_id,
          'sessionId',r.session_id,
          'questionVersionId',r.origin_question_version_id,
          'conceptId',r.concept_id,
          'occurredAt',r.origin_occurred_at,
          'correct',r.origin_correct
        ),
        'validatedTransfer',case
          when r.transfer_attempt_id is null then null
          else pg_catalog.jsonb_build_object(
            'attemptId',r.transfer_attempt_id,
            'questionVersionId',r.transfer_question_version_id,
            'occurredAt',r.transfer_occurred_at,
            'delayMs',r.transfer_delay_ms,
            'correct',r.transfer_correct,
            'durationMs',r.transfer_duration_ms,
            'priorTargetAttempts',r.prior_target_attempts,
            'interveningSameConceptAttempts',r.intervening_same_concept_attempts,
            'cleanObservedTransfer',
              r.prior_target_attempts=0 and r.intervening_same_concept_attempts=0,
            'pairValidation',pg_catalog.jsonb_build_object(
              'validationId',r.pair_validation_id,
              'validationSha256',r.validation_sha256,
              'surfaceNovelty',r.surface_novelty,
              'reasoningAlignment',r.reasoning_alignment,
              'difficultyComparability',r.difficulty_comparability,
              'cueOverlapRisk',r.cue_overlap_risk,
              'retentionProbeComparable',r.retention_probe_comparable
            )
          )
        end
      )
      order by r.origin_occurred_at, r.origin_attempt_id
    )
    from linked r
  ),'[]'::jsonb),
  'limitations',pg_catalog.jsonb_build_array(
    'validated-item-pair-does-not-prove-general-transfer-beyond-the-pair',
    'clean-observed-transfer-can-still-have-unobserved-outside-platform-exposure',
    'descriptive-transfer-evidence-does-not-estimate-mastery-or-causal-effect',
    'item-pair-validation-is-exact-version-and-hash-bound'
  )
)
from summary s;
$function$;

revoke all on function public.study_validated_transfer_observations_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.study_validated_transfer_observations_v1(uuid)
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
  v_pairs jsonb;
  v_has_pair boolean;
  v_has_protocol boolean;
  v_has_validated_pair boolean;
begin
  v_content := public.study_retention_probe_readiness_v1();
  v_protocol := public.study_retention_probe_protocol_v1();
  v_pairs := public.study_transfer_pair_validation_readiness_v1();
  v_has_pair := coalesce((v_content->'readiness'->>'hasAnyPublishedAlternateItemPair')::boolean,false);
  v_has_protocol := v_protocol is not null;
  v_has_validated_pair := coalesce(
    (v_pairs->'readiness'->>'validatedRetentionProbePairMetadataAvailable')::boolean,
    false
  );

  return pg_catalog.jsonb_build_object(
    'contractId','study-retention-probe-activation-readiness-v1',
    'contentReadiness',v_content,
    'protocol',v_protocol,
    'pairValidationReadiness',v_pairs,
    'readiness',pg_catalog.jsonb_build_object(
      'hasPublishedAlternateItemPair',v_has_pair,
      'protocolPreregistered',v_has_protocol,
      'validatedPairMetadataAvailable',v_has_validated_pair,
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
        (case when not v_has_validated_pair
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
