-- Normalised-name index for accepted private concept identities.
-- The name-conflict check in concept_draft_accept_v1 compared every incoming name with every name of every
-- accepted identity through nested loops (~320 ms per item at 1,543 identities), so batch acceptance hit the
-- statement timeout at a few dozen items. This derived table holds each current identity's normalised label
-- and aliases, kept current by triggers on acceptances and identity revisions, and makes the check an index
-- lookup. It also makes the check read the *current* identity (latest revision), not the original acceptance.
-- Derived and rebuildable; the append-only acceptance and revision tables stay authoritative.
create table public.content_concept_identity_names (
 concept_id text not null,
 name_norm text not null check (char_length(name_norm) between 1 and 240),
 primary key (concept_id, name_norm)
);
-- One identity per name: names must never take over another identity.
create unique index content_concept_identity_names_name_key on public.content_concept_identity_names(name_norm);
alter table public.content_concept_identity_names enable row level security;
revoke all on public.content_concept_identity_names from public,anon,authenticated,service_role;
grant select,insert,delete on public.content_concept_identity_names to service_role;

create function public.concept_identity_name_set_v1(p_doc jsonb)
returns text[] language sql immutable set search_path='' as $$
 select coalesce(array_agg(distinct public.content_library_text(n) order by public.content_library_text(n)),'{}')
 from (select p_doc->>'label' n
       union all select jsonb_array_elements_text(coalesce(p_doc->'aliases','[]'::jsonb))) x
 where n is not null and btrim(n)<>'';
$$;

create function public.concept_identity_names_refresh_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_doc jsonb;
begin
 v_doc:=coalesce(to_jsonb(new)->'revised_document',to_jsonb(new)->'accepted_document');
 delete from public.content_concept_identity_names where concept_id=new.concept_id;
 insert into public.content_concept_identity_names(concept_id,name_norm)
  select new.concept_id,n from unnest(public.concept_identity_name_set_v1(v_doc)) n;
 return null;
end; $$;
create trigger content_concept_acceptances_names after insert on public.content_concept_acceptances
 for each row execute function public.concept_identity_names_refresh_v1();
create trigger content_concept_identity_revisions_names after insert on public.content_concept_identity_revisions
 for each row execute function public.concept_identity_names_refresh_v1();

insert into public.content_concept_identity_names(concept_id,name_norm)
 select c.concept_id,n from public.content_concept_current_identities c,
  unnest(public.concept_identity_name_set_v1(c.accepted_document)) n;

-- True when any normalised name of p_doc belongs to another accepted identity or catalogue concept.
-- Same semantics as before: label and aliases are one name set on both sides.
create function public.concept_identity_name_conflict_v1(p_concept text,p_doc jsonb)
returns boolean language sql stable set search_path='' as $$
 with incoming as (select unnest(public.concept_identity_name_set_v1(p_doc)) n)
 select exists(select 1 from incoming i join public.content_concept_identity_names e on e.name_norm=i.n
               where e.concept_id is distinct from p_concept)
     or exists(select 1 from public.study_catalog s, jsonb_array_elements(s.body->'concepts') c
               where s.id=1 and c->>'conceptId' is distinct from p_concept
                 and public.concept_identity_name_set_v1(c) && array(select n from incoming));
$$;
revoke all on function public.concept_identity_name_set_v1(jsonb) from public,anon,authenticated;
revoke all on function public.concept_identity_name_conflict_v1(text,jsonb) from public,anon,authenticated;
revoke all on function public.concept_identity_names_refresh_v1() from public,anon,authenticated;
grant execute on function public.concept_identity_name_set_v1(jsonb) to service_role;
grant execute on function public.concept_identity_name_conflict_v1(text,jsonb) to service_role;

create or replace function public.concept_draft_accept_v1(p_actor uuid, p_input jsonb)
 returns jsonb language plpgsql set search_path to '' as $function$
declare
 v_request uuid; v_proposal uuid; v_revision int; v_digest text; v_notes text; v_declaration text;
 v_fingerprint text; v_keys text[]; v_draft public.content_concept_draft_versions;
 v_done public.content_concept_acceptances; v_body jsonb; v_target jsonb;
 v_doc jsonb; v_after jsonb; v_identity_digest text; v_catalog_version bigint;
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
      'identityDigest',v_done.accepted_identity_digest,
      'catalogVersionAtAcceptance',v_done.catalog_version_at_acceptance,
      'learnerPublished',false,'acceptedAt',v_done.accepted_at,'status','concept_accepted');
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
 -- Existing canonical revisions may alter learner-visible labels/classification.
 -- Keep them as drafts until versioned learner release exists.
 if v_draft.operation='revise' then raise exception 'concept_accept_revision_requires_release'; end if;
 v_doc:=v_draft.document;
 -- Names and aliases must not take over an existing canonical or accepted identity (indexed lookup).
 if public.concept_identity_name_conflict_v1(v_draft.concept_id,v_doc) then raise exception 'concept_accept_identity_conflict'; end if;
 -- Accept only a private identity snapshot. Do not modify shared catalog,
 -- concept metadata, question/note sources, learner state or publication receipts.
 v_after:=jsonb_build_object(
   'conceptId',v_draft.concept_id,'label',v_doc->>'label',
   'aliases',v_doc->'aliases','classification',v_doc->'classification');
 v_identity_digest:=encode(extensions.digest(convert_to(v_after::text,'UTF8'),'sha256'),'hex');
 insert into public.content_concept_acceptances(
   proposal_id,revision,concept_id,draft_digest,previous_canonical_digest,
   accepted_document,accepted_identity_digest,catalog_version_at_acceptance,
   accepted_by,request_id,request_fingerprint,review_notes,attestation)
 values(v_draft.proposal_id,v_draft.revision,v_draft.concept_id,v_draft.digest,
   v_draft.base_digest,v_after,v_identity_digest,v_catalog_version,
   p_actor,v_request,v_fingerprint,v_notes,v_declaration);
 return jsonb_build_object('proposalId',v_draft.proposal_id,'revision',v_draft.revision,
   'conceptId',v_draft.concept_id,'draftDigest',v_draft.digest,
   'identityDigest',v_identity_digest,'catalogVersionAtAcceptance',v_catalog_version,
   'learnerPublished',false,'acceptedAt',(select accepted_at from public.content_concept_acceptances where proposal_id=v_proposal),
   'status','concept_accepted');
end; $function$;
