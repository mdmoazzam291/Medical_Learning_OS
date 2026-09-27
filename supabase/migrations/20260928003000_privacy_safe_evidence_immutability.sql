-- Privacy-safe append-only evidence boundary.
-- Normal operation cannot UPDATE/DELETE learner evidence.
-- A single service-only erasure transaction may DELETE learner-scoped data so
-- append-only auditability never overrides privacy rights.

create table if not exists public.learner_privacy_erasure_receipts (
  erasure_id uuid primary key default gen_random_uuid(),
  contract_id text not null default 'learner-erasure-v1'
    check (contract_id = 'learner-erasure-v1'),
  scope_version integer not null default 1
    check (scope_version = 1),
  reason_class text not null
    check (reason_class in (
      'user_request',
      'account_closure',
      'legal_requirement',
      'test_cleanup'
    )),
  rows_deleted integer not null
    check (rows_deleted >= 0),
  completed_at timestamptz not null default now()
);

alter table public.learner_privacy_erasure_receipts enable row level security;

revoke all on table public.learner_privacy_erasure_receipts
  from public, anon, authenticated, service_role;
grant select on table public.learner_privacy_erasure_receipts
  to service_role;

drop policy if exists learner_privacy_erasure_receipts_service_read
  on public.learner_privacy_erasure_receipts;
create policy learner_privacy_erasure_receipts_service_read
  on public.learner_privacy_erasure_receipts
  for select
  to service_role
  using (true);

create or replace function public.prevent_privacy_erasure_receipt_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception using
    errcode = '55000',
    message = 'privacy_erasure_receipt_is_immutable';
end;
$function$;

revoke all on function public.prevent_privacy_erasure_receipt_mutation()
  from public, anon, authenticated, service_role;

drop trigger if exists learner_privacy_erasure_receipts_no_update_delete
  on public.learner_privacy_erasure_receipts;
create trigger learner_privacy_erasure_receipts_no_update_delete
before update or delete on public.learner_privacy_erasure_receipts
for each row execute function public.prevent_privacy_erasure_receipt_mutation();

create or replace function public.privacy_learner_scope_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
with expected(table_name) as (
  values
    ('exam_run_events'),
    ('exam_run_receipts'),
    ('exam_runs'),
    ('neural_personal_annotations'),
    ('study_attempts'),
    ('study_bookmarks'),
    ('study_memory_judgments'),
    ('study_policy_experiment_assignments'),
    ('study_recommendation_events'),
    ('study_revision_state'),
    ('study_schedule_decision_events'),
    ('study_sessions')
),
actual as (
  select c.table_name
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.column_name = 'learner_id'
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
  'contractId', 'learner-privacy-scope-v1',
  'scopeVersion', 1,
  'complete',
    not exists(select 1 from missing)
    and not exists(select 1 from unmapped),
  'expectedTables', (
    select coalesce(
      pg_catalog.jsonb_agg(table_name order by table_name),
      '[]'::jsonb
    )
    from expected
  ),
  'missingTables', (
    select coalesce(
      pg_catalog.jsonb_agg(table_name order by table_name),
      '[]'::jsonb
    )
    from missing
  ),
  'unmappedLearnerTables', (
    select coalesce(
      pg_catalog.jsonb_agg(table_name order by table_name),
      '[]'::jsonb
    )
    from unmapped
  )
);
$function$;

revoke all on function public.privacy_learner_scope_status()
  from public, anon, authenticated;
grant execute on function public.privacy_learner_scope_status()
  to service_role;

create or replace function public.prevent_learner_evidence_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'DELETE'
     and coalesce(
       pg_catalog.current_setting('mlos.privacy_erasure', true),
       ''
     ) = 'learner-erasure-v1' then
    return old;
  end if;

  raise exception using
    errcode = '55000',
    message = 'learner_evidence_is_append_only';
end;
$function$;

revoke all on function public.prevent_learner_evidence_mutation()
  from public, anon, authenticated, service_role;

drop trigger if exists study_attempts_no_update_delete
  on public.study_attempts;
create trigger study_attempts_no_update_delete
before update or delete on public.study_attempts
for each row execute function public.prevent_learner_evidence_mutation();

drop trigger if exists study_memory_judgments_no_update_delete
  on public.study_memory_judgments;
create trigger study_memory_judgments_no_update_delete
before update or delete on public.study_memory_judgments
for each row execute function public.prevent_learner_evidence_mutation();

drop trigger if exists study_recommendation_events_no_update_delete
  on public.study_recommendation_events;
create trigger study_recommendation_events_no_update_delete
before update or delete on public.study_recommendation_events
for each row execute function public.prevent_learner_evidence_mutation();

drop trigger if exists study_schedule_decision_events_no_update_delete
  on public.study_schedule_decision_events;
create trigger study_schedule_decision_events_no_update_delete
before update or delete on public.study_schedule_decision_events
for each row execute function public.prevent_learner_evidence_mutation();

drop trigger if exists study_policy_experiment_assignments_no_update_delete
  on public.study_policy_experiment_assignments;
create trigger study_policy_experiment_assignments_no_update_delete
before update or delete on public.study_policy_experiment_assignments
for each row execute function public.prevent_learner_evidence_mutation();

revoke update, delete on table
  public.study_attempts,
  public.study_memory_judgments,
  public.study_recommendation_events,
  public.study_schedule_decision_events,
  public.study_policy_experiment_assignments
from service_role;

-- Preserve the existing exam-ledger guard while allowing only the same
-- transaction-scoped privacy erasure DELETE exception. UPDATE remains blocked.
create or replace function public.prevent_exam_ledger_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'DELETE'
     and coalesce(
       pg_catalog.current_setting('mlos.privacy_erasure', true),
       ''
     ) = 'learner-erasure-v1' then
    return old;
  end if;

  raise exception using
    errcode = '55000',
    message = 'exam_ledger_is_immutable';
end;
$function$;

revoke all on function public.prevent_exam_ledger_mutation()
  from public, anon, authenticated, service_role;

create or replace function public.privacy_learner_erasure_preview(
  p_learner uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_scope jsonb;
  v_counts jsonb;
  v_total integer;
begin
  if p_learner is null then
    raise exception using
      errcode = '22023',
      message = 'privacy_learner_required';
  end if;

  v_scope := public.privacy_learner_scope_status();
  if coalesce((v_scope->>'complete')::boolean, false) is not true then
    raise exception using
      errcode = '55000',
      message = 'privacy_scope_requires_update',
      detail = v_scope::text;
  end if;

  v_counts := pg_catalog.jsonb_build_object(
    'exam_run_events',
      (select count(*) from public.exam_run_events where learner_id = p_learner),
    'exam_run_receipts',
      (select count(*) from public.exam_run_receipts where learner_id = p_learner),
    'exam_runs',
      (select count(*) from public.exam_runs where learner_id = p_learner),
    'neural_personal_annotations',
      (select count(*) from public.neural_personal_annotations where learner_id = p_learner),
    'study_attempts',
      (select count(*) from public.study_attempts where learner_id = p_learner),
    'study_bookmarks',
      (select count(*) from public.study_bookmarks where learner_id = p_learner),
    'study_memory_judgments',
      (select count(*) from public.study_memory_judgments where learner_id = p_learner),
    'study_policy_experiment_assignments',
      (select count(*) from public.study_policy_experiment_assignments where learner_id = p_learner),
    'study_recommendation_events',
      (select count(*) from public.study_recommendation_events where learner_id = p_learner),
    'study_revision_state',
      (select count(*) from public.study_revision_state where learner_id = p_learner),
    'study_schedule_decision_events',
      (select count(*) from public.study_schedule_decision_events where learner_id = p_learner),
    'study_sessions',
      (select count(*) from public.study_sessions where learner_id = p_learner)
  );

  select coalesce(sum(value::integer), 0)
    into v_total
  from pg_catalog.jsonb_each_text(v_counts);

  return pg_catalog.jsonb_build_object(
    'contractId', 'learner-erasure-preview-v1',
    'scopeVersion', 1,
    'authUserPresent',
      exists(select 1 from auth.users where id = p_learner),
    'rowsInScope', v_total,
    'counts', v_counts,
    'scope', v_scope
  );
end;
$function$;

revoke all on function public.privacy_learner_erasure_preview(uuid)
  from public, anon, authenticated;
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
set search_path = ''
as $function$
declare
  v_scope jsonb;
  v_counts jsonb := '{}'::jsonb;
  v_count integer;
  v_total integer := 0;
  v_receipt public.learner_privacy_erasure_receipts%rowtype;
begin
  if p_learner is null then
    raise exception using
      errcode = '22023',
      message = 'privacy_learner_required';
  end if;

  if p_confirmation is distinct from p_learner::text then
    raise exception using
      errcode = '22023',
      message = 'privacy_confirmation_mismatch';
  end if;

  if p_reason_class is null
     or p_reason_class not in (
       'user_request',
       'account_closure',
       'legal_requirement',
       'test_cleanup'
     ) then
    raise exception using
      errcode = '22023',
      message = 'privacy_reason_invalid';
  end if;

  v_scope := public.privacy_learner_scope_status();
  if coalesce((v_scope->>'complete')::boolean, false) is not true then
    raise exception using
      errcode = '55000',
      message = 'privacy_scope_requires_update',
      detail = v_scope::text;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('privacy:' || p_learner::text, 0)
  );

  -- The bypass exists only within this transaction and only allows DELETE.
  perform pg_catalog.set_config(
    'mlos.privacy_erasure',
    'learner-erasure-v1',
    true
  );

  delete from public.study_memory_judgments
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_memory_judgments', v_count
  );
  v_total := v_total + v_count;

  delete from public.study_schedule_decision_events
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_schedule_decision_events', v_count
  );
  v_total := v_total + v_count;

  delete from public.study_policy_experiment_assignments
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_policy_experiment_assignments', v_count
  );
  v_total := v_total + v_count;

  delete from public.study_recommendation_events
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_recommendation_events', v_count
  );
  v_total := v_total + v_count;

  delete from public.study_revision_state
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_revision_state', v_count
  );
  v_total := v_total + v_count;

  delete from public.study_bookmarks
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_bookmarks', v_count
  );
  v_total := v_total + v_count;

  delete from public.neural_personal_annotations
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'neural_personal_annotations', v_count
  );
  v_total := v_total + v_count;

  delete from public.exam_run_receipts
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'exam_run_receipts', v_count
  );
  v_total := v_total + v_count;

  delete from public.exam_run_events
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'exam_run_events', v_count
  );
  v_total := v_total + v_count;

  delete from public.exam_runs
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'exam_runs', v_count
  );
  v_total := v_total + v_count;

  delete from public.study_attempts
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_attempts', v_count
  );
  v_total := v_total + v_count;

  delete from public.study_sessions
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_sessions', v_count
  );
  v_total := v_total + v_count;

  -- Close the narrow bypass before any receipt/audit work.
  perform pg_catalog.set_config(
    'mlos.privacy_erasure',
    'off',
    true
  );

  if exists (
    select 1 from public.exam_run_events where learner_id = p_learner
    union all
    select 1 from public.exam_run_receipts where learner_id = p_learner
    union all
    select 1 from public.exam_runs where learner_id = p_learner
    union all
    select 1 from public.neural_personal_annotations where learner_id = p_learner
    union all
    select 1 from public.study_attempts where learner_id = p_learner
    union all
    select 1 from public.study_bookmarks where learner_id = p_learner
    union all
    select 1 from public.study_memory_judgments where learner_id = p_learner
    union all
    select 1 from public.study_policy_experiment_assignments where learner_id = p_learner
    union all
    select 1 from public.study_recommendation_events where learner_id = p_learner
    union all
    select 1 from public.study_revision_state where learner_id = p_learner
    union all
    select 1 from public.study_schedule_decision_events where learner_id = p_learner
    union all
    select 1 from public.study_sessions where learner_id = p_learner
  ) then
    raise exception using
      errcode = '55000',
      message = 'privacy_erasure_incomplete';
  end if;

  insert into public.learner_privacy_erasure_receipts (
    reason_class,
    rows_deleted
  ) values (
    p_reason_class,
    v_total
  )
  returning * into v_receipt;

  return pg_catalog.jsonb_build_object(
    'contractId', v_receipt.contract_id,
    'scopeVersion', v_receipt.scope_version,
    'erasureId', v_receipt.erasure_id,
    'reasonClass', v_receipt.reason_class,
    'rowsDeleted', v_receipt.rows_deleted,
    'completedAt', v_receipt.completed_at,
    'counts', v_counts,
    'authUserDeletionIncluded', false,
    'authSessionRevocationIncluded', false
  );
exception
  when others then
    perform pg_catalog.set_config(
      'mlos.privacy_erasure',
      'off',
      true
    );
    raise;
end;
$function$;

revoke all on function public.privacy_erase_learner_data(
  uuid, text, text
) from public, anon, authenticated;
grant execute on function public.privacy_erase_learner_data(
  uuid, text, text
) to service_role;
