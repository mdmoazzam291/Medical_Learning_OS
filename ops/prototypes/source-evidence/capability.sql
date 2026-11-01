-- Disposable overlay only; production credential routing remains unresolved.
create role evidence_gateway login noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
create role evidence_executor nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
revoke create on schema public from public;
grant usage on schema public,evidence_probe to evidence_executor;
grant usage on schema evidence_probe to evidence_gateway;
-- Only these two audited entry points cross the capability boundary.
grant create on schema evidence_probe to evidence_executor;
alter function evidence_probe.stage_session(uuid,uuid,text,text,jsonb,text,text) owner to evidence_executor;
alter function evidence_probe.readback_session(uuid,uuid,uuid,int,text,uuid) owner to evidence_executor;
revoke create on schema evidence_probe from evidence_executor;
alter function evidence_probe.stage_session(uuid,uuid,text,text,jsonb,text,text) security definer;
alter function evidence_probe.readback_session(uuid,uuid,uuid,int,text,uuid) security definer;
revoke all on function evidence_probe.stage_session(uuid,uuid,text,text,jsonb,text,text),evidence_probe.readback_session(uuid,uuid,uuid,int,text,uuid) from public,anon,authenticated,service_role;
grant execute on function evidence_probe.stage_session(uuid,uuid,text,text,jsonb,text,text),evidence_probe.readback_session(uuid,uuid,uuid,int,text,uuid) to evidence_gateway;
grant select on public.content_admin_account to evidence_executor;
create policy evidence_executor_admin_read on public.content_admin_account for select to evidence_executor using(true);
grant execute on function public.learner_runtime_access_v1(uuid,uuid),public.is_content_admin(uuid) to evidence_executor;
grant execute on function evidence_probe.platform_guard(uuid,uuid),evidence_probe.guard(uuid,jsonb),evidence_probe.stage(uuid,text,text,jsonb,text,text,text),evidence_probe.readback(uuid,uuid,int,text,uuid),evidence_probe.exact(jsonb,text[]),evidence_probe.text_match(jsonb,text),evidence_probe.integer_range(jsonb,bigint,bigint),evidence_probe.valid_utc(jsonb),evidence_probe.validate(jsonb,jsonb,jsonb),evidence_probe.domain_canonical(jsonb),evidence_probe.domain_hash(jsonb),evidence_probe.ordered_package(jsonb),evidence_probe.derived_manifest(jsonb),evidence_probe.validate_digests(text,text,jsonb,text,text) to evidence_executor;
do $$declare t text;begin
 foreach t in array array['authority','source_policy','packages','revisions','cases','requests','events','withdrawals','platform_feature'] loop
 execute format('grant select on evidence_probe.%I to evidence_executor',t);
 execute format('create policy executor_read on evidence_probe.%I for select to evidence_executor using(true)',t);
 end loop;
 foreach t in array array['packages','revisions','cases','requests','events'] loop
 execute format('grant insert on evidence_probe.%I to evidence_executor',t);
 execute format('create policy executor_insert on evidence_probe.%I for insert to evidence_executor with check(true)',t);
 end loop;
end;$$;
grant usage on sequence evidence_probe.events_id_seq to evidence_executor;
