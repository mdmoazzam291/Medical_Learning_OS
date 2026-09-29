-- M11g: descriptive retention-feasibility analysis projection.
-- Read-only, service-only and explicitly non-causal.
-- Does not fit mastery, forgetting, item equivalence or intervention effects.

create or replace function public.study_retention_probe_feasibility_report_v1(
  p_now timestamptz default pg_catalog.now()
)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $function$
with protocol as (
  select
    p.protocol_id,
    p.protocol_sha256,
    p.protocol_version,
    p.preregistered_at
  from public.study_retention_probe_protocols p
  where p.protocol_id='retention-probe-feasibility-v1'
    and p.status='preregistered'
  limit 1
),
assignments as (
  select a.*
  from public.study_retention_probe_assignments a
  join protocol p
    on p.protocol_id=a.protocol_id
   and p.protocol_sha256=a.protocol_sha256
),
served as (
  select
    s.*,
    a.window_open_at,
    a.window_close_at,
    a.concept_id,
    a.origin_question_version_id,
    a.target_question_version_id as assignment_target_question_version_id
  from public.study_retention_probe_served_events s
  join assignments a
    on a.assignment_id=s.assignment_id
),
responses as (
  select
    b.*,
    a.window_open_at,
    a.window_close_at,
    a.concept_id,
    a.origin_question_version_id,
    a.target_question_version_id as assignment_target_question_version_id,
    m.rating as memory_rating
  from public.study_retention_probe_response_bindings b
  join assignments a
    on a.assignment_id=b.assignment_id
  left join public.study_memory_judgments m
    on m.attempt_id=b.attempt_id
   and m.learner_id=b.learner_id
),
counts as (
  select
    (select count(*)::integer from assignments) as assignment_count,
    (select count(*)::integer from served) as served_count,
    (select count(*)::integer from responses) as response_count,
    (select count(*)::integer from responses where clean_for_primary_analysis) as clean_response_count,
    (select count(*)::integer from responses where clean_for_primary_analysis and correct) as clean_correct_count,
    (select count(*)::integer from responses where not clean_for_primary_analysis) as contaminated_response_count,
    (
      select count(*)::integer
      from responses
      where responded_at>=window_open_at
        and responded_at<=window_close_at
    ) as responses_within_window_count,
    (
      select count(*)::integer
      from served s
      left join responses r on r.served_event_id=s.served_event_id
      where r.binding_id is null
    ) as served_without_response_count,
    (
      select count(*)::integer
      from served s
      left join responses r on r.served_event_id=s.served_event_id
      where r.binding_id is null
        and p_now>s.window_close_at
    ) as expired_served_without_response_count,
    (
      select count(*)::integer
      from assignments a
      left join served s on s.assignment_id=a.assignment_id
      where s.served_event_id is null
        and p_now>a.window_close_at
    ) as expired_unserved_assignment_count,
    (
      select count(*)::integer
      from responses
      where memory_rating is not null
    ) as memory_rating_count
),
response_timing as (
  select
    percentile_cont(0.5) within group (order by response_duration_ms)
      filter (where response_duration_ms is not null) as median_response_ms,
    (avg(response_duration_ms)
      filter (where response_duration_ms is not null))::double precision as mean_response_ms
  from responses
),
memory_summary as (
  select
    avg(memory_rating)::double precision as mean_memory_rating,
    jsonb_build_object(
      'again',count(*) filter (where memory_rating=1),
      'hard',count(*) filter (where memory_rating=2),
      'good',count(*) filter (where memory_rating=3),
      'easy',count(*) filter (where memory_rating=4)
    ) as rating_counts
  from responses
  where memory_rating is not null
),
contamination as (
  select coalesce(
    jsonb_object_agg(reason,reason_count order by reason),
    '{}'::jsonb
  ) as reason_counts
  from (
    select reason,count(*)::integer as reason_count
    from responses r
    cross join lateral jsonb_array_elements_text(r.contamination_reasons) reason
    group by reason
  ) x
),
pair_rows as (
  select
    a.pair_validation_id,
    a.pair_validation_sha256,
    a.concept_id,
    a.origin_question_version_id,
    a.target_question_version_id,
    count(*)::integer as assignment_count,
    count(s.served_event_id)::integer as served_count,
    count(r.binding_id)::integer as response_count,
    count(r.binding_id) filter (where r.clean_for_primary_analysis)::integer as clean_response_count,
    count(r.binding_id) filter (
      where r.clean_for_primary_analysis and r.correct
    )::integer as clean_correct_count
  from assignments a
  left join served s on s.assignment_id=a.assignment_id
  left join responses r on r.assignment_id=a.assignment_id
  group by
    a.pair_validation_id,
    a.pair_validation_sha256,
    a.concept_id,
    a.origin_question_version_id,
    a.target_question_version_id
),
pair_summary as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'pairValidationId',pair_validation_id,
        'pairValidationSha256',pair_validation_sha256,
        'conceptId',concept_id,
        'originQuestionVersionId',origin_question_version_id,
        'targetQuestionVersionId',target_question_version_id,
        'assignmentCount',assignment_count,
        'serverServedCount',served_count,
        'responseCount',response_count,
        'cleanResponseCount',clean_response_count,
        'cleanCorrectCount',clean_correct_count,
        'cleanAccuracy',case
          when clean_response_count=0 then null
          else clean_correct_count::double precision/clean_response_count
        end
      )
      order by concept_id,origin_question_version_id,target_question_version_id
    ),
    '[]'::jsonb
  ) as pairs
  from pair_rows
)
select jsonb_build_object(
  'contractId','study-retention-probe-feasibility-report-v1',
  'generatedAt',p_now,
  'protocol',case
    when p.protocol_id is null then null
    else jsonb_build_object(
      'protocolId',p.protocol_id,
      'protocolVersion',p.protocol_version,
      'protocolSha256',p.protocol_sha256,
      'preregisteredAt',p.preregistered_at
    )
  end,
  'funnel',jsonb_build_object(
    'assignmentCount',c.assignment_count,
    'serverServedCount',c.served_count,
    'responseCount',c.response_count,
    'cleanResponseCount',c.clean_response_count,
    'assignmentToServeRate',case
      when c.assignment_count=0 then null
      else c.served_count::double precision/c.assignment_count
    end,
    'servedToResponseRate',case
      when c.served_count=0 then null
      else c.response_count::double precision/c.served_count
    end,
    'servedWithoutResponseCount',c.served_without_response_count,
    'expiredServedWithoutResponseCount',c.expired_served_without_response_count,
    'expiredUnservedAssignmentCount',c.expired_unserved_assignment_count
  ),
  'primaryOutcome',jsonb_build_object(
    'definition','alternate_item_correct_within_6_to_8_day_window',
    'cleanResponseCount',c.clean_response_count,
    'cleanCorrectCount',c.clean_correct_count,
    'cleanAccuracy',case
      when c.clean_response_count=0 then null
      else c.clean_correct_count::double precision/c.clean_response_count
    end,
    'descriptiveOnly',true
  ),
  'secondaryOutcomes',jsonb_build_object(
    'responsesWithinWindowCount',c.responses_within_window_count,
    'medianResponseTimeMs',rt.median_response_ms,
    'meanResponseTimeMs',rt.mean_response_ms,
    'memoryRatingCount',c.memory_rating_count,
    'meanMemoryRating',ms.mean_memory_rating,
    'memoryRatingCounts',coalesce(ms.rating_counts,'{}'::jsonb),
    'contaminatedResponseCount',c.contaminated_response_count,
    'observedContaminationRate',case
      when c.response_count=0 then null
      else c.contaminated_response_count::double precision/c.response_count
    end,
    'contaminationReasonCounts',coalesce(ct.reason_counts,'{}'::jsonb),
    'transportFailureRate',null,
    'transportFailureMeasurementAvailable',false
  ),
  'pairs',ps.pairs,
  'limitations',jsonb_build_array(
    'descriptive-feasibility-only',
    'no-causal-inference',
    'no-hypothesis-testing',
    'server-served-does-not-confirm-learner-view',
    'render-acknowledgement-not-implemented',
    'transport-failure-not-identifiable-from-nonresponse',
    'outside-platform-exposure-may-be-unobserved',
    'no-mastery-or-forgetting-model-fitting'
  ),
  'authority',jsonb_build_object(
    'activationAuthority',false,
    'studyNowAuthority',false,
    'masteryInferenceAuthority',false,
    'causalInferenceAuthority',false,
    'hypothesisTestingPerformed',false
  )
)
from protocol p
cross join counts c
cross join response_timing rt
left join memory_summary ms on true
cross join contamination ct
cross join pair_summary ps;
$function$;

revoke all on function public.study_retention_probe_feasibility_report_v1(timestamptz)
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_feasibility_report_v1(timestamptz)
  to service_role;
