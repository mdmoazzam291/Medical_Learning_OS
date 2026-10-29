-- Immutable metadata preparation records. No clinical or distribution authority.
create table public.owner_content_selections(
 selection_id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 actor_id uuid not null, request_body jsonb not null, digest text not null check(digest ~ '^[a-f0-9]{64}$'),
 receipt jsonb not null, created_at timestamptz not null default now()
);
alter table public.owner_content_selections enable row level security;
revoke all on public.owner_content_selections from public,anon,authenticated,service_role;
grant select on public.owner_content_selections to service_role;
create function public.owner_content_selection_immutable_v1() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'content_selection_immutable'; end; $$;
revoke all on function public.owner_content_selection_immutable_v1() from public,anon,authenticated,service_role;
create trigger owner_content_selections_immutable before update or delete on public.owner_content_selections
 for each row execute function public.owner_content_selection_immutable_v1();

create function public.owner_content_selection_items_v1(p_items jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare v_items jsonb;
begin
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'content_selection_invalid'; end if;
 if jsonb_array_length(p_items) not between 1 and 100 then raise exception 'content_selection_invalid'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) x where jsonb_typeof(x)<>'object'
  or not(x ? 'kind' and x ? 'versionId') or (x-'kind'-'versionId')<>'{}'
  or coalesce(x->>'kind','') not in ('question','note')
  or jsonb_typeof(x->'versionId') is distinct from 'string'
  or coalesce(x->>'versionId','') !~ '^[a-zA-Z0-9:_@.\-]{1,180}$'
  or (x->>'kind'='note' and x->>'versionId' !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'))
 then raise exception 'content_selection_invalid'; end if;
 if (select count(distinct (x->>'kind',x->>'versionId')) from jsonb_array_elements(p_items) x)<>jsonb_array_length(p_items)
 then raise exception 'content_selection_invalid'; end if;
 select jsonb_agg(x order by x->>'kind',x->>'versionId') into v_items from jsonb_array_elements(p_items) x;
 return v_items;
end; $$;
revoke all on function public.owner_content_selection_items_v1(jsonb) from public,anon,authenticated;
grant execute on function public.owner_content_selection_items_v1(jsonb) to service_role;

create function public.owner_content_selection_preview_v1(p_actor uuid,p_items jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare v_snapshot jsonb; v_item jsonb; v_row jsonb; v_items jsonb; v_bindings jsonb:='[]';
 v_hashes jsonb; v_kind text; v_hash text; v_payload jsonb;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required'; end if;
 v_items:=public.owner_content_selection_items_v1(p_items);
 v_snapshot:=public.owner_approved_collection_preflight_v1(p_actor);
 for v_item in select value from jsonb_array_elements(v_items) loop
  select x into v_row from jsonb_array_elements(v_snapshot->'rows') x
   where x->>'kind'=v_item->>'kind' and x->>'versionId'=v_item->>'versionId';
  if not found or (select count(*) from jsonb_array_elements(v_snapshot->'rows') x
    where x->>'kind'=v_item->>'kind' and x->>'versionId'=v_item->>'versionId')<>1 then raise exception 'content_selection_item_unavailable'; end if;
  if coalesce(v_row->>'status','') not in ('verified','published') or (v_row->>'sourceCount')::int<1
   or v_row->'rightsCurrent' is distinct from 'true'::jsonb or (v_row->>'openIssues')::int<>0
   or v_row->'gates' is distinct from '{"medical":"current","references":"current","rights":"current"}'::jsonb
   then raise exception 'content_selection_item_blocked'; end if;
  v_hashes:='{}';
  foreach v_kind in array array['medical','references','rights'] loop
   v_hash:=case when v_item->>'kind'='question' then public.current_review_target_sha256(v_item->>'versionId',v_kind)
    else public.current_neural_note_review_target_sha256((v_item->>'versionId')::uuid,v_kind) end;
   if v_hash is null or v_hash !~ '^[a-f0-9]{64}$' then raise exception 'content_selection_item_unavailable'; end if;
   if not exists(select 1 from public.content_review_events e where e.target_type=case when v_item->>'kind'='question' then 'question_version' else 'neural_note_version' end
    and e.target_id=v_item->>'versionId' and e.review_kind=v_kind and e.decision='approved' and e.target_sha256=v_hash)
    then raise exception 'content_selection_item_blocked'; end if;
   v_hashes:=v_hashes||jsonb_build_object(v_kind,v_hash);
  end loop;
  v_bindings:=v_bindings||jsonb_build_array(jsonb_build_object('kind',v_row->'kind','canonicalId',v_row->'canonicalId',
   'versionId',v_row->'versionId','version',v_row->'version','reviewFingerprints',v_hashes));
 end loop;
 v_payload:=jsonb_build_object('contractId','content-selection-binding-v1','catalogVersion',v_snapshot->'catalogVersion','items',v_bindings);
 return v_payload||jsonb_build_object('digest',encode(extensions.digest(convert_to(v_payload::text,'UTF8'),'sha256'),'hex'),
  'observedAt',v_snapshot->'asOf','publicationAuthority',false,'releaseReadiness','not-assessed');
end; $$;
revoke all on function public.owner_content_selection_preview_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.owner_content_selection_preview_v1(uuid,jsonb) to service_role;

create function public.owner_content_selection_save_v1(p_actor uuid,p_request_id uuid,p_items jsonb,p_expected_digest text,p_expected_catalog_version bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_items jsonb; v_request jsonb; v_old public.owner_content_selections%rowtype; v_preview jsonb;
 v_id uuid:=gen_random_uuid();v_now timestamptz:=clock_timestamp();v_receipt jsonb;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required'; end if;
 if p_request_id is null or p_expected_digest is null or p_expected_digest !~ '^[a-f0-9]{64}$'
  or p_expected_catalog_version is null or p_expected_catalog_version<1 then raise exception 'content_selection_invalid'; end if;
 v_items:=public.owner_content_selection_items_v1(p_items);
 v_request:=jsonb_build_object('items',v_items,'expectedDigest',p_expected_digest,'expectedCatalogVersion',p_expected_catalog_version);
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into v_old from public.owner_content_selections where request_id=p_request_id;
 if found then
  if v_old.actor_id<>p_actor or v_old.request_body<>v_request then raise exception 'content_selection_request_conflict'; end if;
  return v_old.receipt;
 end if;
 v_preview:=public.owner_content_selection_preview_v1(p_actor,v_items);
 if v_preview->>'digest'<>p_expected_digest or (v_preview->>'catalogVersion')::bigint<>p_expected_catalog_version
  then raise exception 'content_selection_stale'; end if;
 v_receipt:=(v_preview-'contractId'-'observedAt')||jsonb_build_object('contractId','frozen-content-selection-v1',
  'selectionId',v_id,'requestId',p_request_id,'createdAt',v_now,'observedAt',v_preview->'observedAt');
 insert into public.owner_content_selections(selection_id,request_id,actor_id,request_body,digest,receipt,created_at)
 values(v_id,p_request_id,p_actor,v_request,p_expected_digest,v_receipt,v_now);
 return v_receipt;
end; $$;
revoke all on function public.owner_content_selection_save_v1(uuid,uuid,jsonb,text,bigint) from public,anon,authenticated;
grant execute on function public.owner_content_selection_save_v1(uuid,uuid,jsonb,text,bigint) to service_role;

create function public.owner_content_selection_read_v1(p_actor uuid,p_selection_id uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare v_receipt jsonb;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required'; end if;
 select receipt into v_receipt from public.owner_content_selections where selection_id=p_selection_id and actor_id=p_actor;
 if not found then raise exception 'content_selection_unknown'; end if;
 return v_receipt;
end; $$;
revoke all on function public.owner_content_selection_read_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.owner_content_selection_read_v1(uuid,uuid) to service_role;
