-- Protected canonical assertions. No clinical content or authority is seeded.
create table public.medical_relationship_versions (
 relationship_version_id text primary key,
 relationship_id text not null check (relationship_id ~ '^[a-zA-Z0-9:_@.\-]{1,143}$'),
 version integer not null check (version between 1 and 1000000),
 assertion jsonb not null,
 bindings jsonb not null,
 digest text not null check (digest ~ '^[a-f0-9]{64}$'),
 submitted_by uuid not null references auth.users(id) on delete restrict,
 recorded_at timestamptz not null default now(),
 unique(relationship_id,version),
 check (relationship_version_id=relationship_id||'@'||version::text)
);
create table public.medical_relationship_events (
 id uuid primary key default gen_random_uuid(),
 relationship_version_id text not null references public.medical_relationship_versions(relationship_version_id) on delete restrict,
 action text not null check (action in ('published','retired')),
 actor_id uuid not null references auth.users(id) on delete restrict,
 target_digest text not null check (target_digest ~ '^[a-f0-9]{64}$'),
 rights_event_id uuid references public.source_rights_events(id) on delete restrict,
 notes text not null check (char_length(btrim(notes)) between 1 and 4000),
 receipt jsonb not null,
 recorded_at timestamptz not null default now(),
 unique(relationship_version_id,action),
 check (action<>'published' or rights_event_id is not null)
);
create index medical_relationship_events_actor on public.medical_relationship_events(actor_id);
create index medical_relationship_events_rights on public.medical_relationship_events(rights_event_id);
create index medical_relationship_versions_submitter on public.medical_relationship_versions(submitted_by);
alter table public.medical_relationship_versions enable row level security;
alter table public.medical_relationship_events enable row level security;
revoke all on table public.medical_relationship_versions,public.medical_relationship_events from public,anon,authenticated,service_role;
grant select on table public.medical_relationship_versions,public.medical_relationship_events to service_role;

create function public.medical_relationship_immutable_v1() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'medical_relationship_evidence_immutable'; end; $$;
create trigger medical_relationship_versions_immutable before update or delete on public.medical_relationship_versions for each row execute function public.medical_relationship_immutable_v1();
create trigger medical_relationship_events_immutable before update or delete on public.medical_relationship_events for each row execute function public.medical_relationship_immutable_v1();

create function public.medical_relationship_hash_v1(p_value jsonb) returns text
language sql immutable set search_path='' as $$ select encode(sha256(convert_to(p_value::text,'UTF8')),'hex'); $$;

-- Missing/ambiguous canonical identities return NULL, never an arbitrary first match.
create function public.medical_relationship_bindings_v1(p_assertion jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
 with c as (select body from public.study_catalog where id=1),
 f as (select value from c,jsonb_array_elements(body->'concepts') where value->>'conceptId'=p_assertion->>'fromConceptId'),
 t as (select value from c,jsonb_array_elements(body->'concepts') where value->>'conceptId'=p_assertion->>'toConceptId'),
 s as (select value from c,jsonb_array_elements(body->'sources') where value->>'sourceId'=p_assertion->>'sourceId')
 select case when (select count(*) from f)=1 and (select count(*) from t)=1 and (select count(*) from s)=1
 and (select value->>'version' from s)=p_assertion->>'sourceVersion'
 then jsonb_build_object('fromHash',public.medical_relationship_hash_v1((select value from f)),
 'toHash',public.medical_relationship_hash_v1((select value from t)),
 'sourceFingerprintSha256',public.current_source_fingerprint_sha256(p_assertion->>'sourceId')) else null end;
$$;

create function public.medical_relationship_validate_v1(p jsonb) returns void language plpgsql set search_path='' as $$
declare k text;
begin
 if jsonb_typeof(p) is distinct from 'object' then raise exception 'relationship_invalid'; end if;
 if (select array_agg(x order by x) from jsonb_object_keys(p) x) is distinct from
 (select array_agg(x order by x) from unnest(array['relationshipId','version','fromConceptId','toConceptId','relationType','claimText','sourceId','sourceVersion','evidenceVersionId','evidenceLocator','previousVersionId','previousDigest','provenance']) x)
 then raise exception 'relationship_fields_invalid'; end if;
 foreach k in array array['relationshipId','fromConceptId','toConceptId','sourceId','evidenceVersionId'] loop
  if jsonb_typeof(p->k) is distinct from 'string' or (p->>k) !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' then raise exception 'relationship_invalid'; end if;
 end loop;
 if char_length(p->>'relationshipId')>143 or jsonb_typeof(p->'version') is distinct from 'number' or (p->>'version') !~ '^[1-9][0-9]{0,6}$' or (p->>'version')::int>1000000 then raise exception 'relationship_invalid'; end if;
 if p->>'fromConceptId'=p->>'toConceptId' or jsonb_typeof(p->'relationType') is distinct from 'string' or p->>'relationType' not in ('causes','mechanism-of','risk-factor-for','differential-of','complication-of','treated-by','diagnosed-by','contraindicated-in') then raise exception 'relationship_invalid'; end if;
 foreach k in array array['sourceVersion','claimText','evidenceLocator'] loop
  if jsonb_typeof(p->k) is distinct from 'string' or char_length(btrim(p->>k)) not between 1 and (case k when 'claimText' then 1500 when 'evidenceLocator' then 1000 else 160 end) then raise exception 'relationship_invalid'; end if;
 end loop;
 if jsonb_typeof(p->'provenance') is distinct from 'object' or (select array_agg(x order by x) from jsonb_object_keys(p->'provenance') x) is distinct from array['authorLabel','evidence','kind']::text[] then raise exception 'relationship_provenance_required'; end if;
 if p->'provenance'->>'kind' is distinct from 'external' then raise exception 'external_provenance_required'; end if;
 foreach k in array array['authorLabel','evidence'] loop
  if jsonb_typeof(p->'provenance'->k) is distinct from 'string' or char_length(btrim(p->'provenance'->>k)) not between 1 and 1000 then raise exception 'relationship_provenance_required'; end if;
 end loop;
 if (p->>'version')::int=1 then
  if p->'previousVersionId'<>'null'::jsonb or p->'previousDigest'<>'null'::jsonb then raise exception 'stale_relationship_predecessor'; end if;
 else
  if jsonb_typeof(p->'previousVersionId') is distinct from 'string' or jsonb_typeof(p->'previousDigest') is distinct from 'string' or p->>'previousDigest' !~ '^[a-f0-9]{64}$' then raise exception 'stale_relationship_predecessor'; end if;
 end if;
end; $$;

create function public.medical_relationship_stage_v1(p_assertion jsonb,p_actor uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.medical_relationship_versions%rowtype; prior public.medical_relationship_versions%rowtype; b jsonb; d text; vid text;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required'; end if;
 perform public.medical_relationship_validate_v1(p_assertion);
 perform pg_advisory_xact_lock(hashtextextended('content-library-publication',0));
 perform 1 from public.study_catalog where id=1 for update;
 vid:=p_assertion->>'relationshipId'||'@'||(p_assertion->>'version');
 select * into r from public.medical_relationship_versions where relationship_version_id=vid;
 if found then
  if r.assertion is distinct from p_assertion or r.submitted_by is distinct from p_actor then raise exception 'relationship_payload_conflict'; end if;
  return jsonb_build_object('relationshipVersionId',vid,'digest',r.digest,'status','draft');
 end if;
 select * into prior from public.medical_relationship_versions where relationship_id=p_assertion->>'relationshipId' order by version desc limit 1;
 if (prior.relationship_version_id is null and (p_assertion->>'version')::int<>1) or
 (prior.relationship_version_id is not null and ((p_assertion->>'version')::int<>prior.version+1 or p_assertion->>'previousVersionId' is distinct from prior.relationship_version_id or p_assertion->>'previousDigest' is distinct from prior.digest)) then raise exception 'stale_relationship_predecessor'; end if;
 b:=public.medical_relationship_bindings_v1(p_assertion);
 if b is null then raise exception 'relationship_target_unknown'; end if;
 d:=public.medical_relationship_hash_v1(jsonb_build_object('assertion',p_assertion,'bindings',b));
 insert into public.medical_relationship_versions(relationship_version_id,relationship_id,version,assertion,bindings,digest,submitted_by)
 values(vid,p_assertion->>'relationshipId',(p_assertion->>'version')::int,p_assertion,b,d,p_actor);
 return jsonb_build_object('relationshipVersionId',vid,'digest',d,'status','draft');
end; $$;

create function public.medical_relationship_rights_v1(p_assertion jsonb,p_bindings jsonb) returns uuid
language sql stable security definer set search_path='' as $$
 select e.id from public.source_rights_events e,public.study_catalog c,jsonb_array_elements(c.body->'sources') s
 where c.id=1 and s->>'sourceId'=p_assertion->>'sourceId' and s->>'version'=p_assertion->>'sourceVersion'
 and e.source_id=s->>'sourceId' and e.source_fingerprint_sha256=p_bindings->>'sourceFingerprintSha256'
 and e.source_fingerprint_sha256=public.current_source_fingerprint_sha256(e.source_id)
 and e.rights_status in ('owned','licensed','public_domain','citation_only') and e.rights_status=s->'rights'->>'status'
 and public.has_active_reviewer_grant(e.reviewer_id,'rights');
$$;

create function public.medical_relationship_publish_v1(p_version_id text,p_actor uuid,p_expected_digest text,p_review_notes text,p_attested boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.medical_relationship_versions%rowtype; k text; rights_id uuid; receipt jsonb;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required'; end if;
 foreach k in array array['medical','references','rights'] loop
  if public.has_active_reviewer_grant(p_actor,k) is not true then raise exception 'reviewer_not_authorized'; end if;
 end loop;
 if p_attested is distinct from true or char_length(btrim(coalesce(p_review_notes,''))) not between 1 and 4000 then raise exception 'review_attestation_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('content-library-publication',0));
 perform 1 from public.study_catalog where id=1 for update;
 select * into r from public.medical_relationship_versions where relationship_version_id=p_version_id;
 if not found then raise exception 'relationship_not_found'; end if;
 if r.digest is distinct from p_expected_digest then raise exception 'stale_relationship_digest'; end if;
 if exists(select 1 from public.medical_relationship_versions where relationship_id=r.relationship_id and version>r.version) then raise exception 'relationship_not_latest'; end if;
 if exists(select 1 from public.medical_relationship_events where relationship_version_id=p_version_id and action='retired') then raise exception 'relationship_retired'; end if;
 if public.medical_relationship_bindings_v1(r.assertion) is distinct from r.bindings then raise exception 'stale_relationship_target'; end if;
 rights_id:=public.medical_relationship_rights_v1(r.assertion,r.bindings);
 if rights_id is null then raise exception 'publication_rights_unresolved'; end if;
 select e.receipt into receipt from public.medical_relationship_events e where relationship_version_id=p_version_id and action='published';
 if found then return receipt; end if;
 receipt:=jsonb_build_object('contractId','medical-relationship-publication-v1','relationshipVersionId',p_version_id,'digest',r.digest,'status','published','reviewerId',p_actor,'reviewedAt',now(),'attestationVersion','external-relationship-review-v1');
 insert into public.medical_relationship_events(relationship_version_id,action,actor_id,target_digest,rights_event_id,notes,receipt) values(p_version_id,'published',p_actor,r.digest,rights_id,btrim(p_review_notes),receipt);
 return receipt;
end; $$;

create function public.medical_relationship_retire_v1(p_version_id text,p_actor uuid,p_expected_digest text,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.medical_relationship_versions%rowtype; receipt jsonb;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required'; end if;
 if char_length(btrim(coalesce(p_reason,''))) not between 1 and 4000 then raise exception 'retirement_reason_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('content-library-publication',0));
 perform 1 from public.study_catalog where id=1 for update;
 select * into r from public.medical_relationship_versions where relationship_version_id=p_version_id;
 if not found then raise exception 'relationship_not_found'; end if;
 if r.digest is distinct from p_expected_digest then raise exception 'stale_relationship_digest'; end if;
 select e.receipt into receipt from public.medical_relationship_events e where relationship_version_id=p_version_id and action='retired';
 if found then return receipt; end if;
 receipt:=jsonb_build_object('contractId','medical-relationship-retirement-v1','relationshipVersionId',p_version_id,'digest',r.digest,'status','retired','retiredAt',now());
 insert into public.medical_relationship_events(relationship_version_id,action,actor_id,target_digest,notes,receipt) values(p_version_id,'retired',p_actor,r.digest,btrim(p_reason),receipt);
 return receipt;
end; $$;

-- Only latest state per identity. An unapproved correction cannot revive its predecessor.
create function public.medical_relationship_feed_v1() returns jsonb
language sql stable security definer set search_path='' as $$
 with latest as (select distinct on (relationship_id) * from public.medical_relationship_versions order by relationship_id,version desc)
 select coalesce(jsonb_agg(jsonb_build_object(
 'relationshipId',r.relationship_id,'relationshipVersionId',r.relationship_version_id,'version',r.version,
 'status',case when retired.id is not null then 'retired' when published.id is not null then 'published' else 'draft' end,
 'fromConceptId',r.assertion->>'fromConceptId','toConceptId',r.assertion->>'toConceptId','relationType',r.assertion->>'relationType',
 'claimText',r.assertion->>'claimText','sourceId',r.assertion->>'sourceId','sourceVersion',r.assertion->>'sourceVersion',
 'sourceFingerprintSha256',r.bindings->>'sourceFingerprintSha256','evidenceVersionId',r.assertion->>'evidenceVersionId','reviewedAt',published.recorded_at,
 'medicalReviewVerified',coalesce(published.target_digest=r.digest and current_bindings.value=r.bindings and public.has_active_reviewer_grant(published.actor_id,'medical'),false),
 'referenceReviewVerified',coalesce(published.target_digest=r.digest and current_bindings.value=r.bindings and public.has_active_reviewer_grant(published.actor_id,'references'),false),
 'rightsVerified',coalesce(published.target_digest=r.digest and current_bindings.value=r.bindings and public.has_active_reviewer_grant(published.actor_id,'rights') and published.rights_event_id=public.medical_relationship_rights_v1(r.assertion,r.bindings),false)
 ) order by r.relationship_id),'[]'::jsonb) from latest r
 left join public.medical_relationship_events published on published.relationship_version_id=r.relationship_version_id and published.action='published'
 left join public.medical_relationship_events retired on retired.relationship_version_id=r.relationship_version_id and retired.action='retired'
 cross join lateral (select public.medical_relationship_bindings_v1(r.assertion) value) current_bindings;
$$;

create function public.medical_relationship_inspect_v1(p_actor uuid,p_version_id text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r public.medical_relationship_versions%rowtype; kinds jsonb; body jsonb;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required'; end if;
 select coalesce(jsonb_agg(k order by k),'[]') into kinds from unnest(array['medical','references','rights']) k where public.has_active_reviewer_grant(p_actor,k);
 if p_version_id is null then
  return jsonb_build_object('reviewKinds',kinds,'versions',coalesce((select jsonb_agg(jsonb_build_object('relationshipVersionId',v.relationship_version_id,'relationshipId',v.relationship_id,'version',v.version,'digest',v.digest,'status',coalesce((select case when bool_or(action='retired') then 'retired' else 'published' end from public.medical_relationship_events where relationship_version_id=v.relationship_version_id),'draft')) order by v.recorded_at desc,v.relationship_version_id) from (select * from public.medical_relationship_versions order by recorded_at desc,relationship_version_id limit 100) v),'[]'));
 end if;
 select * into r from public.medical_relationship_versions where relationship_version_id=p_version_id;
 if not found then raise exception 'relationship_not_found'; end if;
 select c.body into body from public.study_catalog c where id=1;
 return jsonb_build_object('reviewKinds',kinds,'version',jsonb_build_object('relationshipVersionId',r.relationship_version_id,'digest',r.digest,'assertion',r.assertion,'bindings',r.bindings),
 'isLatest',not exists(select 1 from public.medical_relationship_versions where relationship_id=r.relationship_id and version>r.version),
 'currentBindings',public.medical_relationship_bindings_v1(r.assertion),
 'rightsReady',public.medical_relationship_rights_v1(r.assertion,r.bindings) is not null,
 'concepts',(select coalesce(jsonb_agg(c),'[]') from jsonb_array_elements(body->'concepts') c where c->>'conceptId' in (r.assertion->>'fromConceptId',r.assertion->>'toConceptId')),
 'source',(select s from jsonb_array_elements(body->'sources') s where s->>'sourceId'=r.assertion->>'sourceId'),
 'events',coalesce((select jsonb_agg(jsonb_build_object('action',e.action,'actorId',e.actor_id,'notes',e.notes,'receipt',e.receipt,'recordedAt',e.recorded_at) order by e.recorded_at,e.action) from public.medical_relationship_events e where e.relationship_version_id=p_version_id),'[]'));
end; $$;

create or replace function public.content_library_snapshot_v1(p_learner uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'catalog',(select body||jsonb_build_object('sources',coalesce((select jsonb_agg(s||jsonb_build_object('fingerprintSha256',public.current_source_fingerprint_sha256(s->>'sourceId')) order by ord) from jsonb_array_elements(body->'sources') with ordinality as items(s,ord)),'[]'::jsonb)) from public.study_catalog where id=1),
  'notes',coalesce((select jsonb_agg(jsonb_build_object('id',id,'concept_id',concept_id,'title',title,'body_markdown',body_markdown,'status',status) order by id) from public.neural_canonical_note_versions where status='published'),'[]'),
  'questionMetadata',coalesce((select jsonb_agg(to_jsonb(m) order by question_id) from public.content_library_question_metadata m),'[]'),
  'conceptMetadata',coalesce((select jsonb_agg(to_jsonb(m) order by concept_id) from public.content_library_concept_metadata m),'[]'),
  'links',coalesce((select jsonb_agg(to_jsonb(l) order by note_version_id,question_id) from public.content_library_note_question_links l),'[]'),
  'stats',public.content_library_observations_v1(p_learner),
  'medicalRelationships',public.medical_relationship_feed_v1()
 );
$$;

do $$ declare f record; begin
 for f in select p.proname,p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'medical_relationship_%' loop
  execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
  -- Only externally used RPCs get service execute; helpers and triggers stay internal.
  if f.proname in ('medical_relationship_stage_v1','medical_relationship_publish_v1','medical_relationship_retire_v1','medical_relationship_feed_v1','medical_relationship_inspect_v1') then execute format('grant execute on function %s to service_role',f.signature); end if;
 end loop;
end; $$;
revoke all on function public.content_library_snapshot_v1(uuid) from public,anon,authenticated;
grant execute on function public.content_library_snapshot_v1(uuid) to service_role;
