-- Admin edit path for accepted private concept identities (label, aliases) and draft NMC objective wording.
-- Append-only: each edit is a new revision guarded by the digest the editor saw; nothing is overwritten.
-- Only identities absent from the learner catalogue can be edited (learner-visible changes need a release).
-- Owner edits are recorded as owner edits; they are not faculty, clinical or medical review.

-- 1. Identity revisions gain a change kind, a reason and request idempotency (existing rows: subject additions).
alter table public.content_concept_identity_revisions
 add column change_kind text not null default 'subject-addition' check (change_kind in ('subject-addition','label-alias-edit')),
 add column change_reason text check (change_reason is null or char_length(change_reason) between 10 and 2000),
 add column request_id uuid unique,
 add column request_fingerprint text;

create function public.concept_identity_edit_v1(p_actor uuid,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_keys text[]; v_request uuid; v_id text; v_label text; v_aliases jsonb; v_reason text; v_fp text;
 v_done public.content_concept_identity_revisions; v_cur record; v_doc jsonb; v_digest text;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required'; end if;
 if jsonb_typeof(p_input) is distinct from 'object' or pg_column_size(p_input)>32768 then raise exception 'concept_edit_invalid'; end if;
 select array_agg(k order by k) into v_keys from jsonb_object_keys(p_input) k;
 if v_keys is distinct from array['aliases','changeReason','conceptId','label','previousIdentityDigest','requestId','schemaVersion']
    or p_input->'schemaVersion' is distinct from '1'::jsonb
    or jsonb_typeof(p_input->'label') is distinct from 'string' or jsonb_typeof(p_input->'aliases') is distinct from 'array'
    or jsonb_array_length(p_input->'aliases')>50
    or exists(select 1 from jsonb_array_elements(p_input->'aliases') a where jsonb_typeof(a) is distinct from 'string'
              or char_length(btrim(a#>>'{}')) not between 1 and 240 or a#>>'{}' ~ '[[:cntrl:]]')
    or (select count(*) from jsonb_array_elements_text(p_input->'aliases'))<>(select count(distinct public.content_library_text(a)) from jsonb_array_elements_text(p_input->'aliases') a)
    or p_input->>'previousIdentityDigest' !~ '^[a-f0-9]{64}$'
    or p_input->>'conceptId' !~ '^C-([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$'
 then raise exception 'concept_edit_invalid'; end if;
 begin v_request:=(p_input->>'requestId')::uuid; exception when others then raise exception 'concept_edit_invalid'; end;
 v_id:=p_input->>'conceptId'; v_label:=btrim(p_input->>'label'); v_reason:=btrim(p_input->>'changeReason'); v_aliases:=p_input->'aliases';
 if v_request is null or char_length(v_label) not between 2 and 240 or v_label ~ '[[:cntrl:]]'
    or char_length(coalesce(v_reason,'')) not between 10 and 2000 or v_reason ~ '[[:cntrl:]]'
    or exists(select 1 from jsonb_array_elements_text(v_aliases) a where public.content_library_text(a)=public.content_library_text(v_label))
 then raise exception 'concept_edit_invalid'; end if;
 v_fp:=encode(extensions.digest(convert_to(p_input::text,'UTF8'),'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('concept-identity:'||v_id,0));
 select * into v_done from public.content_concept_identity_revisions where request_id=v_request;
 if found then
  if v_done.request_fingerprint<>v_fp or v_done.accepted_by<>p_actor then raise exception 'concept_edit_request_conflict'; end if;
  return jsonb_build_object('conceptId',v_done.concept_id,'revision',v_done.revision,'previousIdentityDigest',v_done.previous_identity_digest,
   'identityDigest',v_done.revised_identity_digest,'label',v_done.revised_document->>'label','aliases',v_done.revised_document->'aliases',
   'learnerPublished',false,'status','concept_identity_edited');
 end if;
 select * into v_cur from public.content_concept_current_identities where concept_id=v_id;
 if not found then raise exception 'concept_edit_not_found'; end if;
 if exists(select 1 from public.study_catalog s cross join lateral jsonb_array_elements(s.body->'concepts') c
           where s.id=1 and c->>'conceptId'=v_id) then raise exception 'concept_edit_learner_visible'; end if;
 if v_cur.identity_digest<>p_input->>'previousIdentityDigest' then raise exception 'concept_edit_stale'; end if;
 v_doc:=jsonb_set(jsonb_set(v_cur.accepted_document,'{label}',to_jsonb(v_label)),'{aliases}',v_aliases);
 if v_doc=v_cur.accepted_document then raise exception 'concept_edit_no_change'; end if;
 if public.concept_identity_name_conflict_v1(v_id,v_doc) then raise exception 'concept_edit_identity_conflict'; end if;
 v_digest:=encode(extensions.digest(convert_to(v_doc::text,'UTF8'),'sha256'),'hex');
 insert into public.content_concept_identity_revisions(concept_id,revision,previous_identity_digest,revised_document,revised_identity_digest,
  added_subjects,batch_id,accepted_by,change_kind,change_reason,request_id,request_fingerprint)
 values(v_id,v_cur.identity_revision+1,v_cur.identity_digest,v_doc,v_digest,'[]'::jsonb,'admin-edit',p_actor,'label-alias-edit',v_reason,v_request,v_fp);
 return jsonb_build_object('conceptId',v_id,'revision',v_cur.identity_revision+1,'previousIdentityDigest',v_cur.identity_digest,
  'identityDigest',v_digest,'label',v_label,'aliases',v_aliases,'learnerPublished',false,'status','concept_identity_edited');
end; $$;
revoke all on function public.concept_identity_edit_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.concept_identity_edit_v1(uuid,jsonb) to service_role;

-- 2. Objective wording revisions. The registry file stays the authored base (revision 0, not stored here);
-- owner-api checks that the first edit's base digest matches the pinned registry wording.
create table public.foundation_objective_revisions (
 objective_version_id text not null check (objective_version_id ~ '^lo:[A-Za-z0-9:._-]{1,200}@[0-9]{1,4}$'),
 revision integer not null check (revision >= 1),
 base_wording_sha256 text not null check (base_wording_sha256 ~ '^[a-f0-9]{64}$'),
 wording text not null check (char_length(wording) between 12 and 500 and wording !~ '[[:cntrl:]]'),
 wording_sha256 text not null check (wording_sha256 ~ '^[a-f0-9]{64}$'),
 change_reason text not null check (char_length(change_reason) between 10 and 2000),
 edited_by uuid not null,
 edited_at timestamptz not null default now(),
 request_id uuid not null unique,
 request_fingerprint text not null,
 primary key (objective_version_id, revision)
);
alter table public.foundation_objective_revisions enable row level security;
revoke all on public.foundation_objective_revisions from public,anon,authenticated,service_role;
grant select,insert on public.foundation_objective_revisions to service_role;
create trigger foundation_objective_revisions_immutable before update or delete
 on public.foundation_objective_revisions for each row execute function public.concept_draft_immutable_v1();

create view public.foundation_objective_current_wordings with (security_invoker=true) as
 select distinct on (objective_version_id) objective_version_id, revision, wording, wording_sha256, edited_at
 from public.foundation_objective_revisions order by objective_version_id, revision desc;
revoke all on public.foundation_objective_current_wordings from public,anon,authenticated,service_role;
grant select on public.foundation_objective_current_wordings to service_role;

create function public.foundation_objective_revision_v1(p_actor uuid,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_keys text[]; v_request uuid; v_id text; v_base text; v_wording text; v_reason text; v_fp text; v_sha text;
 v_done public.foundation_objective_revisions; v_cur public.foundation_objective_revisions;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required'; end if;
 if jsonb_typeof(p_input) is distinct from 'object' or pg_column_size(p_input)>8192 then raise exception 'objective_edit_invalid'; end if;
 select array_agg(k order by k) into v_keys from jsonb_object_keys(p_input) k;
 if v_keys is distinct from array['baseWordingSha256','changeReason','objectiveVersionId','requestId','schemaVersion','wording']
    or p_input->'schemaVersion' is distinct from '1'::jsonb or jsonb_typeof(p_input->'wording') is distinct from 'string'
    or jsonb_typeof(p_input->'changeReason') is distinct from 'string'
    or p_input->>'baseWordingSha256' !~ '^[a-f0-9]{64}$'
    or p_input->>'objectiveVersionId' !~ '^lo:[A-Za-z0-9:._-]{1,200}@[0-9]{1,4}$'
 then raise exception 'objective_edit_invalid'; end if;
 begin v_request:=(p_input->>'requestId')::uuid; exception when others then raise exception 'objective_edit_invalid'; end;
 v_id:=p_input->>'objectiveVersionId'; v_base:=p_input->>'baseWordingSha256';
 v_wording:=btrim(regexp_replace(p_input->>'wording','\s+',' ','g')); v_reason:=btrim(p_input->>'changeReason');
 if v_request is null or char_length(v_wording) not between 12 and 500 or char_length(v_reason) not between 10 and 2000 or v_reason ~ '[[:cntrl:]]'
 then raise exception 'objective_edit_invalid'; end if;
 v_sha:=encode(extensions.digest(convert_to(v_wording,'UTF8'),'sha256'),'hex');
 v_fp:=encode(extensions.digest(convert_to(p_input::text,'UTF8'),'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('foundation-objective:'||v_id,0));
 select * into v_done from public.foundation_objective_revisions where request_id=v_request;
 if found then
  if v_done.request_fingerprint<>v_fp or v_done.edited_by<>p_actor then raise exception 'objective_edit_request_conflict'; end if;
  return jsonb_build_object('objectiveVersionId',v_done.objective_version_id,'revision',v_done.revision,'wording',v_done.wording,
   'wordingSha256',v_done.wording_sha256,'learnerPublished',false,'status','objective_wording_edited');
 end if;
 select * into v_cur from public.foundation_objective_revisions where objective_version_id=v_id order by revision desc limit 1;
 if found and v_cur.wording_sha256<>v_base then raise exception 'objective_edit_stale'; end if;
 if v_sha=v_base then raise exception 'objective_edit_no_change'; end if;
 insert into public.foundation_objective_revisions(objective_version_id,revision,base_wording_sha256,wording,wording_sha256,change_reason,edited_by,request_id,request_fingerprint)
 values(v_id,coalesce(v_cur.revision,0)+1,v_base,v_wording,v_sha,v_reason,p_actor,v_request,v_fp);
 return jsonb_build_object('objectiveVersionId',v_id,'revision',coalesce(v_cur.revision,0)+1,'wording',v_wording,'wordingSha256',v_sha,
  'learnerPublished',false,'status','objective_wording_edited');
end; $$;
revoke all on function public.foundation_objective_revision_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.foundation_objective_revision_v1(uuid,jsonb) to service_role;
