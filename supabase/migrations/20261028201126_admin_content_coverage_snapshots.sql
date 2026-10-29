-- Rebuildable Admin inventory metadata only; no canonical/learner records are changed.
create table public.owner_content_coverage_snapshots (
 snapshot_id uuid primary key default gen_random_uuid(),
 actor_id uuid not null, registry_version text not null,
 created_at timestamptz not null default now(), expires_at timestamptz not null,
 payload jsonb not null check (pg_column_size(payload) <= 8000000)
);
create index owner_content_coverage_snapshot_expiry on public.owner_content_coverage_snapshots(expires_at);
alter table public.owner_content_coverage_snapshots enable row level security;
revoke all on public.owner_content_coverage_snapshots from public,anon,authenticated,service_role;
grant select,insert,delete on public.owner_content_coverage_snapshots to service_role;

create function public.owner_content_coverage_snapshot_v1(p_actor uuid,p_snapshot_id uuid default null,p_registry_version text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_body jsonb; v_id uuid; v_now timestamptz:=clock_timestamp(); v_expires timestamptz;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required'; end if;
 if p_registry_version is null or char_length(p_registry_version) not between 1 and 240 then raise exception 'coverage_snapshot_unavailable'; end if;
 if p_snapshot_id is not null then
  select payload into v_body from public.owner_content_coverage_snapshots
  where snapshot_id=p_snapshot_id and actor_id=p_actor and registry_version=p_registry_version and expires_at>v_now;
  if v_body is null then raise exception 'coverage_snapshot_expired'; end if;
  return v_body;
 end if;
 -- All authoritative source tables are read by this ONE statement, under one MVCC snapshot.
 select jsonb_build_object(
  'catalogVersion',c.version,
  'concepts',coalesce((select jsonb_agg(jsonb_build_object(
   'conceptId',x->>'conceptId','label',x->>'label','aliases',coalesce(x->'aliases','[]'::jsonb),
   'classification',coalesce(m.classification,jsonb_build_object('subjects',coalesce(x->'subjectTags','[]'::jsonb),'systems','[]'::jsonb,'organs','[]'::jsonb,'domains','[]'::jsonb,'tasks','[]'::jsonb))))
   from jsonb_array_elements(c.body->'concepts') x left join public.content_library_concept_metadata m on m.concept_id=x->>'conceptId'),'[]'::jsonb),
  'questions',coalesce((select jsonb_agg(jsonb_build_object(
   'questionId',q->>'questionId','questionVersionId',q->>'questionVersionId','version',q->'version','status',q->>'status',
   'conceptLinks',coalesce(q->'conceptLinks','[]'::jsonb)||case when m.concept_links_version_id=q->>'questionVersionId' then coalesce((select jsonb_agg(l) from jsonb_array_elements(m.concept_links) l where l->>'role'<>'primary'),'[]'::jsonb) else '[]'::jsonb end,
   'origins',coalesce((select jsonb_agg(case when o->>'kind'='pyq' then jsonb_build_object('kind','pyq','examId',o->>'examId','year',o->'year','session',o->>'session') else jsonb_build_object('kind','platform','platformId',o->>'platformId') end) from jsonb_array_elements(m.origins) o),'[]'::jsonb)||case when q->'provenance'->>'kind' in ('licensed_pyq','recalled_pyq') and not exists (
    select 1 from jsonb_array_elements(coalesce(m.origins,'[]'::jsonb)) o
    where o->>'kind'='pyq' and o->>'examId'=trim(both '-' from regexp_replace(lower(q->'provenance'->>'exam'),'[^a-z0-9]+','-','g')) and o->'year'=q->'provenance'->'year'
   ) then jsonb_build_array(jsonb_build_object('kind','pyq','examId',trim(both '-' from regexp_replace(lower(q->'provenance'->>'exam'),'[^a-z0-9]+','-','g')),'year',q->'provenance'->'year','session','unspecified')) else '[]'::jsonb end,
   'classification',coalesce(m.classification,jsonb_build_object('subjects','[]'::jsonb,'systems','[]'::jsonb,'organs','[]'::jsonb,'domains','[]'::jsonb,'tasks','[]'::jsonb))))
   from jsonb_array_elements(c.body->'questions') q left join public.content_library_question_metadata m on m.question_id=q->>'questionId'),'[]'::jsonb),
  'notes',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'conceptId',n.concept_id,'status',n.status)) from public.neural_canonical_note_versions n),'[]'::jsonb),
  'links',coalesce((select jsonb_agg(jsonb_build_object('noteVersionId',l.note_version_id,'questionId',l.question_id,'relation',l.relation)) from public.content_library_note_question_links l),'[]'::jsonb),
  'candidates',coalesce((select jsonb_agg(jsonb_build_object('importId',i.import_id,'questionId',q->>'questionId','conceptIds',coalesce((select jsonb_agg(distinct l->>'conceptId') from jsonb_array_elements(q->'conceptLinks') l),'[]'::jsonb)))
   from public.content_library_imports i cross join lateral jsonb_array_elements(i.manifest->'questions') q where i.status='draft'),'[]'::jsonb)
 ) into v_body from public.study_catalog c where c.id=1;
 if v_body is null or pg_column_size(v_body)>8000000 or exists(
  select 1 from unnest(array['concepts','questions','notes','candidates','links']) k where jsonb_array_length(v_body->k)>50000
 ) then raise exception 'coverage_snapshot_unavailable'; end if;
 v_id:=gen_random_uuid(); v_expires:=v_now+interval '5 minutes';
 v_body:=v_body||jsonb_build_object('snapshotId',v_id,'asOf',v_now,'expiresAt',v_expires,'registryVersion',p_registry_version);
 delete from public.owner_content_coverage_snapshots where expires_at<=v_now;
 insert into public.owner_content_coverage_snapshots(snapshot_id,actor_id,registry_version,created_at,expires_at,payload)
 values(v_id,p_actor,p_registry_version,v_now,v_expires,v_body);
 return v_body;
end; $$;
revoke all on function public.owner_content_coverage_snapshot_v1(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.owner_content_coverage_snapshot_v1(uuid,uuid,text) to service_role;
