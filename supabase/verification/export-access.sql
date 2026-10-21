-- Read-only Supabase application-access export. Output is private backup SQL.
set search_path = pg_catalog;
with objects as (
 select 'SCHEMA' as kind, quote_ident(n.nspname) as identity,n.nspowner as owner,
        coalesce(n.nspacl,acldefault('n',n.nspowner)) as acl,'ALTER SCHEMA' as alter_kind
 from pg_namespace n where n.nspname='public'
 union all
 select case when c.relkind='S' then 'SEQUENCE' else 'TABLE' end,
        format('%I.%I',n.nspname,c.relname),c.relowner,
        coalesce(c.relacl,acldefault(case when c.relkind='S' then 's'::"char" else 'r'::"char" end,c.relowner)),
        case c.relkind when 'S' then 'ALTER SEQUENCE' when 'v' then 'ALTER VIEW' when 'm' then 'ALTER MATERIALIZED VIEW' else 'ALTER TABLE' end
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in ('r','p','S','v','m','f')
 union all
 select case when p.prokind='p' then 'PROCEDURE' else 'FUNCTION' end,p.oid::regprocedure::text,p.proowner,
        coalesce(p.proacl,acldefault('f',p.proowner)),case when p.prokind='p' then 'ALTER PROCEDURE' else 'ALTER FUNCTION' end
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
), owners as (
 select 20 as section,format('%s %s OWNER TO %I;',o.alter_kind,o.identity,r.rolname) as stmt
 from objects o join pg_roles r on r.oid=o.owner
), grants as (
 select 30 as section,format('GRANT %s ON %s %s TO %s%s;',a.privilege_type,o.kind,o.identity,
        case when a.grantee=0 then 'PUBLIC' else quote_ident(r.rolname) end,
        case when a.is_grantable then ' WITH GRANT OPTION' else '' end) as stmt
 from objects o cross join lateral aclexplode(o.acl) a left join pg_roles r on r.oid=a.grantee
), columns as (
 select 40 as section,format('GRANT %s (%I) ON TABLE %I.%I TO %s%s;',a.privilege_type,at.attname,n.nspname,c.relname,
        case when a.grantee=0 then 'PUBLIC' else quote_ident(r.rolname) end,
        case when a.is_grantable then ' WITH GRANT OPTION' else '' end) as stmt
 from pg_attribute at join pg_class c on c.oid=at.attrelid join pg_namespace n on n.oid=c.relnamespace
 cross join lateral aclexplode(at.attacl) a left join pg_roles r on r.oid=a.grantee
 where n.nspname='public' and at.attnum>0 and not at.attisdropped
), defaults as (
 select 50 as section,format('ALTER DEFAULT PRIVILEGES FOR ROLE %I%s GRANT %s ON %s TO %s%s;',owner.rolname,
        case when d.defaclnamespace=0 then '' else format(' IN SCHEMA %I',n.nspname) end,a.privilege_type,
        case d.defaclobjtype when 'r' then 'TABLES' when 'S' then 'SEQUENCES' when 'f' then 'FUNCTIONS' when 'T' then 'TYPES' when 'n' then 'SCHEMAS' end,
        case when a.grantee=0 then 'PUBLIC' else quote_ident(grantee.rolname) end,
        case when a.is_grantable then ' WITH GRANT OPTION' else '' end) as stmt
 from pg_default_acl d join pg_roles owner on owner.oid=d.defaclrole left join pg_namespace n on n.oid=d.defaclnamespace
 cross join lateral aclexplode(d.defaclacl) a left join pg_roles grantee on grantee.oid=a.grantee
 where d.defaclnamespace=0 or n.nspname='public'
), statements as (select * from owners union all select * from grants union all select * from columns union all select * from defaults)
select $reset$-- mlos-public-access-v1
-- Run only after schema/data restoration in the disconnected disposable target.
DO $mlos_reset$
DECLARE r record; g text;
BEGIN
 FOR r IN select 'PUBLIC' as target union all select quote_ident(rolname) from pg_roles LOOP
  g:=r.target;
  execute 'REVOKE ALL ON SCHEMA public FROM '||g||' CASCADE';
  execute 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM '||g||' CASCADE';
  execute 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM '||g||' CASCADE';
  execute 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM '||g||' CASCADE';
  execute 'REVOKE ALL ON ALL PROCEDURES IN SCHEMA public FROM '||g||' CASCADE';
 END LOOP;
 FOR r IN select format('REVOKE %s (%I) ON TABLE %I.%I FROM %s CASCADE',a.privilege_type,at.attname,n.nspname,c.relname,
   case when a.grantee=0 then 'PUBLIC' else quote_ident(pr.rolname) end) as stmt
   from pg_attribute at join pg_class c on c.oid=at.attrelid join pg_namespace n on n.oid=c.relnamespace
   cross join lateral aclexplode(at.attacl) a left join pg_roles pr on pr.oid=a.grantee
   where n.nspname='public' and at.attnum>0 and not at.attisdropped LOOP
  execute r.stmt;
 END LOOP;
 FOR r IN select format('ALTER DEFAULT PRIVILEGES FOR ROLE %I%s REVOKE ALL ON %s FROM %s CASCADE',owner.rolname,
   case when d.defaclnamespace=0 then '' else format(' IN SCHEMA %I',n.nspname) end,
   case d.defaclobjtype when 'r' then 'TABLES' when 'S' then 'SEQUENCES' when 'f' then 'FUNCTIONS' when 'T' then 'TYPES' when 'n' then 'SCHEMAS' end,
   case when a.grantee=0 then 'PUBLIC' else quote_ident(grantee.rolname) end) as stmt
   from pg_default_acl d join pg_roles owner on owner.oid=d.defaclrole left join pg_namespace n on n.oid=d.defaclnamespace
   cross join lateral aclexplode(d.defaclacl) a left join pg_roles grantee on grantee.oid=a.grantee
   where d.defaclnamespace=0 or n.nspname='public' LOOP
  execute r.stmt;
 END LOOP;
END $mlos_reset$;
$reset$ || string_agg(stmt,E'\n' order by section,stmt collate "C") || E'\n' as access_sql from statements;
