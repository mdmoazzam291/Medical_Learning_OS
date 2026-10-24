-- Read-only totals across all staged records, independent of the inspection list limit.
create or replace function public.admin_workflow_summary_v1(p_actor uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_content_admin(p_actor) then
    raise exception 'content_admin_required' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'contractId', 'admin-workflow-summary-v1',
    'asOf', statement_timestamp(),
    'draftImportBatches', (select count(*) from public.content_library_imports where status = 'draft'),
    'draftRelationshipAssertions', (
      select count(*) from (
        select distinct on (relationship_id) relationship_version_id
        from public.medical_relationship_versions order by relationship_id, version desc
      ) latest
      where not exists (
        select 1 from public.medical_relationship_events e
        where e.relationship_version_id = latest.relationship_version_id and e.action in ('published','retired')
      )
    )
  );
end;
$$;
revoke all on function public.admin_workflow_summary_v1(uuid) from public, anon, authenticated;
grant execute on function public.admin_workflow_summary_v1(uuid) to service_role;
