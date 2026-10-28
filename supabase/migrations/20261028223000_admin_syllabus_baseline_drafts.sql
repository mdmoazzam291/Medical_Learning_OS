-- Admin-only immutable syllabus checklist proposals; there is no activate/approve/publish function.
create table public.content_syllabus_baseline_draft_versions (
 baseline_id uuid not null,
 revision integer not null check(revision between 1 and 10000),
 pathway_version_id text not null,
 catalog_version bigint not null,
 registry_version text not null,
 previous_digest text,
 document jsonb not null,
 digest text not null,
 submitted_by uuid not null,
 recorded_at timestamptz not null default now(),
 request_id uuid not null unique,
 request_fingerprint text not null,
 primary key(baseline_id,revision)
);
create index content_syllabus_baseline_latest on public.content_syllabus_baseline_draft_versions(baseline_id,revision desc);
alter table public.content_syllabus_baseline_draft_versions enable row level security;
revoke all on public.content_syllabus_baseline_draft_versions from public,anon,authenticated,service_role;
grant select,insert on public.content_syllabus_baseline_draft_versions to service_role;
create trigger content_syllabus_baseline_immutable before update or delete
 on public.content_syllabus_baseline_draft_versions for each row execute function public.concept_draft_immutable_v1();

create function public.syllabus_baseline_draft_save_v1(p_actor uuid,p_registry_version text,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_request uuid;v_id uuid;v_expected text;v_doc jsonb;v_digest text;
 v_fingerprint text;v_keys text[];v_revision integer;v_latest public.content_syllabus_baseline_draft_versions;
 v_saved public.content_syllabus_baseline_draft_versions;v_catalog jsonb;v_catalog_version bigint;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required';end if;
 if p_registry_version is null or char_length(p_registry_version)>160 or p_registry_version !~ '^[a-zA-Z0-9:_.@-]+$'
    or jsonb_typeof(p_input) is distinct from 'object' or pg_column_size(p_input)>200000
 then raise exception 'syllabus_baseline_invalid';end if;
 select array_agg(k order by k) into v_keys from jsonb_object_keys(p_input) k;
 if v_keys is distinct from array['baselineId','document','expectedDigest','requestId','schemaVersion']
    or p_input->'schemaVersion' is distinct from '1'::jsonb
    or jsonb_typeof(p_input->'requestId') is distinct from 'string'
    or jsonb_typeof(p_input->'baselineId') not in ('string','null')
    or jsonb_typeof(p_input->'expectedDigest') not in ('string','null')
 then raise exception 'syllabus_baseline_invalid';end if;
 begin v_request:=(p_input->>'requestId')::uuid;v_id:=(p_input->>'baselineId')::uuid;
 exception when others then raise exception 'syllabus_baseline_invalid';end;
 v_expected:=p_input->>'expectedDigest';v_doc:=p_input->'document';
 if (v_id is null)<>(v_expected is null) or (v_expected is not null and v_expected !~ '^[0-9a-f]{64}$')
    or jsonb_typeof(v_doc) is distinct from 'object'
 then raise exception 'syllabus_baseline_invalid';end if;
 select array_agg(k order by k) into v_keys from jsonb_object_keys(v_doc) k;
 if v_keys is distinct from array['changeReason','conceptIds','label','pathwayVersionId','scopeDeclaration','sourceKind','sourceLocator','sourceVersion']
    or jsonb_typeof(v_doc->'label') is distinct from 'string'
    or char_length(btrim(v_doc->>'label')) not between 1 and 240
    or jsonb_typeof(v_doc->'pathwayVersionId') is distinct from 'string'
    or (v_doc->>'pathwayVersionId') !~ '^[a-zA-Z0-9:_.@-]{1,160}$'
    or v_doc->>'sourceKind' not in ('official','expert','historical')
    or v_doc->>'scopeDeclaration' not in ('partial','complete-proposed')
    or jsonb_typeof(v_doc->'sourceLocator') is distinct from 'string'
    or char_length(btrim(v_doc->>'sourceLocator')) not between 8 and 2000
    or jsonb_typeof(v_doc->'sourceVersion') is distinct from 'string'
    or char_length(btrim(v_doc->>'sourceVersion')) not between 1 and 240
    or jsonb_typeof(v_doc->'changeReason') is distinct from 'string'
    or char_length(btrim(v_doc->>'changeReason')) not between 8 and 2000
    or jsonb_typeof(v_doc->'conceptIds') is distinct from 'array'
    or jsonb_array_length(v_doc->'conceptIds')>2000
    or exists(select 1 from jsonb_array_elements(v_doc->'conceptIds') c where jsonb_typeof(c.value)<>'string' or c.value#>>'{}' !~ '^[a-zA-Z0-9:_.@-]{1,160}$')
    or exists(select 1 from jsonb_array_elements_text(v_doc->'conceptIds') cid group by cid having count(*)>1)
 then raise exception 'syllabus_baseline_invalid';end if;
 v_fingerprint:=encode(extensions.digest(convert_to(p_input::text,'UTF8'),'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('syllabus-baseline-request:'||v_request::text,0));
 select * into v_saved from public.content_syllabus_baseline_draft_versions where request_id=v_request;
 if found then
  if v_saved.submitted_by<>p_actor or v_saved.request_fingerprint<>v_fingerprint
     or v_saved.registry_version<>p_registry_version then raise exception 'syllabus_baseline_request_conflict';end if;
 else
  if v_id is null then v_id:=gen_random_uuid();v_revision:=1;
  else
   perform pg_advisory_xact_lock(hashtextextended('syllabus-baseline:'||v_id::text,0));
   select * into v_latest from public.content_syllabus_baseline_draft_versions where baseline_id=v_id order by revision desc limit 1;
   if not found then raise exception 'syllabus_baseline_not_found';end if;
   if v_latest.digest is distinct from v_expected or v_latest.pathway_version_id is distinct from v_doc->>'pathwayVersionId'
      or v_latest.registry_version is distinct from p_registry_version
   then raise exception 'syllabus_baseline_stale';end if;
   v_revision:=v_latest.revision+1;
   if v_revision>10000 then raise exception 'syllabus_baseline_invalid';end if;
  end if;
  select body,version into v_catalog,v_catalog_version from public.study_catalog where id=1;
  if v_catalog is null or jsonb_typeof(v_catalog->'concepts') is distinct from 'array'
   or jsonb_array_length(v_catalog->'concepts')>50000 then raise exception 'syllabus_baseline_catalog_unavailable';end if;
  if exists(
   select 1 from jsonb_array_elements_text(v_doc->'conceptIds') as requested(value)
    where not exists(select 1 from jsonb_array_elements(v_catalog->'concepts') c where c->>'conceptId'=requested.value)
  ) then raise exception 'syllabus_baseline_unknown_concept';end if;
  v_digest:=encode(extensions.digest(convert_to(jsonb_build_object('baselineId',v_id,'revision',v_revision,
   'previous',v_expected,'catalogVersion',v_catalog_version,'registryVersion',p_registry_version,'document',v_doc)::text,'UTF8'),'sha256'),'hex');
  insert into public.content_syllabus_baseline_draft_versions(baseline_id,revision,pathway_version_id,catalog_version,
   registry_version,previous_digest,document,digest,submitted_by,request_id,request_fingerprint)
  values(v_id,v_revision,v_doc->>'pathwayVersionId',v_catalog_version,p_registry_version,
   v_expected,v_doc,v_digest,p_actor,v_request,v_fingerprint) returning * into v_saved;
 end if;
 return jsonb_build_object('baselineId',v_saved.baseline_id,'revision',v_saved.revision,'digest',v_saved.digest,
  'catalogVersion',v_saved.catalog_version,'registryVersion',v_saved.registry_version,'recordedAt',v_saved.recorded_at,
  'status','draft');
end; $$;
revoke all on function public.syllabus_baseline_draft_save_v1(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.syllabus_baseline_draft_save_v1(uuid,text,jsonb) to service_role;

create function public.syllabus_baseline_draft_inspect_v1(p_actor uuid,p_baseline_id uuid default null,p_revision integer default null,p_offset integer default 0)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_row public.content_syllabus_baseline_draft_versions;v_history jsonb;v_list jsonb;v_total integer;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required';end if;
 if p_offset not between 0 and 50000 or (p_revision is not null and p_revision not between 1 and 10000)
    or (p_baseline_id is null and p_revision is not null) then raise exception 'syllabus_baseline_invalid';end if;
 if p_baseline_id is not null then
  select * into v_row from public.content_syllabus_baseline_draft_versions where baseline_id=p_baseline_id
   and (p_revision is null or revision=p_revision) order by revision desc limit 1;
  if not found then raise exception 'syllabus_baseline_not_found';end if;
  select coalesce(jsonb_agg(jsonb_build_object('revision',revision,'digest',digest,'recordedAt',recorded_at) order by revision desc),'[]'::jsonb)
   into v_history from (select revision,digest,recorded_at from public.content_syllabus_baseline_draft_versions
    where baseline_id=p_baseline_id order by revision desc limit 50) recent;
  return jsonb_build_object('contractId','admin-syllabus-baseline-drafts-v1','status','draft','version',
   jsonb_build_object('baselineId',v_row.baseline_id,'revision',v_row.revision,'digest',v_row.digest,
    'previousDigest',v_row.previous_digest,'catalogVersion',v_row.catalog_version,'registryVersion',v_row.registry_version,
    'document',v_row.document,'recordedAt',v_row.recorded_at),
   'isLatest',(select max(revision)=v_row.revision from public.content_syllabus_baseline_draft_versions where baseline_id=p_baseline_id),
   'history',v_history);
 end if;
 select count(distinct baseline_id) into v_total from public.content_syllabus_baseline_draft_versions;
 select coalesce(jsonb_agg(jsonb_build_object('baselineId',baseline_id,'revision',revision,'digest',digest,
   'catalogVersion',catalog_version,'registryVersion',registry_version,'pathwayVersionId',pathway_version_id,
   'label',document->>'label','scopeDeclaration',document->>'scopeDeclaration','conceptCount',jsonb_array_length(document->'conceptIds'),
   'recordedAt',recorded_at) order by recorded_at desc,baseline_id),'[]'::jsonb)
 into v_list from (select * from (select distinct on(baseline_id) * from public.content_syllabus_baseline_draft_versions
    order by baseline_id,revision desc) current_rows order by recorded_at desc,baseline_id offset p_offset limit 50) page;
 return jsonb_build_object('contractId','admin-syllabus-baseline-drafts-v1','baselines',v_list,
  'status','draft-only','total',v_total,'offset',p_offset,'nextOffset',case when p_offset+50<v_total then p_offset+50 else null end);
end; $$;
revoke all on function public.syllabus_baseline_draft_inspect_v1(uuid,uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.syllabus_baseline_draft_inspect_v1(uuid,uuid,integer,integer) to service_role;
