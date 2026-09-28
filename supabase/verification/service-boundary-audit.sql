\set ON_ERROR_STOP on

do $security_audit$
declare
  v_table_violations text;
  v_function_violations text;
begin
  with rls_no_policy as (
    select c.oid, n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relkind='r'
      and c.relrowsecurity
      and not exists (
        select 1
        from pg_policy p
        where p.polrelid=c.oid
      )
  ),
  exposed as (
    select table_name
    from rls_no_policy
    where has_table_privilege('anon', format('%I.%I',schema_name,table_name), 'select')
       or has_table_privilege('anon', format('%I.%I',schema_name,table_name), 'insert')
       or has_table_privilege('anon', format('%I.%I',schema_name,table_name), 'update')
       or has_table_privilege('anon', format('%I.%I',schema_name,table_name), 'delete')
       or has_table_privilege('authenticated', format('%I.%I',schema_name,table_name), 'select')
       or has_table_privilege('authenticated', format('%I.%I',schema_name,table_name), 'insert')
       or has_table_privilege('authenticated', format('%I.%I',schema_name,table_name), 'update')
       or has_table_privilege('authenticated', format('%I.%I',schema_name,table_name), 'delete')
  )
  select string_agg(table_name, ', ' order by table_name)
  into v_table_violations
  from exposed;

  if v_table_violations is not null then
    raise exception using
      errcode='42501',
      message='service_only_table_browser_grant_violation',
      detail=v_table_violations;
  end if;

  select string_agg(p.oid::regprocedure::text, ', ' order by p.oid::regprocedure::text)
  into v_function_violations
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and (
      has_function_privilege('anon', p.oid, 'execute')
      or has_function_privilege('authenticated', p.oid, 'execute')
    );

  if v_function_violations is not null then
    raise exception using
      errcode='42501',
      message='browser_executable_public_function_violation',
      detail=v_function_violations;
  end if;
end
$security_audit$;

select
  'mlos-service-boundary-v1' as contract_id,
  (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relkind='r'
      and c.relrowsecurity
      and not exists (select 1 from pg_policy p where p.polrelid=c.oid)
  ) as service_only_rls_tables,
  (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef
  ) as security_definer_functions,
  0::integer as browser_executable_public_functions;
