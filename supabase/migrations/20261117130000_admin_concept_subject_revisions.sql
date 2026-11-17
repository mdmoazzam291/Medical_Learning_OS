-- Subject-classification revisions for accepted private concept identities.
-- Append-only: the original acceptance stays immutable; each revision records the previous and new
-- identity digest. Only additions to classification.subjects are allowed, and only for identities
-- absent from the learner catalogue (learners cannot see them). Label, aliases and other facets never
-- change here. Identity/classification review only; not medical review or learner release.
create table public.content_concept_identity_revisions (
 concept_id text not null,
 revision integer not null check (revision >= 2),
 previous_identity_digest text not null check (previous_identity_digest ~ '^[a-f0-9]{64}$'),
 revised_document jsonb not null,
 revised_identity_digest text not null check (revised_identity_digest ~ '^[a-f0-9]{64}$'),
 added_subjects jsonb not null,
 batch_id text not null,
 accepted_by uuid not null,
 accepted_at timestamptz not null default now(),
 primary key (concept_id, revision)
);
alter table public.content_concept_identity_revisions enable row level security;
revoke all on public.content_concept_identity_revisions from public,anon,authenticated,service_role;
grant select,insert on public.content_concept_identity_revisions to service_role;
create trigger content_concept_identity_revisions_immutable before update or delete
 on public.content_concept_identity_revisions for each row execute function public.concept_draft_immutable_v1();

create table public.content_concept_revision_batches (
 batch_id text primary key check (batch_id ~ '^[a-z0-9][a-z0-9:._-]{0,119}$'),
 batch_sha256 text not null check (batch_sha256 ~ '^[a-f0-9]{64}$'),
 request_id uuid not null unique,
 request_fingerprint text not null,
 accepted_by uuid not null,
 accepted_at timestamptz not null default now(),
 review_notes text not null,
 attestation text not null,
 item_count integer not null check (item_count between 1 and 1000),
 receipts jsonb not null
);
alter table public.content_concept_revision_batches enable row level security;
revoke all on public.content_concept_revision_batches from public,anon,authenticated,service_role;
grant select,insert on public.content_concept_revision_batches to service_role;
create trigger content_concept_revision_batches_immutable before update or delete
 on public.content_concept_revision_batches for each row execute function public.concept_draft_immutable_v1();

-- Current private identity: latest revision, else the original acceptance.
create view public.content_concept_current_identities with (security_invoker=true) as
 select distinct on (concept_id) concept_id, accepted_document, identity_digest, identity_revision
 from (
  select concept_id, accepted_document, accepted_identity_digest identity_digest, 1 identity_revision
   from public.content_concept_acceptances
  union all
  select concept_id, revised_document, revised_identity_digest, revision
   from public.content_concept_identity_revisions
 ) all_versions
 order by concept_id, identity_revision desc;
revoke all on public.content_concept_current_identities from public,anon,authenticated,service_role;
grant select on public.content_concept_current_identities to service_role;

create function public.concept_subject_revision_batch_v1(p_actor uuid,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_keys text[]; v_request uuid; v_batch text; v_sha text; v_notes text; v_att text; v_fp text;
 v_done public.content_concept_revision_batches; v_item jsonb; v_id text; v_seen text[]:='{}';
 v_cur record; v_add jsonb; v_subjects jsonb; v_doc jsonb; v_digest text; v_receipts jsonb:='[]'::jsonb;
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required'; end if;
 if jsonb_typeof(p_input) is distinct from 'object' or pg_column_size(p_input)>2097152 then raise exception 'concept_revision_invalid'; end if;
 select array_agg(k order by k) into v_keys from jsonb_object_keys(p_input) k;
 if v_keys is distinct from array['attestation','batchId','batchSha256','items','requestId','reviewNotes','schemaVersion']
    or p_input->'schemaVersion' is distinct from '1'::jsonb
    or jsonb_typeof(p_input->'items') is distinct from 'array'
    or jsonb_array_length(p_input->'items') not between 1 and 1000
 then raise exception 'concept_revision_invalid'; end if;
 begin v_request:=(p_input->>'requestId')::uuid; exception when others then raise exception 'concept_revision_invalid'; end;
 v_batch:=p_input->>'batchId'; v_sha:=p_input->>'batchSha256'; v_notes:=btrim(p_input->>'reviewNotes'); v_att:=p_input->>'attestation';
 if v_request is null or v_batch !~ '^[a-z0-9][a-z0-9:._-]{0,119}$' or v_sha !~ '^[a-f0-9]{64}$'
    or char_length(coalesce(v_notes,'')) not between 20 and 4000
    or v_att is distinct from 'identity-and-classification-reviewed-not-medical-or-learner-release'
 then raise exception 'concept_revision_invalid'; end if;
 v_fp:=encode(extensions.digest(convert_to(p_input::text,'UTF8'),'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('concept-revision-batch:'||v_batch,0));
 select * into v_done from public.content_concept_revision_batches where batch_id=v_batch;
 if found then
  if v_done.request_fingerprint<>v_fp or v_done.accepted_by<>p_actor then raise exception 'concept_revision_conflict'; end if;
  return jsonb_build_object('batchId',v_done.batch_id,'status','batch_accepted','items',v_done.item_count,
   'receipts',v_done.receipts,'acceptedAt',v_done.accepted_at,'learnerPublished',false);
 end if;
 -- Same lock as acceptance and catalogue publication: no identity changes while either runs.
 perform pg_advisory_xact_lock(hashtextextended('content-library-publication',0));
 for v_item in select * from jsonb_array_elements(p_input->'items') loop
  if jsonb_typeof(v_item) is distinct from 'object'
     or (select array_agg(k order by k) from jsonb_object_keys(v_item) k) is distinct from array['addSubjects','conceptId','previousIdentityDigest']
     or jsonb_typeof(v_item->'addSubjects') is distinct from 'array' or jsonb_array_length(v_item->'addSubjects') not between 1 and 19
     or v_item->>'previousIdentityDigest' !~ '^[a-f0-9]{64}$'
  then raise exception 'concept_revision_invalid'; end if;
  v_id:=v_item->>'conceptId';
  if v_id=any(v_seen) then raise exception 'concept_revision_duplicate'; end if;
  v_seen:=v_seen||v_id;
  select * into v_cur from public.content_concept_current_identities where concept_id=v_id;
  if not found then raise exception 'concept_revision_not_found'; end if;
  if exists(select 1 from public.study_catalog s cross join lateral jsonb_array_elements(s.body->'concepts') c
            where s.id=1 and c->>'conceptId'=v_id) then raise exception 'concept_revision_learner_visible'; end if;
  if v_cur.identity_digest<>v_item->>'previousIdentityDigest' then raise exception 'concept_revision_stale'; end if;
  v_add:=v_item->'addSubjects';
  if exists(select 1 from jsonb_array_elements(v_add) x where jsonb_typeof(x) is distinct from 'string')
     or (select count(distinct x) from jsonb_array_elements_text(v_add) x)<>jsonb_array_length(v_add)
     or exists(select 1 from jsonb_array_elements_text(v_add) x
               where x in (select jsonb_array_elements_text(v_cur.accepted_document->'classification'->'subjects')))
  then raise exception 'concept_revision_invalid'; end if;
  v_subjects:=(v_cur.accepted_document->'classification'->'subjects')||v_add;
  v_doc:=jsonb_set(v_cur.accepted_document,'{classification,subjects}',v_subjects);
  begin perform public.content_library_facets(v_doc->'classification'); exception when others then raise exception 'concept_revision_invalid'; end;
  v_digest:=encode(extensions.digest(convert_to(v_doc::text,'UTF8'),'sha256'),'hex');
  insert into public.content_concept_identity_revisions(concept_id,revision,previous_identity_digest,revised_document,
   revised_identity_digest,added_subjects,batch_id,accepted_by)
  values(v_id,v_cur.identity_revision+1,v_cur.identity_digest,v_doc,v_digest,v_add,v_batch,p_actor);
  v_receipts:=v_receipts||jsonb_build_array(jsonb_build_object('conceptId',v_id,'revision',v_cur.identity_revision+1,
   'previousIdentityDigest',v_cur.identity_digest,'identityDigest',v_digest,'subjects',v_subjects));
 end loop;
 insert into public.content_concept_revision_batches(batch_id,batch_sha256,request_id,request_fingerprint,accepted_by,review_notes,attestation,item_count,receipts)
  values(v_batch,v_sha,v_request,v_fp,p_actor,v_notes,v_att,jsonb_array_length(p_input->'items'),v_receipts);
 return jsonb_build_object('batchId',v_batch,'status','batch_accepted','items',jsonb_array_length(v_receipts),
  'receipts',v_receipts,'learnerPublished',false);
end; $$;
revoke all on function public.concept_subject_revision_batch_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.concept_subject_revision_batch_v1(uuid,jsonb) to service_role;
