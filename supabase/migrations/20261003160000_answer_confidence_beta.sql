-- Beta answer-confidence experiment.
-- Confidence is explicit learner self-report only. It does not alter scoring,
-- revision, recommendations, mastery, or Digital Twin inference.

create table if not exists public.study_answer_confidence_events (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null,
  attempt_id uuid not null unique,
  question_version_id text not null,
  confidence text not null check (confidence in ('guess','unsure','fairly_sure','certain')),
  scale_id text not null default 'answer-confidence-4-v1'
    check (scale_id='answer-confidence-4-v1'),
  prompt_id text not null default 'pre-answer-confidence-v1'
    check (prompt_id='pre-answer-confidence-v1'),
  recorded_at timestamptz not null default now(),
  constraint study_answer_confidence_attempt_fkey
    foreign key (attempt_id) references public.study_attempts(id)
);

create index if not exists study_answer_confidence_learner_recorded
  on public.study_answer_confidence_events(learner_id,recorded_at,id);

alter table public.study_answer_confidence_events enable row level security;

drop policy if exists study_answer_confidence_read_own
  on public.study_answer_confidence_events;
create policy study_answer_confidence_read_own
  on public.study_answer_confidence_events
  for select
  to authenticated
  using ((select auth.uid())=learner_id);

revoke all on table public.study_answer_confidence_events
  from public,anon,authenticated;
grant select on table public.study_answer_confidence_events
  to authenticated;
grant all on table public.study_answer_confidence_events
  to service_role;

drop trigger if exists study_answer_confidence_events_no_update_delete
  on public.study_answer_confidence_events;
create trigger study_answer_confidence_events_no_update_delete
before update or delete on public.study_answer_confidence_events
for each row execute function public.prevent_learner_evidence_mutation();

insert into public.owner_feature_flags(
  feature_key,audience,description,mapped_surface,updated_by
)
values(
  'answer_confidence_capture',
  'beta',
  'Experimental pre-answer confidence capture. Stores explicit learner self-report only and has no scoring, scheduling, mastery, or publication authority.',
  'learner-experiment-api:/status + /confidence',
  null
)
on conflict(feature_key) do nothing;

create or replace function public.study_record_answer_confidence_v1(
  p_learner uuid,
  p_session uuid,
  p_confidence text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_session public.study_sessions%rowtype;
  v_attempt public.study_attempts%rowtype;
  v_existing public.study_answer_confidence_events%rowtype;
  v_row public.study_answer_confidence_events%rowtype;
begin
  if p_learner is null or p_session is null then
    raise exception using errcode='22023',message='answer_confidence_identity_required';
  end if;
  if p_confidence is null or p_confidence not in ('guess','unsure','fairly_sure','certain') then
    raise exception using errcode='22023',message='answer_confidence_invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('answer-confidence:'||p_learner::text||':'||p_session::text,0)
  );

  select * into v_session
  from public.study_sessions
  where id=p_session
    and learner_id=p_learner;

  if not found then
    return pg_catalog.jsonb_build_object('error','session_not_found');
  end if;

  select * into v_attempt
  from public.study_attempts
  where learner_id=p_learner
    and session_id=p_session
    and position=v_session.position
  order by recorded_at desc,id desc
  limit 1;

  if not found then
    return pg_catalog.jsonb_build_object('error','accepted_attempt_not_found');
  end if;

  select * into v_existing
  from public.study_answer_confidence_events
  where attempt_id=v_attempt.id;

  if found then
    if v_existing.learner_id<>p_learner or v_existing.confidence<>p_confidence then
      return pg_catalog.jsonb_build_object('error','conflicting_answer_confidence');
    end if;
    v_row:=v_existing;
  else
    insert into public.study_answer_confidence_events(
      learner_id,attempt_id,question_version_id,confidence
    ) values(
      p_learner,
      v_attempt.id,
      v_attempt.event->>'questionVersionId',
      p_confidence
    )
    returning * into v_row;
  end if;

  return pg_catalog.jsonb_build_object(
    'schemaVersion',1,
    'type','confidence.recorded',
    'id',v_row.id,
    'attemptId',v_row.attempt_id,
    'questionVersionId',v_row.question_version_id,
    'confidence',v_row.confidence,
    'scaleId',v_row.scale_id,
    'promptId',v_row.prompt_id,
    'recordedAt',v_row.recorded_at,
    'inferenceAuthority',false,
    'scoringAuthority',false,
    'recommendationAuthority',false
  );
end;
$function$;

revoke all on function public.study_record_answer_confidence_v1(uuid,uuid,text)
  from public,anon,authenticated;
grant execute on function public.study_record_answer_confidence_v1(uuid,uuid,text)
  to service_role;

-- Privacy scope v9: confidence self-report is learner-scoped and must erase with
-- the accepted attempt it references.
alter table public.learner_privacy_erasure_receipts
  alter column scope_version set default 9;

alter table public.learner_privacy_erasure_receipts
  drop constraint if exists learner_privacy_erasure_receipts_scope_version_check;

alter table public.learner_privacy_erasure_receipts
  add constraint learner_privacy_erasure_receipts_scope_version_check
  check (scope_version in (1,2,3,4,5,6,7,8,9));

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
  select c.table_name
  from information_schema.columns c
  where c.table_schema='public'
    and c.column_name='learner_id'
  group by c.table_name
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
  'contractId','learner-privacy-scope-v9',
  'scopeVersion',9,
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

create or replace function public.privacy_learner_erasure_preview(
  p_learner uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $function$
declare
  v_scope jsonb;
  v_counts jsonb;
  v_total integer;
begin
  if p_learner is null then
    raise exception using errcode='22023',message='privacy_learner_required';
  end if;

  v_scope:=public.privacy_learner_scope_status();
  if coalesce((v_scope->>'complete')::boolean,false) is not true then
    raise exception using errcode='55000',message='privacy_scope_requires_update',detail=v_scope::text;
  end if;

  v_counts:=pg_catalog.jsonb_build_object(
    'exam_run_events',(select count(*) from public.exam_run_events where learner_id=p_learner),
    'exam_run_receipts',(select count(*) from public.exam_run_receipts where learner_id=p_learner),
    'exam_runs',(select count(*) from public.exam_runs where learner_id=p_learner),
    'learner_content_issue_reports',(select count(*) from public.learner_content_issue_reports where learner_id=p_learner),
    'neural_personal_annotations',(select count(*) from public.neural_personal_annotations where learner_id=p_learner),
    'study_answer_confidence_events',(select count(*) from public.study_answer_confidence_events where learner_id=p_learner),
    'study_attempts',(select count(*) from public.study_attempts where learner_id=p_learner),
    'study_bookmarks',(select count(*) from public.study_bookmarks where learner_id=p_learner),
    'study_memory_judgments',(select count(*) from public.study_memory_judgments where learner_id=p_learner),
    'study_policy_experiment_assignments',(select count(*) from public.study_policy_experiment_assignments where learner_id=p_learner),
    'study_recommendation_events',(select count(*) from public.study_recommendation_events where learner_id=p_learner),
    'study_recommendation_transport_events',(select count(*) from public.study_recommendation_transport_events where learner_id=p_learner),
    'study_retention_probe_assignments',(select count(*) from public.study_retention_probe_assignments where learner_id=p_learner),
    'study_retention_probe_client_events',(select count(*) from public.study_retention_probe_client_events where learner_id=p_learner),
    'study_retention_probe_response_bindings',(select count(*) from public.study_retention_probe_response_bindings where learner_id=p_learner),
    'study_retention_probe_served_events',(select count(*) from public.study_retention_probe_served_events where learner_id=p_learner),
    'study_retention_probe_consent_events',(select count(*) from public.study_retention_probe_consent_events where learner_id=p_learner),
    'study_revision_state',(select count(*) from public.study_revision_state where learner_id=p_learner),
    'study_schedule_decision_events',(select count(*) from public.study_schedule_decision_events where learner_id=p_learner),
    'study_sessions',(select count(*) from public.study_sessions where learner_id=p_learner),
    'study_visual_interaction_events',(select count(*) from public.study_visual_interaction_events where learner_id=p_learner)
  );

  select coalesce(sum(value::integer),0)
  into v_total
  from pg_catalog.jsonb_each_text(v_counts);

  return pg_catalog.jsonb_build_object(
    'contractId','learner-erasure-preview-v1',
    'scopeVersion',9,
    'authUserPresent',exists(select 1 from auth.users where id=p_learner),
    'rowsInScope',v_total,
    'counts',v_counts,
    'scope',v_scope
  );
end;
$function$;

revoke all on function public.privacy_learner_erasure_preview(uuid)
  from public,anon,authenticated;
grant execute on function public.privacy_learner_erasure_preview(uuid)
  to service_role;

create or replace function public.privacy_erase_learner_data(
  p_learner uuid,
  p_confirmation text,
  p_reason_class text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_scope jsonb;
  v_counts jsonb:='{}'::jsonb;
  v_count integer;
  v_total integer:=0;
  v_receipt public.learner_privacy_erasure_receipts%rowtype;
begin
  if p_learner is null then
    raise exception using errcode='22023',message='privacy_learner_required';
  end if;
  if p_confirmation is distinct from p_learner::text then
    raise exception using errcode='22023',message='privacy_confirmation_mismatch';
  end if;
  if p_reason_class is null
     or p_reason_class not in ('user_request','account_closure','legal_requirement','test_cleanup') then
    raise exception using errcode='22023',message='privacy_reason_invalid';
  end if;

  v_scope:=public.privacy_learner_scope_status();
  if coalesce((v_scope->>'complete')::boolean,false) is not true then
    raise exception using errcode='55000',message='privacy_scope_requires_update',detail=v_scope::text;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('privacy:'||p_learner::text,0));
  perform pg_catalog.set_config('mlos.privacy_erasure','learner-erasure-v1',true);

  delete from public.learner_content_issue_reports where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('learner_content_issue_reports',v_count); v_total:=v_total+v_count;

  delete from public.study_visual_interaction_events where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('study_visual_interaction_events',v_count); v_total:=v_total+v_count;

  delete from public.study_answer_confidence_events where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('study_answer_confidence_events',v_count); v_total:=v_total+v_count;

  delete from public.study_memory_judgments where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('study_memory_judgments',v_count); v_total:=v_total+v_count;

  delete from public.study_schedule_decision_events where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('study_schedule_decision_events',v_count); v_total:=v_total+v_count;

  delete from public.study_policy_experiment_assignments where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('study_policy_experiment_assignments',v_count); v_total:=v_total+v_count;

  delete from public.study_recommendation_transport_events where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('study_recommendation_transport_events',v_count); v_total:=v_total+v_count;

  delete from public.study_recommendation_events where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('study_recommendation_events',v_count); v_total:=v_total+v_count;

  delete from public.study_retention_probe_response_bindings where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('study_retention_probe_response_bindings',v_count); v_total:=v_total+v_count;

  delete from public.study_retention_probe_client_events where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('study_retention_probe_client_events',v_count); v_total:=v_total+v_count;

  delete from public.study_retention_probe_served_events where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('study_retention_probe_served_events',v_count); v_total:=v_total+v_count;

  delete from public.study_retention_probe_assignments where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('study_retention_probe_assignments',v_count); v_total:=v_total+v_count;

  delete from public.study_retention_probe_consent_events where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('study_retention_probe_consent_events',v_count); v_total:=v_total+v_count;

  delete from public.study_revision_state where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('study_revision_state',v_count); v_total:=v_total+v_count;

  delete from public.study_bookmarks where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('study_bookmarks',v_count); v_total:=v_total+v_count;

  delete from public.neural_personal_annotations where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('neural_personal_annotations',v_count); v_total:=v_total+v_count;

  delete from public.exam_run_receipts where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('exam_run_receipts',v_count); v_total:=v_total+v_count;

  delete from public.exam_run_events where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('exam_run_events',v_count); v_total:=v_total+v_count;

  delete from public.exam_runs where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('exam_runs',v_count); v_total:=v_total+v_count;

  delete from public.study_attempts where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('study_attempts',v_count); v_total:=v_total+v_count;

  delete from public.study_sessions where learner_id=p_learner;
  get diagnostics v_count=row_count;
  v_counts:=v_counts||pg_catalog.jsonb_build_object('study_sessions',v_count); v_total:=v_total+v_count;

  perform pg_catalog.set_config('mlos.privacy_erasure','off',true);

  if exists(
    select 1 from public.exam_run_events where learner_id=p_learner
    union all select 1 from public.exam_run_receipts where learner_id=p_learner
    union all select 1 from public.exam_runs where learner_id=p_learner
    union all select 1 from public.learner_content_issue_reports where learner_id=p_learner
    union all select 1 from public.neural_personal_annotations where learner_id=p_learner
    union all select 1 from public.study_answer_confidence_events where learner_id=p_learner
    union all select 1 from public.study_attempts where learner_id=p_learner
    union all select 1 from public.study_bookmarks where learner_id=p_learner
    union all select 1 from public.study_memory_judgments where learner_id=p_learner
    union all select 1 from public.study_policy_experiment_assignments where learner_id=p_learner
    union all select 1 from public.study_recommendation_events where learner_id=p_learner
    union all select 1 from public.study_recommendation_transport_events where learner_id=p_learner
    union all select 1 from public.study_retention_probe_assignments where learner_id=p_learner
    union all select 1 from public.study_retention_probe_client_events where learner_id=p_learner
    union all select 1 from public.study_retention_probe_response_bindings where learner_id=p_learner
    union all select 1 from public.study_retention_probe_served_events where learner_id=p_learner
    union all select 1 from public.study_retention_probe_consent_events where learner_id=p_learner
    union all select 1 from public.study_revision_state where learner_id=p_learner
    union all select 1 from public.study_schedule_decision_events where learner_id=p_learner
    union all select 1 from public.study_sessions where learner_id=p_learner
    union all select 1 from public.study_visual_interaction_events where learner_id=p_learner
  ) then
    raise exception using errcode='55000',message='privacy_erasure_incomplete';
  end if;

  insert into public.learner_privacy_erasure_receipts(reason_class,rows_deleted)
  values(p_reason_class,v_total)
  returning * into v_receipt;

  return pg_catalog.jsonb_build_object(
    'contractId',v_receipt.contract_id,
    'scopeVersion',v_receipt.scope_version,
    'erasureId',v_receipt.erasure_id,
    'reasonClass',v_receipt.reason_class,
    'rowsDeleted',v_receipt.rows_deleted,
    'completedAt',v_receipt.completed_at,
    'counts',v_counts,
    'authUserDeletionIncluded',false,
    'authSessionRevocationIncluded',false
  );
exception
  when others then
    perform pg_catalog.set_config('mlos.privacy_erasure','off',true);
    raise;
end;
$function$;

revoke all on function public.privacy_erase_learner_data(uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.privacy_erase_learner_data(uuid,text,text)
  to service_role;
