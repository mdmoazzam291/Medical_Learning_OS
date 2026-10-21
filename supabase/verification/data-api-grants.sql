-- Read-only catalog audit. Run as the database owner; no learner rows read.
do $audit$
declare
  violations text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into violations
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity;
  if violations is not null then
    raise exception 'data_api_rls_required: %', violations;
  end if;

  select string_agg(c.relname, ', ' order by c.relname) into violations
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p')
    and not has_table_privilege('service_role',c.oid,'SELECT');
  if violations is not null then
    raise exception 'missing_service_read_grant: %', violations;
  end if;

  select string_agg(c.relname, ', ' order by c.relname) into violations
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p') and (
    has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE')
    or has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE')
    or (has_table_privilege('authenticated',c.oid,'SELECT') and c.relname not in (
      'study_sessions','study_attempts','study_bookmarks','study_revision_state',
      'study_recommendation_events','study_memory_judgments','study_answer_confidence_events'
    ))
  );
  if violations is not null then
    raise exception 'unexpected_browser_table_grant: %', violations;
  end if;
end
$audit$;
