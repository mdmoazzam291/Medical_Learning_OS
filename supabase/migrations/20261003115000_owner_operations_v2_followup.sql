-- Follow-up alignment for Owner Operations V2.
-- Keeps singleton owner out of suspended-learner operational counts and documents audit/telemetry contracts.

create or replace function public.owner_admin_access_summary_v1()
returns jsonb
language sql
stable
security definer
set search_path=''
as $function$
  select jsonb_build_object(
    'contractId','owner-admin-access-summary-v1',
    'activeBetaLearners',(select count(*) from public.owner_learner_access_state where beta_access_until > now()),
    'suspendedLearners',(
      select count(*)
      from auth.users u
      where u.deleted_at is null
        and u.banned_until is not null
        and u.banned_until > now()
        and not exists (
          select 1
          from public.content_admin_account a
          where a.singleton=true and a.admin_user_id=u.id
        )
    ),
    'auditEvents',(select count(*) from public.owner_admin_audit_events),
    'latestAuditAt',(select max(created_at) from public.owner_admin_audit_events)
  );
$function$;

revoke all on function public.owner_admin_access_summary_v1() from public, anon, authenticated;
grant execute on function public.owner_admin_access_summary_v1() to service_role;

comment on function public.owner_admin_record_auth_action_v1(uuid,uuid,text,text,uuid,jsonb,jsonb)
is 'Records immutable owner audit evidence after a Supabase Auth suspend/restore operation. Human review grants are unaffected.';

comment on function public.owner_infrastructure_snapshots_v1()
is 'Returns owner-only provider telemetry snapshots populated from verified external observations.';
