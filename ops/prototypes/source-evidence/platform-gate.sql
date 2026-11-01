-- Disposable only. Caller identity must already be verified by the server.
create table evidence_probe.platform_feature(singleton boolean primary key default true check(singleton),enabled boolean not null default false);
insert into evidence_probe.platform_feature values(true,false);
alter table evidence_probe.platform_feature enable row level security;
revoke all on evidence_probe.platform_feature from public,anon,authenticated,service_role;
grant select on evidence_probe.platform_feature to service_role;
create function evidence_probe.platform_guard(p_actor uuid,p_session uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare current_access jsonb;
begin
 perform pg_advisory_xact_lock(730031);
 if p_actor is null or p_session is null or (select enabled from evidence_probe.platform_feature where singleton=true) is not true then raise exception 'evidence_platform_denied';end if;
 current_access:=public.learner_runtime_access_v1(p_actor,p_session);
 if current_access->'allowed' is distinct from 'true'::jsonb or public.is_content_admin(p_actor) is not true then raise exception 'evidence_platform_denied';end if;
end;$$;
create function evidence_probe.stage_session(p_actor uuid,p_session uuid,p_candidate text,p_manifest text,p_binding jsonb,p_receipt_payload text,p_receipt text)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 perform evidence_probe.platform_guard(p_actor,p_session);
 return evidence_probe.stage(p_actor,p_candidate,p_manifest,p_binding,p_receipt_payload,p_receipt);
end;$$;
create function evidence_probe.readback_session(p_actor uuid,p_session uuid,p_package uuid,p_version int,p_digest text,p_request uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 perform evidence_probe.platform_guard(p_actor,p_session);
 return evidence_probe.readback(p_actor,p_package,p_version,p_digest,p_request);
end;$$;
revoke all on function evidence_probe.platform_guard(uuid,uuid),evidence_probe.stage_session(uuid,uuid,text,text,jsonb,text,text),evidence_probe.readback_session(uuid,uuid,uuid,int,text,uuid) from public,anon,authenticated;
grant execute on function evidence_probe.platform_guard(uuid,uuid),evidence_probe.stage_session(uuid,uuid,text,text,jsonb,text,text),evidence_probe.readback_session(uuid,uuid,uuid,int,text,uuid) to service_role;
