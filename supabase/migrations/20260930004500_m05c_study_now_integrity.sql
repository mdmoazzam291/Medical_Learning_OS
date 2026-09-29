-- M05c: authenticated Study Now transport evidence + completion integrity.
-- Captures coarse server-derived transport class for newly recorded answers in recommendation sessions.
-- No user-agent, IP, device fingerprint or exact origin is stored.

create table if not exists public.study_recommendation_transport_events (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  recommendation_id uuid not null references public.study_recommendation_events(id) on delete restrict,
  session_id uuid not null references public.study_sessions(id) on delete restrict,
  attempt_id uuid not null references public.study_attempts(id) on delete restrict,
  event_kind text not null check (event_kind='answer'),
  transport_kind text not null check (
    transport_kind in ('hosted-browser-cors','local-browser-cors','authenticated-api')
  ),
  recorded_at timestamptz not null default now(),
  unique (attempt_id)
);

create index if not exists study_recommendation_transport_events_learner_time
  on public.study_recommendation_transport_events (learner_id, recorded_at, id);

alter table public.study_recommendation_transport_events enable row level security;
revoke all on table public.study_recommendation_transport_events
  from public, anon, authenticated, service_role;
grant select, insert on table public.study_recommendation_transport_events
  to service_role;

drop trigger if exists study_recommendation_transport_events_append_only
  on public.study_recommendation_transport_events;
create trigger study_recommendation_transport_events_append_only
before update or delete on public.study_recommendation_transport_events
for each row execute function public.prevent_learner_evidence_mutation();

create or replace function public.study_record_recommendation_transport_event_v1(
  p_learner uuid,
  p_session uuid,
  p_attempt uuid,
  p_transport_kind text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_recommendation public.study_recommendation_events%rowtype;
  v_attempt public.study_attempts%rowtype;
  v_existing public.study_recommendation_transport_events%rowtype;
  v_row public.study_recommendation_transport_events%rowtype;
begin
  if p_learner is null or p_session is null or p_attempt is null then
    raise exception using errcode='22023', message='study_now_transport_identity_required';
  end if;

  if p_transport_kind not in (
    'hosted-browser-cors','local-browser-cors','authenticated-api'
  ) then
    raise exception using errcode='22023', message='study_now_transport_kind_invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_learner::text,0)
  );

  select *
  into v_recommendation
  from public.study_recommendation_events r
  where r.learner_id=p_learner
    and r.session_id=p_session
  limit 1;

  if v_recommendation.id is null then
    return pg_catalog.jsonb_build_object(
      'contractId','study-now-transport-receipt-v1',
      'recorded',false,
      'reason','not-study-now-session'
    );
  end if;

  select *
  into v_attempt
  from public.study_attempts a
  where a.id=p_attempt
    and a.learner_id=p_learner
    and a.session_id=p_session
  limit 1;

  if v_attempt.id is null then
    raise exception using errcode='22023', message='study_now_transport_attempt_not_found';
  end if;

  if not exists (
    select 1
    from pg_catalog.jsonb_array_elements(v_recommendation.plan->'selected') item
    where item->>'questionVersionId'=v_attempt.event->>'questionVersionId'
  ) then
    raise exception using errcode='55000', message='study_now_transport_attempt_not_recommended';
  end if;

  select *
  into v_existing
  from public.study_recommendation_transport_events e
  where e.attempt_id=p_attempt
  limit 1;

  if v_existing.id is not null then
    if v_existing.learner_id<>p_learner
       or v_existing.session_id<>p_session
       or v_existing.transport_kind<>p_transport_kind then
      raise exception using errcode='40900', message='study_now_transport_event_conflict';
    end if;
    v_row:=v_existing;
  else
    insert into public.study_recommendation_transport_events (
      learner_id,recommendation_id,session_id,attempt_id,event_kind,transport_kind
    ) values (
      p_learner,v_recommendation.id,p_session,p_attempt,'answer',p_transport_kind
    )
    returning * into v_row;
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','study-now-transport-receipt-v1',
    'recorded',true,
    'transportEventId',v_row.id,
    'recommendationId',v_row.recommendation_id,
    'sessionId',v_row.session_id,
    'attemptId',v_row.attempt_id,
    'eventKind',v_row.event_kind,
    'transportKind',v_row.transport_kind,
    'recordedAt',v_row.recorded_at
  );
end;
$function$;

revoke all on function public.study_record_recommendation_transport_event_v1(
  uuid,uuid,uuid,text
) from public,anon,authenticated;
grant execute on function public.study_record_recommendation_transport_event_v1(
  uuid,uuid,uuid,text
) to service_role;

create or replace function public.study_now_completion_integrity_v1(
  p_learner uuid
)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $function$
with recommendations as (
  select
    r.id as recommendation_id,
    r.session_id,
    r.created_at,
    r.strategy,
    r.available_minutes,
    r.plan,
    s.closed as session_closed,
    s.position as session_position
  from public.study_recommendation_events r
  join public.study_sessions s
    on s.id=r.session_id
   and s.learner_id=r.learner_id
  where r.learner_id=p_learner
),
items as (
  select
    r.*,
    item.ordinality::integer as item_position,
    item.value->>'questionVersionId' as question_version_id,
    item.value->>'reason' as reason
  from recommendations r
  cross join lateral pg_catalog.jsonb_array_elements(r.plan->'selected')
    with ordinality as item(value,ordinality)
),
item_evidence as (
  select
    i.*,
    a.id as attempt_id,
    a.recorded_at as attempt_recorded_at,
    exists (
      select 1
      from public.study_schedule_decision_events d
      where d.learner_id=p_learner
        and d.attempt_id=a.id
        and d.role='authoritative'
    ) as authoritative_schedule_recorded,
    exists (
      select 1
      from public.study_memory_judgments m
      where m.learner_id=p_learner
        and m.attempt_id=a.id
    ) as memory_rating_recorded,
    exists (
      select 1
      from public.study_recommendation_transport_events t
      where t.learner_id=p_learner
        and t.attempt_id=a.id
        and t.transport_kind='hosted-browser-cors'
        and t.event_kind='answer'
    ) as hosted_browser_answer
  from items i
  left join lateral (
    select a.*
    from public.study_attempts a
    where a.learner_id=p_learner
      and a.session_id=i.session_id
      and a.event->>'questionVersionId'=i.question_version_id
    order by a.recorded_at,a.id
    limit 1
  ) a on true
),
grouped as (
  select
    recommendation_id,
    session_id,
    created_at,
    strategy,
    available_minutes,
    session_closed,
    session_position,
    count(*)::integer as selected_count,
    count(attempt_id)::integer as attempted_count,
    count(*) filter (where authoritative_schedule_recorded)::integer
      as authoritative_schedule_count,
    count(*) filter (where memory_rating_recorded)::integer as memory_rating_count,
    count(*) filter (where hosted_browser_answer)::integer as hosted_browser_answer_count,
    coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'questionVersionId',question_version_id,
          'reason',reason,
          'attemptId',attempt_id,
          'attemptedAt',attempt_recorded_at,
          'authoritativeScheduleRecorded',authoritative_schedule_recorded,
          'memoryRatingRecorded',memory_rating_recorded,
          'hostedBrowserAnswer',hosted_browser_answer
        )
        order by item_position
      ),
      '[]'::jsonb
    ) as items
  from item_evidence
  group by
    recommendation_id,session_id,created_at,strategy,available_minutes,
    session_closed,session_position
),
evaluated as (
  select
    g.*,
    (
      selected_count>0
      and session_closed
      and attempted_count=selected_count
      and authoritative_schedule_count=selected_count
    ) as evidence_chain_complete,
    (
      selected_count>0
      and session_closed
      and attempted_count=selected_count
      and authoritative_schedule_count=selected_count
      and hosted_browser_answer_count>0
    ) as hosted_m05c_gate_satisfied,
    (
      (case when not session_closed
        then '["session-open"]'::jsonb else '[]'::jsonb end)
      ||
      (case when attempted_count<>selected_count
        then '["selected-items-unattempted"]'::jsonb else '[]'::jsonb end)
      ||
      (case when authoritative_schedule_count<>attempted_count
        then '["authoritative-reschedule-evidence-missing"]'::jsonb else '[]'::jsonb end)
      ||
      (case when hosted_browser_answer_count=0
        then '["no-hosted-browser-answer-evidence"]'::jsonb else '[]'::jsonb end)
    ) as blockers
  from grouped g
),
summary as (
  select
    count(*)::integer as recommendation_count,
    count(*) filter (where evidence_chain_complete)::integer as complete_evidence_chain_count,
    count(*) filter (where hosted_m05c_gate_satisfied)::integer as hosted_gate_count,
    count(*) filter (where not session_closed)::integer as open_recommendation_session_count
  from evaluated
),
latest as (
  select *
  from evaluated
  order by created_at desc,recommendation_id desc
  limit 1
)
select pg_catalog.jsonb_build_object(
  'contractId','study-now-completion-integrity-v1',
  'learnerId',p_learner,
  'recommendationCount',s.recommendation_count,
  'completeEvidenceChainCount',s.complete_evidence_chain_count,
  'hostedBrowserGateSatisfied',s.hosted_gate_count>0,
  'openRecommendationSessionCount',s.open_recommendation_session_count,
  'memoryRatingRequiredForCompletion',false,
  'latestRecommendation',case
    when l.recommendation_id is null then null
    else pg_catalog.jsonb_build_object(
      'recommendationId',l.recommendation_id,
      'sessionId',l.session_id,
      'createdAt',l.created_at,
      'strategy',l.strategy,
      'availableMinutes',l.available_minutes,
      'sessionClosed',l.session_closed,
      'sessionPosition',l.session_position,
      'selectedCount',l.selected_count,
      'attemptedCount',l.attempted_count,
      'authoritativeScheduleCount',l.authoritative_schedule_count,
      'memoryRatingCount',l.memory_rating_count,
      'hostedBrowserAnswerCount',l.hosted_browser_answer_count,
      'evidenceChainComplete',l.evidence_chain_complete,
      'hostedM05cGateSatisfied',l.hosted_m05c_gate_satisfied,
      'blockers',l.blockers,
      'items',l.items
    )
  end,
  'recommendations',coalesce((
    select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'recommendationId',e.recommendation_id,
        'sessionId',e.session_id,
        'createdAt',e.created_at,
        'sessionClosed',e.session_closed,
        'selectedCount',e.selected_count,
        'attemptedCount',e.attempted_count,
        'authoritativeScheduleCount',e.authoritative_schedule_count,
        'memoryRatingCount',e.memory_rating_count,
        'hostedBrowserAnswerCount',e.hosted_browser_answer_count,
        'evidenceChainComplete',e.evidence_chain_complete,
        'hostedM05cGateSatisfied',e.hosted_m05c_gate_satisfied,
        'blockers',e.blockers
      )
      order by e.created_at,e.recommendation_id
    )
    from evaluated e
  ),'[]'::jsonb),
  'interpretation',pg_catalog.jsonb_build_object(
    'scope','acceptance-integrity-not-learning-quality',
    'memoryRatingOptional',true,
    'masteryInferenceAuthority',false,
    'schedulerPolicyPromotionAuthority',false
  )
)
from summary s
left join latest l on true;
$function$;

revoke all on function public.study_now_completion_integrity_v1(uuid)
  from public,anon,authenticated;
grant execute on function public.study_now_completion_integrity_v1(uuid)
  to service_role;
