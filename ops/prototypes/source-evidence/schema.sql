-- Disposable-only prototype; never apply as a migration or expose these functions.
create schema evidence_probe;
revoke all on schema evidence_probe from public,anon,authenticated;
grant usage on schema evidence_probe to service_role;
create table evidence_probe.authority(actor uuid primary key, enabled boolean not null);
create table evidence_probe.source_policy(hash text,edition text,allowed boolean not null,primary key(hash,edition));
create table evidence_probe.revisions(package_id uuid,version int,digest text not null,owner uuid not null,candidate text not null,manifest text not null,primary key(package_id,version),unique(package_id,version,digest));
create table evidence_probe.cases(package_id uuid,version int,case_id text,claim jsonb not null,primary key(package_id,version,case_id),foreign key(package_id,version) references evidence_probe.revisions);
create table evidence_probe.requests(actor uuid,request_id uuid,fingerprint text not null,package_id uuid,version int,digest text,receipt text not null,primary key(actor,request_id),foreign key(package_id,version,digest) references evidence_probe.revisions(package_id,version,digest));
create table evidence_probe.events(id bigint generated always as identity primary key,actor uuid,request_id uuid,foreign key(actor,request_id) references evidence_probe.requests);
create function evidence_probe.guard(p_actor uuid,p_candidate jsonb)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from evidence_probe.authority where actor=p_actor and enabled) then raise exception 'evidence_denied';end if;
 if exists(select 1 from jsonb_array_elements(p_candidate->'cases') c where not exists(
  select 1 from evidence_probe.source_policy s where s.hash=c->>'sourceSha256' and s.edition=c->>'sourceEdition' and s.allowed)) then raise exception 'evidence_denied';end if;
end;$$;
create function evidence_probe.stage(p_actor uuid,p_candidate text,p_manifest text,p_binding jsonb,p_receipt_payload text,p_receipt text,p_fault text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c jsonb:=p_candidate::jsonb;m jsonb:=p_manifest::jsonb;r jsonb:=p_receipt::jsonb;rp jsonb:=p_receipt_payload::jsonb;
 old evidence_probe.requests;rev evidence_probe.revisions;k text;pid uuid;v int;rid uuid;dg text;
begin
 perform pg_advisory_xact_lock(730031);
 if p_actor is null or octet_length(p_candidate)>16777216 or jsonb_typeof(c->'cases') is distinct from 'array' then raise exception 'evidence_invalid';end if;
 if jsonb_array_length(c->'cases') not between 1 and 10000 then raise exception 'evidence_invalid';end if;
 perform evidence_probe.guard(p_actor,c);
 pid:=(p_binding->>'packageId')::uuid;v:=(p_binding->>'packageVersion')::int;rid:=(p_binding->>'requestId')::uuid;dg:=p_binding->>'packageDigest';
 if p_binding->>'actorId' is distinct from p_actor::text or v not between 1 and 1000000 or dg !~ '^[a-f0-9]{64}$'
 or p_binding->>'requestFingerprint' !~ '^[a-f0-9]{64}$' or rid is null or pid is null
 or (select array_agg(key order by key) from jsonb_object_keys(p_binding) key) is distinct from array['actorId','packageDigest','packageId','packageVersion','requestFingerprint','requestId']
 or c->'packageId' is distinct from p_binding->'packageId' or c->'packageVersion' is distinct from p_binding->'packageVersion'
 or m->>'contractId' is distinct from 'source-row-package-evidence-v1' or m->'packageId' is distinct from c->'packageId' or m->'packageVersion' is distinct from c->'packageVersion'
 or encode(sha256(convert_to(p_manifest,'UTF8')),'hex') is distinct from dg
 or r-'receiptDigest' is distinct from rp or encode(sha256(convert_to(p_receipt_payload,'UTF8')),'hex') is distinct from r->>'receiptDigest'
 or r->>'contractId' is distinct from 'source-evidence-staging-receipt-v1' or r->'sourceReviewOnly' is distinct from 'true'::jsonb
 then raise exception 'evidence_invalid';end if;
 foreach k in array array['clinicalApproved','rightsApproved','examScopeApproved','learnerRelease'] loop
  if r->k is distinct from 'false'::jsonb then raise exception 'evidence_invalid';end if;
 end loop;
 for k in select jsonb_object_keys(p_binding) loop if r->k is distinct from p_binding->k then raise exception 'evidence_invalid';end if;end loop;
 select * into old from evidence_probe.requests where actor=p_actor and request_id=rid;
 if found then
  if old.fingerprint is distinct from p_binding->>'requestFingerprint' or old.package_id<>pid or old.version<>v or old.digest<>dg then raise exception 'evidence_conflict';end if;
  select * into rev from evidence_probe.revisions where package_id=pid and version=v;
  if rev.owner<>p_actor then raise exception 'evidence_denied';end if;
  if rev.candidate<>p_candidate or rev.manifest<>p_manifest then raise exception 'evidence_conflict';end if;
  return jsonb_build_object('status','committed','receipt',old.receipt::jsonb);
 end if;
 select * into rev from evidence_probe.revisions where package_id=pid and version=v;
 if found then
  if rev.owner<>p_actor then raise exception 'evidence_denied';end if;
  if rev.digest<>dg or rev.candidate<>p_candidate or rev.manifest<>p_manifest then raise exception 'evidence_conflict';end if;
 else
  if exists(select 1 from evidence_probe.revisions where package_id=pid and owner<>p_actor) then raise exception 'evidence_denied';end if;
  insert into evidence_probe.revisions values(pid,v,dg,p_actor,p_candidate,p_manifest);
  if p_fault='after-revision' then raise exception 'injected_failure';end if;
  insert into evidence_probe.cases select pid,v,item->>'caseId',item from jsonb_array_elements(c->'cases') item;
 end if;
 if p_fault='after-cases' then raise exception 'injected_failure';end if;
 insert into evidence_probe.requests values(p_actor,rid,p_binding->>'requestFingerprint',pid,v,dg,p_receipt);
 if p_fault='after-request' then raise exception 'injected_failure';end if;
 insert into evidence_probe.events(actor,request_id) values(p_actor,rid);
 if p_fault='after-event' then raise exception 'injected_failure';end if;
 return jsonb_build_object('status','committed','receipt',r);
end;$$;
create function evidence_probe.readback(p_actor uuid,p_package uuid,p_version int,p_digest text,p_request uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare rev evidence_probe.revisions;req evidence_probe.requests;
begin
 perform pg_advisory_xact_lock(730031);
 select * into rev from evidence_probe.revisions where package_id=p_package and version=p_version and digest=p_digest and owner=p_actor;
 if not found then raise exception 'evidence_denied';end if;
 perform evidence_probe.guard(p_actor,rev.candidate::jsonb);
 select * into req from evidence_probe.requests where actor=p_actor and request_id=p_request and package_id=p_package and version=p_version and digest=p_digest;
 if not found then raise exception 'evidence_denied';end if;
 return jsonb_build_object('candidate',rev.candidate,'manifest',rev.manifest,'receipt',req.receipt);
end;$$;
create function evidence_probe.immutable() returns trigger language plpgsql set search_path='' as $$begin raise exception 'evidence_immutable';end;$$;
do $$declare t text;begin
 foreach t in array array['authority','source_policy','revisions','cases','requests','events'] loop
 execute format('alter table evidence_probe.%I enable row level security',t);
 execute format('revoke all on evidence_probe.%I from public,anon,authenticated,service_role',t);
 execute format('grant select on evidence_probe.%I to service_role',t);
 end loop;
 foreach t in array array['revisions','cases','requests','events'] loop
 execute format('grant insert on evidence_probe.%I to service_role',t);
 execute format('create trigger immutable before update or delete on evidence_probe.%I for each row execute function evidence_probe.immutable()',t);
 end loop;
end;$$;
revoke all on all functions in schema evidence_probe from public,anon,authenticated,service_role;
grant execute on function evidence_probe.guard(uuid,jsonb),evidence_probe.stage(uuid,text,text,jsonb,text,text,text),evidence_probe.readback(uuid,uuid,int,text,uuid) to service_role;
grant usage on all sequences in schema evidence_probe to service_role;
