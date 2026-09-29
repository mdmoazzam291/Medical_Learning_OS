-- M05d: platform-level Memory Engine / FSRS evidence-readiness projection.
-- Descriptive only. It does not choose thresholds, arm experiments, change due dates,
-- infer mastery, or promote FSRS into production scheduling.

create or replace function public.study_memory_engine_evidence_readiness_v1()
returns jsonb
language plpgsql
stable
security invoker
set search_path=''
as $function$
declare
  v_experiment public.study_policy_experiment_specs%rowtype;
  v_experiment_readiness jsonb;
  v_state text;
  v_total_learners integer := 0;
  v_learners_with_attempts integer := 0;
  v_learners_with_ratings integer := 0;
  v_total_attempts integer := 0;
  v_rated_attempts integer := 0;
  v_rated_question_histories integer := 0;
  v_fully_rated_question_histories integer := 0;
  v_rating_lag_mean_ms bigint;
  v_rating_lag_median_ms bigint;
  v_rating_lag_max_ms bigint;
  v_paired_attempts integer := 0;
  v_paired_learners integer := 0;
  v_same_item_followups integer := 0;
  v_delay_1d integer := 0;
  v_delay_7d integer := 0;
  v_delay_30d integer := 0;
  v_delay_90d integer := 0;
  v_delay_180d integer := 0;
  v_rated_origins_with_followup integer := 0;
  v_metric_status text;
  v_blockers jsonb := '[]'::jsonb;
begin
  select *
  into v_experiment
  from public.study_policy_experiment_specs s
  where s.experiment_id='scheduler-bootstrap-vs-fsrs-v1'
    and s.version=1
  limit 1;

  if v_experiment.experiment_id is null then
    raise exception using errcode='55000', message='memory_engine_experiment_spec_missing';
  end if;

  v_experiment_readiness := public.study_policy_experiment_readiness(
    v_experiment.experiment_id,
    v_experiment.version
  );
  v_state := public.study_policy_experiment_current_state(
    v_experiment.experiment_id,
    v_experiment.version
  );
  v_metric_status := coalesce(v_experiment.metric_contract->>'status','unknown');

  select
    count(*)::integer,
    count(*) filter (
      where exists (
        select 1 from public.study_attempts a where a.learner_id=u.id
      )
    )::integer,
    count(*) filter (
      where exists (
        select 1 from public.study_memory_judgments m where m.learner_id=u.id
      )
    )::integer
  into
    v_total_learners,
    v_learners_with_attempts,
    v_learners_with_ratings
  from auth.users u;

  select
    count(a.id)::integer,
    count(m.id)::integer,
    count(distinct (a.learner_id,a.event->>'questionVersionId'))
      filter (where m.id is not null)::integer,
    round(avg(
      extract(epoch from (m.recorded_at-(a.event->>'occurredAt')::timestamptz))*1000
    ) filter (
      where m.id is not null
        and m.recorded_at >= (a.event->>'occurredAt')::timestamptz
    ))::bigint,
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (m.recorded_at-(a.event->>'occurredAt')::timestamptz))*1000
    ) filter (
      where m.id is not null
        and m.recorded_at >= (a.event->>'occurredAt')::timestamptz
    ))::bigint,
    round(max(
      extract(epoch from (m.recorded_at-(a.event->>'occurredAt')::timestamptz))*1000
    ) filter (
      where m.id is not null
        and m.recorded_at >= (a.event->>'occurredAt')::timestamptz
    ))::bigint
  into
    v_total_attempts,
    v_rated_attempts,
    v_rated_question_histories,
    v_rating_lag_mean_ms,
    v_rating_lag_median_ms,
    v_rating_lag_max_ms
  from public.study_attempts a
  left join public.study_memory_judgments m
    on m.learner_id=a.learner_id
   and m.attempt_id=a.id;

  select count(*)::integer
  into v_fully_rated_question_histories
  from (
    select
      a.learner_id,
      a.event->>'questionVersionId' as question_version_id
    from public.study_attempts a
    left join public.study_memory_judgments m
      on m.learner_id=a.learner_id
     and m.attempt_id=a.id
    group by a.learner_id,a.event->>'questionVersionId'
    having count(*)>0 and count(*)=count(m.id)
  ) histories;

  with paired as (
    select a.learner_id,a.attempt_id
    from public.study_schedule_decision_events a
    join public.study_schedule_decision_events s
      on s.learner_id=a.learner_id
     and s.attempt_id=a.attempt_id
    where a.role='authoritative'
      and a.policy_id='bootstrap-binary-v1'
      and a.policy_version=1
      and a.config_version='bootstrap-binary-v1@1'
      and s.role='shadow'
      and s.policy_id='fsrs-shadow'
      and s.policy_version=1
      and s.config_version='fsrs-shadow-default-v1'
    group by a.learner_id,a.attempt_id
  )
  select count(*)::integer,count(distinct learner_id)::integer
  into v_paired_attempts,v_paired_learners
  from paired;

  with attempts as (
    select
      a.id,
      a.learner_id,
      a.event->>'questionVersionId' as question_version_id,
      (a.event->>'occurredAt')::timestamptz as occurred_at,
      exists (
        select 1
        from public.study_memory_judgments m
        where m.learner_id=a.learner_id
          and m.attempt_id=a.id
      ) as rated
    from public.study_attempts a
    where a.event->>'type'='question.answered'
  ),
  linked as (
    select
      origin.id as origin_attempt_id,
      origin.rated,
      followup.id as followup_attempt_id,
      case
        when followup.id is null then null
        else extract(epoch from (followup.occurred_at-origin.occurred_at))*1000
      end as delay_ms
    from attempts origin
    left join lateral (
      select next_attempt.*
      from attempts next_attempt
      where next_attempt.learner_id=origin.learner_id
        and next_attempt.question_version_id=origin.question_version_id
        and (
          next_attempt.occurred_at>origin.occurred_at
          or (
            next_attempt.occurred_at=origin.occurred_at
            and next_attempt.id::text>origin.id::text
          )
        )
      order by next_attempt.occurred_at,next_attempt.id
      limit 1
    ) followup on true
  )
  select
    count(*) filter (where followup_attempt_id is not null)::integer,
    count(*) filter (where delay_ms>=86400000)::integer,
    count(*) filter (where delay_ms>=604800000)::integer,
    count(*) filter (where delay_ms>=2592000000)::integer,
    count(*) filter (where delay_ms>=7776000000)::integer,
    count(*) filter (where delay_ms>=15552000000)::integer,
    count(*) filter (where rated and followup_attempt_id is not null)::integer
  into
    v_same_item_followups,
    v_delay_1d,
    v_delay_7d,
    v_delay_30d,
    v_delay_90d,
    v_delay_180d,
    v_rated_origins_with_followup
  from linked;

  if v_experiment.minimum_eligible_learners is null then
    v_blockers:=v_blockers||'["experiment-population-threshold-not-preregistered"]'::jsonb;
  end if;

  if v_metric_status<>'preregistered' then
    v_blockers:=v_blockers||'["experiment-metric-contract-still-draft"]'::jsonb;
  end if;

  v_blockers:=v_blockers||'["rating-timing-eligibility-rule-not-preregistered"]'::jsonb;

  if v_fully_rated_question_histories=0 then
    v_blockers:=v_blockers||'["no-fully-rated-question-history"]'::jsonb;
  end if;

  if v_paired_attempts=0 then
    v_blockers:=v_blockers||'["no-paired-authoritative-shadow-schedule-decision"]'::jsonb;
  end if;

  if v_delay_1d=0 then
    v_blockers:=v_blockers||'["no-same-item-retrieval-at-or-beyond-1-day"]'::jsonb;
  end if;

  if v_delay_7d=0 then
    v_blockers:=v_blockers||'["no-same-item-retrieval-at-or-beyond-7-days"]'::jsonb;
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','study-memory-engine-evidence-readiness-v1',
    'generatedAt',pg_catalog.now(),
    'livePolicy',pg_catalog.jsonb_build_object(
      'policyId','bootstrap-binary-v1',
      'fsrsControlsDueDates',false
    ),
    'candidatePolicy',pg_catalog.jsonb_build_object(
      'policyId','fsrs-shadow',
      'policyVersion',1,
      'configVersion','fsrs-shadow-default-v1',
      'mode','shadow-only'
    ),
    'observedEvidence',pg_catalog.jsonb_build_object(
      'learnerCount',v_total_learners,
      'learnersWithAttempts',v_learners_with_attempts,
      'learnersWithMemoryRatings',v_learners_with_ratings,
      'totalAttempts',v_total_attempts,
      'ratedAttempts',v_rated_attempts,
      'ratingCoverage',case
        when v_total_attempts=0 then null
        else v_rated_attempts::double precision/v_total_attempts
      end,
      'ratedLearnerQuestionHistories',v_rated_question_histories,
      'fullyRatedLearnerQuestionHistories',v_fully_rated_question_histories,
      'ratingLagMs',pg_catalog.jsonb_build_object(
        'mean',v_rating_lag_mean_ms,
        'median',v_rating_lag_median_ms,
        'max',v_rating_lag_max_ms,
        'eligibilityRulePreregistered',false
      ),
      'pairedAuthoritativeShadowAttempts',v_paired_attempts,
      'learnersWithPairedAuthoritativeShadowEvidence',v_paired_learners,
      'sameItemFollowups',v_same_item_followups,
      'ratedOriginsWithSameItemFollowup',v_rated_origins_with_followup,
      'delayCoverage',pg_catalog.jsonb_build_object(
        'atLeast1Day',v_delay_1d,
        'atLeast7Days',v_delay_7d,
        'atLeast30Days',v_delay_30d,
        'atLeast90Days',v_delay_90d,
        'atLeast180Days',v_delay_180d
      )
    ),
    'experiment',pg_catalog.jsonb_build_object(
      'experimentId',v_experiment.experiment_id,
      'version',v_experiment.version,
      'state',v_state,
      'specSha256',v_experiment.spec_sha256,
      'metricContractStatus',v_metric_status,
      'minimumEligibleLearners',v_experiment.minimum_eligible_learners,
      'readiness',v_experiment_readiness
    ),
    'readiness',pg_catalog.jsonb_build_object(
      'evidenceSufficientForExperimentPreregistration',false,
      'canArmCurrentExperiment',
        coalesce((v_experiment_readiness->>'canArm')::boolean,false),
      'canRunCurrentExperiment',false,
      'canPromoteFsrsToProduction',false,
      'blockingReasons',v_blockers
    ),
    'nextEvidenceAction',pg_catalog.jsonb_build_object(
      'kind','collect-prospective-rated-delayed-retrieval-evidence',
      'inventNumericThresholdNow',false,
      'why',
        'Current evidence is descriptive and too sparse to justify an FSRS-vs-bootstrap experiment threshold or production scheduler change.'
    ),
    'authority',pg_catalog.jsonb_build_object(
      'schedulerControl',false,
      'experimentArmAuthority',false,
      'productionPromotionAuthority',false,
      'masteryInferenceAuthority',false
    )
  );
end;
$function$;

revoke all on function public.study_memory_engine_evidence_readiness_v1()
  from public,anon,authenticated;
grant execute on function public.study_memory_engine_evidence_readiness_v1()
  to service_role;
