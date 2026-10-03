-- Canonical content import extensions. No learner history or existing content is deleted.
-- Existing question-only guard rejected legitimate canonical-note receipts.
create or replace function public.content_review_current_status_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_status text;
begin
 if new.target_type='neural_note_version' then
   if new.question_version_id is not null then raise exception 'review_target_identity_mismatch'; end if;
   select status into v_status from public.neural_canonical_note_versions where id=new.target_id::uuid for update;
   if v_status is distinct from 'in_review' then raise exception 'neural_note_not_in_review'; end if;
 elsif coalesce(new.target_type,'question_version')='question_version' then
   if new.target_id is not null and new.target_id is distinct from new.question_version_id then raise exception 'review_target_identity_mismatch'; end if;
   select q->>'status' into v_status from public.study_catalog c
   cross join lateral jsonb_array_elements(c.body->'questions') q
   where c.id=1 and q->>'questionVersionId'=new.question_version_id for update of c;
   if v_status is distinct from 'in_review' then raise exception 'question_not_in_review'; end if;
 else raise exception 'review_target_type_required'; end if;
 return new;
end; $$;

create table public.content_library_imports (
  import_id text primary key, manifest jsonb not null, digest text not null,
  submitted_by uuid references auth.users(id), created_at timestamptz not null default now(),
  status text not null default 'draft' check(status in ('draft','published')),
  receipt jsonb, check((status='published')=(receipt is not null))
);
create table public.content_library_question_metadata (
  question_id text primary key, origins jsonb not null default '[]', concept_links jsonb not null default '[]', concept_links_version_id text, classification jsonb not null
);
create table public.content_library_concept_metadata (
  concept_id text primary key, classification jsonb not null
);
create table public.content_library_note_question_links (
  note_version_id uuid not null references public.neural_canonical_note_versions(id),
  question_id text not null, relation text not null check(relation in ('explains','contrasts','prerequisite')),
  section text not null default '', primary key(note_version_id,question_id,relation,section)
);
alter table public.content_library_imports enable row level security;
alter table public.content_library_question_metadata enable row level security;
alter table public.content_library_concept_metadata enable row level security;
alter table public.content_library_note_question_links enable row level security;
revoke all on public.content_library_imports,public.content_library_question_metadata,
  public.content_library_concept_metadata,public.content_library_note_question_links from public,anon,authenticated;
grant select,insert,update on public.content_library_imports to service_role;
grant all on public.content_library_question_metadata,public.content_library_concept_metadata,
  public.content_library_note_question_links to service_role;

create function public.content_library_protect_import() returns trigger language plpgsql set search_path='' as $$
begin
  if new.import_id is distinct from old.import_id or new.manifest is distinct from old.manifest
     or new.digest is distinct from old.digest or new.submitted_by is distinct from old.submitted_by
     or new.created_at is distinct from old.created_at or old.status='published' then
    raise exception 'immutable_import';
  end if;
  return new;
end; $$;
create trigger content_library_import_immutable before update on public.content_library_imports
for each row execute function public.content_library_protect_import();

create function public.content_library_text(p_text text) returns text language sql immutable set search_path='' as $$
  select lower(btrim(regexp_replace(p_text,'\s+',' ','g')));
$$;
create function public.content_library_signature(p_q jsonb) returns text language sql immutable set search_path='' as $$
  select jsonb_build_array(public.content_library_text(p_q->>'stem'),
    (select jsonb_agg(public.content_library_text(o->>'text') order by public.content_library_text(o->>'text'))
     from jsonb_array_elements(p_q->'options') o))::text;
$$;
create function public.content_library_answer(p_q jsonb) returns text language sql immutable set search_path='' as $$
  select public.content_library_text(o->>'text') from jsonb_array_elements(p_q->'options') o where o->>'optionId'=p_q->>'answerOptionId';
$$;
create function public.content_library_fields(p_value jsonb,p_fields text[]) returns void language plpgsql immutable set search_path='' as $$
declare v_keys text[]; v_key text;
begin
  if jsonb_typeof(p_value) is distinct from 'object' then raise exception 'invalid_fields'; end if;
  select array_agg(k order by k) into v_keys from jsonb_object_keys(p_value) k;
  if v_keys is distinct from (select array_agg(f order by f) from unnest(p_fields) f) then raise exception 'invalid_fields'; end if;
  foreach v_key in array p_fields loop
    if v_key<>all(array['schemaVersion','year','url','concepts','sources','questions','notes','noteQuestionLinks','aliases','subjectTags','classification','options','conceptLinks','sourceIds','origins','provenance','subjects','systems','organs','domains','tasks']) and jsonb_typeof(p_value->v_key) is distinct from 'string' then raise exception 'text_required'; end if;
  end loop;
end; $$;
create function public.content_library_strings(p_value jsonb) returns void language plpgsql immutable set search_path='' as $$
begin
  if jsonb_typeof(p_value) is distinct from 'array' or jsonb_array_length(p_value)>200 then raise exception 'array_invalid'; end if;
  if exists(select 1 from jsonb_array_elements(p_value) x where jsonb_typeof(x)<>'string' or char_length(btrim(x#>>'{}')) not between 1 and 240)
     or (select count(*) from jsonb_array_elements(p_value))<>(select count(distinct x) from jsonb_array_elements(p_value) x) then raise exception 'array_invalid'; end if;
end; $$;
create function public.content_library_facets(p_value jsonb) returns void language plpgsql immutable set search_path='' as $$
declare f text;
begin
  perform public.content_library_fields(p_value,array['subjects','systems','organs','domains','tasks']);
  foreach f in array array['subjects','systems','organs','domains','tasks'] loop
    perform public.content_library_strings(p_value->f);
    if exists(select 1 from jsonb_array_elements_text(p_value->f) x where x !~ '^[a-z0-9]+(-[a-z0-9]+)*$') then raise exception 'category_invalid'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements_text(p_value->'subjects') x where x<>all(array['anatomy','physiology','biochemistry','pathology','pharmacology','microbiology','forensic-medicine','community-medicine','medicine','surgery','obstetrics-gynaecology','pediatrics','ent','ophthalmology','orthopaedics','dermatology','psychiatry','anaesthesia','radiology'])) then raise exception 'subject_invalid'; end if;
end; $$;
create function public.content_library_merge_array(p_a jsonb,p_b jsonb) returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_agg(x order by x::text),'[]') from (select distinct value x from jsonb_array_elements(coalesce(p_a,'[]')||coalesce(p_b,'[]'))) t;
$$;
create function public.content_library_merge_facets(p_a jsonb,p_b jsonb) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_object_agg(f,public.content_library_merge_array(p_a->f,p_b->f)) from unnest(array['subjects','systems','organs','domains','tasks']) f;
$$;

create function public.content_library_validate_v1(p_m jsonb) returns void language plpgsql set search_path='' as $$
#variable_conflict use_column
declare x jsonb; o jsonb; k text; lim integer; v_field text;
begin
  perform public.content_library_fields(p_m,array['schemaVersion','importId','concepts','sources','questions','notes','noteQuestionLinks']);
  if p_m->'schemaVersion' is distinct from '1'::jsonb or coalesce(p_m->>'importId','') !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' then raise exception 'manifest_invalid'; end if;
  foreach k in array array['concepts','sources','questions','notes','noteQuestionLinks'] loop
    lim:=case when k='noteQuestionLinks' then 500 when k in ('concepts','sources') then 200 else 100 end;
    if jsonb_typeof(p_m->k) is distinct from 'array' or jsonb_array_length(p_m->k)>lim then raise exception 'batch_size_invalid'; end if;
  end loop;
  if jsonb_array_length(p_m->'questions')+jsonb_array_length(p_m->'notes')=0 or octet_length(p_m::text)>1048576 then raise exception 'empty_or_oversized_import'; end if;
  for x in select value from jsonb_array_elements(p_m->'concepts') loop
    perform public.content_library_fields(x,array['conceptId','label','aliases','subjectTags','classification']);
    if coalesce(x->>'conceptId','') !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' or char_length(btrim(coalesce(x->>'label',''))) not between 1 and 240 then raise exception 'concept_invalid'; end if;
    perform public.content_library_strings(x->'aliases'); perform public.content_library_strings(x->'subjectTags'); perform public.content_library_facets(x->'classification');
  end loop;
  for x in select value from jsonb_array_elements(p_m->'sources') loop
    perform public.content_library_fields(x,array['sourceId','title','url','version','evidence']);
    if coalesce(x->>'sourceId','') !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' or char_length(btrim(coalesce(x->>'title',''))) not between 1 and 500 or char_length(btrim(coalesce(x->>'version',''))) not between 1 and 300 or char_length(btrim(coalesce(x->>'evidence',''))) not between 1 and 4000 or (x->'url'<>'null'::jsonb and coalesce(x->>'url','') !~ '^https://[^ /]+') then raise exception 'source_invalid'; end if;
  end loop;
  for x in select value from jsonb_array_elements(p_m->'questions') loop
    perform public.content_library_fields(x,array['questionId','stem','options','answerOptionId','explanation','conceptLinks','sourceIds','origins','classification']);
    if coalesce(x->>'questionId','') !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' or char_length(btrim(coalesce(x->>'stem',''))) not between 1 and 100000 or char_length(btrim(coalesce(x->>'explanation',''))) not between 1 and 100000 or jsonb_typeof(x->'options') is distinct from 'array' or jsonb_array_length(x->'options') not between 2 and 10 then raise exception 'question_invalid'; end if;
    for o in select value from jsonb_array_elements(x->'options') loop
      perform public.content_library_fields(o,array['optionId','text']);
      if coalesce(o->>'optionId','') !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' or char_length(btrim(coalesce(o->>'text',''))) not between 1 and 20000 then raise exception 'option_invalid'; end if;
    end loop;
    if (select count(*) from jsonb_array_elements(x->'options'))<>(select count(distinct o->>'optionId') from jsonb_array_elements(x->'options') o) or (select count(*) from jsonb_array_elements(x->'options'))<>(select count(distinct public.content_library_text(o->>'text')) from jsonb_array_elements(x->'options') o) or public.content_library_answer(x) is null then raise exception 'answer_invalid'; end if;
    if jsonb_typeof(x->'conceptLinks') is distinct from 'array' or jsonb_array_length(x->'conceptLinks') not between 1 and 50 or (select count(*) from jsonb_array_elements(x->'conceptLinks') l where l->>'role'='primary')<>1 then raise exception 'primary_concept_required'; end if;
    for o in select value from jsonb_array_elements(x->'conceptLinks') loop
      perform public.content_library_fields(o,array['conceptId','role']); if coalesce(o->>'conceptId','') !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' or coalesce(o->>'role','') not in ('primary','secondary','prerequisite','distractor') then raise exception 'concept_link_invalid'; end if;
    end loop;
    perform public.content_library_strings(x->'sourceIds'); if jsonb_array_length(x->'sourceIds')=0 then raise exception 'source_required'; end if;
    perform public.content_library_facets(x->'classification');
    if jsonb_typeof(x->'origins') is distinct from 'array' or jsonb_array_length(x->'origins')>100 then raise exception 'origins_invalid'; end if;
    for o in select value from jsonb_array_elements(x->'origins') loop
      if o->>'kind'='pyq' then
        perform public.content_library_fields(o,array['kind','examId','year','session','evidence']);
        if coalesce(o->>'examId','') !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' or jsonb_typeof(o->'year') is distinct from 'number' or coalesce(o->>'year','') !~ '^[0-9]{4}$' or (o->>'year')::integer not between 1900 and 2100 or char_length(btrim(coalesce(o->>'session',''))) not between 1 and 200 then raise exception 'pyq_invalid'; end if;
      elsif o->>'kind'='platform' then
        perform public.content_library_fields(o,array['kind','platformId','edition','evidence']);
        if coalesce(o->>'platformId','') !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(btrim(coalesce(o->>'edition',''))) not between 1 and 200 then raise exception 'platform_invalid'; end if;
      else raise exception 'origin_invalid'; end if;
      if char_length(btrim(coalesce(o->>'evidence',''))) not between 1 and 4000 then raise exception 'origin_evidence_required'; end if;
    end loop;
  end loop;
  for x in select value from jsonb_array_elements(p_m->'notes') loop
    perform public.content_library_fields(x,array['noteId','conceptId','title','bodyMarkdown','sourceIds','provenance']);
    if coalesce(x->>'noteId','') !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' or coalesce(x->>'conceptId','') !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' or char_length(btrim(coalesce(x->>'title',''))) not between 1 and 300 or char_length(btrim(coalesce(x->>'bodyMarkdown',''))) not between 1 and 100000 then raise exception 'note_invalid'; end if;
    perform public.content_library_strings(x->'sourceIds'); if jsonb_array_length(x->'sourceIds')=0 then raise exception 'source_required'; end if;
    perform public.content_library_fields(x->'provenance',array['kind','evidence']);
    if coalesce(x->'provenance'->>'kind','') not in ('ai_generated_original','licensed_adaptation') or char_length(btrim(coalesce(x->'provenance'->>'evidence',''))) not between 1 and 2000 then raise exception 'note_provenance_invalid'; end if;
    if not exists(select 1 from jsonb_array_elements(p_m->'noteQuestionLinks') l where l->>'noteId'=x->>'noteId') then raise exception 'note_question_link_required'; end if;
  end loop;
  for x in select value from jsonb_array_elements(p_m->'noteQuestionLinks') loop
    perform public.content_library_fields(x,array['noteId','questionId','relation','section']);
    if not exists(select 1 from jsonb_array_elements(p_m->'notes') n where n->>'noteId'=x->>'noteId') or coalesce(x->>'questionId','') !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' or coalesce(x->>'relation','') not in ('explains','contrasts','prerequisite') or jsonb_typeof(x->'section') is distinct from 'string' or char_length(x->>'section')>300 then raise exception 'note_link_invalid'; end if;
  end loop;
  foreach k in array array['concepts','sources','questions','notes'] loop
    v_field:=case k when 'concepts' then 'conceptId' when 'sources' then 'sourceId' when 'questions' then 'questionId' else 'noteId' end;
    if (select count(*) from jsonb_array_elements(p_m->k))<>(select count(distinct x->>v_field) from jsonb_array_elements(p_m->k) x) then raise exception 'duplicate_identifier'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(p_m->'questions') a join jsonb_array_elements(p_m->'questions') b on public.content_library_signature(a)=public.content_library_signature(b) where public.content_library_answer(a)<>public.content_library_answer(b)) then raise exception 'answer_conflict'; end if;
end; $$;

create function public.content_library_stage_v1(p_manifest jsonb,p_submitter uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_digest text; v_row public.content_library_imports%rowtype;
begin
  if p_submitter is not null and public.is_content_admin(p_submitter) is not true then raise exception 'content_admin_required'; end if;
  perform public.content_library_validate_v1(p_manifest);
  v_digest:=encode(extensions.digest(convert_to(p_manifest::text,'UTF8'),'sha256'),'hex');
  insert into public.content_library_imports(import_id,manifest,digest,submitted_by) values(p_manifest->>'importId',p_manifest,v_digest,p_submitter) on conflict(import_id) do nothing;
  select * into strict v_row from public.content_library_imports where import_id=p_manifest->>'importId';
  if v_row.digest<>v_digest then raise exception 'import_payload_conflict'; end if;
  return jsonb_build_object('contractId','content-library-stage-v1','importId',v_row.import_id,'digest',v_row.digest,'status',v_row.status,'publicationAuthority',false);
end; $$;

create function public.content_library_review_publish_v1(p_import_id text,p_reviewer uuid,p_expected_digest text,p_rights_decisions jsonb,p_review_notes text,p_attested boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_import public.content_library_imports%rowtype; v_body jsonb; v_m jsonb; x jsonb; old jsonb; decision jsonb; src text; k text;
 v_q jsonb; v_origin jsonb; v_qid text; v_version_id text; v_notes_map jsonb:='{}'; v_questions_map jsonb:='{}';
 v_note_id uuid; v_note_result jsonb; v_kind text; v_receipt jsonb; v_new integer:=0; v_existing integer:=0; v_note_count integer:=0;
begin
 if p_reviewer is null or public.is_content_admin(p_reviewer) is not true then raise exception 'content_admin_required'; end if;
 foreach v_kind in array array['medical','references','rights'] loop
   if public.has_active_reviewer_grant(p_reviewer,v_kind) is not true then raise exception 'reviewer_not_authorized'; end if;
 end loop;
 if p_attested is distinct from true or char_length(btrim(coalesce(p_review_notes,''))) not between 1 and 4000 then raise exception 'review_attestation_required'; end if;
 if jsonb_typeof(p_rights_decisions) is distinct from 'array' or jsonb_array_length(p_rights_decisions)>200 then raise exception 'rights_decisions_invalid'; end if;
 perform pg_advisory_xact_lock(hashtextextended('content-library-publication',0));
 select * into v_import from public.content_library_imports where import_id=p_import_id for update;
 if not found then raise exception 'import_not_found'; end if;
 if v_import.digest is distinct from p_expected_digest then raise exception 'stale_import_digest'; end if;
 if v_import.status='published' then return v_import.receipt; end if;
 v_m:=v_import.manifest; perform public.content_library_validate_v1(v_m);
 select body into strict v_body from public.study_catalog where id=1 for update;
 -- Canonical concept identity: conflicting IDs or reused labels must be resolved explicitly.
 for x in select value from jsonb_array_elements(v_m->'concepts') loop
   select c into old from jsonb_array_elements(v_body->'concepts') c where c->>'conceptId'=x->>'conceptId';
   if old is not null then
     if public.content_library_text(old->>'label')<>public.content_library_text(x->>'label') then raise exception 'concept_identity_conflict'; end if;
   else
     if exists(select 1 from jsonb_array_elements(v_body->'concepts') c where public.content_library_text(c->>'label')=public.content_library_text(x->>'label') or exists(select 1 from jsonb_array_elements_text(c->'aliases') a where public.content_library_text(a)=public.content_library_text(x->>'label'))) then raise exception 'concept_identity_conflict'; end if;
     v_body:=jsonb_set(v_body,'{concepts}',(v_body->'concepts')||jsonb_build_array(x-'classification'));
   end if;
   insert into public.content_library_concept_metadata(concept_id,classification) values(x->>'conceptId',x->'classification') on conflict(concept_id) do update set classification=public.content_library_merge_facets(content_library_concept_metadata.classification,excluded.classification);
 end loop;
 for x in select value from jsonb_array_elements(v_m->'sources') loop
   select s into old from jsonb_array_elements(v_body->'sources') s where s->>'sourceId'=x->>'sourceId';
   if old is null then
     v_body:=jsonb_set(v_body,'{sources}',(v_body->'sources')||jsonb_build_array((x-'evidence')||jsonb_build_object('rights',jsonb_build_object('status','unknown','evidence',x->>'evidence'))));
   elsif old->>'title'<>x->>'title' or old->>'version'<>x->>'version' or old->'url' is distinct from x->'url' then raise exception 'source_identity_conflict'; end if;
 end loop;
 update public.study_catalog set body=v_body,version=version+1,updated_at=now() where id=1;
 -- Rights decisions are genuine admin input, not uploader-granted permissions.
 for decision in select value from jsonb_array_elements(p_rights_decisions) loop
   perform public.content_library_fields(decision,array['sourceId','rightsStatus','evidence']);
   if not exists(select 1 from jsonb_array_elements(v_body->'sources') s where s->>'sourceId'=decision->>'sourceId') or not exists(select 1 from (select jsonb_array_elements_text(q->'sourceIds') id from jsonb_array_elements(v_m->'questions') q union select jsonb_array_elements_text(n->'sourceIds') from jsonb_array_elements(v_m->'notes') n) t where id=decision->>'sourceId') then raise exception 'rights_source_invalid'; end if;
   select s into old from jsonb_array_elements(v_body->'sources') s where s->>'sourceId'=decision->>'sourceId';
   if old->'rights'->>'status' in ('owned','licensed','public_domain','citation_only') and exists(select 1 from public.source_rights_events e where e.source_id=decision->>'sourceId' and e.source_fingerprint_sha256=public.current_source_fingerprint_sha256(decision->>'sourceId')) then
     if old->'rights'->>'status' is distinct from decision->>'rightsStatus' then raise exception 'rights_decision_conflict'; end if;
   else
     perform public.resolve_source_rights(decision->>'sourceId',p_reviewer,decision->>'rightsStatus',decision->>'evidence');
   end if;
 end loop;
 select body into v_body from public.study_catalog where id=1;
 if exists(select 1 from (
   select jsonb_array_elements_text(q->'sourceIds') sid from jsonb_array_elements(v_m->'questions') q
   union select jsonb_array_elements_text(n->'sourceIds') from jsonb_array_elements(v_m->'notes') n
 ) refs where not exists(select 1 from jsonb_array_elements(v_body->'sources') s join public.source_rights_events e on e.source_id=s->>'sourceId'
 where s->>'sourceId'=sid and s->'rights'->>'status' in ('owned','licensed','public_domain','citation_only') and e.source_fingerprint_sha256=public.current_source_fingerprint_sha256(sid))) then raise exception 'publication_rights_unresolved'; end if;
 for x in select value from jsonb_array_elements(v_m->'questions') loop
   for src in select jsonb_array_elements_text(x->'sourceIds') loop
     if not exists(select 1 from jsonb_array_elements(v_body->'sources') s where s->>'sourceId'=src) then raise exception 'source_unknown'; end if;
   end loop;
   if exists(select 1 from jsonb_array_elements(x->'conceptLinks') l where not exists(select 1 from jsonb_array_elements(v_body->'concepts') c where c->>'conceptId'=l->>'conceptId')) then raise exception 'concept_unknown'; end if;
   select q into old from jsonb_array_elements(v_body->'questions') q where q->>'questionId'=x->>'questionId' order by (q->>'version')::integer desc limit 1;
   if old is not null and public.content_library_signature(old) is distinct from public.content_library_signature(x) then raise exception 'question_identity_conflict'; end if;
   select q into v_q from jsonb_array_elements(v_body->'questions') q where public.content_library_signature(q)=public.content_library_signature(x) order by (q->>'version')::integer desc limit 1;
   if v_q is not null then
     if public.content_library_answer(v_q) is distinct from public.content_library_answer(x) then raise exception 'answer_conflict'; end if;
     if v_q->>'status'<>'published' then raise exception 'duplicate_target_not_published'; end if;
     if (select l->>'conceptId' from jsonb_array_elements(v_q->'conceptLinks') l where l->>'role'='primary') is distinct from (select l->>'conceptId' from jsonb_array_elements(x->'conceptLinks') l where l->>'role'='primary') then raise exception 'duplicate_concept_conflict'; end if;
     v_qid:=v_q->>'questionId'; v_version_id:=v_q->>'questionVersionId'; v_existing:=v_existing+1;
   else
     if exists(select 1 from jsonb_array_elements(v_body->'questions') q where q->>'questionId'=x->>'questionId') then raise exception 'question_identity_conflict'; end if;
     v_qid:=x->>'questionId'; v_version_id:=v_qid||'@1';
     select o into v_origin from jsonb_array_elements(x->'origins') o where o->>'kind'='pyq' limit 1;
     v_q:=jsonb_build_object('questionId',v_qid,'questionVersionId',v_version_id,'version',1,'supersedes',null,'authorId','import-source:'||p_import_id,'changeReason','Reviewed canonical library import','stem',x->>'stem','options',x->'options','answerOptionId',x->>'answerOptionId','explanation',x->>'explanation','conceptLinks',x->'conceptLinks','sourceIds',x->'sourceIds','provenance',jsonb_build_object('kind',case when v_origin is null then 'original' else 'recalled_pyq' end,'exam',v_origin->>'examId','year',(v_origin->>'year')::integer,'evidence',coalesce(v_origin->>'evidence','Imported source evidence in '||p_import_id)),'status','in_review','reviews','[]'::jsonb,'publishedAt',null);
     v_body:=jsonb_set(v_body,'{questions}',(v_body->'questions')||jsonb_build_array(v_q));
     update public.study_catalog set body=v_body,version=version+1,updated_at=now() where id=1;
     perform public.record_full_question_review_bundle(v_version_id,p_reviewer,p_review_notes,p_review_notes,p_review_notes,'full-question-review-attestation-v1',true);
     perform public.publish_verified_content(v_version_id); v_new:=v_new+1;
     select body into v_body from public.study_catalog where id=1;
   end if;
   -- Source additions to duplicates also require resolved reuse permissions.
   if exists(select 1 from jsonb_array_elements_text(x->'sourceIds') sid where not exists(select 1 from jsonb_array_elements(v_body->'sources') s join public.source_rights_events e on e.source_id=s->>'sourceId' where s->>'sourceId'=sid and s->'rights'->>'status' in ('owned','licensed','public_domain','citation_only') and e.source_fingerprint_sha256=public.current_source_fingerprint_sha256(sid))) then raise exception 'publication_rights_unresolved'; end if;
   insert into public.content_library_question_metadata(question_id,origins,classification,concept_links,concept_links_version_id) values(v_qid,x->'origins',x->'classification',(select coalesce(jsonb_agg(l),'[]') from jsonb_array_elements(x->'conceptLinks') l where l->>'role'<>'primary'),v_version_id) on conflict(question_id) do update set origins=public.content_library_merge_array(content_library_question_metadata.origins,excluded.origins),concept_links=case when content_library_question_metadata.concept_links_version_id=excluded.concept_links_version_id then public.content_library_merge_array(content_library_question_metadata.concept_links,excluded.concept_links) else excluded.concept_links end,concept_links_version_id=excluded.concept_links_version_id,classification=public.content_library_merge_facets(content_library_question_metadata.classification,excluded.classification);
   v_questions_map:=v_questions_map||jsonb_build_object(x->>'questionId',v_qid);
 end loop;
 for x in select value from jsonb_array_elements(v_m->'notes') loop
   select id into v_note_id from public.neural_canonical_note_versions where concept_id=x->>'conceptId' and status='published' and body_markdown=x->>'bodyMarkdown' and title=x->>'title' limit 1;
   if v_note_id is null then
     v_note_result:=public.neural_create_canonical_note_draft(x->>'conceptId',x->>'title',x->>'bodyMarkdown',x->'sourceIds',x->'provenance'||jsonb_build_object('importId',p_import_id,'curatorRole','external-content-import'),p_reviewer);
     v_note_id:=(v_note_result->>'noteVersionId')::uuid;
     perform public.neural_submit_canonical_note_for_review(v_note_id,p_reviewer);
     -- External/AI authorship is in provenance; authenticated curator attests the imported exact target.
     foreach v_kind in array array['medical','references','rights'] loop
       insert into public.content_review_events(id,question_version_id,target_type,target_id,review_kind,reviewer_id,decision,notes,target_sha256,reviewed_at)
       values(gen_random_uuid(),null,'neural_note_version',v_note_id::text,v_kind,p_reviewer,'approved',p_review_notes,public.current_neural_note_review_target_sha256(v_note_id,v_kind),now());
     end loop;
     update public.neural_canonical_note_versions set status='verified' where id=v_note_id;
     perform public.publish_verified_neural_note(v_note_id); v_note_count:=v_note_count+1;
   end if;
   v_notes_map:=v_notes_map||jsonb_build_object(x->>'noteId',v_note_id);
 end loop;
 for x in select value from jsonb_array_elements(v_m->'noteQuestionLinks') loop
   v_qid:=coalesce(v_questions_map->>(x->>'questionId'),x->>'questionId');
   if not exists(select 1 from jsonb_array_elements(v_body->'questions') q where q->>'questionId'=v_qid and q->>'status'='published') then raise exception 'linked_question_unknown'; end if;
   insert into public.content_library_note_question_links(note_version_id,question_id,relation,section) values((v_notes_map->>(x->>'noteId'))::uuid,v_qid,x->>'relation',x->>'section') on conflict do nothing;
 end loop;
 v_receipt:=jsonb_build_object('contractId','content-library-publication-v1','importId',p_import_id,'digest',v_import.digest,'status','published','newQuestions',v_new,'existingQuestionsLinked',v_existing,'newNotes',v_note_count,'questionMap',v_questions_map,'noteMap',v_notes_map,'reviewerId',p_reviewer,'reviewNotes',p_review_notes,'attestationVersion','canonical-import-review-v1','rightsDecisions',p_rights_decisions,'publishedAt',now());
 update public.content_library_imports set status='published',receipt=v_receipt where import_id=p_import_id;
 return v_receipt;
end; $$;

create function public.content_library_observations_v1(p_learner uuid) returns jsonb language sql stable security definer set search_path='' as $$
with observations as (
 select q->>'questionId' question_id,(a.event->>'correct')::boolean correct,a.recorded_at,a.id,
 row_number() over(partition by q->>'questionId' order by a.recorded_at desc,a.id desc) rn
 from public.study_attempts a join public.study_catalog c on c.id=1
 cross join lateral jsonb_array_elements(c.body->'questions') q
 where a.learner_id=p_learner and q->>'questionVersionId'=a.event->>'questionVersionId'
), summary as (
 select question_id,count(*) attempts,count(*) filter(where correct=false) wrong,bool_or(correct) filter(where rn=1) latest_correct from observations group by question_id
) select coalesce(jsonb_agg(to_jsonb(s) order by question_id),'[]') from summary s;
$$;

-- All public functions are backend-only, including internal validation helpers.
-- One MVCC snapshot avoids metadata-page truncation and mixed publication states.
create function public.content_library_snapshot_v1(p_learner uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'catalog',(select body from public.study_catalog where id=1),
  'notes',coalesce((select jsonb_agg(jsonb_build_object('id',id,'concept_id',concept_id,'title',title,'body_markdown',body_markdown,'status',status) order by id) from public.neural_canonical_note_versions where status='published'),'[]'),
  'questionMetadata',coalesce((select jsonb_agg(to_jsonb(m) order by question_id) from public.content_library_question_metadata m),'[]'),
  'conceptMetadata',coalesce((select jsonb_agg(to_jsonb(m) order by concept_id) from public.content_library_concept_metadata m),'[]'),
  'links',coalesce((select jsonb_agg(to_jsonb(l) order by note_version_id,question_id) from public.content_library_note_question_links l),'[]'),
  'stats',public.content_library_observations_v1(p_learner)
 );
$$;

do $$ declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'content_library_%' loop
   execute format('revoke all on function %s from public,anon,authenticated',f.signature);
   execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end; $$;
