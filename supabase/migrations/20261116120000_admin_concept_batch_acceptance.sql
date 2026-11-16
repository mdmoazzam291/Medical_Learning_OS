-- Batch concept identity acceptance. Reuses concept_draft_save_v1 and concept_draft_accept_v1
-- per item inside one transaction: any item failure rolls back the whole batch.
-- Identity/classification acceptance only; not medical review, rights review or learner release.
create table public.content_concept_batch_acceptances (
 batch_id text primary key check (batch_id ~ '^[a-z0-9][a-z0-9:._-]{0,119}$'),
 batch_sha256 text not null check (batch_sha256 ~ '^[a-f0-9]{64}$'),
 request_id uuid not null unique,
 request_fingerprint text not null,
 accepted_by uuid not null,
 accepted_at timestamptz not null default now(),
 review_notes text not null,
 attestation text not null,
 item_count integer not null check (item_count between 1 and 300),
 receipts jsonb not null
);
alter table public.content_concept_batch_acceptances enable row level security;
revoke all on public.content_concept_batch_acceptances from public,anon,authenticated,service_role;
grant select,insert on public.content_concept_batch_acceptances to service_role;
create trigger content_concept_batch_acceptances_immutable before update or delete
 on public.content_concept_batch_acceptances for each row execute function public.concept_draft_immutable_v1();

create function public.concept_batch_request_uuid_v1(p_batch text,p_key text,p_step text)
returns uuid language sql immutable set search_path='' as $$
 select (substr(h,1,8)||'-'||substr(h,9,4)||'-4'||substr(h,14,3)||'-8'||substr(h,18,3)||'-'||substr(h,21,12))::uuid
 from (select md5('concept-batch|'||p_batch||'|'||p_key||'|'||p_step) h) x;
$$;

create function public.concept_batch_accept_v1(p_actor uuid,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_keys text[]; v_request uuid; v_batch text; v_sha text; v_notes text; v_att text; v_fp text;
 v_done public.content_concept_batch_acceptances; v_item jsonb; v_key text; v_saved jsonb; v_acc jsonb;
 v_receipts jsonb:='[]'::jsonb; v_seen text[]:='{}';
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required'; end if;
 if jsonb_typeof(p_input) is distinct from 'object' or pg_column_size(p_input)>2097152 then raise exception 'concept_batch_invalid'; end if;
 select array_agg(k order by k) into v_keys from jsonb_object_keys(p_input) k;
 if v_keys is distinct from array['attestation','batchId','batchSha256','items','requestId','reviewNotes','schemaVersion']
    or p_input->'schemaVersion' is distinct from '1'::jsonb
    or jsonb_typeof(p_input->'items') is distinct from 'array'
    or jsonb_array_length(p_input->'items') not between 1 and 300
 then raise exception 'concept_batch_invalid'; end if;
 begin v_request:=(p_input->>'requestId')::uuid; exception when others then raise exception 'concept_batch_invalid'; end;
 v_batch:=p_input->>'batchId'; v_sha:=p_input->>'batchSha256'; v_notes:=btrim(p_input->>'reviewNotes'); v_att:=p_input->>'attestation';
 if v_request is null or v_batch !~ '^[a-z0-9][a-z0-9:._-]{0,119}$' or v_sha !~ '^[a-f0-9]{64}$'
    or char_length(coalesce(v_notes,'')) not between 20 and 4000
    or v_att is distinct from 'identity-and-classification-reviewed-not-medical-or-learner-release'
 then raise exception 'concept_batch_invalid'; end if;
 v_fp:=encode(extensions.digest(convert_to(p_input::text,'UTF8'),'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('concept-batch:'||v_batch,0));
 select * into v_done from public.content_concept_batch_acceptances where batch_id=v_batch;
 if found then
  if v_done.request_fingerprint<>v_fp or v_done.accepted_by<>p_actor then raise exception 'concept_batch_conflict'; end if;
  return jsonb_build_object('batchId',v_done.batch_id,'status','batch_accepted','items',v_done.item_count,
   'receipts',v_done.receipts,'acceptedAt',v_done.accepted_at,'learnerPublished',false);
 end if;
 for v_item in select * from jsonb_array_elements(p_input->'items') loop
  if jsonb_typeof(v_item) is distinct from 'object'
     or (select array_agg(k order by k) from jsonb_object_keys(v_item) k) is distinct from array['conceptKey','document']
     or v_item->>'conceptKey' !~ '^nmc-concept:[a-f0-9]{16}$'
  then raise exception 'concept_batch_invalid'; end if;
  v_key:=v_item->>'conceptKey';
  if v_key=any(v_seen) then raise exception 'concept_batch_duplicate_key'; end if;
  v_seen:=v_seen||v_key;
  v_saved:=public.concept_draft_save_v1(p_actor,jsonb_build_object(
   'schemaVersion',1,'requestId',public.concept_batch_request_uuid_v1(v_batch,v_key,'save'),
   'proposalId',null,'expectedDigest',null,'conceptId',null,'baseDigest',null,'document',v_item->'document'));
  v_acc:=public.concept_draft_accept_v1(p_actor,jsonb_build_object(
   'schemaVersion',1,'requestId',public.concept_batch_request_uuid_v1(v_batch,v_key,'accept'),
   'proposalId',v_saved->>'proposalId','revision',(v_saved->>'revision')::integer,'digest',v_saved->>'digest',
   'reviewNotes',v_notes,'attestation',v_att));
  v_receipts:=v_receipts||jsonb_build_array(jsonb_build_object('conceptKey',v_key,'conceptId',v_acc->>'conceptId',
   'proposalId',v_acc->>'proposalId','revision',(v_acc->>'revision')::integer,'draftDigest',v_saved->>'digest',
   'identityDigest',v_acc->>'identityDigest','label',v_item->'document'->>'label'));
 end loop;
 insert into public.content_concept_batch_acceptances(batch_id,batch_sha256,request_id,request_fingerprint,accepted_by,review_notes,attestation,item_count,receipts)
  values(v_batch,v_sha,v_request,v_fp,p_actor,v_notes,v_att,jsonb_array_length(p_input->'items'),v_receipts);
 return jsonb_build_object('batchId',v_batch,'status','batch_accepted','items',jsonb_array_length(v_receipts),
  'receipts',v_receipts,'learnerPublished',false);
end; $$;
revoke all on function public.concept_batch_accept_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.concept_batch_accept_v1(uuid,jsonb) to service_role;
revoke all on function public.concept_batch_request_uuid_v1(text,text,text) from public,anon,authenticated;
grant execute on function public.concept_batch_request_uuid_v1(text,text,text) to service_role;
