-- Concept identity/classification acceptance only, not medical or rights review or learner release.
-- Forward-only migration; draft revisions and historical receipts remain immutable.
create table public.content_concept_acceptances (
 proposal_id uuid primary key,
 revision integer not null,
 concept_id text not null,
 draft_digest text not null,
 previous_canonical_digest text,
 accepted_canonical_digest text not null,
 catalog_version bigint not null,
 accepted_by uuid not null,
 accepted_at timestamptz not null default now(),
 request_id uuid not null unique,
 request_fingerprint text not null,
 review_notes text not null,
 attestation text not null
);
alter table public.content_concept_acceptances enable row level security;
revoke all on public.content_concept_acceptances from public,anon,authenticated,service_role;
grant select,insert on public.content_concept_acceptances to service_role;
create trigger content_concept_acceptances_immutable before update or delete
 on public.content_concept_acceptances for each row execute function public.concept_draft_immutable_v1();

create function public.concept_draft_accept_v1(p_actor uuid,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_request uuid; v_proposal uuid; v_revision int; v_digest text; v_notes text; v_declaration text;
 v_fingerprint text; v_keys text[]; v_draft public.content_concept_draft_versions;
 v_done public.content_concept_acceptances; v_body jsonb; v_target jsonb; v_new_concepts jsonb;
 v_doc jsonb; v_after jsonb; v_catalog_version bigint; v_current jsonb;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required'; end if;
 if jsonb_typeof(p_input) is distinct from 'object' or pg_column_size(p_input)>8192 then raise exception 'concept_accept_invalid'; end if;
 select array_agg(k order by k) into v_keys from jsonb_object_keys(p_input) k;
 if v_keys is distinct from array['attestation','digest','proposalId','requestId','reviewNotes','revision','schemaVersion']
    or p_input->'schemaVersion' is distinct from '1'::jsonb
    or jsonb_typeof(p_input->'requestId') is distinct from 'string'
    or jsonb_typeof(p_input->'proposalId') is distinct from 'string'
    or jsonb_typeof(p_input->'revision') is distinct from 'number'
    or jsonb_typeof(p_input->'digest') is distinct from 'string'
    or jsonb_typeof(p_input->'reviewNotes') is distinct from 'string'
    or jsonb_typeof(p_input->'attestation') is distinct from 'string'
 then raise exception 'concept_accept_invalid'; end if;
 begin
   v_request:=(p_input->>'requestId')::uuid;
   v_proposal:=(p_input->>'proposalId')::uuid;
   v_revision:=(p_input->>'revision')::integer;
 exception when others then raise exception 'concept_accept_invalid'; end;
 v_digest:=p_input->>'digest';v_notes:=btrim(p_input->>'reviewNotes');v_declaration:=p_input->>'attestation';
 if v_revision not between 1 and 10000 or v_digest !~ '^[a-f0-9]{64}$'
    or char_length(v_notes) not between 20 and 4000
    or v_declaration <> 'identity-and-classification-reviewed-not-medical-or-learner-release'
 then raise exception 'concept_accept_invalid'; end if;
 v_fingerprint:=encode(extensions.digest(convert_to(p_input::text,'UTF8'),'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('concept-accept-request:'||v_request::text,0));
 select * into v_done from public.content_concept_acceptances where request_id=v_request;
 if found then
    if v_done.request_fingerprint<>v_fingerprint or v_done.accepted_by<>p_actor
      then raise exception 'concept_accept_request_conflict'; end if;
    return jsonb_build_object('proposalId',v_done.proposal_id,'revision',v_done.revision,
      'conceptId',v_done.concept_id,'draftDigest',v_done.draft_digest,
      'canonicalDigest',v_done.accepted_canonical_digest,'catalogVersion',v_done.catalog_version,
      'acceptedAt',v_done.accepted_at,'status','concept_accepted');
 end if;
 perform pg_advisory_xact_lock(hashtextextended('concept-draft-proposal:'||v_proposal::text,0));
 select * into v_draft from public.content_concept_draft_versions
   where proposal_id=v_proposal order by revision desc limit 1;
 if not found then raise exception 'concept_accept_not_found'; end if;
 if v_draft.revision<>v_revision or v_draft.digest<>v_digest then raise exception 'concept_accept_stale'; end if;
 if exists(select 1 from public.content_concept_acceptances where proposal_id=v_proposal)
   then raise exception 'concept_already_accepted'; end if;
 -- Share the catalog publisher's lock and protect the exact authoritative row.
 perform pg_advisory_xact_lock(hashtextextended('content-library-publication',0));
 select body,version into v_body,v_catalog_version from public.study_catalog where id=1 for update;
 if v_body is null or jsonb_typeof(v_body->'concepts') is distinct from 'array'
    or jsonb_array_length(v_body->'concepts')>5000 then raise exception 'concept_accept_catalog_unavailable';end if;
 v_target:=public.concept_draft_target_v1(v_draft.concept_id);
 if (v_draft.operation='create' and v_target is not null)
   or (v_draft.operation='revise' and (v_target is null or v_target->>'digest' is distinct from v_draft.base_digest))
 then raise exception 'concept_accept_target_changed'; end if;
 v_doc:=v_draft.document;
 -- Names and aliases must not take over an existing canonical identity.
 if exists(
   select 1 from jsonb_array_elements(v_body->'concepts') c
   cross join lateral jsonb_array_elements_text(jsonb_build_array(c->>'label')||coalesce(c->'aliases','[]'::jsonb)) old_name
   cross join lateral jsonb_array_elements_text(jsonb_build_array(v_doc->>'label')||v_doc->'aliases') new_name
   where c->>'conceptId'<>v_draft.concept_id
    and public.content_library_text(old_name)=public.content_library_text(new_name)
 ) then raise exception 'concept_accept_identity_conflict'; end if;
 if v_draft.operation='create' then
   v_new_concepts:=(v_body->'concepts')||jsonb_build_array(jsonb_build_object(
     'conceptId',v_draft.concept_id,'label',v_doc->>'label',
     'aliases',v_doc->'aliases','subjectTags',v_doc->'classification'->'subjects'));
 else
   select coalesce(jsonb_agg(
     case when c->>'conceptId'=v_draft.concept_id then
       (c-'label'-'aliases'-'subjectTags')||jsonb_build_object(
         'label',v_doc->>'label','aliases',v_doc->'aliases','subjectTags',v_doc->'classification'->'subjects')
     else c end order by ord),'[]'::jsonb)
     into v_new_concepts from jsonb_array_elements(v_body->'concepts') with ordinality a(c,ord);
 end if;
 -- Never modify a question, source, note, learner event or review decision.
 update public.study_catalog set body=jsonb_set(v_body,'{concepts}',v_new_concepts),
   version=version+1,updated_at=now() where id=1 returning version into v_catalog_version;
 insert into public.content_library_concept_metadata(concept_id,classification)
   values(v_draft.concept_id,v_doc->'classification')
   on conflict(concept_id) do update set classification=excluded.classification;
 v_after:=public.concept_draft_target_v1(v_draft.concept_id);
 if v_after is null then raise exception 'concept_accept_catalog_unavailable'; end if;
 insert into public.content_concept_acceptances(
  proposal_id,revision,concept_id,draft_digest,previous_canonical_digest,accepted_canonical_digest,
  catalog_version,accepted_by,request_id,request_fingerprint,review_notes,attestation)
 values(v_draft.proposal_id,v_draft.revision,v_draft.concept_id,v_draft.digest,
   v_draft.base_digest,v_after->>'digest',v_catalog_version,p_actor,v_request,v_fingerprint,v_notes,v_declaration);
 return jsonb_build_object('proposalId',v_draft.proposal_id,'revision',v_draft.revision,
   'conceptId',v_draft.concept_id,'draftDigest',v_draft.digest,
   'canonicalDigest',v_after->>'digest','catalogVersion',v_catalog_version,
   'acceptedAt',(select accepted_at from public.content_concept_acceptances where proposal_id=v_proposal),
   'status','concept_accepted');
end; $$;
revoke all on function public.concept_draft_accept_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.concept_draft_accept_v1(uuid,jsonb) to service_role;
