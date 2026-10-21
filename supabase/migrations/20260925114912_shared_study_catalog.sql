-- One server-owned catalog shared by all API instances. Empty by default.
create table public.study_catalog (
  id smallint primary key check (id = 1),
  version bigint not null default 0 check (version >= 0),
  body jsonb not null check (
    jsonb_typeof(body) = 'object'
    and body->>'schemaVersion' = '1'
    and jsonb_typeof(body->'concepts') = 'array'
    and jsonb_typeof(body->'sources') = 'array'
    and jsonb_typeof(body->'questions') = 'array'
  ),
  updated_at timestamptz not null default now()
);
alter table public.study_catalog enable row level security;
revoke all on public.study_catalog from public, anon, authenticated;
grant select, update on public.study_catalog to service_role;
insert into public.study_catalog (id, version, body)
  values (1, 0, '{"schemaVersion":1,"concepts":[],"sources":[],"questions":[]}'::jsonb);

-- The importer checks content history and review state before this CAS write.
-- An outdated writer cannot silently overwrite a newer catalog.
create function public.study_import_catalog(p_expected bigint, p_body jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_version bigint;
begin
  if pg_catalog.jsonb_typeof(p_body) is distinct from 'object'
    or p_body->>'schemaVersion' is distinct from '1'
    or pg_catalog.jsonb_typeof(p_body->'concepts') is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_body->'sources') is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_body->'questions') is distinct from 'array' then
    return '{"error":"invalid_catalog"}'::jsonb;
  end if;
  update public.study_catalog set body = p_body, version = version + 1,
    updated_at = now() where id = 1 and version = p_expected
    returning version into v_version;
  if not found then return '{"error":"stale_catalog"}'::jsonb; end if;
  return pg_catalog.jsonb_build_object('version', v_version);
end;
$$;
revoke execute on function public.study_import_catalog(bigint,jsonb)
  from public, anon, authenticated;
grant execute on function public.study_import_catalog(bigint,jsonb) to service_role;
