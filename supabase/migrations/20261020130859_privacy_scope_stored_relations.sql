-- Scope independent learner-data storage, not ordinary projections of it.
-- Keep the v10 table mapping and erasure contract unchanged. New stored
-- relations, including materialized copies, must still fail closed.
create or replace function public.privacy_learner_scope_status()
returns jsonb
language sql
stable
security definer
set search_path=''
as $function$
with expected(table_name) as (
  values
    ('exam_run_events'),
    ('exam_run_receipts'),
    ('exam_runs'),
    ('learner_content_issue_reports'),
    ('neural_personal_annotations'),
    ('owner_admin_audit_events'),
    ('owner_learner_access_state'),
    ('study_answer_confidence_events'),
    ('study_attempts'),
    ('study_bookmarks'),
    ('study_memory_judgments'),
    ('study_policy_experiment_assignments'),
    ('study_recommendation_events'),
    ('study_recommendation_transport_events'),
    ('study_retention_probe_assignments'),
    ('study_retention_probe_client_events'),
    ('study_retention_probe_consent_events'),
    ('study_retention_probe_response_bindings'),
    ('study_retention_probe_served_events'),
    ('study_revision_state'),
    ('study_schedule_decision_events'),
    ('study_sessions'),
    ('study_visual_interaction_events')
),
actual as (
  select c.relname::text as table_name
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  join pg_catalog.pg_attribute a on a.attrelid=c.oid
  where n.nspname='public'
    and c.relkind in ('r','p','f','m')
    and a.attname='learner_id'
    and a.attnum>0
    and not a.attisdropped
),
missing as (
  select table_name from expected
  except
  select table_name from actual
),
unmapped as (
  select table_name from actual
  except
  select table_name from expected
)
select pg_catalog.jsonb_build_object(
  'contractId','learner-privacy-scope-v10',
  'scopeVersion',10,
  'complete',
    not exists(select 1 from missing)
    and not exists(select 1 from unmapped),
  'expectedTables',(
    select coalesce(pg_catalog.jsonb_agg(table_name order by table_name),'[]'::jsonb)
    from expected
  ),
  'missingTables',(
    select coalesce(pg_catalog.jsonb_agg(table_name order by table_name),'[]'::jsonb)
    from missing
  ),
  'unmappedLearnerTables',(
    select coalesce(pg_catalog.jsonb_agg(table_name order by table_name),'[]'::jsonb)
    from unmapped
  )
);
$function$;

revoke all on function public.privacy_learner_scope_status()
  from public,anon,authenticated;
grant execute on function public.privacy_learner_scope_status()
  to service_role;
