-- M11f4 follow-up: make the aggregate evidence/readiness projection reflect the
-- already-deployed learner delivery + browser-render acknowledgement bridge.
-- This is descriptive only. It does not activate scheduling or learning authority.

create or replace function public.study_retention_probe_evidence_readiness_v1()
returns jsonb
language sql
stable
set search_path to ''
as $function$
select pg_catalog.jsonb_build_object(
  'contractId','study-retention-probe-evidence-readiness-v1',
  'assignmentCount',(select count(*)::integer from public.study_retention_probe_assignments),
  'serverServedCount',(select count(*)::integer from public.study_retention_probe_served_events),
  'clientSessionOpenedCount',(
    select count(*)::integer
    from public.study_retention_probe_client_events
    where event_type='session_opened'
  ),
  'browserRenderedCount',(
    select count(*)::integer
    from public.study_retention_probe_client_events
    where event_type='browser_rendered'
  ),
  'responseBindingCount',(select count(*)::integer from public.study_retention_probe_response_bindings),
  'servedWithoutRenderCount',(
    select count(*)::integer
    from public.study_retention_probe_served_events s
    left join public.study_retention_probe_client_events r
      on r.served_event_id=s.served_event_id
     and r.event_type='browser_rendered'
    where r.client_event_id is null
  ),
  'servedWithoutResponseCount',(
    select count(*)::integer
    from public.study_retention_probe_served_events s
    left join public.study_retention_probe_response_bindings b
      on b.served_event_id=s.served_event_id
    where b.binding_id is null
  ),
  'deliveryEvidenceKernelAvailable',true,
  'serverServedMeansLearnerSeen',false,
  'browserRenderedMeansLearnerViewed',false,
  'learnerRouteEnabled',true,
  'renderAcknowledgementImplemented',true,
  'automaticExecutionEnabled',false,
  'studyNowAuthority',false,
  'masteryInferenceAuthority',false
);
$function$;

revoke all on function public.study_retention_probe_evidence_readiness_v1()
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_evidence_readiness_v1()
  to service_role;
