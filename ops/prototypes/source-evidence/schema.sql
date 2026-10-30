-- Disposable-only prototype; never apply as a migration or expose these functions.
create schema evidence_probe;
revoke all on schema evidence_probe from public,anon,authenticated;
grant usage on schema evidence_probe to service_role;
create table evidence_probe.authority(actor uuid,version int,enabled boolean not null,recorded_by text not null default current_user,recorded_at timestamptz not null default now(),primary key(actor,version));
create table evidence_probe.source_policy(hash text,edition text,version int,allowed boolean not null,recorded_by text not null default current_user,recorded_at timestamptz not null default now(),primary key(hash,edition,version));
create table evidence_probe.packages(package_id uuid primary key,lexical_id text not null,owner uuid not null);
create table evidence_probe.revisions(package_id uuid,version int,digest text not null,owner uuid not null,candidate text not null,manifest text not null,primary key(package_id,version),unique(package_id,version,digest),foreign key(package_id) references evidence_probe.packages);
create table evidence_probe.cases(package_id uuid,version int,case_id text,claim jsonb not null,primary key(package_id,version,case_id),foreign key(package_id,version) references evidence_probe.revisions);
create table evidence_probe.requests(actor uuid,request_id uuid,fingerprint text not null,package_id uuid,version int,digest text,receipt text not null,primary key(actor,request_id),foreign key(package_id,version,digest) references evidence_probe.revisions(package_id,version,digest));
create table evidence_probe.events(id bigint generated always as identity primary key,actor uuid,request_id uuid,foreign key(actor,request_id) references evidence_probe.requests);
create function evidence_probe.set_authority(p_actor uuid,p_enabled boolean) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(730031);
 insert into evidence_probe.authority(actor,version,enabled) select p_actor,coalesce(max(version),0)+1,p_enabled from evidence_probe.authority where actor=p_actor;
end;$$;
create function evidence_probe.set_source_policy(p_hash text,p_edition text,p_allowed boolean) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(730031);
 insert into evidence_probe.source_policy(hash,edition,version,allowed) select p_hash,p_edition,coalesce(max(version),0)+1,p_allowed from evidence_probe.source_policy where hash=p_hash and edition=p_edition;
end;$$;
create function evidence_probe.exact(v jsonb,keys text[]) returns boolean language plpgsql immutable set search_path='' as $$
begin
 if jsonb_typeof(v) is distinct from 'object' then return false;end if;
 return (select count(*)=cardinality(keys) and coalesce(bool_and(key=any(keys)),false) from jsonb_object_keys(v) key);
end;$$;
create function evidence_probe.text_match(v jsonb,pattern text) returns boolean language sql immutable set search_path='' as $$select coalesce(jsonb_typeof(v)='string' and (v#>>'{}') ~ pattern,false)$$;
create function evidence_probe.integer_range(v jsonb,lo bigint,hi bigint) returns boolean language plpgsql immutable set search_path='' as $$begin
 return coalesce(jsonb_typeof(v)='number' and (v::text)::numeric=trunc((v::text)::numeric) and (v::text)::numeric between lo and hi,false);
 exception when others then return false;end;$$;
create function evidence_probe.valid_utc(v jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare t text:=v#>>'{}';y int;mo int;d int;days int;
begin
 if evidence_probe.text_match(v,'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$') is not true then return false;end if;
 y:=substring(t,1,4)::int;mo:=substring(t,6,2)::int;d:=substring(t,9,2)::int;
 if mo not between 1 and 12 or substring(t,12,2)::int>23 or substring(t,15,2)::int>59 or substring(t,18,2)::int>59 then return false;end if;
 days:=case when mo=2 then case when y%400=0 or (y%4=0 and y%100<>0) then 29 else 28 end when mo=any(array[4,6,9,11]) then 30 else 31 end;
 return d between 1 and days;
 exception when others then return false;
end;$$;
create function evidence_probe.validate(c jsonb,b jsonb,r jsonb) returns void language plpgsql set search_path='' as $$
declare q jsonb;a jsonb;i jsonb;x jsonb;ids text[]:=array[]::text[];uid text:='^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$';hex text:='^[a-f0-9]{64}$';label text:='^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$';
begin
 if evidence_probe.exact(c,array['packageId','packageVersion','cases']) is not true or evidence_probe.text_match(c->'packageId',uid) is not true or evidence_probe.integer_range(c->'packageVersion',1,1000000) is not true or jsonb_typeof(c->'cases') is distinct from 'array' then raise exception 'evidence_invalid';end if;
 if jsonb_array_length(c->'cases') not between 1 and 10000 then raise exception 'evidence_invalid';end if;
 for q in select jsonb_array_elements(c->'cases') loop
  a:=q->'appearance';i:=q->'interpretation';
  if evidence_probe.exact(q,array['caseId','caseVersion','sourceSha256','sourceEdition','appearance','interpretation']) is not true
  or evidence_probe.text_match(q->'caseId','^[a-z0-9][a-z0-9._:-]{0,127}$') is not true or position('..' in q->>'caseId')>0 or q->>'caseId'=any(ids)
  or evidence_probe.integer_range(q->'caseVersion',1,1000000) is not true or evidence_probe.text_match(q->'sourceSha256',hex) is not true
  or evidence_probe.text_match(q->'sourceEdition',label) is not true or position('..' in q->>'sourceEdition')>0
  or evidence_probe.exact(a,array['pdfPage','rowOrdinal','rotation','bboxMilliPoints','rawCellSha256']) is not true
  or evidence_probe.integer_range(a->'pdfPage',1,1000000) is not true or evidence_probe.integer_range(a->'rowOrdinal',1,1000000) is not true
  or (a->'rotation' in ('0'::jsonb,'90'::jsonb,'180'::jsonb,'270'::jsonb)) is not true or evidence_probe.text_match(a->'rawCellSha256',hex) is not true
  or jsonb_typeof(a->'bboxMilliPoints') is distinct from 'array'
  or evidence_probe.exact(i,array['proposedIdentity','relation','rationaleSha256']) is not true
  or ((i->'proposedIdentity'='null'::jsonb) or (evidence_probe.text_match(i->'proposedIdentity',label) and position('..' in i->>'proposedIdentity')=0)) is not true
  or (i->>'relation'=any(array['unresolved','proposed-normalization','distinct-appearance','candidate-equivalence','partial','nested'])) is not true
  or evidence_probe.text_match(i->'rationaleSha256',hex) is not true then raise exception 'evidence_invalid';end if;
  ids:=array_append(ids,q->>'caseId');
  if jsonb_array_length(a->'bboxMilliPoints')<>4 then raise exception 'evidence_invalid';end if;
  for x in select jsonb_array_elements(a->'bboxMilliPoints') loop if evidence_probe.integer_range(x,0,1000000000) is not true then raise exception 'evidence_invalid';end if;end loop;
  if ((a->'bboxMilliPoints'->>2)::numeric>(a->'bboxMilliPoints'->>0)::numeric and (a->'bboxMilliPoints'->>3)::numeric>(a->'bboxMilliPoints'->>1)::numeric) is not true then raise exception 'evidence_invalid';end if;
 end loop;
 if evidence_probe.exact(b,array['requestId','actorId','packageId','packageVersion','packageDigest','requestFingerprint']) is not true
 or evidence_probe.integer_range(b->'packageVersion',1,1000000) is not true then raise exception 'evidence_invalid';end if;
 foreach uid in array array['requestId','actorId','packageId'] loop if evidence_probe.text_match(b->uid,'^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$') is not true then raise exception 'evidence_invalid';end if;end loop;
 foreach uid in array array['packageDigest','requestFingerprint'] loop if evidence_probe.text_match(b->uid,hex) is not true then raise exception 'evidence_invalid';end if;end loop;
 if evidence_probe.exact(r,array['contractId','receiptId','requestId','actorId','packageId','packageVersion','packageDigest','requestFingerprint','recordedAt','sourceReviewOnly','clinicalApproved','rightsApproved','examScopeApproved','learnerRelease','receiptDigest']) is not true
 or evidence_probe.text_match(r->'receiptId','^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$') is not true
 or evidence_probe.text_match(r->'receiptDigest',hex) is not true or evidence_probe.valid_utc(r->'recordedAt') is not true then raise exception 'evidence_invalid';end if;
end;$$;

create function evidence_probe.guard(p_actor uuid,p_candidate jsonb)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if (select enabled from evidence_probe.authority where actor=p_actor order by version desc limit 1) is not true then raise exception 'evidence_denied';end if;
 if exists(select 1 from jsonb_array_elements(p_candidate->'cases') c where not exists(
  select 1 from evidence_probe.source_policy s where s.hash=c->>'sourceSha256' and s.edition=c->>'sourceEdition' and s.allowed and s.version=(select max(t.version) from evidence_probe.source_policy t where t.hash=s.hash and t.edition=s.edition))) then raise exception 'evidence_denied';end if;
end;$$;
create function evidence_probe.stage(p_actor uuid,p_candidate text,p_manifest text,p_binding jsonb,p_receipt_payload text,p_receipt text,p_fault text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c jsonb:=p_candidate::jsonb;m jsonb:=p_manifest::jsonb;r jsonb:=p_receipt::jsonb;rp jsonb:=p_receipt_payload::jsonb;
 old evidence_probe.requests;rev evidence_probe.revisions;k text;pid uuid;v int;rid uuid;dg text;
begin
 perform pg_advisory_xact_lock(730031);
 if p_actor is null or octet_length(p_candidate)>16777216 or jsonb_typeof(c->'cases') is distinct from 'array' then raise exception 'evidence_invalid';end if;
 if jsonb_array_length(c->'cases') not between 1 and 10000 then raise exception 'evidence_invalid';end if;
 perform evidence_probe.validate(c,p_binding,r);
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
 if exists(select 1 from evidence_probe.packages where package_id=pid and owner<>p_actor) then raise exception 'evidence_denied';end if;
 if exists(select 1 from evidence_probe.packages where package_id=pid and lexical_id<>p_binding->>'packageId') then raise exception 'evidence_conflict';end if;
 insert into evidence_probe.packages select pid,p_binding->>'packageId',p_actor where not exists(select 1 from evidence_probe.packages where package_id=pid);
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
 foreach t in array array['authority','source_policy','packages','revisions','cases','requests','events'] loop
 execute format('alter table evidence_probe.%I enable row level security',t);
 execute format('revoke all on evidence_probe.%I from public,anon,authenticated,service_role',t);
 execute format('grant select on evidence_probe.%I to service_role',t);
 end loop;
 foreach t in array array['packages','revisions','cases','requests','events'] loop
 execute format('grant insert on evidence_probe.%I to service_role',t);
 execute format('create trigger immutable before update or delete on evidence_probe.%I for each row execute function evidence_probe.immutable()',t);
 end loop;
 foreach t in array array['authority','source_policy'] loop
 execute format('create trigger immutable before update or delete on evidence_probe.%I for each row execute function evidence_probe.immutable()',t);
 end loop;
end;$$;
revoke all on all functions in schema evidence_probe from public,anon,authenticated,service_role;
grant execute on function evidence_probe.guard(uuid,jsonb),evidence_probe.stage(uuid,text,text,jsonb,text,text,text),evidence_probe.readback(uuid,uuid,int,text,uuid) to service_role;
grant execute on function evidence_probe.exact(jsonb,text[]),evidence_probe.text_match(jsonb,text),evidence_probe.integer_range(jsonb,bigint,bigint),evidence_probe.valid_utc(jsonb),evidence_probe.validate(jsonb,jsonb,jsonb) to service_role;
grant usage on all sequences in schema evidence_probe to service_role;
