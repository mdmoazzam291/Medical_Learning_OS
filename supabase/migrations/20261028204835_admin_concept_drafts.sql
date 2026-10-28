-- Immutable Admin proposals only. No canonical concept/question or learner mutation.
create table public.content_concept_draft_versions (
 proposal_id uuid not null, revision integer not null check(revision between 1 and 10000),
 concept_id text not null, operation text not null check(operation in ('create','revise')),
 base_digest text, previous_digest text, document jsonb not null, digest text not null,
 submitted_by uuid not null, recorded_at timestamptz not null default now(),
 request_id uuid not null unique, request_fingerprint text not null,
 primary key(proposal_id,revision), check((operation='create')=(base_digest is null))
);
create index content_concept_draft_latest on public.content_concept_draft_versions(proposal_id,revision desc);
alter table public.content_concept_draft_versions enable row level security;
revoke all on public.content_concept_draft_versions from public,anon,authenticated,service_role;
grant select,insert on public.content_concept_draft_versions to service_role;
create function public.concept_draft_immutable_v1() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'concept_draft_immutable'; end; $$;
create trigger concept_draft_immutable before update or delete on public.content_concept_draft_versions for each row execute function public.concept_draft_immutable_v1();
revoke all on function public.concept_draft_immutable_v1() from public,anon,authenticated,service_role;

create function public.concept_draft_target_v1(p_id text) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('conceptId',c->>'conceptId','label',c->>'label','aliases',coalesce(c->'aliases','[]'::jsonb),
  'classification',coalesce(m.classification,jsonb_build_object('subjects',coalesce(c->'subjectTags','[]'::jsonb),'systems','[]'::jsonb,'organs','[]'::jsonb,'domains','[]'::jsonb,'tasks','[]'::jsonb)),
  'digest',encode(extensions.digest(convert_to(jsonb_build_object('concept',c,'classification',m.classification)::text,'UTF8'),'sha256'),'hex'))
 from public.study_catalog s cross join lateral jsonb_array_elements(s.body->'concepts') c
 left join public.content_library_concept_metadata m on m.concept_id=c->>'conceptId'
 where s.id=1 and c->>'conceptId'=p_id;
$$;
revoke all on function public.concept_draft_target_v1(text) from public,anon,authenticated;
grant execute on function public.concept_draft_target_v1(text) to service_role;

create function public.concept_draft_save_v1(p_actor uuid,p_input jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_request uuid;v_proposal uuid;v_expected text;v_concept text;v_base text;v_operation text;v_doc jsonb;v_target jsonb;
 v_fingerprint text;v_digest text;v_revision integer;v_previous public.content_concept_draft_versions;v_saved public.content_concept_draft_versions;v_keys text[];
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required'; end if;
 if jsonb_typeof(p_input) is distinct from 'object' or pg_column_size(p_input)>262144 then raise exception 'concept_draft_invalid'; end if;
 select array_agg(k order by k) into v_keys from jsonb_object_keys(p_input) k;
 if v_keys is distinct from array['baseDigest','conceptId','document','expectedDigest','proposalId','requestId','schemaVersion'] or p_input->'schemaVersion'<>'1'::jsonb then raise exception 'concept_draft_invalid'; end if;
 begin v_request:=(p_input->>'requestId')::uuid;v_proposal:=(p_input->>'proposalId')::uuid;exception when others then raise exception 'concept_draft_invalid';end;
 v_expected:=p_input->>'expectedDigest';v_concept:=p_input->>'conceptId';v_base:=p_input->>'baseDigest';v_doc:=p_input->'document';
 if v_request is null or ((v_proposal is null)<>(v_expected is null)) or (v_expected is not null and v_expected!~'^[a-f0-9]{64}$') or (v_base is not null and v_base!~'^[a-f0-9]{64}$') or (v_concept is not null and v_concept!~'^[a-zA-Z0-9:_@.\-]{1,160}$') or (v_proposal is not null and v_concept is null) or (v_proposal is null and ((v_concept is null)<>(v_base is null))) then raise exception 'concept_draft_invalid';end if;
 if jsonb_typeof(v_doc) is distinct from 'object' then raise exception 'concept_draft_invalid';end if;
 select array_agg(k order by k) into v_keys from jsonb_object_keys(v_doc) k;
 if v_keys is distinct from array['aliases','changeReason','classification','label','sourceEvidence'] or jsonb_typeof(v_doc->'label') is distinct from 'string' or char_length(btrim(v_doc->>'label')) not between 1 and 240 or jsonb_typeof(v_doc->'sourceEvidence') is distinct from 'string' or char_length(btrim(v_doc->>'sourceEvidence')) not between 1 and 4000 or jsonb_typeof(v_doc->'changeReason') is distinct from 'string' or char_length(btrim(v_doc->>'changeReason')) not between 1 and 4000 then raise exception 'concept_draft_invalid';end if;
 begin perform public.content_library_strings(v_doc->'aliases');perform public.content_library_facets(v_doc->'classification');exception when others then raise exception 'concept_draft_invalid';end;
 v_fingerprint:=encode(extensions.digest(convert_to(p_input::text,'UTF8'),'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('concept-draft-request:'||v_request::text,0));
 select * into v_saved from public.content_concept_draft_versions where request_id=v_request;
 if found then
  if v_saved.request_fingerprint<>v_fingerprint or v_saved.submitted_by<>p_actor then raise exception 'concept_draft_request_conflict';end if;
 else
  if v_proposal is not null then
   perform pg_advisory_xact_lock(hashtextextended('concept-draft-proposal:'||v_proposal::text,0));
   select * into v_previous from public.content_concept_draft_versions where proposal_id=v_proposal order by revision desc limit 1;
   if not found then raise exception 'concept_draft_not_found';end if;
   if v_previous.digest is distinct from v_expected or v_previous.concept_id is distinct from v_concept or v_previous.base_digest is distinct from v_base then raise exception 'concept_draft_stale';end if;
   v_operation:=v_previous.operation;v_revision:=v_previous.revision+1;
  else
   v_proposal:=gen_random_uuid();v_revision:=1;v_operation:=case when v_concept is null then 'create' else 'revise' end;
   if v_concept is null then v_concept:='C-'||gen_random_uuid()::text;end if;
  end if;
  v_target:=public.concept_draft_target_v1(v_concept);
  if (v_operation='create' and v_target is not null) or (v_operation='revise' and (v_target is null or v_target->>'digest' is distinct from v_base)) then raise exception 'concept_draft_target_changed';end if;
  v_digest:=encode(extensions.digest(convert_to(jsonb_build_object('proposal',v_proposal,'revision',v_revision,'concept',v_concept,'base',v_base,'previous',v_expected,'document',v_doc)::text,'UTF8'),'sha256'),'hex');
  insert into public.content_concept_draft_versions(proposal_id,revision,concept_id,operation,base_digest,previous_digest,document,digest,submitted_by,request_id,request_fingerprint)
   values(v_proposal,v_revision,v_concept,v_operation,v_base,v_expected,v_doc,v_digest,p_actor,v_request,v_fingerprint) returning * into v_saved;
 end if;
 return jsonb_build_object('proposalId',v_saved.proposal_id,'revision',v_saved.revision,'conceptId',v_saved.concept_id,'digest',v_saved.digest,'recordedAt',v_saved.recorded_at);
end; $$;
revoke all on function public.concept_draft_save_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.concept_draft_save_v1(uuid,jsonb) to service_role;

create function public.concept_draft_inspect_v1(p_actor uuid,p_proposal_id uuid default null,p_revision integer default null,p_offset integer default 0)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_row public.content_concept_draft_versions;v_concepts jsonb;v_history jsonb;v_drafts jsonb;v_count integer;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required';end if;
 if p_offset not between 0 and 50000 or (p_revision is not null and p_revision not between 1 and 10000) or (p_proposal_id is null and p_revision is not null) then raise exception 'concept_draft_invalid';end if;
 if p_proposal_id is not null then
  select * into v_row from public.content_concept_draft_versions where proposal_id=p_proposal_id and (p_revision is null or revision=p_revision) order by revision desc limit 1;
  if not found then raise exception 'concept_draft_not_found';end if;
  select coalesce(jsonb_agg(jsonb_build_object('revision',revision,'digest',digest,'recordedAt',recorded_at) order by revision desc),'[]'::jsonb) into v_history from (select revision,digest,recorded_at from public.content_concept_draft_versions where proposal_id=p_proposal_id order by revision desc limit 50) h;
  return jsonb_build_object('contractId','admin-concept-drafts-v1','version',jsonb_build_object('proposalId',v_row.proposal_id,'revision',v_row.revision,'conceptId',v_row.concept_id,'operation',v_row.operation,'baseDigest',v_row.base_digest,'digest',v_row.digest,'document',v_row.document,'recordedAt',v_row.recorded_at),'history',v_history,'historyTruncated',(select count(*)>50 from public.content_concept_draft_versions where proposal_id=p_proposal_id));
 end if;
 if (select jsonb_array_length(body->'concepts') from public.study_catalog where id=1)>5000 then raise exception 'concept_draft_catalog_too_large';end if;
 select coalesce(jsonb_agg(public.concept_draft_target_v1(c->>'conceptId') order by c->>'conceptId'),'[]'::jsonb) into v_concepts from public.study_catalog s cross join lateral jsonb_array_elements(s.body->'concepts') c where s.id=1;
 if v_concepts is null then raise exception 'concept_draft_catalog_unavailable';end if;
 select count(distinct proposal_id) into v_count from public.content_concept_draft_versions;
 select coalesce(jsonb_agg(jsonb_build_object('proposalId',proposal_id,'revision',revision,'conceptId',concept_id,'label',document->>'label','digest',digest,'recordedAt',recorded_at) order by recorded_at desc,proposal_id),'[]'::jsonb) into v_drafts
 from (select * from (select distinct on(proposal_id) * from public.content_concept_draft_versions order by proposal_id,revision desc) latest order by recorded_at desc,proposal_id offset p_offset limit 50) paged;
 return jsonb_build_object('contractId','admin-concept-drafts-v1','concepts',v_concepts,'drafts',v_drafts,'offset',p_offset,'totalDrafts',v_count,'nextOffset',case when p_offset+50<v_count then p_offset+50 else null end);
end; $$;
revoke all on function public.concept_draft_inspect_v1(uuid,uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.concept_draft_inspect_v1(uuid,uuid,integer,integer) to service_role;
